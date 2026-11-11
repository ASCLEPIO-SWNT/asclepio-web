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

/** Archivos `.ts`/`.tsx` de aplicación: sin pruebas, sin Paraglide generado. */
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === 'paraglide' ? [] : sources(path);
    return /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path) ? [path] : [];
  });
}

describe('DT-02-web contrato', () => {
  it('R1: declara el contrato 0.9.0 y los tipos generados coinciden con las huellas vigentes', () => {
    expect(CONSUMED_CONTRACT).toBe('0.9.0');
    expect(EXPECTED_CONTRACT).toBe('0.9.0');
    expect(CONSUMED_CONTRACT).toBe(EXPECTED_CONTRACT);
    expect(sha256(readFileSync('src/shared/api/schema.d.ts'))).toBe(
      SCHEMA_SHA256,
    );
    expect(sha256(readFileSync(CLINICAL_FILE))).toBe(CLINICAL_CONTRACT_SHA256);
  });

  it('R1: el cuerpo del archivo clínico (sin la cabecera) conserva la huella generada desde 0.7.0', () => {
    const generated = readFileSync(CLINICAL_FILE, 'utf8');
    expect(generated).toMatch(/^\/\/ Generated from OpenAPI 0\.9\.0 /);
    const body = generated.slice(generated.indexOf('\n') + 1);
    expect(sha256(body)).toBe(CLINICAL_RULES_BODY_SHA256);
  });

  it('R1: la guarda de extract-clinical-contract.mjs admite 0.9.0 con su comentario de revisión, y solo las versiones revisadas', () => {
    const script = readFileSync(
      'scripts/extract-clinical-contract.mjs',
      'utf8',
    );
    const guard = script.match(/if \(\s*!\[([^\]]*)\]\.includes\(/);
    expect(guard).not.toBeNull();
    const versions = [...guard![1].matchAll(/'([^']+)'/g)].map(
      (match) => match[1],
    );
    expect(versions).toEqual(['0.4.0', '0.5.0', '0.6.0', '0.7.0', '0.9.0']);
    expect(versions).not.toContain('0.8.0');
    expect(script).toMatch(
      /\/\/ DT-02-web D1: 0\.9\.0 no cambia las reglas clínicas de F-03 ni los límites de decisión de F-05/,
    );
  });

  it('R1: QueueItem es el alias generado, ya con minutesSinceTriage, sin tipos escritos a mano', () => {
    const client = readFileSync('src/shared/api/client.ts', 'utf8');
    expect(client).toMatch(
      /export type QueueItem = Schemas\['QueueItemDto'\];/,
    );
    expect(client).not.toMatch(/minutesSinceTriage/);
    const schema = readFileSync('src/shared/api/schema.d.ts', 'utf8');
    const dto = schema.slice(
      schema.indexOf('QueueItemDto: {'),
      schema.indexOf('};', schema.indexOf('QueueItemDto: {')),
    );
    expect(dto).toMatch(/minutesSinceTriage: number \| null;/);
  });
});

