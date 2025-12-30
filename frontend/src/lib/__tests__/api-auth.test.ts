import { describe, it, expect } from 'vitest'
import { auth } from '@/lib/api'

describe('Auth Token Management', () => {
  it('should get null token when not set', () => {
    localStorage.clear()
    expect(auth.token).toBeNull()
  })

  it('should store and retrieve token', () => {
    const testToken = 'test-token-123'
    localStorage.setItem('auth_token', testToken)
    expect(auth.token).toBe(testToken)
  })

  it('should clear token from storage', () => {
    localStorage.setItem('auth_token', 'test-token')
    auth.clear()
    expect(auth.token).toBeNull()
  })

  it('should return empty header when no token', () => {
    localStorage.clear()
    const headers = auth.header()
    expect(headers).toEqual({})
  })

  it('should return authorization header when token exists', () => {
    const testToken = 'bearer-token-xyz'
    localStorage.setItem('auth_token', testToken)
    const headers = auth.header()
    expect(headers).toHaveProperty('Authorization')
    expect(headers.Authorization).toBe(`Bearer ${testToken}`)
  })
})
