import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { DemoModeBanner } from '../components/DemoModeBanner'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { PageSpinner } from '../components/PageSpinner'
import { WhatsAppButton } from '../components/WhatsAppButton'
import { isStoreDemoMode } from '../lib/storeMode'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return null
}

export function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <ScrollToTop />
      <DemoModeBanner />
      <Header />
      <main className="flex-1">
        <Suspense fallback={<PageSpinner />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      {!isStoreDemoMode && <WhatsAppButton />}
    </div>
  )
}
