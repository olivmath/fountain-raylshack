# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## PROJECT OVERVIEW

**Rayls Stablecoin Gateway** - A production-ready event-driven system for creating and managing Brazilian reais stablecoins (USDBR equivalent).

**Technology Stack:**
- **Backend:** Supabase Edge Functions (Deno/TypeScript)
- **Database:** PostgreSQL with event sourcing
- **Blockchain:** ERC20 smart contracts (Ethereum/Sepolia)
- **Payments:** Asaas integration (Brazilian PIX processor)
- **Authentication:** API key validation with SHA-256 hashing

---

## QUICK START COMMANDS

### Local Development
```bash
deno task serve
# Starts Supabase functions locally on http://localhost:54321/functions/v1/{function-name}
```

### Deploy to Production
```bash
deno task deploy
# OR for specific function:
supabase functions deploy {function-name}
```

### Database Management
```bash
supabase link --project-ref bzxdqkttnkxqaecaiekt
supabase db push          # Push local migrations
```

---

## ARCHITECTURE

### Directory Structure

```
supabase/
├── functions/
│   ├── stablecoin-create/       # Register new stablecoin
│   ├── deposit-request/         # Create PIX QR code for deposit
│   ├── webhook-deposit/         # Asaas webhook: payment received
│   ├── withdraw/                # Burn tokens & initiate PIX transfer
│   ├── webhook-withdraw/        # Asaas webhook: transfer confirmed
│   └── shared/                  # Reusable modules
│       ├── types.ts             # TypeScript interfaces
│       ├── auth.ts              # API key validation
│       ├── logger.ts            # DB logging + console
│       ├── error-handler.ts     # Error formatting & response
│       ├── supabase-client.ts   # SDK client factory
│       ├── asaas-client.ts      # PIX payment integration
│       ├── blockchain-client.ts # Viem.js for ERC20 ops
│       ├── blockchain-minter.ts # Token minting orchestration
│       ├── event-publisher.ts   # Event sourcing (audit trail)
│       └── client-notifier.ts   # Webhook notifications
├── migrations/
│   └── 20251118_init_schema.sql # Full database schema + indexes
└── deno.json                    # Deno config: imports & tasks
```

### Core Concepts

#### **Five Edge Functions (Request/Response Pattern)**

| Function | Purpose | Auth | Trigger |
|----------|---------|------|---------|
| `stablecoin-create` | Register new stablecoin | API Key | Client request |
| `deposit-request` | Generate PIX QR code | API Key | Client request |
| `webhook-deposit` | Process payment confirmation | Signature | Asaas webhook |
| `withdraw` | Burn tokens & start transfer | API Key | Client request |
| `webhook-withdraw` | Process transfer completion | Signature | Asaas webhook |

#### **State Machine: Deposit Flow**

```
1. Client calls deposit-request
   → Insert operation: "payment_pending"
   → Return PIX QR code

2. Customer pays via PIX

3. Asaas sends webhook-deposit
   → Update: "payment_deposited"
   → Call blockchain-minter
   → Mint tokens (deploy ERC20 on first deposit)
   → Update: "minted"
   → Notify client webhook
```

#### **State Machine: Withdraw Flow**

```
1. Client calls withdraw
   → Insert operation: "burn_initiated"
   → Burn ERC20 tokens
   → Update: "tokens_burned"
   → Start PIX transfer via Asaas

2. Asaas sends webhook-withdraw
   → Update: "withdraw_successful"
   → Notify client webhook
```

#### **Event-Driven Architecture**

Every operation publishes immutable events to `event_store` table:
- `stablecoin.registered`, `stablecoin.deployed`
- `deposit.initiated`, `deposit.payment_confirmed`, `deposit.minted`
- `withdraw.initiated`, `withdraw.tokens_burned`, `withdraw.pix_confirmed`

Events are **immutable audit trail** - useful for debugging and compliance.

---

## DATABASE SCHEMA

### Key Tables

**api_keys** - Authentication
- `client_id`, `api_key_hash` (SHA-256), `is_active`
- Queries by `api_key_hash` during auth

**stablecoins** - ERC20 Metadata
- `stablecoin_id` (UUID), `symbol` (unique), `client_id`
- `erc20_address` (NULL until first deposit)
- `status`: "registered" → "deployed"

