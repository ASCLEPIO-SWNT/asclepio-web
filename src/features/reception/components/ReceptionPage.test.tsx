import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatBogota } from '../../../shared/lib/datetime';
import {
  ENCOUNTER_ID,
  SITE_NORTE,
  SITE_SUR,
  deferred,
  encounter,
  fakeApi,
  json,
  networkError,
  patient,
  pendingPreRegistration,
  problem,
  publicTenants,
  type Handler,
} from '../../../test/fakeApi';
import { renderFeature } from '../../../test/renderFeature';
import { receptionRoutes } from '../routes';

const TENANTS = 'GET /api/v1/public/tenants';
const TRAY = 'GET /api/v1/pre-registrations';
const PR_ID = pendingPreRegistration.id;
const CONFIRM = `POST /api/v1/pre-registrations/${PR_ID}/confirm`;
const REJECT = `POST /api/v1/pre-registrations/${PR_ID}/reject`;

const second = {
  ...pendingPreRegistration,
  id: 'c0c0c0c0-0000-4000-8000-000000000002',
  siteId: SITE_SUR.id,
  siteName: SITE_SUR.name,
  identityVerified: true,
  chiefComplaintText: 'Fiebre',
  patient: {
    ...patient,
    id: 'b0b0b0b0-0000-4000-8000-000000000009',
    fullName: 'Andrés Ruiz',
    documentType: 'CE' as const,
    documentNumber: 'E-778899',
    birthDate: '2001-01-01',
    sex: 'M' as const,
  },
};

function setup(routes: Record<string, Handler> = {}) {
  const net = fakeApi({
    [TENANTS]: json(200, publicTenants),
    [TRAY]: json(200, [pendingPreRegistration]),
    ...routes,
  });
  const user = userEvent.setup();
  const view = renderFeature(receptionRoutes, { entries: ['/recepcion'] });
  return { net, user, ...view };
}

async function card(name = patient.fullName!) {
  return screen.findByRole('article', { name });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ReceptionPage — sedes', () => {
  it('R4: pide GET /public/tenants una vez y ofrece solo las sedes del tenant por su nombre', async () => {
    const { net, router } = setup();
    const select = screen.getByLabelText('Sede');
    await waitFor(() => expect(select).toBeEnabled());
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Todas las sedes', 'Sede Norte', 'Sede Sur']);

    await act(() => router.navigate('/recepcion/registro'));
    await screen.findByRole('heading', { level: 1, name: 'Registro directo' });
    await act(() => router.navigate('/recepcion'));
    await card();
    expect(net.calls(TENANTS)).toHaveLength(1);
  });

  it.each([
    ['falla', problem(500)],
    ['no contiene el tenant del perfil', json(200, [publicTenants[0]])],
    ['sin respuesta HTTP', networkError()],
  ])(
    'R5: si GET /public/tenants %s muestra el error de sedes, deshabilita el selector y sigue mostrando la bandeja sin filtro',
    async (_label, handler) => {
      const { net, user } = setup({ [TENANTS]: handler });
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('No se pudieron cargar las sedes.');
      expect(screen.getByLabelText('Sede')).toBeDisabled();
      expect(await card()).toBeInTheDocument();
      expect(net.calls(TRAY)[0].query.has('siteId')).toBe(false);

      net.set(TENANTS, json(200, publicTenants));
      await user.click(
        within(alert).getByRole('button', { name: 'Reintentar' }),
      );
      await waitFor(() => expect(screen.getByLabelText('Sede')).toBeEnabled());
      expect(net.calls(TENANTS)).toHaveLength(2);
    },
  );
});

