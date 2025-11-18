import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { WithdrawRequestSchema, WithdrawResponse } from "../shared/types.ts"
import { getSupabaseClient } from "../shared/supabase-client.ts"
import { createLogger } from "../shared/logger.ts"
import { validateApiKey, extractApiKey } from "../shared/auth.ts"
import { createErrorResponse, createSuccessResponse, AppError, ErrorCode, handleError } from "../shared/error-handler.ts"
import { publishEvent, createDomainEvent } from "../shared/event-publisher.ts"
import { createBlockchainClient } from "../shared/blockchain-client.ts"
import { createAsaasClient } from "../shared/asaas-client.ts"

const logger = createLogger("withdraw")

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

    // Validate request
    const validation = WithdrawRequestSchema.safeParse(body)
    if (!validation.success) {
      return createErrorResponse(
        `Validation error: ${validation.error.errors.map((e) => e.message).join(", ")}`,
        400
      )
    }

    const { amount, pix_address } = validation.data
    const stablecoinAddress = (body as Record<string, unknown>).stablecoin_address as string | undefined

    if (!stablecoinAddress) {
      return createErrorResponse("Missing stablecoin_address", 400)
    }

    const log = createLogger("withdraw")

    await log.info("Withdraw requested", {
      clientId: auth.clientId,
      stablecoinAddress,
      amount,
    })

    const supabase = getSupabaseClient()

    // Find stablecoin by ERC20 address
    const { data: stablecoin, error: stablecoinError } = await supabase
      .from("stablecoins")
      .select("*")
      .eq("erc20_address", stablecoinAddress)
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
      await log.warn("Unauthorized withdraw request", {
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

    const log2 = createLogger("withdraw", operationId)
    await log2.info("Processing withdrawal", {
      symbol: stablecoin.symbol,
      amount,
    })

    // Insert operation (burn_initiated)
    const { error: insertError } = await supabase.from("operations").insert({
      operation_id: operationId,
      stablecoin_id: stablecoin.stablecoin_id,
      operation_type: "withdraw",
      amount,
      pix_address,
      status: "burn_initiated",
    })

    if (insertError) {
      await log2.error("Database insert failed", { error: insertError.message })
      throw new AppError(
        ErrorCode.DATABASE_ERROR,
        "Failed to create withdraw request",
        500
      )
    }

    // Publish event
    await publishEvent(
      createDomainEvent(operationId, "withdraw.initiated", {
        operationId,
        stablecoinId: stablecoin.stablecoin_id,
        symbol: stablecoin.symbol,
        amount,
        pixAddress: pix_address,
      })
    )

    // Call blockchain to burn tokens
    let burnTxHash: string
    try {
      const blockchain = createBlockchainClient()
      const burnResult = await blockchain.burnTokens(
        stablecoinAddress,
        stablecoin.client_wallet,
        amount
      )

      burnTxHash = burnResult.hash

      // Update operation status
      await supabase
        .from("operations")
        .update({
          status: "tokens_burned",
          burn_tx_hash: burnTxHash,
          burned_at: new Date().toISOString(),
        })
        .eq("operation_id", operationId)

      await publishEvent(
        createDomainEvent(operationId, "withdraw.tokens_burned", {
          operationId,
          burnTxHash,
          symbol: stablecoin.symbol,
        })
      )

      await log2.info("Tokens burned successfully", {
        burnTxHash,
      })
    } catch (err) {
      await log2.error("Burn transaction failed", {}, err as Error)

      // Update operation status to failed
      await supabase
        .from("operations")
        .update({
          status: "burn_failed",
          error_message: (err as Error).message,
        })
        .eq("operation_id", operationId)

      await publishEvent(
        createDomainEvent(operationId, "withdraw.burn_failed", {
          operationId,
          error: (err as Error).message,
        })
      )

      return createErrorResponse(
        "Burn transaction failed",
        400,
        ErrorCode.BLOCKCHAIN_ERROR
      )
    }

    // Create transfer via Asaas
    try {
      const asaasClient = createAsaasClient()
      const transferResult = await asaasClient.createTransfer(
        pix_address,
        amount,
        `Stablecoin ${stablecoin.symbol} - Withdraw`
      )

      // Update operation with transfer info
      await supabase
        .from("operations")
        .update({
          status: "pix_transfer_pending",
          asaas_transfer_id: transferResult.id,
        })
        .eq("operation_id", operationId)

      await publishEvent(
        createDomainEvent(operationId, "withdraw.pix_initiated", {
          operationId,
          asaasTransferId: transferResult.id,
          pixAddress: pix_address,
        })
      )

      await log2.info("PIX transfer created", {
        transferId: transferResult.id,
        pixAddress: pix_address,
      })
    } catch (err) {
      await log2.error("PIX transfer creation failed", {}, err as Error)

      // Transfer creation failed - tokens already burned, this is a partial failure
      // Update status to reflect this
      await supabase
        .from("operations")
        .update({
          status: "burn_failed", // Keeping tokens_burned status
          error_message: `Burn successful but transfer failed: ${(err as Error).message}`,
        })
        .eq("operation_id", operationId)

      return createErrorResponse(
        "Transfer creation failed (tokens already burned)",
        400,
        ErrorCode.ASAAS_ERROR
      )
    }

    const response: WithdrawResponse = {
      operation_id: operationId,
      stablecoin_id: stablecoin.stablecoin_id,
      symbol: stablecoin.symbol,
      amount,
      burn_tx_hash: burnTxHash,
      status: "pix_transfer_pending",
    }

    return createSuccessResponse(response, 200)
  } catch (err) {
    const { response } = await handleError(err)
    return response
  }
})
