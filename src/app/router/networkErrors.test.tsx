import { onlineManager } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { components } from '../../shared/api/schema';
import type { StaffRole } from '../../shared/api/client';
import { session } from '../../shared/api/session';
import {
  ENCOUNTER_ID,
  encounter,
  encounterSummary,
  fakeApi,
  json,
  networkError,
  pendingPreRegistration,
  problem,
  publicTenants,
  staffMe,
  type Handler,
} from '../../test/fakeApi';
import { renderApp } from '../../test/testApp';

const LIST = 'GET /api/v1/encounters';
/** F-06-web: los dashboards de /cola fallan en la cola priorizada. */
const QUEUE = 'GET /api/v1/queue';
const DETAIL = `GET /api/v1/encounters/${ENCOUNTER_ID}`;
const CAPTURE = `${DETAIL}/clinical-capture`;
const VITALS = `POST /api/v1/encounters/${ENCOUNTER_ID}/vital-signs`;
const NETWORK = 'No hay conexión con el servidor.';
const SERVER = 'El servidor tuvo un problema. Inténtalo de nuevo.';
const DETAIL_SECRET = 'stack trace at PrismaClient secret-detail';
const TITLE_SECRET = 'Internal Server Error title';

const emptyCapture: components['schemas']['ClinicalCaptureDto'] = {
  encounterId: ENCOUNTER_ID,
  status: 'WAITING_TRIAGE',
  chiefComplaintText: encounter.chiefComplaintText,
  complaintSource: encounter.complaintSource,
  vitalSigns: [],
  symptomFindings: [],
};

function setup(
  path: string,
  handlers: Record<string, Handler> = {},
  role: StaffRole = 'NURSE',
) {
  const net = fakeApi({
    'GET /api/v1/me': json(200, staffMe[role]),
    'GET /api/v1/public/tenants': json(200, publicTenants),
    [LIST]: json(200, { items: [encounterSummary()] }),
    [DETAIL]: json(200, encounter),
    [CAPTURE]: json(200, emptyCapture),
    ...handlers,
  });
  return {
    net,
    user: userEvent.setup({ delay: null }),
    ...renderApp({ entries: [path], stored: true }),
  };
}

async function alertWith(text: string) {
  await screen.findByText(text);
  return screen
    .getAllByRole('alert')
    .find((alert) => alert.textContent?.includes(text))!;
}

/** Simula perder y recuperar la red como lo ve TanStack Query (el evento `online`). */
function reconnect() {
  act(() => onlineManager.setOnline(false));
  act(() => onlineManager.setOnline(true));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
  session.clear();
  onlineManager.setOnline(true);
});

