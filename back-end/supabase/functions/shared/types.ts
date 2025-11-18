// ============================================
// VALIDATION SCHEMAS (removed Zod for POC)
// ============================================

// ============================================
// DATABASE TYPES
// ============================================

export interface ApiKey {
  id: string
  client_id: string
  client_name: string
  api_key_hash: string
  is_active: boolean
  created_at: string
  last_used_at: string | null
}

export interface Stablecoin {
  id: string
  stablecoin_id: string
  client_id: string
  client_name: string
  client_wallet: string
  webhook_url: string
  symbol: string
  erc20_address: string | null
  status: "registered" | "deployed"
  created_at: string
  deployed_at: string | null
  updated_at: string
}

export type OperationType = "deposit" | "withdraw"

export type OperationStatus =
  | "payment_pending"
  | "payment_deposited"
  | "minting_in_progress"
  | "minted"
  | "mint_failed"
  | "client_notified"
  | "burn_initiated"
  | "tokens_burned"
  | "burn_failed"
  | "pix_transfer_pending"
  | "withdraw_successful"

export interface Operation {
  id: string
  operation_id: string
  stablecoin_id: string
  operation_type: OperationType
  amount: number
  asaas_payment_id: string | null
  qrcode_payload: string | null
  qrcode_url: string | null
  asaas_transfer_id: string | null
  pix_address: string | null
  tx_hash: string | null
  burn_tx_hash: string | null
  block_number: number | null
  status: OperationStatus
  error_message: string | null
  created_at: string
  updated_at: string
  payment_confirmed_at: string | null
  minted_at: string | null
  burned_at: string | null
  pix_transferred_at: string | null
  notified_at: string | null
}

export interface EventStoreEntry {
  id: string
  aggregate_id: string
  event_type: string
  payload: Record<string, unknown>
  timestamp: string
  version: number
}

export interface Log {
  id: string
  timestamp: string
  level: "debug" | "info" | "warn" | "error"
  context: string | null
  message: string
  metadata: Record<string, unknown> | null
  operation_id: string | null
  error_stack: string | null
}

// ============================================
// API RESPONSES
// ============================================

export interface CreateStablecoinResponse {
  stablecoin_id: string
  symbol: string
  status: "registered"
  erc20_address: null
  created_at: string
}

export interface DepositRequestResponse {
  operation_id: string
  stablecoin_id: string
  symbol: string
  amount: number
  qrcode: {
    payload: string
    image_url: string
  }
  status: "payment_pending"
}

export interface WithdrawResponse {
  operation_id: string
  stablecoin_id: string
  symbol: string
  amount: number
  burn_tx_hash: string
  status: "pix_transfer_pending"
}

export interface ClientNotificationPayload {
  operation_id: string
  event: string
  stablecoin_address?: string
  symbol?: string
  tx_hash?: string
  burn_tx_hash?: string
  amount: number
  client_wallet?: string
  pix_address?: string
  first_deployment?: boolean
  timestamp: string
}

export interface ErrorResponse {
  error: string
  operation_id?: string
  status?: OperationStatus
  code?: string
}

// ============================================
// ASAAS TYPES
// ============================================

export interface AsaasPixCodeResponse {
  id: string
  status: string
  externalReference: string
  pixQrCode?: {
    payload: string
    encodedImage: string
  }
  value: number
  billingType: string
  dueDate: string
}

export interface AsaasWebhookPayload {
  id: string
  event: string
  createdAt: string
  data: {
    id: string
    value: number
    status: string
    externalReference: string
    [key: string]: unknown
  }
}

// ============================================
// BLOCKCHAIN TYPES
// ============================================

export interface ContractDeployResult {
  address: string
  txHash: string
  blockNumber: number
}

export interface TransactionResult {
  hash: string
  blockNumber: number
  status: "success" | "failed"
}
