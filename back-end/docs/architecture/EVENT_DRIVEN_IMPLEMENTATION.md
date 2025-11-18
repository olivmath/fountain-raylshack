# Event-Driven Stablecoin Gateway - Implementation Guide

Este documento descreve a implementação completa da arquitetura event-driven para o Rayls Stablecoin Gateway.

## 📋 Status da Implementação

### ✅ Concluído

#### Database
- [x] Migrations com 5 tabelas principais:
  - `stablecoins` - Registro de stablecoins por cliente
  - `operations` - Depósitos e saques
  - `event_store` - Audit trail completo
  - `logs` - Logs estruturados
  - `api_keys` - Autenticação de clientes

#### Shared Libraries (Deno)
- [x] `types.ts` - Schemas Zod + interfaces TypeScript
- [x] `supabase-client.ts` - Cliente Supabase singleton
- [x] `auth.ts` - Validação de API Key com SHA256
- [x] `logger.ts` - Logger estruturado (console + BD)
- [x] `event-publisher.ts` - Publicador de eventos
- [x] `error-handler.ts` - Tratamento padronizado de erros
- [x] `asaas-client.ts` - Cliente Asaas (PIX + Transfers)
- [x] `blockchain-client.ts` - Cliente viem para Factory contract
- [x] `blockchain-minter.ts` - Lógica de mint/deploy (separada)
- [x] `client-notifier.ts` - Notificação via webhook

#### Edge Functions - Depósito
- [x] `stablecoin-create/` - POST /stablecoin/create
  - Registra nova stablecoin
  - Valida API Key e symbol único
  - Publica evento "stablecoin.registered"

- [x] `deposit-request/` - POST /stablecoin/{symbol}/deposit
  - Gera QRCode PIX via Asaas
  - Cria operação com status "payment_pending"
  - Publica evento "deposit.initiated"

- [x] `webhook-deposit/` - POST /webhook/deposit
  - Valida HMAC signature do Asaas
  - Atualiza status para "payment_deposited"
  - Chama blockchain-minter (interno)
  - Notifica cliente via webhook

#### Edge Functions - Saque
- [x] `withdraw/` - POST /withdraw
  - Valida stablecoin ownership
  - Queima tokens via smart contract
  - Cria transfer PIX via Asaas
  - Atualiza status progressivamente
  - Retorna burn_tx_hash

- [x] `webhook-withdraw/` - POST /webhook/withdraw
  - Valida HMAC signature do Asaas
  - Confirma transferência PIX
  - Notifica cliente

### ⏳ Pendente

- [ ] Testes end-to-end locais
- [ ] Deploy em produção
- [ ] Monitoramento e alertas
- [ ] Rate limiting
- [ ] Refund mechanism
- [ ] Smart contract deploy em blockchain de teste

## 🚀 Próximos Passos

### 1. Deploy Smart Contract

```bash
# Compile Solidity contracts
npx hardhat compile

# Deploy para Sepolia testnet
npx hardhat run scripts/deploy.js --network sepolia

# Exporte Factory address para .env
FACTORY_CONTRACT_ADDRESS=0x...
OWNER_ADDRESS=0x...
OWNER_PRIVATE_KEY=0x...
```

### 2. Configurar Variáveis de Ambiente

```bash
# .env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_ANON_KEY=eyJhbGc...

# Blockchain
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/PROJECT_ID
FACTORY_CONTRACT_ADDRESS=0x...
OWNER_ADDRESS=0x...
OWNER_PRIVATE_KEY=0x...
CHAIN_ID=11155111  # Sepolia

# Asaas
ASAAS_API_KEY=your_api_key
ASAAS_WEBHOOK_KEY=your_webhook_key

# Local Deno
DENO_DIR=~/.deno
```

### 3. Executar Migrations

```bash
# Link para Supabase project
supabase link --project-ref <project-id>

# Push migrations
supabase migration up

# Ou via Supabase CLI UI
supabase db push
```

### 4. Inserir Chave de Teste

```sql
-- Via Supabase dashboard
INSERT INTO api_keys (client_id, client_name, api_key_hash, is_active)
VALUES (
  'test-client-01',
  'Test Corretora',
  'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
  true
);
-- API key: test-api-key-123 (SHA256 hash acima)
```

### 5. Testar Localmente

```bash
# Terminal 1: Start Supabase local
supabase start

# Terminal 2: Serve Edge Functions
supabase functions serve

# Terminal 3: Test API
curl -X POST http://localhost:54321/functions/v1/stablecoin-create \
  -H "x-api-key: test-api-key-123" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Test Corretora",
    "symbol": "STABLE-TEST",
    "client_wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "webhook": "https://webhook.site/unique-id"
  }'
```

### 6. Testar Fluxo Completo

```bash
# 1. Criar stablecoin
curl -X POST http://localhost:54321/functions/v1/stablecoin-create \
  -H "x-api-key: test-api-key-123" \
  -H "Content-Type: application/json" \
  -d '{"client_name":"Test","symbol":"TST","client_wallet":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb","webhook":"https://webhook.site/xxx"}'

# 2. Solicitar depósito (guarde operation_id)
curl -X POST http://localhost:54321/functions/v1/stablecoin/TST/deposit \
  -H "x-api-key: test-api-key-123" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'

# 3. Simular webhook do Asaas (use endpoint real)
# Este webhook é enviado pelo Asaas após pagamento confirmado

# 4. Verificar BD
supabase db browser

# Ver operações
SELECT * FROM operations ORDER BY created_at DESC;

# Ver eventos
SELECT * FROM event_store ORDER BY timestamp DESC;
```

