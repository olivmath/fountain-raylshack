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
      // NOTE: First deployment already happened during stablecoin-create
      // All tokens were minted to owner during deployment
      // Now we just need to transfer the deposit amount from owner to client wallet
      await log.info("First deposit - transferring tokens from owner to client", {
        symbol: stablecoin.symbol,
        amount: operation.amount,
      })

      erc20Address = stablecoin.erc20_address

      if (!erc20Address) {
        throw new AppError(ErrorCode.NOT_FOUND, "Stablecoin ERC20 address not found")
      }

      // Transfer tokens from owner to client wallet
      const transferResult = await blockchain.transferTokens(
        erc20Address,
        stablecoin.client_wallet,
        operation.amount
      )

      txHash = transferResult.hash

      await publishEvent(
        createDomainEvent(stablecoin.stablecoin_id, "stablecoin.first_deposit_transferred", {
          symbol: stablecoin.symbol,
          erc20Address,
          txHash,
          amount: operation.amount,
        })
      )
    } else {
      // Subsequent deposits - transfer tokens from owner to client wallet
      await log.info("Subsequent deposit - transferring tokens from owner to client", {
        symbol: stablecoin.symbol,
        erc20Address,
        amount: operation.amount,
      })

      const transferResult = await blockchain.transferTokens(
        erc20Address,
        stablecoin.client_wallet,
        operation.amount
      )

      txHash = transferResult.hash
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
