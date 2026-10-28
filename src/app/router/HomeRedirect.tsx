import { Navigate } from 'react-router';
import { ProfileError } from '../../features/auth/components/ProfileError';
import { LoadingState } from '../../shared/ui/LoadingState';
import { HOME_BY_ROLE } from './roleMatrix';
import { useStaff } from './useStaff';
import { useI18n } from '../../shared/i18n';

/** `/` (y rutas desconocidas): a la pantalla de inicio del rol, o a /login sin sesión (R18, R20, D13). */
export function HomeRedirect() {
  const staff = useStaff();
  const { t } = useI18n();
  switch (staff.status) {
    case 'none':
      return <Navigate to="/login" replace />;
    case 'error':
      return <ProfileError />;
    case 'loading':
      return <LoadingState>{t('common_profile_loading')}</LoadingState>;
    case 'staff':
      return <Navigate to={HOME_BY_ROLE[staff.me.role]} replace />;
  }
}
