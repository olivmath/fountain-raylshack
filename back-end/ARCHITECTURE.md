# 🏗️ Architecture Overview - Rayls

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Asaas PIX Provider                       │
│                       (Webhook Receiver)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Supabase Edge Functions                        │
│  ┌──────────────────┬──────────────────┬──────────────────┐   │
│  │  webhooks-asaas  │ process-payment  │ blockchain-tx    │   │
│  │  (Receives PIX)  │ (Handles events) │ (Sends on-chain) │   │
│  └──────────────────┴──────────────────┴──────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Event Store     │ │  Supabase DB     │ │  Supabase        │
│  (Event Sourcing)│ │  (Payments,      │ │  Realtime        │
│                  │ │   Logs, TX)      │ │  (Pub/Sub)       │
└──────────────────┘ └──────────────────┘ └──────────────────┘
        │                    │
        └────────────────────┴────────────────────────┐
                                                      ▼
                                         ┌──────────────────────┐
                                         │  Blockchain (viem)   │
                                         │  (Smart Contracts)   │
                                         └──────────────────────┘
```

---

## Core Design Patterns

### 1. Repository Pattern (Data Access)

**Purpose**: Abstracts database operations from business logic

**Implementation**:

```
┌─────────────────────────────────────────┐
│  PaymentController/Service              │
│  (Business Logic)                       │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  PaymentRepository                      │
│  - findById()                           │
│  - findAll()                            │
│  - create()                             │
│  - update()                             │
│  - delete()                             │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Supabase Database                      │
│  (PostgreSQL)                           │
└─────────────────────────────────────────┘
```

**Example**:

```typescript
// Service uses repository
class PaymentService {
  constructor(private paymentRepository: PaymentRepository) {}

  async getPayment(id: string) {
    return await this.paymentRepository.findById(id);
  }
}

// Repository abstracts database
class PaymentRepository extends BaseRepository<Payment> {
  constructor(supabase: SupabaseClient) {
    super('payments', supabase);
  }

  async findByStatus(status: string) {
    return this.findByFilter({ status });
  }
}
```

**Benefits**:
- Testability: Easy to mock database
- Separation of Concerns: Database logic isolated
- Reusability: Same repository used across services
- Flexibility: Can swap database implementation

---

### 2. Repository Pattern (Smart Contracts)

**Purpose**: Abstracts smart contract interactions from business logic

**Implementation**:

```
┌──────────────────────────────────────────┐
│  PaymentService                          │
│  (Business Logic)                        │
└─────────┬────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────┐
│  PaymentContractRepository               │
│  - recordPayment()                       │
│  - confirmPayment()                      │
│  - getPayment()                          │
│  - getBalance()                          │
└─────────┬────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────┐
│  viem.js Client                          │
│  - publicClient (read)                   │
│  - walletClient (write)                  │
└─────────┬────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────┐
│  EVM Smart Contract (on-chain)           │
└──────────────────────────────────────────┘
```

**Example**:

```typescript
class PaymentContractRepository extends BaseContractRepository {
  async recordPayment(paymentId: string, amount: bigint) {
    return this.write({
      functionName: 'recordPayment',
      args: [this.uuidToBytes32(paymentId), amount],
    });
  }
}

// Service uses contract
class PaymentService {
  constructor(private paymentContract: PaymentContractRepository) {}

  async recordPaymentOnChain(paymentId: string) {
    const { txHash, wait } = await this.paymentContract.recordPayment(
      paymentId,
      BigInt(10 * 10 ** 18)
    );
    await wait(); // Wait for confirmation
    return txHash;
  }
}
```

**Benefits**:
- Contract management centralized
- ABI management structured
- Error handling consistent
- Gas estimation automated
- Retry logic built-in

---

### 3. Event-Driven Architecture

**Purpose**: Decouple components through asynchronous events

**Flow**:

```
1. Event Occurs
   (Payment Received from Asaas)
        │
        ▼
2. Publish Event
   (to event store + realtime)
        │
        ▼
3. Store Event
   (event_store table)
   (immutable history)
        │
        ▼
4. Broadcast Realtime
   (Supabase Realtime)
   (notify subscribers)
        │
        ├─ Side Effect 1: Save Payment
        ├─ Side Effect 2: Publish Blockchain TX
        ├─ Side Effect 3: Send Notifications
        └─ Side Effect N: ...
```

**Example**:

```typescript
// 1. Event occurs
const event = new PaymentReceivedEvent(
  paymentId,
  amount,
  payer,
  description,
  pixKey,
  metadata
);

// 2. Publish event
await this.eventPublisher.publish(event);

// 3. Event stored in database
// SELECT * FROM event_store WHERE event_type = 'payment.received'

