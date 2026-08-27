import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userKeys, usersApi, type CreateUserPayload, type UpdateUserPayload } from '@entities/user';

export function useUsersQuery() {
  return useQuery({
    queryKey: userKeys.all,
    queryFn: usersApi.list,
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      usersApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
