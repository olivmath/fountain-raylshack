import { getSupabaseClient } from "./supabase-client.ts"
import { createLogger } from "./logger.ts"
import { createBlockchainClient } from "./blockchain-client.ts"
import { publishEvent, createDomainEvent } from "./event-publisher.ts"
import { AppError, ErrorCode } from "./error-handler.ts"

export async function mintTokensForDeposit(operationId: string): Promise<{
  erc20Address: string
  txHash: string
  firstDeployment: boolean
}> {
  const log = createLogger("blockchain-minter", operationId)

  try {
    const supabase = getSupabaseClient()

    // Fetch operation and stablecoin
    const { data: operation, error: opError } = await supabase
      .from("operations")
      .select("*, stablecoins(*)")
      .eq("operation_id", operationId)
      .single()

    if (opError || !operation) {
      await log.error("Operation not found", { operationId })
      throw new AppError(ErrorCode.NOT_FOUND, "Operation not found")
    }

    const stablecoin = operation.stablecoins
    if (!stablecoin) {
      throw new AppError(ErrorCode.NOT_FOUND, "Stablecoin not found")
    }

    // Check if this is the first deposit
    const isFirstDeployment = !stablecoin.erc20_address

    await log.info("Processing deposit", {
      symbol: stablecoin.symbol,
      amount: operation.amount,
      isFirstDeployment,
    })

    // Update operation status
    await supabase
      .from("operations")
      .update({ status: "minting_in_progress" })
      .eq("operation_id", operationId)

    const blockchain = createBlockchainClient()
    let erc20Address = stablecoin.erc20_address
    let txHash: string

    if (isFirstDeployment) {
      // Deploy new stablecoin contract
      await log.info("Deploying new stablecoin contract", {
        symbol: stablecoin.symbol,
      })

      const deployResult = await blockchain.createStablecoin(
        stablecoin.client_name,
        stablecoin.symbol,
        stablecoin.client_wallet,
        operation.amount
      )

      erc20Address = deployResult.address
      txHash = deployResult.txHash

      // Update stablecoin with contract address
      await supabase
        .from("stablecoins")
        .update({
          erc20_address: erc20Address,
          status: "deployed",
          deployed_at: new Date().toISOString(),
        })
        .eq("stablecoin_id", stablecoin.stablecoin_id)

      await publishEvent(
        createDomainEvent(stablecoin.stablecoin_id, "stablecoin.deployed", {
          symbol: stablecoin.symbol,
          erc20Address,
          txHash,
        })
      )
    } else {
      // Mint tokens to existing contract
      await log.info("Minting tokens to existing contract", {
        symbol: stablecoin.symbol,
        erc20Address,
      })

      const mintResult = await blockchain.mintTokens(
        erc20Address,
        stablecoin.client_wallet,
        operation.amount
      )

      txHash = mintResult.hash
    }

    // Update operation with transaction details
    await supabase
      .from("operations")
      .update({
        status: "minted",
        tx_hash: txHash,
        minted_at: new Date().toISOString(),
      })
      .eq("operation_id", operationId)

    await publishEvent(
      createDomainEvent(operationId, "deposit.minted", {
        operationId,
        stablecoinId: stablecoin.stablecoin_id,
        symbol: stablecoin.symbol,
        erc20Address,
        txHash,
        amount: operation.amount,
        firstDeployment: isFirstDeployment,
      })
    )

    await log.info("Tokens minted successfully", {
      erc20Address,
      txHash,
      firstDeployment: isFirstDeployment,
    })

    return {
      erc20Address,
      txHash,
      firstDeployment: isFirstDeployment,
    }
  } catch (err) {
    await log.error("Error minting tokens", {}, err as Error)

    // Update operation status to failed
    try {
      const supabase = getSupabaseClient()
      await supabase
        .from("operations")
        .update({
          status: "mint_failed",
          error_message: (err as Error).message,
        })
        .eq("operation_id", operationId)

      await publishEvent(
        createDomainEvent(operationId, "deposit.mint_failed", {
          operationId,
          error: (err as Error).message,
        })
      )
    } catch {
      // Ignore error in error handling
    }

    throw err
  }
}
