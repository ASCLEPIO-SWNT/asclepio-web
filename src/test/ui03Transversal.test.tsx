import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { CONSUMED_CONTRACT } from '../shared/api/client';
import { session } from '../shared/api/session';
import { PREFERENCES_KEY } from '../shared/preferences/storage';
import {
  ENCOUNTER_ID,
  encounter,
  fakeApi,
  json,
  networkError,
  patient,
  publicTenants,
  staffMe,
} from './fakeApi';
import { renderApp } from './testApp';

/** Las peticiones que la web hacía al empezar UI-03 (contrato 0.4.0): este slice no añade ninguna. */
const BASELINE_REQUESTS = [
  'GET /api/v1/encounters',
  'GET /api/v1/encounters/{id}',
  'GET /api/v1/encounters/{id}/clinical-capture',
  'GET /api/v1/health',
  'GET /api/v1/me',
  'GET /api/v1/patients',
  'GET /api/v1/pre-registrations',
  'GET /api/v1/public/tenants',
  'POST /api/v1/auth/login',
  'POST /api/v1/encounters',
  'POST /api/v1/encounters/{id}/cancel',
  'POST /api/v1/encounters/{id}/symptom-findings',
  'POST /api/v1/encounters/{id}/vital-signs',
  'POST /api/v1/patients',
  'POST /api/v1/pre-registrations/{id}/confirm',
  'POST /api/v1/pre-registrations/{id}/reject',
];
/** SHA-256 de `schema.d.ts` en el commit de partida (0bd94f7). */
const SCHEMA_SHA256 =
  '4aa1abd68b07ea5f0671b3afae41d4c911ad52638c5bf2485a44993c9376ffb7';

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === 'paraglide' ? [] : sources(path);
    return /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path) ? [path] : [];
  });
}

const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'] as const;
let spies: MockInstance[] = [];

beforeEach(() => {
  spies = CONSOLE_METHODS.map((method) => vi.spyOn(console, method));
});

afterEach(() => {
  spies.forEach((spy) => spy.mockRestore());
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
  session.clear();
});

describe('UI-03-web transversales', () => {
  it('R29: el CSS nuevo del slice solo usa tokens, sin colores literales', () => {
    const css = readFileSync('src/shared/ui/dashboard.css', 'utf8');
    const block = css.slice(css.indexOf('/* UI-03-web'));
    expect(block.length).toBeGreaterThan(0);
    expect(block).not.toMatch(
      /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\b(white|black)\b/i,
    );
    for (const [, value] of block.matchAll(
      /(?:color|background):\s*([^;]+);/g,
    )) {
      expect(value).toMatch(/var\(--/);
    }
  });

  it('R29: los componentes nuevos reutilizan las clases y los iconos Heroicons existentes', () => {
    for (const file of [
      'src/shared/ui/RouteError.tsx',
      'src/shared/ui/ConfirmDialog.tsx',
      'src/shared/ui/DraftNotice.tsx',
      'src/shared/ui/RouteLoading.tsx',
    ]) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/style=\{/);
      expect(source).toMatch(
        /className="(button|panel-state|status|card)|PanelState/,
      );
    }
  });

  it('R32: consume el contrato 0.4.0 sin cambiar los tipos generados', () => {
    expect(CONSUMED_CONTRACT).toBe('0.4.0');
    const schema = readFileSync('src/shared/api/schema.d.ts');
    expect(createHash('sha256').update(schema).digest('hex')).toBe(
      SCHEMA_SHA256,
    );
  });

  it('R32: la web no hace ninguna petición nueva', () => {
    const calls = new Set<string>();
    for (const file of sources('src')) {
      for (const [, method, path] of readFileSync(file, 'utf8').matchAll(
        /api\.(GET|POST|PUT|PATCH|DELETE)\(\s*'([^']+)'/g,
      )) {
        calls.add(`${method} ${path}`);
      }
    }
    expect([...calls].sort()).toEqual(BASELINE_REQUESTS);
  });

  it('R31: cambios sin guardar, salida sin guardar y error de red no dejan datos personales en la consola, la URL ni localStorage', async () => {
    const net = fakeApi({
      'GET /api/v1/me': json(200, staffMe.NURSE),
      'GET /api/v1/public/tenants': json(200, publicTenants),
      'GET /api/v1/encounters': networkError(),
      [`GET /api/v1/encounters/${ENCOUNTER_ID}`]: json(200, encounter),
      [`GET /api/v1/encounters/${ENCOUNTER_ID}/clinical-capture`]: json(200, {
        encounterId: ENCOUNTER_ID,
        status: 'WAITING_TRIAGE',
        chiefComplaintText: encounter.chiefComplaintText,
        complaintSource: encounter.complaintSource,
        vitalSigns: [],
        symptomFindings: [],
      }),
    });
    const user = userEvent.setup({ delay: null });
    const { router } = renderApp({
      entries: [`/triage/${ENCOUNTER_ID}`],
      stored: true,
    });
    const urls: string[] = [];
    const stop = router.subscribe(({ location }) =>
      urls.push(`${location.pathname}${location.search}`),
    );
    await waitFor(() =>
      expect(screen.getByLabelText(/Frecuencia respiratoria/)).toBeEnabled(),
    );
    await user.type(screen.getByLabelText('Descripción'), patient.fullName!);
    await user.click(
      within(screen.getByRole('navigation', { name: 'Principal' })).getByRole(
        'link',
        { name: 'Atenciones' },
      ),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Salir sin guardar' }),
    );
    await screen.findByText('No hay conexión con el servidor.');
    stop();

    const secrets = [
      patient.fullName!,
      patient.documentNumber!,
      patient.birthDate!,
      encounter.chiefComplaintText,
    ];
    const output = spies
      .flatMap((spy) => spy.mock.calls.flat() as unknown[])
      .map(String)
      .join('\n');
    for (const secret of secrets) {
      expect(output).not.toContain(secret);
      for (const url of urls)
        expect(decodeURIComponent(url)).not.toContain(secret);
      for (const key of Object.keys(localStorage)) {
        expect(localStorage.getItem(key)).not.toContain(secret);
      }
    }
    expect(
      Object.keys(localStorage).filter((k) => k !== PREFERENCES_KEY),
    ).toEqual([]);
    expect(Object.keys(sessionStorage)).toEqual(['asclepio.session']);
    expect(
      net.requests.every(
        (r) => !JSON.stringify(r.body ?? '').includes(patient.fullName!),
      ),
    ).toBe(true);
  });
});
