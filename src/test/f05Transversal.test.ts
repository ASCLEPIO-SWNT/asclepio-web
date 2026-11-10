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

describe('F-05-web contrato', () => {
  it('R28: declara el contrato esperado y los tipos generados coinciden con la huella vigente', () => {
    // F-06-web D1: la versión sale de contractBaseline.ts (0.7.0 desde F-06-web).
    expect(CONSUMED_CONTRACT).toBe(EXPECTED_CONTRACT);
    expect(sha256('src/shared/api/schema.d.ts')).toBe(SCHEMA_SHA256);
    expect(sha256('src/features/triage/clinicalContract.generated.ts')).toBe(
      CLINICAL_CONTRACT_SHA256,
    );
  });

  it('R28: los archivos de la tarjeta de triage no usan la cola, start-care ni close', () => {
    // F-06-web D1: la cola entra en 0.7.0 (la cubre F-06-web R30); la tarjeta sigue sin usarla.
    for (const file of DECISION_FILES)
      expect(readFileSync(file, 'utf8'), file).not.toMatch(
        /\/api\/v1\/queue|start-care|\/close'|Queue(Item|Patient)?Dto|Schemas\['Queue/,
      );
  });

  it('R28: los límites de la decisión se generan desde el contrato', () => {
    const generated = readFileSync(
      'src/features/triage/clinicalContract.generated.ts',
      'utf8',
    );
    expect(generated).toMatch(/^\/\/ Generated from OpenAPI 0\.7\.0 /);
    expect(generated).toMatch(/export const DECISION_LIMITS = \{/);
  });
});

describe('F-05-web operaciones HTTP', () => {
  it('R28: las operaciones del código son las de F-04-web más GET y POST de triage-decision', () => {
    const used = new Set<string>();
    for (const file of sources('src'))
      for (const match of readFileSync(file, 'utf8').matchAll(
        /\.(GET|POST|PUT|PATCH|DELETE)\(\s*'([^']+)'/g,
      ))
        used.add(`${match[1]} ${match[2]}`);
    expect([...used].sort()).toEqual(WEB_OPERATIONS);
    expect(WEB_OPERATIONS).toContain(
      'GET /api/v1/encounters/{id}/triage-decision',
    );
    expect(WEB_OPERATIONS).toContain(
      'POST /api/v1/encounters/{id}/triage-decision',
    );
  });
});

const catalog = (group: string, locale: string) =>
  JSON.parse(
    readFileSync(`messages/${group}/${locale}.json`, 'utf8'),
  ) as Record<string, string>;

/** Plan i18n de design.md: claves nuevas de este slice. */
const DECISION_KEYS = [
  'decision_title',
  'decision_validate',
  'decision_correct',
  'decision_correct_submit',
  'decision_cancel',
  'decision_manual_submit',
  'decision_level_legend',
  'decision_level_suggested',
  'decision_reason_label',
  'decision_reason_count',
  'decision_error_level',
  'decision_error_level_same',
  'decision_error_reason',
  'decision_error_reason_long',
  'decision_waiting_suggestion',
  'decision_submitting',
  'decision_conflict_changed',
  'decision_already_decided',
  'decision_final_level',
  'decision_action_label',
  'decision_action_validate',
  'decision_action_correct',
  'decision_action_manual',
  'decision_suggested_level',
  'decision_reason',
  'decision_recorded_meta',
  'decision_loading',
  'decision_load_error',
].sort();

const paramsOf = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

/** Componentes y lógica de la tarjeta de triage. */
const DECISION_FILES = [
  'src/features/triage/components/TriageDecisionCard.tsx',
  'src/features/triage/components/TriageDecisionActions.tsx',
  'src/features/triage/components/TriageDecisionView.tsx',
  'src/features/triage/components/LevelPicker.tsx',
  'src/features/triage/decisionForm.ts',
  'src/features/triage/hooks/useDecideTriage.ts',
  'src/features/triage/hooks/useTriageDecision.ts',
];

