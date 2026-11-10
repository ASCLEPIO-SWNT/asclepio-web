import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Encounter, StaffRole } from '../../../shared/api/client';
import { formatBogota } from '../../../shared/lib/datetime';
import {
  ENCOUNTER_ID,
  deferred,
  encounter,
  fakeApi,
  json,
  networkError,
  nnPatient,
  problem,
  type Handler,
} from '../../../test/fakeApi';
import { renderFeature } from '../../../test/renderFeature';
import { encounterRoutes } from '../routes';

const DETAIL = `GET /api/v1/encounters/${ENCOUNTER_ID}`;
const CANCEL = `POST /api/v1/encounters/${ENCOUNTER_ID}/cancel`;
const ROLES: StaffRole[] = ['RECEPTION', 'NURSE', 'PHYSICIAN', 'ADMIN'];
const STATUSES: Encounter['status'][] = [
  'REGISTERED',
  'WAITING_TRIAGE',
  'TRIAGED',
  'IN_CARE',
  'CLOSED',
  'CANCELLED',
];

const cancelled: Encounter = {
  ...encounter,
  status: 'CANCELLED',
  cancellationReason: 'Se retiró antes del triage',
  events: [
    ...encounter.events,
    {
      id: '11',
      type: 'STATUS_CHANGED',
      fromStatus: 'WAITING_TRIAGE',
      toStatus: 'CANCELLED',
      payload: { reason: 'oculto' },
      actor: { type: 'STAFF', id: 'x', fullName: 'Nora Enfermera' },
      occurredAt: '2026-10-27T16:00:00.000Z',
    },
  ],
};

function setup(
  routes: Record<string, Handler> = {},
  { role = 'NURSE', state }: { role?: StaffRole; state?: unknown } = {},
) {
  const net = fakeApi({
    [DETAIL]: json(200, encounter),
    [`${DETAIL}/clinical-capture`]: json(200, {
      encounterId: encounter.id,
      status: encounter.status,
      chiefComplaintText: encounter.chiefComplaintText,
      complaintSource: encounter.complaintSource,
      vitalSigns: [],
      symptomFindings: [],
    }),
    ...routes,
  });
  const user = userEvent.setup();
  const view = renderFeature(encounterRoutes, {
    entries: [{ pathname: `/atenciones/${ENCOUNTER_ID}`, state }],
    role,
  });
  return { net, user, ...view };
}

