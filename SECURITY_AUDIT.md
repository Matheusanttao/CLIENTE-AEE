# Security Audit — M-ECOMMERCE (Passarim Suplementos)

**Data:** 2026-07-19  
**Escopo:** React 19 + Vite 8 + Supabase (Postgres/RLS) + APIs Vercel + Mercado Pago + Cloudinary + SuperFrete  
**Método:** mapeamento completo do repositório, revisão de schema/RLS, APIs, frontend, dependências e secrets; correções aplicadas no código e migration SQL; configurações externas documentadas como manuais.

---

## 1. Resumo executivo

O projeto já tinha uma base sólida para e-commerce: **RLS habilitado** nas tabelas públicas, **pedidos sem INSERT/UPDATE pelo cliente**, **preços recalculados no servidor** (`create_order_secure` + `/api/orders/create`), **webhooks do Mercado Pago com verificação de assinatura**, e **`service_role` restrito às APIs Vercel**.

Os principais riscos encontrados foram: **segredos no histórico Git / arquivo `Untitled` versionado**, **fallback de admin via `user_metadata`**, **cron aberto sem `CRON_SECRET`**, **rastreio de pedido com prefixo curto e sem rate limit**, **cliente podendo alterar `avaliacoes.aprovado`**, **GRANTs amplos em `authenticated`**, e **ausência de headers de segurança / CSP** no deploy.

As correções críticas e altas acessíveis no código foram **implementadas**. Resta **ação manual obrigatória**: aplicar a migration no Supabase, rotacionar chaves expostas no histórico, configurar `CRON_SECRET` e revisar Auth/CSP em produção após o deploy.

**Estado após esta auditoria:** melhorado de “alto risco operacional por secrets + alguns furos” para “arquitetura defensável”, desde que as ações manuais sejam concluídas.

---

## 2. Vulnerabilidades encontradas

### SEC-01 — Segredos reais no histórico Git (`.env`)

| Campo | Valor |
|--------|--------|
| **Severidade** | Crítica |
| **Arquivo / local** | Histórico Git (commits com `.env`; remoção posterior em `e85e8eb`) |
| **Descrição** | `.env` com `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_API_SECRET`, `MP_ACCESS_TOKEN`, `SUPERFRETE_TOKEN` e outros foi commitado no passado. |
| **Cenário** | Quem tiver acesso ao repositório/histórico extrai as chaves e opera no projeto como admin/serviço. |
| **Impacto** | Acesso total ao banco (bypass RLS), pagamentos, Cloudinary, frete. |
| **Correção aplicada** | `.env` já não está no working tree; `.gitignore` reforçado; `.env.example` criado só com placeholders. |
| **Ação manual** | **Revogar e rotacionar todas as chaves listadas na seção 6.** Considerar GitHub secret scanning / reescrever histórico apenas se o repositório foi público (com cuidado). |

### SEC-02 — Arquivo `Untitled` com URL + publishable key reais

