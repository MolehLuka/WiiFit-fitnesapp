import { useAuth } from '@/context/AuthContext'

export default function AppPage() {
  const { user, plan } = useAuth()
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-semibold">You are logged in 🎉</h2>
      <p className="text-muted-foreground">More features coming soon...</p>
      {plan && (
        <p className="text-sm">Current plan: <span className="font-medium">{plan.name}</span> ({new Intl.NumberFormat(undefined, { style: 'currency', currency: plan.currency }).format(plan.price)}/mo)</p>
      )}
    </div>
  )
}
