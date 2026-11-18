import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONSUMED_CONTRACT } from '../shared/api/client';
import { LOCALES } from '../shared/i18n/locale';
import {
  CLINICAL_CONTRACT_SHA256,
  CLINICAL_RULES_BODY_SHA256,
  EXPECTED_CONTRACT,
  SCHEMA_SHA256,
  WEB_OPERATIONS,
} from './contractBaseline';

const CLINICAL_FILE = 'src/features/triage/clinicalContract.generated.ts';

const sha256 = (content: string | Buffer) =>
  createHash('sha256').update(content).digest('hex');

describe('F-07-web contrato', () => {
  it('R31: consume el contrato 0.9.0 y las tres huellas no cambian (npm run api:types sin diff)', () => {
    expect(CONSUMED_CONTRACT).toBe('0.9.0');
    expect(EXPECTED_CONTRACT).toBe('0.9.0');
    expect(sha256(readFileSync('src/shared/api/schema.d.ts'))).toBe(
      SCHEMA_SHA256,
    );
    expect(sha256(readFileSync(CLINICAL_FILE))).toBe(CLINICAL_CONTRACT_SHA256);
    const generated = readFileSync(CLINICAL_FILE, 'utf8');
    expect(sha256(generated.slice(generated.indexOf('\n') + 1))).toBe(
      CLINICAL_RULES_BODY_SHA256,
    );
  });

  it('R31: los alias de reportes de client.ts salen solo de Schemas[...] o paths[...], sin tipos escritos a mano', () => {
    const client = readFileSync('src/shared/api/client.ts', 'utf8');
    expect(client).toContain(
      '// F-07-web (contrato 0.9.0): reportes. Solo alias de tipos generados.',
    );
    expect(client).toMatch(
      /export type ReportSummary = Schemas\['ReportSummaryDto'\];/,
    );
    expect(client).toMatch(
      /export type ReportLevelTime = Schemas\['LevelTimeStatsDto'\];/,
    );
    expect(client).toMatch(
      /export type ReportCareTime = Schemas\['CareTimeStatsDto'\];/,
    );
    expect(client).toMatch(
      /export type ReportCountPercent = Schemas\['CountPercentDto'\];/,
    );
    expect(client).toMatch(
      /export type ReportSummaryQuery =\s*paths\['\/api\/v1\/reports\/summary'\]\['get'\]\['parameters'\]\['query'\];/,
    );
    // Cinco alias de reportes y ninguno más; ningún interface ni objeto de tipos a mano.
    expect(client.match(/export type Report\w*\s*=/g)).toHaveLength(5);
    expect(client).not.toMatch(/interface\s+Report/);
    for (const [, value] of client.matchAll(
      /export type Report\w*\s*=\s*([^;]+);/g,
    ))
      expect(value.trim()).toMatch(/^(Schemas|paths)\[/);
  });

  it('R31: sin dependencias nuevas en package.json', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(Object.keys(pkg.dependencies).sort()).toEqual([
      '@heroicons/react',
      '@hookform/resolvers',
      '@inlang/paraglide-js',
      '@tanstack/react-query',
      'openapi-fetch',
      'react',
      'react-dom',
      'react-hook-form',
      'react-router',
      'zod',
    ]);
    expect(Object.keys(pkg.devDependencies)).toHaveLength(22);
  });
});

/** Archivos `.ts`/`.tsx` de aplicación: sin pruebas, sin Paraglide generado. */
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory())
      return entry.name === 'paraglide' ? [] : sources(path);
    return /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path) ? [path] : [];
  });
}

/** El código de `features/reports` sin pruebas ni fixtures. */
const reportFiles = () =>
  sources('src/features/reports').filter((file) => !file.includes('/testing/'));

