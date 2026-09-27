-- =============================================================================
-- PASSARIN SUPLEMENTOS - schema completo para um projeto Supabase novo
-- Execute este arquivo inteiro uma unica vez no SQL Editor.
-- Nao execute as migrations antigas depois deste arquivo.
-- =============================================================================

create extension if not exists "pgcrypto";

do $$ begin
  create type public.order_status as enum (
    'pendente', 'aprovado', 'preparando', 'recusado',
    'cancelado', 'enviado', 'entregue'
  );
exception when duplicate_object then null;
end $$;

-- Compatibilidade caso o projeto ainda tenha o enum antigo sem "preparando".
-- Se esta linha adicionar o valor, execute-a isoladamente e depois rode o arquivo
-- completo, pois o PostgreSQL exige commit antes de usar um novo valor de enum.
alter type public.order_status add value if not exists 'preparando' after 'aprovado';

do $$ begin
  create type public.user_role as enum ('cliente', 'admin');
exception when duplicate_object then null;
end $$;

create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null check (length(trim(nome)) >= 2),
  email text not null unique,
  telefone text,
  cpf text check (cpf is null or cpf ~ '^[0-9]{11}$'),
  role public.user_role not null default 'cliente',
  criado_em timestamptz not null default now()
);

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  descricao text not null,
  categoria text not null,
  marca text not null,
  preco numeric(10,2) not null check (preco > 0),
  preco_promocional numeric(10,2)
    check (preco_promocional is null or (preco_promocional > 0 and preco_promocional <= preco)),
  estoque integer not null default 0 check (estoque >= 0),
  peso_kg numeric(10,3) not null default 0.300 check (peso_kg > 0),
  altura_cm numeric(10,2) not null default 10 check (altura_cm > 0),
  largura_cm numeric(10,2) not null default 15 check (largura_cm > 0),
  comprimento_cm numeric(10,2) not null default 20 check (comprimento_cm > 0),
  destaque boolean not null default false,
  ativo boolean not null default true,
  avaliacao_media numeric(3,2) not null default 0 check (avaliacao_media between 0 and 5),
  total_avaliacoes integer not null default 0 check (total_avaliacoes >= 0),
  criado_em timestamptz not null default now()
);

create table if not exists public.imagens_produtos (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  url text not null,
  alt text,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);

create table if not exists public.produto_sabores (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  nome text not null,
  estoque integer not null default 0 check (estoque >= 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (produto_id, nome),
  unique (id, produto_id)
);

create table if not exists public.enderecos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  nome_destinatario text not null,
  cep text not null check (cep ~ '^[0-9]{8}$'),
  rua text not null,
  numero text not null,
  complemento text,
  bairro text not null,
  cidade text not null,
  estado char(2) not null check (estado = upper(estado)),
  principal boolean not null default false,
  criado_em timestamptz not null default now()
);

create table if not exists public.cupons (
  codigo text primary key check (codigo = upper(codigo)),
  tipo text not null check (tipo in ('percentual', 'fixo')),
  valor numeric(10,2) not null
    check (valor > 0 and (tipo <> 'percentual' or valor <= 100)),
  ativo boolean not null default true,
  valor_minimo numeric(10,2) not null default 0 check (valor_minimo >= 0),
  expira_em timestamptz,
  criado_em timestamptz not null default now()
);

create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete restrict,
  endereco_id uuid references public.enderecos(id) on delete set null,
  endereco_snapshot jsonb not null,
  status public.order_status not null default 'pendente',
  subtotal numeric(10,2) not null check (subtotal >= 0),
  desconto numeric(10,2) not null default 0 check (desconto >= 0),
  desconto_pix numeric(10,2) not null default 0 check (desconto_pix >= 0),
  metodo_pagamento text not null check (metodo_pagamento in ('pix', 'cartao')),
  frete numeric(10,2) not null default 0 check (frete >= 0),
  frete_servico text,
  frete_transportadora text,
  frete_prazo_dias integer check (frete_prazo_dias is null or frete_prazo_dias >= 0),
  frete_cep text check (frete_cep is null or frete_cep ~ '^[0-9]{8}$'),
  frete_service_id text,
  total numeric(10,2) not null check (total >= 0),
  cupom_codigo text references public.cupons(codigo),
  mp_preference_id text,
  mp_payment_id text,
  superfrete_cart_id text,
  superfrete_status text,
  codigo_rastreio text,
  url_rastreio text,
  etiqueta_gerada_em timestamptz,
  postado_em timestamptz,
  entregue_em timestamptz,
  estoque_restaurado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (desconto + desconto_pix <= subtotal),
  check (total = round(subtotal - desconto - desconto_pix + frete, 2))
);

