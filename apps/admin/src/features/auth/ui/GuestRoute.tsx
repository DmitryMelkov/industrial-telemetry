import { Navigate, Outlet } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { authStore } from '../model/auth.store';

export const GuestRoute = observer(function GuestRoute() {
  if (authStore.isAuthenticated) {
    return <Navigate to={authStore.isAdmin ? '/' : '/forbidden'} replace />;
  }

  return <Outlet />;
});
