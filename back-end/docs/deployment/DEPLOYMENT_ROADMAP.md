# 🚀 Deployment Roadmap - Baby Steps Approach

Este documento detalha o roadmap de desenvolvimento com **deploys incrementais para cada feature**, garantindo que cada etapa seja independente, testável e deployável.

**Filosofia**: Cada feature é uma unidade de trabalho completa que pode ser deployada independentemente. Não acumulamos features para fazer deploy no final.

---

## 📋 Estrutura de Fases

Cada fase segue este padrão:

1. **Feature Description** - O que será feito
2. **Acceptance Criteria** - Quando está pronto
3. **Files to Create/Modify** - Alterações necessárias
4. **Database Migrations** - Schema changes
5. **Deploy Steps** - Como fazer deploy no Supabase
6. **Testing** - Testes manuais antes de deploy
7. **Rollback Plan** - Como reverter se necessário

---

## 🎯 PHASE 0: Foundation Setup (Semana 1)

### Feature: Initialize Supabase Project & Database Schema

**Status**: Not Started

**Description**:
- Configurar projeto Supabase
- Criar tabelas base para event sourcing, logs e dados
- Testar conexão local

**Acceptance Criteria**:
- ✅ Supabase project criado e rodando localmente
- ✅ Todas as tabelas criadas com migrations
- ✅ EnvService validando corretamente
- ✅ LoggerService conseguindo escrever em DB
- ✅ EventPublisher funcionando

**Database Schema**:

```sql
-- Event Store (Event Sourcing)
CREATE TABLE event_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id UUID NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  version INT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_event_store_aggregate_id ON event_store(aggregate_id);
CREATE INDEX idx_event_store_event_type ON event_store(event_type);

-- Logs
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP NOT NULL,
  level VARCHAR(20) NOT NULL,
  context VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  stack TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_logs_timestamp ON logs(timestamp);
CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_logs_context ON logs(context);

-- Payments (Aggregate)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asaas_id VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  payer VARCHAR(255) NOT NULL,
  description TEXT,
  pix_key VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_asaas_id ON payments(asaas_id);

-- Blockchain Transactions
CREATE TABLE blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id),
  tx_hash VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  method_name VARCHAR(255) NOT NULL,
  args JSONB NOT NULL,
  gas_used DECIMAL(20, 0),
  block_number BIGINT,
  block_hash VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_blockchain_tx_payment ON blockchain_transactions(payment_id);
CREATE INDEX idx_blockchain_tx_status ON blockchain_transactions(status);

-- Asaas Webhooks (Audit Trail)
CREATE TABLE asaas_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id VARCHAR(255) UNIQUE NOT NULL,
  event VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_asaas_webhooks_event ON asaas_webhooks(event);
CREATE INDEX idx_asaas_webhooks_processed ON asaas_webhooks(processed);
```

**Files to Create**:

```
supabase/
├── migrations/
│   ├── 001_create_event_store.sql
│   ├── 002_create_logs.sql
│   ├── 003_create_payments.sql
│   ├── 004_create_blockchain_transactions.sql
│   └── 005_create_asaas_webhooks.sql
└── config.toml

.env (copy from .env.example)
```

**Deploy Steps**:

```bash
# 1. Install Supabase CLI
pnpm add -D supabase

# 2. Link to Supabase project
supabase link --project-ref <your-project-id>

# 3. Create initial migration
supabase migration new init_schema

# 4. Add SQL to migration file
# (Copy SQL from above)

# 5. Test migration locally
supabase start
supabase migration up

# 6. Push to production
supabase db push
```

**Testing**:

```bash
# Test database connection
NODE_ENV=test npm run test:env

# Test logger
NODE_ENV=test npm run test:logger

# Verify tables exist
supabase db tables list
```

**Rollback**:

```bash
# Rollback last migration
supabase migration down

# Or reset entire database (dev only)
supabase db reset
```

---

## 🎯 PHASE 1: Asaas Webhook Integration (Semana 2)

### Feature: Receive & Process Asaas PIX Webhooks

**Status**: Not Started

**Description**:
- Criar Edge Function que recebe webhooks da Asaas
- Validar assinatura do webhook
- Publicar evento de pagamento
- Salvar webhook em tabela de auditoria

**Acceptance Criteria**:
- ✅ Edge Function criada e deployada
- ✅ Webhook signature validation funcionando
- ✅ PaymentReceivedEvent sendo publicado
- ✅ Logs estruturados sendo salvos
- ✅ Teste manual com curl/Postman recebendo webhook

