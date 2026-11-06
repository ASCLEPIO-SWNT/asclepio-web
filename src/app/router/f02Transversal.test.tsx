import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { session } from '../../shared/api/session';
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
} from '../../shared/preferences/storage';
import {
  ENCOUNTER_ID,
  SITE_NORTE,
  encounter,
  encounterSummary,
  fakeApi,
  json,
  nnPatient,
  patient,
  pendingPreRegistration,
  publicTenants,
  staffMe,
  type RecordedRequest,
} from '../../test/fakeApi';
import { renderApp } from '../../test/testApp';

const PR = pendingPreRegistration;
const REJECT_REASON = 'Paciente no se presentó a la ventanilla';
const CANCEL_REASON = 'Se retiró sin ser atendido';
const COMPLAINT = 'Dolor abdominal intenso';
const NN_NAME = 'Hombre de chaqueta roja';

/** Datos personales que nunca pueden salir a la consola ni a la URL (R40). */
const PERSONAL = [
  patient.fullName!,
  patient.documentNumber!,
  patient.birthDate!,
  '17/05/1990',
  PR.chiefComplaintText,
  COMPLAINT,
  NN_NAME,
  REJECT_REASON,
  CANCEL_REASON,
];
const TIME_KEYS = [
  'arrivalAt',
  'preRegisteredAt',
  'expiresAt',
  'resolvedAt',
  'occurredAt',
  'createdAt',
  'updatedAt',
];
const CONSOLE_METHODS = [
  'log',
  'info',
  'warn',
  'error',
  'debug',
  'trace',
] as const;

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

function consoleOutput(): string {
  return spies
    .flatMap((spy) => spy.mock.calls.flat() as unknown[])
    .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
    .join('\n');
}

type Router = ReturnType<typeof renderApp>['router'];
const urls: string[] = [];

function trackUrls(router: Router) {
  urls.length = 0;
  const record = () => {
    const { pathname, search, hash } = router.state.location;
    urls.push(`${pathname}${search}${hash}`);
  };
  record();
  return router.subscribe(record);
}

/** R40: ningún dato personal en la consola ni en ninguna URL visitada; solo ids de atención. */
function expectNoLeaks() {
  const output = consoleOutput();
  for (const url of urls) {
    expect(url).toMatch(
      /^\/(recepcion(\/registro)?|atenciones(\/[0-9a-f-]{36})?|login|triage|cola|reportes)?$/,
    );
    for (const secret of PERSONAL) {
      expect(decodeURIComponent(url)).not.toContain(secret);
    }
  }
  for (const secret of PERSONAL) expect(output).not.toContain(secret);
  expect(Object.keys(localStorage)).toEqual([PREFERENCES_KEY]);
  expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY)!)).toEqual(
    DEFAULT_PREFERENCES,
  );
  const preferences = localStorage.getItem(PREFERENCES_KEY)!;
  for (const secret of PERSONAL) expect(preferences).not.toContain(secret);
}

function keysDeep(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(keysDeep);
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([k, v]) => [k, ...keysDeep(v)]);
}

/** R38: ningún cuerpo ni query lleva horas ni tenantId. */
function expectNoTimesNorTenant(requests: RecordedRequest[]) {
  for (const request of requests) {
    const keys = [...keysDeep(request.body), ...request.query.keys()];
    for (const key of [...TIME_KEYS, 'tenantId']) {
      expect(keys, `${request.method} ${request.path}`).not.toContain(key);
    }
  }
}

const BASE = {
  'GET /api/v1/me': json(200, staffMe.RECEPTION),
  'GET /api/v1/public/tenants': json(200, publicTenants),
  'GET /api/v1/encounters': json(200, { items: [encounterSummary()] }),
  [`GET /api/v1/encounters/${ENCOUNTER_ID}`]: json(200, encounter),
};

