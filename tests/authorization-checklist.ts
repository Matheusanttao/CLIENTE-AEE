/**
 * Testes manuais / checklist de autorizacao (staging).
 * Nao atacar producao. Use contas de teste e o SQL Editor / REST do Supabase staging.
 *
 * Como executar verificacoes automatizaveis locais:
 *   npm run typecheck
 *   npm run lint
 *   npm run build
 *   npm audit --omit=dev
 *
 * Cenarios que dependem do banco devem ser validados apos aplicar:
 *   supabase/migrations/20260719_security_hardening.sql
 */

export const authorizationTestPlan = [
  {
    id: 'anon-private',
    title: 'Anonimo nao le pedidos/enderecos/usuarios de terceiros',
    steps: [
      'Com a anon key, GET /rest/v1/pedidos',
      'Esperado: [] ou 401/RLS deny (sem linhas)',
    ],
  },
  {
    id: 'idor-orders',
    title: 'Cliente A nao ve pedidos do Cliente B',
    steps: [
      'Autenticar como A, SELECT pedidos',
      'Tentar .eq(usuario_id, id_de_B)',
      'Esperado: nenhuma linha',
    ],
  },
  {
    id: 'idor-addresses',
    title: 'Cliente A nao altera endereco de B',
    steps: [
      'UPDATE enderecos WHERE id = endereco_de_B',
      'Esperado: 0 rows / erro RLS',
    ],
  },
  {
    id: 'no-admin-escalation',
    title: 'Cliente nao vira admin',
    steps: [
      'UPDATE usuarios SET role = admin WHERE id = self',
      'Esperado: role permanece cliente (trigger prevent_role_escalation)',
    ],
  },
  {
    id: 'no-price-write',
    title: 'Cliente nao altera preco de produto',
    steps: [
      'UPDATE produtos SET preco = 0.01',
      'Esperado: RLS deny (sem is_admin)',
    ],
  },
  {
    id: 'no-payment-status',
    title: 'Cliente nao marca pedido como pago',
    steps: [
      'UPDATE pedidos SET status = aprovado WHERE id = proprio_pedido',
      'Esperado: RLS deny (sem policy de update para owner)',
    ],
  },
  {
    id: 'no-self-approve-review',
    title: 'Cliente nao reaprova avaliacao rejeitada',
    steps: [
      'Como admin: UPDATE avaliacoes SET aprovado = false',
      'Como cliente: UPDATE avaliacoes SET aprovado = true',
      'Esperado: aprovado permanece false (trigger protect_avaliacao_aprovado)',
    ],
  },
  {
    id: 'order-create-server-prices',
    title: 'Checkout ignora precos do browser',
    steps: [
      'POST /api/orders/create com items só productId/qty',
      'Manipular expectedTotal para valor menor',
      'Se servidor calculou maior: 409. Nunca gravar preco enviado pelo client.',
    ],
  },
  {
    id: 'track-rate-limit',
    title: 'Rastreio exige prefixo e rate limit',
    steps: [
      'POST /api/orders/track com orderId de 3 chars → 400',
      'Mais de 10 tentativas/min no mesmo IP → 429',
    ],
  },
  {
    id: 'cron-auth',
    title: 'Cron exige CRON_SECRET',
    steps: [
      'GET /api/cron/keep-alive sem Authorization → 401 ou 503',
      'Com Bearer correto → 200',
    ],
  },
  {
    id: 'mp-webhook-sig',
    title: 'Webhook MP rejeita assinatura invalida',
    steps: [
      'POST /api/mp/webhook sem x-signature valida → 401',
    ],
  },
] as const