const details = async () => {
  await screen.findByText('Llegada (hora legal)');
  return screen.getByRole('region', { name: 'Atención' });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('EncounterDetailPage', () => {
  it('R31: muestra estado, origen, sede, llegada legal, pre-registro de referencia, quién registró, motivo con su fuente y paciente', async () => {
    setup();
    const page = await details();
    expect(page).toHaveTextContent('EstadoEn espera de triage');
    expect(page).toHaveTextContent('OrigenPre-registro (app)');
    expect(page).toHaveTextContent('SedeSede Norte');
    expect(page).toHaveTextContent(
      `Llegada (hora legal)${formatBogota(encounter.arrivalAt)}`,
    );
    expect(page).toHaveTextContent(
      `Pre-registro (referencia)${formatBogota(encounter.preRegisteredAt!)}`,
    );
    expect(page).toHaveTextContent('Rosa Recepción');
    expect(page).toHaveTextContent('Dolor de cabeza desde ayer (Escrito)');
    const patientSection = screen.getByRole('region', { name: 'Paciente' });
    expect(patientSection).toHaveTextContent('Laura Gómez Pérez');
    expect(patientSection).toHaveTextContent('Cédula de ciudadanía 1032456789');
    expect(patientSection).toHaveTextContent('17/05/1990');
    expect(patientSection).toHaveTextContent('Femenino');
    expect(screen.queryByText('Motivo de la cancelación')).toBeNull();
  });

  it('R31: sin preRegisteredAt no muestra "Pre-registro (referencia)"; si está CANCELLED muestra el motivo', async () => {
    setup({
      [DETAIL]: json(200, {
        ...cancelled,
        origin: 'DIRECT',
        preRegistrationId: null,
        preRegisteredAt: null,
        complaintSource: 'VOICE_ON_DEVICE',
        patient: nnPatient,
      }),
    });
    const page = await details();
    expect(within(page).queryByText('Pre-registro (referencia)')).toBeNull();
    expect(page).toHaveTextContent(
      'Motivo de la cancelaciónSe retiró antes del triage',
    );
    expect(page).toHaveTextContent('(Dictado en el dispositivo)');
    expect(page).toHaveTextContent('OrigenRegistro directo');
    expect(screen.getByRole('region', { name: 'Paciente' })).toHaveTextContent(
      'Paciente NN',
    );
  });

  it('R32: la línea de tiempo es un <ol> en el orden de la API, con hora, etiqueta, estados, actor y sin payload', async () => {
    setup();
    await details();
    const timeline = screen.getByRole('region', { name: 'Línea de tiempo' });
    const list = within(timeline).getByRole('list');
    expect(list.tagName).toBe('OL');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(
      formatBogota(encounter.events[0].occurredAt),
    );
    expect(items[0]).toHaveTextContent('Atención creada');
    expect(items[0]).toHaveTextContent('Rosa Recepción');
    expect(items[1]).toHaveTextContent(
      'Cambio de estado (Registrada → En espera de triage)',
    );
    expect(items[1]).toHaveTextContent('Sistema');
    // F-05-web D16: TRIAGE_DECIDED ya tiene etiqueta; los tipos desconocidos los cubre labels.test.ts.
    expect(items[2]).toHaveTextContent('Triage registrado');
    expect(items[2]).toHaveTextContent('Paciente');
    expect(timeline).not.toHaveTextContent('payload-no-visible');
  });

  it('R32: un tipo de evento desconocido se tolera en la línea de tiempo con su etiqueta genérica', async () => {
    const future = {
      ...encounter.events[0],
      id: '99',
      // Tipo que el contrato aún no declara: el cliente debe tolerarlo.
      type: 'FUTURE_EVENT' as Encounter['events'][number]['type'],
      payload: { secreto: 'payload-futuro-no-visible' },
    };
    setup({
      [DETAIL]: json(200, {
        ...encounter,
        events: [...encounter.events, future],
      }),
    });
    await details();
    const timeline = screen.getByRole('region', { name: 'Línea de tiempo' });
    const items = within(timeline).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[3]).toHaveTextContent('Evento (FUTURE_EVENT)');
    expect(timeline).not.toHaveTextContent('payload-futuro-no-visible');
  });

  it('R32: respeta el orden de la API aunque no sea cronológico', async () => {
    const [a, b, c] = encounter.events;
    setup({ [DETAIL]: json(200, { ...encounter, events: [c, a, b] }) });
    await details();
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining('Triage registrado'),
      expect.stringContaining('Atención creada'),
      expect.stringContaining('Cambio de estado'),
    ]);
  });

  it('R33: con 404 muestra "No se encontró la atención." y un enlace a /atenciones', async () => {
    setup({ [DETAIL]: problem(404) });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se encontró la atención.');
    expect(
      within(alert).getByRole('link', { name: 'Volver a las atenciones' }),
    ).toHaveAttribute('href', '/atenciones');
  });

  it('R33: muestra role="status" mientras carga', async () => {
    const gate = deferred(json(200, encounter));
    setup({ [DETAIL]: gate.handler });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Cargando la atención…',
    );
    act(() => gate.release());
    await details();
  });

  it.each([[problem(500)], [networkError()]])(
    'R33: si falla de otro modo muestra el error de carga con Reintentar (%#)',
    async (handler) => {
      const { net, user } = setup({ [DETAIL]: handler });
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('No se pudo cargar la atención.');
      net.set(DETAIL, json(200, encounter));
      await user.click(
        within(alert).getByRole('button', { name: 'Reintentar' }),
      );
      await details();
    },
  );

  it('R3: si GET /encounters/{id} responde 403 muestra sin permiso sin datos', async () => {
    setup({ [DETAIL]: problem(403) });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tienes permiso para ver esta página.',
    );
    expect(screen.queryByText('Laura Gómez Pérez')).toBeNull();
  });

  it('R26: muestra "Llegada registrada." en role="status" cuando llega con el aviso del registro directo', async () => {
    setup({}, { role: 'RECEPTION', state: { notice: 'arrival-registered' } });
    await details();
    expect(screen.getByRole('status')).toHaveTextContent('Llegada registrada.');
  });

  it('R26: sin el aviso en el estado de navegación no muestra "Llegada registrada."', async () => {
    setup({}, { role: 'RECEPTION' });
    await details();
    expect(screen.queryByText('Llegada registrada.')).toBeNull();
  });
});

