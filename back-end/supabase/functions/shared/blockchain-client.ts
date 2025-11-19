import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  type PublicClient,
  type WalletClient,
} from "https://esm.sh/viem@2.8.11"
// @ts-ignore - esm.sh transpilation issue
import { privateKeyToAccount } from "https://esm.sh/viem@2.8.11/accounts.js"
import { createLogger } from "./logger.ts"
import { AppError, ErrorCode } from "./error-handler.ts"
import type { ContractDeployResult, TransactionResult } from "./types.ts"

const logger = createLogger("blockchain-client")

// Factory contract ABI - https://github.com/olivmath/fountain
const FACTORY_ABI = [
  {
    name: "createStablecoin",
    type: "function",
    inputs: [
      { name: "name_", type: "string" },
      { name: "symbol_", type: "string" },
      { name: "decimals_", type: "uint8" },
    ],
    outputs: [{ name: "stablecoinAddress", type: "address" }],
    stateMutability: "nonpayable",
  },
  {
    name: "mintTokens",
    type: "function",
    inputs: [
      { name: "stablecoinAddress", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "burnTokens",
    type: "function",
    inputs: [
      { name: "stablecoinAddress", type: "address" },
      { name: "from", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
]

export class BlockchainClient {
  private publicClient: PublicClient
  private walletClient: WalletClient
  private factoryAddress: string
  private ownerAddress: string
  private ownerPrivateKey: string
  private chainId: number

  constructor() {
    const rpcUrl = Deno.env.get("BLOCKCHAIN_RPC_URL")
    const factoryAddress = Deno.env.get("FACTORY_CONTRACT_ADDRESS")
    const ownerAddress = Deno.env.get("OWNER_ADDRESS")
    const ownerPrivateKey = Deno.env.get("OWNER_PRIVATE_KEY")
    const chainId = parseInt(Deno.env.get("CHAIN_ID") || "11155111") // Sepolia testnet by default

    if (!rpcUrl || !factoryAddress || !ownerAddress || !ownerPrivateKey) {
      throw new Error(
        "Missing required blockchain environment variables: BLOCKCHAIN_RPC_URL, FACTORY_CONTRACT_ADDRESS, OWNER_ADDRESS, OWNER_PRIVATE_KEY"
      )
    }

    this.factoryAddress = factoryAddress
    this.ownerAddress = ownerAddress
    this.ownerPrivateKey = ownerPrivateKey
    this.chainId = chainId

    this.publicClient = createPublicClient({
      transport: http(rpcUrl),
    })

    // Create account from private key for signing
    const account = (privateKeyToAccount as any)(ownerPrivateKey as `0x${string}`)

    this.walletClient = createWalletClient({
      account,
      chain: { id: chainId, name: "Custom", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } },
      transport: http(rpcUrl),
    })
  }

  async createStablecoin(
    name: string,
    symbol: string,
    decimals: number = 18
  ): Promise<string> {
    try {
      await logger.debug("Creating stablecoin on blockchain", {
        name,
        symbol,
        decimals,
      })

      console.log("[BlockchainClient] createStablecoin called", {
        name,
        symbol,
        decimals,
        factoryAddress: this.factoryAddress,
        chainId: this.chainId,
      })

      // Execute transaction with explicit gas settings
      console.log("[BlockchainClient] Calling writeContract with args:", [name, symbol, decimals])
      let hash: string
      try {
        hash = await this.walletClient.writeContract({
          address: this.factoryAddress as `0x${string}`,
          abi: FACTORY_ABI,
          functionName: "createStablecoin",
          args: [name, symbol, decimals as unknown as any],
          gas: 3000000n, // 3M gas limit
          maxFeePerGas: parseUnits("100", "gwei"),
          maxPriorityFeePerGas: parseUnits("10", "gwei"),
        })
      } catch (writeErr) {
        const errMsg = writeErr instanceof Error ? writeErr.message : String(writeErr)
        console.error("[BlockchainClient] writeContract failed:", {
          error: errMsg,
          errorFull: String(writeErr),
        })
        throw writeErr
      }

      console.log("[BlockchainClient] Transaction hash:", hash)

      await logger.info("Stablecoin creation transaction sent", {
        txHash: hash,
        symbol,
      })

      // Wait for confirmation
      console.log("[BlockchainClient] Waiting for transaction receipt:", hash)
      let receipt
      try {
        receipt = await this.publicClient.waitForTransactionReceipt({ hash })
        console.log("[BlockchainClient] Transaction receipt received:", {
          status: receipt.status,
          blockNumber: receipt.blockNumber.toString(),
        })
      } catch (receiptErr) {
        const errMsg = receiptErr instanceof Error ? receiptErr.message : String(receiptErr)
        console.error("[BlockchainClient] waitForTransactionReceipt failed:", errMsg)
        throw receiptErr
      }

      if (receipt.status !== "success") {
        console.error("[BlockchainClient] Transaction failed with status:", receipt.status)
        throw new Error("Transaction failed")
      }

      await logger.info("Stablecoin created successfully", {
        txHash: hash,
        symbol,
        blockNumber: receipt.blockNumber.toString(),
      })

      // Parse logs to extract token address
      const logs = receipt.logs
      let tokenAddress: string | null = null

      console.log("[BlockchainClient] Receipt logs count:", logs?.length || 0)

      // Look for StablecoinCreated event (would need proper parsing)
      // For now, return the contract address from logs
      if (logs && logs.length > 0) {
        // The first log should contain the created token address
        // In a real scenario, you'd parse the event properly
        tokenAddress = logs[0].address
        console.log("[BlockchainClient] Extracted token address from logs:", tokenAddress)
      } else {
        console.warn("[BlockchainClient] No logs found in receipt")
      }

      if (!tokenAddress) {
        console.error("[BlockchainClient] Could not extract token address from transaction receipt")
        throw new Error("Could not extract token address from transaction receipt")
      }

      console.log("[BlockchainClient] Returning token address:", tokenAddress)
      return tokenAddress
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      const errorStack = err instanceof Error ? err.stack : "No stack trace"

      console.error("[BlockchainClient] ERROR in createStablecoin:", {
        message: errorMessage,
        stack: errorStack,
        symbol,
      })

      await logger.error("Error creating stablecoin", { symbol, errorMessage }, err as Error)
      throw new AppError(
        ErrorCode.BLOCKCHAIN_ERROR,
        "Failed to create stablecoin on blockchain",
        500
      )
    }
  }

  async mintTokens(
    stablecoinAddress: string,
    recipientAddress: string,
    amount: number
  ): Promise<TransactionResult> {
    try {
      await logger.debug("Minting tokens on blockchain", {
        stablecoinAddress,
        recipientAddress,
        amount,
      })

      const amountWei = parseUnits(amount.toString(), 18)

      console.log("[BlockchainClient] mintTokens called", {
        stablecoinAddress,
        recipientAddress,
        amount,
      })

      const hash = await this.walletClient.writeContract({
        address: this.factoryAddress as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: "mintTokens",
        args: [
          stablecoinAddress as `0x${string}`,
          recipientAddress as `0x${string}`,
          amountWei,
        ],
        gas: 3000000n,
        maxFeePerGas: parseUnits("100", "gwei"),
        maxPriorityFeePerGas: parseUnits("10", "gwei"),
      })

      console.log("[BlockchainClient] Mint transaction hash:", hash)

      await logger.info("Mint transaction sent", {
        txHash: hash,
        stablecoinAddress,
      })

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status !== "success") {
        throw new AppError(
          ErrorCode.BLOCKCHAIN_ERROR,
          "Mint transaction failed",
          500
        )
      }

      await logger.info("Tokens minted successfully", {
        txHash: hash,
        stablecoinAddress,
        blockNumber: receipt.blockNumber.toString(),
      })

      return {
        hash,
        blockNumber: Number(receipt.blockNumber),
        status: "success",
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      const errorStack = err instanceof Error ? err.stack : "No stack trace"

      console.error("[BlockchainClient] ERROR in mintTokens:", {
        message: errorMessage,
        stack: errorStack,
      })

      if (err instanceof AppError) throw err
      await logger.error("Error minting tokens", { errorMessage }, err as Error)
      throw new AppError(
        ErrorCode.BLOCKCHAIN_ERROR,
        "Failed to mint tokens",
        500
      )
    }
  }

  async burnTokens(
    stablecoinAddress: string,
    fromAddress: string,
    amount: number
  ): Promise<TransactionResult> {
    try {
      await logger.debug("Burning tokens on blockchain", {
        stablecoinAddress,
        fromAddress,
        amount,
      })

      const amountWei = parseUnits(amount.toString(), 18)

      console.log("[BlockchainClient] burnTokens called", {
        stablecoinAddress,
        fromAddress,
        amount,
      })

      const hash = await this.walletClient.writeContract({
        address: this.factoryAddress as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: "burnTokens",
        args: [
          stablecoinAddress as `0x${string}`,
          fromAddress as `0x${string}`,
          amountWei,
        ],
        gas: 3000000n,
        maxFeePerGas: parseUnits("100", "gwei"),
        maxPriorityFeePerGas: parseUnits("10", "gwei"),
      })

      console.log("[BlockchainClient] Burn transaction hash:", hash)

      await logger.info("Burn transaction sent", {
        txHash: hash,
        stablecoinAddress,
      })

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status !== "success") {
        throw new AppError(
          ErrorCode.BLOCKCHAIN_ERROR,
          "Burn transaction failed",
          500
        )
      }

      await logger.info("Tokens burned successfully", {
        txHash: hash,
        stablecoinAddress,
        blockNumber: receipt.blockNumber.toString(),
      })

      return {
        hash,
        blockNumber: Number(receipt.blockNumber),
        status: "success",
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      const errorStack = err instanceof Error ? err.stack : "No stack trace"

      console.error("[BlockchainClient] ERROR in burnTokens:", {
        message: errorMessage,
        stack: errorStack,
      })

      if (err instanceof AppError) throw err
      await logger.error("Error burning tokens", { errorMessage }, err as Error)
      throw new AppError(
        ErrorCode.BLOCKCHAIN_ERROR,
        "Failed to burn tokens",
        500
      )
    }
  }
}

export function createBlockchainClient(): BlockchainClient {
  return new BlockchainClient()
}
