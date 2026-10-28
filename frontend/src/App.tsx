
import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import Login from './pages/login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import { getAccessToken } from './Services/auth'

function ProtectedRoute({ children }: { children: ReactNode }) {
  return getAccessToken()
    ? <>{children}</>
    : <Navigate to="/login" replace />
}

function GuestRoute({ children }: { children: ReactNode }) {
  return getAccessToken()
    ? <Navigate to="/dashboard" replace />
    : <>{children}</>
}

function App() {
  const token = getAccessToken()

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={token ? '/dashboard' : '/login'} replace />}
        />

        <Route
          path="/login"
          element={<GuestRoute><Login /></GuestRoute>}
        />

        <Route
          path="/register"
          element={<GuestRoute><Register /></GuestRoute>}
        />

        <Route
          path="/dashboard"
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
        />

        <Route
          path="*"
          element={<Navigate to={getAccessToken() ? '/dashboard' : '/login'} replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