create table if not exists public.itens_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(10,2) not null check (preco_unitario > 0),
  sabor_id uuid,
  sabor_nome text,
  foreign key (sabor_id, produto_id)
    references public.produto_sabores(id, produto_id) on delete restrict
);

create table if not exists public.email_notificacoes (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  tipo text not null check (tipo in ('pedido_recebido', 'pagamento_aprovado', 'codigo_rastreio', 'pedido_cancelado', 'novo_pedido_admin')),
  destinatario text not null check (position('@' in destinatario) > 1),
  resend_id text,
  enviado_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (pedido_id, tipo)
);

create table if not exists public.user_email_notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  tipo text not null check (tipo in ('boas_vindas')),
  destinatario text not null check (position('@' in destinatario) > 1),
  resend_id text,
  enviado_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (usuario_id, tipo)
);

create table if not exists public.password_reset_codes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  email text not null,
  codigo_hash text not null,
  tentativas integer not null default 0 check (tentativas between 0 and 5),
  expira_em timestamptz not null,
  usado_em timestamptz,
  criado_em timestamptz not null default now()
);

create table if not exists public.favoritos (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (usuario_id, produto_id)
);

create table if not exists public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  nota integer not null check (nota between 1 and 5),
  comentario text,
  aprovado boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (usuario_id, produto_id)
);

create table if not exists public.newsletter_inscricoes (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (position('@' in email) > 1),
  criado_em timestamptz not null default now()
);

