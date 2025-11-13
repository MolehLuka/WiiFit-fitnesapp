type LoginBody = { email: string; password: string }
import type { User } from '@/types/user'
export type Plan = {
  name: string
  price: number
  currency: string
  description: string
  features: string[]
  highlighted?: boolean
}
export type GroupClass = {
  title: string
  blurb: string
}
export type ClassSession = {
  id: number
  starts_at: string
  duration_min: number
  capacity: number
  class_title: string
  class_blurb: string
  booked_count?: number
  user_has_booking?: number
}
export type RegisterBody = {
  email: string
  password: string
  full_name?: string
  gender?: string
  date_of_birth?: string
  height_cm?: number
  weight_kg?: number
  goal?: string
}

// Vite injects import.meta.env types via vite/client
const BASE = (import.meta as any).env?.VITE_API_URL || ''

function getBase(path: string) {
  // if BASE is set, prefix with it; otherwise rely on Vite proxy for /api
  return BASE ? `${BASE}${path}` : path
}

function saveToken(token: string) {
  localStorage.setItem('auth_token', token)
}

export const auth = {
  get token() {
    return localStorage.getItem('auth_token')
  },
  clear() {
    localStorage.removeItem('auth_token')
  },
  header(): Record<string, string> {
    const t = localStorage.getItem('auth_token')
    return t ? { Authorization: `Bearer ${t}` } : {}
  },
}

async function handle<T>(res: Response): Promise<T> {
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) {
    throw new Error((data && data.message) || res.statusText)
  }
  return data as T
}

export const api = {
  async login(body: LoginBody) {
    const res = await fetch(getBase('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await handle<{ token: string; user?: User }>(res)
    if (data.token) saveToken(data.token)
    return data
  },
  async register(body: RegisterBody) {
    const res = await fetch(getBase('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await handle<{ token: string; user?: User }>(res)
    if (data.token) saveToken(data.token)
    return data
  },
  async me() {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...auth.header() }
    const res = await fetch(getBase('/api/protected/me'), { headers })
    return handle<{ user: User; plan: { id: number; name: string; price: number; currency: string } | null }>(res)
  },
  async logout() {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...auth.header() }
    const res = await fetch(getBase('/api/auth/logout'), {
      method: 'POST',
      headers,
    })
    await handle(res)
    auth.clear()
  },
  async getPlans() {
    const res = await fetch(getBase('/api/public/plans'))
    return handle<{ plans: Plan[] }>(res)
  },
  async getClasses() {
    const res = await fetch(getBase('/api/public/classes'))
    return handle<{ classes: GroupClass[] }>(res)
  },
  async subscribePlan(body: { planId?: number; planName?: string }) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...auth.header() }
    const res = await fetch(getBase('/api/protected/subscribe-plan'), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    return handle<{ message: string; plan: { id: number; name: string } }>(res)
  },
  async createCheckoutSession(body: { planId?: number; planName?: string }) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...auth.header() }
    const res = await fetch(getBase('/api/billing/create-checkout-session'), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    return handle<{ url: string }>(res)
  },
  async getSchedule(params?: { from?: string; to?: string }) {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const url = `/api/protected/schedule${qs.toString() ? `?${qs.toString()}` : ''}`
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...auth.header() }
    const res = await fetch(getBase(url), { headers })
    return handle<{ sessions: ClassSession[] }>(res)
  },
  async getMembershipHistory() {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...auth.header() }
    const res = await fetch(getBase('/api/protected/membership/history'), { headers })
    return handle<{ events: Array<{ id: number; event_type: string; status: string | null; stripe_object_id: string | null; amount: number | null; currency: string | null; occurred_at: string }> }>(res)
  },
  async cancelSubscription(mode: 'immediate' | 'period_end' = 'period_end') {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...auth.header() }
    const res = await fetch(getBase('/api/billing/cancel-subscription'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ mode }),
    })
    return handle<{ message: string; status: string; mode: string }>(res)
  },
  async bookSession(sessionId: number) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...auth.header() }
    const res = await fetch(getBase(`/api/protected/sessions/${sessionId}/book`), { method: 'POST', headers })
    return handle<{ message: string }>(res)
  },
  async cancelSession(sessionId: number) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...auth.header() }
    const res = await fetch(getBase(`/api/protected/sessions/${sessionId}/cancel`), { method: 'POST', headers })
    return handle<{ message: string }>(res)
  },
  async getTrainerAvailability(params?: { from?: string; to?: string }) {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const url = `/api/trainers/availability${qs.toString() ? `?${qs.toString()}` : ''}`
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...auth.header() }
    const res = await fetch(getBase(url), { headers })
    return handle<{ availability: Array<{ id: number; trainer_id: number; trainer_name: string; trainer_bio: string; starts_at: string; duration_min: number; capacity: number; booked_count: number; user_has_booking: number }> }>(res)
  },
  async bookTrainerSlot(id: number) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...auth.header() }
    const res = await fetch(getBase(`/api/trainers/availability/${id}/book`), { method: 'POST', headers })
    return handle<{ message: string }>(res)
  },
  async cancelTrainerSlot(id: number) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...auth.header() }
    const res = await fetch(getBase(`/api/trainers/availability/${id}/cancel`), { method: 'POST', headers })
    return handle<{ message: string }>(res)
  },
}
