import { createLogger } from "./logger.ts"
import { AppError, ErrorCode } from "./error-handler.ts"
import type { AsaasPixCodeResponse } from "./types.ts"

const logger = createLogger("asaas-client")

export interface CreatePixCodeRequest {
  billingType: "PIX"
  value: number
  externalReference: string
  description: string
}

export interface CreateTransferRequest {
  accountId: string
  targetAccountId?: string
  transferOutAmount?: number
  pixAddressKey: string
  description?: string
}

export class AsaasClient {
  private apiKey: string
  private baseUrl: string

  constructor() {
    const apiKey = Deno.env.get("ASAAS_API_KEY")
    if (!apiKey) {
      throw new Error("Missing ASAAS_API_KEY environment variable")
    }
    this.apiKey = apiKey
    this.baseUrl = "https://api.asaas.com/v3"
  }

  async createPixCode(request: CreatePixCodeRequest): Promise<AsaasPixCodeResponse> {
    try {
      await logger.debug("Creating PIX code", {
        externalReference: request.externalReference,
        value: request.value,
      })

      const response = await fetch(`${this.baseUrl}/payments`, {
        method: "POST",
        headers: {
          "access_token": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.text()
        await logger.error("Asaas API error", {
          status: response.status,
          error,
        })
        throw new AppError(
          ErrorCode.ASAAS_ERROR,
          `Failed to create PIX code: ${response.statusText}`,
          response.status
        )
      }

      const data: AsaasPixCodeResponse = await response.json()
      await logger.info("PIX code created successfully", {
        paymentId: data.id,
        externalReference: request.externalReference,
      })

      return data
    } catch (err) {
      if (err instanceof AppError) throw err
      await logger.error("Error creating PIX code", {}, err as Error)
      throw new AppError(
        ErrorCode.ASAAS_ERROR,
        "Failed to create PIX code",
        500
      )
    }
  }

  async createTransfer(
    pixAddress: string,
    amount: number,
    description: string
  ): Promise<{ id: string; status: string }> {
    try {
      await logger.debug("Creating PIX transfer", {
        pixAddress,
        amount,
      })

      const response = await fetch(`${this.baseUrl}/transfers`, {
        method: "POST",
        headers: {
          "access_token": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pixAddressKey: pixAddress,
          transferOutAmount: amount,
          description,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        await logger.error("Asaas API error", {
          status: response.status,
          error,
        })
        throw new AppError(
          ErrorCode.ASAAS_ERROR,
          `Failed to create transfer: ${response.statusText}`,
          response.status
        )
      }

      const data: { id: string; status: string } = await response.json()
      await logger.info("Transfer created successfully", {
        transferId: data.id,
        pixAddress,
      })

      return data
    } catch (err) {
      if (err instanceof AppError) throw err
      await logger.error("Error creating transfer", {}, err as Error)
      throw new AppError(
        ErrorCode.ASAAS_ERROR,
        "Failed to create transfer",
        500
      )
    }
  }

  async validateWebhookSignature(
    payload: string,
    signature: string,
    apiKey: string
  ): Promise<boolean> {
    try {
      // Asaas uses HMAC SHA256
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(apiKey),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      )

      const signature_bytes = await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
      const computed = Array.from(new Uint8Array(signature_bytes))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("")

      return computed === signature.toLowerCase()
    } catch (err) {
      await logger.error("Error validating webhook signature", {}, err as Error)
      return false
    }
  }
}

export function createAsaasClient(): AsaasClient {
  return new AsaasClient()
}
