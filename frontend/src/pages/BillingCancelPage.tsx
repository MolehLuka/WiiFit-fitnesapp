import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router'

export default function BillingCancelPage() {
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-md space-y-4 text-center">
      <h1 className="text-2xl font-semibold">Checkout cancelled</h1>
      <p className="text-muted-foreground">No worries—your card wasn’t charged. You can pick another plan anytime.</p>
      <div className="flex justify-center gap-2">
        <Button onClick={() => navigate('/plans')}>Back to Plans</Button>
      </div>
    </div>
  )
}
