import type { StaffRole } from '../../shared/api/client';

/** Matriz de roles (design.md D7, PA-4 aceptada). Única fuente para R19, R20, R21 y R23 de F-01-web y R1–R2 de F-02-web. */
export interface RoleRoute {
  path: string;
  /** Encabezado del marcador (R23). */
  title: string;
  /** Texto del enlace en la navegación (R21). */
  navLabel: string;
  /** Feature que trae la pantalla real. */
  feature: string;
  roles: readonly StaffRole[];
  /** Subrutas con los mismos roles (D4 de F-02-web), p. ej. `/atenciones/:id`. */
  subpaths?: readonly string[];
}

export const ROLE_ROUTES: readonly RoleRoute[] = [
  {
    path: '/recepcion',
    title: 'Recepción — bandeja de pre-registros',
    navLabel: 'Recepción',
    feature: 'F-02-web',
    roles: ['RECEPTION'],
    subpaths: ['/recepcion/registro'],
  },
  {
    path: '/triage',
    title: 'Triage',
    navLabel: 'Triage',
    feature: 'F-03 a F-05-web',
    roles: ['NURSE'],
  },
  {
    path: '/cola',
    title: 'Cola priorizada',
    navLabel: 'Cola priorizada',
    feature: 'F-06-web',
    roles: ['PHYSICIAN', 'NURSE', 'ADMIN'],
  },
  {
    path: '/reportes',
    title: 'Reportes',
    navLabel: 'Reportes',
    feature: 'F-07-web',
    roles: ['ADMIN'],
  },
  {
    path: '/atenciones',
    title: 'Atenciones',
    navLabel: 'Atenciones',
    feature: 'F-02-web',
    roles: ['RECEPTION', 'NURSE', 'PHYSICIAN', 'ADMIN'],
    subpaths: ['/atenciones/:id'],
  },
];

export const HOME_BY_ROLE: Record<StaffRole, string> = {
  RECEPTION: '/recepcion',
  NURSE: '/triage',
  PHYSICIAN: '/cola',
  ADMIN: '/reportes',
};

/** Nombre del rol en español para el encabezado (R21). */
export const ROLE_LABELS: Record<StaffRole, string> = {
  RECEPTION: 'Recepción',
  NURSE: 'Enfermería',
  PHYSICIAN: 'Medicina',
  ADMIN: 'Administración',
};

export function routesFor(role: StaffRole): RoleRoute[] {
  return ROLE_ROUTES.filter((route) => route.roles.includes(role));
}

/** La ruta exacta o una subruta (`/atenciones/<id>`) de una ruta del rol (D4 de F-02-web). */
export function canAccess(role: StaffRole, path: string): boolean {
  return routesFor(role).some(
    (route) => path === route.path || path.startsWith(`${route.path}/`),
  );
}