| Campo | Valor |
|--------|--------|
| **Severidade** | Alta |
| **Arquivo** | `Untitled` (rastreado no Git) |
| **Descrição** | Continha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` reais do projeto. |
| **Cenário** | Leak de projeto Supabase + chave publishable (ainda sujeita a RLS, mas facilita abuso da API). |
| **Impacto** | Enumeração de endpoints públicos, abuso de quotas, fingerprint do projeto. |
| **Correção aplicada** | Arquivo removido do índice Git (`git rm`), entrada no `.gitignore`. |
| **Ação manual** | Rotacionar a publishable/anon key no Supabase Dashboard se o repo foi compartilhado. |

### SEC-03 — UI admin aceitava `user_metadata.role`

| Campo | Valor |
|--------|--------|
| **Severidade** | Alta |
| **Arquivo** | `src/contexts/AuthContext.tsx`, `src/pages/AdminLoginPage.tsx` |
| **Descrição** | Se a leitura de `usuarios.role` falhasse, usava `user_metadata.role` como fallback. |
| **Cenário** | Atacante com conta comum e metadata alterada (ou erro de query) via UI como admin. |
| **Impacto** | UX/admin route aberta; mutações ainda dependiam de RLS/`requireAdminUser`, mas a superfície aumenta. |
| **Correção aplicada** | Admin **somente** via `usuarios.role` no banco. Removido `role` do metadata no signup. |
| **Ação manual** | Nenhuma além de regressão de login admin. |

### SEC-04 — Cron keep-alive sem autenticação obrigatória

| Campo | Valor |
|--------|--------|
| **Severidade** | Alta |
| **Arquivo** | `api/cron/keep-alive.ts` |
| **Descrição** | Se `CRON_SECRET` não existisse, qualquer um podia chamar o endpoint (usa service role). |
| **Cenário** | Abuso de custos/quota no Supabase; confirmação de existência do backend. |
| **Impacto** | DoS econômico / keep-alive abusivo. |
| **Correção aplicada** | Fail-closed: sem `CRON_SECRET` → 503; Bearer obrigatório. |
| **Ação manual** | Definir `CRON_SECRET` na Vercel (a Cron Job envia o header automaticamente). |

### SEC-05 — Rastreio de pedido por prefixo sem rate limit

| Campo | Valor |
|--------|--------|
| **Severidade** | Média–Alta |
| **Arquivo** | `api/orders/_track.ts` |
| **Descrição** | Match por `startsWith` + carregava todos os pedidos do e-mail; sem rate limit. |
| **Cenário** | Enumeração com e-mail conhecido + prefixos curtos. |
| **Impacto** | Vazamento de status/total/rastreio de pedidos. |
| **Correção aplicada** | Rate limit 10/min/IP; mínimo 8 hex; filtro no banco; ambiguidade → 404; erros genéricos. |
| **Ação manual** | Nenhuma. |

### SEC-06 — Cliente podia controlar `avaliacoes.aprovado`

| Campo | Valor |
|--------|--------|
| **Severidade** | Média–Alta |
| **Arquivo / tabela** | `avaliacoes` + `src/services/reviews.ts` |
| **Descrição** | Upsert enviava `aprovado: true`; policy de UPDATE do owner não bloqueava a coluna. |
| **Cenário** | Após moderação admin (`aprovado=false`), o cliente reaprovava a própria avaliação. |
| **Impacto** | Bypass de moderação / reviews falsas publicadas. |
| **Correção aplicada** | Trigger `protect_avaliacao_aprovado`; policy admin; frontend não envia `aprovado`. |
| **Ação manual** | Aplicar `supabase/migrations/20260719_security_hardening.sql`. |

### SEC-07 — GRANT DML amplo para `authenticated`

| Campo | Valor |
|--------|--------|
| **Severidade** | Alta (footgun) |
| **Arquivo** | `supabase/schema_completo.sql` (antes) |
| **Descrição** | `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES` para `authenticated`, incluindo tabelas sensíveis. RLS era a única barreira. |
| **Cenário** | Qualquer política RLS permissiva futura abre a tabela inteira. |
| **Impacto** | Escalada acidental de privilégio. |
| **Correção aplicada** | Grants mínimos na migration + schema canônico atualizado. |
| **Ação manual** | Aplicar a migration. |

### SEC-08 — Sem headers de segurança no deploy

| Campo | Valor |
|--------|--------|
| **Severidade** | Média |
| **Arquivo** | `vercel.json` |
| **Descrição** | Sem CSP, HSTS, nosniff, frame-ancestors, etc. |
| **Correção aplicada** | Headers adicionados (CSP compatível com Supabase, MP, Cloudinary, fonts, Vercel Analytics). |
| **Ação manual** | Após deploy, validar checkout MP + imagens Cloudinary; ajustar CSP se algum domínio faltar. |

### SEC-09 — Source maps de produção + logs financeiros

| Campo | Valor |
|--------|--------|
| **Severidade** | Baixa–Média |
| **Arquivo** | `vite.config.ts`, `api/orders/_create.ts`, `src/services/orders.ts` |
| **Descrição** | Source maps expõem código; logs de checkout com totais/itens/cupom. |
| **Correção aplicada** | Sourcemap só em development; logs reduzidos a metadados. |
| **Ação manual** | Nenhuma. |

### SEC-10 — Dependências vulneráveis (`@vercel/node` / `undici` / etc.)

| Campo | Valor |
|--------|--------|
| **Severidade** | Média (toolchain) |
| **Arquivo** | `package-lock.json` / `vercel`, `@vercel/node` |
| **Descrição** | `npm audit --omit=dev`: ~10 vulns (undici/path-to-regexp/minimatch via Vercel tooling). Fix seguro completo exige `@vercel/node@4` (breaking). |
| **Correção aplicada** | `npm audit fix` seguro onde possível; **não** forçado breaking upgrade. |
| **Ação manual** | Planejar upgrade de `@vercel/node` / `vercel` em janela de teste. |

### Pontos já seguros (informativo)

| Item | Status |
|------|--------|
| Preços do carrinho no browser | **OK** — servidor recalcula |
| Cliente confirmar pagamento | **OK** — webhook/check com ownership |
| Role admin no signup | **OK** — trigger força `cliente` |
| Escalada de role via UPDATE | **OK** — `prevent_role_escalation` |
| `service_role` no frontend | **OK** — não encontrado em bundle |
| XSS (`dangerouslySetInnerHTML`) | **OK** — não encontrado |
| Storage Supabase | **N/A** — imagens no Cloudinary |
| Edge Functions | **N/A** — lógica em `api/` |

---

## 3. Alterações realizadas

| Arquivo | Mudança |
|---------|---------|
| `Untitled` | Removido do Git |
| `.gitignore` | `Untitled`, reforço `.env*`, `!.env.example` |
| `.env.example` | Criado (placeholders) |
| `src/contexts/AuthContext.tsx` | Sem fallback metadata para admin |
| `src/pages/AdminLoginPage.tsx` | Admin só via `usuarios.role` |
| `src/services/auth.ts` | Signup sem `role` no metadata |
| `src/services/reviews.ts` | Não envia `aprovado` |
| `src/services/orders.ts` | Logs sensíveis removidos |
| `src/schemas/index.ts` | Senha mínima 8 no cadastro |
| `src/layouts/AdminLayout.tsx` | Fix TS unused var (bloqueava build) |
| `api/cron/keep-alive.ts` | Auth obrigatória |
| `api/orders/_track.ts` | Rate limit + prefixo ≥8 + query segura |
| `api/orders/_create.ts` | Logs reduzidos |
| `vercel.json` | Security headers + CSP |
| `vite.config.ts` | Sem sourcemap em produção |
| `supabase/schema_completo.sql` | Hardening alinhado |
| `supabase/migrations/20260719_security_hardening.sql` | **Nova migration** |
| `tests/authorization-checklist.ts` | Plano de testes de autorização |
| `SECURITY_AUDIT.md` | Este relatório |

---

## 4. Migrations

### `supabase/migrations/20260719_security_hardening.sql`

Objetivo:

1. Trigger `protect_avaliacao_aprovado` — clientes não alteram moderação.
2. Policy `avaliacoes_admin_all` — admin pode moderar.
3. `get_valid_coupon` retorna só campos públicos do cupom (`coupon_public`).
4. Revoga grants perigosos em tabelas sensíveis; reconcede o mínimo para o app funcionar com RLS.

**Como aplicar:** SQL Editor do Supabase (staging → produção). Não executa DROP de tabelas/dados.

---

## 5. Configurações manuais

### Supabase Dashboard

1. Executar `supabase/migrations/20260719_security_hardening.sql`.
2. **Authentication → Providers:** manter e-mail; desabilitar signups públicos se não desejar (ou habilitar Confirm email).
3. **Authentication → URL Configuration:** Site URL = domínio produção; Redirect URLs **apenas** `https://seudominio.com.br/**` (sem curingas amplos).
4. **Authentication → Attack Protection:** habilitar CAPTCHA (hCaptcha/Turnstile) e rate limits.
5. **Authentication → Password:** mínima 8+ caracteres.
6. **Settings → API:** rotacionar `service_role` / secret e anon/publishable se houve leak.
7. **Security Advisor:** revisar e zerar alertas de RLS/funções.
8. Confirmar MFA para contas admin (via App / Auth MFA) quando disponível no plano.

