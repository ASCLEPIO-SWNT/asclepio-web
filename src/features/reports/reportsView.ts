import type { ReportCareTime, ReportSummary } from '../../shared/api/client';
import { translate, type Locale } from '../../shared/i18n';
import { addCivilDays } from '../../shared/lib/datetime';

/**
 * Funciones puras del tablero de reportes (F-07-web D4, D5, D8), sin red. Los formateadores solo
 * cambian el separador decimal y los ceros finales de un valor del servidor: los decimales fijos
 * (1 en minutos y porcentajes, 3 en el kappa) son los mismos con que redondea la API, así que no
 * se pierde ni se inventa precisión (R3). Con `null` devuelven `null` y la vista escribe
 * «Sin datos» (R4).
 */

/** Periodo aplicado: dos fechas civiles y la sede (`null` = todas). */
export interface ReportPeriod {
  from: string;
  to: string;
  siteId: string | null;
}

const fixed = (locale: Locale, digits: number) =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export function formatMinutes(
  value: number | null,
  locale: Locale,
): string | null {
  if (value === null) return null;
  return translate(locale, 'reports_minutes', {
    value: fixed(locale, 1).format(value),
  });
}

export function formatPercent(
  value: number | null,
  locale: Locale,
): string | null {
  if (value === null) return null;
  return translate(locale, 'reports_percent', {
    value: fixed(locale, 1).format(value),
  });
}

export function formatKappa(
  value: number | null,
  locale: Locale,
): string | null {
  if (value === null) return null;
  return fixed(locale, 3).format(value);
}

export function formatCount(
  value: number | null,
  locale: Locale,
): string | null {
  if (value === null) return null;
  return fixed(locale, 0).format(value);
}

/** Periodo por defecto (R5, PA-3 a): siete fechas civiles con hoy incluido y todas las sedes. */
export function defaultPeriod(today: string): ReportPeriod {
  return { from: addCivilDays(today, -6), to: today, siteId: null };
}

const SAFE_CSV_NAME = /^[\w.-]+\.csv$/;

function safeName(name: string | undefined): string | null {
  if (!name) return null;
  return SAFE_CSV_NAME.test(name) && !name.includes('..') ? name : null;
}

/**
 * Nombre del archivo de `Content-Disposition` (D8): `filename*=UTF-8''…` gana a `filename`. Solo
 * vale un `.csv` sin rutas ni `..`; en otro caso, o sin la cabecera, `null`.
 */
export function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const extended = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;\s]+)/.exec(header);
  if (extended) {
    let decoded: string | undefined;
    try {
      decoded = decodeURIComponent(extended[1]);
    } catch {
      decoded = undefined;
    }
    return safeName(decoded);
  }
  const plain = /filename\s*=\s*(?:"([^"]*)"|([^;\s]+))/.exec(header);
  return safeName(plain?.[1] ?? plain?.[2]);
}

/** Nombre alternativo, el que documenta el contrato, con el periodo aplicado (R24, PA-5 a). */
export function csvFilename({ from, to }: { from: string; to: string }) {
  return `asclepio-atenciones-${from}_${to}.csv`;
}

/** Fila de una tabla de tiempos: solo elige campos del resumen, sin operar con ellos (D6). */
export interface TimeRow {
  key: string;
  /** Nivel 1–5, o `null` en la fila «Total». */
  level: number | null;
  n: number;
  median: number | null;
  p90: number | null;
}

/** «De la llegada al triage» (R11): los niveles en el orden recibido y el total al final. */
export function triageRows(summary: ReportSummary): TimeRow[] {
  return [
    ...summary.timeToTriage.byLevel.map((row) => ({
      key: `level-${row.level}`,
      ...row,
    })),
    { key: 'total', level: null, ...summary.timeToTriage.total },
  ];
}

/** «Triage I y II» (R12): los niveles en el orden recibido, con la media. */
export function careRows(
  summary: ReportSummary,
): Array<ReportCareTime & { key: string }> {
  return summary.timeToCare.byLevel.map((row) => ({
    key: `level-${row.level}`,
    ...row,
  }));
}
