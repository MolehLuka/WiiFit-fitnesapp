import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'

interface EventItem {
  id: number
  event_type: string
  status: string | null
  stripe_object_id: string | null
  amount: number | null
  currency: string | null
  occurred_at: string
}

export default function MembershipHistoryPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelState, setCancelState] = useState<'idle' | 'working' | 'done'>('idle')
  const [cancelMessage, setCancelMessage] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { events } = await api.getMembershipHistory()
        if (!active) return
        setEvents(events)
      } catch (e: any) {
        if (!active) return
        setError(e?.message || 'Failed to load history')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  function formatDate(ts: string) {
    return new Date(ts).toLocaleString()
  }

  async function cancel(mode: 'immediate' | 'period_end') {
    setCancelState('working')
    setCancelMessage(null)
    try {
      const res = await api.cancelSubscription(mode)
      setCancelMessage(res.message + ` (status now: ${res.status})`)
      setCancelState('done')
      // Refresh events
      const { events } = await api.getMembershipHistory()
      setEvents(events)
    } catch (e: any) {
      setCancelMessage(e?.message || 'Cancellation failed')
      setCancelState('idle')
    }
  }

  const activeLike = user?.membership_status === 'active' || user?.membership_status === 'trialing'
  const pastDue = user?.membership_status === 'past_due'

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Membership & Billing History</h1>
        <p className="text-sm text-muted-foreground">Track subscription status changes and payments.</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-sm rounded px-2 py-1 border bg-muted">Current status: <strong>{user?.membership_status || 'unknown'}</strong></span>
        {activeLike && (
          <>
            <Button size="sm" variant="secondary" disabled={cancelState==='working'} onClick={() => cancel('immediate')}>Cancel Immediately</Button>
            <Button size="sm" variant="secondary" disabled={cancelState==='working'} onClick={() => cancel('period_end')}>Cancel At Period End</Button>
          </>
        )}
        {pastDue && (
          <span className="text-xs text-amber-600">Payment past due – resolve in Stripe portal (coming soon).</span>
        )}
        {cancelMessage && (
          <span className="text-xs text-muted-foreground">{cancelMessage}</span>
        )}
      </div>

      {loading && <p className="text-sm">Loading events...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && events.length === 0 && <p className="text-sm">No events yet.</p>}

      <ul className="space-y-3">
        {events.map(ev => (
          <li key={ev.id} className="border rounded p-3 bg-background/50">
            <div className="flex justify-between flex-wrap gap-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">{ev.event_type}</p>
                <p className="text-xs text-muted-foreground">{formatDate(ev.occurred_at)}</p>
              </div>
              <div className="text-right space-y-1 min-w-[120px]">
                <p className="text-xs">Status: <span className="font-medium">{ev.status || 'n/a'}</span></p>
                {ev.amount != null && ev.currency && (
                  <p className="text-xs">Amount: {(new Intl.NumberFormat(undefined,{style:'currency',currency:ev.currency})).format(ev.amount)}</p>
                )}
                {ev.stripe_object_id && (
                  <p className="text-[10px] text-muted-foreground break-all">ID: {ev.stripe_object_id}</p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