**operations** - Deposits & Withdrawals
- `operation_id`, `stablecoin_id`, `operation_type` ("deposit" | "withdraw")
- `status`: payment_pending → payment_deposited → minting_in_progress → minted → client_notified
- `tx_hash`, `burn_tx_hash` (blockchain transactions)
- `asaas_payment_id`, `qrcode_payload` (PIX data)
- Timestamps: `created_at`, `payment_confirmed_at`, `minted_at`, `notified_at`

**event_store** - Event Sourcing (Immutable)
- `aggregate_id`, `event_type`, `payload` (JSONB)
- Indexed by `aggregate_id` for operation tracing

**logs** - Structured Logging
- `level`, `context` (function name), `message`, `metadata` (JSONB)
- `operation_id` (links to specific operation)
- Indexed by operation_id for filtering

### Auto-Update Triggers

Both `stablecoins` and `operations` have triggers to auto-update `updated_at`:
```sql
CREATE TRIGGER update_operations_updated_at BEFORE UPDATE ON operations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## SHARED MODULES (Reusable)

### Authentication (`auth.ts`)

```typescript
const apiKey = extractApiKey(req)  // From x-api-key header
const auth = await validateApiKey(apiKey)
if (!auth.valid) return createErrorResponse("Invalid API key", 401)

// auth.clientId and auth.clientName available for further logic
```

**Behavior:**
- Hashes key with SHA-256
- Queries `api_keys` table for match
- Updates `last_used_at` timestamp
- Returns `{ valid, clientId, clientName }`

---

### Error Handling (`error-handler.ts`)

```typescript
// Error codes available
export enum ErrorCode {
  INVALID_REQUEST, UNAUTHORIZED, NOT_FOUND, CONFLICT, INTERNAL_ERROR,
  BLOCKCHAIN_ERROR, ASAAS_ERROR, DATABASE_ERROR
}

// Usage in functions
if (!symbol || symbol.length > 10) {
  return createErrorResponse("Invalid symbol", 400, ErrorCode.INVALID_REQUEST)
}

// Try/catch at function level
try {
  // ... operation ...
} catch (err) {
  const { response, logged } = await handleError(err, operationId)
  return response
}
```

---

### Logging (`logger.ts`)

```typescript
const log = createLogger("deposit-request", operationId)
await log.info("Deposit initiated", { symbol, amount })
await log.error("Blockchain failed", { errorCode }, error)
// Logs to both console and database
```

**Levels:** debug, info, warn, error

---

### Database Client (`supabase-client.ts`)

```typescript
const supabase = getSupabaseClient()  // Service role - admin access

// Query examples
const { data, error } = await supabase
  .from("stablecoins")
  .select("*")
  .eq("symbol", symbol)
  .single()

const { error: insertError } = await supabase
  .from("operations")
  .insert({
    operation_id: operationId,
    stablecoin_id: stablecoinId,
    operation_type: "deposit",
    amount: 1000,
    status: "payment_pending"
  })
```

---

### Asaas Integration (`asaas-client.ts`)

```typescript
// Create PIX QR code for deposit
const asaasResponse = await asaasClient.createPixCode({
  billingType: "PIX",
  value: amount,
  externalReference: operationId,
  description: `Stablecoin ${symbol} - Deposit`
})
// Returns: { id, pixQrCode: { payload, encodedImage } }

// Create PIX transfer for withdrawal
await asaasClient.createTransfer({
  pixAddressKey: pixAddress,
  transferOutAmount: amount,
  description: `Withdraw ${symbol}`
})

// Validate webhook signature
const isValid = asaasClient.validateWebhookSignature(payload, signature)
```

---

### Blockchain Operations (`blockchain-client.ts` & `blockchain-minter.ts`)

```typescript
// blockchain-client.ts
const result = await blockchainClient.createStablecoin({
  clientName: "Client ABC",
  symbol: "USDBR",
  recipientAddress: clientWallet,
  amount: 1000
})
// Returns: { address, txHash, blockNumber }

const mintResult = await blockchainClient.mintTokens({
  contractAddress: erc20Address,
  recipientAddress: clientWallet,
  amount: 1000
})

const burnResult = await blockchainClient.burnTokens({
  contractAddress: erc20Address,
  accountAddress: userWallet,
  amount: 1000
})

