import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatDateBogota,
  formatTimeBogota,
} from '../../../shared/lib/datetime';
import { norm } from '../../../test/text';
import {
  ENCOUNTER_ID,
  SITE_SUR,
  deferred,
  encounterSummary,
  fakeApi,
  json,
  nnPatient,
  problem,
  publicTenants,
  type Handler,
} from '../../../test/fakeApi';
import { renderFeature } from '../../../test/renderFeature';
import { encounterRoutes } from '../routes';

const TENANTS = 'GET /api/v1/public/tenants';
const LIST = 'GET /api/v1/encounters';

const nnSummary = encounterSummary({
  id: 'e0e0e0e0-0000-4000-8000-000000000002',
  status: 'CANCELLED',
  origin: 'DIRECT',
  siteId: SITE_SUR.id,
  siteName: SITE_SUR.name,
  arrivalAt: '2026-10-27T03:15:00.000Z',
  preRegistrationId: null,
  preRegisteredAt: null,
  patient: nnPatient,
});

function page(n: number, from = 0) {
  return Array.from({ length: n }, (_, i) =>
    encounterSummary({
      id: `e0e0e0e0-0000-4000-8000-${String(from + i).padStart(12, '0')}`,
    }),
  );
}

function setup(routes: Record<string, Handler> = {}) {
  const net = fakeApi({
    [TENANTS]: json(200, publicTenants),
    [LIST]: json(200, { items: [encounterSummary(), nnSummary] }),
    ...routes,
  });
  const user = userEvent.setup();
  const view = renderFeature(encounterRoutes, {
    entries: ['/atenciones'],
    role: 'NURSE',
  });
  return { net, user, ...view };
}

