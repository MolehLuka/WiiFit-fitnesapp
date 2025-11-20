import { useEffect, useMemo, useState } from 'react'
import { api, type ClassSession, type GroupClass } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'

function groupByDate(sessions: ClassSession[]) {
  return sessions.reduce<Record<string, ClassSession[]>>((acc, s) => {
    const d = new Date(s.starts_at)
    const key = d.toISOString().slice(0, 10) // YYYY-MM-DD
    acc[key] = acc[key] || []
    acc[key].push(s)
    return acc
  }, {})
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function SchedulePage() {
  const [sessions, setSessions] = useState<ClassSession[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [classes, setClasses] = useState<GroupClass[] | null>(null)
  const [trainerAvailability, setTrainerAvailability] = useState<any[] | null>(null)
  const [trainerError, setTrainerError] = useState<string | null>(null)
  const [loadingTrainer, setLoadingTrainer] = useState<boolean>(false)
  const [bookingInProgress, setBookingInProgress] = useState<number | null>(null)
  const { user } = useAuth()

  // Tabs: 'classes' | 'trainers'
  const [tab, setTab] = useState<'classes' | 'trainers'>('classes')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 9 // 3x3 grid

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

  const groupedSessions = useMemo(() => {
    if (!filteredSessions) return {}
    return groupByDate(filteredSessions)
  }, [filteredSessions])

  const sortedDays = useMemo(() => {
    return Object.keys(groupedSessions).sort()
  }, [groupedSessions])

  const groupedTrainers = useMemo(() => {
    if (!trainerAvailability) return {}
    return trainerAvailability.reduce<Record<string, any[]>>((acc, a) => {
      const d = new Date(a.starts_at)
      const key = d.toISOString().slice(0, 10)
      acc[key] = acc[key] || []
      acc[key].push(a)
      return acc
    }, {})
  }, [trainerAvailability])

  const sortedTrainerDays = useMemo(() => {
    return Object.keys(groupedTrainers).sort()
  }, [groupedTrainers])

  // Pagination for classes
  const allClassSessions = useMemo(() => {
    const sessions: Array<{ day: string; session: ClassSession }> = []
    sortedDays.forEach(day => {
      const daySessions = groupedSessions[day].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      )
      daySessions.forEach(session => sessions.push({ day, session }))
    })
    return sessions
  }, [sortedDays, groupedSessions])

  const totalClassPages = Math.ceil(allClassSessions.length / itemsPerPage)
  const paginatedClassSessions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return allClassSessions.slice(start, start + itemsPerPage)
  }, [allClassSessions, currentPage, itemsPerPage])

  // Pagination for trainers
  const allTrainerSlots = useMemo(() => {
    const slots: Array<{ day: string; slot: any }> = []
    sortedTrainerDays.forEach(day => {
      const daySlots = groupedTrainers[day].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      )
      daySlots.forEach(slot => slots.push({ day, slot }))
    })
    return slots
  }, [sortedTrainerDays, groupedTrainers])

  const totalTrainerPages = Math.ceil(allTrainerSlots.length / itemsPerPage)
  const paginatedTrainerSlots = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return allTrainerSlots.slice(start, start + itemsPerPage)
  }, [allTrainerSlots, currentPage, itemsPerPage])

  // Reset to page 1 when switching tabs or changing filters
  useEffect(() => {
    setCurrentPage(1)
  }, [tab, classFilter, fromDate, toDate])

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Schedule
        </h1>
        <p className="text-muted-foreground">Book group classes or personal training sessions</p>
      </header>

      {/* Tab Selection */}
      <div className="flex gap-3">
        <button
          onClick={() => setTab('classes')}
          className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
            tab === 'classes'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
          }`}
        >
          Group Classes
        </button>
        <button
          onClick={() => setTab('trainers')}
          className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
            tab === 'trainers'
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
          }`}
        >
          Personal Training
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="from">From Date</Label>
              <input
                id="from"
                type="date"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To Date</Label>
              <input
                id="to"
                type="date"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            {tab === 'classes' && (
              <div className="space-y-2">
                <Label htmlFor="class">Filter by Class</Label>
                <select
                  id="class"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none"
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                >
                  <option value="">All Classes</option>
                  {(classes || []).map((c) => (
                    <option key={c.title} value={c.title}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Messages */}
      {error && tab === 'classes' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      {trainerError && tab === 'trainers' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{trainerError}</p>
        </div>
      )}

      {/* Classes Tab */}
      {tab === 'classes' && (
        <>
          {sessions === null ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading schedule...</p>
            </div>
          ) : allClassSessions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-muted-foreground">No classes available for this date range.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, allClassSessions.length)} of {allClassSessions.length} sessions
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    ← Previous
                  </Button>
                  <span className="px-3 py-2 text-sm font-medium">
                    Page {currentPage} of {totalClassPages}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={currentPage === totalClassPages}
                    onClick={() => setCurrentPage(p => Math.min(totalClassPages, p + 1))}
                  >
                    Next →
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paginatedClassSessions.map(({ day, session }) => {
                  const isBooked = Number(session.user_has_booking || 0) > 0
                  const isFull = (session.booked_count || 0) >= session.capacity
                  const spotsLeft = session.capacity - (session.booked_count || 0)

                  return (
                    <div
                      key={session.id}
                      className={`rounded-lg border-2 p-5 shadow-sm hover:shadow-md transition-all ${
                        isBooked
                          ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                          : isFull
                          ? 'border-gray-300 bg-gray-100 dark:bg-gray-800 opacity-75'
                          : 'border-blue-300 bg-blue-50 dark:bg-blue-900/20'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-xs text-muted-foreground mb-1">{formatDate(day)}</div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {session.class_title}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {session.class_blurb}
                            </p>
                          </div>
                          {isBooked && (
                            <span className="ml-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">
                              BOOKED
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-700 dark:text-gray-300">
                          <div className="flex items-center gap-1">
                            <span>🕐</span>
                            <span className="font-medium">{formatTime(session.starts_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>⏱️</span>
                            <span>{session.duration_min} min</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div>
                            <span
                              className={`text-sm font-semibold ${
                                spotsLeft === 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : spotsLeft <= 3
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : 'text-green-600 dark:text-green-400'
                              }`}
                            >
                              {spotsLeft === 0 ? 'Full' : `${spotsLeft} spots left`}
                            </span>
                          </div>
                          {isBooked ? (
                            <Button
                              size="sm"
                              className="bg-red-500 hover:bg-red-600 text-white"
                              disabled={bookingInProgress === session.id}
                              onClick={async () => {
                                setBookingInProgress(session.id)
                                try {
                                  await api.cancelSession(session.id)
                                  const fromIso = new Date(fromDate).toISOString()
                                  const toIso = new Date(new Date(toDate).setHours(23, 59, 59, 999)).toISOString()
                                  const { sessions: refreshed } = await api.getSchedule({ from: fromIso, to: toIso })
                                  setSessions(refreshed)
                                } catch (e: any) {
                                  setError(e?.message || 'Cancel failed')
                                } finally {
                                  setBookingInProgress(null)
                                }
                              }}
                            >
                              {bookingInProgress === session.id ? 'Canceling...' : 'Cancel'}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                              disabled={isFull || bookingInProgress === session.id}
                              onClick={async () => {
                                setBookingInProgress(session.id)
                                try {
                                  await api.bookSession(session.id)
                                  const fromIso = new Date(fromDate).toISOString()
                                  const toIso = new Date(new Date(toDate).setHours(23, 59, 59, 999)).toISOString()
                                  const { sessions: refreshed } = await api.getSchedule({ from: fromIso, to: toIso })
                                  setSessions(refreshed)
                                } catch (e: any) {
                                  setError(e?.message || 'Book failed')
                                } finally {
                                  setBookingInProgress(null)
                                }
                              }}
                            >
                              {bookingInProgress === session.id ? 'Booking...' : 'Book Now'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination Controls Bottom */}
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  ← Previous
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalClassPages) }, (_, i) => {
                    let pageNum: number
                    if (totalClassPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalClassPages - 2) {
                      pageNum = totalClassPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        size="sm"
                        variant={currentPage === pageNum ? 'default' : 'ghost'}
                        onClick={() => setCurrentPage(pageNum)}
                        className={currentPage === pageNum ? 'bg-blue-500 hover:bg-blue-600 text-white' : ''}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentPage === totalClassPages}
                  onClick={() => setCurrentPage(p => Math.min(totalClassPages, p + 1))}
                >
                  Next →
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {/* Trainers Tab */}
      {tab === 'trainers' && (
        <>
          {loadingTrainer ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading trainer availability...</p>
            </div>
          ) : allTrainerSlots.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-muted-foreground">No trainer availability for this date range.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, allTrainerSlots.length)} of {allTrainerSlots.length} sessions
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    ← Previous
                  </Button>
                  <span className="px-3 py-2 text-sm font-medium">
                    Page {currentPage} of {totalTrainerPages}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={currentPage === totalTrainerPages}
                    onClick={() => setCurrentPage(p => Math.min(totalTrainerPages, p + 1))}
                  >
                    Next →
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paginatedTrainerSlots.map(({ day, slot }) => {
                  const isBooked = Number(slot.user_has_booking || 0) > 0
                  const isFull = slot.booked_count >= slot.capacity
                  const spotsLeft = slot.capacity - slot.booked_count

                  return (
                    <div
                      key={slot.id}
                      className={`rounded-lg border-2 p-5 shadow-sm hover:shadow-md transition-all ${
                        isBooked
                          ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                          : isFull
                          ? 'border-gray-300 bg-gray-100 dark:bg-gray-800 opacity-75'
                          : 'border-purple-300 bg-purple-50 dark:bg-purple-900/20'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-xs text-muted-foreground mb-1">{formatDate(day)}</div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {slot.trainer_name}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {slot.trainer_bio}
                            </p>
                          </div>
                          {isBooked && (
                            <span className="ml-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">
                              BOOKED
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-700 dark:text-gray-300">
                          <div className="flex items-center gap-1">
                            <span>🕐</span>
                            <span className="font-medium">{formatTime(slot.starts_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>⏱️</span>
                            <span>{slot.duration_min} min</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div>
                            <span
                              className={`text-sm font-semibold ${
                                spotsLeft === 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : spotsLeft <= 2
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : 'text-green-600 dark:text-green-400'
                              }`}
                            >
                              {spotsLeft === 0 ? 'Full' : `${spotsLeft} spots left`}
                            </span>
                          </div>
                          {isBooked ? (
                            <Button
                              size="sm"
                              className="bg-red-500 hover:bg-red-600 text-white"
                              disabled={bookingInProgress === slot.id}
                              onClick={async () => {
                                setBookingInProgress(slot.id)
                                try {
                                  await api.cancelTrainerSlot(slot.id)
                                  const fromIso = new Date(fromDate).toISOString()
                                  const toIso = new Date(new Date(toDate).setHours(23, 59, 59, 999)).toISOString()
                                  const { availability } = await api.getTrainerAvailability({ from: fromIso, to: toIso })
                                  setTrainerAvailability(availability)
                                } catch (e: any) {
                                  setTrainerError(e?.message || 'Cancel failed')
                                } finally {
                                  setBookingInProgress(null)
                                }
                              }}
                            >
                              {bookingInProgress === slot.id ? 'Canceling...' : 'Cancel'}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                              disabled={isFull || bookingInProgress === slot.id}
                              onClick={async () => {
                                setBookingInProgress(slot.id)
                                try {
                                  await api.bookTrainerSlot(slot.id)
                                  const fromIso = new Date(fromDate).toISOString()
                                  const toIso = new Date(new Date(toDate).setHours(23, 59, 59, 999)).toISOString()
                                  const { availability } = await api.getTrainerAvailability({ from: fromIso, to: toIso })
                                  setTrainerAvailability(availability)
                                } catch (e: any) {
                                  setTrainerError(e?.message || 'Book failed')
                                } finally {
                                  setBookingInProgress(null)
                                }
                              }}
                            >
                              {bookingInProgress === slot.id ? 'Booking...' : 'Book Now'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination Controls Bottom */}
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  ← Previous
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalTrainerPages) }, (_, i) => {
                    let pageNum: number
                    if (totalTrainerPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalTrainerPages - 2) {
                      pageNum = totalTrainerPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        size="sm"
                        variant={currentPage === pageNum ? 'default' : 'ghost'}
                        onClick={() => setCurrentPage(pageNum)}
                        className={currentPage === pageNum ? 'bg-purple-500 hover:bg-purple-600 text-white' : ''}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentPage === totalTrainerPages}
                  onClick={() => setCurrentPage(p => Math.min(totalTrainerPages, p + 1))}
                >
                  Next →
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
