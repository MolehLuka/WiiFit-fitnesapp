import { useAuth } from '@/context/AuthContext'
import { Link } from 'react-router'

export default function AppPage() {
  const { user, plan } = useAuth()
  
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
      default:
        return { text: status, color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400' }
    }
  }
  
  const membershipStatus = user?.membership_status || 'inactive'
  const statusInfo = getStatusDisplay(membershipStatus)
  const hasActivePlan = (membershipStatus === 'active' || membershipStatus === 'trialing')
  
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Welcome Back! 🎉
          </h2>
          <p className="text-muted-foreground text-lg">You're logged in and ready to train</p>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6 shadow-sm">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Membership Status</p>
                <span className={`inline-block text-lg font-bold px-4 py-2 rounded-lg ${statusInfo.color}`}>
                  {statusInfo.text}
                </span>
              </div>
              {plan && hasActivePlan && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                  <p className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {plan.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {new Intl.NumberFormat(undefined, { style: 'currency', currency: plan.currency }).format(plan.price)}/month
                  </p>
                </div>
              )}
            </div>
            
            {!hasActivePlan && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {membershipStatus === 'canceled' 
                    ? '🔴 Your membership has been canceled. Subscribe again to continue enjoying our services!' 
                    : '💡 You don\'t have an active subscription. Get started with one of our plans!'}
                </p>
                <Link 
                  to="/plans" 
                  className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                  View Plans
                </Link>
              </div>
            )}
            
            {membershipStatus === 'past_due' && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  ⚠️ Your payment is past due. Please update your payment method to continue using the service.
                </p>
              </div>
            )}
          </div>
        </div>

        {plan && !hasActivePlan && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Previous Plan</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{plan.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {new Intl.NumberFormat(undefined, { style: 'currency', currency: plan.currency }).format(plan.price)}/month
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 mt-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Quick Stats
            </h3>
            <p className="text-sm text-muted-foreground">Track your progress and achievements here.</p>
            <p className="text-xs text-muted-foreground mt-4 italic">Coming soon...</p>
          </div>
          
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Upcoming Sessions
            </h3>
            <p className="text-sm text-muted-foreground">View your booked classes and trainer sessions.</p>
            <p className="text-xs text-muted-foreground mt-4 italic">Coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