describe('F-07-web operaciones HTTP', () => {
  it('R31: las operaciones del código son las de DT-02-web más GET /reports/summary y GET /reports/encounters.csv', () => {
    const used = new Set<string>();
    for (const file of sources('src'))
      for (const match of readFileSync(file, 'utf8').matchAll(
        /\.(GET|POST|PUT|PATCH|DELETE)\(\s*'([^']+)'/g,
      ))
        used.add(`${match[1]} ${match[2]}`);
    expect([...used].sort()).toEqual(WEB_OPERATIONS);
    const reports = WEB_OPERATIONS.filter((op) =>
      op.includes('/api/v1/reports'),
    );
    expect(reports).toEqual([
      'GET /api/v1/reports/encounters.csv',
      'GET /api/v1/reports/summary',
    ]);
    // Las 23 de DT-02-web más las dos de reportes.
    expect(WEB_OPERATIONS).toHaveLength(25);
    // Las dos llamadas viven en los hooks de la feature, no en los componentes.
    for (const file of reportFiles().filter((f) => f.includes('/components/')))
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/api\.GET\(/);
  });
});

const catalog = (group: string, locale: string) =>
  JSON.parse(
    readFileSync(`messages/${group}/${locale}.json`, 'utf8'),
  ) as Record<string, string>;
const merged = (locale: string) => ({
  ...catalog('common', locale),
  ...catalog('features', locale),
});
const paramsOf = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

/** Plan i18n de design.md, más `reports_pairs_count` (R15) y `reports_csv_forbidden` (R26). */
const REPORT_KEYS = [
  'reports_lead',
  'reports_period',
  'reports_from',
  'reports_to',
  'reports_apply',
  'reports_date_invalid',
  'reports_period_range',
  'reports_generated_at',
  'reports_error_bad_request',
  'reports_error_period',
  'reports_stat_encounters',
  'reports_stat_triaged',
  'reports_stat_compliance',
  'reports_triage_title',
  'reports_col_level',
  'reports_col_count',
  'reports_col_median',
  'reports_col_p90',
  'reports_level',
  'reports_total',
  'reports_minutes',
  'reports_care_title',
  'reports_care_note',
  'reports_col_mean',
  'reports_compliance_title',
  'reports_compliance_of',
  'reports_not_evaluated',
  'reports_level1_note',
  'reports_concordance_title',
  'reports_pairs',
  'reports_pairs_count',
  'reports_exact',
  'reports_kappa',
  'reports_kappa_note',
  'reports_under',
  'reports_over',
  'reports_matrix_caption',
  'reports_matrix_suggested',
  'reports_matrix_final',
  'reports_fallback_title',
  'reports_decisions',
  'reports_action_validate',
  'reports_action_correct',
  'reports_action_manual',
  'reports_suggestions',
  'reports_status_ok',
  'reports_status_invalid',
  'reports_status_timeout',
  'reports_status_failed',
  'reports_providers',
  'reports_provider_groq',
  'reports_provider_openrouter',
  'reports_guards',
  'reports_guards_applied',
  'reports_col_percent',
  'reports_col_suggestions',
  'reports_table_total',
  'reports_percent',
  'reports_no_data',
  'reports_empty',
  'reports_loading',
  'reports_refresh_failed',
  'reports_export_title',
  'reports_csv_download',
  'reports_csv_notice',
  'reports_csv_preparing',
  'reports_csv_done',
  'reports_csv_forbidden',
].sort();

/** Solo un formato sin palabras y un nombre propio coinciden en inglés y español. */
const SAME_IN_ENGLISH = ['reports_minutes', 'reports_provider_groq'];

/** Las nueve claves que retira F-07-web (plan i18n). */
const RETIRED_KEYS = [
  'dash_reports_lead',
  'dash_reports_by_site',
  'dash_reports_sites_loading',
  'dash_reports_sites_empty',
  'dash_reports_pending_title',
  'dash_reports_pending_body',
  'dash_sites_count',
  'dash_sites_count_one',
  'dash_view_all_encounters',
];

