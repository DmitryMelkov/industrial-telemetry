import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminRoute, GuestRoute, ProtectedRoute } from '@features/auth';
import { AlertsPage } from '@pages/alerts/ui/AlertsPage';
import { ForbiddenPage } from '@pages/forbidden/ui/ForbiddenPage';
import { HomePage } from '@pages/home/ui/HomePage';
import { LoginPage } from '@pages/login/ui/LoginPage';
import { SensorCreatePage } from '@pages/sensors/ui/SensorCreatePage';
import { SensorEditPage } from '@pages/sensors/ui/SensorEditPage';
import { SensorsPage } from '@pages/sensors/ui/SensorsPage';
import { SiteDetailPage } from '@pages/sites/ui/SiteDetailPage';
import { SitesPage } from '@pages/sites/ui/SitesPage';
import { AdminShell } from '@widgets/admin-shell/ui/AdminShell';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route element={<AdminRoute />}>
          <Route element={<AdminShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/sites" element={<SitesPage />} />
            <Route path="/sites/:id" element={<SiteDetailPage />} />
            <Route path="/sensors" element={<SensorsPage />} />
            <Route path="/sensors/new" element={<SensorCreatePage />} />
            <Route path="/sensors/:id/edit" element={<SensorEditPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
