import { useQuery } from '@tanstack/react-query';
import { api, type PublicSite } from '../api/client';
import { unwrap } from '../lib/problem';
import { useCurrentStaff } from './useCurrentStaff';

export const SITES_ERROR_MESSAGE = 'No se pudieron cargar las sedes.';

/** El tenant del perfil no está en `GET /public/tenants` (R5). */
export class TenantNotFoundError extends Error {
  constructor() {
    super('Tenant not found in /public/tenants');
    this.name = 'TenantNotFoundError';
  }
}

/**
 * Sedes del tenant de la sesión (D3, R4, R5): `GET /public/tenants` filtrado por el
 * `tenantId` del perfil, pedido como mucho una vez por sesión (la caché se vacía al
 * cerrar sesión). Tras un error solo se vuelve a pedir con "Reintentar".
 */
export function useSites() {
  const { tenantId } = useCurrentStaff();
  return useQuery<PublicSite[]>({
    queryKey: ['sites'],
    queryFn: async () => {
      const tenants = await unwrap(() => api.GET('/api/v1/public/tenants'));
      const tenant = tenants.find((t) => t.id === tenantId);
      if (!tenant) throw new TenantNotFoundError();
      return tenant.sites;
    },
    staleTime: Infinity,
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
