import { FormEvent, useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { isValidEmail, MIN_PASSWORD_LENGTH } from '@/lib/validation'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const emailOk = isValidEmail(email)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (!emailOk) throw new Error('Please enter a valid email')
      if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  await login(email, password)
      navigate('/app')
    } catch (err: any) {
      setError(err?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  // If already logged in, redirect away
  if (isAuthenticated) {
    navigate('/app')
    return null
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-900">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-base">Sign in to continue your training journey.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
              />
              {email.length > 0 && !emailOk && (
                <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">Enter a valid email address</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">{error}</p>}
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-2.5" 
              disabled={loading || !emailOk || password.length < MIN_PASSWORD_LENGTH}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 rounded-b-lg py-4">
          <span>Don&apos;t have an account? </span>
          <Link to="/register" className="ml-1 font-medium text-blue-600 hover:text-purple-600 transition-colors">Register</Link>
        </CardFooter>
      </Card>
    </div>
  )
}
