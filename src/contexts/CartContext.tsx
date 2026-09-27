/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { isStoreDemoMode, STORE_DEMO_SHORT_MESSAGE } from '../lib/storeMode'
import { calculateShipping as requestShippingOptions } from '../services/shipping'
import { productRequiresFlavor } from '../services/flavors'
import type { CartItem, Coupon, Product, ProductFlavor, ShippingOption } from '../types'
import { isRealProductId } from '../utils/product'

interface CartActionResult {
  success: boolean
  message?: string
}

interface CartContextValue {
  items: CartItem[]
  coupon: Coupon | null
  shippingPostalCode: string
  shippingOptions: ShippingOption[]
  selectedShippingOption: ShippingOption | null
  subtotal: number
  discount: number
  shipping: number
  total: number
  addItem: (product: Product, quantity?: number, flavor?: ProductFlavor | null) => CartActionResult
  updateQuantity: (lineKey: string, quantity: number) => CartActionResult
  removeItem: (lineKey: string) => void
  clearCart: () => void
  applyCoupon: (coupon: Coupon | null) => void
  calculateShipping: (cep: string) => Promise<ShippingOption[]>
  selectShippingOption: (option: ShippingOption) => void
  clearShipping: () => void
  getLineKey: (item: CartItem) => string
}

const STORAGE_KEY = 'fitstore.cart'
const META_KEY = 'fitstore.cart.meta'
const CartContext = createContext<CartContextValue | undefined>(undefined)

const currentPrice = (product: Product) => product.preco_promocional ?? product.preco
const roundMoney = (value: number) => Math.round(value * 100) / 100

export function getCartLineKey(productId: string, flavorId?: string | null) {
  return `${productId}:${flavorId ?? 'default'}`
}

function itemKey(item: CartItem) {
  return getCartLineKey(item.product.id, item.flavor?.id)
}

function availableStock(product: Product, flavor?: ProductFlavor | null) {
  if (flavor) return flavor.estoque
  return product.estoque
}

function getCartQuantity(items: CartItem[], productId: string, flavorId?: string | null) {
  return items.find((item) => itemKey(item) === getCartLineKey(productId, flavorId))?.quantity ?? 0
}

interface CartMeta {
  coupon: Coupon | null
  shippingPostalCode: string
  shippingOptions: ShippingOption[]
  selectedShippingOption: ShippingOption | null
}

const emptyMeta: CartMeta = {
  coupon: null,
  shippingPostalCode: '',
  shippingOptions: [],
  selectedShippingOption: null,
}

function loadMeta(): CartMeta {
  try {
    const raw = localStorage.getItem(META_KEY)
    return raw ? { ...emptyMeta, ...(JSON.parse(raw) as CartMeta) } : emptyMeta
  } catch {
    return emptyMeta
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  })
  const [coupon, setCoupon] = useState<Coupon | null>(() => loadMeta().coupon)
  const [shippingPostalCode, setShippingPostalCode] = useState(() => loadMeta().shippingPostalCode)
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>(() => loadMeta().shippingOptions)
  const [selectedShippingOption, setSelectedShippingOption] = useState<ShippingOption | null>(
    () => loadMeta().selectedShippingOption,
  )
  const shippingRequestRef = useRef(0)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    localStorage.setItem(
      META_KEY,
      JSON.stringify({ coupon, shippingPostalCode, shippingOptions, selectedShippingOption }),
    )
  }, [coupon, shippingPostalCode, shippingOptions, selectedShippingOption])

  const subtotal = items.reduce((sum, item) => sum + currentPrice(item.product) * item.quantity, 0)
  const discount =
    coupon && subtotal >= coupon.valor_minimo
      ? coupon.tipo === 'percentual'
        ? roundMoney(subtotal * (coupon.valor / 100))
        : roundMoney(Math.min(coupon.valor, subtotal))
      : 0
  const shipping = selectedShippingOption?.price ?? 0
  const total = Math.max(subtotal - discount, 0)

  const clearCart = useCallback(() => {
    shippingRequestRef.current += 1
    setItems([])
    setCoupon(null)
    setShippingPostalCode('')
    setShippingOptions([])
    setSelectedShippingOption(null)
  }, [])

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      coupon,
      shippingPostalCode,
      shippingOptions,
      selectedShippingOption,
      subtotal,
      discount,
      shipping,
      total,
      getLineKey: itemKey,
      addItem: (product, quantity = 1, flavor = null) => {
        shippingRequestRef.current += 1
        if (isStoreDemoMode) {
          return { success: false, message: STORE_DEMO_SHORT_MESSAGE }
        }
        if (!isRealProductId(product.id)) {
          return { success: false, message: 'Produto indisponivel para compra no momento.' }
        }

        if (productRequiresFlavor(product.produto_sabores) && !flavor) {
          return { success: false, message: 'Selecione um sabor para continuar.' }
        }

        const stock = availableStock(product, flavor)
        if (stock <= 0) {
          return { success: false, message: flavor ? 'Sabor sem estoque.' : 'Produto sem estoque.' }
        }

        const currentQty = getCartQuantity(items, product.id, flavor?.id)
        if (currentQty + quantity > stock) {
          return {
            success: false,
            message: `Estoque insuficiente. Disponivel: ${stock}.`,
          }
        }

        setShippingPostalCode('')
        setShippingOptions([])
        setSelectedShippingOption(null)
        setItems((current) => {
          const key = getCartLineKey(product.id, flavor?.id)
          const existing = current.find((item) => itemKey(item) === key)
          if (!existing) return [...current, { product, quantity, flavor: flavor ?? null }]
          return current.map((item) =>
            itemKey(item) === key ? { ...item, quantity: item.quantity + quantity } : item,
          )
        })
        return { success: true }
      },
      updateQuantity: (lineKey, quantity) => {
        shippingRequestRef.current += 1
        const item = items.find((entry) => itemKey(entry) === lineKey)
        if (!item) return { success: false, message: 'Item nao encontrado no carrinho.' }
        const stock = availableStock(item.product, item.flavor)
        if (quantity > stock) {
          return {
            success: false,
            message: `Estoque insuficiente. Disponivel: ${stock}.`,
          }
        }

        setShippingPostalCode('')
        setShippingOptions([])
        setSelectedShippingOption(null)
        setItems((current) =>
          current
            .map((entry) => (itemKey(entry) === lineKey ? { ...entry, quantity } : entry))
            .filter((entry) => entry.quantity > 0),
        )
        return { success: true }
      },
      removeItem: (lineKey) => {
        shippingRequestRef.current += 1
        setShippingPostalCode('')
        setShippingOptions([])
        setSelectedShippingOption(null)
        setItems((current) => current.filter((item) => itemKey(item) !== lineKey))
      },
      clearCart,
      applyCoupon: setCoupon,
      calculateShipping: async (cep) => {
        const requestId = ++shippingRequestRef.current
        const options = await requestShippingOptions(cep, items)
        if (requestId !== shippingRequestRef.current) return options
        setShippingPostalCode(cep.replace(/\D/g, ''))
        setShippingOptions(options)
        setSelectedShippingOption(options[0] ?? null)
        return options
      },
      selectShippingOption: setSelectedShippingOption,
      clearShipping: () => {
        shippingRequestRef.current += 1
        setShippingPostalCode('')
        setShippingOptions([])
        setSelectedShippingOption(null)
      },
    }),
    [clearCart, coupon, discount, items, selectedShippingOption, shipping, shippingOptions, shippingPostalCode, subtotal, total],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart precisa estar dentro de CartProvider')
  return context
}
