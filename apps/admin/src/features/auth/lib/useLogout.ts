import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@entities/user';
import { authStore } from '../model/auth.store';

export function useLogout() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      authStore.clear();
      navigate('/login', { replace: true });
    },
  });
}