create table if not exists public.site_settings (
  id integer primary key check (id = 1),
  config jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

insert into public.site_settings (id, config)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

comment on column public.usuarios.cpf is
  'CPF do usuario, somente 11 digitos. Necessario para etiquetas de frete.';

create index if not exists idx_produtos_categoria on public.produtos(categoria);
create index if not exists idx_produtos_marca on public.produtos(marca);
create index if not exists idx_produtos_preco on public.produtos(preco);
create index if not exists idx_produtos_ativo on public.produtos(ativo);
create index if not exists idx_produtos_busca
  on public.produtos using gin (to_tsvector('portuguese', nome || ' ' || descricao));
create index if not exists idx_imagens_produtos_produto on public.imagens_produtos(produto_id);
create index if not exists idx_produto_sabores_produto on public.produto_sabores(produto_id);
create index if not exists idx_enderecos_usuario on public.enderecos(usuario_id);
create unique index if not exists idx_enderecos_um_principal
  on public.enderecos(usuario_id) where principal;
create index if not exists idx_pedidos_usuario_status on public.pedidos(usuario_id, status);
create index if not exists idx_pedidos_status_criado on public.pedidos(status, criado_em desc);
create index if not exists idx_pedidos_superfrete_cart
  on public.pedidos(superfrete_cart_id) where superfrete_cart_id is not null;
create index if not exists idx_itens_pedido_pedido on public.itens_pedido(pedido_id);
create index if not exists idx_itens_pedido_produto on public.itens_pedido(produto_id);
create index if not exists idx_password_reset_codes_user
  on public.password_reset_codes(usuario_id, criado_em desc);
create index if not exists idx_favoritos_produto on public.favoritos(produto_id);
create index if not exists idx_avaliacoes_produto on public.avaliacoes(produto_id, aprovado);

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email, cpf, role)
  values (
    new.id,
    case
      when length(trim(coalesce(new.raw_user_meta_data->>'nome', ''))) >= 2
        then trim(new.raw_user_meta_data->>'nome')
      when length(split_part(new.email, '@', 1)) >= 2
        then split_part(new.email, '@', 1)
      else 'Cliente'
    end,
    new.email,
    case
      when regexp_replace(coalesce(new.raw_user_meta_data->>'cpf', ''), '\D', '', 'g') ~ '^[0-9]{11}$'
        then regexp_replace(new.raw_user_meta_data->>'cpf', '\D', '', 'g')
      else null
    end,
    'cliente'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
    and new.role is distinct from old.role
    and not public.is_admin()
  then
    new.role := old.role;
  end if;
  return new;
end;
$$;

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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create or replace function public.ensure_single_primary_address()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.principal then
    update public.enderecos
    set principal = false
    where usuario_id = new.usuario_id and id is distinct from new.id and principal;
  end if;
  return new;
end;
$$;

create or replace function public.decrement_product_stock(p_product_id uuid, p_qty integer)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'Quantidade deve ser positiva';
  end if;
  update public.produtos set estoque = estoque - p_qty
  where id = p_product_id and ativo and estoque >= p_qty;
  if not found then
    raise exception 'Produto inexistente, inativo ou com estoque insuficiente';
  end if;
end;
$$;

create or replace function public.restore_product_stock(p_product_id uuid, p_qty integer)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'Quantidade deve ser positiva';
  end if;
  update public.produtos set estoque = estoque + p_qty where id = p_product_id;
  if not found then raise exception 'Produto inexistente'; end if;
end;
$$;

create or replace function public.decrement_flavor_stock(p_flavor_id uuid, p_qty integer)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'Quantidade deve ser positiva';
  end if;
  update public.produto_sabores set estoque = estoque - p_qty
  where id = p_flavor_id and ativo and estoque >= p_qty;
  if not found then
    raise exception 'Sabor inexistente, inativo ou com estoque insuficiente';
  end if;
end;
$$;

create or replace function public.restore_flavor_stock(p_flavor_id uuid, p_qty integer)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'Quantidade deve ser positiva';
  end if;
  update public.produto_sabores set estoque = estoque + p_qty where id = p_flavor_id;
  if not found then raise exception 'Sabor inexistente'; end if;
end;
$$;

create or replace function public.sync_product_stock_from_flavors()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  target_product_id uuid := coalesce(new.produto_id, old.produto_id);
begin
  update public.produtos
  set estoque = (
    select coalesce(sum(estoque), 0)
    from public.produto_sabores
    where produto_id = target_product_id and ativo
  )
  where id = target_product_id;
  return coalesce(new, old);
end;
$$;

create or replace function public.sync_product_rating()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  target_product_id uuid := coalesce(new.produto_id, old.produto_id);
begin
  update public.produtos
  set avaliacao_media = coalesce((
        select round(avg(nota)::numeric, 2)
        from public.avaliacoes
        where produto_id = target_product_id and aprovado
      ), 0),
      total_avaliacoes = (
        select count(*) from public.avaliacoes
        where produto_id = target_product_id and aprovado
      )
  where id = target_product_id;
  return coalesce(new, old);
end;
$$;

create or replace function public.user_purchased_product(p_produto_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.itens_pedido i
    join public.pedidos p on p.id = i.pedido_id
    where i.produto_id = p_produto_id
      and p.usuario_id = auth.uid()
      and p.status in ('aprovado', 'preparando', 'enviado', 'entregue')
  );
$$;

create or replace function public.produtos_mais_vendidos(p_limite integer default 8)
returns table (produto_id uuid, total_vendido bigint)
language sql stable security definer
set search_path = public
as $$
  select i.produto_id, sum(i.quantidade)::bigint
  from public.itens_pedido i
  join public.pedidos p on p.id = i.pedido_id
  join public.produtos produto on produto.id = i.produto_id
  where p.status in ('aprovado', 'preparando', 'enviado', 'entregue')
    and produto.ativo
  group by i.produto_id
  order by sum(i.quantidade) desc, max(p.criado_em) desc
  limit least(greatest(coalesce(p_limite, 8), 1), 50);
$$;

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

create or replace function public.get_valid_coupon(p_codigo text)
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

create or replace function public.create_order_secure(
  p_user_id uuid,
  p_address_id uuid,
  p_items jsonb,
  p_payment_method text,
  p_coupon_code text,
  p_shipping numeric,
  p_shipping_service text,
  p_shipping_carrier text,
  p_shipping_days integer,
  p_shipping_cep text,
  p_shipping_service_id text,
  p_expected_total numeric,
  p_cpf text default null
)
returns public.pedidos
language plpgsql security definer
set search_path = public
as $$
declare
  v_order public.pedidos;
  v_address public.enderecos;
  v_item jsonb;
  v_product public.produtos;
  v_flavor public.produto_sabores;
  v_qty integer;
  v_flavor_id uuid;
  v_price numeric(10,2);
  v_subtotal numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_pix_discount numeric(10,2) := 0;
  v_total numeric(10,2);
  v_coupon public.cupons;
  v_config jsonb;
  v_shipping numeric(10,2);
  v_coupon_code text;
  v_cpf text;
begin
  if p_user_id is null or not exists (select 1 from public.usuarios where id = p_user_id) then
    raise exception 'Usuario invalido';
  end if;
  if p_payment_method not in ('pix', 'cartao') then
    raise exception 'Metodo de pagamento invalido';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 50 then
    raise exception 'Carrinho invalido';
  end if;
  if p_shipping is null or p_shipping < 0 then
    raise exception 'Frete invalido';
  end if;

  select * into v_address from public.enderecos
  where id = p_address_id and usuario_id = p_user_id;
  if not found then raise exception 'Endereco invalido'; end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    begin
      v_qty := (v_item->>'quantidade')::integer;
    exception when others then
      raise exception 'Quantidade invalida';
    end;
    if v_qty <= 0 or v_qty > 1000 then raise exception 'Quantidade invalida'; end if;

    select * into v_product from public.produtos
    where id = (v_item->>'produto_id')::uuid and ativo
    for update;
    if not found then raise exception 'Produto indisponivel'; end if;

    v_flavor_id := nullif(v_item->>'sabor_id', '')::uuid;
    if v_flavor_id is not null then
      select * into v_flavor from public.produto_sabores
      where id = v_flavor_id and produto_id = v_product.id and ativo
      for update;
      if not found or v_flavor.estoque < v_qty then
        raise exception 'Sabor indisponivel ou sem estoque';
      end if;
    else
      if exists (
        select 1 from public.produto_sabores
        where produto_id = v_product.id and ativo
      ) then
        raise exception 'Selecione um sabor para o produto';
      end if;
      if v_product.estoque < v_qty then raise exception 'Produto sem estoque'; end if;
    end if;

    v_price := coalesce(v_product.preco_promocional, v_product.preco);
    v_subtotal := v_subtotal + round(v_price * v_qty, 2);
  end loop;

  v_coupon_code := nullif(upper(trim(coalesce(p_coupon_code, ''))), '');
  if v_coupon_code is not null then
    select * into v_coupon from public.cupons
    where codigo = v_coupon_code and ativo
      and (expira_em is null or expira_em > now())
      and v_subtotal >= valor_minimo;
    if not found then raise exception 'Cupom invalido ou expirado'; end if;
    v_discount := case
      when v_coupon.tipo = 'percentual' then round(v_subtotal * v_coupon.valor / 100, 2)
      else least(v_coupon.valor, v_subtotal)
    end;
  end if;

  select config into v_config from public.site_settings where id = 1;
  v_shipping := round(p_shipping, 2);
  if coalesce((v_config->>'free_shipping_enabled')::boolean, true)
    and v_subtotal >= coalesce((v_config->>'free_shipping_threshold')::numeric, 199)
  then
    v_shipping := 0;
  end if;
  if p_payment_method = 'pix'
    and coalesce((v_config->>'pix_discount_enabled')::boolean, true)
  then
    v_pix_discount := round(
      (v_subtotal - v_discount)
      * least(greatest(coalesce((v_config->>'pix_discount_percent')::numeric, 10), 0), 100) / 100,
      2
    );
  end if;
  v_total := round(v_subtotal - v_discount - v_pix_discount + v_shipping, 2);
  if p_expected_total is null or abs(v_total - round(p_expected_total, 2)) > 0.01 then
    raise exception 'Total atualizado. Revise o carrinho e tente novamente';
  end if;
  v_cpf := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  if v_cpf <> '' and length(v_cpf) <> 11 then raise exception 'CPF invalido'; end if;

  insert into public.pedidos (
    usuario_id, endereco_id, endereco_snapshot, subtotal, desconto, desconto_pix,
    metodo_pagamento, frete, frete_servico, frete_transportadora,
    frete_prazo_dias, frete_cep, frete_service_id, total, cupom_codigo
  ) values (
    p_user_id, v_address.id,
    jsonb_build_object(
      'nome_destinatario', v_address.nome_destinatario, 'cep', v_address.cep,
      'rua', v_address.rua, 'numero', v_address.numero,
      'complemento', v_address.complemento, 'bairro', v_address.bairro,
      'cidade', v_address.cidade, 'estado', v_address.estado
    ) || case when v_cpf <> '' then jsonb_build_object('cpf', v_cpf) else '{}'::jsonb end,
    v_subtotal, v_discount, v_pix_discount, p_payment_method, v_shipping,
    p_shipping_service, p_shipping_carrier, p_shipping_days,
    regexp_replace(p_shipping_cep, '\D', '', 'g'), p_shipping_service_id,
    v_total, v_coupon_code
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantidade')::integer;
    select * into v_product from public.produtos where id = (v_item->>'produto_id')::uuid;
    v_flavor_id := nullif(v_item->>'sabor_id', '')::uuid;
    v_price := coalesce(v_product.preco_promocional, v_product.preco);
    if v_flavor_id is not null then
      select * into v_flavor from public.produto_sabores where id = v_flavor_id;
    end if;
    insert into public.itens_pedido (
      pedido_id, produto_id, quantidade, preco_unitario, sabor_id, sabor_nome
    ) values (
      v_order.id, v_product.id, v_qty, v_price, v_flavor_id,
      case when v_flavor_id is null then null else v_flavor.nome end
    );
  end loop;

  if v_cpf <> '' then
    update public.usuarios set cpf = v_cpf where id = p_user_id;
  end if;
  return v_order;
end;
$$;

create or replace function public.admin_cancel_order(
  p_order_id uuid,
  p_expected_status text,
  p_restore_stock boolean
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  current_status text;
  stock_restored_at timestamptz;
  item record;
begin
  select status, estoque_restaurado_em into current_status, stock_restored_at
  from public.pedidos where id = p_order_id for update;
  if not found or (current_status <> p_expected_status and current_status <> 'cancelado') then
    return false;
  end if;
  if current_status not in ('pendente', 'aprovado', 'preparando', 'cancelado') then
    raise exception 'Pedido nao pode ser cancelado no status %', current_status;
  end if;
  if p_restore_stock and stock_restored_at is null then
    for item in
      select produto_id, sabor_id, sum(quantidade)::integer quantidade
      from public.itens_pedido where pedido_id = p_order_id
      group by produto_id, sabor_id
    loop
      if item.sabor_id is not null then
        update public.produto_sabores set estoque = estoque + item.quantidade
        where id = item.sabor_id;
      else
        update public.produtos set estoque = estoque + item.quantidade
        where id = item.produto_id;
      end if;
    end loop;
  end if;
  update public.pedidos
  set status = 'cancelado',
      estoque_restaurado_em = case
        when p_restore_stock then coalesce(estoque_restaurado_em, now())
        else estoque_restaurado_em
      end
  where id = p_order_id;
  return true;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists prevent_role_escalation on public.usuarios;
create trigger prevent_role_escalation before update on public.usuarios
for each row execute function public.prevent_role_escalation();

drop trigger if exists protect_avaliacao_aprovado on public.avaliacoes;
create trigger protect_avaliacao_aprovado
before insert or update on public.avaliacoes
for each row execute function public.protect_avaliacao_aprovado();

drop trigger if exists ensure_single_primary_address_trigger on public.enderecos;
create trigger ensure_single_primary_address_trigger
before insert or update of principal on public.enderecos
for each row execute function public.ensure_single_primary_address();

drop trigger if exists sync_product_stock_from_flavors_trigger on public.produto_sabores;
create trigger sync_product_stock_from_flavors_trigger
after insert or update or delete on public.produto_sabores
for each row execute function public.sync_product_stock_from_flavors();

drop trigger if exists sync_product_rating_trigger on public.avaliacoes;
create trigger sync_product_rating_trigger
after insert or update or delete on public.avaliacoes
for each row execute function public.sync_product_rating();

drop trigger if exists pedidos_updated_at on public.pedidos;
create trigger pedidos_updated_at before update on public.pedidos
for each row execute function public.set_updated_at();

drop trigger if exists site_settings_updated_at on public.site_settings;
create trigger site_settings_updated_at before update on public.site_settings
for each row execute function public.set_updated_at();

create or replace view public.avaliacoes_publicas
with (security_barrier = true)
as
select a.id, a.produto_id, a.nota, a.comentario,
       a.aprovado, a.criado_em, u.nome as nome_usuario
from public.avaliacoes a
join public.usuarios u on u.id = a.usuario_id
where a.aprovado;

alter table public.usuarios enable row level security;
alter table public.produtos enable row level security;
alter table public.imagens_produtos enable row level security;
alter table public.produto_sabores enable row level security;
alter table public.enderecos enable row level security;
alter table public.cupons enable row level security;
alter table public.pedidos enable row level security;
alter table public.itens_pedido enable row level security;
alter table public.email_notificacoes enable row level security;
alter table public.user_email_notificacoes enable row level security;
alter table public.password_reset_codes enable row level security;
alter table public.favoritos enable row level security;
alter table public.avaliacoes enable row level security;
alter table public.newsletter_inscricoes enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "usuarios_select_own_or_admin" on public.usuarios;
create policy "usuarios_select_own_or_admin" on public.usuarios for select
using (id = auth.uid() or public.is_admin());
drop policy if exists "usuarios_update_own" on public.usuarios;
create policy "usuarios_update_own" on public.usuarios for update
using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "produtos_public_select" on public.produtos;
create policy "produtos_public_select" on public.produtos for select using (ativo);
drop policy if exists "produtos_order_history_select" on public.produtos;
create policy "produtos_order_history_select" on public.produtos for select
using (exists (
  select 1
  from public.itens_pedido i
  join public.pedidos pe on pe.id = i.pedido_id
  where i.produto_id = produtos.id and pe.usuario_id = auth.uid()
));
drop policy if exists "produtos_admin_all" on public.produtos;
create policy "produtos_admin_all" on public.produtos for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "imagens_public_select" on public.imagens_produtos;
create policy "imagens_public_select" on public.imagens_produtos for select
using (exists (select 1 from public.produtos p where p.id = produto_id and p.ativo));
drop policy if exists "imagens_admin_all" on public.imagens_produtos;
create policy "imagens_admin_all" on public.imagens_produtos for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "sabores_public_select" on public.produto_sabores;
create policy "sabores_public_select" on public.produto_sabores for select
using (ativo and exists (select 1 from public.produtos p where p.id = produto_id and p.ativo));
drop policy if exists "sabores_admin_all" on public.produto_sabores;
create policy "sabores_admin_all" on public.produto_sabores for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "enderecos_owner_all" on public.enderecos;
create policy "enderecos_owner_all" on public.enderecos for all
using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
drop policy if exists "enderecos_admin_select" on public.enderecos;
create policy "enderecos_admin_select" on public.enderecos for select using (public.is_admin());

drop policy if exists "cupons_public_active_select" on public.cupons;
drop policy if exists "cupons_admin_all" on public.cupons;
create policy "cupons_admin_all" on public.cupons for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pedidos_owner_insert" on public.pedidos;
drop policy if exists "pedidos_owner_select" on public.pedidos;
create policy "pedidos_owner_select" on public.pedidos for select
using (usuario_id = auth.uid() or public.is_admin());
drop policy if exists "pedidos_admin_update" on public.pedidos;
create policy "pedidos_admin_update" on public.pedidos for update
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "itens_pedido_owner_insert" on public.itens_pedido;
drop policy if exists "itens_pedido_owner_select" on public.itens_pedido;
create policy "itens_pedido_owner_select" on public.itens_pedido for select
using (exists (
  select 1 from public.pedidos p
  where p.id = pedido_id and (p.usuario_id = auth.uid() or public.is_admin())
));

drop policy if exists "favoritos_owner_all" on public.favoritos;
create policy "favoritos_owner_all" on public.favoritos for all
using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

drop policy if exists "avaliacoes_public_select" on public.avaliacoes;
create policy "avaliacoes_public_select" on public.avaliacoes for select using (aprovado);
drop policy if exists "avaliacoes_owner_select" on public.avaliacoes;
create policy "avaliacoes_owner_select" on public.avaliacoes for select using (usuario_id = auth.uid());
drop policy if exists "avaliacoes_owner_insert" on public.avaliacoes;
create policy "avaliacoes_owner_insert" on public.avaliacoes for insert
with check (usuario_id = auth.uid() and public.user_purchased_product(produto_id));
drop policy if exists "avaliacoes_owner_update" on public.avaliacoes;
create policy "avaliacoes_owner_update" on public.avaliacoes for update
using (usuario_id = auth.uid() and public.user_purchased_product(produto_id))
with check (usuario_id = auth.uid() and public.user_purchased_product(produto_id));
drop policy if exists "avaliacoes_admin_all" on public.avaliacoes;
create policy "avaliacoes_admin_all" on public.avaliacoes for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "newsletter_public_insert" on public.newsletter_inscricoes;
create policy "newsletter_public_insert" on public.newsletter_inscricoes for insert with check (true);
drop policy if exists "newsletter_admin_select" on public.newsletter_inscricoes;
create policy "newsletter_admin_select" on public.newsletter_inscricoes for select using (public.is_admin());

drop policy if exists "site_settings_public_select" on public.site_settings;
create policy "site_settings_public_select" on public.site_settings for select using (true);
drop policy if exists "site_settings_admin_update" on public.site_settings;
create policy "site_settings_admin_update" on public.site_settings for update
using (public.is_admin()) with check (public.is_admin());
drop policy if exists "site_settings_admin_insert" on public.site_settings;
create policy "site_settings_admin_insert" on public.site_settings for insert
with check (public.is_admin());

grant usage on schema public to anon, authenticated, service_role;
grant select on public.produtos, public.imagens_produtos, public.produto_sabores,
  public.cupons, public.site_settings, public.avaliacoes_publicas to anon, authenticated;
grant insert on public.newsletter_inscricoes to anon, authenticated;

-- Autenticado: grants minimos + RLS. Nao conceder DML amplo em tabelas sensiveis.
grant select on table public.pedidos to authenticated;
grant select on table public.itens_pedido to authenticated;
grant select on table public.cupons to authenticated;
grant select, update on table public.usuarios to authenticated;
grant select, insert, update, delete on table public.enderecos to authenticated;
grant select, insert, update, delete on table public.favoritos to authenticated;
grant select, insert, update on table public.avaliacoes to authenticated;
grant select, insert, update, delete on table public.produtos to authenticated;
grant select, insert, update, delete on table public.imagens_produtos to authenticated;
grant select, insert, update, delete on table public.produto_sabores to authenticated;
grant select, insert, update, delete on table public.cupons to authenticated;
grant select, insert, update on table public.site_settings to authenticated;
grant select, update on table public.pedidos to authenticated;
grant select on table public.newsletter_inscricoes to authenticated;

grant all on all tables in schema public to service_role;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.prevent_role_escalation() from public, anon, authenticated;
revoke all on function public.protect_avaliacao_aprovado() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.ensure_single_primary_address() from public, anon, authenticated;
revoke all on function public.sync_product_stock_from_flavors() from public, anon, authenticated;
revoke all on function public.sync_product_rating() from public, anon, authenticated;

revoke all on function public.decrement_product_stock(uuid, integer) from public, anon, authenticated;
revoke all on function public.restore_product_stock(uuid, integer) from public, anon, authenticated;
revoke all on function public.decrement_flavor_stock(uuid, integer) from public, anon, authenticated;
revoke all on function public.restore_flavor_stock(uuid, integer) from public, anon, authenticated;
grant execute on function public.decrement_product_stock(uuid, integer) to service_role;
grant execute on function public.restore_product_stock(uuid, integer) to service_role;
grant execute on function public.decrement_flavor_stock(uuid, integer) to service_role;
grant execute on function public.restore_flavor_stock(uuid, integer) to service_role;

revoke all on function public.user_purchased_product(uuid) from public, anon;
grant execute on function public.user_purchased_product(uuid) to authenticated, service_role;
revoke all on function public.produtos_mais_vendidos(integer) from public;
grant execute on function public.produtos_mais_vendidos(integer) to anon, authenticated, service_role;
revoke all on function public.get_valid_coupon(text) from public;
grant execute on function public.get_valid_coupon(text) to anon, authenticated, service_role;
revoke all on function public.create_order_secure(
  uuid, uuid, jsonb, text, text, numeric, text, text, integer, text, text, numeric, text
) from public, anon, authenticated;
grant execute on function public.create_order_secure(
  uuid, uuid, jsonb, text, text, numeric, text, text, integer, text, text, numeric, text
) to service_role;
revoke all on function public.admin_cancel_order(uuid, text, boolean)
  from public, anon, authenticated;
grant execute on function public.admin_cancel_order(uuid, text, boolean) to service_role;

-- Depois do cadastro do primeiro usuario:
-- update public.usuarios set role = 'admin' where email = 'seu@email.com';
