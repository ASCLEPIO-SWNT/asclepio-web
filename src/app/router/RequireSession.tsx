import { Navigate, Outlet, useLocation } from 'react-router';
import { ProfileError } from '../../features/auth/components/ProfileError';
import { LoadingState } from '../../shared/ui/LoadingState';
import { useStaff } from './useStaff';

/** Guard de ruta protegida (D6): R18, R11, R16 y R17. */
export function RequireSession() {
  const staff = useStaff();
  const location = useLocation();
  switch (staff.status) {
    case 'none':
      // R18 / PA-7: la ruta de origen va en el estado de navegación, nunca en la URL.
      return (
        <Navigate to="/login" replace state={{ from: location.pathname }} />
      );
    case 'error':
      return <ProfileError />;
    case 'loading':
      return <LoadingState>Cargando tu perfil…</LoadingState>;
    case 'staff':
      return <Outlet />;
  }
}
