import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { getSupabaseClient } from "../shared/supabase-client.ts"
import { createLogger } from "../shared/logger.ts"
import { validateApiKey, extractApiKey } from "../shared/auth.ts"
import { createErrorResponse, createSuccessResponse, ErrorCode } from "../shared/error-handler.ts"
import { handleCorsPreFlight } from "../shared/cors.ts"

const logger = createLogger("list-client-operations")

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
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100)
    const offset = parseInt(url.searchParams.get("offset") || "0") || 0
    const status = url.searchParams.get("status") // optional: payment_pending, minted, etc.
    const operationType = url.searchParams.get("type") // optional: "deposit" | "withdraw"

    const log = createLogger("list-client-operations", undefined)
    await log.info("Listing client operations", {
      clientId: auth.clientId,
      limit,
      offset,
      status: status || "all",
      type: operationType || "all",
    })

    const supabase = getSupabaseClient()

    // List operations from all stablecoins owned by this client
    // Filter directly by client_id (now available in operations table) for better performance
    let query = supabase
      .from("operations")
      .select("*, stablecoins(stablecoin_id, symbol, erc20_address, status)", { count: "exact" })
      .eq("client_id", auth.clientId) // Direct filter on operations.client_id (no JOIN needed)

    // Apply filters
    if (status) {
      query = query.eq("status", status)
    }
    if (operationType) {
      query = query.eq("operation_type", operationType)
    }

    // Apply ordering and pagination
    const { data: operations, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      await log.error("Failed to list operations", { error: error.message }, error as Error)
      return createErrorResponse("Failed to list operations", 500, ErrorCode.DATABASE_ERROR)
    }

    const response = {
      data: operations,
      pagination: {
        limit,
        offset,
        total: count,
        has_more: offset + limit < (count || 0),
      },
    }

    await log.info("Operations listed successfully", {
      clientId: auth.clientId,
      count: operations?.length || 0,
      total: count,
    })

    return createSuccessResponse(response, 200)
  } catch (err) {
    console.error("Error listing operations:", err)
    return createErrorResponse("Internal server error", 500)
  }
})
