import { FormEvent, useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { isValidEmail, validatePassword, MIN_PASSWORD_LENGTH } from '@/lib/validation'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const emailOk = isValidEmail(email)
  const pwdCheck = validatePassword(password)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // Guard on client as well
      if (!emailOk) throw new Error('Please enter a valid email')
      if (!pwdCheck.valid) throw new Error(pwdCheck.errors.join(', '))
      await register({ email, password, full_name: fullName })
      navigate('/app')
    } catch (err: any) {
      setError(err?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (isAuthenticated) {
    navigate('/app')
    return null
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-900">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Create Account
          </CardTitle>
          <CardDescription className="text-base">Start your fitness journey today.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-sm font-medium">Full Name</Label>
              <Input 
                id="full_name" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                className="border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
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
              <ul className="text-xs space-y-1 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <li className={password.length >= MIN_PASSWORD_LENGTH ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                  ✓ At least {MIN_PASSWORD_LENGTH} characters
                </li>
                <li className={/[A-Z]/.test(password) ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                  ✓ An uppercase letter
                </li>
                <li className={/[a-z]/.test(password) ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                  ✓ A lowercase letter
                </li>
                <li className={/\d/.test(password) ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                  ✓ A number
                </li>
                <li className={/[^A-Za-z0-9]/.test(password) ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                  ✓ A special character
                </li>
              </ul>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">{error}</p>}
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-2.5" 
              disabled={loading || !emailOk || !pwdCheck.valid}
            >
              {loading ? 'Creating account...' : 'Register'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 rounded-b-lg py-4">
          <span>Already have an account?</span>
          <Link to="/login" className="ml-1 font-medium text-blue-600 hover:text-purple-600 transition-colors">Login</Link>
        </CardFooter>
      </Card>
    </div>
  )
}
