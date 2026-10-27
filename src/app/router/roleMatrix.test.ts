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
