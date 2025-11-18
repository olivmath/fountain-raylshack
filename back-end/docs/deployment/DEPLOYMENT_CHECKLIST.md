# Checklist de Deploy - Stablecoin Gateway Event-Driven

## ✅ Antes de Deploy em Produção

### 1. Smart Contract

- [ ] Solidity contracts compilados (StablecoinFactory.sol + ClientStablecoin.sol)
- [ ] Deploy em rede de teste (Sepolia/Goerli)
- [ ] Factory contract address conhecido
- [ ] Owner wallet com saldo para gas
- [ ] Owner private key seguro (Supabase secrets)
- [ ] ABI atualizado em blockchain-client.ts
- [ ] Testes de deploy e mint em testnet

### 2. Ambiente Supabase

- [ ] Projeto Supabase criado
- [ ] URL do projeto configurada
- [ ] Service Role Key obtida
- [ ] Anon Key obtida
- [ ] .env.local com credenciais

### 3. Banco de Dados

- [ ] Migration 20251118201252_remote_schema.sql criada ✓
- [ ] Migrations executadas (`supabase migration up`)
- [ ] Tables criadas: api_keys, stablecoins, operations, event_store, logs ✓
- [ ] Indexes criados ✓
- [ ] Triggers criados ✓
- [ ] Row Level Security configurado (se necessário)
- [ ] Backups configurados

### 4. Variáveis de Ambiente

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_ANON_KEY=eyJhbGc...

BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/...
FACTORY_CONTRACT_ADDRESS=0x...
OWNER_ADDRESS=0x...
OWNER_PRIVATE_KEY=0x...
CHAIN_ID=11155111

ASAAS_API_KEY=...
ASAAS_WEBHOOK_KEY=...

DENO_DIR=~/.deno
```

### 5. Edge Functions

- [ ] stablecoin-create ✓
- [ ] deposit-request ✓
- [ ] webhook-deposit ✓
- [ ] withdraw ✓
- [ ] webhook-withdraw ✓
- [ ] Todos os imports em deno.json ✓
- [ ] Sem erros TypeScript

### 6. Shared Libraries

- [ ] types.ts ✓
- [ ] supabase-client.ts ✓
- [ ] auth.ts ✓
- [ ] logger.ts ✓
- [ ] event-publisher.ts ✓
- [ ] error-handler.ts ✓
- [ ] asaas-client.ts ✓
- [ ] blockchain-client.ts ✓
- [ ] blockchain-minter.ts ✓
- [ ] client-notifier.ts ✓

### 7. Autenticação

- [ ] API Key de teste gerada (SHA256)
- [ ] API Key inserida em `api_keys` table
- [ ] API Key marcada como `is_active=true`
- [ ] Cliente de teste verificado

### 8. Asaas Integration

- [ ] Conta Asaas criada e verificada
- [ ] API Key obtida
- [ ] Webhook Key obtida
- [ ] Teste de PIX QRCode generation
- [ ] Teste de signature validation
- [ ] Webhook URL configurada em Asaas dashboard

### 9. Testes Locais

- [ ] Supabase local iniciado: `supabase start`
- [ ] Edge Functions servindo: `supabase functions serve`
- [ ] POST /stablecoin/create testado
- [ ] POST /stablecoin/{symbol}/deposit testado
- [ ] POST /webhook/deposit testado (simulado)
- [ ] POST /withdraw testado
- [ ] POST /webhook/withdraw testado (simulado)
- [ ] Fluxo completo end-to-end testado
- [ ] Logs verificados no banco
- [ ] Event store verificado

### 10. Segurança

- [ ] Sem hard-coded secrets nos arquivos
- [ ] Private keys apenas em env vars
- [ ] API keys hash com SHA256
- [ ] HMAC signature validation implementado
- [ ] Validação de schema Zod em todos os endpoints
- [ ] Error messages não expõem internals
- [ ] CORS configurado (se necessário)

### 11. Documentação

- [ ] EVENT_DRIVEN_IMPLEMENTATION.md criado ✓
- [ ] ARCHITECTURE_SUMMARY.md criado ✓
- [ ] DEPLOYMENT_CHECKLIST.md criado ✓
- [ ] Exemplos de curl documentados
- [ ] Troubleshooting guide criado

### 12. Monitoramento

- [ ] Logs estruturados funcionando
- [ ] Event store sendo populado
- [ ] Queries de debugging preparadas
- [ ] Alertas configurados (opcional)
- [ ] Backup automático ativo

## 🚀 Deploy em Produção

### Passo 1: Configurar Supabase

```bash
# Link para projeto de produção
supabase link --project-ref your-project-ref

# Verificar conexão
supabase status

# Executar migrations
supabase migration up
```

### Passo 2: Deploy das Edge Functions

```bash
# Deploy individual
supabase functions deploy stablecoin-create
supabase functions deploy deposit-request
supabase functions deploy webhook-deposit
supabase functions deploy withdraw
supabase functions deploy webhook-withdraw

