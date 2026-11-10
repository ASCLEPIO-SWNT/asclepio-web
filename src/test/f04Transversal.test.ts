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

describe('F-04-web transversales', () => {
  it('R23: declara el contrato 0.5.0 y los tipos generados coinciden con la huella vigente', () => {
    expect(CONSUMED_CONTRACT).toBe('0.5.0');
    expect(EXPECTED_CONTRACT).toBe('0.5.0');
    expect(sha256('src/shared/api/schema.d.ts')).toBe(SCHEMA_SHA256);
    expect(sha256('src/features/triage/clinicalContract.generated.ts')).toBe(
      CLINICAL_CONTRACT_SHA256,
    );
  });
});

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === 'paraglide' ? [] : sources(path);
    return /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path) ? [path] : [];
  });
}

describe('F-04-web operaciones HTTP', () => {
  it('R23: las operaciones del código son las de 0.4.0 más GET y POST de triage-suggestions', () => {
    const used = new Set<string>();
    for (const file of sources('src'))
      for (const match of readFileSync(file, 'utf8').matchAll(
        /\.(GET|POST|PUT|PATCH|DELETE)\(\s*'([^']+)'/g,
      ))
        used.add(`${match[1]} ${match[2]}`);
    expect([...used].sort()).toEqual(WEB_OPERATIONS);
    expect(WEB_OPERATIONS).toContain(
      'GET /api/v1/encounters/{id}/triage-suggestions',
    );
    expect(WEB_OPERATIONS).toContain(
      'POST /api/v1/encounters/{id}/triage-suggestions',
    );
    expect(WEB_OPERATIONS).toHaveLength(18);
  });
});

/** Archivos de `src` que no son pruebas, fixtures ni tipos generados. */
function applicationSources(): string[] {
  return sources('src').filter(
    (file) =>
      !file.endsWith('schema.d.ts') &&
      !file.includes('/testing/') &&
      !file.startsWith('src/test/'),
  );
}

describe('F-04-web sin nada de 0.6.0', () => {
  it('R20: el código de aplicación no usa triage-decision, finalLevel, triagedAt ni triagedBy', () => {
    const files = applicationSources();
    expect(files).toContain(
      'src/features/triage/components/TriageSuggestionPanel.tsx',
    );
    expect(
      files.filter((file) =>
        /triage-decision|finalLevel|triagedAt|triagedBy/.test(
          readFileSync(file, 'utf8'),
        ),
      ),
    ).toEqual([]);
  });
});

const catalog = (group: string, locale: string) =>
  JSON.parse(
    readFileSync(`messages/${group}/${locale}.json`, 'utf8'),
  ) as Record<string, string>;

/** Plan i18n de design.md: claves nuevas de este slice. */
const SUGGESTION_KEYS = [
  'suggestion_title',
  'suggestion_request',
  'suggestion_request_again',
  'suggestion_needs_vitals',
  'suggestion_requesting',
  'suggestion_loading',
  'suggestion_load_error',
  'suggestion_empty',
  'suggestion_proposal_notice',
  'suggestion_level_label',
  'suggestion_explanation',
  'suggestion_factors',
  'suggestion_factor_finding',
  'suggestion_factor_age',
  'suggestion_factor_sex',
  'suggestion_factor_complaint',
  'suggestion_factor_complaint_source',
  'suggestion_guard_title',
  'suggestion_guard_llm',
  'suggestion_guard_reason',
  'suggestion_guard_reason_param',
  'suggestion_requested_meta',
  'suggestion_outdated',
  'suggestion_manual',
  'suggestion_conflict',
].sort();

const paramsOf = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe('F-04-web i18n, dependencias y estilos', () => {
  it('R21: npm run i18n:check pasa', () => {
    expect(() =>
      execFileSync(process.execPath, ['scripts/check-messages.mjs'], {
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });

  it('R21: las claves suggestion_* existen en los cinco idiomas con los mismos parámetros', () => {
    const es = catalog('features', 'es');
    expect(
      Object.keys(es)
        .filter((key) => key.startsWith('suggestion_'))
        .sort(),
    ).toEqual(SUGGESTION_KEYS);
    for (const locale of LOCALES) {
      const messages = catalog('features', locale);
      for (const key of SUGGESTION_KEYS) {
        expect(messages[key], `${locale}/${key}`).toBeTruthy();
        expect(paramsOf(messages[key]), `${locale}/${key}`).toEqual(
          paramsOf(es[key]),
        );
      }
    }
    // Textos de PA-4, literales en español.
    expect(es.suggestion_title).toBe('Sugerencia de triage (IA)');
    expect(es.suggestion_request).toBe('Pedir sugerencia');
    expect(es.suggestion_request_again).toBe('Pedir otra sugerencia');
    expect(es.suggestion_empty).toBe(
      'Todavía no se ha pedido ninguna sugerencia para esta atención.',
    );
    // Traducidos: el inglés no repite el español.
    const en = catalog('features', 'en');
    for (const key of SUGGESTION_KEYS)
      if (!['suggestion_factor_sex'].includes(key))
        expect(en[key], key).not.toBe(es[key]);
  });

  it('R21: la regla anti-literales no gana excepciones nuevas', () => {
    const source = readFileSync('src/test/noUiLiterals.test.ts', 'utf8');
    const block = source.slice(
      source.indexOf('const EXCEPTIONS'),
      source.indexOf('};', source.indexOf('const EXCEPTIONS')),
    );
    expect(block.match(/^\s*'[^']+\|[^']+':/gm)).toHaveLength(5);
    expect(block).not.toMatch(/Suggestion/);
  });

  it('R23: sin dependencias nuevas en package.json', () => {
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

  it('R24: el CSS del panel solo usa tokens, sin colores literales, y da foco visible al resultado', () => {
    const css = readFileSync('src/index.css', 'utf8');
    const start = css.indexOf('/* F-04-web');
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start);
    // `white-space` no es un color: se excluye con (?!-).
    expect(block).not.toMatch(
      /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\b(white|black)\b(?!-)/i,
    );
    for (const [, value] of block.matchAll(
      /(?:color|background|outline):\s*([^;]+);/g,
    ))
      expect(value).toMatch(/var\(--|none|transparent/);
    expect(block).toMatch(/\.suggestion-panel__result:focus-visible\s*\{/);
    // El texto del modelo puede ser largo: se parte en lugar de desbordar a 375 px.
    expect(block).toMatch(
      /\.suggestion-view__text\s*\{[^}]*overflow-wrap:\s*anywhere/,
    );
  });

  it('R24: los componentes del panel no usan estilos en línea', () => {
    for (const file of [
      'src/features/triage/components/TriageSuggestionPanel.tsx',
      'src/features/triage/components/TriageSuggestionView.tsx',
    ])
      expect(readFileSync(file, 'utf8')).not.toMatch(/style=\{/);
  });
});
