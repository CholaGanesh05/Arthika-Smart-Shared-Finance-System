import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { LoadingScreen } from './components/LoadingScreen'
import { useAuth } from './context/AuthContext'
import Dashboard from './pages/Dashboard'
import FundPage from './pages/FundPage'
import GroupPage from './pages/GroupPage'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Register from './pages/Register'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'
import ProtectedRoute from './routes/ProtectedRoute'

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
  return (
    <Routes>
      <Route element={<LandingPage />} path="/" />

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
  )
}
