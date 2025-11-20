import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, auth as tokenStore } from '@/lib/api'
import type { User } from '@/types/user'

type AuthContextValue = {
  token: string | null
  user: User | null
  plan: { id: number; name: string; price: number; currency: string } | null
  isAuthenticated: boolean
  hydrating: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; full_name?: string }) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => tokenStore.token)
  const [user, setUser] = useState<User | null>(null)
  const [plan, setPlan] = useState<{ id: number; name: string; price: number; currency: string } | null>(null)
  const [hydrating, setHydrating] = useState<boolean>(true)

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'auth_token') setToken(tokenStore.token)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Hydrate user profile when token changes
  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      setHydrating(true)
      try {
        if (tokenStore.token) {
          const me = await api.me()
          if (!cancelled) {
            setUser(me.user)
            setPlan(me.plan ?? null)
          }
        } else {
          if (!cancelled) { setUser(null); setPlan(null) }
        }
      } catch {
        // token invalid or API unavailable -> clear
        tokenStore.clear()
        if (!cancelled) { setUser(null); setPlan(null) }
      } finally {
        if (!cancelled) setHydrating(false)
      }
    }
    hydrate()
    return () => { cancelled = true }
  }, [token])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password })
    setToken(tokenStore.token)
    // Prefer returned user if present; otherwise fetch
    if (res.user) setUser(res.user)
    else {
      try { const me = await api.me(); setUser(me.user); setPlan(me.plan ?? null) } catch { /* ignore */ }
    }
  }, [])

  const register = useCallback(async (data: { email: string; password: string; full_name?: string }) => {
    const res = await api.register(data)
    setToken(tokenStore.token)
    if (res.user) setUser(res.user)
    else {
      try { const me = await api.me(); setUser(me.user); setPlan(me.plan ?? null) } catch { /* ignore */ }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } finally {
      setToken(null)
      setUser(null)
      setPlan(null)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    if (!tokenStore.token) return
    try {
      const me = await api.me()
      setUser(me.user)
      setPlan(me.plan ?? null)
    } catch (err) {
      console.error('Failed to refresh user:', err)
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    token,
    user,
    plan,
    isAuthenticated: !!token,
    hydrating,
    login,
    register,
    logout,
    refreshUser,
  }), [token, user, plan, hydrating, login, register, logout, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
