-- =============================================================================
-- Migration: hardening de RLS, grants e moderacao de avaliacoes
-- Projeto: M-ECOMMERCE / Passarim Suplementos
-- Segura e revisavel: nao apaga tabelas nem dados de negocio.
-- Aplique no SQL Editor do Supabase (staging primeiro) apos revisar.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) Impede que clientes alterem a coluna privilegiada `aprovado` em avaliacoes.
--    INSERT: auto-publica (comportamento atual da loja).
--    UPDATE: preserva o valor anterior para nao-admin (bloqueia re-aprovacao).
--    Admin: pode moderar livremente (precisa da policy abaixo).
-- -----------------------------------------------------------------------------
create or replace function public.protect_avaliacao_aprovado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.aprovado := true;
  elsif tg_op = 'UPDATE' then
    new.aprovado := old.aprovado;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_avaliacao_aprovado on public.avaliacoes;
create trigger protect_avaliacao_aprovado
before insert or update on public.avaliacoes
for each row execute function public.protect_avaliacao_aprovado();

revoke all on function public.protect_avaliacao_aprovado() from public, anon, authenticated;

drop policy if exists "avaliacoes_admin_all" on public.avaliacoes;
create policy "avaliacoes_admin_all" on public.avaliacoes for all
using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 2) get_valid_coupon: expoe apenas campos necessarios ao checkout.
--    Tipo composto (nao TABLE) para o RPC continuar retornando 1 objeto no cliente.
-- -----------------------------------------------------------------------------
do $$
begin
  create type public.coupon_public as (
    codigo text,
    tipo text,
    valor numeric,
    valor_minimo numeric,
    expira_em timestamptz,
    ativo boolean
  );
exception
  when duplicate_object then null;
end $$;

drop function if exists public.get_valid_coupon(text);

create function public.get_valid_coupon(p_codigo text)
returns public.coupon_public
language sql
stable
security definer
set search_path = public
as $$
  select
    c.codigo,
    c.tipo,
    c.valor,
    c.valor_minimo,
    c.expira_em,
    c.ativo
  from public.cupons c
  where c.codigo = upper(trim(p_codigo))
    and c.ativo
    and (c.expira_em is null or c.expira_em > now())
  limit 1;
$$;

revoke all on function public.get_valid_coupon(text) from public;
grant execute on function public.get_valid_coupon(text) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3) Reduz superficie de privilege: revoga DML amplo em tabelas sensiveis e
--    reconcede apenas o necessario. RLS continua sendo a barreira principal.
-- -----------------------------------------------------------------------------
revoke all on table public.password_reset_codes from anon, authenticated;
revoke all on table public.email_notificacoes from anon, authenticated;
revoke all on table public.user_email_notificacoes from anon, authenticated;

revoke insert, update, delete on table public.pedidos from authenticated;
revoke insert, update, delete on table public.itens_pedido from authenticated;
revoke insert, update, delete on table public.cupons from authenticated;
revoke insert, update, delete on table public.produtos from authenticated;
revoke insert, update, delete on table public.imagens_produtos from authenticated;
revoke insert, update, delete on table public.produto_sabores from authenticated;
revoke insert, update, delete on table public.site_settings from authenticated;
revoke insert, update, delete on table public.newsletter_inscricoes from authenticated;
revoke delete on table public.usuarios from authenticated;
revoke insert on table public.usuarios from authenticated;

-- Leitura autenticada (RLS restringe linhas)
grant select on table public.pedidos to authenticated;
grant select on table public.itens_pedido to authenticated;
grant select on table public.cupons to authenticated;
grant select on table public.produtos to authenticated;
grant select on table public.imagens_produtos to authenticated;
grant select on table public.produto_sabores to authenticated;
grant select on table public.site_settings to authenticated;
grant select, update on table public.usuarios to authenticated;

-- DML de cliente apenas onde ha policies de ownership / admin
grant select, insert, update, delete on table public.enderecos to authenticated;
grant select, insert, update, delete on table public.favoritos to authenticated;
grant select, insert, update on table public.avaliacoes to authenticated;

-- Admin precisa de DML nas tabelas de catalogo; policies `*_admin_*` usam is_admin().
-- Sem GRANT, mesmo admin autenticado via PostgREST falharia.
grant insert, update, delete on table public.produtos to authenticated;
grant insert, update, delete on table public.imagens_produtos to authenticated;
grant insert, update, delete on table public.produto_sabores to authenticated;
grant insert, update, delete on table public.cupons to authenticated;
grant insert, update on table public.site_settings to authenticated;
grant update on table public.pedidos to authenticated;
grant select on table public.newsletter_inscricoes to authenticated;

grant insert on table public.newsletter_inscricoes to anon, authenticated;

-- service_role mantem acesso total (bypass RLS)
grant all on all tables in schema public to service_role;

commit;

-- =============================================================================
-- NOTAS POS-APLICACAO
-- 1) Confirme no Security Advisor do Supabase se nao ha alertas novos.
-- 2) Teste: cliente atualiza avaliacao.aprovado (deve ser ignorado pelo trigger).
-- 3) Teste: admin cria produto / muda status de pedido (deve continuar funcionando).
-- 4) Teste: checkout com cupom via get_valid_coupon.
-- =============================================================================
