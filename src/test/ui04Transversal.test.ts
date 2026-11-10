import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONSUMED_CONTRACT } from '../shared/api/client';
import { LOCALES } from '../shared/i18n/locale';
import {
  EXPECTED_CONTRACT,
  SCHEMA_SHA256,
  WEB_OPERATIONS,
} from './contractBaseline';

/** Dependencias de `package.json` al empezar UI-04 (5d759d9): el slice no añade ninguna. */
const DEPENDENCIES = [
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
];
const DEV_DEPENDENCIES_COUNT = 22;

/** Claves nuevas de este slice (plan i18n de design.md), sin parámetros. */
const NEW_KEYS = [
  'feature_encounters_lead',
  'feature_encounters_results',
  'feature_registration_direct_lead',
  'feature_reception_back',
];

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === 'paraglide' ? [] : sources(path);
    return /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path) ? [path] : [];
  });
}

const catalog = (group: string, locale: string) =>
  JSON.parse(
    readFileSync(`messages/${group}/${locale}.json`, 'utf8'),
  ) as Record<string, string>;

describe('UI-04-web transversales', () => {
  it('R18: npm run i18n:check pasa: mismas claves y parámetros en los cinco catálogos', () => {
    expect(() =>
      execFileSync(process.execPath, ['scripts/check-messages.mjs'], {
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });

  it('R18: las claves nuevas existen en los cinco idiomas, sin parámetros y traducidas', () => {
    for (const key of NEW_KEYS) {
      const values = LOCALES.map((locale) => catalog('features', locale)[key]);
      for (const value of values) {
        expect(value, key).toBeTruthy();
        expect(value, key).not.toMatch(/\{\w+\}/);
      }
      // «Resultados» coincide en es y pt; el resto de idiomas lo traduce.
      expect(new Set(values).size, key).toBeGreaterThanOrEqual(4);
    }
    for (const locale of LOCALES)
      expect(catalog('common', locale).common_pending).not.toMatch(/\{/);
  });

  it('R18: la regla anti-literales de UI no gana excepciones nuevas', () => {
    const source = readFileSync('src/test/noUiLiterals.test.ts', 'utf8');
    const block = source.slice(
      source.indexOf('const EXCEPTIONS'),
      source.indexOf('};', source.indexOf('const EXCEPTIONS')),
    );
    expect(block.match(/^\s*'[^']+\|[^']+':/gm)).toHaveLength(5);
  });

  it('R19: consume el contrato declarado con schema.d.ts intacto', () => {
    expect(CONSUMED_CONTRACT).toBe(EXPECTED_CONTRACT);
    expect(
      createHash('sha256')
        .update(readFileSync('src/shared/api/schema.d.ts'))
        .digest('hex'),
    ).toBe(SCHEMA_SHA256);
  });

  it('R19: no hay operaciones HTTP nuevas en el código', () => {
    const used = new Set<string>();
    for (const file of sources('src'))
      for (const match of readFileSync(file, 'utf8').matchAll(
        /\.(GET|POST|PUT|PATCH|DELETE)\(\s*'([^']+)'/g,
      ))
        used.add(`${match[1]} ${match[2]}`);
    expect([...used].sort()).toEqual(WEB_OPERATIONS);
  });

  it('R19: sin dependencias nuevas en package.json', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(Object.keys(pkg.dependencies).sort()).toEqual(DEPENDENCIES);
    expect(Object.keys(pkg.devDependencies)).toHaveLength(
      DEV_DEPENDENCIES_COUNT,
    );
  });
});
