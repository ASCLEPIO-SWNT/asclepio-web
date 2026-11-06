import { describe, expect, it } from 'vitest';
import { canAccess, routesFor } from './roleMatrix';

describe('matriz de roles (D4 de F-02-web)', () => {
  it('R1: /recepcion y /recepcion/registro solo para RECEPTION', () => {
    for (const path of ['/recepcion', '/recepcion/registro']) {
      expect(canAccess('RECEPTION', path)).toBe(true);
      expect(canAccess('NURSE', path)).toBe(false);
      expect(canAccess('PHYSICIAN', path)).toBe(false);
      expect(canAccess('ADMIN', path)).toBe(false);
    }
  });

  it('R1: /atenciones y /atenciones/<id> para los cuatro roles, y "Atenciones" en la navegación de todos', () => {
    for (const role of ['RECEPTION', 'NURSE', 'PHYSICIAN', 'ADMIN'] as const) {
      expect(canAccess(role, '/atenciones')).toBe(true);
      expect(
        canAccess(role, '/atenciones/e0e0e0e0-0000-4000-8000-000000000001'),
      ).toBe(true);
      expect(routesFor(role).map((r) => r.navLabel)).toContain('Atenciones');
    }
  });

  it('R1: una ruta que solo comparte prefijo no es subruta', () => {
    expect(canAccess('RECEPTION', '/recepcionista')).toBe(false);
    expect(canAccess('NURSE', '/atencionesx')).toBe(false);
  });
});

describe('UI-03-web subrutas declaradas (D16)', () => {
  const ID = 'e0e0e0e0-0000-4000-8000-000000000001';

  it('R23: las subrutas declaradas en subpaths siguen permitidas para sus roles', () => {
    expect(canAccess('RECEPTION', '/recepcion/registro')).toBe(true);
    expect(canAccess('NURSE', `/triage/${ID}`)).toBe(true);
    for (const role of ['RECEPTION', 'NURSE', 'PHYSICIAN', 'ADMIN'] as const) {
      expect(canAccess(role, `/atenciones/${ID}`)).toBe(true);
    }
  });

  it('R23: una subruta no declarada se deniega por defecto', () => {
    expect(canAccess('RECEPTION', '/recepcion/otra')).toBe(false);
    expect(canAccess('RECEPTION', '/recepcion/registro/x')).toBe(false);
    expect(canAccess('NURSE', '/triage/a/b')).toBe(false);
    expect(canAccess('NURSE', '/triage/')).toBe(false);
    expect(canAccess('ADMIN', '/atenciones/')).toBe(false);
    expect(canAccess('ADMIN', `/atenciones/${ID}/editar`)).toBe(false);
    expect(canAccess('PHYSICIAN', '/cola/x')).toBe(false);
    expect(canAccess('ADMIN', '/reportes/x')).toBe(false);
  });

  it('R23: el rol sigue mandando sobre la subruta', () => {
    expect(canAccess('PHYSICIAN', `/triage/${ID}`)).toBe(false);
    expect(canAccess('NURSE', '/recepcion/registro')).toBe(false);
  });
});
