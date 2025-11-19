import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { getSupabaseClient } from "../shared/supabase-client.ts"
import { createLogger } from "../shared/logger.ts"
import { validateApiKey, extractApiKey } from "../shared/auth.ts"
import { createErrorResponse, createSuccessResponse, ErrorCode } from "../shared/error-handler.ts"
import { handleCorsPreFlight } from "../shared/cors.ts"

const logger = createLogger("list-stablecoin-operations")

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
    const stablecoinId = url.searchParams.get("stablecoin_id")
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100)
    const offset = parseInt(url.searchParams.get("offset") || "0") || 0
    const status = url.searchParams.get("status") // optional: payment_pending, minted, etc.
    const operationType = url.searchParams.get("type") // optional: "deposit" | "withdraw"

    if (!stablecoinId) {
      return createErrorResponse(
        "Missing stablecoin_id query parameter",
        400,
        ErrorCode.INVALID_REQUEST
      )
    }

    const log = createLogger("list-stablecoin-operations", undefined)
    await log.info("Listing stablecoin operations", {
      clientId: auth.clientId,
      stablecoinId,
      limit,
      offset,
      status: status || "all",
      type: operationType || "all",
    })

    const supabase = getSupabaseClient()

    // Step 1: Verify stablecoin belongs to client
    const { data: stablecoin, error: stablecoinError } = await supabase
      .from("stablecoins")
      .select("stablecoin_id")
      .eq("client_id", auth.clientId)
      .eq("stablecoin_id", stablecoinId)
      .single()

    if (stablecoinError || !stablecoin) {
      await log.warn("Unauthorized access or stablecoin not found", {
        clientId: auth.clientId,
        stablecoinId,
      })
      return createErrorResponse("Stablecoin not found or unauthorized", 404, ErrorCode.NOT_FOUND)
    }

    // Step 2: List operations for this stablecoin
    let query = supabase
      .from("operations")
      .select("*", { count: "exact" })
      .eq("stablecoin_id", stablecoinId)

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
      stablecoinId,
      count: operations?.length || 0,
      total: count,
    })

    return createSuccessResponse(response, 200)
  } catch (err) {
    console.error("Error listing operations:", err)
    return createErrorResponse("Internal server error", 500)
  }
})
