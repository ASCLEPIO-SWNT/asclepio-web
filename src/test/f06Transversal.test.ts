import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONSUMED_CONTRACT } from '../shared/api/client';
import { LOCALES } from '../shared/i18n/locale';
import {
  CLINICAL_CONTRACT_SHA256,
  EXPECTED_CONTRACT,
  SCHEMA_SHA256,
  WEB_OPERATIONS,
} from './contractBaseline';

const sha256 = (file: string) =>
  createHash('sha256').update(readFileSync(file)).digest('hex');

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === 'paraglide' ? [] : sources(path);
    return /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path) ? [path] : [];
  });
}

describe('F-06-web contrato', () => {
  it('R30: declara el contrato esperado y los tipos generados coinciden con la huella vigente', () => {
    // DT-02-web D2: la versión sale de contractBaseline.ts.
    expect(CONSUMED_CONTRACT).toBe(EXPECTED_CONTRACT);
    expect(sha256('src/shared/api/schema.d.ts')).toBe(SCHEMA_SHA256);
    expect(sha256('src/features/triage/clinicalContract.generated.ts')).toBe(
      CLINICAL_CONTRACT_SHA256,
    );
  });

  it('R30: los alias de la cola salen de los tipos generados (Schemas[...]), sin tipos escritos a mano', () => {
    const source = readFileSync('src/shared/api/client.ts', 'utf8');
    expect(source).toMatch(/export type Queue = Schemas\['QueueDto'\];/);
    expect(source).toMatch(
      /export type QueueItem = Schemas\['QueueItemDto'\];/,
    );
    expect(source).toMatch(
      /export type QueuePatient = Schemas\['QueuePatientDto'\];/,
    );
    // Ningún `interface` ni `type` de la cola fuera de esos alias.
    expect(source.match(/\bQueue\w*\s*=/g)).toHaveLength(3);
    expect(source).not.toMatch(/interface\s+Queue/);
  });
});

describe('F-06-web operaciones HTTP', () => {
  it('R30: las operaciones del código son las de F-05-web más GET /queue, start-care y close', () => {
    const used = new Set<string>();
    for (const file of sources('src'))
      for (const match of readFileSync(file, 'utf8').matchAll(
        /\.(GET|POST|PUT|PATCH|DELETE)\(\s*'([^']+)'/g,
      ))
        used.add(`${match[1]} ${match[2]}`);
    expect([...used].sort()).toEqual(WEB_OPERATIONS);
    for (const operation of [
      'GET /api/v1/queue',
      'POST /api/v1/encounters/{id}/start-care',
      'POST /api/v1/encounters/{id}/close',
    ])
      expect(WEB_OPERATIONS).toContain(operation);
    // Las 20 de F-05-web más las tres de la cola.
    expect(WEB_OPERATIONS).toHaveLength(23);
  });
});

const catalog = (group: string, locale: string) =>
  JSON.parse(
    readFileSync(`messages/${group}/${locale}.json`, 'utf8'),
  ) as Record<string, string>;
const paramsOf = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

/** Plan i18n de design.md: claves nuevas de este slice. */
const QUEUE_KEYS = [
  'queue_lead',
  'queue_col_level',
  'queue_col_wait',
  'queue_patient',
  'queue_age',
  'queue_level',
  'queue_wait_minutes',
  'queue_max_immediate',
  'queue_max_minutes',
  'queue_overdue',
  'queue_since_triage', // DT-02-web T3
  'queue_overdue_a11y', // DT-02-web T3
  'queue_empty_waiting',
  'queue_empty_triaged',
  'queue_empty_in_care',
  'queue_loading',
  'queue_server_time',
  'queue_refresh_failed',
  'queue_start',
  'queue_close',
  'queue_confirm_start_title',
  'queue_confirm_start_body',
  'queue_confirm_close_title',
  'queue_confirm_close_body',
  'queue_confirm',
  'queue_back',
  'queue_starting',
  'queue_closing',
  'queue_started',
  'queue_closed',
  'queue_conflict_start',
  'queue_conflict_close',
  'queue_gone',
  'queue_action_forbidden',
].sort();

/** Claves que F-06-web retira de los cinco catálogos (plan i18n). */
const RETIRED_KEYS = [
  'dash_queue_lead',
  'dash_queue_recent',
  'dash_queue_recent_loading',
  'dash_queue_recent_empty',
  'dash_queue_recent_error',
  'dash_queue_pending_title',
  'dash_queue_pending_body',
  'dash_recent_footer',
  'dash_recent_footer_one',
];

