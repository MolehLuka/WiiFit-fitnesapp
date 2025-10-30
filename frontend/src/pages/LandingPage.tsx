import { Dumbbell } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function LandingPage() {
  return (
    <section className="grid place-items-center py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground">
          <Dumbbell className="h-4 w-4" />
          WiiFit Fitness App
        </div>
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Train smarter. Track progress. Stay consistent.
        </h1>
        <p className="text-muted-foreground">
          Minimal, focused tools to manage your workouts and reach your goals.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Link to="/register"><Button>Get started</Button></Link>
          <Link to="/login"><Button variant="secondary">I have an account</Button></Link>
        </div>
      </div>

      <Card className="mt-10 w-full max-w-4xl bg-gradient-to-br from-background to-muted/30">
        <CardContent className="grid gap-4 p-6 sm:grid-cols-3">
          <Feature title="Programs" desc="Structure your weeks and track volume." />
          <Feature title="Analytics" desc="See PRs and trends over time." />
          <Feature title="Recovery" desc="Balance training and rest for longevity." />
        </CardContent>
      </Card>
    </section>
  )
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 text-left">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}