/** Textos de PA-9 en español (una muestra de cada bloque). */
const PA9_ES: Record<string, string> = {
  reports_lead:
    'Tiempos, cumplimiento, concordancia y uso del respaldo de las atenciones de un periodo.',
  reports_period: 'Periodo',
  reports_from: 'Desde',
  reports_to: 'Hasta',
  reports_apply: 'Aplicar',
  reports_date_invalid: 'Escribe una fecha válida.',
  reports_period_range: 'Del {from} al {to}',
  reports_generated_at: 'Calculado por el servidor el {datetime}',
  reports_error_bad_request: 'Las fechas no son válidas. Revisa Desde y Hasta.',
  reports_error_period:
    'El periodo no es válido: Desde no puede ser posterior a Hasta y el periodo no puede superar 366 días.',
  reports_stat_encounters: 'Atenciones',
  reports_stat_triaged: 'Con triage',
  reports_stat_compliance: 'Cumplimiento Triage II',
  reports_triage_title: 'De la llegada al triage',
  reports_col_level: 'Nivel',
  reports_col_count: 'Atenciones',
  reports_col_median: 'Mediana',
  reports_col_p90: 'P90',
  reports_level: 'Nivel {level}',
  reports_total: 'Total',
  reports_minutes: '{value} min',
  reports_care_title: 'Triage I y II: de la clasificación a la atención',
  reports_care_note:
    'Minutos desde la clasificación hasta la atención médica. La media es el indicador de la Res. 256 de 2016.',
  reports_col_mean: 'Media',
  reports_compliance_title: 'Cumplimiento Triage II (máx. {max} min)',
  reports_compliance_of: '{compliant} de {evaluable} atenciones',
  reports_not_evaluated: 'Sin evaluar (no llegaron a atención): {count}',
  reports_level1_note:
    'Nivel I: atención inmediata, sin porcentaje de cumplimiento.',
  reports_concordance_title: 'Concordancia IA–enfermería',
  reports_pairs: 'Pares',
  reports_pairs_count: '{pairs} pares',
  reports_exact: 'Acuerdo exacto',
  reports_kappa: 'Kappa ponderado',
  reports_kappa_note: 'Con pocos pares el kappa es poco fiable.',
  reports_under:
    'Subclasificación: la IA sugirió un nivel menos grave que el final',
  reports_over:
    'Sobreclasificación: la IA sugirió un nivel más grave que el final',
  reports_matrix_caption:
    'Matriz de concordancia: filas, nivel sugerido por la IA; columnas, nivel final (enfermería)',
  reports_matrix_suggested: 'Sugerido: Nivel {level}',
  reports_matrix_final: 'Final: Nivel {level}',
  reports_fallback_title: 'Uso de respaldo y safety guards',
  reports_decisions: 'Decisiones de enfermería',
  reports_action_validate: 'Validar',
  reports_action_correct: 'Corregir',
  reports_action_manual: 'Triage manual',
  reports_suggestions: 'Estado de las sugerencias',
  reports_status_ok: 'Correcta',
  reports_status_invalid: 'Salida inválida',
  reports_status_timeout: 'Tiempo agotado',
  reports_status_failed: 'Fallida',
  reports_providers: 'Proveedor',
  reports_provider_groq: 'Groq',
  reports_provider_openrouter: 'OpenRouter (respaldo)',
  reports_guards: 'Safety guards',
  reports_guards_applied: 'Aplicados',
  reports_col_percent: 'Porcentaje',
  reports_col_suggestions: 'Sugerencias',
  reports_table_total: 'Total: {count}',
  reports_percent: '{value} %',
  reports_no_data: 'Sin datos',
  reports_empty: 'No hay atenciones en este periodo y sede.',
  reports_loading: 'Cargando los indicadores…',
  reports_refresh_failed:
    'No se pudieron actualizar los indicadores. Se muestran los calculados el {datetime}.',
  reports_export_title: 'Exportar',
  reports_csv_download: 'Descargar CSV',
  reports_csv_notice:
    'Formato interno, no es el reporte oficial de la Res. 373 / SISPRO.',
  reports_csv_preparing: 'Preparando el CSV…',
  reports_csv_done: 'CSV descargado.',
  reports_csv_forbidden: 'No tienes permiso para esta acción.',
};

