import { Navigate } from 'react-router';
import { ProfileError } from '../../features/auth/components/ProfileError';
import { LoadingState } from '../../shared/ui/LoadingState';
import { HOME_BY_ROLE } from './roleMatrix';
import { useStaff } from './useStaff';

/** `/` (y rutas desconocidas): a la pantalla de inicio del rol, o a /login sin sesión (R18, R20, D13). */
export function HomeRedirect() {
  const staff = useStaff();
  switch (staff.status) {
    case 'none':
      return <Navigate to="/login" replace />;
    case 'error':
      return <ProfileError />;
    case 'loading':
      return <LoadingState>Cargando tu perfil…</LoadingState>;
    case 'staff':
      return <Navigate to={HOME_BY_ROLE[staff.me.role]} replace />;
  }
}
