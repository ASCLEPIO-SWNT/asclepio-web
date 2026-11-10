import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StaffRole } from '../../shared/api/client';
import { session } from '../../shared/api/session';
import { LOCALES, setCurrentLocale } from '../../shared/i18n/locale';
import { PendingStrip } from '../../shared/ui/PendingStrip';
import {
  SITE_ESTE,
  SITE_NORTE,
  SITE_SUR,
  encountersFor,
  fakeApi,
  json,
  pendingPreRegistration,
  publicTenantsWith,
  staffMe,
} from '../../test/fakeApi';
import { renderApp } from '../../test/testApp';
import {
  GET_QUEUE,
  queueResponse,
} from '../../features/queue/testing/queueFixtures';

/** Texto neutral de la franja «pendiente» en cada idioma (D10). */
const NEUTRAL: Record<(typeof LOCALES)[number], string> = {
  es: 'Esta funcionalidad aún no está disponible.',
  en: 'This feature is not available yet.',
  pt: 'Esta funcionalidade ainda não está disponível.',
  fr: "Cette fonctionnalité n'est pas encore disponible.",
  de: 'Diese Funktion ist noch nicht verfügbar.',
};
const FEATURE_CODE = /F-0\d/;

const DASHBOARDS: Array<{ role: StaffRole; path: string; title: string }> = [
  { role: 'RECEPTION', path: '/recepcion', title: 'Recepción' },
  { role: 'NURSE', path: '/triage', title: 'Triage' },
  { role: 'PHYSICIAN', path: '/cola', title: 'Cola priorizada' },
  { role: 'ADMIN', path: '/reportes', title: 'Reportes' },
];

function dashboardApi(role: StaffRole) {
  return fakeApi({
    'GET /api/v1/me': json(200, staffMe[role]),
    'GET /api/v1/public/tenants': json(
      200,
      publicTenantsWith([SITE_NORTE, SITE_SUR, SITE_ESTE]),
    ),
    'GET /api/v1/pre-registrations': json(200, [pendingPreRegistration]),
    'GET /api/v1/encounters': encountersFor(() => 3),
    // F-06-web: /cola lee la cola priorizada.
    [GET_QUEUE]: queueResponse(),
  });
}

afterEach(() => {
  setCurrentLocale('es');
  vi.unstubAllGlobals();
  sessionStorage.clear();
  session.clear();
});

describe('UI-04-web franja «pendiente» sin códigos internos', () => {
  it.each([
    ['ADMIN', '/reportes', 'Reportes', 'Indicadores y reportes'],
  ] as const)(
    'R10: %s ve en %s la franja con el texto neutral, sin código de feature',
    async (role, path, title, strip) => {
      dashboardApi(role);
      renderApp({ entries: [path], stored: true });
      await screen.findByRole('heading', { level: 1, name: title });
      const pending = screen.getByRole('region', { name: strip });
      expect(pending).toHaveTextContent(NEUTRAL.es);
      expect(pending.textContent).not.toMatch(FEATURE_CODE);
    },
  );

  it.each(LOCALES)(
    'R10: en %s la franja dice el texto neutral, sin código de feature',
    (locale) => {
      setCurrentLocale(locale);
      render(
        <PendingStrip id="pendiente" title="Título">
          Cuerpo
        </PendingStrip>,
      );
      const pending = screen.getByRole('region', { name: 'Título' });
      expect(pending).toHaveTextContent(NEUTRAL[locale]);
      expect(pending.textContent).not.toMatch(FEATURE_CODE);
    },
  );

  it('R10: ningún valor de los cinco catálogos contiene un código F-0<n>', () => {
    for (const group of ['common', 'features'])
      for (const locale of LOCALES) {
        const catalog = JSON.parse(
          readFileSync(`messages/${group}/${locale}.json`, 'utf8'),
        ) as Record<string, string>;
        for (const [key, value] of Object.entries(catalog))
          expect(value, `${group}/${locale}: ${key}`).not.toMatch(FEATURE_CODE);
        if (group === 'common')
          expect(catalog.common_pending).toBe(NEUTRAL[locale]);
      }
  });

  it.each(DASHBOARDS)(
    'R10: el texto visible de $path ($role) no contiene un código F-0<n>',
    async ({ role, path, title }) => {
      dashboardApi(role);
      const { container } = renderApp({ entries: [path], stored: true });
      await screen.findByRole('heading', { level: 1, name: title });
      expect(container.textContent).not.toMatch(FEATURE_CODE);
    },
  );
});
