import { describe, expect, it } from 'vitest';
import { byLevelUnordered, summaryWithData } from './testing/reportFixtures';
import {
  careRows,
  csvFilename,
  defaultPeriod,
  filenameFromDisposition,
  formatCount,
  formatKappa,
  formatMinutes,
  formatPercent,
  triageRows,
} from './reportsView';

describe('F-07-web periodo por defecto', () => {
  it("R5: defaultPeriod('2026-11-11') propone del 5 al 11 de noviembre con todas las sedes", () => {
    expect(defaultPeriod('2026-11-11')).toEqual({
      from: '2026-11-05',
      to: '2026-11-11',
      siteId: null,
    });
  });

  it('R5: defaultPeriod cruza el fin de año y el 29 de febrero', () => {
    expect(defaultPeriod('2026-01-03')).toEqual({
      from: '2025-12-28',
      to: '2026-01-03',
      siteId: null,
    });
    expect(defaultPeriod('2028-03-02').from).toBe('2028-02-25');
  });
});

describe('F-07-web formato de los valores del servidor', () => {
  it('R3: minutos con 1 decimal y el separador del idioma', () => {
    expect(formatMinutes(12.5, 'es')).toBe('12,5 min');
    expect(formatMinutes(12.5, 'en')).toBe('12.5 min');
    expect(formatMinutes(30, 'es')).toBe('30,0 min');
    expect(formatMinutes(0, 'es')).toBe('0,0 min');
    expect(formatMinutes(7.25, 'de')).toMatch(/^7,3 /);
  });

  it('R3: porcentajes con 1 decimal', () => {
    expect(formatPercent(45, 'es')).toBe('45,0 %');
    expect(formatPercent(66.7, 'es')).toBe('66,7 %');
    expect(formatPercent(66.7, 'en')).toBe('66.7%');
    expect(formatPercent(100, 'fr')).toMatch(/^100,0/);
  });

  it('R3: kappa con 3 decimales y conteos enteros', () => {
    expect(formatKappa(0.812, 'es')).toBe('0,812');
    expect(formatKappa(0.812, 'en')).toBe('0.812');
    expect(formatKappa(1, 'es')).toBe('1,000');
    expect(formatKappa(-0.25, 'en')).toBe('-0.250');
    expect(formatCount(3, 'es')).toBe('3');
    expect(formatCount(0, 'es')).toBe('0');
  });

  it('R4: con null todos los formateadores devuelven null, nunca «0» ni «—»', () => {
    for (const format of [
      formatMinutes,
      formatPercent,
      formatKappa,
      formatCount,
    ])
      for (const locale of ['es', 'en'] as const)
        expect(format(null, locale)).toBeNull();
  });
});

describe('F-07-web nombre del archivo CSV', () => {
  const NAME = 'asclepio-atenciones-2026-11-05_2026-11-11.csv';

  it('R24: lee el nombre de Content-Disposition con comillas, sin comillas y con filename*', () => {
    expect(filenameFromDisposition(`attachment; filename="${NAME}"`)).toBe(
      NAME,
    );
    expect(filenameFromDisposition(`attachment; filename=${NAME}`)).toBe(NAME);
    expect(
      filenameFromDisposition(`attachment; filename*=UTF-8''${NAME}`),
    ).toBe(NAME);
    expect(
      filenameFromDisposition(
        `attachment; filename="otro.csv"; filename*=UTF-8''${NAME}`,
      ),
    ).toBe(NAME);
  });

  it.each([
    [null],
    [''],
    ['attachment'],
    ['attachment; filename="../x.csv"'],
    ['attachment; filename="a/b.csv"'],
    ['attachment; filename="a\\b.csv"'],
    ['attachment; filename="x.txt"'],
    ['attachment; filename="..csv"'],
    ["attachment; filename*=UTF-8''..%2Fx.csv"],
  ])('R24: devuelve null con %s', (header) => {
    expect(filenameFromDisposition(header)).toBeNull();
  });

  it('R24: el nombre alternativo es el del contrato con el periodo aplicado', () => {
    expect(csvFilename({ from: '2026-11-05', to: '2026-11-11' })).toBe(NAME);
  });
});

describe('F-07-web modelos de filas', () => {
  it('R11: triageRows conserva el orden recibido y añade el total al final, sin operar con los valores', () => {
    const rows = triageRows(byLevelUnordered);
    expect(rows.map((row) => row.level)).toEqual([5, 4, 3, 2, 1, null]);
    expect(rows.at(-1)).toEqual({
      key: 'total',
      level: null,
      ...byLevelUnordered.timeToTriage.total,
    });
    expect(rows[3]).toEqual({
      key: 'level-2',
      ...byLevelUnordered.timeToTriage.byLevel[3],
    });
  });

  it('R12: careRows conserva el orden recibido', () => {
    expect(careRows(byLevelUnordered).map((row) => row.level)).toEqual([2, 1]);
    expect(careRows(summaryWithData)[1]).toEqual({
      key: 'level-2',
      ...summaryWithData.timeToCare.byLevel[1],
    });
  });
});
