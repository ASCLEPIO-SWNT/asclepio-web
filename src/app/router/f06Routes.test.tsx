import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { inspect } from 'node:util';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StaffRole } from '../../shared/api/client';
import { SESSION_KEY, session } from '../../shared/api/session';
import { translate } from '../../shared/i18n';
import { LOCALES } from '../../shared/i18n/locale';
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
} from '../../shared/preferences/storage';
import { patientLabel } from '../../features/queue/queueView';
import {
  CLOSE,
  GET_QUEUE,
  START_CARE,
  queue,
  queueBySite,
  queueResponse,
  startCareOk,
  triagedLevel1,
  triagedLevel2,
  waitingLong,
} from '../../features/queue/testing/queueFixtures';
import { closedEncounter } from '../../features/triage/testing/decisionFixtures';
import {
  ENCOUNTER_ID,
  SITE_SUR,
  fakeApi,
  json,
  problem,
  publicTenants,
  staffMe,
  type Handler,
} from '../../test/fakeApi';
import { renderApp } from '../../test/testApp';

const ME = 'GET /api/v1/me';
const TENANTS = 'GET /api/v1/public/tenants';
const DETAIL = `GET /api/v1/encounters/${ENCOUNTER_ID}`;

function setup({
  role = 'PHYSICIAN',
  path = '/cola',
  handlers = {},
}: {
  role?: StaffRole;
  path?: string;
  handlers?: Record<string, Handler>;
} = {}) {
  const net = fakeApi({
    [ME]: json(200, staffMe[role]),
    [TENANTS]: json(200, publicTenants),
    [GET_QUEUE]: queueBySite(),
    ...handlers,
  });
  return {
    net,
    user: userEvent.setup({ delay: null }),
    ...renderApp({ entries: [path], stored: true }),
  };
}

const loaded = () => screen.findAllByRole('link', { name: 'Ver atención' });
const rowOf = (id: string) =>
  document.getElementById(`queue-patient-${id}`)!.closest('tr') as HTMLElement;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  session.clear();
});

describe('F-06-web cola en la aplicación', () => {
  it.each(['PHYSICIAN', 'NURSE', 'ADMIN'] as const)(
    'R1, R2, R6: %s abre /cola y solo pide el perfil, las sedes y un GET /queue sin parámetros',
    async (role) => {
      const { net } = setup({ role });
      await loaded();
      expect(net.calls(GET_QUEUE)).toHaveLength(1);
      expect([...net.calls(GET_QUEUE)[0].query]).toEqual([]);
      expect(
        [...new Set(net.requests.map((r) => `${r.method} ${r.path}`))].sort(),
      ).toEqual([ME, TENANTS, GET_QUEUE].sort());
    },
  );

  it('R14: un 401 de GET /queue cierra la sesión y vuelve al login', async () => {
    const { router } = setup({ handlers: { [GET_QUEUE]: problem(401) } });
    await screen.findByRole('heading', { name: 'Iniciar sesión', level: 1 });
    expect(router.state.location.pathname).toBe('/login');
  });

  it('R23: un 401 de una acción del médico cierra la sesión y vuelve al login', async () => {
    const { user, router } = setup({
      handlers: { [CLOSE(queue.inCare[0].encounterId)]: problem(401) },
    });
    await loaded();
    await user.click(
      within(rowOf(queue.inCare[0].encounterId)).getByRole('button', {
        name: 'Cerrar atención',
      }),
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Confirmar',
      }),
    );
    await screen.findByRole('heading', { name: 'Iniciar sesión', level: 1 });
    expect(router.state.location.pathname).toBe('/login');
  });
});

describe('F-06-web línea de tiempo', () => {
  /** La atención tras iniciar y cerrar desde la cola (F-06-api R9: eventos STATUS_CHANGED). */
  const afterQueue = {
    ...closedEncounter,
    events: [
      {
        id: '20',
        type: 'STATUS_CHANGED',
        fromStatus: 'TRIAGED' as const,
        toStatus: 'IN_CARE' as const,
        payload: {},
        actor: {
          type: 'STAFF' as const,
          id: staffMe.PHYSICIAN.id,
          fullName: staffMe.PHYSICIAN.fullName,
        },
        occurredAt: '2026-10-28T15:45:00.000Z',
      },
      {
        id: '21',
        type: 'STATUS_CHANGED',
        fromStatus: 'IN_CARE' as const,
        toStatus: 'CLOSED' as const,
        payload: {},
        actor: {
          type: 'STAFF' as const,
          id: staffMe.PHYSICIAN.id,
          fullName: staffMe.PHYSICIAN.fullName,
        },
        occurredAt: '2026-10-28T16:10:00.000Z',
      },
    ],
  };

  it.each(LOCALES)(
    'R25: en %s, /atenciones/:id muestra los cambios a «En atención» y «Cerrada» con la etiqueta vigente de cambio de estado, sin eventos desconocidos ni acciones del médico',
    async (locale) => {
      localStorage.setItem(
        PREFERENCES_KEY,
        JSON.stringify({ ...DEFAULT_PREFERENCES, locale }),
      );
      setup({
        path: `/atenciones/${ENCOUNTER_ID}`,
        handlers: { [DETAIL]: json(200, afterQueue) },
      });
      const timeline = await screen.findByRole('region', {
        name: translate(locale, 'feature_timeline'),
      });
      const items = within(timeline).getAllByRole('listitem');
      expect(items).toHaveLength(2);
      const label = translate(locale, 'feature_event_status');
      expect(items[0]).toHaveTextContent(
        `${label} (${translate(locale, 'feature_status_triaged')} → ${translate(locale, 'feature_status_care')})`,
      );
      expect(items[1]).toHaveTextContent(
        `${label} (${translate(locale, 'feature_status_care')} → ${translate(locale, 'feature_status_closed')})`,
      );
      const unknown = translate(locale, 'feature_event_unknown', {
        type: 'STATUS_CHANGED',
      });
      expect(timeline).not.toHaveTextContent(unknown);
      expect(
        screen.queryByRole('button', {
          name: translate(locale, 'queue_start'),
        }),
      ).toBeNull();
      expect(
        screen.queryByRole('button', {
          name: translate(locale, 'queue_close'),
        }),
      ).toBeNull();
    },
  );
});