// blockchain-minter.ts handles orchestration
await mintTokensAfterDepositConfirmed(operationId)
// Automatically deploys ERC20 on first deposit, mints on subsequent
```

**Amount Handling:**
```typescript
// Always convert to Wei (18 decimals)
const amountWei = parseUnits(amount.toString(), 18)
```

---

### Event Publishing (`event-publisher.ts`)

```typescript
const event = createDomainEvent(
  stablecoinId,                    // aggregateId
  "stablecoin.registered",         // eventType
  { stablecoinId, clientId, symbol }  // payload
)
await publishEvent(event)
// Inserts into event_store table (immutable)
```

---

### Client Notifications (`client-notifier.ts`)

```typescript
await notifyClient(operationId)
// Fetches stablecoin webhook_url from database
// POSTs operation details to customer's webhook
// Non-blocking - failures don't break operation flow
```

---

## ENVIRONMENT VARIABLES

**File:** `.env` (do NOT commit - use .env.example as template)

```bash
# ============================================
# SUPABASE (Edge Functions + Database)
# ============================================
SUPABASE_URL=https://bzxdqkttnkxqaecaiekt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<JWT with service_role>  # Full access
SUPABASE_ANON_KEY=<JWT with anon role>             # Limited access

# ============================================
# ASAAS (Brazilian PIX Processor)
# ============================================
ASAAS_API_KEY=<API token for requests>
ASAAS_WEBHOOK_KEY=<Secret for signature validation>

# ============================================
# BLOCKCHAIN (ERC20 Smart Contracts)
# ============================================
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/YOUR-ID
FACTORY_CONTRACT_ADDRESS=0x...     # Factory for deploying/minting
OWNER_ADDRESS=0x...                # Admin wallet that signs txs
OWNER_PRIVATE_KEY=0x...            # Private key (KEEP SECRET!)
CHAIN_ID=11155111                  # Sepolia testnet
```

---

## COMMON PATTERNS

### Function Template

All functions follow this structure:

```typescript
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { getSupabaseClient } from "../shared/supabase-client.ts"
import { createLogger } from "../shared/logger.ts"
import { validateApiKey, extractApiKey } from "../shared/auth.ts"
import { createErrorResponse, createSuccessResponse } from "../shared/error-handler.ts"

serve(async (req: Request) => {
  const log = createLogger("function-name")
  const operationId = crypto.randomUUID()

  try {
    // 1. Validate method
    if (req.method !== "POST") {
      return createErrorResponse("Method not allowed", 405)
    }

    // 2. Extract and validate API key
    const apiKey = extractApiKey(req)
    const auth = await validateApiKey(apiKey)
    if (!auth.valid) {
      return createErrorResponse("Invalid API key", 401)
    }

    // 3. Parse and validate body
    const body = await req.json()
    // ... validation ...

    // 4. Business logic
    const supabase = getSupabaseClient()
    const { data, error } = await supabase...

    if (error) {
      await log.error("DB error", { error }, error)
      return createErrorResponse("Failed", 500)
    }

    // 5. Publish event
    await publishEvent(createDomainEvent(...))

    // 6. Return response
    return createSuccessResponse(data, 201)

  } catch (err) {
    const { response } = await handleError(err, operationId)
    return response
  }
})
```

### Webhook Template (with signature validation)

```typescript
import { validateWebhookSignature } from "../shared/asaas-client.ts"

serve(async (req: Request) => {
  try {
    // 1. Validate signature
    const payload = await req.text()
    const signature = req.headers.get("asaas-signature")

    if (!validateWebhookSignature(payload, signature)) {
      return createErrorResponse("Invalid signature", 401)
    }

    // 2. Parse webhook data
    const webhookData = JSON.parse(payload)
    const operationId = webhookData.data.externalReference

    // 3. Update database
    const supabase = getSupabaseClient()
    await supabase.from("operations").update({
      status: "payment_deposited",
      payment_confirmed_at: new Date().toISOString()
    }).eq("operation_id", operationId)

    // 4. Notify client
    await notifyClient(operationId)

    // 5. Return 200 (always, so Asaas doesn't retry)
    return createSuccessResponse({ success: true }, 200)

  } catch (err) {
    // Log but still return 200 to Asaas
    console.error(err)
    return createSuccessResponse({ success: true }, 200)
  }
})
```

---

## TESTING LOCALLY

### Start Local Server
```bash
deno task serve
```

### Test API Key

Test API Key: `test-api-key-123`
Hash: `a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3`

### Example Request (Create Stablecoin)

```bash
curl -X POST http://localhost:54321/functions/v1/stablecoin-create \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-api-key-123" \
  -d '{
    "client_name": "Test Corretora",
    "symbol": "USDBR",
    "client_wallet": "0x1234567890123456789012345678901234567890",
    "webhook": "https://webhook.example.com/events"
  }'
