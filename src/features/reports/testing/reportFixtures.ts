import type { ReportSummary } from '../../../shared/api/client';
import { csv, json, type Handler } from '../../../test/fakeApi';

/**
 * Resúmenes sintéticos para las pruebas de F-07-web (contrato 0.9.0; D12). El resumen no tiene
 * datos de pacientes: solo conteos, minutos, porcentajes y el kappa que la API ya calculó. Las
 * cifras solo ejercitan la presentación; no son un criterio clínico.
 */

export const SUMMARY_PATH = '/api/v1/reports/summary';
export const CSV_PATH = '/api/v1/reports/encounters.csv';
export const GET_SUMMARY = `GET ${SUMMARY_PATH}`;
export const GET_CSV = `GET ${CSV_PATH}`;

/** 15:00 UTC = 10:00 a. m. en Bogotá. */
export const GENERATED_AT = '2026-11-11T15:00:00.000Z';
/** Un refresco posterior: 15:00:30 UTC. */
export const LATER_GENERATED_AT = '2026-11-11T15:00:30.000Z';

const count = (value: number, percent: number | null) => ({
  count: value,
  percent,
});

/**
 * Periodo con datos: decimales como 12.5 y 0.812, un nivel con n = 0 (mediana y p90 null),
 * cumplimiento del nivel II de 2 de 3 (66.7 %), matriz con diagonal y dos desacuerdos y algún uso
 * de OpenRouter y de los safety guards.
 */
export const summaryWithData: ReportSummary = {
  period: { from: '2026-11-05', to: '2026-11-11', siteId: null },
  generatedAt: GENERATED_AT,
  population: { encounters: 14, triaged: 12 },
  timeToTriage: {
    byLevel: [
      { level: 1, n: 2, median: 3.5, p90: 4.1 },
      { level: 2, n: 3, median: 12.5, p90: 18.2 },
      { level: 3, n: 4, median: 25, p90: 41.7 },
      { level: 4, n: 3, median: 33.3, p90: 52 },
      { level: 5, n: 0, median: null, p90: null },
    ],
    total: { n: 12, median: 20.4, p90: 47.9 },
  },
  timeToCare: {
    byLevel: [
      { level: 1, n: 2, mean: 1.5, median: 1.4, p90: 2.6 },
      { level: 2, n: 3, mean: 21.7, median: 18.9, p90: 36.1 },
    ],
  },
  compliance: {
    level: 2,
    maxMinutes: 30,
    evaluable: 3,
    compliant: 2,
    percent: 66.7,
    notEvaluated: 1,
  },
  concordance: {
    pairs: 10,
    exactAgreementPercent: 80,
    weightedKappa: 0.812,
    underTriagePercent: 10,
    overTriagePercent: 10,
    // matrix[sugerido − 1][final − 1]: diagonal 1, 3, 3, 1, 0; II→III (sobre) y IV→III (sub).
    matrix: [
      [1, 0, 0, 0, 0],
      [0, 3, 1, 0, 0],
      [0, 0, 3, 0, 0],
      [0, 0, 1, 1, 0],
      [0, 0, 0, 0, 0],
    ],
  },
  fallback: {
    decisions: {
      total: 12,
      VALIDATE: count(8, 66.6),
      CORRECT: count(2, 16.7),
      MANUAL: count(2, 16.8),
    },
    suggestions: {
      total: 13,
      OK: count(11, 84.6),
      INVALID_OUTPUT: count(1, 7.7),
      TIMEOUT: count(1, 7.6),
      FAILED: count(0, 0),
    },
    providers: {
      total: 11,
      GROQ: count(9, 81.8),
      OPENROUTER: count(2, 18.2),
    },
    guards: { total: 11, applied: 3, percent: 27.3 },
  },
};

const noTime = (level: number) => ({ level, n: 0, median: null, p90: null });
const none = () => count(0, null);

