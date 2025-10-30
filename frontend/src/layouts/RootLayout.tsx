import { Link, Outlet, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import ThemeToggle from '@/components/ThemeToggle'

export default function RootLayout() {
  const { isAuthenticated, logout, user } = useAuth()
  const navigate = useNavigate()

  async function onLogout() {
    await logout()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="font-semibold">WiiFit</Link>
          <nav className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <span className="hidden text-sm text-muted-foreground sm:inline">{user?.full_name || user?.email}</span>
                <Link to="/app"><Button variant="ghost">App</Button></Link>
                <Button onClick={onLogout}>Logout</Button>
              </>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost">Login</Button></Link>
                <Link to="/register"><Button>Register</Button></Link>
              </>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="container py-10">
        <Outlet />
      </main>
    </div>
  )
}
