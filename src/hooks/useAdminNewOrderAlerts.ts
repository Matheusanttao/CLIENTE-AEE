import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/ui'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../utils/format'
import { playNewOrderSound, unlockNotificationAudio } from '../utils/notificationSound'

type OrderAlertRow = {
  id: string
  total: number | string
  criado_em: string
}

/**
 * Escuta novos pedidos no painel admin:
 * - Supabase Realtime (INSERT em pedidos)
 * - Polling de backup a cada 12s (caso Realtime nao esteja habilitado)
 * Toca som + toast e atualiza a lista de pedidos.
 */
export function useAdminNewOrderAlerts() {
  const { notify } = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)
  const seenIds = useRef<Set<string>>(new Set())
  const ready = useRef(false)
  const lastCriadoEm = useRef<string | null>(null)

  useEffect(() => {
    const unlock = () => unlockNotificationAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const announce = (order: OrderAlertRow) => {
      if (seenIds.current.has(order.id)) return
      seenIds.current.add(order.id)
      if (!ready.current) return

      playNewOrderSound()
      setUnreadCount((count) => count + 1)
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })

      const shortId = order.id.slice(0, 8).toUpperCase()
      const total = formatCurrency(Number(order.total))
      notify(`Novo pedido #${shortId} · ${total}`, 'success', 7000)
    }

    const seedSeen = async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, total, criado_em')
        .order('criado_em', { ascending: false })
        .limit(50)

      if (cancelled || error) {
        ready.current = true
        return
      }

      const rows = (data ?? []) as OrderAlertRow[]
      for (const row of rows) seenIds.current.add(row.id)
      lastCriadoEm.current = rows[0]?.criado_em ?? null
      ready.current = true
    }

    const pollForNew = async () => {
      if (!ready.current) return

      let query = supabase
        .from('pedidos')
        .select('id, total, criado_em')
        .order('criado_em', { ascending: false })
        .limit(10)

      if (lastCriadoEm.current) {
        query = query.gt('criado_em', lastCriadoEm.current)
      }

      const { data, error } = await query
      if (cancelled || error || !data?.length) return

      const rows = (data as OrderAlertRow[]).slice().reverse()
      for (const row of rows) {
        announce(row)
        if (!lastCriadoEm.current || row.criado_em > lastCriadoEm.current) {
          lastCriadoEm.current = row.criado_em
        }
      }
    }

    void seedSeen()

    const channel = supabase
      .channel('admin-new-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos' },
        (payload) => {
          const row = payload.new as OrderAlertRow
          if (!row?.id) return
          announce(row)
          if (row.criado_em && (!lastCriadoEm.current || row.criado_em > lastCriadoEm.current)) {
            lastCriadoEm.current = row.criado_em
          }
        },
      )
      .subscribe()

    const pollId = window.setInterval(() => {
      void pollForNew()
    }, 12_000)

    return () => {
      cancelled = true
      window.clearInterval(pollId)
      void supabase.removeChannel(channel)
    }
  }, [notify, queryClient])

  const clearUnread = () => setUnreadCount(0)

  const goToOrders = () => {
    clearUnread()
    navigate('/admin/pedidos')
  }

  return { unreadCount, clearUnread, goToOrders }
}
