import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { getSupabaseClient } from "../shared/supabase-client.ts"
import { createLogger } from "../shared/logger.ts"
import { validateApiKey, extractApiKey } from "../shared/auth.ts"
import { createErrorResponse, createSuccessResponse, ErrorCode, AppError } from "../shared/error-handler.ts"
import { publishEvent, createDomainEvent } from "../shared/event-publisher.ts"
import { createBlockchainClient } from "../shared/blockchain-client.ts"

const logger = createLogger("stablecoin-create")

serve(async (req: Request) => {
  if (req.method !== "POST") {
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

    // Parse request body
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return createErrorResponse("Invalid JSON body", 400)
    }

    // Validate request
    const client_name = body.client_name as string
    const symbol = body.symbol as string
    const client_wallet = body.client_wallet as string
    const webhook = body.webhook as string
    const total_supply = body.total_supply as number

    if (!client_name || typeof client_name !== "string") {
      return createErrorResponse("Missing or invalid client_name", 400)
    }
    if (!symbol || typeof symbol !== "string" || symbol.length > 10) {
      return createErrorResponse("Missing or invalid symbol (max 10 chars)", 400)
    }
    if (!client_wallet || !client_wallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      return createErrorResponse("Invalid client_wallet (must be valid Ethereum address)", 400)
    }
    if (!webhook || typeof webhook !== "string") {
      return createErrorResponse("Missing or invalid webhook", 400)
    }
    if (!total_supply || typeof total_supply !== "number" || total_supply <= 0) {
      return createErrorResponse("Missing or invalid total_supply (must be > 0)", 400)
    }

    const log = createLogger("stablecoin-create", undefined)
    await log.info("Creating stablecoin", {
      clientId: auth.clientId,
      clientName: auth.clientName,
      symbol,
      totalSupply: total_supply,
    })

    const supabase = getSupabaseClient()

    // Check if symbol already exists
    const { data: existing } = await supabase
      .from("stablecoins")
      .select("id")
      .eq("symbol", symbol)
      .single()

    if (existing) {
      return createErrorResponse(
        "Symbol already exists",
        409,
        ErrorCode.CONFLICT
      )
    }

    // Generate stablecoin_id
    const stablecoinId = crypto.randomUUID()

    // Deploy ERC20 via factory contract
    let erc20Address: string
    let txHash: string
    let blockNumber: number

    try {
      await log.info("Deploying ERC20 contract on blockchain", { symbol, totalSupply: total_supply })
      const blockchainClient = createBlockchainClient()
      const deployResult = await blockchainClient.createStablecoin(
        client_name,
        symbol,
        client_wallet,
        total_supply
      )

      erc20Address = deployResult.address
      txHash = deployResult.txHash
      blockNumber = deployResult.blockNumber

      await log.info("ERC20 deployed successfully", {
        erc20Address,
        txHash,
        blockNumber,
      })
    } catch (err) {
      await log.error("Failed to deploy ERC20 contract", {
        symbol,
        error: (err as Error).message,
      }, err as Error)
      throw err
    }

    // Insert into database
    const { error: insertError } = await supabase.from("stablecoins").insert({
      stablecoin_id: stablecoinId,
      client_id: auth.clientId,
      client_name,
      client_wallet,
      webhook_url: webhook,
      symbol,
      erc20_address: erc20Address,
      status: "deployed",
      deployed_at: new Date().toISOString(),
    })

    if (insertError) {
      await log.error("Database insert failed", { error: insertError.message })
      throw new AppError(
        ErrorCode.DATABASE_ERROR,
        "Failed to save stablecoin",
        500
      )
    }

    // Publish events
    try {
      await publishEvent(
        createDomainEvent(
          stablecoinId,
          "stablecoin.registered",
          {
            stablecoinId,
            clientId: auth.clientId,
            clientName: client_name,
            symbol,
            clientWallet: client_wallet,
            totalSupply: total_supply,
          }
        )
      )

      await publishEvent(
        createDomainEvent(
          stablecoinId,
          "stablecoin.deployed",
          {
            stablecoinId,
            symbol,
            erc20Address,
            txHash,
            blockNumber,
          }
        )
      )
    } catch (err) {
      await log.warn("Failed to publish events", {}, err as Error)
      // Continue anyway, blockchain and database operations were successful
    }

    await log.info("Stablecoin created and deployed successfully", {
      stablecoinId,
      symbol,
      erc20Address,
    })

    const response = {
      stablecoin_id: stablecoinId,
      symbol,
      status: "deployed",
      erc20_address: erc20Address,
      tx_hash: txHash,
      block_number: blockNumber,
      created_at: new Date().toISOString(),
    }

    return createSuccessResponse(response, 201)
  } catch (err) {
    if (err instanceof AppError) {
      return createErrorResponse(err.message, err.statusCode, err.code)
    }
    console.error("Error creating stablecoin:", err)
    return createErrorResponse("Internal server error", 500)
  }
})