**Files to Create/Modify**:

```
supabase/functions/
├── webhooks-asaas/
│   └── index.ts
├── _shared/
│   ├── env.ts
│   ├── logger.ts
│   └── validators.ts

src/asaas/
├── validators/
│   └── webhook.validator.ts
├── services/
│   └── asaas-webhook.service.ts
└── types.ts
```

**Key Files**:

### `supabase/functions/webhooks-asaas/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY')!;
const ASAAS_WEBHOOK_SECRET = Deno.env.get('ASAAS_WEBHOOK_SECRET')!;

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const signature = req.headers.get('asaas-signature');
    const body = await req.text();

    // Validate signature
    const computedSignature = btoa(`${body}${ASAAS_WEBHOOK_SECRET}`);
    if (signature !== computedSignature) {
      return new Response('Invalid signature', { status: 401 });
    }

    const payload = JSON.parse(body);

    // Store webhook
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase.from('asaas_webhooks').insert({
      webhook_id: payload.id,
      event: payload.event,
      payload,
    });

    // Publish event
    await supabase.channel('payment_events').send('broadcast', {
      event: 'payment.received',
      payload,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
});
```

**Deploy Steps**:

```bash
# 1. Create function
supabase functions new webhooks-asaas

# 2. Add code to supabase/functions/webhooks-asaas/index.ts

# 3. Test locally
supabase functions serve

# 4. Deploy
supabase functions deploy webhooks-asaas

# 5. Get function URL
supabase functions list

# 6. Add to Asaas settings
# https://dashboard.asaas.com/settings/webhooks
# URL: https://your-project.supabase.co/functions/v1/webhooks-asaas
```

**Testing**:

```bash
# Test webhook locally
curl -X POST http://localhost:54321/functions/v1/webhooks-asaas \
  -H "Content-Type: application/json" \
  -H "asaas-signature: $(echo 'test-payload-secret' | base64)" \
  -d '{"id":"test","event":"payment.received"}'

# Verify webhook in database
supabase db execute
SELECT * FROM asaas_webhooks ORDER BY created_at DESC LIMIT 1;
```

**Rollback**:

```bash
# Undeploy function
supabase functions delete webhooks-asaas

# Or update function with previous version
supabase functions deploy webhooks-asaas --version-tag previous
```

---

## 🎯 PHASE 2: Payment Repository & Event Store (Semana 2)

### Feature: Create Payment Repository & Event Sourcing

**Status**: Not Started

**Description**:
- Implementar PaymentRepository
- Criar event handlers para PaymentReceivedEvent
- Persistir pagamentos com event sourcing
- Query histórico de eventos

**Acceptance Criteria**:
- ✅ PaymentRepository com CRUD
- ✅ PaymentReceivedHandler processando eventos
- ✅ Eventos sendo salvos em event_store
- ✅ Pagamentos sendo criados corretamente
- ✅ Histórico de eventos queryável

**Files to Create**:

```
src/database/repositories/
├── payment.repository.ts

src/asaas/
├── events/
│   ├── payment-received.handler.ts
│   ├── payment-confirmed.handler.ts
│   └── payment-failed.handler.ts
└── event-sourcing/
    └── payment.aggregate.ts
```

### `src/database/repositories/payment.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import { EnvService } from '@core/config/env.service';
import { LoggerService } from '@core/logger/logger.service';

export interface Payment {
  id: string;
  asaas_id: string;
  amount: number;
  payer: string;
  description?: string;
  pix_key?: string;
  status: 'pending' | 'confirmed' | 'failed';
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class PaymentRepository extends BaseRepository<Payment> {
  constructor(
    supabase: SupabaseClient,
    envService: EnvService,
    loggerService: LoggerService
  ) {
    super('payments', supabase, loggerService);
  }

  async findByAsaasId(asaasId: string): Promise<Payment | null> {
    return this.findByFilter({ asaas_id: asaasId }).then((items) => items[0] || null);
  }

  async findByStatus(status: string): Promise<Payment[]> {
    return this.findByFilter({ status });
  }
}
```

**Deploy Steps**:

```bash
# 1. Create payment repository
pnpm add @nestjs/core  # Already installed

# 2. Update app module to use repository
# (Will do in next phase)

# 3. Test locally
pnpm run build

# 4. No deploy yet - this is internal code
```

**Testing**:

```bash
# Test compilation
pnpm run build

# Check for type errors
pnpm run lint
```

---

## 🎯 PHASE 3: API Health Check & Swagger (Semana 2-3)

### Feature: Create API Gateway with Health Check & Swagger

**Status**: Not Started

**Description**:
- Criar main.ts com NestJS bootstrap
- Health check endpoint
- Swagger documentation
- Basic error handling

**Acceptance Criteria**:
- ✅ API rodando em http://localhost:3000
- ✅ GET /health retorna 200
- ✅ GET /api/docs mostra Swagger
- ✅ Erros retornam formato padronizado
- ✅ Logs são salvos no database

**Files to Create**:

```
src/
├── main.ts
├── app.module.ts
├── app.controller.ts

openapi/
└── spec.yaml
```

### `src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { EnvService } from '@core/config/env.service';
import { LoggerService } from '@core/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const envService = app.get(EnvService);
  const loggerService = app.get(LoggerService);
  const logger = loggerService.createLogger('Bootstrap');

