import { createBrowserRouter, RouterProvider } from 'react-router'
import RootLayout from '@/layouts/RootLayout'
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import AppPage from '@/pages/AppPage'
import RequireAuth from '@/components/RequireAuth'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
  { path: 'app', element: <RequireAuth><AppPage /></RequireAuth> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
