import { getSupabaseClient } from "./supabase-client.ts"
import { createLogger } from "./logger.ts"

const logger = createLogger("auth")

export interface AuthResult {
  valid: boolean
  clientId?: string
  clientName?: string
}

export async function validateApiKey(apiKey: string): Promise<AuthResult> {
  try {
    // Hash the API key using Deno's crypto
    const encoder = new TextEncoder()
    const data = encoder.encode(apiKey)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

    const supabase = getSupabaseClient()

    // Query for the API key
    const { data, error } = await supabase
      .from("api_keys")
      .select("client_id, client_name, is_active")
      .eq("api_key_hash", hash)
      .single()

    if (error) {
      await logger.warn("API key not found", { error: error.message })
      return { valid: false }
    }

    if (!data || !data.is_active) {
      await logger.warn("API key inactive or not found")
      return { valid: false }
    }

    // Update last_used_at
    await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("api_key_hash", hash)
      .catch((err) => logger.warn("Failed to update last_used_at", { error: err.message }))

    return {
      valid: true,
      clientId: data.client_id,
      clientName: data.client_name,
    }
  } catch (err) {
    await logger.error("Error validating API key", {}, err as Error)
    return { valid: false }
  }
}

export function extractApiKey(req: Request): string | null {
  const header = req.headers.get("x-api-key")
  return header || null
}