const GUIDE_REPORTS_ES =
  'Esta pantalla muestra los indicadores del periodo y la sede que elijas: el tiempo de la llegada al triage por nivel, el tiempo de la clasificación a la atención médica de los niveles I y II con el cumplimiento del nivel II, la concordancia entre la sugerencia de la IA y el nivel final de enfermería, y el uso del proveedor de respaldo y de los safety guards. Elige las fechas y la sede y pulsa Aplicar. La pantalla se actualiza sola de forma periódica; usa Actualizar para consultar al instante. Descargar CSV guarda un archivo en formato interno, que no es el reporte oficial. La pantalla no muestra datos de pacientes.';

/** «Se actualiza sola» en cada idioma (UI-02-web R33). */
const UPDATES_ITSELF: Record<string, RegExp> = {
  es: /se actualiza sola/,
  en: /updates on its own/,
  pt: /se atualiza sozinha/,
  fr: /s’actualise automatiquement/,
  de: /aktualisiert sich .*von selbst/,
};

describe('F-07-web i18n', () => {
  it('R28: las claves reports_* existen en los cinco idiomas, solo en messages/features, con los mismos parámetros y el inglés traducido', () => {
    const es = catalog('features', 'es');
    expect(
      Object.keys(es)
        .filter((key) => key.startsWith('reports_'))
        .sort(),
    ).toEqual(REPORT_KEYS);
    const en = catalog('features', 'en');
    for (const locale of LOCALES) {
      const messages = catalog('features', locale);
      for (const key of REPORT_KEYS) {
        expect(messages[key]?.trim(), `${locale}/${key}`).toBeTruthy();
        expect(paramsOf(messages[key]), `${locale}/${key}`).toEqual(
          paramsOf(es[key]),
        );
        expect(messages[key], `${locale}/${key}`).not.toMatch(/F-0\d/);
      }
      expect(
        Object.keys(catalog('common', locale)).filter((key) =>
          key.startsWith('reports_'),
        ),
      ).toEqual([]);
    }
    for (const key of REPORT_KEYS)
      if (!SAME_IN_ENGLISH.includes(key))
        expect(en[key], key).not.toBe(es[key]);
  });

  it('R28: el español usa los textos de PA-9', () => {
    const es = catalog('features', 'es');
    expect(Object.keys(PA9_ES).sort()).toEqual(REPORT_KEYS);
    for (const [key, text] of Object.entries(PA9_ES))
      expect(es[key], key).toBe(text);
  });

  it('R28: guide_reports describe el tablero con el texto de PA-9, estática, sin cifras ni parámetros, con «Actualizar» y «se actualiza sola» en los cinco idiomas', () => {
    expect(catalog('common', 'es').guide_reports).toBe(GUIDE_REPORTS_ES);
    expect(catalog('common', 'en').guide_reports).not.toBe(GUIDE_REPORTS_ES);
    for (const locale of LOCALES) {
      const all = merged(locale);
      const guide = all.guide_reports;
      expect(paramsOf(guide), locale).toEqual([]);
      expect(guide, locale).not.toMatch(/\d/);
      expect(guide, locale).toContain(all.feature_refresh);
      expect(guide, locale).toContain(all.reports_apply);
      expect(guide, locale).toMatch(UPDATES_ITSELF[locale]);
      expect(guide, locale).not.toMatch(
        /todavía no|not available yet|ainda não|pas encore|noch nicht/,
      );
    }
  });

  it('R28: ninguna clave nueva usa el prefijo suggestion_ (siguen 25) ni hay códigos F-0<n>', () => {
    for (const locale of LOCALES) {
      const all = merged(locale);
      expect(
        Object.keys(all).filter((key) => key.startsWith('suggestion_')),
        locale,
      ).toHaveLength(25);
      for (const [key, value] of Object.entries(all))
        expect(value, `${locale}/${key}`).not.toMatch(/F-0\d/);
    }
  });

  it('R28: las nueve claves retiradas ya no están en los catálogos ni en el código', () => {
    for (const locale of LOCALES)
      for (const group of ['common', 'features'])
        for (const key of RETIRED_KEYS)
          expect(
            catalog(group, locale)[key],
            `${locale}/${group}/${key}`,
          ).toBeUndefined();
    for (const file of sources('src').filter((f) => !f.startsWith('src/test/')))
      for (const key of RETIRED_KEYS)
        expect(
          readFileSync(file, 'utf8').includes(key),
          `${file}: ${key}`,
        ).toBe(false);
  });

  it('R28: la regla anti-literales no gana excepciones nuevas', () => {
    const source = readFileSync('src/test/noUiLiterals.test.ts', 'utf8');
    const block = source.slice(
      source.indexOf('const EXCEPTIONS'),
      source.indexOf('};', source.indexOf('const EXCEPTIONS')),
    );
    expect(block.match(/^\s*'[^']+\|[^']+':/gm)).toHaveLength(5);
    expect(block).not.toMatch(/reports/i);
  });
});

