# Configurar um projeto Supabase novo

## 1. Criar o banco

1. Crie um projeto vazio no Supabase.
2. Abra **SQL Editor > New query**.
3. Cole todo o conteúdo de `supabase/schema_completo.sql` e execute uma vez.
4. Não execute `schema.sql` nem os arquivos `migration_*.sql`: eles são históricos e já estão incorporados.
5. Confirme no Table Editor a existência das 15 tabelas públicas e do registro `site_settings.id = 1`.

O script não apaga dados e foi preparado para um banco novo. Não use a opção "Run in a transaction" junto com outros scripts antigos.

Em um projeto que já possui as tabelas, execute somente
`supabase/migration_email_notificacoes.sql`, `supabase/migration_auth_emails.sql`
e `supabase/migration_cpf_cadastro.sql` no SQL Editor para habilitar os e-mails
transacionais, a recuperação de senha e o CPF no cadastro.

## 2. Configurar autenticação

Em **Authentication > URL Configuration**:

- defina a Site URL da aplicação;
- adicione as URLs locais e de produção usadas no login e na recuperação de senha;
- decida se o cadastro exigirá confirmação de e-mail.

Crie o primeiro usuário pela aplicação ou em **Authentication > Users**. Depois promova-o no SQL Editor:

```sql
update public.usuarios
set role = 'admin'
where email = 'matheusantaosilva18@gmail.com';
```

Usuários de outro projeto não são recriados pelo schema, pois ficam em `auth.users`.

## 3. Variáveis da aplicação

Configure na Vercel e no ambiente local:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` ou `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SECRET_KEY`
- `APP_URL`
- `MP_ACCESS_TOKEN`
- variáveis públicas do Mercado Pago já usadas pelo frontend
- `SUPERFRETE_TOKEN`
- `SUPERFRETE_ORIGIN_CEP`
- `SUPERFRETE_ENV` (`sandbox` ou `production`)
- `SUPERFRETE_SERVICES`
- dados do remetente `SUPERFRETE_FROM_*`
- `RESEND_API_KEY`
- `EMAIL_FROM` (exemplo: `Passarin Suplementos <pedidos@seudominio.com.br>`)
- credenciais do Cloudinary
- `CRON_SECRET`

A URL e a chave de serviço devem pertencer ao mesmo projeto Supabase. Nunca exponha a chave `service_role` em variáveis `VITE_*`.

## 4. Serviços externos

- Cadastre no Mercado Pago o webhook `/api/mp/webhook`.
- Cadastre no SuperFrete o webhook `/api/shipping/webhook`.
- Confira o CEP, CPF/CNPJ e endereço do remetente no SuperFrete.
- As imagens continuam no Cloudinary; não há bucket do Supabase Storage.

## 5. Dados que precisam ser importados

O script cria somente a estrutura e a linha vazia de `site_settings`. Se necessário, exporte e importe separadamente:

- produtos, imagens e sabores;
- cupons;
- configuração visual em `site_settings`;
- clientes e usuários Auth;
- endereços e pedidos históricos.

Ao migrar dados relacionados, preserve a ordem: usuários, produtos, sabores/imagens, endereços/cupons, pedidos e itens.

## 6. Checklist de validação

- cadastro cria uma linha em `usuarios`;
- cadastro valida e salva o CPF do cliente;
- login e recuperação de senha funcionam;
- catálogo público não mostra produtos inativos;
- admin cria e edita produtos, sabores, cupons e configurações;
- cálculo de frete retorna as mesmas opções no carrinho e no checkout;
- criação do pedido passa por `/api/orders/create`;
- Pix e cartão cobram exatamente `pedidos.total`;
- pagamento aprovado baixa estoque;
- pagamento aprovado envia e-mail ao cliente sem duplicidade;
- conta criada envia e-mail de boas-vindas sem duplicidade;
- recuperação de senha envia código temporário e permite cadastrar uma nova senha;
- cancelamento restaura estoque apenas uma vez;
- avaliações exibem o nome do comprador sem expor e-mail ou CPF;
- rastreio e webhook da SuperFrete atualizam o pedido.
- código de rastreio recebido envia e-mail ao cliente sem duplicidade.