describe('UI-03-web errores de red y del servidor', () => {
  it('R15: un error de red en una vista muestra «No hay conexión con el servidor.» con «Reintentar», distinto del de servidor', async () => {
    setup('/atenciones', { [LIST]: networkError() });
    const alert = await alertWith(NETWORK);
    expect(alert).toHaveTextContent('No se pudieron cargar las atenciones.');
    expect(alert).not.toHaveTextContent(SERVER);
    expect(
      within(alert).getByRole('button', { name: 'Reintentar' }),
    ).toBeEnabled();
  });

  it('R15: un error de red en un dashboard muestra el mismo texto de red en su panel con «Reintentar»', async () => {
    setup('/cola', { [QUEUE]: networkError() }, 'PHYSICIAN');
    const alert = await alertWith(NETWORK);
    expect(alert).not.toHaveTextContent(SERVER);
    expect(
      within(alert).getByRole('button', { name: 'Reintentar' }),
    ).toBeVisible();
  });

  it('R18: un 5xx muestra el texto de error del servidor con «Reintentar», sin detail ni title del problem+json', async () => {
    setup('/atenciones', {
      [LIST]: problem(503, { title: TITLE_SECRET, detail: DETAIL_SECRET }),
    });
    const alert = await alertWith(SERVER);
    expect(alert).not.toHaveTextContent(NETWORK);
    expect(
      within(alert).getByRole('button', { name: 'Reintentar' }),
    ).toBeEnabled();
    expect(document.body).not.toHaveTextContent(DETAIL_SECRET);
    expect(document.body).not.toHaveTextContent(TITLE_SECRET);
  });

  it('R18: un 5xx en un dashboard tampoco muestra detalles técnicos', async () => {
    setup(
      '/cola',
      { [QUEUE]: problem(500, { title: TITLE_SECRET, detail: DETAIL_SECRET }) },
      'PHYSICIAN',
    );
    await alertWith(SERVER);
    expect(document.body).not.toHaveTextContent(DETAIL_SECRET);
    expect(document.body).not.toHaveTextContent(TITLE_SECRET);
  });

  it('R18: un 4xx que no es de red ni de servidor no muestra los textos de red ni de servidor', async () => {
    setup('/atenciones', { [LIST]: problem(400) });
    const alert = await alertWith('No se pudieron cargar las atenciones.');
    expect(alert).not.toHaveTextContent(NETWORK);
    expect(alert).not.toHaveTextContent(SERVER);
  });

  it('R16: al recuperar la conexión una vista con error de red no repite ninguna petición hasta pulsar «Reintentar»', async () => {
    const { net, user } = setup('/atenciones', { [LIST]: networkError() });
    const alert = await alertWith(NETWORK);
    const before = net.requests.length;
    reconnect();
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(net.requests.length).toBe(before);
    expect(screen.getByText(NETWORK)).toBeVisible();

    net.set(LIST, json(200, { items: [encounterSummary()] }));
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    await screen.findByText('Laura Gómez Pérez');
    expect(screen.queryByText(NETWORK)).not.toBeInTheDocument();
  });

  it('R16: al recuperar la conexión un dashboard con error de red no repite peticiones; solo «Reintentar» o el intervalo de 30 s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { net } = setup('/cola', { [QUEUE]: networkError() }, 'PHYSICIAN');
    await alertWith(NETWORK);
    const before = net.calls(QUEUE).length;
    reconnect();
    await act(() => vi.advanceTimersByTimeAsync(1_000));
    expect(net.calls(QUEUE)).toHaveLength(before);
    expect(screen.getByText(NETWORK)).toBeVisible();
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await waitFor(() =>
      expect(net.calls(QUEUE).length).toBeGreaterThan(before),
    );
  });

  it('R17: una toma con la red caída falla de inmediato (sin quedar en pausa), conserva lo escrito y no se reenvía al reconectar', async () => {
    const { net, user } = setup(`/triage/${ENCOUNTER_ID}`, {
      [VITALS]: networkError(),
    });
    await screen.findByRole('form', { name: 'Signos vitales' });
    await waitFor(() =>
      expect(screen.getByLabelText(/Frecuencia respiratoria/)).toBeEnabled(),
    );
    await user.type(screen.getByLabelText(/Frecuencia respiratoria/), '18');
    await user.type(screen.getByLabelText(/Saturación de oxígeno/), '98');
    await user.selectOptions(
      screen.getByLabelText(/Oxígeno suplementario/),
      'No',
    );
    await user.type(screen.getByLabelText(/Presión arterial sistólica/), '120');
    await user.type(screen.getByLabelText(/Frecuencia cardiaca/), '87');
    await user.selectOptions(screen.getByLabelText(/Nivel de conciencia/), 'A');
    await user.type(screen.getByLabelText(/Temperatura/), '36.5');

    // El navegador ya está sin red al enviar: la mutación no debe quedar en pausa.
    act(() => onlineManager.setOnline(false));
    await user.click(screen.getByRole('button', { name: 'Guardar toma' }));
    const form = screen.getByRole('form', { name: 'Signos vitales' });
    const alert = await within(form).findByRole('alert');
    // B1: el texto de red de R15, no el texto de acción anterior.
    expect(alert).toHaveTextContent(NETWORK);
    expect(alert).not.toHaveTextContent('No se pudo conectar con el servidor');
    expect(net.calls(VITALS)).toHaveLength(1);

    act(() => onlineManager.setOnline(true));
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(net.calls(VITALS)).toHaveLength(1);
    expect(screen.getByLabelText(/Frecuencia respiratoria/)).toHaveValue(18);
    expect(screen.getByLabelText(/Temperatura/)).toHaveValue(36.5);
    expect(screen.getByRole('button', { name: 'Guardar toma' })).toBeEnabled();

    // «Reintentar» repite el envío con los valores escritos, solo al pulsarlo.
    net.set(VITALS, problem(503));
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(net.calls(VITALS)).toHaveLength(2));
    expect(net.calls(VITALS)[1].body).toEqual(net.calls(VITALS)[0].body);
    expect(net.calls(VITALS)[1].body).toMatchObject({ respiratoryRate: 18 });
  });

  it('R18: una acción que recibe 5xx muestra el texto del servidor con «Reintentar», conserva lo escrito y no muestra detalles técnicos', async () => {
    const { net, user } = setup(
      '/recepcion/registro',
      {
        'GET /api/v1/pre-registrations': json(200, []),
        'POST /api/v1/patients': problem(500, {
          title: TITLE_SECRET,
          detail: DETAIL_SECRET,
        }),
      },
      'RECEPTION',
    );
    await user.click(
      await screen.findByRole('button', { name: 'Registrar paciente NN' }),
    );
    const form = screen.getByRole('form', { name: 'Registrar paciente NN' });
    await user.type(
      within(form).getByLabelText('Nombre completo'),
      'Hombre NN',
    );
    await user.selectOptions(
      within(form).getByLabelText('Dato de edad'),
      'Edad estimada (años)',
    );
    await user.type(within(form).getByLabelText('Edad estimada (años)'), '45');
    await user.selectOptions(within(form).getByLabelText('Sexo'), 'Masculino');
    await user.click(
      within(form).getByRole('button', { name: 'Guardar paciente' }),
    );
    const alert = await within(form).findByRole('alert');
    expect(alert).toHaveTextContent(SERVER);
    expect(alert).not.toHaveTextContent('No se pudo completar la acción');
    expect(document.body).not.toHaveTextContent(DETAIL_SECRET);
    expect(document.body).not.toHaveTextContent(TITLE_SECRET);
    expect(within(form).getByLabelText('Nombre completo')).toHaveValue(
      'Hombre NN',
    );
    expect(net.calls('POST /api/v1/patients')).toHaveLength(1);
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() =>
      expect(net.calls('POST /api/v1/patients')).toHaveLength(2),
    );
  });

  it('R15: confirmar una llegada sin red muestra el texto de red con «Reintentar», que repite la confirmación solo al pulsarlo', async () => {
    const confirm = `POST /api/v1/pre-registrations/${pendingPreRegistration.id}/confirm`;
    const { net, user } = setup(
      '/recepcion',
      {
        'GET /api/v1/pre-registrations': json(200, [pendingPreRegistration]),
        [confirm]: networkError(),
      },
      'RECEPTION',
    );
    const card = await screen.findByRole('article', {
      name: pendingPreRegistration.patient.fullName!,
    });
    await user.click(within(card).getByRole('checkbox'));
    await user.click(
      within(card).getByRole('button', { name: 'Confirmar llegada' }),
    );
    const alert = await within(card).findByRole('alert');
    expect(alert).toHaveTextContent(NETWORK);
    expect(net.calls(confirm)).toHaveLength(1);
    reconnect();
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(net.calls(confirm)).toHaveLength(1);
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(net.calls(confirm)).toHaveLength(2));
  });

  it('R15: cancelar una atención sin red muestra el texto de red con «Reintentar», que repite la cancelación con el mismo motivo', async () => {
    const cancel = `POST /api/v1/encounters/${ENCOUNTER_ID}/cancel`;
    const { net, user } = setup(
      `/atenciones/${ENCOUNTER_ID}`,
      { [cancel]: networkError() },
      'RECEPTION',
    );
    await user.click(
      await screen.findByRole('button', { name: 'Cancelar atención' }),
    );
    await user.type(
      screen.getByLabelText('Motivo de la cancelación'),
      'Se retiró',
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirmar cancelación' }),
    );
    const alert = await screen.findByText(NETWORK);
    const box = alert.closest('[role="alert"]') as HTMLElement;
    await user.click(within(box).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(net.calls(cancel)).toHaveLength(2));
    expect(net.calls(cancel)[1].body).toEqual(net.calls(cancel)[0].body);
  });
});
