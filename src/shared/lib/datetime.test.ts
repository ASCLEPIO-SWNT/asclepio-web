import { describe, expect, it } from 'vitest';
import {
  formatBogota,
  formatCivilDate,
  formatDateBogota,
  formatDateTimeBogota,
  formatTimeBogota,
} from './datetime';

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

/*
 * Espacios (D28): en el Node del proyecto (22.23.1, ICU 78.2, CLDR 48.0) `Intl` escribe espacios
 * normales (U+0020) en «8:05 a. m.» con `es-CO`; versiones anteriores de ICU escribían un espacio
 * duro (U+00A0) o duro estrecho (U+202F). Por eso las expresiones usan `\s` y nunca el espacio tecleado.
 */
describe('UI-02-web horas de los dashboards en Bogotá, sin segundos (D28)', () => {
  // 13:05 UTC son las 8:05 a. m. en Bogotá; 04:30 UTC del 28/10 cruzan la medianoche de Bogotá.
  const MORNING = '2026-10-27T13:05:00.000Z';
  const NIGHT = '2026-10-28T04:30:00.000Z';

  it('R41: formatTimeBogota muestra solo la hora de Bogotá', () => {
    expect(formatTimeBogota(MORNING)).toMatch(/^8:05\sa\.\sm\.$/);
    expect(formatTimeBogota(NIGHT)).toMatch(/^11:30\sp\.\sm\.$/);
  });

  it('R41: formatDateBogota muestra la fecha de Bogotá: una hora UTC del 28/10 puede ser aún el 27', () => {
    expect(formatDateBogota(MORNING)).toBe('27/10/26');
    expect(formatDateBogota(NIGHT)).toBe('27/10/26');
  });

  it('R41: formatDateTimeBogota une fecha y hora de Bogotá', () => {
    expect(formatDateTimeBogota(MORNING)).toMatch(
      /^27\/10\/26,\s8:05\sa\.\sm\.$/,
    );
    expect(formatDateTimeBogota(NIGHT)).toMatch(
      /^27\/10\/26,\s11:30\sp\.\sm\.$/,
    );
  });

  it('R41: ninguno de los tres escribe segundos', () => {
    for (const format of [
      formatTimeBogota,
      formatDateBogota,
      formatDateTimeBogota,
    ]) {
      expect(format('2026-10-27T13:05:42.000Z')).not.toMatch(/:\d{2}:\d{2}/);
    }
  });

  it('R41: formatBogota sigue escribiendo segundos: lo usan las pantallas fuera de alcance', () => {
    expect(formatBogota('2026-10-27T13:05:42.000Z')).toMatch(
      /^27\/10\/26,\s8:05:42\sa\.\sm\.$/,
    );
  });

  it('R6: las horas del servidor se muestran en America/Bogota y no se convierten con la zona del navegador', () => {
    // 04:30 UTC son las 23:30 del día anterior en Bogotá (UTC-5, sin horario de verano).
    expect(formatDateTimeBogota('2026-01-01T04:30:00.000Z')).toMatch(
      /^31\/12\/25,\s11:30\sp\.\sm\.$/,
    );
  });
});