describe('F-02 transversal', () => {
  it('R40: confirmar y rechazar en la bandeja no filtran datos personales ni motivos a la consola ni a la URL; R38: sin horas ni tenantId', async () => {
    const other = {
      ...PR,
      id: 'c0c0c0c0-0000-4000-8000-0000000000bb',
      patient: { ...patient, id: 'p2', fullName: 'Otra Persona' },
    };
    const net = fakeApi({
      ...BASE,
      'GET /api/v1/pre-registrations': json(200, [PR, other]),
      [`POST /api/v1/pre-registrations/${PR.id}/confirm`]: json(201, encounter),
      [`POST /api/v1/pre-registrations/${other.id}/reject`]: json(200, {
        id: other.id,
        status: 'REJECTED',
        resolvedAt: '2026-10-27T15:00:00.000Z',
      }),
    });
    const user = userEvent.setup({ delay: null });
    const { router } = renderApp({ entries: ['/recepcion'], stored: true });
    const stop = trackUrls(router);

    const second = await screen.findByRole('article', {
      name: 'Otra Persona',
    });
    await user.click(within(second).getByRole('button', { name: 'Rechazar' }));
    await user.type(
      within(second).getByLabelText('Motivo del rechazo'),
      REJECT_REASON,
    );
    await user.click(
      within(second).getByRole('button', { name: 'Confirmar rechazo' }),
    );
    await screen.findByText('Preregistro rechazado.');

    const first = await screen.findByRole('article', {
      name: patient.fullName!,
    });
    await user.click(within(first).getByRole('checkbox'));
    await user.click(
      within(first).getByRole('button', { name: 'Confirmar llegada' }),
    );
    await screen.findByText(/Llegada confirmada\./);

    await user.click(screen.getByRole('link', { name: 'Ver atención' }));
    await screen.findByRole('heading', { level: 1, name: 'Atención' });
    expect(router.state.location.pathname).toBe(`/atenciones/${ENCOUNTER_ID}`);
    stop();

    expectNoLeaks();
    expectNoTimesNorTenant(net.requests);
  });

  it('R40: buscar, crear (con documento y NN), registrar la llegada y cancelar no filtran datos personales ni motivos; R26: el detalle muestra "Llegada registrada."; R38: sin horas ni tenantId', async () => {
    const created = {
      ...encounter,
      origin: 'DIRECT' as const,
      preRegistrationId: null,
      preRegisteredAt: null,
      chiefComplaintText: COMPLAINT,
    };
    const net = fakeApi({
      ...BASE,
      'GET /api/v1/pre-registrations': json(200, []),
      'GET /api/v1/patients': json(200, []),
      'POST /api/v1/patients': json(201, { ...nnPatient, fullName: NN_NAME }),
      'POST /api/v1/encounters': json(201, created),
      [`GET /api/v1/encounters/${ENCOUNTER_ID}`]: json(200, created),
      [`POST /api/v1/encounters/${ENCOUNTER_ID}/cancel`]: json(200, {
        ...created,
        status: 'CANCELLED',
        cancellationReason: CANCEL_REASON,
      }),
    });
    const user = userEvent.setup({ delay: null });
    const { router } = renderApp({
      entries: ['/recepcion/registro'],
      stored: true,
    });
    const stop = trackUrls(router);

    // Búsqueda sin resultados y alta con documento que falla en el cliente (sin enviar).
    const search = await screen.findByRole('form', { name: 'Buscar paciente' });
    await user.selectOptions(
      within(search).getByLabelText('Tipo de documento'),
      'Cédula de ciudadanía',
    );
    await user.type(
      within(search).getByLabelText('Número de documento'),
      patient.documentNumber!,
    );
    await user.click(within(search).getByRole('button', { name: 'Buscar' }));
    await user.click(
      await screen.findByRole('button', { name: 'Crear paciente' }),
    );
    const withDocument = screen.getByRole('form', { name: 'Crear paciente' });
    await user.type(
      within(withDocument).getByLabelText('Nombre completo'),
      patient.fullName!,
    );
    await user.click(
      within(withDocument).getByRole('button', { name: 'Guardar paciente' }),
    );
    await screen.findByText('Escribe la fecha de nacimiento.');

    // Alta NN y registro de llegada.
    await user.click(
      screen.getByRole('button', { name: 'Registrar paciente NN' }),
    );
    const nn = screen.getByRole('form', { name: 'Registrar paciente NN' });
    await user.type(within(nn).getByLabelText('Nombre completo'), NN_NAME);
    await user.selectOptions(
      within(nn).getByLabelText('Dato de edad'),
      'Edad estimada (años)',
    );
    await user.type(within(nn).getByLabelText('Edad estimada (años)'), '45');
    await user.selectOptions(within(nn).getByLabelText('Sexo'), 'Masculino');
    await user.click(
      within(nn).getByRole('button', { name: 'Guardar paciente' }),
    );
    const arrival = await screen.findByRole('form', {
      name: 'Registrar llegada',
    });
    await waitFor(() =>
      expect(within(arrival).getByLabelText('Sede')).toBeEnabled(),
    );
    await user.selectOptions(
      within(arrival).getByLabelText('Sede'),
      SITE_NORTE.name,
    );
    await user.type(
      within(arrival).getByLabelText('Motivo de consulta'),
      COMPLAINT,
    );
    await user.click(
      within(arrival).getByRole('button', { name: 'Registrar llegada' }),
    );

    // R26: navega al detalle y muestra el aviso.
    await screen.findByRole('heading', { level: 1, name: 'Atención' });
    expect(router.state.location.pathname).toBe(`/atenciones/${ENCOUNTER_ID}`);
    expect(
      (await screen.findByText('Llegada registrada.')).closest(
        '[role="status"]',
      ),
    ).not.toBeNull();

    // Cancelación.
    await user.click(screen.getByRole('button', { name: 'Cancelar atención' }));
    await user.type(
      screen.getByLabelText('Motivo de la cancelación'),
      CANCEL_REASON,
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirmar cancelación' }),
    );
    await screen.findByText('Atención cancelada.');
    stop();

    expectNoLeaks();
    expectNoTimesNorTenant(net.requests);
    expect(net.calls('POST /api/v1/encounters')[0].body).toEqual({
      patientId: nnPatient.id,
      siteId: SITE_NORTE.id,
      chiefComplaintText: COMPLAINT,
      complaintSource: 'TYPED',
    });
  });

  it('R38: las queries de bandeja y lista solo llevan sus parámetros', async () => {
    const net = fakeApi({
      ...BASE,
      'GET /api/v1/pre-registrations': json(200, [PR]),
    });
    const { router } = renderApp({ entries: ['/recepcion'], stored: true });
    await screen.findByRole('article', { name: patient.fullName! });
    await router.navigate('/atenciones');
    await screen.findByRole('table');
    expectNoTimesNorTenant(net.requests);
    expect([
      ...net.calls('GET /api/v1/pre-registrations')[0].query.keys(),
    ]).toEqual([]);
    // `/recepcion` pide primero el indicador de espera (`limit` y `status`); la lista de
    // `/atenciones` es la última petición de atenciones (`limit` y `offset`).
    const encounters = net.calls('GET /api/v1/encounters');
    expect([...encounters[0].query.keys()].sort()).toEqual(['limit', 'status']);
    expect([...encounters.at(-1)!.query.keys()].sort()).toEqual([
      'limit',
      'offset',
    ]);
  });

  it('R39: bandeja, lista y detalle muestran las horas en America/Bogota y las fechas de nacimiento sin desplazarse', async () => {
    // 04:30 UTC del 28/10 = 11:30 p. m. del 27/10 en Bogotá.
    const late = '2026-10-28T04:30:00.000Z';
    const birthDate = '2000-01-01';
    const p = { ...patient, birthDate };
    fakeApi({
      ...BASE,
      'GET /api/v1/pre-registrations': json(200, [
        { ...PR, preRegisteredAt: late, patient: p },
      ]),
      'GET /api/v1/encounters': json(200, {
        items: [encounterSummary({ arrivalAt: late, patient: p })],
      }),
      [`GET /api/v1/encounters/${ENCOUNTER_ID}`]: json(200, {
        ...encounter,
        arrivalAt: late,
        patient: p,
        events: [{ ...encounter.events[0], occurredAt: late }],
      }),
    });
    const { router } = renderApp({ entries: ['/recepcion'], stored: true });

    const card = await screen.findByRole('article', {
      name: patient.fullName!,
    });
    expect(card).toHaveTextContent(/Preregistro27\/10\/26, 11:30/);
    expect(card).toHaveTextContent('01/01/2000');
    expect(card).not.toHaveTextContent('31/12/1999');

    await router.navigate('/atenciones');
    const table = await screen.findByRole('table');
    expect(table).toHaveTextContent(/27\/10\/26, 11:30:00/);
    expect(table).not.toHaveTextContent(/28\/10\/26/);

    await router.navigate(`/atenciones/${ENCOUNTER_ID}`);
    await screen.findByText('Llegada (hora legal)');
    const page = screen.getByRole('region', { name: 'Atención' });
    expect(page).toHaveTextContent(
      /Llegada \(hora legal\)27\/10\/26, 11:30:00/,
    );
    expect(page).toHaveTextContent('01/01/2000');
    expect(
      within(screen.getByRole('region', { name: 'Línea de tiempo' })).getByRole(
        'listitem',
      ),
    ).toHaveTextContent(/27\/10\/26, 11:30:00/);
  });
});
