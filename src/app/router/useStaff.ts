import { useMe } from '../../features/auth/hooks/useMe';
import { useSession } from '../../features/auth/useSession';
import type { StaffMe } from '../../shared/api/client';

/**
 * Estado de la sesión para los guards:
 * - `none`: sin sesión guardada.
 * - `loading`: esperando GET /me (o cerrando una sesión de paciente, R17).
 * - `error`: GET /me falló sin ser 401 (R16).
 * - `staff`: sesión activa.
 */
export type StaffState =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'staff'; me: StaffMe };

export function useStaff(): StaffState {
  const { session } = useSession();
  const me = useMe();
  if (!session) return { status: 'none' };
  if (me.isError) return { status: 'error' };
  if (me.data?.kind === 'STAFF') return { status: 'staff', me: me.data };
  return { status: 'loading' };
}