describe('F-07-web estilos', () => {
  const block = () => {
    const css = readFileSync('src/index.css', 'utf8');
    const start = css.indexOf('/* F-07-web');
    expect(start).toBeGreaterThan(-1);
    return css.slice(start);
  };

  it('R29: el bloque CSS /* F-07-web */ solo usa tokens, sin colores literales', () => {
    const css = block();
    expect(css).not.toMatch(
      /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\b(white|black)\b(?!-)/i,
    );
    for (const [, value] of css.matchAll(
      /(?:^|[\s;{])(?:color|background|outline|border|border-bottom|border-color|accent-color):\s*([^;]+);/g,
    ))
      expect(value).toMatch(
        /var\(--|none|transparent|^0$|^\d+(\.\d+)?(px|rem) (solid|dashed) var\(--|^currentColor$/,
      );
  });

  it('R29: las tablas se desplazan dentro de su contenedor y no desbordan el documento', () => {
    const css = block();
    expect(css).toMatch(
      /\.report-table-wrap\s*\{[^}]*overflow-x:\s*auto[^}]*\}/,
    );
    expect(css).toMatch(/\.report-table-wrap\s*\{[^}]*max-inline-size:\s*100%/);
    expect(css).toMatch(/\.report-table-wrap:focus-visible\s*\{/);
    expect(css).toMatch(/\.report-period__form\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(css).toMatch(/\.report-matrix__diag\s*\{[^}]*border/);
  });

  it('R29: los componentes de reportes no usan estilos en línea', () => {
    const files = reportFiles().filter((f) => f.endsWith('.tsx'));
    expect(files.length).toBeGreaterThanOrEqual(9);
    for (const file of files)
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/style=\{/);
  });
});

describe('F-07-web privacidad y valores del servidor', () => {
  it('R30, R27: features/reports no usa almacenamiento, parámetros de URL, consola, borradores ni fetch', () => {
    const files = reportFiles();
    expect(files.length).toBeGreaterThanOrEqual(12);
    for (const file of files)
      expect(readFileSync(file, 'utf8'), file).not.toMatch(
        /localStorage|sessionStorage|useSearchParams|console\.|useDraft|drafts|\bfetch\(/,
      );
    // El archivo se guarda con el ayudante compartido, que solo crea y revoca la URL temporal.
    const download = readFileSync('src/shared/lib/download.ts', 'utf8');
    expect(download).toMatch(/URL\.createObjectURL/);
    expect(download).toMatch(/URL\.revokeObjectURL/);
    expect(download).not.toMatch(
      /localStorage|sessionStorage|console\.|\bfetch\(|\.text\(\)/,
    );
  });

  it('R3: features/reports no opera con los campos del resumen ni escribe el máximo de 30 min', () => {
    const FIELD =
      /\.(percent|median|p90|mean|count|n|pairs|total|applied|evaluable|compliant|notEvaluated|maxMinutes|encounters|triaged|weightedKappa|exactAgreementPercent|underTriagePercent|overTriagePercent)\b/;
    for (const file of reportFiles()) {
      const source = readFileSync(file, 'utf8');
      for (const line of source.split('\n')) {
        if (!FIELD.test(line)) continue;
        expect(line, file).not.toMatch(
          new RegExp(
            `${FIELD.source}\\s*[-+*/%]|[-+*/%]\\s*[\\w.?!]*${FIELD.source}|Math\\.`,
          ),
        );
      }
      expect(source, file).not.toMatch(/\b30\b/);
    }
  });
});
