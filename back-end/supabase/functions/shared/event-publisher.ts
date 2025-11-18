import { getSupabaseClient } from "./supabase-client.ts"
import { createLogger } from "./logger.ts"

const logger = createLogger("event-publisher")

export interface DomainEvent {
  aggregateId: string
  eventType: string
  payload: Record<string, unknown>
  timestamp: string
}

export async function publishEvent(event: DomainEvent): Promise<void> {
  try {
    const supabase = getSupabaseClient()

    // Insert into event_store
    const { error } = await supabase.from("event_store").insert({
      aggregate_id: event.aggregateId,
      event_type: event.eventType,
      payload: event.payload,
      timestamp: event.timestamp,
    })

    if (error) {
      throw new Error(`Failed to publish event: ${error.message}`)
    }

    await logger.debug("Event published", {
      aggregateId: event.aggregateId,
      eventType: event.eventType,
    })
  } catch (err) {
    await logger.error("Error publishing event", {
      eventType: event.eventType,
      aggregateId: event.aggregateId,
    }, err as Error)
    throw err
  }
}

export function createDomainEvent(
  aggregateId: string,
  eventType: string,
  payload: Record<string, unknown>
): DomainEvent {
  return {
    aggregateId,
    eventType,
    payload,
    timestamp: new Date().toISOString(),
  }
}
