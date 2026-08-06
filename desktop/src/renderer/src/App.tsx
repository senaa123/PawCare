import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider }     from '@/components/ui/Toast'
import Providers             from '@/providers/Providers'
import AuthLayout            from '@/layouts/AuthLayout'
import DashboardLayout       from '@/layouts/DashboardLayout'
import LoginPage             from '@/pages/LoginPage'
import RegisterPage          from '@/pages/RegisterPage'
import DashboardPage         from '@/pages/DashboardPage'
import CatsPage              from '@/pages/CatsPage'
import MonitoringPage        from '@/pages/MonitoringPage'
import StreamsPage           from '@/pages/StreamsPage'
import AlertsPage            from '@/pages/AlertsPage'
import AnalyticsPage         from '@/pages/AnalyticsPage'
import AutomationPage        from '@/pages/AutomationPage'

export default function App() {
  return (
    <Providers>
      <ToastProvider>
        <HashRouter>
          <Routes>
            {/* Auth routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login"    element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* Dashboard routes — protected */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard"  element={<DashboardPage />} />
              <Route path="/cats"       element={<CatsPage />} />
              <Route path="/monitoring" element={<MonitoringPage />} />
              <Route path="/streams"    element={<StreamsPage />} />
              <Route path="/alerts"     element={<AlertsPage />} />
              <Route path="/analytics"  element={<AnalyticsPage />} />
              <Route path="/automation" element={<AutomationPage />} />
            </Route>

            {/* Default */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </Providers>
  )
}
