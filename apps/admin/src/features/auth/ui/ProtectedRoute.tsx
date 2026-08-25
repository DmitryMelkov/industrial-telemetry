import { Navigate, Outlet } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { CenterSpinner } from '@shared/ui/CenterSpinner';
import { authStore } from '../model/auth.store';

export const ProtectedRoute = observer(function ProtectedRoute() {
  if (authStore.status !== 'ready') {
    return <CenterSpinner />;
  }

  if (!authStore.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
});
