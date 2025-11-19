import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { getSupabaseClient } from "../shared/supabase-client.ts"
import { createLogger } from "../shared/logger.ts"
import { validateApiKey, extractApiKey } from "../shared/auth.ts"
import { createErrorResponse, createSuccessResponse, ErrorCode } from "../shared/error-handler.ts"
import { handleCorsPreFlight } from "../shared/cors.ts"

const logger = createLogger("get-stablecoin-info")

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

    // Parse query parameters - accept either stablecoin_id or erc20_address
    const url = new URL(req.url)
    const stablecoinId = url.searchParams.get("stablecoin_id")
    const erc20Address = url.searchParams.get("erc20_address")

    if (!stablecoinId && !erc20Address) {
      return createErrorResponse(
        "Missing stablecoin_id or erc20_address query parameter",
        400,
        ErrorCode.INVALID_REQUEST
      )
    }

    const log = createLogger("get-stablecoin-info", undefined)
    await log.info("Getting stablecoin info", {
      clientId: auth.clientId,
      stablecoinId: stablecoinId || "N/A",
      erc20Address: erc20Address || "N/A",
    })

    const supabase = getSupabaseClient()

    // Query by stablecoin_id or erc20_address, ensure client ownership
    let query = supabase
      .from("stablecoins")
      .select("*")
      .eq("client_id", auth.clientId)

    if (stablecoinId) {
      query = query.eq("stablecoin_id", stablecoinId)
    } else if (erc20Address) {
      query = query.eq("erc20_address", erc20Address)
    }

    const { data: stablecoin, error } = await query.single()

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        await log.info("Stablecoin not found", {
          stablecoinId: stablecoinId || "N/A",
          erc20Address: erc20Address || "N/A",
        })
        return createErrorResponse("Stablecoin not found", 404, ErrorCode.NOT_FOUND)
      }

      await log.error("Failed to get stablecoin info", { error: error.message }, error as Error)
      return createErrorResponse("Failed to get stablecoin info", 500, ErrorCode.DATABASE_ERROR)
    }

    if (!stablecoin) {
      return createErrorResponse("Stablecoin not found", 404, ErrorCode.NOT_FOUND)
    }

    // Verify ownership (should be guaranteed by query, but double-check)
    if (stablecoin.client_id !== auth.clientId) {
      await log.warn("Unauthorized access attempt", {
        clientId: auth.clientId,
        stablecoinClientId: stablecoin.client_id,
      })
      return createErrorResponse("Unauthorized", 403, ErrorCode.UNAUTHORIZED)
    }

    await log.info("Stablecoin info retrieved successfully", {
      stablecoinId: stablecoin.stablecoin_id,
      symbol: stablecoin.symbol,
    })

    return createSuccessResponse(stablecoin, 200)
  } catch (err) {
    console.error("Error getting stablecoin info:", err)
    return createErrorResponse("Internal server error", 500)
  }
})
