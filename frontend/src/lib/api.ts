type LoginBody = { email: string; password: string }
import type { User } from '@/types/user'
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
    return handle<{ user: User }>(res)
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
}
