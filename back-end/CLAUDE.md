# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Rayls** is an event-driven, serverless payment gateway that:
- Receives PIX payments from Asaas webhooks
- Processes events asynchronously with complete audit trail (event sourcing)
- Records transactions on blockchain using viem.js
- Deploys incrementally to Supabase Edge Functions (Deno runtime)
- Uses Supabase PostgreSQL for data and event store
- Logs everything persistently to database

**Architecture**: NestJS backend deployed as Supabase Edge Functions with event-driven processing via Supabase Realtime pub/sub.

## Common Commands

### Building & Development
```bash
pnpm install              # Install dependencies (uses pnpm 10.19+)
pnpm run build            # Compile TypeScript to dist/
pnpm run start            # Run production build from dist/
pnpm run start:dev        # Run with ts-node watch mode
pnpm run lint             # ESLint check
pnpm run format           # Prettier format
pnpm run format:check     # Check formatting without changes
```

### Supabase & Deployment
```bash
supabase start            # Start local Supabase (requires Docker)
supabase link --project-ref <id>  # Link to your Supabase project
supabase status           # Check connection status
supabase functions serve  # Test Edge Functions locally on port 54321
supabase functions deploy <name>  # Deploy specific function to production
supabase functions list   # List deployed functions
supabase db push          # Push migrations to production
supabase migration new <name>  # Create new migration
supabase migration up     # Run migrations locally
```

### Common Development Tasks
```bash
# Validate environment setup
pnpm run build

# Test Supabase connection
supabase status

# Deploy hello-world for validation
supabase functions deploy hello-world

# Test function locally
curl http://localhost:54321/functions/v1/hello-world

# Run development with watch
pnpm run start:dev
```

## Architecture & Code Structure

### High-Level Data Flow

```
Asaas Webhook
    ↓
webhooks-asaas Edge Function (Deno)
    ↓
Validate signature + Store event
    ↓
Publish to Supabase Realtime
    ↓
Event Subscribers (event handlers)
    ├→ PaymentService (save to payments table)
    ├→ BlockchainService (queue transaction)
    └→ LoggerService (persist logs)
    ↓
Event Store (append-only audit trail)
    ↓
Blockchain Transaction (viem.js) → Smart Contract
```

### Folder Organization

**`src/core/`** - Fundamental services used everywhere
- `config/env.service.ts` - Environment variable management with Zod validation. Validates at startup and fails-fast if any var is missing. Use `EnvService.get()` or `getSupabaseConfig()`, `getBlockchainConfig()`, `getAsaasConfig()`.
- `logger/logger.service.ts` - Structured logging to console (Pino) and Supabase `logs` table. Creates contextual loggers with `createLogger('Context')`. All logs are buffered and flushed every 5 seconds.
- `events/domain.events.ts` - Domain event classes (PaymentReceivedEvent, BlockchainTransactionConfirmedEvent, etc). Extend `DomainEvent` base class. Each event is immutable and includes aggregate ID for event sourcing.
- `events/event-publisher.ts` - Publishes events to event store (database) and Supabase Realtime channels. Handles pub/sub and event persistence.
- `errors/app.exceptions.ts` - Custom exception hierarchy. Always extend `AppException`. Includes error codes, status codes, and metadata. Used for standardized error handling.

**`src/database/`** - Data access layer
- `repositories/base.repository.ts` - Generic CRUD operations for any Supabase table. Extend this for domain-specific repositories. Provides findById, findAll, create, update, delete, upsert, count methods.

**`src/blockchain/`** - Smart contract interactions
- `repositories/base-contract.repository.ts` - Abstract base for contract operations using viem.js. Provides ABI loading from files and simplified contract interaction patterns.
- `repositories/payment-contract.repository.ts` - Concrete implementation for Payment contract. Methods like `recordPayment()`, `confirmPayment()`, `getPayment()`.
- `abis/Payment.json` - Smart contract ABI file. Add new contract ABIs here.

**`src/asaas/`** - Asaas payment provider integration
- `validators/webhook.validator.ts` - Validates Asaas webhook signatures using HMAC-SHA1. Call `validateAndParse()` to validate and deserialize webhook payload.
- `types.ts` - TypeScript interfaces for Asaas API responses, payment statuses, webhook events, etc. Use these for type safety.

**`src/main.ts`** - Application bootstrap
- Initializes NestJS
- Sets up Swagger documentation
- Configures global validation pipes
- Handles graceful shutdown with log flushing

**`src/app.module.ts`** - Root NestJS module
- Imports all services
- Provides core services to injection system
- All modules should import this to access shared services

**`src/app.controller.ts`** - Health check endpoints
- GET `/health` - Returns service status
- GET `/ready` - Readiness probe

### Key Design Patterns

#### 1. Repository Pattern (Database)
All database access goes through `BaseRepository` subclasses. Example:
```typescript
// In a service
constructor(private paymentRepository: PaymentRepository) {}
async getPayment(id: string) {
  return this.paymentRepository.findById(id);
}

// Repository definition
class PaymentRepository extends BaseRepository<Payment> {
  constructor(supabase, logger) {
    super('payments', supabase, logger);
  }
}
```