### Supabase Storage

Não usado. Nenhuma ação. Uploads = Cloudinary assinado via `/api/cloudinary/sign` (admin).

### Vercel

1. Definir **todas** as env vars de `.env.example` (sem `VITE_` em secrets).
2. **Obrigatório:** `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `PASSWORD_RESET_SECRET`.
3. Redeploy após headers (`vercel.json`).
4. Validar: home, catálogo, checkout Pix/cartão, admin upload Cloudinary.
5. Se CSP bloquear algo, inspecionar console e liberar o domínio mínimo necessário.

### Cloudflare (se usado)

1. SSL/TLS Full (strict).
2. WAF: rate limit em `/api/auth/*`, `/api/orders/track`, `/api/shipping/calculate`.
3. Bot Fight / Turnstile no formulário de login/cadastro (complementar ao Supabase).

### Mercado Pago

1. Rotacionar `MP_ACCESS_TOKEN` se vazou no histórico.
2. Confirmar webhook URL HTTPS + secret `MP_WEBHOOK_SECRET`.
3. Preferir modo produção com chaves `APP_USR-...`.

### Cloudinary

1. Rotacionar `CLOUDINARY_API_SECRET` se vazou.
2. Restringir upload signed; desabilitar unsigned upload.

### SuperFrete / e-mail (Resend)

1. Rotacionar tokens se no histórico.
2. Configurar `SUPERFRETE_WEBHOOK_SECRET` ou `TOKEN`.
3. `EMAIL_FROM` com domínio verificado no Resend.

### DNS

1. HTTPS obrigatório no domínio.
2. SPF/DKIM/DMARC para e-mails transacionais.

---

## 6. Chaves para revogar

**Não listamos valores.** Revogue/rotacione se o histórico Git ou o arquivo `Untitled` foram expostos:

| Nome | Onde foi encontrado |
|------|---------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Histórico `.env` |
| `VITE_SUPABASE_ANON_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Histórico `.env` + `Untitled` |
| `MP_ACCESS_TOKEN` | Histórico `.env` |
| `CLOUDINARY_API_SECRET` (+ API key) | Histórico `.env` |
| `SUPERFRETE_TOKEN` | Histórico `.env` |
| Demais secrets do `.env` antigo | Histórico Git |

Após rotacionar, atualize **Vercel Environment Variables** e faça redeploy.

---

## 7. Testes realizados

| Comando | Resultado |
|---------|-----------|
| `npm run typecheck` | OK |
| `npm run build` | OK (produção, sem sourcemaps) |
| `npm run lint` | 10 erros pré-existentes em Admin (hooks `set-state-in-effect`) — não introduzidos por esta auditoria |
| `npm audit --omit=dev` | ~10 vulnerabilidades remanescentes no toolchain Vercel (`undici` etc.); upgrade breaking adiado |
| Busca `service_role` no frontend | Apenas nomes em docs/API server / `.env.example` |
| `tests/authorization-checklist.ts` | Plano criado; execução completa exige staging + migration aplicada |

---

## 8. Riscos restantes

1. **Chaves no histórico Git** — só resolvido com rotação (e opcionalmente purge de histórico).
2. **Rate limit in-memory** nas APIs — fraco sob múltiplas instâncias serverless; ideal Upstash Redis.
3. **Estoque não reservado na criação do pedido** — janela entre create e pagamento (oversell possível sob concorrência).
4. **Welcome email sem auth** (janela 10 min userId+email) — rate limited; preferível só autenticado a médio prazo.
5. **`admin_cancel_order` sem `is_admin()` interno** — mitigado por `EXECUTE` só `service_role` + API `requireAdminUser`.
6. **Frete na RPC** confia no valor passado — mitigado porque `/api/orders/create` re-cotiza na SuperFrete antes.
7. **CSP com `'unsafe-inline'`** em scripts — necessário para Vite/MP bricks; endurecer com nonces exige pipeline extra.
8. **Vulnerabilidades npm do Vercel CLI/Node** — aguardam upgrade major testado.
9. **MFA admin / CAPTCHA Auth** — dependem do painel Supabase.
10. **Lint errors pré-existentes** — não bloqueiam build atual (`tsc` + vite), mas devem ser limpos.

---

## 9. Checklist de produção

- [ ] Migration `20260719_security_hardening.sql` aplicada no projeto Supabase de produção
- [ ] Todas as chaves da seção 6 rotacionadas e atualizadas na Vercel
- [ ] `CRON_SECRET` definido; cron `/api/cron/keep-alive` responde 401 sem Bearer
- [ ] `MP_WEBHOOK_SECRET` e webhook HTTPS ativos
- [ ] `PASSWORD_RESET_SECRET` distinto da service role
- [ ] Redirect URLs do Auth restritas ao domínio real
- [ ] CAPTCHA / proteção de abuso habilitada no Auth
- [ ] Contas admin com senha forte (+ MFA se disponível)
- [ ] Deploy Vercel com novos headers; checkout Pix/cartão OK
- [ ] Upload de imagem no admin (Cloudinary) OK
- [ ] Rastreio de pedido com 8 caracteres do ID OK
- [ ] Cliente comum: `/admin` bloqueado; não altera produtos/preços/status
- [ ] Security Advisor do Supabase sem alertas críticos
- [ ] Backup / PITR do Supabase verificado
- [ ] Monitoramento de erros (Vercel logs) nas primeiras 24h pós-deploy

---

*Fim do relatório. Próximo passo crítico: aplicar a migration e rotacionar as chaves.*