describe('ReceptionPage — bandeja', () => {
  it('R6: abre con "Todas las sedes" sin siteId y al elegir una sede pide con su id', async () => {
    const { net, user } = setup();
    await card();
    expect(screen.getByLabelText('Sede')).toHaveValue('');
    expect([...net.calls(TRAY)[0].query.keys()]).toEqual([]);

    await waitFor(() => expect(screen.getByLabelText('Sede')).toBeEnabled());
    await user.selectOptions(screen.getByLabelText('Sede'), 'Sede Sur');
    await waitFor(() => expect(net.calls(TRAY)).toHaveLength(2));
    expect(net.calls(TRAY)[1].query.get('siteId')).toBe(SITE_SUR.id);
    expect([...net.calls(TRAY)[1].query.keys()]).toEqual(['siteId']);

    await user.selectOptions(screen.getByLabelText('Sede'), 'Sede Norte');
    await waitFor(() => expect(net.calls(TRAY)).toHaveLength(3));
    expect(net.calls(TRAY)[2].query.get('siteId')).toBe(SITE_NORTE.id);

    await user.selectOptions(screen.getByLabelText('Sede'), 'Todas las sedes');
    // "Todas las sedes" ya está en caché: se muestra sin siteId.
    await card();
    expect(net.calls(TRAY).every((r) => r.query.get('siteId') !== 'all')).toBe(
      true,
    );
  });

  it('R7: muestra cada pre-registro en el orden recibido con sus datos, horas y verificación', async () => {
    setup({ [TRAY]: json(200, [pendingPreRegistration, second]) });
    const first = await card();
    const items = screen.getAllByRole('article');
    expect(
      items.map((a) => within(a).getByRole('heading').textContent),
    ).toEqual(['Laura Gómez Pérez', 'Andrés Ruiz']);

    expect(first).toHaveTextContent('Cédula de ciudadanía 1032456789');
    expect(first).toHaveTextContent('17/05/1990');
    expect(first).toHaveTextContent('Femenino');
    expect(first).toHaveTextContent('Sede Norte');
    expect(first).toHaveTextContent('Dolor de cabeza desde ayer');
    expect(first).toHaveTextContent(
      `Pre-registro${formatBogota(pendingPreRegistration.preRegisteredAt)}`,
    );
    expect(first).toHaveTextContent(
      `Expira${formatBogota(pendingPreRegistration.expiresAt)}`,
    );
    expect(within(first).getByText('Identidad sin verificar')).toBeVisible();

    const other = items[1];
    expect(other).toHaveTextContent('Cédula de extranjería E-778899');
    expect(other).toHaveTextContent('01/01/2001');
    expect(other).toHaveTextContent('Masculino');
    expect(other).toHaveTextContent('Sede Sur');
    expect(within(other).getByText('Identidad verificada')).toBeVisible();
  });

  it('R8: muestra role="status" mientras la bandeja carga por primera vez', async () => {
    const gate = deferred(json(200, [pendingPreRegistration]));
    setup({ [TRAY]: gate.handler });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Cargando la bandeja…',
    );
    act(() => gate.release());
    await card();
    expect(screen.queryByText('Cargando la bandeja…')).not.toBeInTheDocument();
  });

  it('R8: con una lista vacía muestra el mensaje de bandeja vacía', async () => {
    setup({ [TRAY]: json(200, []) });
    expect(
      await screen.findByText('No hay pre-registros pendientes.'),
    ).toBeInTheDocument();
  });

  it('R8: si falla muestra el error de carga con Reintentar', async () => {
    const { net, user } = setup({ [TRAY]: problem(500) });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se pudo cargar la bandeja.');
    net.set(TRAY, json(200, [pendingPreRegistration]));
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(await card()).toBeInTheDocument();
  });

  it('R3: si GET /pre-registrations responde 403 muestra sin permiso y ningún dato', async () => {
    setup({ [TRAY]: problem(403) });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tienes permiso para ver esta página.',
    );
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(
      screen.queryByText('No se pudo cargar la bandeja.'),
    ).not.toBeInTheDocument();
  });

  it('R9: repite la petición con el mismo filtro cada 30 s con la pestaña visible, y al pulsar "Actualizar"', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { net } = setup();
    await card();
    expect(net.calls(TRAY)).toHaveLength(1);

    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await waitFor(() => expect(net.calls(TRAY)).toHaveLength(2));
    expect([...net.calls(TRAY)[1].query.keys()]).toEqual([]);

    await act(async () => {
      screen.getByRole('button', { name: 'Actualizar' }).click();
      await vi.advanceTimersByTimeAsync(0);
    });
    await waitFor(() => expect(net.calls(TRAY)).toHaveLength(3));
  });

  it('R9: no repite la petición mientras la pestaña está oculta', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { net } = setup();
    await card();
    const visibility = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('hidden');
    await act(() => vi.advanceTimersByTimeAsync(90_000));
    expect(net.calls(TRAY)).toHaveLength(1);
    visibility.mockRestore();
  });
});