#### 2. Event-Driven Architecture
Components communicate through events, not direct calls. Event flow:
```typescript
// 1. Emit event
const event = new PaymentReceivedEvent(paymentId, amount, payer, description, pixKey, {});
await this.eventPublisher.publish(event);

// 2. Event stored in event_store table (append-only)

// 3. Published to Realtime channel

// 4. Subscribers receive and handle
this.eventPublisher.subscribeToEvent('payment.received', (event) => {
  // Handle payment received
});
```

#### 3. Event Sourcing
All events are immutable and stored in `event_store` table. Reconstruct state by replaying events:
```sql
SELECT * FROM event_store
WHERE aggregate_id = 'payment-123'
ORDER BY timestamp ASC;
-- Shows: payment.received → blockchain.tx.initiated → blockchain.tx.confirmed
```

#### 4. EnvService Pattern
Configuration is centralized, validated with Zod, and fails-fast:
```typescript
// All env vars validated at startup
const url = this.envService.get('SUPABASE_URL');  // Type-safe
const config = this.envService.getSupabaseConfig();  // Grouped access
```

#### 5. Custom Exception Hierarchy
Always throw specific exceptions with error codes:
```typescript
if (!isValid) {
  throw new InvalidWebhookSignatureException();
}
throw new PaymentException(ErrorCode.PAYMENT_FAILED, 'Payment processing failed');
```

## Database Schema

Key tables managed via migrations:
- `event_store` - Immutable event history (event sourcing)
- `logs` - Structured application logs (timestamp, level, context, message, metadata)
- `payments` - Payment aggregates (asaas_id, amount, status, metadata)
- `blockchain_transactions` - On-chain transaction tracking (payment_id, tx_hash, status)
- `asaas_webhooks` - Webhook audit trail (webhook_id, event, payload, processed)

## Deployment Strategy: Baby-Steps Approach

Each feature deployed independently (no accumulating features):

1. **Phase 0** - Database schema + migrations (no Edge Functions)
2. **Phase 1** - webhooks-asaas Edge Function (receives Asaas events)
3. **Phase 2** - Payment handlers (internal code, no deploy)
4. **Phase 3** - API endpoints Edge Function
5. **Phase 4** - blockchain-tx Edge Function
6. **Phase 5** - Production hardening

See DEPLOYMENT_ROADMAP.md for detailed phases.

## Supabase Edge Functions

Functions are Deno-based TypeScript deployed to Supabase. Located in `supabase/functions/`:

- `hello-world/` - Validation function (test deployment)
- `webhooks-asaas/` - Receives Asaas webhooks (Phase 1)
- `process-payment/` - Processes payment events (Phase 1)
- `blockchain-tx/` - Sends blockchain transactions (Phase 4)
- `api-gateway/` - REST API endpoints (Phase 3)

Each function:
1. Receives HTTP request
2. Processes using shared NestJS services
3. Returns JSON response
4. Logs to database via LoggerService

## Important Implementation Notes

### TypeScript Strict Mode
Project uses `typescript strict: true`. This means:
- No implicit `any`
- All types must be explicit
- Stricter null/undefined checks
- Non-optional properties must be assigned

### Supabase RLS (Row-Level Security)
When adding tables, consider if RLS policies are needed. For now, using service key for admin access.

### Event Naming Convention
Event types use dot notation (e.g., `payment.received`, `blockchain.tx.confirmed`). Realtime channels map from event types:
- `payment.*` → `payment_events` channel
- `blockchain.*` → `blockchain_events` channel
- `asaas.*` → `asaas_events` channel
- Others → `system_events` channel

### Error Handling in Edge Functions
Edge Functions should catch errors and return proper HTTP responses:
```typescript
try {
  // Do work
  return new Response(JSON.stringify(result), { status: 200 });
} catch (error) {
  return new Response(JSON.stringify({ error: error.message }), { status: 500 });
}
```

### Logging in Edge Functions
Use the shared LoggerService from NestJS core through dependency injection or direct instantiation.

## Testing & Validation

Before deploying:
1. `pnpm run build` - Ensure TypeScript compiles
2. `pnpm run lint` - Check code style
3. Test locally with Supabase emulator
4. Verify database migrations work
5. Test webhook signatures with valid HMAC

## Key Files to Know

- **DEPLOYMENT_ROADMAP.md** - Detailed phase-by-phase deployment guide
- **SETUP_GUIDE.md** - Development environment setup and troubleshooting
- **ARCHITECTURE.md** - Comprehensive design patterns and data flows
- **CHECKPOINT_STATUS.md** - Current project status
- **HELLO_WORLD_DEPLOY.md** - First deployment validation
- **.env.example** - Required environment variables

## When Adding New Features

1. **Add domain events** in `src/core/events/domain.events.ts`
2. **Create repositories** extending `BaseRepository<T>` in `src/database/repositories/`
3. **Implement handlers** to subscribe to events
4. **Create Edge Functions** in `supabase/functions/` if user-facing
5. **Add database migrations** in `supabase/migrations/`
6. **Document** in DEPLOYMENT_ROADMAP.md as new phase
7. **Deploy incrementally** - each feature is independent

## Performance & Scaling

- Edge Functions auto-scale per-request
- Supabase PostgreSQL handles concurrent connections
- Event sourcing ensures no data loss
- Structured logging allows performance analysis
- Type safety prevents runtime errors in production

## Security

- Webhook signatures validated with HMAC-SHA1
- Environment variables validated at startup
- Custom exceptions don't expose internals
- All user input validated with Zod
- Database credentials via Supabase service key
- Private keys managed via Supabase secrets
