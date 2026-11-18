import { afterEach, describe, expect, it } from 'vitest';
import { addCivilDays, bogotaToday } from './datetime';

const ORIGINAL_TZ = process.env.TZ;

afterEach(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

describe('F-07-web fecha civil de hoy en Bogotá', () => {
  it.each([
    ['2026-11-11T04:59:59Z', '2026-11-10'],
    ['2026-11-11T05:00:00Z', '2026-11-11'],
    ['2026-01-01T04:59:59Z', '2025-12-31'],
  ])('R5: bogotaToday(%s) → %s', (iso, expected) => {
    expect(bogotaToday(new Date(iso))).toBe(expected);
  });

  it('R5: bogotaToday no depende de la zona del proceso (Asia/Tokyo)', () => {
    process.env.TZ = 'Asia/Tokyo';
    expect(bogotaToday(new Date('2026-11-11T04:59:59Z'))).toBe('2026-11-10');
    expect(bogotaToday(new Date('2026-11-11T05:00:00Z'))).toBe('2026-11-11');
    // En Tokio ya es 12 de noviembre; en Bogotá, todavía 11.
    expect(bogotaToday(new Date('2026-11-11T20:00:00Z'))).toBe('2026-11-11');
  });

  it('R5: bogotaToday sin argumento usa el reloj actual y devuelve YYYY-MM-DD', () => {
    expect(bogotaToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('F-07-web aritmética de fechas civiles', () => {
  it.each([
    ['2026-11-11', -6, '2026-11-05'],
    ['2026-11-03', -6, '2026-10-28'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2026-01-04', -6, '2025-12-29'],
    ['2025-12-31', 1, '2026-01-01'],
    ['2028-03-01', -1, '2028-02-29'],
    ['2028-02-29', 1, '2028-03-01'],
    ['2028-03-05', -6, '2028-02-28'],
    ['2026-11-11', 0, '2026-11-11'],
  ])('R5: addCivilDays(%s, %i) → %s', (date, days, expected) => {
    expect(addCivilDays(date, days)).toBe(expected);
  });

  it('R5: addCivilDays no depende de la zona del proceso', () => {
    process.env.TZ = 'Asia/Tokyo';
    expect(addCivilDays('2026-11-11', -6)).toBe('2026-11-05');
    process.env.TZ = 'America/Los_Angeles';
    expect(addCivilDays('2026-11-11', -6)).toBe('2026-11-05');
  });
});
