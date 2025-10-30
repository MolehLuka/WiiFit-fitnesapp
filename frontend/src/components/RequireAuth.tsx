import { ReactNode, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAuth } from '@/context/AuthContext'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, hydrating } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!hydrating && !isAuthenticated) {
      navigate('/login', { replace: true, state: { from: location } })
    }
  }, [hydrating, isAuthenticated, navigate, location])

  if (hydrating) return null
  if (!isAuthenticated) return null
  return <>{children}</>
}
