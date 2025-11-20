import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'

type ClassBooking = {
  id: number
  session_id: number
  status: string
  created_at: string
  starts_at: string
  duration_min: number
  capacity: number
  class_id: number
  class_title: string
  class_blurb: string
  booking_type: 'class'
}

type TrainerBooking = {
  id: number
  availability_id: number
  status: string
  created_at: string
  starts_at: string
  duration_min: number
  capacity: number
  trainer_id: number
  trainer_name: string
  trainer_bio: string
  booking_type: 'trainer'
}

export default function ProfilePage() {
  const { user, plan } = useAuth()
  const [classBookings, setClassBookings] = useState<ClassBooking[]>([])
  const [trainerBookings, setTrainerBookings] = useState<TrainerBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<ClassBooking | TrainerBooking | null>(null)
  const [cancelingId, setCancelingId] = useState<number | null>(null)

  useEffect(() => {
    loadBookings()
  }, [])

  async function loadBookings() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getBookings()
      setClassBookings(data.classBookings)
      setTrainerBookings(data.trainerBookings)
    } catch (e: any) {
      setError(e?.message || 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel(booking: ClassBooking | TrainerBooking) {
    setCancelingId(booking.id)
    try {
      if (booking.booking_type === 'class') {
        await api.cancelSession(booking.session_id)
      } else {
        await api.cancelTrainerSlot(booking.availability_id)
      }
      await loadBookings()
      setSelectedBooking(null)
    } catch (e: any) {
      alert(e?.message || 'Failed to cancel booking')
    } finally {
      setCancelingId(null)
    }
  }

  function formatDateTime(dateStr: string) {
    const date = new Date(dateStr)
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
  }

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

  const statusInfo = getStatusDisplay(user?.membership_status)
  const allBookings = [...classBookings, ...trainerBookings].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  )

  const upcomingBookings = allBookings.filter(b => new Date(b.starts_at) > new Date())
  const pastBookings = allBookings.filter(b => new Date(b.starts_at) <= new Date())

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          My Profile
        </h1>
        <p className="text-lg text-muted-foreground">Manage your account and view your bookings</p>
      </div>

      {/* User Information Card */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl font-semibold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Account Information
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{user?.full_name || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gender</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{user?.gender || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {user?.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : 'Not provided'}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Height</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {user?.height_cm ? `${user.height_cm} cm` : 'Not provided'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Weight</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {user?.weight_kg ? `${user.weight_kg} kg` : 'Not provided'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fitness Goal</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{user?.goal || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Membership Status</p>
              <span className={`inline-block text-sm font-bold px-3 py-1 rounded-lg ${statusInfo.color}`}>
                {statusInfo.text}
              </span>
            </div>
          </div>
        </div>
        {plan && (
          <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
            <p className="text-sm text-muted-foreground">Current Plan</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {plan.name}
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {new Intl.NumberFormat(undefined, { style: 'currency', currency: plan.currency }).format(plan.price)}/month
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bookings Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          My Bookings
        </h2>

        {loading && (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-muted-foreground">Loading bookings...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && allBookings.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-muted-foreground mb-4">You haven't booked any sessions yet.</p>
            <Button 
              onClick={() => window.location.href = '/app/schedule'}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              Browse Schedule
            </Button>
          </div>
        )}

        {!loading && !error && upcomingBookings.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Upcoming Sessions ({upcomingBookings.length})
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {upcomingBookings.map(booking => {
                const { date, time } = formatDateTime(booking.starts_at)
                const isClass = booking.booking_type === 'class'
                return (
                  <div
                    key={`${booking.booking_type}-${booking.id}`}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            isClass 
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                          }`}>
                            {isClass ? 'Group Class' : 'Personal Training'}
                          </span>
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {isClass ? (booking as ClassBooking).class_title : (booking as TrainerBooking).trainer_name}
                        </h4>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCancel(booking)
                        }}
                        disabled={cancelingId === booking.id}
                      >
                        {cancelingId === booking.id ? 'Canceling...' : 'Cancel'}
                      </Button>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>📅</span>
                        <span>{date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>🕐</span>
                        <span>{time} ({booking.duration_min} min)</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!loading && !error && pastBookings.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Past Sessions ({pastBookings.length})
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {pastBookings.map(booking => {
                const { date, time } = formatDateTime(booking.starts_at)
                const isClass = booking.booking_type === 'class'
                return (
                  <div
                    key={`${booking.booking_type}-${booking.id}`}
                    className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            isClass 
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                          }`}>
                            {isClass ? 'Group Class' : 'Personal Training'}
                          </span>
                          <span className="text-xs font-medium px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            Completed
                          </span>
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {isClass ? (booking as ClassBooking).class_title : (booking as TrainerBooking).trainer_name}
                        </h4>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>📅</span>
                        <span>{date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>🕐</span>
                        <span>{time} ({booking.duration_min} min)</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedBooking(null)}
        >
          <div 
            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-blue-200 dark:border-blue-700 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      selectedBooking.booking_type === 'class'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                    }`}>
                      {selectedBooking.booking_type === 'class' ? 'Group Class' : 'Personal Training'}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {selectedBooking.booking_type === 'class' 
                      ? (selectedBooking as ClassBooking).class_title 
                      : (selectedBooking as TrainerBooking).trainer_name}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Date</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {formatDateTime(selectedBooking.starts_at).date}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Time</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {formatDateTime(selectedBooking.starts_at).time}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Duration</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {selectedBooking.duration_min} minutes
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Capacity</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {selectedBooking.capacity} {selectedBooking.capacity === 1 ? 'person' : 'people'}
                    </p>
                  </div>
                </div>
              </div>

              {selectedBooking.booking_type === 'class' && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Class Description</p>
                  <p className="text-gray-900 dark:text-gray-100 leading-relaxed">
                    {(selectedBooking as ClassBooking).class_blurb}
                  </p>
                </div>
              )}

              {selectedBooking.booking_type === 'trainer' && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">About Your Trainer</p>
                  <p className="text-gray-900 dark:text-gray-100 leading-relaxed">
                    {(selectedBooking as TrainerBooking).trainer_bio}
                  </p>
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Booked On</p>
                <p className="text-gray-900 dark:text-gray-100">
                  {new Date(selectedBooking.created_at).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {new Date(selectedBooking.starts_at) > new Date() && (
                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    onClick={() => handleCancel(selectedBooking)}
                    disabled={cancelingId === selectedBooking.id}
                  >
                    {cancelingId === selectedBooking.id ? 'Canceling...' : 'Cancel Booking'}
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setSelectedBooking(null)}
                  >
                    Close
                  </Button>
                </div>
              )}

              {new Date(selectedBooking.starts_at) <= new Date() && (
                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  onClick={() => setSelectedBooking(null)}
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
