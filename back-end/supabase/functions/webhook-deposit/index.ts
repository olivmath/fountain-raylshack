import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { getSupabaseClient } from "../shared/supabase-client.ts"
import { createLogger } from "../shared/logger.ts"
import { createErrorResponse, createSuccessResponse, AppError, ErrorCode, handleError } from "../shared/error-handler.ts"
import { publishEvent, createDomainEvent } from "../shared/event-publisher.ts"
import { createAsaasClient } from "../shared/asaas-client.ts"
import { mintTokensForDeposit } from "../shared/blockchain-minter.ts"
import { notifyClient } from "../shared/client-notifier.ts"

const logger = createLogger("webhook-deposit")

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed", 405)
  }

  try {
    // Get webhook signature from headers
    const signature = req.headers.get("asaas-signature")
    if (!signature) {
      return createErrorResponse("Missing webhook signature", 401, ErrorCode.UNAUTHORIZED)
    }

    // Get raw body for signature validation
    const rawBody = await req.text()
    const bodyJson = JSON.parse(rawBody)

    // Validate signature
    const asaasClient = createAsaasClient()
    const apiKey = Deno.env.get("ASAAS_WEBHOOK_KEY")
    if (!apiKey) {
      await logger.error("Missing ASAAS_WEBHOOK_KEY")
      return createErrorResponse("Server configuration error", 500)
    }

    const isValid = await asaasClient.validateWebhookSignature(rawBody, signature, apiKey)
    if (!isValid) {
      await logger.warn("Invalid webhook signature")
      return createErrorResponse("Invalid signature", 401, ErrorCode.UNAUTHORIZED)
    }

    // Extract operation_id from webhook payload
    const operationId = bodyJson.data?.externalReference
    if (!operationId) {
      await logger.warn("Missing externalReference in webhook")
      return createSuccessResponse({ status: "ok" }) // Accept anyway to avoid Asaas retry
    }

    const log = createLogger("webhook-deposit", operationId)
    await log.info("Webhook received", {
      event: bodyJson.event,
      paymentStatus: bodyJson.data?.status,
    })

    const supabase = getSupabaseClient()

    // Find operation
    const { data: operation, error: opError } = await supabase
      .from("operations")
      .select("*, stablecoins(*)")
      .eq("operation_id", operationId)
      .single()

    if (opError || !operation) {
      await log.warn("Operation not found")
      return createSuccessResponse({ status: "operation_not_found" })
    }

    // Update operation status
    await supabase
      .from("operations")
      .update({
        status: "payment_deposited",
        payment_confirmed_at: new Date().toISOString(),
      })
      .eq("operation_id", operationId)

    // Publish event
    await publishEvent(
      createDomainEvent(operationId, "deposit.payment_confirmed", {
        operationId,
        asaasPaymentId: bodyJson.data?.id,
        status: bodyJson.data?.status,
      })
    )

    await log.info("Payment confirmed, initiating mint")

    // Call blockchain minter
    try {
      const mintResult = await mintTokensForDeposit(operationId)

      // Notify client
      await notifyClient(operationId, {
        operation_id: operationId,
        event: "deposit_completed",
        stablecoin_address: mintResult.erc20Address,
        symbol: operation.stablecoins.symbol,
        tx_hash: mintResult.txHash,
        amount: operation.amount,
        client_wallet: operation.stablecoins.client_wallet,
        first_deployment: mintResult.firstDeployment,
        timestamp: new Date().toISOString(),
      })

      await log.info("Deposit processed successfully")
    } catch (err) {
      await log.error("Error processing deposit", {}, err as Error)
      // Still return 200 so Asaas doesn't retry
    }

    return createSuccessResponse({ status: "ok" })
  } catch (err) {
    const { response } = await handleError(err)
    return response
  }
})
