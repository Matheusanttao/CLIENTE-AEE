import { HelmetProvider } from 'react-helmet-async'
import { QueryClientProvider } from '@tanstack/react-query'
import { Analytics } from '@vercel/analytics/react'
import { AppBootGate } from './components/AppBootGate'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { SiteSettingsProvider } from './contexts/SiteSettingsContext'
import { queryClient } from './lib/queryClient'
import { AppRouter } from './routes/router'
import { ToastProvider, ConfirmProvider } from './components/ui'

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SiteSettingsProvider>
            <AppBootGate>
              <CartProvider>
                <ToastProvider>
                  <ConfirmProvider>
                    <AppRouter />
                  </ConfirmProvider>
                </ToastProvider>
              </CartProvider>
            </AppBootGate>
          </SiteSettingsProvider>
        </AuthProvider>
      </QueryClientProvider>
      <Analytics />
    </HelmetProvider>
  )
}

export default App
