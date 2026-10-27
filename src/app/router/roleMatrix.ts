import type { StaffRole } from '../../shared/api/client';

/** Matriz de roles (design.md D7, PA-4 aceptada). Única fuente para R19, R20, R21 y R23. */
export interface RoleRoute {
  path: string;
  /** Encabezado del marcador (R23). */
  title: string;
  /** Texto del enlace en la navegación (R21). */
  navLabel: string;
  /** Feature que trae la pantalla real. */
  feature: string;
  roles: readonly StaffRole[];
}

export const ROLE_ROUTES: readonly RoleRoute[] = [
  {
    path: '/recepcion',
    title: 'Recepción — bandeja de pre-registros',
    navLabel: 'Recepción',
    feature: 'F-02-web',
    roles: ['RECEPTION'],
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

export function canAccess(role: StaffRole, path: string): boolean {
  return routesFor(role).some((route) => route.path === path);
}