describe('ReceptionPage — confirmación de llegada', () => {
  it('R10: la casilla de verificación empieza desmarcada y "Confirmar llegada" solo se habilita al marcarla', async () => {
    const { user } = setup();
    const item = await card();
    const check = within(item).getByRole('checkbox', {
      name: 'Verifiqué la identidad del paciente presente con su documento.',
    });
    const confirm = within(item).getByRole('button', {
      name: 'Confirmar llegada',
    });
    expect(check).not.toBeChecked();
    expect(confirm).toBeDisabled();
    await user.click(check);
    expect(confirm).toBeEnabled();
    await user.click(check);
    expect(confirm).toBeDisabled();
  });

  it('R11: envía POST confirm con el cuerpo exacto { identityVerified: true }', async () => {
    const { net, user } = setup({ [CONFIRM]: json(201, encounter) });
    const item = await card();
    await user.click(within(item).getByRole('checkbox'));
    await user.click(
      within(item).getByRole('button', { name: 'Confirmar llegada' }),
    );
    await waitFor(() => expect(net.calls(CONFIRM)).toHaveLength(1));
    expect(net.calls(CONFIRM)[0].body).toEqual({ identityVerified: true });
    expect([...net.calls(CONFIRM)[0].query.keys()]).toEqual([]);
  });

  it('R12: con 201 muestra la hora de llegada del servidor, el enlace "Ver atención" y vuelve a pedir la bandeja', async () => {
    const { net, user } = setup({ [CONFIRM]: json(201, encounter) });
    const item = await card();
    await user.click(within(item).getByRole('checkbox'));
    net.set(TRAY, json(200, []));
    await user.click(
      within(item).getByRole('button', { name: 'Confirmar llegada' }),
    );

    const notice = await screen.findByText(/Llegada confirmada\./);
    expect(notice.closest('[role="status"]')).toHaveTextContent(
      `Llegada confirmada. Hora de llegada: ${formatBogota(encounter.arrivalAt)}.`,
    );
    expect(screen.getByRole('link', { name: 'Ver atención' })).toHaveAttribute(
      'href',
      `/atenciones/${ENCOUNTER_ID}`,
    );
    await waitFor(() => expect(net.calls(TRAY)).toHaveLength(2));
    expect(
      await screen.findByText('No hay pre-registros pendientes.'),
    ).toBeInTheDocument();
  });

  it.each([
    [
      409,
      'Este pre-registro ya no está pendiente o el paciente ya tiene una atención activa.',
    ],
    [404, 'Este pre-registro ya no existe.'],
  ])(
    'R13: con %i muestra el error de acción en contexto y vuelve a pedir la bandeja',
    async (status, message) => {
      const { net, user } = setup({ [CONFIRM]: problem(status) });
      const item = await card();
      await user.click(within(item).getByRole('checkbox'));
      await user.click(
        within(item).getByRole('button', { name: 'Confirmar llegada' }),
      );
      expect(await within(item).findByRole('alert')).toHaveTextContent(message);
      await waitFor(() => expect(net.calls(TRAY)).toHaveLength(2));
    },
  );

  it('R13: si tras el 409 el pre-registro desaparece de la bandeja, el error de acción sigue visible', async () => {
    const { net, user } = setup({ [CONFIRM]: problem(409) });
    const item = await card();
    await user.click(within(item).getByRole('checkbox'));
    net.set(TRAY, json(200, []));
    await user.click(
      within(item).getByRole('button', { name: 'Confirmar llegada' }),
    );
    await screen.findByText('No hay pre-registros pendientes.');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Este pre-registro ya no está pendiente o el paciente ya tiene una atención activa.',
    );
  });

  it.each([
    [problem(403), 'No tienes permiso para realizar esta acción.'],
    [
      networkError(),
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    ],
    [problem(500), 'No se pudo completar la acción. Inténtalo de nuevo.'],
    [problem(422), 'No se pudo completar la acción. Inténtalo de nuevo.'],
  ])(
    'R13: ante otro error muestra el error de acción (%#)',
    async (handler, message) => {
      const { user } = setup({ [CONFIRM]: handler });
      const item = await card();
      await user.click(within(item).getByRole('checkbox'));
      await user.click(
        within(item).getByRole('button', { name: 'Confirmar llegada' }),
      );
      expect(await within(item).findByRole('alert')).toHaveTextContent(message);
    },
  );

  it('R37: mientras la confirmación está en curso deshabilita "Confirmar llegada" y "Rechazar", muestra role="status" e ignora nuevos envíos', async () => {
    const gate = deferred(json(201, encounter));
    const { net, user } = setup({ [CONFIRM]: gate.handler });
    const item = await card();
    await user.click(within(item).getByRole('checkbox'));
    const confirm = within(item).getByRole('button', {
      name: 'Confirmar llegada',
    });
    await user.click(confirm);
    expect(confirm).toBeDisabled();
    expect(
      within(item).getByRole('button', { name: 'Rechazar' }),
    ).toBeDisabled();
    expect(within(item).getByRole('status')).toHaveTextContent(
      'Confirmando la llegada…',
    );
    await user.click(confirm);
    expect(net.calls(CONFIRM)).toHaveLength(1);
    act(() => gate.release());
    await screen.findByText(/Llegada confirmada\./);
    expect(net.calls(CONFIRM)).toHaveLength(1);
  });
});

