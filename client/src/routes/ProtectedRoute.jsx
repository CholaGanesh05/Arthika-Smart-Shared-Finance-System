import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LoadingScreen } from '../components/LoadingScreen'

export default function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth()
  const location = useLocation()

  if (isBootstrapping) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return <Outlet />
}
