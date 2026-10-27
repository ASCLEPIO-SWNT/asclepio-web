import { Outlet } from 'react-router';
import type { StaffRole } from '../../shared/api/client';
import { ForbiddenPage } from '../../shared/ui/ForbiddenPage';
import { HOME_BY_ROLE } from './roleMatrix';
import { useStaff } from './useStaff';

/** Guard de rol (D6, R19). Va siempre dentro de RequireSession. */
export function RequireRole({ roles }: { roles: readonly StaffRole[] }) {
  const staff = useStaff();
  if (staff.status !== 'staff') return null;
  if (!roles.includes(staff.me.role)) {
    return <ForbiddenPage homePath={HOME_BY_ROLE[staff.me.role]} />;
  }
  return <Outlet />;
}