describe('F-05-web i18n', () => {
  it('R25: npm run i18n:check pasa', () => {
    expect(() =>
      execFileSync(process.execPath, ['scripts/check-messages.mjs'], {
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });

  it('R25: las claves decision_* y feature_event_triage_decided existen en los cinco idiomas con los mismos parámetros', () => {
    const es = catalog('features', 'es');
    expect(
      Object.keys(es)
        .filter((key) => key.startsWith('decision_'))
        .sort(),
    ).toEqual(DECISION_KEYS);
    for (const locale of LOCALES) {
      const messages = catalog('features', locale);
      for (const key of [...DECISION_KEYS, 'feature_event_triage_decided']) {
        expect(messages[key], `${locale}/${key}`).toBeTruthy();
        expect(paramsOf(messages[key]), `${locale}/${key}`).toEqual(
          paramsOf(es[key]),
        );
      }
    }
    // Textos de PA-1, literales en español.
    expect(es.decision_title).toBe('Triage de enfermería');
    expect(es.decision_validate).toBe('Validar nivel {level}');
    expect(es.decision_correct).toBe('Corregir');
    expect(es.decision_correct_submit).toBe('Enviar corrección');
    expect(es.decision_manual_submit).toBe('Registrar triage manual');
    expect(es.decision_error_level_same).toBe(
      'El nivel corregido debe ser distinto del sugerido.',
    );
    expect(es.decision_waiting_suggestion).toBe(
      'Espera a que se cargue la sugerencia para registrar el triage.',
    );
    expect(es.decision_recorded_meta).toBe('Registrado por {name} el {time}');
    expect(es.feature_event_triage_decided).toBe('Triage registrado');
    // Traducidos: el inglés no repite el español (salvo el contador numérico).
    const en = catalog('features', 'en');
    for (const key of [...DECISION_KEYS, 'feature_event_triage_decided'])
      if (key !== 'decision_reason_count')
        expect(en[key], key).not.toBe(es[key]);
  });

  it('R25: ninguna clave nueva usa el prefijo suggestion_ (la lista de F-04-web no cambia)', () => {
    const es = catalog('features', 'es');
    expect(
      Object.keys(es).filter((key) => key.startsWith('suggestion_')),
    ).toHaveLength(25);
  });

  it('R24: los textos que se ven antes de decidir no usan «final», «decisión», «decidido» ni «clasificado»', () => {
    const es = catalog('features', 'es');
    const beforeDeciding = DECISION_KEYS.filter(
      (key) =>
        ![
          'decision_final_level',
          'decision_already_decided',
          'decision_action_label',
          'decision_action_validate',
          'decision_action_correct',
          'decision_action_manual',
          'decision_suggested_level',
          'decision_reason',
          'decision_recorded_meta',
          'decision_loading',
          'decision_load_error',
        ].includes(key),
    );
    for (const key of beforeDeciding)
      expect(es[key], key).not.toMatch(/final|decisión|decidido|clasificad/i);
  });

  it('R25: la regla anti-literales no gana excepciones nuevas', () => {
    const source = readFileSync('src/test/noUiLiterals.test.ts', 'utf8');
    const block = source.slice(
      source.indexOf('const EXCEPTIONS'),
      source.indexOf('};', source.indexOf('const EXCEPTIONS')),
    );
    expect(block.match(/^\s*'[^']+\|[^']+':/gm)).toHaveLength(5);
    expect(block).not.toMatch(/Decision|LevelPicker/);
  });
});

describe('F-05-web privacidad', () => {
  it('R26: la tarjeta no usa almacenamiento, URL, consola, borradores de UI-03-web ni la guía de voz', () => {
    for (const file of DECISION_FILES)
      expect(readFileSync(file, 'utf8'), file).not.toMatch(
        /localStorage|sessionStorage|useDraft|drafts|console\.|VoiceGuide|useSearchParams|useNavigate|navigate\(|history\./,
      );
  });
});

describe('F-05-web estilos', () => {
  const block = () => {
    const css = readFileSync('src/index.css', 'utf8');
    const start = css.indexOf('/* F-05-web');
    expect(start).toBeGreaterThan(-1);
    return css.slice(start);
  };

  it('R27: el CSS de la tarjeta solo usa tokens, sin colores literales', () => {
    const css = block();
    expect(css).not.toMatch(
      /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\b(white|black)\b(?!-)/i,
    );
    for (const [, value] of css.matchAll(
      /(?:color|background|outline|border(?:-color)?|accent-color):\s*([^;]+);/g,
    ))
      expect(value).toMatch(/var\(--|none|transparent|^0$|^\dpx solid var\(--/);
  });

  it('R3, R27: Validar y Corregir comparten una sola regla de tamaño, sin variantes por botón', () => {
    const css = block();
    expect(css).toMatch(
      /\.decision-actions\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap/,
    );
    expect(css).toMatch(/\.decision-actions > \.button\s*\{[^}]*flex:\s*1 1 0/);
    // Ninguna regla apunta a un solo botón de la pareja.
    expect(css).not.toMatch(
      /\.decision-actions[^{]*(:first-child|:last-child|:nth-|\+|~|\.button--(?!secondary))/,
    );
    expect(css).not.toMatch(/decision[^{]*button--primary|validate|correct/i);
  });

  it('R27: el motivo largo se parte en lugar de desbordar', () => {
    const css = block();
    expect(css).toMatch(
      /\.decision-view__reason\s*\{[^}]*overflow-wrap:\s*anywhere/,
    );
    expect(css).toMatch(
      /\.decision-form textarea\s*\{[^}]*overflow-wrap:\s*anywhere/,
    );
    expect(css).toMatch(/\.decision-view:focus-visible\s*\{/);
  });

  it('R27: los componentes de la tarjeta no usan estilos en línea', () => {
    for (const file of DECISION_FILES.filter((f) => f.endsWith('.tsx')))
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/style=\{/);
  });

  it('R3: Validar y Corregir usan la misma clase secundaria y ningún botón de la tarjeta es principal', () => {
    const source = readFileSync(
      'src/features/triage/components/TriageDecisionActions.tsx',
      'utf8',
    );
    const classes = [...source.matchAll(/className="(button[^"]*)"/g)].map(
      (match) => match[1],
    );
    expect(classes.length).toBeGreaterThanOrEqual(4);
    expect(new Set(classes)).toEqual(new Set(['button button--secondary']));
    expect(source).not.toMatch(/autoFocus/);
  });
});

describe('F-05-web dependencias', () => {
  it('R28: sin dependencias nuevas en package.json', () => {
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
