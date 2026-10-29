import { afterEach, describe, expect, it, vi } from 'vitest';
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
 * Espacios (D28, T15): el espacio que `Intl` escribe en «8:05 a. m.» depende del motor y de la
 * versión de ICU. En el Node del proyecto (22.23.1, ICU 78.2, CLDR 48.0) con `es-CO` son espacios
 * normales (U+0020), como en Chromium 153 y Firefox 153; versiones anteriores de ICU escribían un
 * espacio duro (U+00A0) o duro estrecho (U+202F). `formatTimeBogota` y `formatDateTimeBogota` lo
 * reescriben a U+00A0 y solo las pruebas de T15 que lo nombran (`\u00A0`) fijan ese carácter; las
 * demás usan `\s` y nunca el espacio tecleado, para no depender de qué escribió el motor.
 */
describe('UI-02-web horas de los dashboards en Bogotá, sin segundos (D28)', () => {
  // 13:05 UTC son las 8:05 a. m. en Bogotá; 04:30 UTC del 28/10 cruzan la medianoche de Bogotá.
  const MORNING = '2026-10-27T13:05:00.000Z';
  const NIGHT = '2026-10-28T04:30:00.000Z';

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Simula el motor: `Intl.DateTimeFormat` escribe lo que se le diga, como lo haría otra versión de ICU. */
  function engineWrites() {
    // `format` es un accessor del prototipo y la lib de TypeScript lo declara como método.
    const prototype = Intl.DateTimeFormat.prototype as unknown as {
      format: unknown;
    };
    const spy = vi.spyOn(prototype, 'format', 'get');
    return (text: string) => spy.mockReturnValue(() => text);
  }

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

  it('R41: formatTimeBogota une la hora a «a. m.» o «p. m.» con U+00A0 y el indicador no se parte', () => {
    expect(formatTimeBogota(MORNING)).toBe('8:05\u00A0a.\u00A0m.');
    expect(formatTimeBogota(NIGHT)).toBe('11:30\u00A0p.\u00A0m.');
  });

  it('R41: formatDateTimeBogota une la hora con U+00A0 y deja un espacio normal tras la coma', () => {
    expect(formatDateTimeBogota(MORNING)).toBe(
      '27/10/26, 8:05\u00A0a.\u00A0m.',
    );
    expect(formatDateTimeBogota(NIGHT)).toBe('27/10/26, 11:30\u00A0p.\u00A0m.');
  });

  it('R41: entre la hora y el indicador, y dentro de él, no queda U+0020 ni U+202F', () => {
    for (const iso of [MORNING, NIGHT]) {
      // De la fecha con hora solo cuenta la hora: lo que sigue al espacio de la coma.
      const hourOfDateTime = formatDateTimeBogota(iso).split(', ')[1];
      for (const hour of [formatTimeBogota(iso), hourOfDateTime]) {
        expect(hour).not.toMatch(/[\u0020\u202F]/);
        expect(hour).toMatch(/^\d{1,2}:\d{2}\u00A0[ap]\.\u00A0m\.$/);
      }
    }
  });

  it.each([
    ['U+0020', '\u0020'],
    ['U+00A0', '\u00A0'],
    ['U+202F', '\u202F'],
  ])(
    'R41: si el motor escribe %s en la hora, los dos formateadores devuelven U+00A0',
    (_name, space) => {
      const write = engineWrites();
      for (const letter of ['a', 'p']) {
        const hour = `8:05${space}${letter}.${space}m.`;
        const normalized = `8:05\u00A0${letter}.\u00A0m.`;
        write(hour);
        expect(formatTimeBogota(MORNING)).toBe(normalized);
        write(`27/10/26, ${hour}`);
        expect(formatDateTimeBogota(MORNING)).toBe(`27/10/26, ${normalized}`);
      }
    },
  );

  it('R41: formatBogota y formatDateBogota devuelven lo que escribe Intl, sin reescribir espacios, y formatCivilDate no cambia', () => {
    const written = '27/10/26, 8:05:42\u202Fa.\u202Fm.';
    const write = engineWrites();
    write(written);
    expect(formatBogota(MORNING)).toBe(written);
    expect(formatDateBogota(MORNING)).toBe(written);
    expect(formatCivilDate('1990-05-17')).toBe('17/05/1990');
  });

  it('R6: las horas del servidor se muestran en America/Bogota y no se convierten con la zona del navegador', () => {
    // 04:30 UTC son las 23:30 del día anterior en Bogotá (UTC-5, sin horario de verano).
    expect(formatDateTimeBogota('2026-01-01T04:30:00.000Z')).toMatch(
      /^31\/12\/25,\s11:30\sp\.\sm\.$/,
    );
  });
});
