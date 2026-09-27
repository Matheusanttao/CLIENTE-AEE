alter table public.email_notificacoes
  drop constraint if exists email_notificacoes_tipo_check;

alter table public.email_notificacoes
  add constraint email_notificacoes_tipo_check
  check (tipo in ('pagamento_aprovado', 'codigo_rastreio', 'pedido_cancelado', 'novo_pedido_admin'));
