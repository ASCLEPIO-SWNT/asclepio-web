import { Navigate, Outlet, useLocation } from 'react-router';
import { ProfileError } from '../../features/auth/components/ProfileError';
import { useSession } from '../../features/auth/useSession';
import { LoadingState } from '../../shared/ui/LoadingState';
import { useStaff } from './useStaff';
import { useI18n } from '../../shared/i18n';

/** Guard de ruta protegida (D6): R18, R11, R16 y R17. */
export function RequireSession() {
  const { t } = useI18n();
  const staff = useStaff();
  const { endReason } = useSession();
  const location = useLocation();
  switch (staff.status) {
    case 'none':
      // UI-04-web R1 (D1): tras un cierre voluntario no hay ruta de origen; el siguiente login,
      // del mismo rol o de otro, abre el inicio de su rol (también al pulsar «Atrás»).
      if (endReason === 'logout') return <Navigate to="/login" replace />;
      // R18 / PA-7: la ruta de origen va en el estado de navegación, nunca en la URL. Incluye el
      // search (filtros como siteId y offset, sin datos personales; UI-03-web R19, D14).
      return (
        <Navigate
          to="/login"
          replace
          state={{ from: `${location.pathname}${location.search}` }}
        />
      );
    case 'error':
      return <ProfileError />;
    case 'loading':
      return <LoadingState>{t('common_profile_loading')}</LoadingState>;
    case 'staff':
      return <Outlet />;
  }
}