const lastQuery = (net: ReturnType<typeof fakeApi>) =>
  Object.fromEntries(net.calls(LIST).at(-1)!.query);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('EncounterListPage', () => {
  it('R28: al abrir pide limit=50 y offset=0 sin filtros', async () => {
    const { net } = setup();
    await screen.findByRole('table');
    expect(lastQuery(net)).toEqual({ limit: '50', offset: '0' });
  });

  it('R28: cada filtro elegido viaja en la query y "Todos" lo quita', async () => {
    const { net, user } = setup();
    await screen.findByRole('table');
    const status = screen.getByLabelText('Estado');
    expect(
      within(status)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual([
      'Todos los estados',
      'Registrada',
      'En espera de triage',
      'Clasificada',
      'En atención',
      'Cerrada',
      'Cancelada',
    ]);

    await user.selectOptions(status, 'En espera de triage');
    await waitFor(() => expect(net.calls(LIST)).toHaveLength(2));
    expect(lastQuery(net)).toEqual({
      limit: '50',
      offset: '0',
      status: 'WAITING_TRIAGE',
    });

    const site = screen.getByLabelText('Sede');
    await waitFor(() => expect(site).toBeEnabled());
    await user.selectOptions(site, 'Sede Sur');
    await waitFor(() => expect(net.calls(LIST)).toHaveLength(3));
    expect(lastQuery(net)).toEqual({
      limit: '50',
      offset: '0',
      status: 'WAITING_TRIAGE',
      siteId: SITE_SUR.id,
    });

    await user.selectOptions(status, 'Todos los estados');
    await waitFor(() => expect(net.calls(LIST)).toHaveLength(4));
    expect(lastQuery(net)).toEqual({
      limit: '50',
      offset: '0',
      siteId: SITE_SUR.id,
    });
  });

  it('R29: muestra cada atención en el orden recibido con llegada, paciente, documento, sede, estado, origen y enlace', async () => {
    setup();
    const rows = within(await screen.findByRole('table'))
      .getAllByRole('row')
      .slice(1);
    expect(rows).toHaveLength(2);
    const [first, second] = rows;
    expect(screen.getByRole('columnheader', { name: 'Llegada' })).toBeVisible();
    // UI-04-web R7: la llegada es la hora sin segundos y, debajo, la fecha.
    expect(first).toHaveTextContent(
      norm(formatTimeBogota(encounterSummary().arrivalAt)),
    );
    expect(first).toHaveTextContent(
      formatDateBogota(encounterSummary().arrivalAt),
    );
    expect(first).toHaveTextContent('Laura Gómez Pérez');
    expect(first).toHaveTextContent('Cédula de ciudadanía 1032456789');
    expect(first).toHaveTextContent('Sede Norte');
    expect(first).toHaveTextContent('En espera de triage');
    expect(first).toHaveTextContent('Pre-registro (app)');
    expect(
      within(first).getByRole('link', { name: 'Ver atención' }),
    ).toHaveAttribute('href', `/atenciones/${ENCOUNTER_ID}`);
    expect(second).toHaveTextContent('Paciente NN');
    expect(second).toHaveTextContent('Sede Sur');
    expect(second).toHaveTextContent('Cancelada');
    expect(second).toHaveTextContent('Registro directo');
    expect(second).toHaveTextContent(
      norm(formatTimeBogota(nnSummary.arrivalAt)),
    );
    expect(second).toHaveTextContent(formatDateBogota(nnSummary.arrivalAt));
  });

  it('R30: muestra role="status" mientras carga', async () => {
    const gate = deferred(json(200, { items: [] }));
    setup({ [LIST]: gate.handler });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Cargando las atenciones…',
    );
    act(() => gate.release());
    await screen.findByText('No hay atenciones con estos filtros.');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('R30: con 200 sin elementos muestra el mensaje de lista vacía', async () => {
    setup({ [LIST]: json(200, { items: [] }) });
    expect(
      await screen.findByText('No hay atenciones con estos filtros.'),
    ).toBeVisible();
  });

  it('R30: si falla muestra el error de carga con Reintentar', async () => {
    const { net, user } = setup({ [LIST]: problem(500) });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se pudieron cargar las atenciones.');
    net.set(LIST, json(200, { items: [encounterSummary()] }));
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('table')).toBeVisible();
  });

  it('R30: "Anterior" deshabilitado con offset 0, "Siguiente" con menos de 50 y la paginación repite la petición con offset ±50', async () => {
    const { net, user } = setup({ [LIST]: json(200, { items: page(50) }) });
    await screen.findByRole('table');
    const prev = screen.getByRole('button', { name: 'Anterior' });
    const next = screen.getByRole('button', { name: 'Siguiente' });
    expect(prev).toBeDisabled();
    expect(next).toBeEnabled();

    net.set(LIST, json(200, { items: page(3, 50) }));
    await user.click(next);
    await waitFor(() =>
      expect(lastQuery(net)).toEqual({ limit: '50', offset: '50' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled(),
    );
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();

    net.set(LIST, json(200, { items: page(50) }));
    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled(),
    );
  });

  it('R30: cambiar un filtro vuelve a offset 0', async () => {
    const { net, user } = setup({ [LIST]: json(200, { items: page(50) }) });
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(lastQuery(net).offset).toBe('50'));
    await user.selectOptions(screen.getByLabelText('Estado'), 'Cerrada');
    await waitFor(() =>
      expect(lastQuery(net)).toEqual({
        limit: '50',
        offset: '0',
        status: 'CLOSED',
      }),
    );
  });

  it('R3: si GET /encounters responde 403 muestra sin permiso y ningún dato', async () => {
    setup({ [LIST]: problem(403) });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tienes permiso para ver esta página.',
    );
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('R4: ofrece "Todas las sedes" y las sedes del tenant por nombre', async () => {
    const { net } = setup();
    const site = screen.getByLabelText('Sede');
    await waitFor(() => expect(site).toBeEnabled());
    expect(
      within(site)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Todas las sedes', 'Sede Norte', 'Sede Sur']);
    expect(net.calls(TENANTS)).toHaveLength(1);
  });

  it('R5: si las sedes fallan muestra el error de sedes, deshabilita el selector y sigue mostrando la lista sin filtro de sede', async () => {
    const { net } = setup({ [TENANTS]: problem(429) });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron cargar las sedes.',
    );
    expect(screen.getByLabelText('Sede')).toBeDisabled();
    expect(await screen.findByRole('table')).toBeVisible();
    expect(lastQuery(net)).toEqual({ limit: '50', offset: '0' });
  });
});
