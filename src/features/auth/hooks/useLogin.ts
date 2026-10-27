import { useMutation } from '@tanstack/react-query';
import { api } from '../../../shared/api/client';
import { session } from '../../../shared/api/session';
import { unwrap } from '../../../shared/lib/problem';
import type { LoginForm } from '../schemas';

/** POST /api/v1/auth/login (R3); en 200 guarda solo { accessToken, expiresAt } (R5, R10). */
export function useLogin() {
  return useMutation({
    mutationFn: (body: LoginForm) =>
      unwrap(() => api.POST('/api/v1/auth/login', { body })),
    retry: false,
    onSuccess: (token) => session.set(token),
  });
}