/** Periodo sin atenciones: los conteos en 0 y todos los `null` que da la API sin datos. */
export const summaryEmpty: ReportSummary = {
  period: { from: '2025-11-05', to: '2025-11-11', siteId: null },
  generatedAt: GENERATED_AT,
  population: { encounters: 0, triaged: 0 },
  timeToTriage: {
    byLevel: [1, 2, 3, 4, 5].map(noTime),
    total: { n: 0, median: null, p90: null },
  },
  timeToCare: {
    byLevel: [1, 2].map((level) => ({ ...noTime(level), mean: null })),
  },
  compliance: {
    level: 2,
    maxMinutes: 30,
    evaluable: 0,
    compliant: 0,
    percent: null,
    notEvaluated: 0,
  },
  concordance: {
    pairs: 0,
    exactAgreementPercent: null,
    weightedKappa: null,
    underTriagePercent: null,
    overTriagePercent: null,
    matrix: [0, 1, 2, 3, 4].map(() => [0, 0, 0, 0, 0]),
  },
  fallback: {
    decisions: { total: 0, VALIDATE: none(), CORRECT: none(), MANUAL: none() },
    suggestions: {
      total: 0,
      OK: none(),
      INVALID_OUTPUT: none(),
      TIMEOUT: none(),
      FAILED: none(),
    },
    providers: { total: 0, GROQ: none(), OPENROUTER: none() },
    guards: { total: 0, applied: 0, percent: null },
  },
};

/** Un solo par: la API devuelve el kappa `null` (menos de 2 pares). */
export const summaryOnePair: ReportSummary = {
  ...summaryWithData,
  concordance: {
    pairs: 1,
    exactAgreementPercent: 100,
    weightedKappa: null,
    underTriagePercent: 0,
    overTriagePercent: 0,
    matrix: [
      [0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ],
  },
};

/** Un máximo del nivel II distinto de 30: la web lo toma de la API y no lo escribe en el código. */
export const summaryMaxMinutes45: ReportSummary = {
  ...summaryWithData,
  timeToCare: {
    byLevel: [
      { level: 1, n: 2, mean: 1.5, median: 1.4, p90: 2.6 },
      { level: 2, n: 3, mean: 21.7, median: 18.9, p90: 44.1 },
    ],
  },
  compliance: {
    level: 2,
    maxMinutes: 45,
    evaluable: 3,
    compliant: 3,
    percent: 100,
    notEvaluated: 0,
  },
};

/** Niveles en otro orden que el habitual: la web los muestra en el orden recibido. */
export const byLevelUnordered: ReportSummary = {
  ...summaryWithData,
  timeToTriage: {
    ...summaryWithData.timeToTriage,
    byLevel: [...summaryWithData.timeToTriage.byLevel].reverse(),
  },
  timeToCare: {
    byLevel: [...summaryWithData.timeToCare.byLevel].reverse(),
  },
};

/**
 * `GET /reports/summary` que responde `body` con el periodo y la sede de la petición (como la
 * API, que devuelve el periodo consultado).
 */
export function summaryResponse(
  body: ReportSummary = summaryWithData,
  generatedAt = body.generatedAt,
): Handler {
  return (request) => {
    const query = new URL(request.url).searchParams;
    return json(200, {
      ...body,
      generatedAt,
      period: {
        from: query.get('from') ?? body.period.from,
        to: query.get('to') ?? body.period.to,
        siteId: query.get('siteId'),
      },
    })(request);
  };
}

/** Cuerpo sintético del CSV interno: solo cabecera y una fila sin datos personales. */
export const CSV_BODY =
  'encounter_id,site_name,status\r\nf0700000-0000-4000-8000-000000000001,Sede Norte,CLOSED\r\n';

/** `GET /reports/encounters.csv`, con o sin `Content-Disposition`. */
export function csvResponse({
  body = CSV_BODY,
  disposition,
}: { body?: string; disposition?: string } = {}): Handler {
  return csv(
    200,
    body,
    disposition ? { 'Content-Disposition': disposition } : {},
  );
}
