import { describe, expect, it } from 'vitest';
import { DATE_INVALID_KEY, periodSchema } from './schemas';

const valid = { from: '2026-11-05', to: '2026-11-11', siteId: '' };

describe('F-07-web formulario del periodo', () => {
  it('R7: acepta dos fechas YYYY-MM-DD reales y convierte la sede vacía en null', () => {
    expect(periodSchema.parse(valid)).toEqual({ ...valid, siteId: null });
    expect(
      periodSchema.parse({
        ...valid,
        siteId: '7a1b2c3d-0000-4000-8000-000000000001',
      }).siteId,
    ).toBe('7a1b2c3d-0000-4000-8000-000000000001');
    expect(
      periodSchema.safeParse({ ...valid, from: '2028-02-29' }).success,
    ).toBe(true);
  });

  it.each([
    '',
    '2026-02-30',
    '2026-13-01',
    '2026-11-5',
    '05/11/2026',
    '2027-02-29',
  ])('R7: rechaza «%s» con el mensaje de fecha inválida', (from) => {
    const result = periodSchema.safeParse({ ...valid, from });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(DATE_INVALID_KEY);
    expect(result.error?.issues[0].path).toEqual(['from']);
  });

  it('R7: no comprueba el orden ni la longitud del periodo (lo valida la API)', () => {
    expect(
      periodSchema.safeParse({ ...valid, from: '2026-11-20', to: '2026-11-10' })
        .success,
    ).toBe(true);
    expect(
      periodSchema.safeParse({ ...valid, from: '2020-01-01', to: '2026-11-10' })
        .success,
    ).toBe(true);
  });
});
