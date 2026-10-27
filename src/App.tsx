import { Navigate, Route, Routes } from 'react-router'
import { RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './layouts/AppLayout'
import { PLANNED_MODULES } from './layouts/nav'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import OrdersPage from './pages/OrdersPage'
import PlaceholderPage from './pages/PlaceholderPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="settings/:tab?" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        {PLANNED_MODULES.map((m) => (
          <Route key={m.path} path={m.path.replace('/app/', '')} element={<PlaceholderPage />} />
        ))}
        <Route path="*" element={<NotFoundPage inApp />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
