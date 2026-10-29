import { RouteError } from '../../shared/ui/RouteError';
import { HOME_BY_ROLE } from './roleMatrix';
import { useStaff } from './useStaff';

/** `errorElement` de las rutas (UI-03-web R8): «Volver al inicio» = inicio del rol o `/`. */
export function AppRouteError() {
  const staff = useStaff();
  return (
    <RouteError
      homePath={staff.status === 'staff' ? HOME_BY_ROLE[staff.me.role] : '/'}
    />
  );
}

/** `errorElement` de las rutas públicas: «Volver al inicio» siempre es `/`. */
export function PublicRouteError() {
  return <RouteError homePath="/" />;
}
