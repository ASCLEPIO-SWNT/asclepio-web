import { describe, expect, it } from 'vitest';
import { formatBogota, formatCivilDate } from './datetime';

describe('formatBogota', () => {
  it('convierte UTC a America/Bogota (UTC-5)', () => {
    // 00:42 UTC del 27/10 = 7:42 p. m. del 26/10 en Bogotá (el caso de ejemplo).
    const s = formatBogota('2026-10-27T00:42:00.000Z');
    expect(s).toContain('26/10/26');
    expect(s).toMatch(/7:42:00/);
  });

  it('R39: una hora UTC justo después de medianoche se muestra el día anterior en Bogotá', () => {
    const s = formatBogota('2026-01-01T04:59:59.000Z');
    expect(s).toContain('31/12/25');
    expect(s).toMatch(/11:59:59/);
  });
});

describe('formatCivilDate (D10)', () => {
  it.each([
    ['1990-05-17', '17/05/1990'],
    ['2000-01-01', '01/01/2000'],
    ['1999-12-31', '31/12/1999'],
    ['2024-02-29', '29/02/2024'],
  ])('R39: %s se muestra como %s sin desplazarse de día', (input, output) => {
    expect(formatCivilDate(input)).toBe(output);
  });

  it('R39: un texto que no es YYYY-MM-DD se devuelve tal cual', () => {
    expect(formatCivilDate('17/05/1990')).toBe('17/05/1990');
  });
});