const CONSOLE_METHODS = [
  'log',
  'info',
  'warn',
  'error',
  'debug',
  'trace',
] as const;

describe('F-06-web privacidad', () => {
  it('R27: tras cargar, refrescar, filtrar y operar como PHYSICIAN, ni el almacenamiento, ni la URL ni la consola contienen datos de la cola', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const spies = CONSOLE_METHODS.map((method) => vi.spyOn(console, method));
    const { net, user, router } = setup({
      handlers: {
        [START_CARE(triagedLevel2.encounterId)]: startCareOk(triagedLevel2),
      },
    });
    const urls = [
      router.state.location.pathname + router.state.location.search,
    ];
    const stop = router.subscribe((state) =>
      urls.push(state.location.pathname + state.location.search),
    );
    await loaded();
    await user.click(screen.getByRole('button', { name: 'Actualizar' }));
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await waitFor(() => expect(net.calls(GET_QUEUE)).toHaveLength(3));
    await user.click(
      within(rowOf(triagedLevel2.encounterId)).getByRole('button', {
        name: 'Iniciar atención',
      }),
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Confirmar',
      }),
    );
    await screen.findByText('Atención iniciada.');
    await waitFor(() => expect(screen.getByLabelText('Sede')).toBeEnabled());
    await user.selectOptions(screen.getByLabelText('Sede'), SITE_SUR.id);
    await waitFor(() =>
      expect(net.calls(GET_QUEUE).at(-1)!.query.get('siteId')).toBe(
        SITE_SUR.id,
      ),
    );
    await loaded();
    stop();

    const secrets = [
      ...[...queue.waitingTriage, ...queue.triaged, ...queue.inCare].flatMap(
        (item) => [item.encounterId, patientLabel(item.patient)],
      ),
      'años',
    ];
    const leaks = (text: string) =>
      secrets.filter((secret) => text.includes(secret));
    for (const url of urls) {
      expect(url).toBe('/cola');
      expect(leaks(url)).toEqual([]);
    }
    expect(Object.keys(localStorage)).toEqual([PREFERENCES_KEY]);
    expect(Object.keys(sessionStorage)).toEqual([SESSION_KEY]);
    const stored = [localStorage, sessionStorage]
      .flatMap((store) =>
        Object.keys(store).map((key) => `${key}=${store.getItem(key)}`),
      )
      .join('\n');
    expect(leaks(stored)).toEqual([]);
    expect(stored).not.toContain(SITE_SUR.id);
    const output = spies
      .flatMap((spy) => spy.mock.calls.flat() as unknown[])
      .map((arg) =>
        typeof arg === 'string' ? arg : inspect(arg, { depth: 6 }),
      )
      .join('\n');
    expect(leaks(output)).toEqual([]);
  });
});

describe('F-06-web idioma', () => {
  it('R28: al cambiar el idioma con la cola en pantalla, las secciones, las filas y la alerta se muestran traducidas', async () => {
    const { user } = setup({ handlers: { [GET_QUEUE]: queueResponse() } });
    await loaded();
    expect(rowOf(waitingLong.encounterId)).toHaveTextContent(
      'MR · 34 años · Masculino',
    );
    await user.selectOptions(screen.getAllByLabelText('Idioma')[0], 'en');
    await screen.findByRole('heading', { level: 2, name: 'Triaged' });
    expect(rowOf(waitingLong.encounterId)).toHaveTextContent(
      'MR · 34 years · Male',
    );
    const first = rowOf(triagedLevel1.encounterId);
    expect(first).toHaveTextContent('Maximum time exceeded');
    expect(first).toHaveTextContent('Immediate care');
    expect(first).toHaveTextContent('Level I');
    expect(
      within(first).getByRole('button', { name: 'Start care' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Server data as of /)).toBeInTheDocument();
  });
});
