# 🧪 Teste da Function stablecoin-create

## Teste Local (sem Docker - simulado)

Como você não tem Docker rodando, você pode testar de algumas formas:

### Opção 1: Fazer o deploy e testar em produção (RECOMENDADO)

```bash
# 1. Link com o projeto
cd /Users/olivmath/dev/rayls/back-end
supabase link --project-ref bzxdqkttnkxqaecaiekt

# 2. Fazer migrations
supabase db push

# 3. Deploy da function
supabase functions deploy stablecoin-create

# 4. Testar via curl
curl -X POST https://bzxdqkttnkxqaecaiekt.supabase.co/functions/v1/stablecoin-create \
  -H "x-api-key: test-api-key-123" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Test Corretora",
    "symbol": "TST-001",
    "client_wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "webhook": "https://webhook.site/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }'
```

### Opção 2: Revisar o código manualmente

Aqui está o que a function faz:

```
POST /stablecoin/create
├─ Headers: x-api-key (obrigatório)
├─ Body: {client_name, symbol, client_wallet, webhook}
│
├─ 1. Validar API Key
│   ├─ Extrair header x-api-key
│   ├─ Hash com SHA256
│   └─ Buscar em api_keys table
│       └─ Se não encontrar: retorna 401
│
├─ 2. Validar Schema (Zod)
│   ├─ client_name: string não vazio
│   ├─ symbol: 1-10 chars, uppercase/numbers/hyphen
│   ├─ client_wallet: eth address válido (0x...)
│   └─ webhook: URL válida
│       └─ Se falhar: retorna 400
│
├─ 3. Check Symbol Único
│   ├─ Buscar symbol em stablecoins table
│   └─ Se já existe: retorna 409 CONFLICT
│
├─ 4. Generate ID
│   └─ stablecoin_id = UUID novo
│
├─ 5. DB INSERT
│   └─ Inserir em stablecoins table
│       ├─ stablecoin_id
│       ├─ client_id (de auth)
│       ├─ client_name
│       ├─ client_wallet
│       ├─ webhook_url
│       ├─ symbol
│       ├─ status: "registered"
│       └─ Se falhar: retorna 500
│
├─ 6. Publish Event
│   └─ Inserir em event_store
│       ├─ aggregate_id: stablecoin_id
│       ├─ event_type: "stablecoin.registered"
│       └─ payload: {stablecoinId, clientId, clientName, symbol, clientWallet}
│           └─ Se falhar: loga warning mas continua
│
└─ 7. Return 201
    └─ {stablecoin_id, symbol, status, erc20_address, created_at}
```

## Expected Response

### Sucesso (201)
```json
{
  "stablecoin_id": "550e8400-e29b-41d4-a716-446655440000",
  "symbol": "TST-001",
  "status": "registered",
  "erc20_address": null,
  "created_at": "2025-11-18T19:14:23.000Z"
}
```

### Erro: API Key inválida (401)
```json
{
  "error": "Invalid API key",
  "code": "UNAUTHORIZED"
}
```

### Erro: Symbol já existe (409)
```json
{
  "error": "Symbol already exists",
  "code": "CONFLICT"
}
```

### Erro: Validação (400)
```json
{
  "error": "Validation error: symbol must be 1-10 characters",
  "code": "INVALID_REQUEST"
}
```

## Test Cases

### Teste 1: Criar stablecoin válida
```bash
curl -X POST https://bzxdqkttnkxqaecaiekt.supabase.co/functions/v1/stablecoin-create \
  -H "x-api-key: test-api-key-123" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Corretora A",
    "symbol": "STABLE-A",
    "client_wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "webhook": "https://webhook.site/123456"
  }'
```
✓ Esperado: 201 com stablecoin_id

### Teste 2: API Key inválida
```bash
curl -X POST https://bzxdqkttnkxqaecaiekt.supabase.co/functions/v1/stablecoin-create \
  -H "x-api-key: wrong-key" \
  -H "Content-Type: application/json" \
  -d '{...}'
```
✓ Esperado: 401 Unauthorized

### Teste 3: Symbol duplicado
```bash
# Executar Teste 1 duas vezes com mesmo symbol
```
✓ Esperado: 201 na primeira, 409 na segunda

### Teste 4: Symbol inválido (muito longo)
```bash
curl -X POST https://bzxdqkttnkxqaecaiekt.supabase.co/functions/v1/stablecoin-create \
  -H "x-api-key: test-api-key-123" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Test",
    "symbol": "VERY-LONG-SYMBOL-NAME",
    "client_wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "webhook": "https://webhook.site/123"
  }'
```
✓ Esperado: 400 Validation error

### Teste 5: Wallet inválido
```bash
curl -X POST https://bzxdqkttnkxqaecaiekt.supabase.co/functions/v1/stablecoin-create \
  -H "x-api-key: test-api-key-123" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Test",
    "symbol": "TST",
    "client_wallet": "invalid-address",
    "webhook": "https://webhook.site/123"
  }'
```
✓ Esperado: 400 Validation error

## Verificar no Supabase Dashboard

Após cada teste bem-sucedido:

1. **SQL Editor** → Execute:
```sql
-- Ver stablecoins criadas
SELECT * FROM stablecoins ORDER BY created_at DESC;

-- Ver eventos
SELECT * FROM event_store WHERE event_type = 'stablecoin.registered';

-- Ver logs
SELECT * FROM logs WHERE context = 'stablecoin-create' ORDER BY timestamp DESC;
```

2. **Database Browser** → Selecione **stablecoins** table e veja a linha criada

## Timeline de Testes

```
Minuto 0:   Fazer deploy
Minuto 1:   Testar sucesso (Teste 1)
Minuto 2:   Testar API key inválida (Teste 2)
Minuto 3:   Testar symbol duplicado (Teste 3)
Minuto 4:   Testar validação (Testes 4 e 5)
Minuto 5:   Verificar logs e eventos no dashboard
Minuto 6:   ✓ Tudo funcionando!
```

## Próximo Passo

Após validar que a function funciona:

1. Criar `deposit-request` function
2. Integrar com Asaas para PIX
3. Continuar com webhook-deposit

---

**Status**: Pronto para testar 🚀
