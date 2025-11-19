import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { getSupabaseClient } from "../shared/supabase-client.ts"
import { createLogger } from "../shared/logger.ts"
import { createErrorResponse, createSuccessResponse } from "../shared/error-handler.ts"
import { publishEvent, createDomainEvent } from "../shared/event-publisher.ts"
import { createAsaasClient } from "../shared/asaas-client.ts"
import { notifyClient } from "../shared/client-notifier.ts"

const logger = createLogger("webhook-withdraw")

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed", 405)
  }

  try {
    // Get webhook signature from headers
    const signature = req.headers.get("asaas-signature")
    if (!signature) {
      return createErrorResponse("Missing webhook signature", 401)
    }

    // Get raw body for signature validation
    const rawBody = await req.text()
    const bodyJson = JSON.parse(rawBody)

    // Validate signature
    const asaasClient = createAsaasClient()
    const apiKey = Deno.env.get("ASAAS_WEBHOOK_SECRET") || Deno.env.get("ASAAS_WEBHOOK_KEY")
    if (!apiKey) {
      await logger.error("Missing ASAAS_WEBHOOK_KEY")
      return createErrorResponse("Server configuration error", 500)
    }

    const isValid = await asaasClient.validateWebhookSignature(rawBody, signature, apiKey)
    if (!isValid) {
      await logger.warn("Invalid webhook signature")
      return createErrorResponse("Invalid signature", 401)
    }

    // Find operation by asaas_transfer_id
    // Note: Asaas webhook data structure for transfers needs to be confirmed
    const asaasTransferId = bodyJson.data?.id
    if (!asaasTransferId) {
      await logger.warn("Missing transfer ID in webhook")
      return createSuccessResponse({ status: "ok" })
    }

    const supabase = getSupabaseClient()

    // Find operation by asaas_transfer_id
    const { data: operation, error: opError } = await supabase
      .from("operations")
      .select("*, stablecoins(*)")
      .eq("asaas_transfer_id", asaasTransferId)
      .single()

    if (opError || !operation) {
      await logger.warn("Operation not found for transfer", {
        asaasTransferId,
      })
      return createSuccessResponse({ status: "operation_not_found" })
    }

    const log = createLogger("webhook-withdraw", operation.operation_id)
    const stablecoin = operation.stablecoins

    await log.info("Withdrawal confirmed via webhook", {
      symbol: stablecoin.symbol,
      transferStatus: bodyJson.data?.status,
    })

    // Update operation status
    await supabase
      .from("operations")
      .update({
        status: "withdraw_successful",
        pix_transferred_at: new Date().toISOString(),
      })
      .eq("operation_id", operation.operation_id)

    // Publish event
    await publishEvent(
      createDomainEvent(operation.operation_id, "withdraw.pix_confirmed", {
        operationId: operation.operation_id,
        asaasTransferId,
        transferStatus: bodyJson.data?.status,
      })
    )

    // Notify client
    try {
      await notifyClient(operation.operation_id, {
        operation_id: operation.operation_id,
        event: "withdraw_completed",
        burn_tx_hash: operation.burn_tx_hash,
        amount: operation.amount,
        pix_address: operation.pix_address,
        timestamp: new Date().toISOString(),
      })

      await log.info("Withdrawal completed and client notified")
    } catch (err) {
      await log.error("Error notifying client", {}, err as Error)
      // Continue - withdrawal is complete even if notification fails
    }

    return createSuccessResponse({ status: "ok" })
  } catch (err) {
    await logger.error("Error processing webhook", {}, err as Error)
    return createSuccessResponse({ status: "ok" }) // Return 200 to prevent Asaas retry
  }
})
