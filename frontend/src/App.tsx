import { Link, Route, Routes } from 'react-router'
import { Button } from '@/components/ui/button'

function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="font-semibold">WiiFit</Link>
          <nav className="flex gap-2">
            <Link to="/login"><Button variant="ghost">Login</Button></Link>
            <Link to="/register"><Button>Register</Button></Link>
          </nav>
        </div>
      </header>
      <main className="container py-10">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Welcome to WiiFit</h1>
        <p className="text-muted-foreground">Your gym and fitness companion app.</p>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  )
}