describe('EncounterDetailPage — cancelación', () => {
  describe.each(ROLES)('rol %s', (role) => {
    it.each(STATUSES)('R34: con estado %s', async (status) => {
      setup({ [DETAIL]: json(200, { ...encounter, status }) }, { role });
      await details();
      const allowed =
        (role === 'RECEPTION' || role === 'NURSE') &&
        status !== 'CLOSED' &&
        status !== 'CANCELLED';
      expect(
        screen.queryByRole('button', { name: 'Cancelar atención' }) !== null,
      ).toBe(allowed);
    });
  });

  async function openCancel(user: ReturnType<typeof userEvent.setup>) {
    await details();
    await user.click(screen.getByRole('button', { name: 'Cancelar atención' }));
    return screen.getByRole('form', { name: 'Cancelar atención' });
  }

  it('R34: "Cancelar atención" muestra el motivo con "Confirmar cancelación" y "Volver", que lo oculta sin llamar a la API', async () => {
    const { net, user } = setup();
    const form = await openCancel(user);
    expect(
      within(form).getByLabelText('Motivo de la cancelación'),
    ).toBeVisible();
    expect(
      within(form).getByRole('button', { name: 'Confirmar cancelación' }),
    ).toBeVisible();
    await user.click(within(form).getByRole('button', { name: 'Volver' }));
    expect(
      screen.queryByRole('form', { name: 'Cancelar atención' }),
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Cancelar atención' }),
    ).toBeVisible();
    expect(net.calls(CANCEL)).toHaveLength(0);
  });

  it.each([
    ['', 'Escribe el motivo.'],
    ['   ', 'Escribe el motivo.'],
    ['z'.repeat(501), 'El motivo admite como máximo 500 caracteres.'],
  ])(
    'R35: "Confirmar cancelación" con el motivo %j no llama a la API y muestra "%s" accesible',
    async (reason, message) => {
      const { net, user } = setup();
      const form = await openCancel(user);
      const field = within(form).getByLabelText('Motivo de la cancelación');
      if (reason) {
        await user.click(field);
        await user.paste(reason);
      }
      await user.click(
        within(form).getByRole('button', { name: 'Confirmar cancelación' }),
      );
      const error = await within(form).findByText(message);
      expect(field).toHaveAttribute('aria-invalid', 'true');
      expect(field).toHaveAttribute('aria-describedby', error.id);
      expect(net.calls(CANCEL)).toHaveLength(0);
    },
  );

  it('R36: envía { reason } recortado y con 200 muestra el detalle de la respuesta y "Atención cancelada."', async () => {
    const { net, user } = setup({ [CANCEL]: json(200, cancelled) });
    const form = await openCancel(user);
    await user.type(
      within(form).getByLabelText('Motivo de la cancelación'),
      '  Se retiró antes del triage ',
    );
    await user.click(
      within(form).getByRole('button', { name: 'Confirmar cancelación' }),
    );
    expect(
      (await screen.findByText('Atención cancelada.')).closest(
        '[role="status"]',
      ),
    ).toBeInTheDocument();
    expect(net.calls(CANCEL)[0].body).toEqual({
      reason: 'Se retiró antes del triage',
    });
    const page = screen.getByRole('region', { name: 'Atención' });
    expect(page).toHaveTextContent('EstadoCancelada');
    expect(page).toHaveTextContent(
      'Motivo de la cancelaciónSe retiró antes del triage',
    );
    expect(
      screen.queryByRole('button', { name: 'Cancelar atención' }),
    ).toBeNull();
    expect(net.calls(DETAIL)).toHaveLength(1);
  });

  it('R36: con 409 muestra el error de acción y vuelve a pedir el detalle', async () => {
    const { net, user } = setup({ [CANCEL]: problem(409) });
    const form = await openCancel(user);
    await user.type(
      within(form).getByLabelText('Motivo de la cancelación'),
      'Duplicada',
    );
    net.set(DETAIL, json(200, cancelled));
    await user.click(
      within(form).getByRole('button', { name: 'Confirmar cancelación' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La atención ya está cerrada o cancelada.',
    );
    await waitFor(() => expect(net.calls(DETAIL)).toHaveLength(2));
    await waitFor(() =>
      expect(
        screen.getByRole('region', { name: 'Atención' }),
      ).toHaveTextContent('EstadoCancelada'),
    );
    expect(
      screen.queryByRole('form', { name: 'Cancelar atención' }),
    ).toBeNull();
    // El error sigue visible aunque el detalle ya sea terminal y el botón desaparezca.
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La atención ya está cerrada o cancelada.',
    );
    expect(
      screen.queryByRole('button', { name: 'Cancelar atención' }),
    ).toBeNull();
  });

  it('R36: con 404 aplica R33', async () => {
    const { user } = setup({ [CANCEL]: problem(404) });
    const form = await openCancel(user);
    await user.type(
      within(form).getByLabelText('Motivo de la cancelación'),
      'Duplicada',
    );
    await user.click(
      within(form).getByRole('button', { name: 'Confirmar cancelación' }),
    );
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se encontró la atención.');
    expect(
      within(alert).getByRole('link', { name: 'Volver a las atenciones' }),
    ).toBeVisible();
  });

  it.each([
    [problem(500), 'El servidor tuvo un problema. Inténtalo de nuevo.'],
    [problem(403), 'No tienes permiso para realizar esta acción.'],
    [networkError(), 'No hay conexión con el servidor.'],
  ])(
    'R36: ante otro error muestra un error de acción (%#)',
    async (handler, message) => {
      const { user } = setup({ [CANCEL]: handler });
      const form = await openCancel(user);
      await user.type(
        within(form).getByLabelText('Motivo de la cancelación'),
        'Duplicada',
      );
      await user.click(
        within(form).getByRole('button', { name: 'Confirmar cancelación' }),
      );
      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(
        within(form).getByLabelText('Motivo de la cancelación'),
      ).toHaveValue('Duplicada');
    },
  );

  it('R37: mientras la cancelación está en curso deshabilita su botón, muestra role="status" e ignora nuevos envíos', async () => {
    const gate = deferred(json(200, cancelled));
    const { net, user } = setup({ [CANCEL]: gate.handler });
    const form = await openCancel(user);
    await user.type(
      within(form).getByLabelText('Motivo de la cancelación'),
      'Duplicada',
    );
    const submit = within(form).getByRole('button', {
      name: 'Confirmar cancelación',
    });
    await user.click(submit);
    expect(submit).toBeDisabled();
    expect(within(form).getByRole('status')).toHaveTextContent(
      'Cancelando la atención…',
    );
    await user.click(submit);
    expect(net.calls(CANCEL)).toHaveLength(1);
    act(() => gate.release());
    await screen.findByText('Atención cancelada.');
  });
});
