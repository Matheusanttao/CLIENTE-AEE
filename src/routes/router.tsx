import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { PageSpinner } from '../components/PageSpinner'
import { AdminRoute, ProtectedRoute } from '../components/ProtectedRoute'
import { AccountLayout } from '../layouts/AccountLayout'
import { AdminLayout } from '../layouts/AdminLayout'
import { RootLayout } from '../layouts/RootLayout'

const HomePage = lazy(() => import('../pages/HomePage').then((module) => ({ default: module.HomePage })))
const CatalogPage = lazy(() => import('../pages/CatalogPage').then((module) => ({ default: module.CatalogPage })))
const ProductPage = lazy(() => import('../pages/ProductPage').then((module) => ({ default: module.ProductPage })))
const CartPage = lazy(() => import('../pages/CartPage').then((module) => ({ default: module.CartPage })))
const CheckoutPage = lazy(() => import('../pages/CheckoutPage').then((module) => ({ default: module.CheckoutPage })))
const AuthPage = lazy(() => import('../pages/AuthPage').then((module) => ({ default: module.AuthPage })))
const AccountPage = lazy(() => import('../pages/AccountPage').then((module) => ({ default: module.AccountPage })))
const OrdersPage = lazy(() => import('../pages/OrdersPage').then((module) => ({ default: module.OrdersPage })))
const FavoritesPage = lazy(() => import('../pages/FavoritesPage').then((module) => ({ default: module.FavoritesPage })))
const AddressesPage = lazy(() => import('../pages/AddressesPage').then((module) => ({ default: module.AddressesPage })))
const TrackOrderPage = lazy(() => import('../pages/TrackOrderPage').then((module) => ({ default: module.TrackOrderPage })))
const AdminPage = lazy(() => import('../pages/AdminPage').then((module) => ({ default: module.AdminPage })))
const AdminProductsPage = lazy(() => import('../pages/AdminProductsPage').then((module) => ({ default: module.AdminProductsPage })))
const AdminOrdersPage = lazy(() => import('../pages/AdminOrdersPage').then((module) => ({ default: module.AdminOrdersPage })))
const AdminCouponsPage = lazy(() => import('../pages/AdminCouponsPage').then((module) => ({ default: module.AdminCouponsPage })))
const AdminCustomersPage = lazy(() => import('../pages/AdminCustomersPage').then((module) => ({ default: module.AdminCustomersPage })))
const AdminSettingsPage = lazy(() => import('../pages/AdminSettingsPage').then((module) => ({ default: module.AdminSettingsPage })))
const LegalPage = lazy(() => import('../pages/LegalPage').then((module) => ({ default: module.LegalPage })))
const CheckoutStatusPage = lazy(() =>
  import('../pages/CheckoutStatusPage').then((module) => ({ default: module.CheckoutStatusPage })),
)
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))

const Loading = () => <PageSpinner fullScreen label="Carregando..." />

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/catalogo', element: <CatalogPage /> },
      { path: '/produto/:slug', element: <ProductPage /> },
      { path: '/carrinho', element: <CartPage /> },
      { path: '/checkout', element: <CheckoutPage /> },
      { path: '/checkout/sucesso', element: <CheckoutStatusPage /> },
      { path: '/checkout/falha', element: <CheckoutStatusPage /> },
      { path: '/checkout/pendente', element: <CheckoutStatusPage /> },
      { path: '/login', element: <AuthPage /> },
      { path: '/rastrear-pedido', element: <TrackOrderPage /> },
      { path: '/privacidade', element: <LegalPage type="privacidade" /> },
      { path: '/termos', element: <LegalPage type="termos" /> },
      { path: '/trocas-devolucoes', element: <LegalPage type="trocas" /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/minha-conta',
            element: <AccountLayout />,
            children: [
              { index: true, element: <AccountPage /> },
              { path: 'pedidos', element: <OrdersPage /> },
              { path: 'enderecos', element: <AddressesPage /> },
              { path: 'favoritos', element: <FavoritesPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <AdminRoute />,
    children: [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminPage /> },
          { path: 'produtos', element: <AdminProductsPage /> },
          { path: 'produtos/novo', element: <AdminProductsPage /> },
          { path: 'pedidos', element: <AdminOrdersPage /> },
          { path: 'cupons', element: <AdminCouponsPage /> },
          { path: 'clientes', element: <AdminCustomersPage /> },
          { path: 'configuracoes', element: <AdminSettingsPage /> },
        ],
      },
    ],
  },
])

export function AppRouter() {
  return (
    <Suspense fallback={<Loading />}>
      <RouterProvider router={router} />
    </Suspense>
  )
}
