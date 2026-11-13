import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'

export default function NavBar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/')
    } catch {
      // signOut errors are rare (network); the session listener stays the
      // source of truth, so nothing else to do here.
    }
  }

  return (
    <nav className="navbar" aria-label="Main navigation">
      <NavLink to="/" className="navbar-brand">
        FocusRoom
      </NavLink>
      <div className="navbar-links">
        {user ? (
          <>
            <span className="navbar-user">{user.email}</span>
            <button type="button" className="navbar-button" onClick={handleSignOut}>
              Log out
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className="navbar-link">
              Log in
            </NavLink>
            <NavLink to="/signup" className="navbar-link">
              Sign up
            </NavLink>
          </>
        )}
      </div>
    </nav>
  )
}
