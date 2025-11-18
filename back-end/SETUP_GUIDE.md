# 🚀 Rayls - Setup & Development Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Development Environment](#development-environment)
4. [Project Structure](#project-structure)
5. [Deploying Each Feature](#deploying-each-feature)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js**: v18+ (required for TypeScript and NestJS)
- **pnpm**: v10+ (package manager)
- **Docker & Docker Compose**: For local Supabase development
- **Supabase CLI**: For database and edge functions management
- **Git**: For version control

### Install Tools

```bash
# 1. Install pnpm globally
npm install -g pnpm@10.19.0

# 2. Install Supabase CLI
pnpm add -D supabase

# 3. Verify installations
pnpm -v
supabase --version
```

---

## Initial Setup

### 1. Clone Project

```bash
cd /Users/olivmath/dev/rayls
pnpm install
```

### 2. Setup Supabase Project

```bash
# Create Supabase project at https://supabase.com
# Note project reference ID

# Link project locally
supabase link --project-ref <your-project-ref>

# Pull remote schema (optional)
supabase db pull
```

### 3. Configure Environment

```bash
# Copy example env
cp .env.example .env

# Edit with your values
nano .env

# Required variables:
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_KEY=...
# ASAAS_API_KEY=...
# ASAAS_WEBHOOK_SECRET=...
# CHAIN_RPC_URL=https://mainnet.infura.io/v3/...
# CHAIN_ID=1
# PRIVATE_KEY=0x...
# CONTRACT_PAYMENT_ADDRESS=0x...
```

### 4. Setup Local Supabase

```bash
# Start local Supabase (requires Docker)
supabase start

# Initialize database with migrations
supabase migration up

# Stop when done
supabase stop
```

### 5. Build Project

```bash
# Install dependencies (if not done)
pnpm install

# Build TypeScript
pnpm run build

# Verify no errors
pnpm run lint
```

---

## Development Environment

### Running Services

```bash
# Terminal 1: Supabase (local development database)
supabase start

# Terminal 2: NestJS application
pnpm run start:dev

# Terminal 3: Edge Functions (optional - for testing)
supabase functions serve

# Application should be running at:
# http://localhost:3000
# Swagger at: http://localhost:3000/api/docs
```

### Project Structure

```
rayls/
├── src/                          # NestJS application code
│   ├── core/                     # Core services
│   │   ├── config/
│   │   │   └── env.service.ts    # Environment variable management with validation
│   │   ├── logger/
│   │   │   └── logger.service.ts # Structured logging (console + DB)
│   │   ├── events/
│   │   │   ├── domain.events.ts  # Domain event definitions
│   │   │   └── event-publisher.ts # Event publishing to Realtime + Event Store
│   │   └── errors/
│   │       └── app.exceptions.ts # Custom exception classes
│   │
│   ├── database/                 # Database layer
│   │   └── repositories/
│   │       └── base.repository.ts # Generic repository pattern
│   │
│   ├── blockchain/               # Blockchain integration
│   │   ├── abis/
│   │   │   └── Payment.json      # Smart contract ABIs
│   │   └── repositories/
│   │       ├── base-contract.repository.ts   # Generic contract operations
│   │       └── payment-contract.repository.ts # Payment contract specific
│   │
│   ├── asaas/                    # Asaas payment provider integration
│   │   ├── validators/
│   │   │   └── webhook.validator.ts
│   │   ├── services/
│   │   └── events/
│   │
│   ├── payments/                 # Payment domain
│   │   └── event-sourcing/       # Event sourcing logic
│   │
│   ├── main.ts                   # Application entry point
│   └── app.module.ts             # NestJS root module
│
├── supabase/                      # Supabase configuration
│   ├── functions/                # Edge Functions (Deno)
│   │   ├── webhooks-asaas/       # Webhook receiver
│   │   ├── process-payment/      # Payment processor
│   │   ├── blockchain-tx/        # Blockchain interaction
│   │   └── api-gateway/          # REST API gateway
│   └── migrations/               # Database migrations
│
├── openapi/                       # OpenAPI specification
│   └── spec.yaml                 # Swagger/OpenAPI 3.0 definition
│
├── .env.example                   # Environment variables template
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # NPM dependencies
└── DEPLOYMENT_ROADMAP.md          # Detailed deployment steps for each feature
```

### Key Design Patterns

#### 1. **Repository Pattern** (Database)

Abstracts database operations:

```typescript
const payment = await this.paymentRepository.findById(id);
const payments = await this.paymentRepository.findByStatus('pending');
await this.paymentRepository.create({ amount: 100, payer: '...' });
```

#### 2. **Repository Pattern** (Blockchain)

Abstracts smart contract interactions:

```typescript
const txHash = await this.paymentContract.recordPayment(
  paymentId,
  amount,
  payer,
  description
);
await this.paymentContract.waitForConfirmation(txHash);
```

#### 3. **Event-Driven Architecture**

Events flow through the system:

```typescript
// Publish event
const event = new PaymentReceivedEvent(paymentId, amount, payer, description, pixKey, {});
await this.eventPublisher.publish(event);

// Subscribe to events
this.eventPublisher.subscribeToEvent('payment.received', (event) => {
  console.log('Payment received:', event);
});
```

#### 4. **Event Sourcing**

All changes tracked as immutable events:

```sql
SELECT * FROM event_store
WHERE aggregate_id = 'payment-123'
ORDER BY timestamp ASC;

-- Shows complete history:
-- - payment.received
-- - payment.confirmed
-- - blockchain.tx.initiated
-- - blockchain.tx.confirmed
```

---

## Building & Running Services

### Local Development

```bash
# Watch mode (auto-reload)
pnpm run start:dev

# Production build
pnpm run build
pnpm run start:prod

# Run specific scripts
pnpm run lint      # ESLint
pnpm run format    # Prettier
```

### Database Management

```bash
# Create migration
supabase migration new <name>

# View local migrations
supabase migration list

# Run migrations
supabase migration up

# Rollback
supabase migration down

# Reset (dev only!)
supabase db reset
```

### Edge Functions

```bash
# Create new function
supabase functions new function-name

# Run locally
supabase functions serve

# Deploy function
supabase functions deploy function-name

# List deployed functions
supabase functions list
```

---

## Deploying Each Feature

See [DEPLOYMENT_ROADMAP.md](./DEPLOYMENT_ROADMAP.md) for detailed steps.

### Quick Reference

```bash
# Phase 0: Database Setup
supabase db push

# Phase 1: Asaas Webhook
supabase functions deploy webhooks-asaas

# Phase 2: Payment Repository (local code, no deploy)
pnpm run build

# Phase 3: API Health Check (local testing)
pnpm run start:dev

# Phase 4: Payment Processing
supabase functions deploy process-payment

# Phase 5: Blockchain Integration
supabase functions deploy blockchain-tx

# Phase 6: API Endpoints
supabase functions deploy api-gateway

# Phase 7: Production Hardening
# Update various functions and configs
```

---

## Testing

### Type Checking

```bash
# Check TypeScript compilation
pnpm run build

# Check for type errors
pnpm run lint

# Format code
pnpm run format
```

### Local Testing

```bash
# Test EnvService validation
NODE_ENV=test npm run test:env

# Test database connection
npm run test:db

# Test webhook validator
npm run test:webhook
```

### Manual Testing

```bash
# 1. Start Supabase
supabase start

# 2. Start application
pnpm run start:dev

# 3. Test health check
curl http://localhost:3000/health

# 4. View Swagger
open http://localhost:3000/api/docs

# 5. Test webhook (with valid signature)
curl -X POST http://localhost:3000/webhooks/asaas \
  -H "Content-Type: application/json" \
  -H "asaas-signature: ..." \
  -d '{...}'
```

### Integration Testing

```bash
# Test complete flow:
# 1. Send webhook
# 2. Record payment in DB
# 3. Publish event
# 4. Process payment handler
# 5. Send blockchain TX
# 6. Confirm on-chain

# Check logs in Supabase
supabase db execute
SELECT * FROM logs ORDER BY timestamp DESC LIMIT 10;
```

---

## Troubleshooting

### Environment Issues

**Problem**: `Missing required environment variable`

```bash
# Check what's missing
node -e "require('dotenv').config(); console.log(process.env);"

# Verify .env file
cat .env

# Compare with example
cat .env.example
```

**Solution**:
```bash
cp .env.example .env
# Edit all required variables
nano .env
```

### Database Issues

**Problem**: `connection refused`

```bash
# Check if Supabase is running
supabase status

# Start Supabase
supabase start

# Check logs
supabase logs
```

**Problem**: `Migration failed`

```bash
# View migration history
supabase migration list

# Check migration file for syntax errors
ls supabase/migrations/

# Rollback last migration
supabase migration down

# Reset database (dev only!)
supabase db reset
```

### Blockchain Issues

**Problem**: `Invalid private key format`

```bash
# Private key must be 64 hex characters (+ 0x prefix)
# Correct format: 0x1234567890abcdef...

# Update .env
nano .env
# PRIVATE_KEY=0x...

# Verify format
node -e "const pk = process.env.PRIVATE_KEY; console.log(pk.match(/^0x[a-f0-9]{64}$/));"
```

**Problem**: `Contract call failed`

```bash
# Verify contract address
echo "CONTRACT_PAYMENT_ADDRESS=$CONTRACT_PAYMENT_ADDRESS"

# Check contract ABI file exists
ls -la src/blockchain/abis/Payment.json

# Verify RPC connection
curl $CHAIN_RPC_URL -X POST -d '{"jsonrpc":"2.0","method":"eth_blockNumber","id":1}'
```

### Webhook Issues

**Problem**: `Invalid webhook signature`

```bash
# Check webhook secret
echo $ASAAS_WEBHOOK_SECRET

# Verify signature calculation
# Asaas uses: sha1(body + secret)

# Test signature
npm run test:webhook-signature
```

### Deployment Issues

**Problem**: `Function deployment failed`

```bash
# Check function code
supabase functions show function-name

# View deployment logs
supabase functions describe function-name

# Redeploy
supabase functions deploy function-name --force

# Check for runtime errors
supabase functions logs function-name
```

---

## Useful Commands Cheatsheet

```bash
# Development
pnpm run start:dev          # Start with watch
pnpm run build              # Build TypeScript
pnpm run lint               # ESLint
pnpm run format             # Prettier

# Database
supabase start              # Start local Supabase
supabase stop               # Stop local Supabase
supabase db push            # Push migrations
supabase migration new NAME # Create new migration

# Edge Functions
supabase functions new NAME # Create new function
supabase functions serve    # Test locally
supabase functions deploy   # Deploy function
supabase functions logs     # View logs

# Utilities
supabase status             # Check service status
supabase logs               # View logs
supabase secrets list       # List secrets
supabase secrets set KEY=VAL # Set secret
```

---

## Next Steps

1. **Complete Phase 0**: Setup Supabase and run migrations
2. **Test EnvService**: Verify environment variable validation
3. **Test LoggerService**: Check logs are being saved to database
4. **Build Project**: Ensure TypeScript compilation works
5. **Deploy Phase 1**: Create webhooks-asaas Edge Function
6. **Test Webhook**: Send test webhook and verify processing
7. **Continue with remaining phases**: Follow DEPLOYMENT_ROADMAP.md

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [viem.js Documentation](https://viem.sh)
- [Asaas API Docs](https://docs.asaas.com)
- [OpenAPI 3.0 Spec](https://spec.openapis.org/oas/v3.0.3)

---

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review [DEPLOYMENT_ROADMAP.md](./DEPLOYMENT_ROADMAP.md)
3. Check Supabase logs: `supabase logs`
4. Check application logs: `SELECT * FROM logs ORDER BY created_at DESC;`