describe('DT-02-web reportes fuera de alcance', () => {
  const MESSAGE =
    'Los reportes (/api/v1/reports/*) los incorpora F-07-web: hasta entonces la web no los usa (DT-02-web R2, D3). F-07-web retira esta prueba.';

  it('R2: ni WEB_OPERATIONS ni el código de aplicación usan /api/v1/reports, y client.ts no tiene alias de reportes', () => {
    expect(
      WEB_OPERATIONS.filter((operation) =>
        operation.includes('/api/v1/reports'),
      ),
      MESSAGE,
    ).toEqual([]);
    const appFiles = sources('src').filter(
      (file) =>
        !file.endsWith('schema.d.ts') &&
        !file.includes('/testing/') &&
        !file.startsWith(join('src', 'test')),
    );
    expect(appFiles.length).toBeGreaterThan(20);
    for (const file of appFiles)
      expect(readFileSync(file, 'utf8'), `${file}: ${MESSAGE}`).not.toMatch(
        /\/api\/v1\/reports|ReportSummary|Schemas\['Report/,
      );
    const client = readFileSync('src/shared/api/client.ts', 'utf8');
    expect(client, MESSAGE).not.toMatch(/Report/);
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

/** Claves nuevas o cambiadas de este slice en messages/features (plan i18n). */
const DT02_KEYS = [
  'queue_since_triage',
  'queue_overdue_a11y',
  'queue_max_minutes',
];

/** La frase vieja del orden por mayor espera, en cada idioma (F-06-web PA-2). */
const OLD_ORDER: Record<string, RegExp> = {
  es: /primero la mayor espera/,
  en: /the longest wait first/,
  pt: /primeiro a maior espera/,
  fr: /l’attente la plus longue d’abord/,
  de: /längste Wartezeit zuerst/,
};

/** «Se actualiza sola» en cada idioma (UI-02-web R33). */
const UPDATES_ITSELF: Record<string, RegExp> = {
  es: /se actualiza sola/,
  en: /updates on its own/,
  pt: /se atualiza sozinha/,
  fr: /s’actualise automatiquement/,
  de: /aktualisiert sich .*von selbst/,
};

const GUIDE_QUEUE_ES =
  'Esta pantalla muestra la cola priorizada en tres secciones: en espera de triage, clasificadas y en atención. Cada sección conserva el orden del servidor; las clasificadas van por nivel y, en cada nivel, primero la que lleva más tiempo desde la clasificación. La espera se cuenta desde la llegada y el tiempo máximo de cada nivel, desde la clasificación. Si una atención lo supera, verás la marca Tiempo máximo superado. Con el filtro Sede puedes ver una sola sede. La cola se actualiza sola de forma periódica; usa Actualizar para consultar al instante. La guía no lee datos de pacientes.';

describe('DT-02-web guía de la cola', () => {
  it('R12: guide_queue usa el texto de PA-4 (a) en español y, en los cinco idiomas, deja la frase del orden por espera y sigue estática, con «Actualizar», «se actualiza sola» y la alerta', () => {
    expect(catalog('common', 'es').guide_queue).toBe(GUIDE_QUEUE_ES);
    for (const locale of LOCALES) {
      const all = merged(locale);
      const guide = all.guide_queue;
      expect(guide, locale).not.toMatch(OLD_ORDER[locale]);
      expect(paramsOf(guide), locale).toEqual([]);
      expect(guide, locale).not.toMatch(/\d/);
      expect(guide, locale).toContain(all.feature_refresh);
      expect(guide, locale).toMatch(UPDATES_ITSELF[locale]);
      expect(guide, locale).toContain(all.queue_overdue);
    }
    // El inglés está traducido.
    expect(catalog('common', 'en').guide_queue).not.toBe(GUIDE_QUEUE_ES);
  });
});

describe('DT-02-web i18n', () => {
  it('R13: las claves nuevas y cambiadas existen en los cinco idiomas con los mismos parámetros, el inglés traducido y los textos de PA-2 y PA-3 en español', () => {
    const es = catalog('features', 'es');
    expect(es.queue_since_triage).toBe('Clasificada hace {minutes} min');
    expect(es.queue_max_minutes).toBe(
      'Máx. {minutes} min desde la clasificación',
    );
    expect(es.queue_overdue_a11y).toBe(
      'Tiempo máximo superado desde la clasificación',
    );
    const en = catalog('features', 'en');
    for (const locale of LOCALES) {
      const messages = catalog('features', locale);
      for (const key of DT02_KEYS) {
        expect(messages[key]?.trim(), `${locale}/${key}`).toBeTruthy();
        expect(paramsOf(messages[key]), `${locale}/${key}`).toEqual(
          paramsOf(es[key]),
        );
        expect(messages[key], `${locale}/${key}`).not.toMatch(
          /sugerencia|suggestion|\bIA\b|\bAI\b|F-0\d/i,
        );
      }
      // Las claves nuevas no van en common.
      for (const key of DT02_KEYS)
        expect(catalog('common', locale)[key], key).toBeUndefined();
    }
    for (const key of DT02_KEYS) expect(en[key], key).not.toBe(es[key]);
    expect(es.queue_overdue_a11y).toContain(es.queue_overdue);
    expect(en.queue_overdue_a11y).toContain(en.queue_overdue);
  });

  it('R13: la regla anti-literales no gana excepciones nuevas', () => {
    const source = readFileSync('src/test/noUiLiterals.test.ts', 'utf8');
    const block = source.slice(
      source.indexOf('const EXCEPTIONS'),
      source.indexOf('};', source.indexOf('const EXCEPTIONS')),
    );
    expect(block.match(/^\s*'[^']+\|[^']+':/gm)).toHaveLength(5);
    expect(block).not.toMatch(/queue|Clasificada|minutesSinceTriage/i);
  });
});

describe('DT-02-web estilos y dependencias', () => {
  it('R14: el bloque CSS /* DT-02-web */, si existe, solo usa tokens, sin colores literales', () => {
    const css = readFileSync('src/index.css', 'utf8');
    const start = css.indexOf('/* DT-02-web');
    if (start === -1) return;
    const block = css.slice(start);
    expect(block).not.toMatch(
      /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\b(white|black)\b(?!-)/i,
    );
    for (const [, value] of block.matchAll(
      /(?:color|background|outline|border(?:-color)?|accent-color):\s*([^;]+);/g,
    ))
      expect(value).toMatch(/var\(--|none|transparent|^0$/);
  });

  it('R1: sin dependencias nuevas en package.json', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(Object.keys(pkg.dependencies)).toHaveLength(10);
    expect(Object.keys(pkg.devDependencies)).toHaveLength(22);
  });
});
