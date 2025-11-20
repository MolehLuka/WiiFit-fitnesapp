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
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          <Link 
            to={isAuthenticated ? "/app" : "/"} 
            className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            WiiFit
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/plans">
              <Button variant="ghost" className="hover:bg-blue-50 dark:hover:bg-blue-900/20">Plans</Button>
            </Link>
            {isAuthenticated ? (
              <>
                <span className="hidden text-sm text-muted-foreground sm:inline px-2">
                  {user?.full_name || user?.email}
                </span>
                <Link to="/app">
                  <Button variant="ghost" className="hover:bg-blue-50 dark:hover:bg-blue-900/20">Dashboard</Button>
                </Link>
                <Link to="/app/schedule">
                  <Button variant="ghost" className="hover:bg-purple-50 dark:hover:bg-purple-900/20">Schedule</Button>
                </Link>
                <Link to="/app/profile">
                  <Button variant="ghost" className="hover:bg-purple-50 dark:hover:bg-purple-900/20">Profile</Button>
                </Link>
                <Link to="/app/membership">
                  <Button variant="ghost" className="hover:bg-purple-50 dark:hover:bg-purple-900/20">Membership</Button>
                </Link>
                <Button 
                  onClick={onLogout}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="hover:bg-blue-50 dark:hover:bg-blue-900/20">Login</Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                    Register
                  </Button>
                </Link>
              </>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="container py-10 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
