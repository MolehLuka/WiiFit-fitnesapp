import { useEffect, useMemo, useState } from 'react'
import { api, type ClassSession, type GroupClass } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

function groupByDate(sessions: ClassSession[]) {
  return sessions.reduce<Record<string, ClassSession[]>>((acc, s) => {
    const d = new Date(s.starts_at)
    const key = d.toISOString().slice(0, 10) // YYYY-MM-DD
    acc[key] = acc[key] || []
    acc[key].push(s)
    return acc
  }, {})
}

export default function SchedulePage() {
  const [sessions, setSessions] = useState<ClassSession[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [classes, setClasses] = useState<GroupClass[] | null>(null)

  // Filters
  const today = useMemo(() => new Date(), [])
  const defaultFrom = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()), [today])
  const defaultTo = useMemo(() => new Date(defaultFrom.getTime() + 7 * 24 * 60 * 60 * 1000), [defaultFrom])
  const [fromDate, setFromDate] = useState<string>(defaultFrom.toISOString().slice(0, 10))
  const [toDate, setToDate] = useState<string>(defaultTo.toISOString().slice(0, 10))
  const [classFilter, setClassFilter] = useState<string>('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        // Load classes for filter dropdown (once)
        try {
          const { classes } = await api.getClasses()
          if (active) setClasses(classes)
        } catch {
          if (active) setClasses([])
        }
        // Load schedule for selected date range
        const fromIso = new Date(fromDate).toISOString()
        const toIso = new Date(new Date(toDate).setHours(23,59,59,999)).toISOString()
        const { sessions } = await api.getSchedule({ from: fromIso, to: toIso })
        if (!active) return
        setSessions(sessions)
      } catch (e: any) {
        if (!active) return
        setError(e?.message || 'Failed to load schedule')
        setSessions([])
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // Refetch sessions when date range changes
  useEffect(() => {
    let active = true
    ;(async () => {
      // basic guard for invalid date range
      const from = new Date(fromDate)
      const to = new Date(toDate)
      if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
        setError('Invalid date range');
        return
      }
      setError(null)
      try {
        const fromIso = from.toISOString()
        const toIso = new Date(to.setHours(23,59,59,999)).toISOString()
        const { sessions } = await api.getSchedule({ from: fromIso, to: toIso })
        if (!active) return
        setSessions(sessions)
      } catch (e: any) {
        if (!active) return
        setError(e?.message || 'Failed to load schedule')
        setSessions([])
      }
    })()
    return () => { active = false }
  }, [fromDate, toDate])

  const filteredSessions = useMemo(() => {
    if (!sessions) return null
    return sessions.filter(s => !classFilter || s.class_title === classFilter)
  }, [sessions, classFilter])

  const grouped = useMemo(() => (filteredSessions ? groupByDate(filteredSessions) : {}), [filteredSessions])
  const days = useMemo(() => Object.keys(grouped).sort(), [grouped])

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <p className="text-muted-foreground text-sm">Available group workouts for the next 7 days</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </header>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="from">From</Label>
              <input
                id="from"
                type="date"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to">To</Label>
              <input
                id="to"
                type="date"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="class">Class</Label>
              <select
                id="class"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="">All classes</option>
                {(classes || []).map((c) => (
                  <option key={c.title} value={c.title}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {sessions === null ? (
        <p className="text-center text-sm text-muted-foreground">Loading schedule…</p>
      ) : days.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No sessions available in this period.</p>
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <section key={day} className="space-y-3">
              <h2 className="text-lg font-semibold">{new Date(day).toLocaleDateString()}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {grouped[day].map((s) => (
                  <Card key={s.id} className="transition hover:shadow">
                    <CardHeader>
                      <CardTitle className="text-base">{s.class_title}</CardTitle>
                      <CardDescription>{s.class_blurb}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>
                          {new Date(s.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {` · ${s.duration_min} min`}
                        </span>
                        <span>Capacity: {s.capacity}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
