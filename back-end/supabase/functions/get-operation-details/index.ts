import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { getSupabaseClient } from "../shared/supabase-client.ts"
import { createLogger } from "../shared/logger.ts"
import { validateApiKey, extractApiKey } from "../shared/auth.ts"
import { createErrorResponse, createSuccessResponse, ErrorCode } from "../shared/error-handler.ts"
import { handleCorsPreFlight } from "../shared/cors.ts"

const logger = createLogger("get-operation-details")

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreFlight(req)
  if (corsResponse) return corsResponse

  if (req.method !== "GET") {
    return createErrorResponse("Method not allowed", 405)
  }

  try {
    // Extract and validate API key
    const apiKey = extractApiKey(req)
    if (!apiKey) {
      return createErrorResponse("Missing x-api-key header", 401)
    }

    const auth = await validateApiKey(apiKey)
    if (!auth.valid) {
      return createErrorResponse("Invalid API key", 401)
    }

    // Parse query parameters
    const url = new URL(req.url)
    const operationId = url.searchParams.get("operation_id")

    if (!operationId) {
      return createErrorResponse(
        "Missing operation_id query parameter",
        400,
        ErrorCode.INVALID_REQUEST
      )
    }

    const log = createLogger("get-operation-details", undefined)
    await log.info("Getting operation details", {
      clientId: auth.clientId,
      operationId,
    })

    const supabase = getSupabaseClient()

    // Step 1: Get operation with related stablecoin data
    const { data: operation, error: operationError } = await supabase
      .from("operations")
      .select("*, stablecoins!inner(*)")
      .eq("operation_id", operationId)
      .single()

    if (operationError || !operation) {
      await log.info("Operation not found", { operationId })
      return createErrorResponse("Operation not found", 404, ErrorCode.NOT_FOUND)
    }

    // Step 2: Verify client ownership
    if ((operation as any).stablecoins?.[0]?.client_id !== auth.clientId) {
      await log.warn("Unauthorized access to operation", {
        clientId: auth.clientId,
        operationClientId: (operation as any).stablecoins?.[0]?.client_id,
      })
      return createErrorResponse("Unauthorized", 403, ErrorCode.UNAUTHORIZED)
    }

    // Step 3: Get related logs (last 20)
    const { data: logs, error: logsError } = await supabase
      .from("logs")
      .select("*")
      .eq("operation_id", operationId)
      .order("timestamp", { ascending: false })
      .limit(20)

    if (logsError) {
      await log.warn("Failed to fetch logs", { error: logsError.message })
      // Don't fail the request, just omit logs
    }

    // Step 4: Get related events from event_store
    const { data: events, error: eventsError } = await supabase
      .from("event_store")
      .select("*")
      .eq("aggregate_id", operationId)
      .order("timestamp", { ascending: true })

    if (eventsError) {
      await log.warn("Failed to fetch events", { error: eventsError.message })
      // Don't fail the request, just omit events
    }

    const response = {
      operation,
      logs: logs || [],
      events: events || [],
    }

    await log.info("Operation details retrieved successfully", {
      operationId,
      operationType: (operation as any).operation_type,
    })

    return createSuccessResponse(response, 200)
  } catch (err) {
    console.error("Error getting operation details:", err)
    return createErrorResponse("Internal server error", 500)
  }
})
