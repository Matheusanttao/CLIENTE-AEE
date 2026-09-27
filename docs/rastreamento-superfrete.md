# Rastreamento SuperFrete

## Configuracao

1. Execute `supabase/rastreamento_superfrete.sql` no SQL Editor do Supabase.
2. Adicione estas variaveis no `.env` local e nas variaveis da Vercel:

```env
APP_URL=https://seu-dominio.com.br
SUPERFRETE_WEBHOOK_TOKEN=gere-uma-chave-longa-e-aleatoria
```

`SUPERFRETE_TOKEN`, `SUPERFRETE_ENV` e `SUPERFRETE_USER_AGENT` continuam sendo usados pela
integracao existente.

3. Faca um novo deploy.
4. Entre no painel administrativo, abra **Pedidos** e clique em **Ativar rastreamento** uma vez.

Depois disso, os eventos de etiqueta gerada, postagem e entrega enviados pela SuperFrete
atualizam automaticamente o pedido e exibem o codigo/link de rastreio para o cliente.

Opcionalmente, `SUPERFRETE_WEBHOOK_SECRET` pode receber o `secret_token` fornecido pela
SuperFrete para validar tambem a assinatura HMAC `X-ME-Signature`.
