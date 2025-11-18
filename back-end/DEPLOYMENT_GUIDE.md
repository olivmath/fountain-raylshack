# 🚀 Guia de Deploy - Passo 0 + Passo 1

Como você não tem Docker, vamos usar **Supabase Cloud** para fazer o deploy.

## Passo 0: Configurar Supabase Cloud

### 1. Link seu projeto Supabase local com a cloud

```bash
# Ir para o diretório do projeto
cd /Users/olivmath/dev/rayls/back-end

# Link com seu projeto Supabase
supabase link --project-ref bzxdqkttnkxqaecaiekt

# Você será pedido para digitar sua senha de DB:
# qinwe9-poXzif-gokbib
```

### 2. Verificar status da conexão

```bash
supabase status

# Deve retornar:
# Supabase API running at http://localhost:54321
# Supabase local development setup is running
```

### 3. Executar migrations

```bash
# Fazer push das migrations para a cloud
supabase db push

# Será criado automaticamente uma new migration com as tables
```

### 4. Verificar que as tables foram criadas

Via Supabase Dashboard:
- Acesse: https://app.supabase.com
- Selecione seu projeto
- Vá em: SQL Editor
- Execute:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

Você deve ver:
- api_keys
- stablecoins
- operations
- event_store
- logs

### 5. Inserir API key de teste (via SQL ou via dashboard)

No SQL Editor, execute:
```sql
INSERT INTO api_keys (client_id, client_name, api_key_hash, is_active)
VALUES (
  'test-client-01',
  'Test Corretora',
  'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
  true
);
```

## Passo 1: Deploy da Edge Function - stablecoin-create

### 1. Fazer deploy da function

```bash
# Deploy específico
supabase functions deploy stablecoin-create

# Ou via CLI (se quiser fazer deploy de todas as funções)
supabase functions deploy

# Você verá:
# ✓ Function stablecoin-create deployed successfully
# ✓ Deployed function endpoint: https://bzxdqkttnkxqaecaiekt.supabase.co/functions/v1/stablecoin-create
```

### 2. Testar o endpoint localmente ANTES de fazer deploy

Se quiser testar localmente antes (recomendado):

```bash
# Terminal 1: Servir as functions localmente
supabase functions serve

# Terminal 2: Fazer request de teste
curl -X POST http://localhost:54321/functions/v1/stablecoin-create \
  -H "x-api-key: test-api-key-123" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Test Corretora",
    "symbol": "TEST",
    "client_wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "webhook": "https://webhook.site/unique-id"
  }'
```

**Resposta esperada:**
```json
{
  "stablecoin_id": "550e8400-e29b-41d4-a716-446655440000",
  "symbol": "TEST",
  "status": "registered",
  "erc20_address": null,
  "created_at": "2025-11-18T12:00:00Z"
}
```

### 3. Testar em PRODUÇÃO (após deploy)

```bash
curl -X POST https://bzxdqkttnkxqaecaiekt.supabase.co/functions/v1/stablecoin-create \
  -H "x-api-key: test-api-key-123" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Test Corretora",
    "symbol": "PROD-TEST",
    "client_wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "webhook": "https://webhook.site/unique-id"
  }'
```

### 4. Verificar que tudo funcionou

#### Via SQL (executar no SQL Editor do Supabase):

```sql
-- Ver a stablecoin criada
SELECT * FROM stablecoins ORDER BY created_at DESC LIMIT 1;

-- Ver o evento registrado
SELECT * FROM event_store WHERE event_type = 'stablecoin.registered' ORDER BY timestamp DESC LIMIT 1;

-- Ver os logs
SELECT * FROM logs ORDER BY timestamp DESC LIMIT 5;
```

#### Via Dashboard Supabase:

1. Vá em **Database** → **Browser**
2. Selecione **stablecoins** table
3. Você deve ver uma linha com seu novo stablecoin
4. Selecione **event_store** table
5. Você deve ver um evento com type="stablecoin.registered"
6. Selecione **logs** table
7. Você deve ver logs com context="stablecoin-create"

## Estrutura de Deploy

```
┌─────────────────────────────────────┐
│  Seu Laptop (sem Docker)            │
│  ├─ Código fonte (TypeScript)       │
│  └─ CLI Supabase                    │
└────────────────────┬────────────────┘
                     │
                     │ supabase db push
                     │ supabase functions deploy
                     │
         ┌───────────▼──────────────┐
         │  Supabase Cloud          │
         │  ├─ PostgreSQL Database  │
         │  ├─ Edge Functions       │
         │  ├─ Auth (API keys)      │
         │  └─ Storage              │
         └──────────────────────────┘
                     │
                     │ HTTP Requests
                     │
         ┌───────────▼──────────────┐
         │  Cliente (Seu App)       │
         │  ├─ POST /create-stable  │
         │  └─ GET /stablecoin      │
         └──────────────────────────┘
```

## Checklist

- [ ] Executar `supabase link`
- [ ] Executar `supabase db push` (executar migrations)
- [ ] Verificar que tabelas foram criadas (SQL Editor)
- [ ] Inserir API key de teste
- [ ] Executar `supabase functions deploy stablecoin-create`
- [ ] Testar com curl (local ou produção)
- [ ] Verificar stablecoin criada no dashboard
- [ ] Verificar evento no event_store
- [ ] Verificar logs no logs table

## Troubleshooting

### Erro: "Failed to connect to Supabase"

```bash
# Verificar que está linkedado
supabase status

# Se não está linkedado:
supabase link --project-ref bzxdqkttnkxqaecaiekt
```

### Erro: "Tables don't exist"

```bash
# Fazer push das migrations novamente
supabase db push

# Ou se quiser resetar:
# ⚠️ ISSO DELETARÁ TODOS OS DADOS
supabase db reset
```

### Erro: "Invalid API key"

```bash
# Verificar que inseriu a API key corretamente
SELECT * FROM api_keys;

# Hash correto: a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3
# API key: test-api-key-123
```

### Edge Function retorna 401

```bash
# Verificar que está passando o header correto:
# x-api-key: test-api-key-123

# Testar com:
curl -X POST http://localhost:54321/functions/v1/stablecoin-create \
  -H "x-api-key: test-api-key-123" \
  -H "Content-Type: application/json" \
  -d '{"client_name":"Test","symbol":"TST","client_wallet":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb","webhook":"https://webhook.site/xxx"}'
```

## Próximos Passos

Após validar que o Passo 0 e Passo 1 funcionam:

1. Criar `deposit-request` function
2. Criar `webhook-deposit` function
3. Integrar com Asaas para PIX
4. Deploy do smart contract na blockchain
5. Testar fluxo completo

---

**Data**: Novembro 2025
**Status**: Pronto para deploy 🚀
