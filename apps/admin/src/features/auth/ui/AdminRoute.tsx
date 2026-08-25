import { Navigate, Outlet } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { authStore } from '../model/auth.store';

export const AdminRoute = observer(function AdminRoute() {
  if (!authStore.isAdmin) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
});