// 4. Subscribers notified
this.eventPublisher.subscribeToEvent('payment.received', (event) => {
  // Handle payment received
  this.paymentService.handlePaymentReceived(event);
});
```

**Events**:

```
Payment Events:
├─ PaymentReceivedEvent
├─ PaymentConfirmedEvent
└─ PaymentFailedEvent

Blockchain Events:
├─ BlockchainTransactionInitiatedEvent
├─ BlockchainTransactionConfirmedEvent
└─ BlockchainTransactionFailedEvent

System Events:
├─ SystemStartedEvent
└─ SystemErrorEvent
```

**Benefits**:
- Decoupled services: No direct dependencies
- Auditable: Complete history in event store
- Scalable: Easy to add new subscribers
- Reliable: Events persisted, not lost on crash
- Event sourcing: Rebuild state from events

---

### 4. Event Sourcing

**Purpose**: Store all changes as immutable events instead of current state

**Database Structure**:

```
event_store table:
┌────────┬──────────────┬──────────────┬────────────┬────────────┐
│ id     │ aggregate_id │ event_type   │ timestamp  │ payload    │
├────────┼──────────────┼──────────────┼────────────┼────────────┤
│ uuid-1 │ payment-123  │ payment.received    │ 2024-01-01 │ {...}  │
│ uuid-2 │ payment-123  │ blockchain.tx.initiated │ 2024-01-02 │ {...}  │
│ uuid-3 │ payment-123  │ blockchain.tx.confirmed │ 2024-01-03 │ {...}  │
│ uuid-4 │ payment-123  │ payment.confirmed  │ 2024-01-04 │ {...}  │
└────────┴──────────────┴──────────────┴────────────┴────────────┘
```

**Reconstruct State**:

```typescript
// Given payment-123, replay all events:
const events = await eventStore.getByAggregateId('payment-123');

let state = {
  status: 'pending',
  amount: 0,
  txHash: null,
};

// Replay events
events.forEach((event) => {
  switch (event.type) {
    case 'payment.received':
      state.status = 'received';
      state.amount = event.payload.amount;
      break;
    case 'blockchain.tx.confirmed':
      state.txHash = event.payload.txHash;
      state.status = 'confirmed';
      break;
    // ...
  }
});

// Result: complete state history
```

**Benefits**:
- Complete audit trail: Every change recorded
- Temporal queries: "What was state at time X?"
- Debugging: Replay events to understand what happened
- Compliance: Immutable record for regulations
- Analytics: Rich data for analysis

---

### 5. Config Management (EnvService)

**Purpose**: Centralized, validated environment variable management

**Pattern**:

```
┌──────────────────────────────────────┐
│  .env file                           │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  EnvService                          │
│  - Load from .env                    │
│  - Validate with Zod schema          │
│  - Provide typed access              │
│  - Fail-fast on startup              │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Application (all services)          │
│  - type-safe config access           │
│  - no invalid configs possible       │
└──────────────────────────────────────┘
```

**Example**:

```typescript
// Define schema
const SupabaseConfigSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_KEY: z.string().min(1),
});

// Validate and parse
this.config = EnvSchema.parse(process.env);

// Type-safe access
const url = this.envService.get('SUPABASE_URL');
// ^? string (type-safe)

// Grouped access
const { url, anonKey } = this.envService.getSupabaseConfig();
```

**Benefits**:
- Type-safe: TypeScript enforces correct usage
- Validated: Invalid configs detected at startup
- Grouped: Related configs together
- Documented: Schema shows all requirements
- Fail-fast: Don't start with missing config

---

### 6. Logging (LoggerService)

**Purpose**: Structured, persistent logging with context

**Pattern**:

```
┌─────────────────────────────────────────┐
│  Application Code                       │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  LoggerService.createLogger('Context')  │
└────────┬────────────────────────────────┘
         │
         ├─ Console Output (pino)
         │  └─ Pretty-printed development logs
         │
         └─ Database Persistence (buffer + flush)
            └─ Supabase logs table
```

**Example**:

```typescript
const logger = this.loggerService.createLogger('PaymentService');

logger.info('Processing payment', { paymentId: '123', amount: 100 });
// Console: [11:23:45] PaymentService Processing payment { paymentId: '123', ... }
// DB: INSERT INTO logs (level, context, message, metadata, ...)

logger.error('Payment failed', error, { paymentId: '123' });
// Console: [11:24:01] PaymentService Payment failed { error: ..., paymentId: '123', ... }
// DB: INSERT INTO logs (level: 'error', stack: '...', ...)
```

**Features**:
- Structured: JSON format queryable
- Contextual: Logger context included in all logs
- Persistent: Searchable in database
- Buffered: Efficient DB writes (5s flush)
- Levels: debug, info, warn, error

---

## Data Flow Example: Payment Reception

```
1. Asaas sends webhook
   POST https://our-api/webhooks/asaas
   {
     "id": "webhook-123",
     "event": "payment.received",
     "data": {
       "id": "payment-123",
       "amount": 100.00,
       "payer": "customer@example.com"
     }
   }

