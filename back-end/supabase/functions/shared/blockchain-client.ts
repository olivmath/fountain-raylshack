import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  type PublicClient,
  type WalletClient,
} from "https://esm.sh/viem@2.8.11"
import { createLogger } from "./logger.ts"
import { AppError, ErrorCode } from "./error-handler.ts"
import type { ContractDeployResult, TransactionResult } from "./types.ts"

const logger = createLogger("blockchain-client")

// Factory contract ABI (minimal)
const FACTORY_ABI = [
  {
    name: "createStablecoin",
    type: "function",
    inputs: [
      { name: "clientName", type: "string" },
      { name: "symbol", type: "string" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "nonpayable",
  },
  {
    name: "mintTokens",
    type: "function",
    inputs: [
      { name: "tokenAddress", type: "address" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "burnTokens",
    type: "function",
    inputs: [
      { name: "tokenAddress", type: "address" },
      { name: "account", type: "address" },
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

    this.walletClient = createWalletClient({
      account: ownerAddress as `0x${string}`,
      chain: { id: chainId, name: "Custom", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } },
      transport: http(rpcUrl),
    })
  }

  async createStablecoin(
    clientName: string,
    symbol: string,
    recipientAddress: string,
    amount: number
  ): Promise<ContractDeployResult> {
    try {
      await logger.debug("Creating stablecoin on blockchain", {
        clientName,
        symbol,
        recipientAddress,
        amount,
      })

      const amountWei = parseUnits(amount.toString(), 18)

      // Simulate transaction first
      const { result } = await this.publicClient.simulateContract({
        account: this.ownerAddress as `0x${string}`,
        address: this.factoryAddress as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: "createStablecoin",
        args: [clientName, symbol, recipientAddress as `0x${string}`, amountWei],
        chain: { id: this.chainId },
      })

      // Execute transaction
      const hash = await this.walletClient.writeContract({
        account: this.ownerAddress as `0x${string}`,
        address: this.factoryAddress as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: "createStablecoin",
        args: [clientName, symbol, recipientAddress as `0x${string}`, amountWei],
      })

      await logger.info("Stablecoin creation transaction sent", {
        txHash: hash,
        symbol,
      })

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status !== "success") {
        throw new AppError(
          ErrorCode.BLOCKCHAIN_ERROR,
          "Transaction failed",
          500
        )
      }

      // Extract created token address from logs (simplified - would need to parse logs properly)
      const tokenAddress = result as `0x${string}`

      await logger.info("Stablecoin created successfully", {
        txHash: hash,
        symbol,
        tokenAddress,
        blockNumber: receipt.blockNumber.toString(),
      })

      return {
        address: tokenAddress,
        txHash: hash,
        blockNumber: Number(receipt.blockNumber),
      }
    } catch (err) {
      if (err instanceof AppError) throw err
      await logger.error("Error creating stablecoin", { symbol }, err as Error)
      throw new AppError(
        ErrorCode.BLOCKCHAIN_ERROR,
        "Failed to create stablecoin on blockchain",
        500
      )
    }
  }

  async mintTokens(
    tokenAddress: string,
    recipientAddress: string,
    amount: number
  ): Promise<TransactionResult> {
    try {
      await logger.debug("Minting tokens on blockchain", {
        tokenAddress,
        recipientAddress,
        amount,
      })

      const amountWei = parseUnits(amount.toString(), 18)

      const hash = await this.walletClient.writeContract({
        account: this.ownerAddress as `0x${string}`,
        address: this.factoryAddress as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: "mintTokens",
        args: [
          tokenAddress as `0x${string}`,
          recipientAddress as `0x${string}`,
          amountWei,
        ],
      })

      await logger.info("Mint transaction sent", {
        txHash: hash,
        tokenAddress,
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
        tokenAddress,
        blockNumber: receipt.blockNumber.toString(),
      })

      return {
        hash,
        blockNumber: Number(receipt.blockNumber),
        status: "success",
      }
    } catch (err) {
      if (err instanceof AppError) throw err
      await logger.error("Error minting tokens", {}, err as Error)
      throw new AppError(
        ErrorCode.BLOCKCHAIN_ERROR,
        "Failed to mint tokens",
        500
      )
    }
  }

  async burnTokens(
    tokenAddress: string,
    accountAddress: string,
    amount: number
  ): Promise<TransactionResult> {
    try {
      await logger.debug("Burning tokens on blockchain", {
        tokenAddress,
        accountAddress,
        amount,
      })

      const amountWei = parseUnits(amount.toString(), 18)

      const hash = await this.walletClient.writeContract({
        account: this.ownerAddress as `0x${string}`,
        address: this.factoryAddress as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: "burnTokens",
        args: [
          tokenAddress as `0x${string}`,
          accountAddress as `0x${string}`,
          amountWei,
        ],
      })

      await logger.info("Burn transaction sent", {
        txHash: hash,
        tokenAddress,
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
        tokenAddress,
        blockNumber: receipt.blockNumber.toString(),
      })

      return {
        hash,
        blockNumber: Number(receipt.blockNumber),
        status: "success",
      }
    } catch (err) {
      if (err instanceof AppError) throw err
      await logger.error("Error burning tokens", {}, err as Error)
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
