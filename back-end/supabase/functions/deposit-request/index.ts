import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { DepositRequestSchema, DepositRequestResponse } from "../shared/types.ts"
import { getSupabaseClient } from "../shared/supabase-client.ts"
import { createLogger } from "../shared/logger.ts"
import { validateApiKey, extractApiKey } from "../shared/auth.ts"
import { createErrorResponse, createSuccessResponse, AppError, ErrorCode, handleError } from "../shared/error-handler.ts"
import { publishEvent, createDomainEvent } from "../shared/event-publisher.ts"
import { createAsaasClient } from "../shared/asaas-client.ts"

const logger = createLogger("deposit-request")

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed", 405)
  }

  try {
    // Extract API key
    const apiKey = extractApiKey(req)
    if (!apiKey) {
      return createErrorResponse("Missing x-api-key header", 401, ErrorCode.UNAUTHORIZED)
    }

    const auth = await validateApiKey(apiKey)
    if (!auth.valid) {
      return createErrorResponse("Invalid API key", 401, ErrorCode.UNAUTHORIZED)
    }

    // Extract symbol from URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split("/")
    const symbol = pathParts[pathParts.length - 2] // /stablecoin/{symbol}/deposit

    if (!symbol) {
      return createErrorResponse("Missing symbol in path", 400)
    }

    // Parse request body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return createErrorResponse("Invalid JSON body", 400)
    }

    // Validate request
    const validation = DepositRequestSchema.safeParse(body)
    if (!validation.success) {
      return createErrorResponse(
        `Validation error: ${validation.error.errors.map((e) => e.message).join(", ")}`,
        400
      )
    }

    const { amount } = validation.data
    const log = createLogger("deposit-request")

    await log.info("Deposit requested", {
      clientId: auth.clientId,
      symbol,
      amount,
    })

    const supabase = getSupabaseClient()

    // Find stablecoin by symbol
    const { data: stablecoin, error: stablecoinError } = await supabase
      .from("stablecoins")
      .select("*")
      .eq("symbol", symbol)
      .single()

    if (stablecoinError || !stablecoin) {
      return createErrorResponse(
        "Stablecoin not found",
        404,
        ErrorCode.NOT_FOUND
      )
    }

    // Verify client ownership
    if (stablecoin.client_id !== auth.clientId) {
      await log.warn("Unauthorized deposit request", {
        attemptedClientId: auth.clientId,
        stablecoinClientId: stablecoin.client_id,
      })
      return createErrorResponse(
        "Unauthorized",
        403,
        ErrorCode.UNAUTHORIZED
      )
    }

    // Generate operation_id
    const operationId = crypto.randomUUID()

    // Create PIX QRCode via Asaas
    const asaasClient = createAsaasClient()
    const asaasResponse = await asaasClient.createPixCode({
      billingType: "PIX",
      value: amount,
      externalReference: operationId,
      description: `Stablecoin ${symbol} - Deposit`,
    })

    // Insert operation into database
    const { error: insertError } = await supabase.from("operations").insert({
      operation_id: operationId,
      stablecoin_id: stablecoin.stablecoin_id,
      operation_type: "deposit",
      amount,
      asaas_payment_id: asaasResponse.id,
      qrcode_payload: asaasResponse.pixQrCode?.payload,
      qrcode_url: asaasResponse.pixQrCode?.encodedImage,
      status: "payment_pending",
    })

    if (insertError) {
      await log.error("Database insert failed", { error: insertError.message })
      throw new AppError(
        ErrorCode.DATABASE_ERROR,
        "Failed to create deposit request",
        500
      )
    }

    // Publish event
    try {
      await publishEvent(
        createDomainEvent(
          operationId,
          "deposit.initiated",
          {
            operationId,
            stablecoinId: stablecoin.stablecoin_id,
            symbol,
            amount,
            asaasPaymentId: asaasResponse.id,
          }
        )
      )
    } catch (err) {
      await log.warn("Failed to publish event", {}, err as Error)
    }

    await log.info("Deposit request created", {
      operationId,
      symbol,
      amount,
    })

    const response: DepositRequestResponse = {
      operation_id: operationId,
      stablecoin_id: stablecoin.stablecoin_id,
      symbol: stablecoin.symbol,
      amount,
      qrcode: {
        payload: asaasResponse.pixQrCode?.payload || "",
        image_url: asaasResponse.pixQrCode?.encodedImage || "",
      },
      status: "payment_pending",
    }

    return createSuccessResponse(response, 201)
  } catch (err) {
    const { response } = await handleError(err)
    return response
  }
})
