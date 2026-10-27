import { NavLink, Outlet, useNavigate } from 'react-router';
import { logout } from '../../features/auth/logout';
import { CurrentStaffProvider } from '../../shared/hooks/useCurrentStaff';
import { ROLE_LABELS, routesFor } from './roleMatrix';
import { useStaff } from './useStaff';

/** Marco de las vistas protegidas: usuario, rol, navegación por rol y "Cerrar sesión" (R21, R22); provee el perfil a las features (D2 de F-02-web). */
export function AppShell() {
  const staff = useStaff();
  const navigate = useNavigate();
  if (staff.status !== 'staff') return null;
  const { fullName, role } = staff.me;

  const onLogout = () => {
    // Primero se cierra la sesión (efectos) y luego se reemplaza la entrada actual por /login.
    logout();
    void navigate('/login', { replace: true });
  };

  return (
    <div className="shell">
      <section className="shell__bar" aria-label="Sesión">
        <p className="shell__user">
          <strong>{fullName}</strong>
          <span className="shell__role">{ROLE_LABELS[role]}</span>
        </p>
        <nav aria-label="Principal" className="shell__nav">
          <ul>
            {routesFor(role).map((route) => (
              <li key={route.path}>
                <NavLink to={route.path}>{route.navLabel}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <button type="button" className="button" onClick={onLogout}>
          Cerrar sesión
        </button>
      </section>
      <CurrentStaffProvider me={staff.me}>
        <Outlet />
      </CurrentStaffProvider>
    </div>
  );
}
