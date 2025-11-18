import { serve } from "std/http/server.ts"
import { CreateStablecoinRequestSchema, CreateStablecoinResponse } from "../shared/types.ts"
import { getSupabaseClient } from "../shared/supabase-client.ts"
import { createLogger } from "../shared/logger.ts"
import { validateApiKey, extractApiKey } from "../shared/auth.ts"
import { createErrorResponse, createSuccessResponse, AppError, ErrorCode, handleError } from "../shared/error-handler.ts"
import { publishEvent, createDomainEvent } from "../shared/event-publisher.ts"

const logger = createLogger("stablecoin-create")

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed", 405)
  }

  try {
    // Extract and validate API key
    const apiKey = extractApiKey(req)
    if (!apiKey) {
      return createErrorResponse("Missing x-api-key header", 401, ErrorCode.UNAUTHORIZED)
    }

    const auth = await validateApiKey(apiKey)
    if (!auth.valid) {
      return createErrorResponse("Invalid API key", 401, ErrorCode.UNAUTHORIZED)
    }

    // Parse request body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return createErrorResponse("Invalid JSON body", 400)
    }

    // Validate request schema
    const validation = CreateStablecoinRequestSchema.safeParse(body)
    if (!validation.success) {
      return createErrorResponse(
        `Validation error: ${validation.error.errors.map((e) => e.message).join(", ")}`,
        400
      )
    }

    const { client_name, symbol, client_wallet, webhook } = validation.data

    const log = createLogger("stablecoin-create", undefined)
    await log.info("Creating stablecoin", {
      clientId: auth.clientId,
      clientName: auth.clientName,
      symbol,
    })

    const supabase = getSupabaseClient()

    // Check if symbol already exists
    const { data: existing } = await supabase
      .from("stablecoins")
      .select("id")
      .eq("symbol", symbol)
      .single()

    if (existing) {
      return createErrorResponse(
        "Symbol already exists",
        409,
        ErrorCode.CONFLICT
      )
    }

    // Generate stablecoin_id
    const stablecoinId = crypto.randomUUID()

    // Insert into database
    const { error: insertError } = await supabase.from("stablecoins").insert({
      stablecoin_id: stablecoinId,
      client_id: auth.clientId,
      client_name,
      client_wallet,
      webhook_url: webhook,
      symbol,
      status: "registered",
    })

    if (insertError) {
      await log.error("Database insert failed", { error: insertError.message })
      throw new AppError(
        ErrorCode.DATABASE_ERROR,
        "Failed to create stablecoin",
        500
      )
    }

    // Publish event
    try {
      await publishEvent(
        createDomainEvent(
          stablecoinId,
          "stablecoin.registered",
          {
            stablecoinId,
            clientId: auth.clientId,
            clientName: client_name,
            symbol,
            clientWallet: client_wallet,
          }
        )
      )
    } catch (err) {
      await log.warn("Failed to publish event", {}, err as Error)
      // Continue anyway, database insert was successful
    }

    await log.info("Stablecoin created successfully", {
      stablecoinId,
      symbol,
    })

    const response: CreateStablecoinResponse = {
      stablecoin_id: stablecoinId,
      symbol,
      status: "registered",
      erc20_address: null,
      created_at: new Date().toISOString(),
    }

    return createSuccessResponse(response, 201)
  } catch (err) {
    const { response } = await handleError(err)
    return response
  }
})
