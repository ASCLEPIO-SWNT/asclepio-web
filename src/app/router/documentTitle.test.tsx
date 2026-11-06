import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StaffRole } from '../../shared/api/client';
import { session } from '../../shared/api/session';
import { translate, type Locale } from '../../shared/i18n';
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
} from '../../shared/preferences/storage';
import {
  ENCOUNTER_ID,
  encounter,
  encounterSummary,
  fakeApi,
  json,
  patient,
  pendingPreRegistration,
  publicTenants,
  staffMe,
} from '../../test/fakeApi';
import { renderApp } from '../../test/testApp';

const DETAIL = `GET /api/v1/encounters/${ENCOUNTER_ID}`;

function network(role: StaffRole = 'NURSE') {
  return fakeApi({
    'GET /api/v1/me': json(200, staffMe[role]),
    'GET /api/v1/public/tenants': json(200, publicTenants),
    'GET /api/v1/encounters': json(200, { items: [encounterSummary()] }),
    'GET /api/v1/pre-registrations': json(200, [pendingPreRegistration]),
    'GET /api/v1/health': json(200, {
      status: 'ok',
      time: '2026-10-29T15:00:00.000Z',
    }),
    [DETAIL]: json(200, encounter),
    [`${DETAIL}/clinical-capture`]: json(200, {
      encounterId: ENCOUNTER_ID,
      status: 'WAITING_TRIAGE',
      chiefComplaintText: encounter.chiefComplaintText,
      complaintSource: encounter.complaintSource,
      vitalSigns: [],
      symptomFindings: [],
    }),
  });
}

function withLocale(locale: Locale) {
  localStorage.setItem(
    PREFERENCES_KEY,
    JSON.stringify({ ...DEFAULT_PREFERENCES, locale }),
  );
}

const title = (locale: Locale, key: string) =>
  `${translate(locale, key)} | Asclepio`;

const announcer = () => document.querySelector('[data-route-announcer]');

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
  session.clear();
  document.title = '';
});

describe('UI-03-web título de la pestaña', () => {
  const SCREENS: [StaffRole, string, string][] = [
    ['RECEPTION', '/recepcion', 'common_nav_recepcion'],
    ['RECEPTION', '/recepcion/registro', 'feature_registration_direct'],
    ['NURSE', '/triage', 'common_nav_triage'],
    ['NURSE', `/triage/${ENCOUNTER_ID}`, 'clinical_capture_title'],
    ['PHYSICIAN', '/cola', 'common_nav_cola'],
    ['ADMIN', '/reportes', 'common_nav_reportes'],
    ['ADMIN', '/atenciones', 'common_nav_atenciones'],
    ['ADMIN', `/atenciones/${ENCOUNTER_ID}`, 'feature_encounter'],
  ];

  it.each(['es', 'en', 'pt', 'fr', 'de'] as const)(
    'R10: cada pantalla privada fija «{pantalla} | Asclepio» en %s, sin datos del paciente',
    async (locale) => {
      for (const [role, path, key] of SCREENS) {
        withLocale(locale);
        network(role);
        const { unmount } = renderApp({ entries: [path], stored: true });
        await waitFor(() => expect(document.title).toBe(title(locale, key)));
        expect(document.title).not.toContain(patient.fullName!);
        expect(document.title).not.toContain(patient.documentNumber!);
        unmount();
        session.clear();
      }
    },
  );

  it('R10: las pantallas públicas también tienen título; solo «Asclepio» en /', async () => {
    network();
    const { router } = renderApp({ entries: ['/'] });
    await waitFor(() => expect(document.title).toBe('Asclepio'));
    await act(() => router.navigate('/login'));
    await waitFor(() =>
      expect(document.title).toBe(title('es', 'feature_login_title')),
    );
    await act(() => router.navigate('/estado'));
    await waitFor(() =>
      expect(document.title).toBe(title('es', 'feature_system_status')),
    );
  });

  it('R10: el título cambia al cambiar de idioma', async () => {
    network('PHYSICIAN');
    const user = userEvent.setup();
    renderApp({ entries: ['/cola'], stored: true });
    await waitFor(() =>
      expect(document.title).toBe(title('es', 'common_nav_cola')),
    );
    await user.selectOptions(screen.getAllByLabelText('Idioma')[0], 'Deutsch');
    await waitFor(() =>
      expect(document.title).toBe(title('de', 'common_nav_cola')),
    );
  });

  it('R11: una única región viva cortés anuncia el nuevo título al navegar, sin mover el foco', async () => {
    network('NURSE');
    const user = userEvent.setup();
    renderApp({ entries: ['/triage'], stored: true });
    await waitFor(() =>
      expect(document.title).toBe(title('es', 'common_nav_triage')),
    );
    const regions = document.querySelectorAll('[data-route-announcer]');
    expect(regions).toHaveLength(1);
    expect(announcer()).toHaveAttribute('aria-live', 'polite');

    const link = await screen.findByRole('link', { name: 'Atenciones' });
    link.focus();
    await user.click(link);
    await waitFor(() =>
      expect(announcer()).toHaveTextContent(
        title('es', 'common_nav_atenciones'),
      ),
    );
    expect(document.activeElement).toBe(
      screen.getByRole('link', { name: 'Atenciones' }),
    );
    expect(document.querySelectorAll('[data-route-announcer]')).toHaveLength(1);
  });
});
