# 🚀 Hello World Deploy - Validação de Supabase Integration

Este guia mostra como deployar a primeira Edge Function para validar que tudo está funcionando corretamente.

## ✅ Pré-requisitos

- [ ] Supabase CLI instalado: `supabase --version`
- [ ] Supabase project criado em https://supabase.com
- [ ] `.env` configurado com `SUPABASE_URL` e keys
- [ ] Projeto linkado: `supabase link --project-ref <seu-project-id>`

## 📝 Passo 1: Setup Supabase

```bash
# Link com seu projeto Supabase
supabase link --project-ref seu-project-id-aqui

# Verificar se está linkado
supabase status
```

## 🧪 Passo 2: Testar Localmente

```bash
# Inicie Supabase local
supabase start

# Em outro terminal, rode a Edge Function localmente
supabase functions serve

# Em outro terminal, teste a função
curl http://localhost:54321/functions/v1/hello-world
curl "http://localhost:54321/functions/v1/hello-world?name=Fountain"

# Você deve ver:
# {
#   "message": "Hello, Rayls! Welcome to Rayls",
#   "timestamp": "2024-11-18T...",
#   "environment": "development",
#   "version": "1.0.0",
#   "status": "ok"
# }
```

## 🌍 Passo 3: Deploy para Produção

```bash
# Deploy a função hello-world
supabase functions deploy hello-world

# Verificar se foi deployada
supabase functions list

# Você deve ver algo como:
# ✓ hello-world
#   Deployed: 2024-11-18T12:34:56.789Z
#   URL: https://seu-project.supabase.co/functions/v1/hello-world
```

## 🧪 Passo 4: Testar em Produção

```bash
# Obter a URL da função
supabase functions describe hello-world

# Testar com curl
curl https://seu-project.supabase.co/functions/v1/hello-world
curl "https://seu-project.supabase.co/functions/v1/hello-world?name=Fountain"

# Ou no navegador:
# https://seu-project.supabase.co/functions/v1/hello-world?name=Fountain
```

## 📊 Validar a Resposta

A resposta deve ser:

```json
{
  "message": "Hello, Fountain! Welcome to Rayls",
  "timestamp": "2024-11-18T13:40:00.000Z",
  "environment": "development",
  "version": "1.0.0",
  "status": "ok"
}
```

## ✅ Checklist de Validação

- [ ] `supabase status` mostra conexão ativa
- [ ] Função local responde em http://localhost:54321/functions/v1/hello-world
- [ ] `supabase functions deploy hello-world` completa sem erros
- [ ] `supabase functions list` mostra hello-world deployada
- [ ] Função remota responde em https://seu-project.supabase.co/functions/v1/hello-world
- [ ] Parâmetro `?name=X` funciona

## 🔍 Troubleshooting

### Erro: "Function not found"
```bash
# Verifique se o Supabase CLI está linkado
supabase link --project-ref seu-project-id

# Ou re-link
supabase unlink
supabase link --project-ref seu-project-id
```

### Erro: "Failed to deploy"
```bash
# Verifique a sintaxe Deno
deno check supabase/functions/hello-world/index.ts

# Ou force o re-deploy
supabase functions deploy hello-world --force
```

### Erro: CORS
Se você está testando de um navegador e recebe erro CORS:
- ✅ A função já tem `Access-Control-Allow-Origin: *`
- Verifique o método: use GET ou OPTIONS

### Erro: Timeout Local
```bash
# Se a função local demora, reinicie
supabase functions serve --no-verify-jwt
```

## 📚 Próximo Passo

Uma vez que o hello-world está deployado com sucesso:

1. **Seguir DEPLOYMENT_ROADMAP.md** para Phase 0 - Database Setup
2. **Começar Phase 1** - Asaas Webhook receiver
3. **Build incrementalmente** - Cada fase é um novo deploy

## 🎯 O Que Este Deploy Valida

- ✅ Supabase CLI está configurado
- ✅ Projeto Supabase está linkado
- ✅ Edge Functions funcionam localmente
- ✅ Deploy para produção funciona
- ✅ Função remota responde corretamente
- ✅ CORS está configurado
- ✅ Logs funcionam (ver no terminal `supabase functions serve`)

## 🚨 Importante

Este hello-world é apenas validação. Para Phase 1, você criará a Edge Function `webhooks-asaas` que receberá de verdade os webhooks da Asaas.

Ver **DEPLOYMENT_ROADMAP.md** para o roadmap completo.

---

**Estimado**: 15 minutos
**Dificuldade**: Muito Fácil ✅
**Crítico para**: Validar Supabase setup antes de começar Phase 0
