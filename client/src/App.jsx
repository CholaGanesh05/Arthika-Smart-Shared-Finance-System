import { lazy, Suspense, useState } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { LoadingScreen } from './components/LoadingScreen'
import { useAuth } from './context/AuthContext'
import { SplashScreen } from './components/SplashScreen'
import ProtectedRoute from './routes/ProtectedRoute'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const FundPage = lazy(() => import('./pages/FundPage'))
const GroupPage = lazy(() => import('./pages/GroupPage'))
const LandingPage = lazy(() => import('./pages/LandingPage'))
const Login = lazy(() => import('./pages/Login'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Register = lazy(() => import('./pages/Register'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const CookiePage = lazy(() => import('./pages/CookiePage'))

function PublicOnlyRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return <LoadingScreen />
  }

  if (isAuthenticated) {
    return <Navigate replace to="/dashboard" />
  }

  return <Outlet />
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  return (
    <Suspense fallback={<LoadingScreen />}>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <Routes>
        <Route element={<LandingPage />} path="/" />
        <Route element={<TermsPage />} path="/terms" />
        <Route element={<PrivacyPage />} path="/privacy" />
        <Route element={<CookiePage />} path="/cookies" />

        <Route element={<PublicOnlyRoute />}>
          <Route element={<Login />} path="/login" />
          <Route element={<Register />} path="/register" />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route element={<Dashboard />} path="/dashboard" />
            <Route element={<SettingsPage />} path="/settings" />
            <Route element={<GroupPage />} path="/groups/:groupId" />
            <Route element={<AnalyticsPage />} path="/groups/:groupId/analytics" />
            <Route element={<SettingsPage />} path="/groups/:groupId/settings" />
            <Route element={<FundPage />} path="/funds/:fundId" />
          </Route>
        </Route>

        <Route element={<NotFound />} path="*" />
      </Routes>
    </Suspense>
  )
}
