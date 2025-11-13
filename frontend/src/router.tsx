import { createBrowserRouter, RouterProvider } from 'react-router'
import RootLayout from '@/layouts/RootLayout'
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import AppPage from '@/pages/AppPage'
import RequireAuth from '@/components/RequireAuth'
import PlansPage from '@/pages/PlansPage'
import SchedulePage from '@/pages/SchedulePage'
import BillingSuccessPage from '@/pages/BillingSuccessPage'
import BillingCancelPage from '@/pages/BillingCancelPage'
import MembershipHistoryPage from '@/pages/MembershipHistoryPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
    { path: 'plans', element: <PlansPage /> },
    { path: 'billing/success', element: <BillingSuccessPage /> },
    { path: 'billing/cancel', element: <BillingCancelPage /> },
  { path: 'app', element: <RequireAuth><AppPage /></RequireAuth> },
  { path: 'app/schedule', element: <RequireAuth><SchedulePage /></RequireAuth> },
  { path: 'app/membership', element: <RequireAuth><MembershipHistoryPage /></RequireAuth> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
