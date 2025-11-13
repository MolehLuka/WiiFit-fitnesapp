import { useEffect, useMemo, useState } from 'react'
import { api, type ClassSession, type GroupClass } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'

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
  const [trainerAvailability, setTrainerAvailability] = useState<any[] | null>(null)
  const [trainerError, setTrainerError] = useState<string | null>(null)
  const [loadingTrainer, setLoadingTrainer] = useState<boolean>(false)
  const { user } = useAuth()

  // Tabs: 'classes' | 'trainers'
  const [tab, setTab] = useState<'classes' | 'trainers'>('classes')

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
        // Load trainer availability (parallel) after schedule
        try {
          setLoadingTrainer(true)
          const { availability } = await api.getTrainerAvailability({ from: fromIso, to: toIso })
          if (active) setTrainerAvailability(availability)
        } catch (e: any) {
          if (active) setTrainerError(e?.message || 'Failed to load trainer availability')
        } finally {
          if (active) setLoadingTrainer(false)
        }
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
        try {
          setLoadingTrainer(true)
          const { availability } = await api.getTrainerAvailability({ from: fromIso, to: toIso })
          if (active) setTrainerAvailability(availability)
        } catch (e: any) {
          if (active) setTrainerError(e?.message || 'Failed to load trainer availability')
        } finally {
          if (active) setLoadingTrainer(false)
        }
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

  // Timetable construction for class sessions
  const timetableDays = useMemo(() => {
    if (!filteredSessions) return []
    const daySet = new Set(filteredSessions.map(s => new Date(s.starts_at).toISOString().slice(0,10)))
    return Array.from(daySet).sort()
  }, [filteredSessions])

  const timetableTimes = useMemo(() => {
    if (!filteredSessions) return []
    const timeSet = new Set(filteredSessions.map(s => new Date(s.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })))
    return Array.from(timeSet).sort()
  }, [filteredSessions])

  const timetableGrid = useMemo(() => {
    const grid: Record<string, Record<string, ClassSession[]>> = {}
    timetableTimes.forEach(t => { grid[t] = {} })
    timetableTimes.forEach(t => {
      timetableDays.forEach(d => { grid[t][d] = [] })
    })
    filteredSessions?.forEach(s => {
      const day = new Date(s.starts_at).toISOString().slice(0,10)
      const timeKey = new Date(s.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      if (!grid[timeKey]) grid[timeKey] = {}
      if (!grid[timeKey][day]) grid[timeKey][day] = []
      grid[timeKey][day].push(s)
    })
    return grid
  }, [filteredSessions, timetableDays, timetableTimes])

  // Timetable for trainers
  const trainerDays = useMemo(() => {
    if (!trainerAvailability) return []
    const daySet = new Set(trainerAvailability.map(a => new Date(a.starts_at).toISOString().slice(0,10)))
    return Array.from(daySet).sort()
  }, [trainerAvailability])
  const trainerTimes = useMemo(() => {
    if (!trainerAvailability) return []
    const timeSet = new Set(trainerAvailability.map(a => new Date(a.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })))
    return Array.from(timeSet).sort()
  }, [trainerAvailability])
  const trainerGrid = useMemo(() => {
    const grid: Record<string, Record<string, any[]>> = {}
    trainerTimes.forEach(t => { grid[t] = {} })
    trainerTimes.forEach(t => {
      trainerDays.forEach(d => { grid[t][d] = [] })
    })
    trainerAvailability?.forEach(a => {
      const day = new Date(a.starts_at).toISOString().slice(0,10)
      const timeKey = new Date(a.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      if (!grid[timeKey]) grid[timeKey] = {}
      if (!grid[timeKey][day]) grid[timeKey][day] = []
      grid[timeKey][day].push(a)
    })
    return grid
  }, [trainerAvailability, trainerDays, trainerTimes])

  const grouped = useMemo(() => (filteredSessions ? groupByDate(filteredSessions) : {}), [filteredSessions])
  const days = useMemo(() => Object.keys(grouped).sort(), [grouped])

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <p className="text-muted-foreground text-sm">Interactive timetable for classes & personal trainers</p>
        <div className="flex justify-center gap-2 mt-2">
          <button
            onClick={() => setTab('classes')}
            className={`text-sm px-3 py-1 rounded border ${tab==='classes' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
          >Group Workouts</button>
          <button
            onClick={() => setTab('trainers')}
            className={`text-sm px-3 py-1 rounded border ${tab==='trainers' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
          >Personal Trainers</button>
        </div>
        {(error && tab==='classes') && <p className="text-xs text-red-600">{error}</p>}
        {(trainerError && tab==='trainers') && <p className="text-xs text-red-600">{trainerError}</p>}
      </header>

      {/* Filters (shared date range + class filter only on classes tab) */}
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
            {tab === 'classes' && (
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
            )}
            {tab === 'trainers' && (
              <div className="space-y-1">
                <Label>Trainer Slots</Label>
                <p className="text-xs text-muted-foreground">Showing availability for selected range.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tab panels */}
      {tab === 'classes' && (
        sessions === null ? (
          <p className="text-center text-sm text-muted-foreground">Loading schedule…</p>
        ) : timetableDays.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No sessions available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="border px-2 py-1 text-left">Time</th>
                  {timetableDays.map(d => (
                    <th key={d} className="border px-2 py-1 text-left">{new Date(d).toLocaleDateString()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timetableTimes.map(t => (
                  <tr key={t} className="align-top">
                    <td className="border px-2 py-1 font-medium whitespace-nowrap">{t}</td>
                    {timetableDays.map(d => {
                      const cell = timetableGrid[t][d] || []
                      return (
                        <td key={d} className="border px-2 py-1 space-y-2 min-w-[160px]">
                          {cell.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                          {cell.map(s => (
                            <div key={s.id} className="rounded border p-1 bg-background/50 hover:bg-muted transition">
                              <div className="flex justify-between gap-2">
                                <span className="text-xs font-medium">{s.class_title}</span>
                                <span className="text-[10px] text-muted-foreground">{s.duration_min}m</span>
                              </div>
                              <div className="mt-1 flex items-center justify-between">
                                <span className="text-[11px]">{s.capacity - (s.booked_count || 0)} left</span>
                                {Number(s.user_has_booking || 0) > 0 ? (
                                  <button
                                    className="text-[10px] px-2 py-0.5 rounded border hover:bg-muted"
                                    onClick={async () => {
                                      try {
                                        await api.cancelSession(s.id)
                                        const fromIso = new Date(fromDate).toISOString()
                                        const toIso = new Date(new Date(toDate).setHours(23,59,59,999)).toISOString()
                                        const { sessions: refreshed } = await api.getSchedule({ from: fromIso, to: toIso })
                                        setSessions(refreshed)
                                      } catch (e: any) { setError(e?.message || 'Cancel failed') }
                                    }}
                                  >Cancel</button>
                                ) : (
                                  <button
                                    className="text-[10px] px-2 py-0.5 rounded border hover:bg-muted disabled:opacity-50"
                                    disabled={(s.booked_count || 0) >= s.capacity}
                                    onClick={async () => {
                                      try {
                                        await api.bookSession(s.id)
                                        const fromIso = new Date(fromDate).toISOString()
                                        const toIso = new Date(new Date(toDate).setHours(23,59,59,999)).toISOString()
                                        const { sessions: refreshed } = await api.getSchedule({ from: fromIso, to: toIso })
                                        setSessions(refreshed)
                                      } catch (e: any) { setError(e?.message || 'Book failed') }
                                    }}
                                  >Book</button>
                                )}
                              </div>
                            </div>
                          ))}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'trainers' && (
        loadingTrainer ? (
          <p className="text-center text-sm text-muted-foreground">Loading trainer availability…</p>
        ) : trainerDays.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No trainer availability.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="border px-2 py-1 text-left">Time</th>
                  {trainerDays.map(d => (
                    <th key={d} className="border px-2 py-1 text-left">{new Date(d).toLocaleDateString()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trainerTimes.map(t => (
                  <tr key={t} className="align-top">
                    <td className="border px-2 py-1 font-medium whitespace-nowrap">{t}</td>
                    {trainerDays.map(d => {
                      const cell = trainerGrid[t][d] || []
                      return (
                        <td key={d} className="border px-2 py-1 space-y-2 min-w-[180px]">
                          {cell.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                          {cell.map(a => (
                            <div key={a.id} className="rounded border p-1 bg-background/50 hover:bg-muted transition">
                              <div className="flex justify-between gap-2">
                                <span className="text-xs font-medium">{a.trainer_name}</span>
                                <span className="text-[10px] text-muted-foreground">{a.duration_min}m</span>
                              </div>
                              <div className="mt-1 flex items-center justify-between">
                                <span className="text-[11px]">{a.capacity - a.booked_count} left</span>
                                {Number(a.user_has_booking || 0) > 0 ? (
                                  <button
                                    className="text-[10px] px-2 py-0.5 rounded border hover:bg-muted"
                                    onClick={async () => {
                                      try {
                                        await api.cancelTrainerSlot(a.id)
                                        const fromIso = new Date(fromDate).toISOString()
                                        const toIso = new Date(new Date(toDate).setHours(23,59,59,999)).toISOString()
                                        const { availability } = await api.getTrainerAvailability({ from: fromIso, to: toIso })
                                        setTrainerAvailability(availability)
                                      } catch (e: any) { setTrainerError(e?.message || 'Cancel failed') }
                                    }}
                                  >Cancel</button>
                                ) : (
                                  <button
                                    className="text-[10px] px-2 py-0.5 rounded border hover:bg-muted disabled:opacity-50"
                                    disabled={a.booked_count >= a.capacity}
                                    onClick={async () => {
                                      try {
                                        await api.bookTrainerSlot(a.id)
                                        const fromIso = new Date(fromDate).toISOString()
                                        const toIso = new Date(new Date(toDate).setHours(23,59,59,999)).toISOString()
                                        const { availability } = await api.getTrainerAvailability({ from: fromIso, to: toIso })
                                        setTrainerAvailability(availability)
                                      } catch (e: any) { setTrainerError(e?.message || 'Book failed') }
                                    }}
                                  >Book</button>
                                )}
                              </div>
                            </div>
                          ))}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