```

### Debug Logs

View function logs:
```bash
supabase functions list
supabase functions list --name stablecoin-create
```

View database logs:
```sql
SELECT * FROM logs
WHERE context = 'stablecoin-create'
ORDER BY timestamp DESC
LIMIT 50;
```

---

## DEPLOYMENT CHECKLIST

Before deploying a function:

1. ✅ Test locally with `deno task serve`
2. ✅ Verify error handling in `try/catch`
3. ✅ Check all imports are Deno-compatible (no npm packages)
4. ✅ Ensure environment variables are accessed via `Deno.env.get()`
5. ✅ Validate all database queries with `.single()` or `.limit()` if needed
6. ✅ Add logging for critical operations
7. ✅ Publish events to `event_store` for audit trail
8. ✅ Test webhook signature validation if webhook handler
9. ✅ Commit changes: `git add -A && git commit -m "feat: description"`
10. ✅ Deploy: `supabase functions deploy {function-name}`

---

## COMMON ISSUES & SOLUTIONS

### Import Errors in Deno

**Problem:** Cannot find module "supabase"
**Solution:** Use full ESM URL: `https://esm.sh/@supabase/supabase-js@2.38.4`

### Async/Await in Webhook Handler

**Problem:** Function hangs when awaiting database operations
**Solution:** Ensure function doesn't block response. Webhooks should return 200 immediately.

```typescript
// GOOD - Return 200, then process async
const response = createSuccessResponse({ success: true }, 200)
notifyClient(operationId).catch(err => console.error(err))
return response

// BAD - Waits for notification before returning
await notifyClient(operationId)
return response
```

### Signature Validation Failing

**Problem:** Webhook signature always invalid
**Solution:** Validate HMAC calculation and webhook key. Ensure payload is NOT parsed before hashing.

```typescript
// GOOD - Use raw text payload
const payload = await req.text()
validateWebhookSignature(payload, signature)

// BAD - Parsed JSON
const body = await req.json()
validateWebhookSignature(JSON.stringify(body), signature)  // Different hash!
```

---

## SECURITY GUIDELINES

1. **API Keys:**
   - Store as SHA-256 hashes (never plaintext)
   - Validate on every authenticated request
   - Test key: `test-api-key-123`

2. **Webhook Signatures:**
   - Always validate Asaas webhook signatures
   - Use HMAC-SHA256 with `ASAAS_WEBHOOK_KEY`
   - Reject unsigned webhooks with 401

3. **Private Keys:**
   - Never commit `OWNER_PRIVATE_KEY` to git
   - Use `.env` (gitignored) locally
   - Use Supabase secrets in production: `supabase secrets set`

4. **Database Queries:**
   - Use parameterized queries (Supabase SDK handles this)
   - Never concatenate user input into SQL

5. **Error Messages:**
   - Don't leak internal errors to clients
   - Log detailed errors to database
   - Return generic error to API consumers

---

## KEY FILES BY PURPOSE

| Task | Files |
|------|-------|
| Add new function | Create `/supabase/functions/my-function/index.ts` |
| Add shared utility | Create `/supabase/functions/shared/my-util.ts` |
| Modify database | Create migration in `/supabase/migrations/` |
| Update types | Edit `/supabase/functions/shared/types.ts` |
| Debug operation | Query `logs` and `event_store` tables |
| Deploy all | Run `deno task deploy` |
| Deploy specific | Run `supabase functions deploy function-name` |

---

## PROJECT LINKS

- **Repository:** https://github.com/olivmath/rayls
- **Supabase Dashboard:** https://supabase.com/dashboard/project/bzxdqkttnkxqaecaiekt
- **Local Functions URL:** http://localhost:54321/functions/v1/{function-name}
- **Production Functions URL:** https://bzxdqkttnkxqaecaiekt.supabase.co/functions/v1/{function-name}

