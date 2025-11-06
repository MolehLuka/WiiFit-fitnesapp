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
    <div className="mx-auto w-full max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Start tracking your training today.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              {email.length > 0 && !emailOk && (
                <p className="text-xs text-red-600">Enter a valid email address</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-0.5">
                <li className={password.length >= MIN_PASSWORD_LENGTH ? 'text-green-600' : ''}>At least {MIN_PASSWORD_LENGTH} characters</li>
                <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>An uppercase letter</li>
                <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>A lowercase letter</li>
                <li className={/\d/.test(password) ? 'text-green-600' : ''}>A number</li>
                <li className={/[^A-Za-z0-9]/.test(password) ? 'text-green-600' : ''}>A special character</li>
              </ul>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || !emailOk || !pwdCheck.valid}>
              {loading ? 'Creating account...' : 'Register'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          <span>Already have an account?</span>
          <Link to="/login" className="ml-1 underline">Login</Link>
        </CardFooter>
      </Card>
    </div>
  )
}
