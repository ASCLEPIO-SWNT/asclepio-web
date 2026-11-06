import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StaffRole } from '../../shared/api/client';
import { session } from '../../shared/api/session';
import { recordedVitalSigns } from '../../features/triage/testing/clinicalFixtures';
import {
  ENCOUNTER_ID,
  encounter,
  encounterSummary,
  fakeApi,
  json,
  publicTenants,
  staffMe,
  type Handler,
} from '../../test/fakeApi';
import { renderApp } from '../../test/testApp';

const DETAIL = `GET /api/v1/encounters/${ENCOUNTER_ID}`;
const VITALS = `POST /api/v1/encounters/${ENCOUNTER_ID}/vital-signs`;
const CAPTURE = `/triage/${ENCOUNTER_ID}`;

function setup(
  path: string,
  role: StaffRole = 'NURSE',
  handlers: Record<string, Handler> = {},
) {
  const net = fakeApi({
    'GET /api/v1/me': json(200, staffMe[role]),
    'GET /api/v1/public/tenants': json(200, publicTenants),
    'GET /api/v1/encounters': json(200, { items: [encounterSummary()] }),
    'GET /api/v1/pre-registrations': json(200, []),
    [DETAIL]: json(200, encounter),
    [`${DETAIL}/clinical-capture`]: json(200, {
      encounterId: ENCOUNTER_ID,
      status: 'WAITING_TRIAGE',
      chiefComplaintText: encounter.chiefComplaintText,
      complaintSource: encounter.complaintSource,
      vitalSigns: [],
      symptomFindings: [],
    }),
    ...handlers,
  });
  return {
    net,
    user: userEvent.setup({ delay: null }),
    ...renderApp({ entries: [path], stored: true }),
  };
}

async function openCapture(handlers: Record<string, Handler> = {}) {
  const view = setup(CAPTURE, 'NURSE', handlers);
  await waitFor(() =>
    expect(screen.getByLabelText(/Frecuencia respiratoria/)).toBeEnabled(),
  );
  return view;
}

const dialog = () =>
  screen.queryByRole('dialog', { name: 'Hay cambios sin guardar' });
const navLink = (name: string) =>
  within(screen.getByRole('navigation', { name: 'Principal' })).getByRole(
    'link',
    { name },
  );

function beforeUnloadPrevented() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
  session.clear();
});

describe('UI-03-web cambios sin guardar', () => {
  it('R1: con signos vitales sin guardar, un enlace del menú abre el diálogo y «Salir sin guardar» completa la navegación', async () => {
    const { user, router } = await openCapture();
    await user.type(screen.getByLabelText(/Frecuencia respiratoria/), '18');
    await user.click(navLink('Atenciones'));
    const modal = await screen.findByRole('dialog', {
      name: 'Hay cambios sin guardar',
    });
    expect(modal).toHaveTextContent(
      'Si sales ahora, se perderán los datos que escribiste.',
    );
    expect(router.state.location.pathname).toBe(CAPTURE);
    await user.click(
      within(modal).getByRole('button', { name: 'Salir sin guardar' }),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/atenciones'),
    );
    expect(dialog()).toBeNull();
  });

  it('R1: «Seguir editando» cancela la navegación, conserva lo escrito y devuelve el foco', async () => {
    const { user, router } = await openCapture();
    await user.type(screen.getByLabelText(/Frecuencia respiratoria/), '18');
    const link = navLink('Atenciones');
    await user.click(link);
    const modal = await screen.findByRole('dialog');
    await user.click(
      within(modal).getByRole('button', { name: 'Seguir editando' }),
    );
    expect(dialog()).toBeNull();
    expect(router.state.location.pathname).toBe(CAPTURE);
    expect(screen.getByLabelText(/Frecuencia respiratoria/)).toHaveValue(18);
    expect(document.activeElement).toBe(link);
  });

  it('R1: el botón atrás del navegador también se detiene con hallazgos sin guardar', async () => {
    const view = setup('/triage', 'NURSE');
    await act(() => view.router.navigate(CAPTURE));
    await waitFor(() =>
      expect(screen.getByLabelText('Descripción')).toBeEnabled(),
    );
    await view.user.type(screen.getByLabelText('Descripción'), 'Dolor');
    await act(() => view.router.navigate(-1));
    expect(await screen.findByRole('dialog')).toBeVisible();
    expect(view.router.state.location.pathname).toBe(CAPTURE);
  });

  it('R1: el alta de paciente con datos escritos también avisa', async () => {
    const { user, router } = setup('/recepcion/registro', 'RECEPTION');
    await user.click(
      await screen.findByRole('button', { name: 'Registrar paciente NN' }),
    );
    await user.type(screen.getByLabelText('Nombre completo'), 'Hombre NN');
    await user.click(navLink('Atenciones'));
    expect(await screen.findByRole('dialog')).toBeVisible();
    expect(router.state.location.pathname).toBe('/recepcion/registro');
  });

  it('R30: el diálogo abre con el foco en «Seguir editando» y Escape equivale a «Seguir editando»', async () => {
    const { user, router } = await openCapture();
    await user.type(screen.getByLabelText(/Frecuencia respiratoria/), '18');
    await user.click(navLink('Atenciones'));
    const modal = await screen.findByRole('dialog');
    expect(document.activeElement).toBe(
      within(modal).getByRole('button', { name: 'Seguir editando' }),
    );
    expect(
      within(modal).getByRole('button', { name: 'Salir sin guardar' }),
    ).toBeVisible();
    fireEvent.keyDown(modal, { key: 'Escape' });
    await waitFor(() => expect(dialog()).toBeNull());
    expect(router.state.location.pathname).toBe(CAPTURE);
  });

  it('R2: beforeunload se pide solo mientras hay cambios sin guardar y se retira al desmontar', async () => {
    const { user, router } = await openCapture();
    expect(beforeUnloadPrevented()).toBe(false);
    const field = screen.getByLabelText(/Frecuencia respiratoria/);
    await user.type(field, '18');
    expect(beforeUnloadPrevented()).toBe(true);
    await user.clear(field);
    await waitFor(() => expect(beforeUnloadPrevented()).toBe(false));
    await user.type(field, '20');
    expect(beforeUnloadPrevented()).toBe(true);
    await user.click(navLink('Atenciones'));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Salir sin guardar',
      }),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/atenciones'),
    );
    expect(beforeUnloadPrevented()).toBe(false);
  });

  it('R3: sin cambios se navega sin diálogo', async () => {
    const { user, router } = await openCapture();
    await user.click(navLink('Atenciones'));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/atenciones'),
    );
    expect(dialog()).toBeNull();
  });

  it('R3: tras guardar con éxito se navega sin diálogo ni beforeunload', async () => {
    const { user, router } = await openCapture({
      [VITALS]: json(201, recordedVitalSigns),
    });
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
    await user.click(screen.getByRole('button', { name: 'Guardar toma' }));
    await screen.findByText('Toma de signos vitales registrada.');
    expect(beforeUnloadPrevented()).toBe(false);
    await user.click(navLink('Atenciones'));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/atenciones'),
    );
    expect(dialog()).toBeNull();
  });

  it('R3: un cierre forzado de sesión lleva al login sin diálogo ni beforeunload', async () => {
    const { user, router } = await openCapture();
    await user.type(screen.getByLabelText(/Frecuencia respiratoria/), '18');
    act(() => session.clear('expired'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(dialog()).toBeNull();
    expect(beforeUnloadPrevented()).toBe(false);
  });
});
