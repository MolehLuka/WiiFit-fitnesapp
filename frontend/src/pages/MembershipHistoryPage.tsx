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
  const { user, refreshUser } = useAuth()

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
    const date = new Date(ts)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getStatusDisplay(status: string | null | undefined) {
    if (!status) return { text: 'Unknown', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400' }
    
    switch (status.toLowerCase()) {
      case 'active':
      case 'trialing':
        return { text: 'Active', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' }
      case 'past_due':
        return { text: 'Past Due', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' }
      case 'canceled':
        return { text: 'Canceled', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' }
      case 'inactive':
        return { text: 'No Active Plan', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400' }
      case 'incomplete':
      case 'incomplete_expired':
        return { text: 'Incomplete', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' }
      default:
        return { text: status, color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400' }
    }
  }

  function getEventLabel(eventType: string) {
    const labels: Record<string, string> = {
      'checkout.session.completed': 'Subscription Started',
      'customer.subscription.created': 'Subscription Created',
      'customer.subscription.updated': 'Subscription Updated',
      'customer.subscription.deleted': 'Subscription Canceled',
      'invoice.payment_succeeded': 'Payment Successful',
      'invoice.payment_failed': 'Payment Failed',
      'invoice.created': 'Invoice Created',
      'customer.created': 'Account Created',
    }
    return labels[eventType] || eventType.split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
  }

  function getEventIcon(eventType: string) {
    if (eventType.includes('payment_succeeded')) return '✓'
    if (eventType.includes('payment_failed')) return '✗'
    if (eventType.includes('completed')) return '✓'
    if (eventType.includes('deleted') || eventType.includes('canceled')) return '⊗'
    if (eventType.includes('created')) return '+'
    if (eventType.includes('updated')) return '↻'
    return '•'
  }

  async function cancel(mode: 'immediate' | 'period_end') {
    setCancelState('working')
    setCancelMessage(null)
    try {
      const res = await api.cancelSubscription(mode)
      setCancelMessage(res.message + ` (status now: ${res.status})`)
      setCancelState('done')
      // Refresh events and user data
      const { events } = await api.getMembershipHistory()
      setEvents(events)
      await refreshUser()
    } catch (e: any) {
      setCancelMessage(e?.message || 'Cancellation failed')
      setCancelState('idle')
    }
  }

  const currentStatus = user?.membership_status || 'inactive'
  const statusInfo = getStatusDisplay(currentStatus)
  const activeLike = currentStatus === 'active' || currentStatus === 'trialing'
  const pastDue = currentStatus === 'past_due'
  const hasSubscription = activeLike || pastDue

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 py-8">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Membership & Billing
        </h1>
        <p className="text-lg text-muted-foreground">Track your subscription status and payment history.</p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6 shadow-sm">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Current Status</p>
            <span className={`text-xl font-bold px-4 py-2 rounded-lg ${statusInfo.color}`}>
              {statusInfo.text}
            </span>
          </div>
          {activeLike && (
            <div className="flex gap-3">
              <Button 
                size="sm" 
                className="bg-red-500 hover:bg-red-600 text-white"
                disabled={cancelState==='working'} 
                onClick={() => cancel('immediate')}
              >
                Cancel Immediately
              </Button>
              <Button 
                size="sm" 
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={cancelState==='working'} 
                onClick={() => cancel('period_end')}
              >
                Cancel At Period End
              </Button>
            </div>
          )}
        </div>
        {pastDue && (
          <p className="text-sm text-amber-600 mt-4 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg">
            ⚠️ Payment past due – please update your payment method to continue using the service.
          </p>
        )}
        {currentStatus === 'inactive' && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
            💡 You don't have an active subscription. Visit the Plans page to get started!
          </p>
        )}
        {cancelMessage && (
          <p className="text-sm text-muted-foreground mt-4 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
            {cancelMessage}
          </p>
        )}
      </div>

      {loading && <p className="text-center text-muted-foreground">Loading events...</p>}
      {error && <p className="text-center text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">{error}</p>}

      {!loading && events.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-muted-foreground">No billing events yet.</p>
        </div>
      )}

      {events.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Transaction History
          </h2>
          <ul className="space-y-3">
            {events.map(ev => {
              const eventLabel = getEventLabel(ev.event_type)
              const eventIcon = getEventIcon(ev.event_type)
              const isPaymentSuccess = ev.event_type.includes('payment_succeeded')
              const isPaymentFailed = ev.event_type.includes('payment_failed')
              const isCancellation = ev.event_type.includes('deleted') || ev.event_type.includes('canceled')
              
              return (
                <li key={ev.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-white dark:bg-gray-900 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all">
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div className="space-y-2 flex-1 min-w-[200px]">
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full ${
                          isPaymentSuccess ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                          isPaymentFailed ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                          isCancellation ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                          'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        }`}>
                          {eventIcon}
                        </span>
                        <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                          {eventLabel}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground pl-11">{formatDate(ev.occurred_at)}</p>
                    </div>
                    <div className="text-right space-y-2 min-w-[120px]">
                      {ev.amount != null && ev.currency && (
                        <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          {(new Intl.NumberFormat(undefined,{style:'currency',currency:ev.currency})).format(ev.amount)}
                        </p>
                      )}
                      {ev.status && (
                        <div className="inline-block">
                          <span className={`text-xs font-medium px-3 py-1 rounded-full ${getStatusDisplay(ev.status).color}`}>
                            {getStatusDisplay(ev.status).text}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
