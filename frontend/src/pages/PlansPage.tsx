import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dumbbell, Crown, Star } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useEffect, useMemo, useState } from 'react'
import { api, type Plan, type GroupClass } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

const defaultPlans: Array<Plan> = [
  {
    name: 'Basic',
    price: 19,
    currency: 'USD',
    description:
      'Essential access to gym equipment and facilities. Perfect for beginners or those on a budget.',
    features: ['Gym floor access', 'Locker rooms', 'Open 6am – 10pm'],
  },
  {
    name: 'Plus',
    price: 39,
    currency: 'USD',
    description:
      'Everything in Basic plus group classes and extended hours. Ideal for regulars who enjoy variety.',
    features: ['All Basic features', 'Unlimited group classes', 'Open 24/7', '1 free PT intro session'],
    highlighted: true,
  },
  {
    name: 'Pro',
    price: 59,
    currency: 'USD',
    description:
      'For dedicated athletes. Includes personal coaching credits and advanced recovery amenities.',
    features: ['All Plus features', '2 PT sessions/month', 'Sauna & recovery tools', 'Priority support'],
  },
]

const defaultGroupOptions: GroupClass[] = [
  {
    title: 'HIIT Blast',
    blurb:
      'Fast-paced, high-intensity intervals designed to burn calories and build endurance in under 45 minutes.',
  },
  {
    title: 'Strength Circuit',
    blurb:
      'Coach-led circuits focused on compound movements to increase strength, mobility, and confidence.',
  },
  {
    title: 'Yoga Flow',
    blurb:
      'A mindful session combining breathwork and dynamic poses to improve flexibility and reduce stress.',
  },
  {
    title: 'Ride & Rhythm',
    blurb:
      'Indoor cycling with music-driven intervals to power cardio fitness and have fun while you sweat.',
  },
]

export default function PlansPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [plans, setPlans] = useState<Plan[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [classes, setClasses] = useState<GroupClass[] | null>(null)
  const [classesError, setClassesError] = useState<string | null>(null)
  const [subscribeMsg, setSubscribeMsg] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [{ plans }, { classes }] = await Promise.all([
          api.getPlans(),
          api.getClasses(),
        ])
        if (!active) return
        setPlans(plans)
        setClasses(classes)
      } catch (e: any) {
        if (!active) return
        const msg = e?.message || String(e)
        console.warn('Failed to load plans/classes from API, using defaults:', msg)
        // Do independent fallbacks and errors
        try {
          const { plans } = await api.getPlans()
          if (active) setPlans(plans)
        } catch {
          if (active) {
            setError('Could not load plans from server. Showing defaults.')
            setPlans(defaultPlans)
          }
        }
        try {
          const { classes } = await api.getClasses()
          if (active) setClasses(classes)
        } catch {
          if (active) {
            setClassesError('Could not load classes from server. Showing defaults.')
            setClasses(defaultGroupOptions)
          }
        }
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const currencyFormatters = useMemo(() => new Map<string, Intl.NumberFormat>(), [])
  function formatPrice(amount: number, currency?: string) {
    const curr = currency || 'USD'
    if (!currencyFormatters.has(curr)) {
      currencyFormatters.set(curr, new Intl.NumberFormat(undefined, { style: 'currency', currency: curr }))
    }
    return currencyFormatters.get(curr)!.format(amount)
  }
  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-8">
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Membership Plans</h1>
        <p className="text-muted-foreground text-lg">
          Choose the plan that fits your goals. You can upgrade or cancel anytime.
        </p>
        {error && (
          <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg inline-block">{error}</p>
        )}
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {(plans ?? defaultPlans).map((p) => (
          <Card
            key={p.name}
            className={(p.highlighted ? 'border-2 border-blue-500 shadow-lg scale-105 ' : 'border border-gray-200 dark:border-gray-700 ') + 'transition-all hover:shadow-xl bg-white dark:bg-gray-900'}
          >
            <CardHeader>
              <CardTitle className="flex items-baseline justify-between">
                <span className="flex items-center gap-2">
                  {p.name === 'Basic' && <Dumbbell className="h-5 w-5 text-blue-500" />}
                  {p.name === 'Plus' && <Star className="h-5 w-5 text-purple-500" />}
                  {p.name === 'Pro' && <Crown className="h-5 w-5 text-yellow-500" />}
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{p.name}</span>
                </span>
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {formatPrice(p.price, p.currency)}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </span>
              </CardTitle>
              <CardDescription className="text-base">{p.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className={`w-full font-semibold ${p.highlighted ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700' : 'bg-gray-600 hover:bg-gray-700'}`}
                onClick={async () => {
                  setSubscribeMsg(null)
                  if (!isAuthenticated) {
                    navigate(`/register?plan=${encodeURIComponent(p.name)}`)
                    return
                  }
                  try {
                    const { url } = await api.createCheckoutSession({ planName: p.name })
                    if (url) window.location.href = url
                  } catch (e: any) {
                    setSubscribeMsg(e?.message || 'Failed to start checkout')
                  }
                }}
              >
                Choose {p.name}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </section>

      <section className="space-y-8">
        {subscribeMsg && (
          <p className="text-sm text-center text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-lg">{subscribeMsg}</p>
        )}
        <div className="space-y-3 text-center">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Group Workout Options</h2>
          <p className="text-muted-foreground text-lg">
            Stay motivated and push further with our coach-led classes for every level.
          </p>
          {classesError && (
            <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg inline-block">{classesError}</p>
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {(classes ?? defaultGroupOptions).map((g) => (
            <Card key={g.title} className="border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow bg-white dark:bg-gray-900">
              <CardHeader>
                <CardTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{g.title}</CardTitle>
                <CardDescription className="text-base">{g.blurb}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
