# Checklist essencial para lancamento

## Acoes manuais obrigatorias

1. **Criar o banco no Supabase (do zero)**
   - Abra o SQL Editor do Supabase
   - Cole e execute o arquivo unico: `supabase/schema.sql`
   - Ele cria tabelas, RLS, funcoes, sabores e dados iniciais (produtos/cupons)

2. **Rotacionar secrets** (se `.env` ja foi commitado)
   - Supabase service role, Mercado Pago, Cloudinary, SuperFrete.

3. **Configurar variaveis na Vercel**
   - `APP_URL` = dominio de producao
   - `MP_WEBHOOK_SECRET` = secret do webhook no painel Mercado Pago
   - Demais vars do `.env.example`

4. **Configurar webhook Mercado Pago**
   - URL: `https://seu-dominio.com.br/api/mp/webhook`
   - Eventos de pagamento

5. **Configurar keep-alive do Supabase (plano gratuito)**
   - O `vercel.json` ja inclui um Cron Job diario em `/api/cron/keep-alive`
   - Na Vercel, crie a variavel `CRON_SECRET` com um token aleatorio longo
   - A Vercel chama essa rota 1x por dia e consulta o banco para evitar pausa por inatividade
   - Apos o deploy, teste manualmente: `GET https://seu-dominio.com.br/api/cron/keep-alive` com header `Authorization: Bearer SEU_CRON_SECRET`

6. **Promover admin manualmente**
   - No Supabase: `UPDATE usuarios SET role = 'admin' WHERE email = 'seu@email.com';`

## O que foi implementado

- RLS: signup sempre `cliente`, bloqueio de escalada de role
- Estoque: validacao no carrinho/checkout, decremento no webhook MP
- Sabores por produto com estoque independente
- APIs protegidas: create-preference (auth), cloudinary/sign (admin), webhook (assinatura)
- Carrinho limpo apenas apos pagamento aprovado
- Revalidacao de cupom, preco e total no pedido
- Admin de pedidos com status e endereco
- Paginas legais: `/privacidade`, `/termos`, `/trocas-devolucoes`
- `.env` adicionado ao `.gitignore`
