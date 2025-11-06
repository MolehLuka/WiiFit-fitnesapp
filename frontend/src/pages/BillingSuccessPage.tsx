import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router'
import { api } from '@/lib/api'

export default function BillingSuccessPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'checking' | 'ready'>('checking')

  useEffect(() => {
    let active = true
    const start = Date.now()
    async function poll() {
      try {
        await api.me()
        // If webhook already processed, plan will be reflected in UI elsewhere
        if (active) setStatus('ready')
      } catch {
        /* ignore */
      } finally {
        if (active && Date.now() - start < 10000 && status === 'checking') {
          setTimeout(poll, 1500)
        }
      }
    }
    poll()
    return () => { active = false }
  }, [])

  return (
    <div className="mx-auto max-w-md space-y-4 text-center">
      <h1 className="text-2xl font-semibold">Payment successful</h1>
      <p className="text-muted-foreground">Thanks! We’re activating your membership now.</p>
      {status === 'checking' && (
        <p className="text-xs text-muted-foreground">Finalizing… this can take a moment.</p>
      )}
      <div className="flex justify-center gap-2">
        <Button onClick={() => navigate('/app')}>Go to App</Button>
        <Button variant="ghost" onClick={() => navigate('/plans')}>Back to Plans</Button>
      </div>
    </div>
  )
}