describe('ReceptionPage — rechazo', () => {
  async function openReject(user: ReturnType<typeof userEvent.setup>) {
    const item = await card();
    await user.click(within(item).getByRole('button', { name: 'Rechazar' }));
    return item;
  }

  it('R14: "Rechazar" muestra el motivo con "Confirmar rechazo" y "Volver", que lo oculta sin llamar a la API', async () => {
    const { net, user } = setup();
    const item = await openReject(user);
    expect(within(item).getByLabelText('Motivo del rechazo')).toBeVisible();
    expect(
      within(item).getByRole('button', { name: 'Confirmar rechazo' }),
    ).toBeVisible();
    await user.click(within(item).getByRole('button', { name: 'Volver' }));
    expect(
      within(item).queryByLabelText('Motivo del rechazo'),
    ).not.toBeInTheDocument();
    expect(net.requests.filter((r) => r.method === 'POST')).toHaveLength(0);
  });

  it.each([
    ['', 'Escribe el motivo.'],
    ['    ', 'Escribe el motivo.'],
    ['x'.repeat(501), 'El motivo admite como máximo 500 caracteres.'],
  ])(
    'R15: "Confirmar rechazo" con el motivo %j no llama a la API y muestra "%s" accesible',
    async (reason, message) => {
      const { net, user } = setup();
      const item = await openReject(user);
      const field = within(item).getByLabelText('Motivo del rechazo');
      if (reason) {
        await user.click(field);
        await user.paste(reason);
      }
      await user.click(
        within(item).getByRole('button', { name: 'Confirmar rechazo' }),
      );
      const error = await within(item).findByText(message);
      expect(field).toHaveAttribute('aria-invalid', 'true');
      expect(field).toHaveAttribute('aria-describedby', error.id);
      expect(net.calls(REJECT)).toHaveLength(0);
    },
  );

  it('R16: envía el motivo sin espacios iniciales ni finales y con 200 muestra el éxito y vuelve a pedir la bandeja', async () => {
    const { net, user } = setup({
      [REJECT]: json(200, {
        id: PR_ID,
        status: 'REJECTED',
        resolvedAt: '2026-10-27T15:00:00.000Z',
      }),
    });
    const item = await openReject(user);
    await user.type(
      within(item).getByLabelText('Motivo del rechazo'),
      '   El paciente no se presentó  ',
    );
    net.set(TRAY, json(200, []));
    await user.click(
      within(item).getByRole('button', { name: 'Confirmar rechazo' }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Pre-registro rechazado.',
    );
    expect(net.calls(REJECT)[0].body).toEqual({
      reason: 'El paciente no se presentó',
    });
    await waitFor(() => expect(net.calls(TRAY)).toHaveLength(2));
  });

  it('R16: acepta un motivo de exactamente 500 caracteres', async () => {
    const { net, user } = setup({
      [REJECT]: json(200, {
        id: PR_ID,
        status: 'REJECTED',
        resolvedAt: '2026-10-27T15:00:00.000Z',
      }),
    });
    const item = await openReject(user);
    await user.click(within(item).getByLabelText('Motivo del rechazo'));
    await user.paste('y'.repeat(500));
    await user.click(
      within(item).getByRole('button', { name: 'Confirmar rechazo' }),
    );
    await waitFor(() => expect(net.calls(REJECT)).toHaveLength(1));
    expect(net.calls(REJECT)[0].body).toEqual({ reason: 'y'.repeat(500) });
  });

  it.each([
    [409, 'Este pre-registro ya no está pendiente.', true],
    [404, 'Este pre-registro ya no existe.', true],
    [500, 'No se pudo completar la acción. Inténtalo de nuevo.', false],
    [403, 'No tienes permiso para realizar esta acción.', false],
  ])(
    'R16: con %i muestra "%s" (refresca la bandeja: %s)',
    async (status, message, refreshes) => {
      const { net, user } = setup({ [REJECT]: problem(status) });
      const item = await openReject(user);
      await user.type(
        within(item).getByLabelText('Motivo del rechazo'),
        'Duplicado',
      );
      await user.click(
        within(item).getByRole('button', { name: 'Confirmar rechazo' }),
      );
      expect(await within(item).findByRole('alert')).toHaveTextContent(message);
      if (refreshes) {
        await waitFor(() => expect(net.calls(TRAY)).toHaveLength(2));
      } else {
        expect(net.calls(TRAY)).toHaveLength(1);
      }
    },
  );

  it('R37: mientras el rechazo está en curso deshabilita sus botones, muestra role="status" e ignora nuevos envíos', async () => {
    const gate = deferred(
      json(200, {
        id: PR_ID,
        status: 'REJECTED',
        resolvedAt: '2026-10-27T15:00:00.000Z',
      }),
    );
    const { net, user } = setup({ [REJECT]: gate.handler });
    const item = await openReject(user);
    await user.type(
      within(item).getByLabelText('Motivo del rechazo'),
      'Duplicado',
    );
    const submit = within(item).getByRole('button', {
      name: 'Confirmar rechazo',
    });
    await user.click(submit);
    expect(submit).toBeDisabled();
    expect(
      within(item).getByRole('button', { name: 'Rechazar' }),
    ).toBeDisabled();
    expect(
      within(item).getByRole('button', { name: 'Confirmar llegada' }),
    ).toBeDisabled();
    expect(within(item).getByRole('status')).toHaveTextContent(
      'Rechazando el pre-registro…',
    );
    await user.click(submit);
    expect(net.calls(REJECT)).toHaveLength(1);
    act(() => gate.release());
    await screen.findByText('Pre-registro rechazado.');
  });
});
