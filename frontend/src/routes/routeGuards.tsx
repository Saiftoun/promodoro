import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'

export function PageLoading() {
  return <div className="page-loading">Loading…</div>
}

// Wraps routes that require a logged-in user. While the session is being
// read a neutral loading state is shown, so a logged-in user is never
// flashed to the login page. After logging in the visitor returns to the
// page they originally asked for (stored in location.state.from).
export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return <PageLoading />
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <Outlet />
}

// Wraps /login and /signup: logged-in users are redirected home.
export function PublicOnlyRoute() {
  const { user, loading } = useAuth()
  if (loading) {
    return <PageLoading />
  }
  if (user) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
