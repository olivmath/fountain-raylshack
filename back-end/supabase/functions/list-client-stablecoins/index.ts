import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { getSupabaseClient } from "../shared/supabase-client.ts"
import { createLogger } from "../shared/logger.ts"
import { validateApiKey, extractApiKey } from "../shared/auth.ts"
import { createErrorResponse, createSuccessResponse, ErrorCode } from "../shared/error-handler.ts"
import { handleCorsPreFlight } from "../shared/cors.ts"

const logger = createLogger("list-client-stablecoins")

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
    const status = url.searchParams.get("status") // optional: "registered" | "deployed"

    const log = createLogger("list-client-stablecoins", undefined)
    await log.info("Listing stablecoins for client", {
      clientId: auth.clientId,
      limit,
      offset,
      status: status || "all",
    })

    const supabase = getSupabaseClient()

    // Build query
    let query = supabase
      .from("stablecoins")
      .select("*", { count: "exact" })
      .eq("client_id", auth.clientId)

    // Apply status filter if provided
    if (status) {
      query = query.eq("status", status)
    }

    // Apply ordering and pagination
    const { data: stablecoins, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      await log.error("Failed to list stablecoins", { error: error.message }, error as Error)
      return createErrorResponse("Failed to list stablecoins", 500, ErrorCode.DATABASE_ERROR)
    }

    const response = {
      data: stablecoins,
      pagination: {
        limit,
        offset,
        total: count,
        has_more: offset + limit < (count || 0),
      },
    }

    await log.info("Stablecoins listed successfully", {
      clientId: auth.clientId,
      count: stablecoins?.length || 0,
      total: count,
    })

    return createSuccessResponse(response, 200)
  } catch (err) {
    console.error("Error listing stablecoins:", err)
    return createErrorResponse("Internal server error", 500)
  }
})