2. webhooks-asaas Edge Function receives
   - Validate signature
   - Parse payload
   - Store webhook audit record

3. Publish PaymentReceivedEvent
   - Emit to event_store table
   - Broadcast via Realtime

4. Event subscribers respond
   - PaymentService.handlePaymentReceived()
   - Save payment to database
   - Publish PaymentConfirmedEvent

5. Blockchain subscriber
   - Send transaction to smart contract
   - Emit BlockchainTransactionInitiatedEvent

6. Monitor blockchain
   - Poll transaction status
   - Once confirmed, emit BlockchainTransactionConfirmedEvent

7. Complete
   - Payment marked as confirmed
   - Event chain: received → confirmed → blockchain.confirmed
   - All events in event_store for audit trail
```

---

## Error Handling Pattern

```
┌──────────────────────┐
│  Application Code    │
└─────────┬────────────┘
          │
          ▼ throws
┌──────────────────────────────────┐
│  Custom Exception (AppException) │
│  - Code: PAYMENT_FAILED          │
│  - StatusCode: 400               │
│  - Message: "..."                │
│  - Metadata: { ... }             │
│  - Original error: Error          │
└─────────┬────────────────────────┘
          │
          ▼ caught by
┌──────────────────────────────────┐
│  Global Exception Filter         │
│  - Log error                     │
│  - Publish SystemErrorEvent      │
│  - Return standardized response  │
└──────────────────────────────────┘
```

**Exception Types**:

```
AppException (base)
├─ ValidationException
├─ InvalidWebhookSignatureException
├─ PaymentException
│  ├─ PAYMENT_FAILED
│  ├─ PAYMENT_NOT_FOUND
│  └─ PAYMENT_ALREADY_PROCESSED
├─ BlockchainException
│  ├─ BLOCKCHAIN_TRANSACTION_FAILED
│  ├─ BLOCKCHAIN_CONNECTION_ERROR
│  ├─ INVALID_CONTRACT_ADDRESS
│  └─ INSUFFICIENT_GAS
├─ DatabaseException
├─ ExternalServiceException
├─ NotFoundException
└─ InternalServerException
```

---

## Security Architecture

```
┌─────────────────────────────────────┐
│  External Request (Webhook)         │
└────────────┬────────────────────────┘
             │
             ▼ Validate signature
┌─────────────────────────────────────┐
│  AsaasWebhookValidator              │
│  - HMAC-SHA1 signature check        │
│  - Payload structure validation     │
└────────────┬────────────────────────┘
             │
             ▼ Parse & store
┌─────────────────────────────────────┐
│  Edge Function (Secure)             │
│  - Service key authentication       │
│  - Rate limiting                    │
│  - Request validation               │
└────────────┬────────────────────────┘
             │
             ▼ Process safely
┌─────────────────────────────────────┐
│  Application Logic                  │
│  - Input sanitization               │
│  - Error handling                   │
│  - Audit logging                    │
└─────────────────────────────────────┘
```

---

## Scalability Considerations

### Current Architecture (Phase 1-2)

- Single NestJS instance
- Supabase handles horizontal scaling
- Edge Functions auto-scale per request
- Database connections pooled

### Future Scaling (Phase 3+)

```
Load Balancer
    ↓
┌─────────────────────────────┐
│  Multiple NestJS Instances  │
│  (Kubernetes cluster)       │
└──────────┬──────────────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
┌─────────┐   ┌─────────┐
│ Supabase │   │ Supabase│
│ DB Pool  │   │ Cache   │
└─────────┘   └─────────┘

Message Queue (optional)
┌──────────────────────────────────┐
│  Redis/RabbitMQ/AWS SQS          │
│  - Decouple request processing   │
│  - Async job handling            │
│  - Retry mechanism               │
└──────────────────────────────────┘
```

---

## Technology Stack Justification

| Component | Technology | Why |
|-----------|-----------|-----|
| **Framework** | NestJS | Type-safe, scalable, production-ready |
| **Language** | TypeScript | Type safety, better DX, catches errors early |
| **Database** | Supabase (PostgreSQL) | Open-source, serverless, Realtime support |
| **Blockchain** | viem.js | Modern, type-safe, lightweight |
| **Logging** | Pino | Fast, structured, streaming support |
| **Config** | Zod | Type-safe schema validation |
| **Deployment** | Supabase Edge Functions | Serverless, fast, integrated |

---

## Next Steps

1. Implement Phase 1 (Asaas Webhook)
2. Add database migrations
3. Deploy Edge Functions
4. Create payment handlers
5. Add blockchain integration
6. Build API endpoints
7. Add comprehensive error handling
8. Production hardening
