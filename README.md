# Rayls - Event-Driven Payment Gateway

**Fountain Project** - A serverless, event-driven payment gateway combining Asaas PIX integration with blockchain transactions, built on Supabase Edge Functions.

## Overview

Rayls is a modern payment processing backend that:

- 🎯 **Receives PIX payments** from Asaas webhook notifications
- ⚙️ **Processes events** asynchronously with complete audit trail
- ⛓️ **Records transactions** on blockchain (EVM compatible)
- 📊 **Stores everything** as immutable events for compliance
- 🚀 **Deploys incrementally** to Supabase Edge Functions
- 📝 **Logs everything** persistently to PostgreSQL

## Quick Start

### Prerequisites

- Node.js v18+
- pnpm v10+
- Docker (for local Supabase)
- Git

### Setup

```bash
# 1. Clone and install
cd rayls
pnpm install

# 2. Configure environment
cp .env.example .env
nano .env  # Fill in your values

# 3. Start local Supabase
supabase start

# 4. Run migrations
supabase migration up

# 5. Start development server
pnpm run start:dev

# 6. Visit Swagger docs
open http://localhost:3000/api/docs
```

## Project Structure

```
src/
├── core/              # Core services (config, logger, events, errors)
├── database/          # Repository pattern for Supabase
├── blockchain/        # Smart contract interactions with viem.js
├── asaas/            # Asaas payment provider integration
└── payments/         # Payment domain logic

supabase/
├── functions/        # Deno Edge Functions
└── migrations/       # Database schema migrations

Documentation:
├── DEPLOYMENT_ROADMAP.md  # Detailed step-by-step deployment guide
├── SETUP_GUIDE.md         # Development environment setup
├── ARCHITECTURE.md        # Design patterns and architecture
```

## Design Patterns

### Repository Pattern (Database)

Clean data access abstraction:

```typescript
const payment = await this.paymentRepository.findById(id);
const payments = await this.paymentRepository.findByStatus('pending');
await this.paymentRepository.create({ amount: 100, payer: '...' });
```

### Repository Pattern (Blockchain)

Smart contract interaction abstraction:

```typescript
const { txHash, wait } = await this.paymentContract.recordPayment(
  paymentId,
  amount,
  payer,
  description
);
await wait();  // Wait for confirmation
```

### Event-Driven Architecture

Decoupled, auditable event processing:

```typescript
const event = new PaymentReceivedEvent(paymentId, amount, ...);
await this.eventPublisher.publish(event);

// Event stored in DB + published to subscribers
this.eventPublisher.subscribeToEvent('payment.received', (event) => {
  // Handle payment received
});
```

### Event Sourcing

Complete immutable history:

```sql
SELECT * FROM event_store
WHERE aggregate_id = 'payment-123'
ORDER BY timestamp ASC;

-- Shows: payment.received → payment.confirmed → blockchain.tx.initiated → blockchain.tx.confirmed
```

### EnvService (Validated Config)

Type-safe environment management:

```typescript
// All env vars validated at startup with Zod schema
const url = this.envService.get('SUPABASE_URL');
const config = this.envService.getBlockchainConfig();

// Fails fast if any required var missing
```

### LoggerService (Persistent Logging)

Structured logging to console and database:

```typescript
const logger = this.loggerService.createLogger('PaymentService');
logger.info('Payment received', { paymentId, amount });
// Logged to console (pino) + Supabase logs table
```

## Deployment Strategy

**Baby-steps approach**: Each feature is independently deployable

See [DEPLOYMENT_ROADMAP.md](./DEPLOYMENT_ROADMAP.md) for complete details:

- **Phase 0**: Database setup
- **Phase 1**: Asaas webhook receiver
- **Phase 2**: Payment processing
- **Phase 3**: API endpoints
- **Phase 4**: Blockchain integration
- **Phase 5**: Production hardening

## Key Features

✅ **Event Sourcing** - Complete audit trail of all changes
✅ **Repository Pattern** - Clean data and contract access
✅ **Type Safety** - Full TypeScript with Zod validation
✅ **Structured Logging** - Console + persistent database storage
✅ **Error Handling** - Standardized exception hierarchy
✅ **OpenAPI/Swagger** - Auto-generated API documentation
✅ **Serverless Ready** - Deploys to Supabase Edge Functions
✅ **Modular** - Easy to add new features and event handlers

## Documentation

- [DEPLOYMENT_ROADMAP.md](./DEPLOYMENT_ROADMAP.md) - Step-by-step deployment with baby-steps approach
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Development environment setup and troubleshooting
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Design patterns, data flows, and design decisions

## Available Scripts

```bash
pnpm run build           # Build TypeScript
pnpm run start           # Run production build
pnpm run start:dev       # Run with watch mode
pnpm run lint            # Run ESLint
pnpm run format          # Format with Prettier
pnpm run format:check    # Check format without changes
```

## Database Schema

Key tables:

- `event_store` - Event sourcing store (append-only)
- `logs` - Structured application logs
- `payments` - Payment aggregates
- `blockchain_transactions` - On-chain transaction tracking
- `asaas_webhooks` - Webhook audit trail

## Configuration

Copy `.env.example` to `.env` and fill in:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_KEY=your-key

# Asaas
ASAAS_API_KEY=your-key
ASAAS_WEBHOOK_SECRET=your-secret

# Blockchain
CHAIN_RPC_URL=https://mainnet.infura.io/v3/your-key
CHAIN_ID=1
PRIVATE_KEY=0x...
CONTRACT_PAYMENT_ADDRESS=0x...
```

## Technology Stack

- **Framework**: NestJS - Modern, scalable backend framework
- **Language**: TypeScript - Type safety and better DX
- **Database**: Supabase/PostgreSQL - Open-source, serverless
- **Blockchain**: viem.js - Modern, type-safe EVM client
- **Deployment**: Supabase Edge Functions - Serverless, fast
- **Logging**: Pino - Fast, structured logging
- **Validation**: Zod - Type-safe schema validation
- **Documentation**: OpenAPI 3.0 - Standard API spec

## Roadmap

- [x] Project initialization
- [x] Core architecture setup
- [x] EnvService with validation
- [x] LoggerService with DB persistence
- [x] Event definitions and event sourcing
- [x] Repository pattern for database
- [x] Contract repository for blockchain
- [ ] Asaas webhook integration
- [ ] Payment processing handlers
- [ ] API endpoints
- [ ] Blockchain transaction management
- [ ] Production hardening
- [ ] Monitoring and alerting

## Contributing

1. Follow the deployment roadmap
2. Each feature should be independently deployable
3. Update logs and commit after each phase
4. Test locally before deploying

## License

ISC

## Support

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for troubleshooting guide.