/**
 * Modo demonstração: loja navegável, mas compras e uso comercial desativados.
 * Desative com VITE_STORE_DEMO_MODE=false no .env quando for reabrir a loja.
 */
export const isStoreDemoMode = import.meta.env.VITE_STORE_DEMO_MODE !== 'false'

export const STORE_DEMO_MESSAGE =
  'Site temporariamente indisponível. Esta loja está em modo demonstração — compras e cadastros estão desativados.'

export const STORE_DEMO_SHORT_MESSAGE =
  'Loja em demonstração: compras temporariamente indisponíveis.'
