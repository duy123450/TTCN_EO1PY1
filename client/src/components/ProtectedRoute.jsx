import { Navigate, useLocation } from 'react-router-dom'
import Loading from './Loading'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children, allowedRoles = ['MANAGER', 'EMPLOYEE'] }) => {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <Loading />
  }

  if (!isAuthenticated || !user) {
    return <Navigate to='/login' replace state={{ from: location.pathname }} />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to='/dashboard' replace />
  }

  return children
}

export const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <Loading />
  }

  if (isAuthenticated) {
    return <Navigate to='/dashboard' replace />
  }

  return children
}

export default ProtectedRoute
