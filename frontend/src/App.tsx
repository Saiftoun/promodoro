import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar.js'
import { ProtectedRoute, PublicOnlyRoute } from './routes/routeGuards.js'
import TimerPage from './pages/TimerPage.js'
import LoginPage from './pages/LoginPage.js'
import SignupPage from './pages/SignupPage.js'
import RoomsPage from './pages/RoomsPage.js'

function Layout() {
  return (
    <>
      <NavBar />
      <main>
        <Outlet />
      </main>
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<TimerPage />} />
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/rooms/:roomId" element={<RoomsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
