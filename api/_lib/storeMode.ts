/**
 * Modo demonstração no servidor. Desative com STORE_DEMO_MODE=false.
 * Se VITE_STORE_DEMO_MODE estiver false, também libera (mesmo valor no .env local).
 */
export function isStoreDemoMode() {
  const server = process.env.STORE_DEMO_MODE
  const vite = process.env.VITE_STORE_DEMO_MODE
  if (server === 'false' || vite === 'false') return false
  if (server === 'true' || vite === 'true') return true
  // Padrão: demo ligado (site de demonstração)
  return true
}

export const STORE_DEMO_MESSAGE =
  'Site temporariamente indisponível. Esta loja está em modo demonstração — compras desativadas.'