/** «Se actualiza sola» en cada idioma (UI-02-web R33). */
const UPDATES_ITSELF: Record<string, RegExp> = {
  es: /se actualiza sola/,
  en: /updates on its own/,
  pt: /se atualiza sozinha/,
  fr: /s’actualise automatiquement/,
  de: /aktualisiert sich .*von selbst/,
};

describe('F-06-web i18n', () => {
  it('R26: npm run i18n:check pasa', () => {
    expect(() =>
      execFileSync(process.execPath, ['scripts/check-messages.mjs'], {
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });

  it('R26: las claves queue_* existen en los cinco idiomas con los mismos parámetros y el inglés está traducido', () => {
    const es = catalog('features', 'es');
    expect(
      Object.keys(es)
        .filter((key) => key.startsWith('queue_'))
        .sort(),
    ).toEqual(QUEUE_KEYS);
    expect(
      Object.keys(catalog('common', 'es')).filter((key) =>
        key.startsWith('queue_'),
      ),
    ).toEqual([]);
    for (const locale of LOCALES) {
      const messages = catalog('features', locale);
      for (const key of QUEUE_KEYS) {
        expect(messages[key]?.trim(), `${locale}/${key}`).toBeTruthy();
        expect(paramsOf(messages[key]), `${locale}/${key}`).toEqual(
          paramsOf(es[key]),
        );
      }
    }
    const en = catalog('features', 'en');
    // Solo los formatos sin palabras coinciden con el español.
    for (const key of QUEUE_KEYS)
      if (key !== 'queue_patient' && key !== 'queue_wait_minutes')
        expect(en[key], key).not.toBe(es[key]);
  });

  it('R26: el español usa los textos de PA-2', () => {
    const es = catalog('features', 'es');
    expect(es.queue_lead).toBe(
      'Atenciones activas por nivel de triage y tiempo de espera.',
    );
    expect(es.queue_patient).toBe('{initials} · {age} · {sex}');
    expect(es.queue_age).toBe('{age} años');
    expect(es.queue_level).toBe('Nivel {level}');
    expect(es.queue_wait_minutes).toBe('{minutes} min');
    expect(es.queue_max_immediate).toBe('Atención inmediata');
    // DT-02-web PA-2 (a): el máximo se cuenta desde la clasificación.
    expect(es.queue_max_minutes).toBe(
      'Máx. {minutes} min desde la clasificación',
    );
    expect(es.queue_overdue).toBe('Tiempo máximo superado');
    expect(es.queue_empty_waiting).toBe(
      'No hay atenciones en espera de triage.',
    );
    expect(es.queue_empty_triaged).toBe('No hay atenciones clasificadas.');
    expect(es.queue_empty_in_care).toBe('No hay atenciones en curso.');
    expect(es.queue_loading).toBe('Cargando la cola…');
    expect(es.queue_server_time).toBe('Datos del servidor de las {time}');
    expect(es.queue_refresh_failed).toBe(
      'No se pudo actualizar la cola. Se muestran los datos de las {time}.',
    );
    expect(es.queue_start).toBe('Iniciar atención');
    expect(es.queue_close).toBe('Cerrar atención');
    expect(es.queue_confirm_start_title).toBe('¿Iniciar la atención?');
    expect(es.queue_confirm_start_body).toBe(
      '{patient}, nivel {level}. La atención pasará a «En atención» y dejará de contar el tiempo de espera.',
    );
    expect(es.queue_confirm_close_title).toBe('¿Cerrar la atención?');
    expect(es.queue_confirm_close_body).toBe(
      '{patient}, nivel {level}. La atención se cerrará y saldrá de la cola. No se puede deshacer.',
    );
    expect(es.queue_confirm).toBe('Confirmar');
    expect(es.queue_back).toBe('Volver');
    expect(es.queue_starting).toBe('Iniciando la atención…');
    expect(es.queue_closing).toBe('Cerrando la atención…');
    expect(es.queue_started).toBe('Atención iniciada.');
    expect(es.queue_closed).toBe('Atención cerrada.');
    expect(es.queue_conflict_start).toBe(
      'Esta atención ya no está clasificada. La cola se actualizó.',
    );
    expect(es.queue_conflict_close).toBe(
      'Esta atención ya no está en atención. La cola se actualizó.',
    );
    expect(es.queue_gone).toBe(
      'Esta atención ya no existe. La cola se actualizó.',
    );
    expect(es.queue_action_forbidden).toBe(
      'No tienes permiso para esta acción.',
    );
  });

  it('R26: guide_queue es estática, sin cifras ni parámetros, y nombra «Actualizar» y que la cola se actualiza sola en los cinco idiomas', () => {
    for (const locale of LOCALES) {
      const all = {
        ...catalog('common', locale),
        ...catalog('features', locale),
      };
      const guide = all.guide_queue;
      expect(paramsOf(guide), locale).toEqual([]);
      expect(guide, locale).not.toMatch(/\d/);
      expect(guide, locale).toContain(all.feature_refresh);
      expect(guide, locale).toMatch(UPDATES_ITSELF[locale]);
      expect(guide, locale).toContain(all.queue_overdue);
      // Ya no anuncia la cola como pendiente.
      expect(guide, locale).not.toMatch(
        /todavía no|not available yet|ainda não|pas encore|noch nicht/,
      );
    }
  });

  it('R26: ninguna clave nueva menciona «sugerencia», «IA» ni un código F-0<n>, y las retiradas ya no existen', () => {
    for (const locale of LOCALES) {
      const features = catalog('features', locale);
      for (const key of QUEUE_KEYS)
        expect(features[key], `${locale}/${key}`).not.toMatch(
          /sugerencia|suggestion|\bIA\b|\bAI\b|F-0\d/i,
        );
      for (const group of ['common', 'features'])
        for (const key of RETIRED_KEYS)
          expect(
            catalog(group, locale)[key],
            `${locale}/${group}/${key}`,
          ).toBeUndefined();
    }
  });

  it('R26: la regla anti-literales no gana excepciones nuevas', () => {
    const source = readFileSync('src/test/noUiLiterals.test.ts', 'utf8');
    const block = source.slice(
      source.indexOf('const EXCEPTIONS'),
      source.indexOf('};', source.indexOf('const EXCEPTIONS')),
    );
    expect(block.match(/^\s*'[^']+\|[^']+':/gm)).toHaveLength(5);
    expect(block).not.toMatch(/queue/i);
  });
});

/** Archivos de la feature `queue` que no son pruebas ni fixtures. */
const queueFiles = () =>
  sources('src/features/queue').filter((file) => !file.includes('/testing/'));

describe('F-06-web privacidad', () => {
  it('R27: la cola no usa almacenamiento, parámetros de URL, consola ni borradores', () => {
    const files = queueFiles();
    expect(files.length).toBeGreaterThanOrEqual(7);
    for (const file of files)
      expect(readFileSync(file, 'utf8'), file).not.toMatch(
        /localStorage|sessionStorage|useSearchParams|console\.|useDraft|drafts/,
      );
  });
});

describe('F-06-web estilos', () => {
  const block = () => {
    const css = readFileSync('src/index.css', 'utf8');
    const start = css.indexOf('/* F-06-web');
    expect(start).toBeGreaterThan(-1);
    return css.slice(start);
  };

  it('R28: el CSS de la cola solo usa tokens, sin colores literales', () => {
    const css = block();
    expect(css).not.toMatch(
      /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\b(white|black)\b(?!-)/i,
    );
    for (const [, value] of css.matchAll(
      /(?:color|background|outline|border(?:-color)?|accent-color):\s*([^;]+);/g,
    ))
      expect(value).toMatch(/var\(--|none|transparent|^0$|^\dpx solid var\(--/);
  });

  it('R28: la celda de espera usa flex-wrap para que la alerta baje en anchos estrechos, y las acciones de la fila se apilan', () => {
    const css = block();
    expect(css).toMatch(/\.queue-wait\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(css).toMatch(/\.queue-actions\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(css).toMatch(
      /@container panel \(max-width: 39\.99rem\)\s*\{[^@]*\.queue-actions\s*\{[^}]*flex-direction:\s*column/,
    );
    expect(css).toMatch(/\.queue-notice:focus-visible\s*\{/);
  });

  it('R28: los componentes de la cola no usan estilos en línea', () => {
    for (const file of queueFiles().filter((f) => f.endsWith('.tsx')))
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/style=\{/);
  });

  it('R17: los botones de acción del médico usan la misma clase que «Ver atención»', () => {
    const page = readFileSync(
      'src/features/queue/components/QueuePage.tsx',
      'utf8',
    );
    const section = readFileSync(
      'src/features/queue/components/QueueSection.tsx',
      'utf8',
    );
    expect(section).toMatch(
      /className="button button--secondary button--sm"\s+to=/,
    );
    expect(page).toMatch(
      /type="button"\s+className="button button--secondary button--sm"\s+aria-describedby=\{patientCellId\(item\)\}/,
    );
    expect(page).not.toMatch(/button--primary/);
  });
});

describe('F-06-web dependencias', () => {
  it('R30: sin dependencias nuevas en package.json', () => {
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
