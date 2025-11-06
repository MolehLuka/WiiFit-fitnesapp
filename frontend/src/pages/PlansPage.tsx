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
    <div className="mx-auto max-w-5xl space-y-16">
      <section className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Membership plans</h1>
        <p className="text-muted-foreground">
          Choose the plan that fits your goals. You can upgrade or cancel anytime.
        </p>
        {error && (
          <p className="text-xs text-amber-600">{error}</p>
        )}
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {(plans ?? defaultPlans).map((p) => (
          <Card
            key={p.name}
            className={(p.highlighted ? 'border-primary ' : '') + 'transition hover:shadow-lg'}
          >
            <CardHeader>
              <CardTitle className="flex items-baseline justify-between">
                <span className="flex items-center gap-2">
                  {p.name === 'Basic' && <Dumbbell className="h-4 w-4" />}
                  {p.name === 'Plus' && <Star className="h-4 w-4" />}
                  {p.name === 'Pro' && <Crown className="h-4 w-4" />}
                  {p.name}
                </span>
                <span className="text-2xl font-semibold">
                  {formatPrice(p.price, p.currency)}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </span>
              </CardTitle>
              <CardDescription>{p.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={p.highlighted ? 'default' : 'secondary'}
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

      <section className="space-y-6">
        {subscribeMsg && (
          <p className="text-sm text-center text-emerald-700">{subscribeMsg}</p>
        )}
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold">Group workout options</h2>
          <p className="text-muted-foreground">
            Stay motivated and push further with our coach-led classes for every level.
          </p>
          {classesError && (
            <p className="text-xs text-amber-600">{classesError}</p>
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {(classes ?? defaultGroupOptions).map((g) => (
            <Card key={g.title}>
              <CardHeader>
                <CardTitle>{g.title}</CardTitle>
                <CardDescription>{g.blurb}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