# Ou todos de uma vez
for func in stablecoin-create deposit-request webhook-deposit withdraw webhook-withdraw; do
  supabase functions deploy $func
done

# Verificar deployment
supabase functions list
```

### Passo 3: Configurar Variáveis no Dashboard Supabase

Via dashboard ou CLI:
```bash
supabase secrets set BLOCKCHAIN_RPC_URL=https://...
supabase secrets set FACTORY_CONTRACT_ADDRESS=0x...
supabase secrets set OWNER_ADDRESS=0x...
supabase secrets set OWNER_PRIVATE_KEY=0x...
supabase secrets set ASAAS_API_KEY=...
supabase secrets set ASAAS_WEBHOOK_KEY=...
```

### Passo 4: Criar Dados de Teste

```sql
-- Via SQL Editor do Supabase
INSERT INTO api_keys (client_id, client_name, api_key_hash, is_active)
VALUES (
  'prod-client-01',
  'Production Client',
  '...',  -- SHA256 hash da API key
  true
);
```

### Passo 5: Testar Endpoints em Produção

```bash
# Substituir FUNCTION_URL pela URL de produção
FUNCTION_URL="https://xxx.supabase.co/functions/v1"
API_KEY="sua-api-key-aqui"

# Test 1: Create stablecoin
curl -X POST $FUNCTION_URL/stablecoin-create \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Test Prod",
    "symbol": "TST-PROD",
    "client_wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "webhook": "https://webhook.site/xxx"
  }'

# Guardar stablecoin_id e symbol da resposta
# Test 2: Request deposit
curl -X POST $FUNCTION_URL/stablecoin/TST-PROD/deposit \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'

# Guardar operation_id da resposta
# Test 3: Check database
# Via Supabase dashboard, verificar:
# - stablecoins table preenchida
# - operations table com operation_id
# - event_store com eventos
# - logs com registros
```

### Passo 6: Configurar Webhooks no Asaas

1. Acessar dashboard Asaas
2. Configurar webhook URL para payments:
   ```
   https://xxx.supabase.co/functions/v1/webhook-deposit
   ```
3. Configurar webhook URL para transfers:
   ```
   https://xxx.supabase.co/functions/v1/webhook-withdraw
   ```
4. Copiar webhook key para variável de ambiente `ASAAS_WEBHOOK_KEY`

## 🔍 Validação Pós-Deploy

### Checklist de Funcionalidade

- [ ] `/stablecoin/create` retorna 201
- [ ] `/stablecoin/{symbol}/deposit` retorna 201 com QRCode
- [ ] `/webhook/deposit` processa webhook corretamente
- [ ] `/withdraw` retorna 200 com burn_tx_hash
- [ ] `/webhook/withdraw` processa webhook corretamente
- [ ] BD atualiza status corretamente
- [ ] Event store registra eventos
- [ ] Logs são salvos
- [ ] Cliente recebe webhooks de notificação

### Checklist de Segurança

- [ ] API key validation funcionando
- [ ] HMAC signature validation funcionando
- [ ] Ownership validation funcionando
- [ ] Erros não expõem internals
- [ ] Private keys não aparecem em logs
- [ ] CORS está configurado corretamente

### Checklist de Performance

- [ ] Requests respondendo em < 5s (sem blockchain)
- [ ] Blockchain operations respondendo em < 30s
- [ ] Logs não causando lentidão
- [ ] Database queries são eficientes

### Checklist de Observabilidade

- [ ] Logs estão sendo salvos em tempo real
- [ ] Event store está sendo populado
- [ ] Operações podem ser rastreadas por ID
- [ ] Erros estão sendo logados com stack trace

## 🚨 Rollback Plan

Se algo der errado:

### Rollback de Functions

```bash
# Desabilitar function específica (via dashboard)
# Ou redeploy de versão anterior
supabase functions deploy stablecoin-create --exclude-dir=.

# Revert migrations
supabase migration list
supabase db pull  # Recuperar schema anterior
```

### Rollback de Database

```bash
# Via backups do Supabase
# Dashboard → Database → Backups → Restore
```

### Comunicação

- [ ] Notificar clientes de falha
- [ ] Documentar causa raiz em issue
- [ ] Post-mortem meeting
- [ ] Implementar fix
- [ ] Redeploy com novos testes

## 📞 Contatos de Suporte

- **Supabase Support**: https://supabase.com/support
- **Asaas Support**: https://docs.asaas.com/
- **Deno Docs**: https://deno.land/manual
- **Viem Docs**: https://viem.sh/

## 🎉 Conclusão

Quando todos os itens estiverem checkados ✓, o sistema está pronto para:

1. ✅ Aceitar requests de clientes
2. ✅ Processar depósitos PIX
3. ✅ Fazer deploy de stablecoins on-chain
4. ✅ Processar saques
5. ✅ Notificar clientes
6. ✅ Manter audit trail completo
7. ✅ Ser debugado via logs e eventos

**Data de Deploy Planejada**: _______________
**Responsável**: _______________
**Aprovador**: _______________

---

**Última revisão**: Novembro 2025
