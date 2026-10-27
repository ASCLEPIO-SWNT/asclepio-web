import { Navigate, useLocation } from 'react-router';
import { LoginPage } from '../../features/auth/components/LoginPage';
import { ProfileError } from '../../features/auth/components/ProfileError';
import { canAccess, HOME_BY_ROLE } from './roleMatrix';
import { useStaff } from './useStaff';

function fromOf(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) return null;
  const from = (state as { from?: unknown }).from;
  return typeof from === 'string' ? from : null;
}

/**
 * `/login`: el formulario, o con sesión activa la redirección (R5, R20) a la ruta de
 * origen si el rol la permite (PA-7) o a la pantalla de inicio del rol.
 */
export function LoginRoute() {
  const staff = useStaff();
  const location = useLocation();
  if (staff.status === 'error') return <ProfileError />;
  if (staff.status === 'staff') {
    const { role } = staff.me;
    const from = fromOf(location.state);
    const target = from && canAccess(role, from) ? from : HOME_BY_ROLE[role];
    return <Navigate to={target} replace />;
  }
  // `none` y `loading`: LoginPage muestra su propio estado "Ingresando…" (R4, R11).
  return <LoginPage />;
}