## 📊 Estrutura de Dados - Estado das Operações

### Fluxo de Depósito

```
[Cliente]
    ↓ POST /stablecoin/create
[REGISTERED] ← Stablecoin criada, status=registered, erc20_address=NULL
    ↓ POST /stablecoin/{symbol}/deposit
[PAYMENT_PENDING] ← Operação criada, aguardando pagamento
    ↓ [Asaas webhook: payment confirmado]
[PAYMENT_DEPOSITED] ← Status atualizado
    ↓ [blockchain-minter executa]
[MINTING_IN_PROGRESS] ← Mint em andamento
    ├→ IF FIRST DEPOSIT: Deploy factory.createStablecoin()
    │  └→ [DEPLOYED] ← Stablecoin com erc20_address
    ├→ ELSE: Mint tokens em contrato existente
    └→ [MINTED] ← TX hash registrado
    ↓ [client-notifier envia webhook]
[CLIENT_NOTIFIED] ← Cliente informado
```

### Fluxo de Saque

```
[Cliente]
    ↓ POST /withdraw
[BURN_INITIATED] ← Operação criada
    ↓ [blockchain.burnTokens() executa]
[TOKENS_BURNED] ← Tokens queimados, burn_tx_hash registrado
    ↓ [asaas.createTransfer() executa]
[PIX_TRANSFER_PENDING] ← Transfer PIX criado
    ↓ [Asaas webhook: transfer confirmado]
[WITHDRAW_SUCCESSFUL] ← Transfer completado
    ↓ [client-notifier envia webhook]
[CLIENT_NOTIFIED] ← Cliente informado
```

## 🔑 API Endpoints

### Criar Stablecoin
```
POST /stablecoin/create
Headers: x-api-key
Body: { client_name, symbol, client_wallet, webhook }
Response: { stablecoin_id, symbol, status, erc20_address, created_at }
```

### Solicitar Depósito
```
POST /stablecoin/{symbol}/deposit
Headers: x-api-key
Body: { amount }
Response: { operation_id, stablecoin_id, symbol, amount, qrcode, status }
```

### Solicitar Saque
```
POST /withdraw
Headers: x-api-key
Body: { stablecoin_address, amount, pix_address }
Response: { operation_id, stablecoin_id, symbol, amount, burn_tx_hash, status }
```

### Webhooks (Asaas)
```
POST /webhook/deposit
POST /webhook/withdraw
Headers: asaas-signature (HMAC SHA256)
Body: Payload do Asaas
Response: { status: "ok" }
```

## 🔐 Segurança

- ✅ API Key autenticação com SHA256
- ✅ HMAC signature validation dos webhooks
- ✅ Transações blockchain on-chain
- ✅ Audit trail completo (event_store)
- ✅ Logs estruturados para debugging
- ⚠️ TODO: Rate limiting
- ⚠️ TODO: CORS configuration
- ⚠️ TODO: Input sanitization adicional

## 📈 Monitoramento

### Logs por Contexto
```sql
-- Logar tudo de um cliente
SELECT * FROM logs WHERE operation_id = '...' ORDER BY timestamp DESC;

-- Logar tudo de um contexto
SELECT * FROM logs WHERE context = 'blockchain-minter' ORDER BY timestamp DESC;

-- Contar erros
SELECT level, COUNT(*) as count FROM logs GROUP BY level;
```

### Event Store - Auditoria
```sql
-- Replayar histórico de uma operação
SELECT * FROM event_store
WHERE aggregate_id = 'operation-uuid'
ORDER BY timestamp ASC;

-- Eventos por tipo
SELECT event_type, COUNT(*) FROM event_store GROUP BY event_type;
```

## 🐛 Troubleshooting

### Erro: "Invalid API key"
- Verificar se API key está corretamente gerada (SHA256)
- Confirmar que `is_active=true` na tabela `api_keys`

### Erro: "Stablecoin not found"
- Confirmar que `POST /stablecoin/create` foi executado primeiro
- Verificar se symbol está correto (case-sensitive)

### Erro: "Blockchain transaction failed"
- Verificar RPC URL do blockchain
- Confirmar que private key tem saldo (gas)
- Verificar Factory contract address está correto

### Erro: "Invalid webhook signature"
- Confirmar que `ASAAS_WEBHOOK_KEY` está correto
- Validar que payload não foi modificado
- Checar timezone (timestamp validation)

## 📚 Referências

- [Supabase Docs](https://supabase.com/docs)
- [Viem Documentation](https://viem.sh/)
- [Deno Manual](https://deno.land/manual)
- [Asaas API](https://docs.asaas.com/)

## 🤝 Próximas Fases

### Fase 2: Melhorias
- [ ] Retry mechanism com exponential backoff
- [ ] Refund automático se burn/transfer falhar
- [ ] Webhook retry para notificações do cliente
- [ ] Rate limiting por API key
- [ ] Testes automatizados

### Fase 3: Features Adicionais
- [ ] Suporte a múltiplas blockchains
- [ ] Suporte a múltiplas stablecoins (USDC, USDT, etc)
- [ ] Dashboard de administração
- [ ] Webhooks com retry automático
- [ ] Mecanismo de reembolso

### Fase 4: Produção
- [ ] Load balancing
- [ ] Database replication
- [ ] CDN para static assets
- [ ] Alertas e monitoramento 24/7
- [ ] Backup and disaster recovery
