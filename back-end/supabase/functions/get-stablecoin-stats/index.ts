import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { getSupabaseClient } from "../shared/supabase-client.ts"
import { createLogger } from "../shared/logger.ts"
import { validateApiKey, extractApiKey } from "../shared/auth.ts"
import { createErrorResponse, createSuccessResponse, ErrorCode } from "../shared/error-handler.ts"
import { handleCorsPreFlight } from "../shared/cors.ts"

const logger = createLogger("get-stablecoin-stats")

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

    if (!stablecoinId) {
      return createErrorResponse(
        "Missing stablecoin_id query parameter",
        400,
        ErrorCode.INVALID_REQUEST
      )
    }

    const log = createLogger("get-stablecoin-stats", undefined)
    await log.info("Getting stablecoin stats", {
      clientId: auth.clientId,
      stablecoinId,
    })

    const supabase = getSupabaseClient()

    // Step 1: Verify stablecoin belongs to client
    const { data: stablecoin, error: stablecoinError } = await supabase
      .from("stablecoins")
      .select("*")
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

    // Step 2: Get deposit statistics
    const { data: depositStats } = await supabase
      .from("operations")
      .select("amount, status", { count: "exact" })
      .eq("stablecoin_id", stablecoinId)
      .eq("operation_type", "deposit")

    const totalDeposits = depositStats?.length || 0
    const totalDepositAmount =
      depositStats?.reduce((sum, op) => sum + (Number(op.amount) || 0), 0) || 0
    const successfulDeposits = depositStats?.filter((op) => op.status === "minted").length || 0

    // Step 3: Get withdrawal statistics
    const { data: withdrawStats } = await supabase
      .from("operations")
      .select("amount, status", { count: "exact" })
      .eq("stablecoin_id", stablecoinId)
      .eq("operation_type", "withdraw")

    const totalWithdrawals = withdrawStats?.length || 0
    const totalWithdrawalAmount =
      withdrawStats?.reduce((sum, op) => sum + (Number(op.amount) || 0), 0) || 0
    const successfulWithdrawals =
      withdrawStats?.filter((op) => op.status === "withdraw_successful").length || 0

    // Step 4: Get status breakdown
    const { data: allOperations } = await supabase
      .from("operations")
      .select("status")
      .eq("stablecoin_id", stablecoinId)

    const statusBreakdown = allOperations?.reduce(
      (acc, op) => {
        acc[op.status] = (acc[op.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    ) || {}

    // Step 5: Get latest operation
    const { data: latestOperation } = await supabase
      .from("operations")
      .select("*")
      .eq("stablecoin_id", stablecoinId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    const response = {
      stablecoin_id: stablecoinId,
      symbol: stablecoin.symbol,
      erc20_address: stablecoin.erc20_address,
      status: stablecoin.status,
      created_at: stablecoin.created_at,
      deployed_at: stablecoin.deployed_at,
      stats: {
        deposits: {
          total_count: totalDeposits,
          successful_count: successfulDeposits,
          total_amount: totalDepositAmount,
        },
        withdrawals: {
          total_count: totalWithdrawals,
          successful_count: successfulWithdrawals,
          total_amount: totalWithdrawalAmount,
        },
        volume: {
          total_deposits: totalDepositAmount,
          total_withdrawals: totalWithdrawalAmount,
          net_volume: totalDepositAmount - totalWithdrawalAmount,
        },
        status_breakdown: statusBreakdown,
        latest_operation: latestOperation
          ? {
              operation_id: latestOperation.operation_id,
              type: latestOperation.operation_type,
              amount: latestOperation.amount,
              status: latestOperation.status,
              created_at: latestOperation.created_at,
            }
          : null,
      },
    }

    await log.info("Stablecoin stats retrieved successfully", {
      stablecoinId,
      totalDeposits,
      totalWithdrawals,
    })

    return createSuccessResponse(response, 200)
  } catch (err) {
    console.error("Error getting stablecoin stats:", err)
    return createErrorResponse("Internal server error", 500)
  }
})