  // Setup validation
  app.useGlobalPipes(new ValidationPipe());

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('Rayls API')
    .setDescription('Event-driven payment gateway')
    .setVersion('1.0.0')
    .addServer(`http://localhost:${envService.get('PORT')}`, 'Development')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = envService.get('PORT');
  await app.listen(port);

  logger.info(`Application started`, {
    port,
    environment: envService.get('NODE_ENV'),
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
```

**Deploy Steps**:

```bash
# 1. Build
pnpm run build

# 2. No deploy to Edge Functions yet - test locally first
# (Will deploy as Edge Function in Phase 4)

# 3. Run locally
pnpm run start

# 4. Visit http://localhost:3000/api/docs
```

**Testing**:

```bash
# Health check
curl http://localhost:3000/health

# Swagger docs
open http://localhost:3000/api/docs
```

---

## 🎯 PHASE 4: Payment Processing Handler (Semana 3)

### Feature: Deploy Payment Processing as Edge Function

**Status**: Not Started

**Description**:
- Criar Edge Function que processa eventos de pagamento
- Salvar pagamento em database
- Publicar eventos downstream
- Handle errors com retry logic

**Acceptance Criteria**:
- ✅ Edge Function deployada
- ✅ Webhook dispara processamento
- ✅ Pagamento salvo em database
- ✅ Eventos publicados no Realtime
- ✅ Retry logic funcionando

**Files to Create**:

```
supabase/functions/
└── process-payment/
    └── index.ts
```

**Deploy Steps**:

```bash
# 1. Create function
supabase functions new process-payment

# 2. Implement payment processing
# (Uses PaymentRepository, EventPublisher)

# 3. Deploy
supabase functions deploy process-payment

# 4. Test with webhook
curl -X POST https://your-project.supabase.co/functions/v1/webhooks-asaas \
  -H "asaas-signature: ..." \
  -d '{...}'

# 5. Verify payment in database
supabase db execute "SELECT * FROM payments ORDER BY created_at DESC LIMIT 1;"
```

---

## 🎯 PHASE 5: Blockchain Integration (Semana 3-4)

### Feature: Smart Contract Interaction & Transaction Management

**Status**: Not Started

**Description**:
- Implementar Payment Smart Contract Repository
- Criar blockchain transaction queue
- Enviar transações on-chain
- Track confirmations com event sourcing

**Acceptance Criteria**:
- ✅ ContractRepository consegue ler state
- ✅ Transações sendo enviadas e trackadas
- ✅ Events de confirmação sendo publicados
- ✅ Retry com exponential backoff
- ✅ Gas estimation funcionando

**Files to Create**:

```
src/blockchain/
├── contracts/
│   └── payment-contract.service.ts
└── repositories/
    └── payment-contract.repository.ts

blockchain/abis/
└── Payment.json

supabase/functions/
└── blockchain-tx/
    └── index.ts
```

**Deploy Steps**:

```bash
# 1. Update .env with blockchain config
# CHAIN_RPC_URL=...
# PRIVATE_KEY=...
# CONTRACT_PAYMENT_ADDRESS=...

# 2. Create Edge Function
supabase functions new blockchain-tx

# 3. Deploy and test
supabase functions deploy blockchain-tx

# 4. Monitor transactions
# Query blockchain_transactions table
```

---

## 🎯 PHASE 6: API Endpoints (Semana 4)

### Feature: REST API for Payment Management

**Status**: Not Started

**Description**:
- Criar controller com endpoints REST
- Payment retrieval endpoints
- Event history endpoints
- Transaction status endpoints

**Acceptance Criteria**:
- ✅ GET /payments/:id
- ✅ GET /payments/:id/events
- ✅ GET /transactions/:id
- ✅ POST /payments (create)
- ✅ Swagger docs completos

**Files to Create**:

```
src/
├── payments/
│   ├── controllers/
│   │   └── payment.controller.ts
│   ├── services/
│   │   └── payment.service.ts
│   └── dto/
│       ├── create-payment.dto.ts
│       └── payment-response.dto.ts
```

**Deploy Steps**:

```bash
# 1. Deploy API Gateway Edge Function
supabase functions new api-gateway

# 2. Update main.ts to work with Supabase Edge Functions

# 3. Deploy
supabase functions deploy api-gateway

# 4. Test endpoints
curl https://your-project.supabase.co/functions/v1/api-gateway/payments
```

---

## 🎯 PHASE 7: Production Hardening (Semana 4-5)

### Feature: Security, Monitoring, & Observability

**Status**: Not Started

**Description**:
- Rate limiting
- Request authentication
- Comprehensive error handling
- Monitoring dashboard
- Alerting rules

**Acceptance Criteria**:
- ✅ Rate limiting implementado
- ✅ Auth tokens validados
- ✅ Errors com recovery suggestions
- ✅ Metrics being collected
- ✅ Alerts configured

---

## 📊 Deploy Timeline Summary

```
WEEK 1 (Dec 2-8)
├─ Phase 0: Supabase Setup
│  └─ Deploy: Database schema + migrations
│     Time: ~4 hours
│     Risk: Low

WEEK 2 (Dec 9-15)
├─ Phase 1: Asaas Webhook Integration
│  └─ Deploy: webhooks-asaas Edge Function
│     Time: ~4 hours
│     Risk: Medium (depends on Asaas API)
│
├─ Phase 2: Payment Repository
│  └─ Deploy: None (local code)
│     Time: ~3 hours
│     Risk: Low
│
└─ Phase 3: API Health Check & Swagger
   └─ Deploy: Local testing only
      Time: ~2 hours
      Risk: Low

WEEK 3 (Dec 16-22)
├─ Phase 4: Payment Processing Handler
│  └─ Deploy: process-payment Edge Function
│     Time: ~4 hours
│     Risk: Medium
│
└─ Phase 5: Blockchain Integration
   └─ Deploy: blockchain-tx Edge Function
      Time: ~6 hours
      Risk: High (depends on RPC, gas, etc)

WEEK 4+ (Dec 23+)
├─ Phase 6: API Endpoints
│  └─ Deploy: api-gateway Edge Function
│     Time: ~4 hours
│     Risk: Low
│
└─ Phase 7: Production Hardening
   └─ Deploy: Updates to existing functions
      Time: ~6 hours
      Risk: Medium
```

---

## 🔄 Deployment Checklist

Before each deploy:

- [ ] Code reviewed
- [ ] Local tests passed
- [ ] Migrations tested locally
- [ ] Env vars configured
- [ ] Supabase backup taken (production)
- [ ] Rollback plan documented
- [ ] Team notified
- [ ] Monitoring set up

After each deploy:

- [ ] Health checks passing
- [ ] Logs monitoring
- [ ] Error rates normal
- [ ] Performance metrics good
- [ ] Team confirmed it's working

---

## 🆘 Rollback Procedures

### Database Migrations

```bash
# List migrations
supabase migration list

# Rollback last migration
supabase migration down

# Rollback to specific migration
supabase migration list --version <version>
```

### Edge Functions

```bash
# List deployed functions
supabase functions list

# Delete function (reverts to previous version if exists)
supabase functions delete <function-name>

# View deployment history
supabase functions list --detailed
```

### Quick Rollback Steps

1. If Edge Function broken:
   ```bash
   supabase functions delete function-name
   supabase functions deploy function-name --rollback
   ```

2. If database broken:
   ```bash
   supabase db reset  # dev only!
   supabase migration down
   supabase db push
   ```

3. If environment config broken:
   ```bash
   supabase secrets update ENV_VAR=correct_value
   supabase functions deploy affected-function
   ```

---

## 📝 Notes

- **Environments**: dev → staging → production (use branch deployments)
- **Monitoring**: Enable Supabase real-time logs
- **Testing**: Each phase has manual test steps
- **Communication**: Update team on Slack before each deploy
- **Database**: Never delete migrations, only add new ones (forward-only migrations)
