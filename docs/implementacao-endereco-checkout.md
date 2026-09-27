# Implementacao de endereco de entrega no checkout

Documentacao de referencia para o fluxo de endereco implementado no FitStore.

## Fluxo

```
Produto → Carrinho (CEP + frete) → Checkout (endereco) → Mercado Pago → Sucesso
```

O endereco completo e coletado **antes** do pagamento.

## Arquivos principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/services/addresses.ts` | CRUD de enderecos no Supabase |
| `src/services/viacep.ts` | Autocomplete de CEP via ViaCEP |
| `src/components/AddressForm.tsx` | Formulario reutilizavel |
| `src/components/AddressCard.tsx` | Card de endereco |
| `src/components/AddressSelector.tsx` | Selecao no checkout |
| `src/pages/CheckoutPage.tsx` | Endereco obrigatorio antes de pagar |
| `src/pages/AddressesPage.tsx` | Gerenciamento na conta |
| `src/services/orders.ts` | Vincula `endereco_id` ao pedido |

## Regras de negocio

- CEP e calculado no carrinho; endereco completo no checkout
- CEP do endereco deve coincidir com o CEP usado no frete
- Pedido exige `endereco_id` valido do usuario logado
- "Comprar agora" redireciona para `/carrinho` (nao direto ao checkout)

## Melhorias futuras (Fase 3)

- Mover CEP + frete para o checkout junto com endereco
- Snapshot de endereco no pedido (`endereco_snapshot jsonb`)
- Recalcular frete automaticamente ao mudar CEP no checkout
- Exibir endereco nos pedidos do admin
