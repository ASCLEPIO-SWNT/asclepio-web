import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/api/client';
import { unwrap } from '../../../shared/lib/problem';
import { useSession } from '../useSession';

/** Perfil de la sesión (D4): una petición por carga de la web, nunca persistido. */
export function useMe() {
  const { session } = useSession();
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => unwrap(() => api.GET('/api/v1/me')),
    enabled: session !== null,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    // Montar ProfileError no debe reintentar solo: el reintento es el botón (R16).
    retryOnMount: false,
  });
}
