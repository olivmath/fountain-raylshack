import { getSupabaseClient } from "./supabase-client.ts"
import { createLogger } from "./logger.ts"
import { publishEvent, createDomainEvent } from "./event-publisher.ts"
import type { ClientNotificationPayload } from "./types.ts"

export async function notifyClient(
  operationId: string,
  payload: ClientNotificationPayload
): Promise<void> {
  const log = createLogger("client-notifier", operationId)

  try {
    const supabase = getSupabaseClient()

    // Fetch operation to get stablecoin
    const { data: operation, error: opError } = await supabase
      .from("operations")
      .select("*, stablecoins(*)")
      .eq("operation_id", operationId)
      .single()

    if (opError || !operation) {
      await log.error("Operation not found for notification")
      return
    }

    const stablecoin = operation.stablecoins
    const webhookUrl = stablecoin.webhook_url

    await log.info("Sending notification to client", {
      webhookUrl,
    })

    // Send webhook to client
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      await log.warn("Client webhook returned non-2xx status", {
        status: response.status,
        statusText: response.statusText,
      })
    } else {
      await log.info("Client notified successfully")
    }

    // Update operation status
    await supabase
      .from("operations")
      .update({
        status: "client_notified",
        notified_at: new Date().toISOString(),
      })
      .eq("operation_id", operationId)

    // Publish event
    await publishEvent(
      createDomainEvent(operationId, `${payload.event.split("_")[0]}.client_notified`, {
        operationId,
        webhookUrl,
        clientWebhookStatus: response.status,
      })
    )
  } catch (err) {
    const log = createLogger("client-notifier", operationId)
    await log.error("Error notifying client", {}, err as Error)
    // Don't throw - notification failures shouldn't break the flow
  }
}
