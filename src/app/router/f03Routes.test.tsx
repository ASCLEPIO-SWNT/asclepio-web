import { recordedVitalSigns } from '../../features/triage/testing/clinicalFixtures';
import { focusManager, onlineManager } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { components } from '../../shared/api/schema';
import type { StaffRole } from '../../shared/api/client';
import { session } from '../../shared/api/session';
import { formatBogota, formatTimeBogota } from '../../shared/lib/datetime';
import {
  ENCOUNTER_ID,
  SITE_NORTE,
  SITE_SUR,
  encounter,
  encounterSummary,
  deferred,
  fakeApi,
  json,
  networkError,
  nnPatient,
  problem,
  publicTenants,
  staffMe,
  type Handler,
} from '../../test/fakeApi';
import { norm } from '../../test/text';
import { renderApp } from './testApp';

const LIST = 'GET /api/v1/encounters';
const DETAIL = `GET /api/v1/encounters/${ENCOUNTER_ID}`;
const CAPTURE = `${DETAIL}/clinical-capture`;
const emptyCapture: components['schemas']['ClinicalCaptureDto'] = {
  encounterId: ENCOUNTER_ID,
  status: 'WAITING_TRIAGE',
  chiefComplaintText: encounter.chiefComplaintText,
  complaintSource: encounter.complaintSource,
  vitalSigns: [],
  symptomFindings: [],
};
function setup({
  role = 'NURSE',
  path = '/triage',
  handlers = {},
}: {
  role?: StaffRole;
  path?: string;
  handlers?: Record<string, Handler>;
} = {}) {
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
    user: userEvent.setup(),
    ...renderApp({ entries: [path], stored: true }),
  };
}
async function fillVitals(user: ReturnType<typeof userEvent.setup>) {
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
}
const query = (net: ReturnType<typeof fakeApi>) =>
  Object.fromEntries(net.calls(LIST).at(-1)!.query);
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
  session.clear();
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
});

describe('F-03 nurse routes', () => {
  it.each(['RECEPTION', 'PHYSICIAN', 'ADMIN'] as const)(
    'R1: %s cannot open clinical capture and does not request encounter or clinical data',
    async (role) => {
      const { net } = setup({ role, path: `/triage/${ENCOUNTER_ID}` });
      expect(
        await screen.findByRole('heading', {
          name: 'No tienes permiso para ver esta página.',
        }),
      ).toBeVisible();
      expect(net.calls(DETAIL)).toHaveLength(0);
      expect(net.calls(CAPTURE)).toHaveLength(0);
      expect(net.calls(LIST)).toHaveLength(0);
    },
  );

  it('R2: lists only WAITING_TRIAGE, restores site and offset from URL and resets the page when site changes', async () => {
    const { net, user, router } = setup({
      path: `/triage?siteId=${SITE_NORTE.id}&offset=50`,
    });
    await screen.findByText('Laura Gómez Pérez');
    expect(query(net)).toEqual({
      status: 'WAITING_TRIAGE',
      siteId: SITE_NORTE.id,
      limit: '50',
      offset: '50',
    });
    await waitFor(() => expect(screen.getByLabelText('Sede')).toBeEnabled());
    expect(screen.getByLabelText('Sede')).toHaveValue(SITE_NORTE.id);
    await user.selectOptions(screen.getByLabelText('Sede'), SITE_SUR.id);
    await waitFor(() => expect(query(net).siteId).toBe(SITE_SUR.id));
    expect(query(net).offset).toBe('0');
    expect(
      new URLSearchParams(router.state.location.search).get('offset'),
    ).toBe('0');
    await user.selectOptions(screen.getByLabelText('Sede'), '');
    await waitFor(() =>
      expect(query(net)).toEqual({
        status: 'WAITING_TRIAGE',
        limit: '50',
        offset: '0',
      }),
    );
  });

  it.each(['-50', '1.5', 'broken', 'Infinity'])(
    'R2: normalizes invalid offset %s without sending it to the API',
    async (offset) => {
      const { net } = setup({ path: `/triage?offset=${offset}` });
      await screen.findByText('Laura Gómez Pérez');
      expect(query(net).offset).toBe('0');
    },
  );

  it('R3: paginates by 50 and keeps the tray filters when opening and returning from capture', async () => {
    const items = Array.from({ length: 50 }, (_, i) =>
      encounterSummary({
        id:
          i === 0
            ? ENCOUNTER_ID
            : `e0e0e0e0-0000-4000-8000-${String(i + 2).padStart(12, '0')}`,
      }),
    );
    const { net, user, router } = setup({
      path: `/triage?siteId=${SITE_NORTE.id}&offset=50`,
      handlers: { [LIST]: json(200, { items }) },
    });
    await screen.findAllByText('Laura Gómez Pérez');
    expect(
      screen.getAllByText(norm(formatTimeBogota(encounter.arrivalAt))).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/1032456789/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(query(net).offset).toBe('100'));
    await user.click(
      screen.getAllByRole('link', { name: 'Capturar información clínica' })[0],
    );
    await screen.findByRole('heading', { name: 'Captura clínica', level: 1 });
    expect(router.state.location.pathname).toBe(`/triage/${ENCOUNTER_ID}`);
    await user.click(
      screen.getByRole('link', { name: 'Volver a la bandeja de triage' }),
    );
    await screen.findByRole('heading', { name: 'Triage', level: 1 });
    expect(
      new URLSearchParams(router.state.location.search).get('offset'),
    ).toBe('100');
    expect(
      new URLSearchParams(router.state.location.search).get('siteId'),
    ).toBe(SITE_NORTE.id);
    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    await waitFor(() => expect(query(net).offset).toBe('50'));
  });

  it('R3: exposes a manual refresh and handles an unidentified patient without inventing a document', async () => {
    const { net, user } = setup({
      handlers: {
        [LIST]: json(200, {
          items: [encounterSummary({ patient: nnPatient })],
        }),
      },
    });
    await screen.findByText('Paciente NN');
    expect(screen.queryByText(/1032456789/)).not.toBeInTheDocument();
    const initial = net.calls(LIST).length;
    await user.click(screen.getByRole('button', { name: 'Actualizar' }));
    await waitFor(() => expect(net.calls(LIST)).toHaveLength(initial + 1));
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  });

  it('R3: the tray does not refresh automatically on focus or reconnect', async () => {
    const { net } = setup();
    await screen.findByText('Laura Gómez Pérez');
    const count = net.calls(LIST).length;
    await act(async () => {
      focusManager.setFocused(false);
      onlineManager.setOnline(false);
      focusManager.setFocused(true);
      onlineManager.setOnline(true);
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(net.calls(LIST)).toHaveLength(count);
  });

  it('R4: shows empty, refresh error without stale patient cards, and manual recovery', async () => {
    const { net, user } = setup({
      handlers: { [LIST]: json(200, { items: [] }) },
    });
    expect(
      await screen.findByText(
        'No hay atenciones en espera de triage con estos filtros.',
      ),
    ).toBeVisible();
    net.set(LIST, json(200, { items: [encounterSummary()] }));
    await user.click(screen.getByRole('button', { name: 'Actualizar' }));
    await screen.findByText('Laura Gómez Pérez');
    net.set(LIST, networkError());
    await user.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron cargar las atenciones en espera.',
    );
    expect(screen.queryByText('Laura Gómez Pérez')).not.toBeInTheDocument();
    net.set(LIST, json(200, { items: [encounterSummary()] }));
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Laura Gómez Pérez')).toBeVisible();
  });

  it.each(['NURSE', 'PHYSICIAN', 'RECEPTION', 'ADMIN'] as const)(
    'R6: %s sees only its allowed clinical history and capture actions in encounter details',
    async (role) => {
      const { net } = setup({ role, path: `/atenciones/${ENCOUNTER_ID}` });
      await screen.findByText('Llegada (hora legal)');
      if (role === 'NURSE' || role === 'PHYSICIAN') {
        expect(
          await screen.findByText('Aún no hay capturas clínicas.'),
        ).toBeVisible();
        expect(net.calls(CAPTURE)).toHaveLength(1);
      } else {
        expect(net.calls(CAPTURE)).toHaveLength(0);
        expect(
          screen.queryByText('Aún no hay capturas clínicas.'),
        ).not.toBeInTheDocument();
      }
      expect(
        screen.queryByRole('link', { name: 'Capturar información clínica' }) !==
          null,
      ).toBe(role === 'NURSE');
      expect(
        screen.queryByRole('button', { name: 'Guardar toma' }),
      ).not.toBeInTheDocument();
    },
  );

  it.each([403, 404])(
    'R19: an inaccessible context (%s) does not trigger the clinical endpoint',
    async (status) => {
      const { net } = setup({
        path: `/triage/${ENCOUNTER_ID}`,
        handlers: { [DETAIL]: problem(status) },
      });
      expect(await screen.findByRole('alert')).toHaveTextContent(
        status === 403 ? 'No tienes permiso' : 'No se encontró la atención.',
      );
      expect(net.calls(CAPTURE)).toHaveLength(0);
      expect(
        screen.queryByRole('button', { name: 'Guardar toma' }),
      ).not.toBeInTheDocument();
    },
  );

  it('R24: supplies static capture instructions that never include patient content', async () => {
    const synthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: () => [],
    };
    vi.stubGlobal('speechSynthesis', synthesis);
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        text: string;
        lang = '';
        constructor(text: string) {
          this.text = text;
        }
      },
    );
    const { user } = setup({ path: `/triage/${ENCOUNTER_ID}` });
    await screen.findByRole('heading', { name: 'Captura clínica', level: 1 });
    await user.click(
      screen.getByText('Preferencias', { selector: 'summary span' }),
    );
    await user.click(screen.getByRole('button', { name: 'Escuchar guía' }));
    const utterance = synthesis.speak.mock
      .calls[0][0] as SpeechSynthesisUtterance;
    expect(utterance.text).toContain(
      'Revisa el contexto de la atención. Completa y guarda los signos vitales.',
    );
    expect(utterance.text).not.toContain(encounter.chiefComplaintText);
    expect(utterance.text).not.toContain(encounter.patient.fullName!);
    expect(utterance.text).not.toContain('Esta funcionalidad está pendiente');
  });

  it('R5: switching encounter ids discards the previous capture draft', async () => {
    const otherId = 'e0e0e0e0-0000-4000-8000-000000000002';
    const { user, router } = setup({
      path: `/triage/${ENCOUNTER_ID}`,
      handlers: {
        [`GET /api/v1/encounters/${otherId}`]: json(200, {
          ...encounter,
          id: otherId,
          patient: nnPatient,
        }),
        [`GET /api/v1/encounters/${otherId}/clinical-capture`]: json(200, {
          ...emptyCapture,
          encounterId: otherId,
        }),
      },
    });
    await screen.findByRole('button', { name: 'Guardar toma' });
    await user.type(screen.getByLabelText(/Frecuencia cardiaca/), '87');
    await act(() => router.navigate(`/triage/${otherId}`));
    await screen.findByText('Paciente NN');
    expect(await screen.findByLabelText(/Frecuencia cardiaca/)).toHaveValue(
      null,
    );
    expect(screen.queryByText('Laura Gómez Pérez')).not.toBeInTheDocument();
  });
  it('R19: retrying an unavailable context does not bypass the clinical query gate', async () => {
    const { net, user } = setup({
      path: `/triage/${ENCOUNTER_ID}`,
      handlers: { [DETAIL]: networkError() },
    });
    await screen.findByText('No se pudo cargar la atención.');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(net.calls(DETAIL)).toHaveLength(2));
    expect(net.calls(CAPTURE)).toHaveLength(0);
    expect(
      screen.queryByRole('button', { name: 'Guardar toma' }),
    ).not.toBeInTheDocument();
  });

  it('R23: keeps both drafts through all five languages and theme changes without persisting clinical content', async () => {
    const { user, router } = setup({ path: `/triage/${ENCOUNTER_ID}` });
    await screen.findByRole('button', { name: 'Guardar toma' });
    await user.type(screen.getByLabelText(/Frecuencia cardiaca/), '87');
    await user.type(
      screen.getByLabelText(/Descripción/),
      'Borrador clínico privado',
    );
    const languages = [
      ['en', 'Heart rate', 'Description', 'Save measurement'],
      ['pt', 'Frequência cardíaca', 'Descrição', 'Salvar medição'],
      ['fr', 'Fréquence cardiaque', 'Description', 'Enregistrer le relevé'],
      ['de', 'Herzfrequenz', 'Beschreibung', 'Messung speichern'],
      ['es', 'Frecuencia cardiaca', 'Descripción', 'Guardar toma'],
    ];
    for (const [locale, label, description, save] of languages) {
      await user.selectOptions(
        screen.getAllByRole('combobox', {
          name: /Idioma|Language|Langue|Sprache/,
        })[0],
        locale,
      );
      expect(screen.getByLabelText(new RegExp(label))).toHaveValue(87);
      expect(screen.getByLabelText(new RegExp(description))).toHaveValue(
        'Borrador clínico privado',
      );
      expect(screen.getByRole('button', { name: save })).toBeVisible();
    }
    await user.click(screen.getByRole('button', { name: 'Cambiar tema' }));
    expect(screen.getByLabelText(/Frecuencia cardiaca/)).toHaveValue(87);
    expect(screen.getByLabelText(/Descripción/)).toHaveValue(
      'Borrador clínico privado',
    );
    expect(router.state.location.search).not.toContain('Borrador');
    expect(JSON.stringify(localStorage)).not.toContain(
      'Borrador clínico privado',
    );
    expect(JSON.stringify(sessionStorage)).not.toContain(
      'Borrador clínico privado',
    );
  });

  it('R17: a conflict followed by a failed status refresh keeps both drafts mounted and blocked, hiding previous history', async () => {
    const previousFinding = {
      id: 'finding-old',
      encounterId: ENCOUNTER_ID,
      kind: 'SYMPTOM',
      description: 'Hallazgo anterior guardado',
      recordedAt: '2026-10-27T14:00:00.000Z',
      recordedBy: { id: staffMe.NURSE.id, fullName: staffMe.NURSE.fullName },
    };
    const { net, user } = setup({
      path: `/triage/${ENCOUNTER_ID}`,
      handlers: {
        [CAPTURE]: json(200, {
          ...emptyCapture,
          symptomFindings: [previousFinding],
        }),
        [`POST /api/v1/encounters/${ENCOUNTER_ID}/vital-signs`]: problem(409),
      },
    });
    await screen.findByRole('button', { name: 'Guardar toma' });
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
    await user.type(
      screen.getByLabelText(/Descripción/),
      'Mi borrador conservado',
    );
    net.set(DETAIL, networkError());
    await user.click(screen.getByRole('button', { name: 'Guardar toma' }));
    await screen.findByText(
      'No se pudo comprobar el estado. Actualiza la atención antes de volver a registrar.',
    );
    expect(screen.getByLabelText(/Frecuencia cardiaca/)).toHaveValue(87);
    expect(screen.getByLabelText(/Descripción/)).toHaveValue(
      'Mi borrador conservado',
    );
    expect(screen.getByRole('button', { name: 'Guardar toma' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Guardar hallazgos' }),
    ).toBeDisabled();
    expect(
      screen.queryByText('Hallazgo anterior guardado'),
    ).not.toBeInTheDocument();
    expect(
      net.calls(`POST /api/v1/encounters/${ENCOUNTER_ID}/vital-signs`),
    ).toHaveLength(1);
  });
  it.each(['REGISTERED', 'TRIAGED', 'IN_CARE', 'CLOSED', 'CANCELLED'] as const)(
    'R15: preserves consultation and blocks both captures for %s encounters',
    async (status) => {
      setup({
        path: `/triage/${ENCOUNTER_ID}`,
        handlers: {
          [DETAIL]: json(200, { ...encounter, status }),
          [CAPTURE]: json(200, { ...emptyCapture, status }),
        },
      });
      await screen.findByRole('button', { name: 'Guardar toma' });
      expect(
        screen.getByRole('button', { name: 'Guardar toma' }),
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: 'Guardar hallazgos' }),
      ).toBeDisabled();
      expect(
        screen.getByText(/La atención ya no está en espera de triage/),
      ).toBeVisible();
      expect(screen.getByText('Aún no hay capturas clínicas.')).toBeVisible();
    },
  );

  it.each([403, 404])(
    'R19: clinical GET %s hides the previous context and does not expose capture forms',
    async (status) => {
      setup({
        path: `/triage/${ENCOUNTER_ID}`,
        handlers: { [CAPTURE]: problem(status) },
      });
      expect(await screen.findByRole('alert')).toHaveTextContent(
        status === 403 ? 'No tienes permiso' : 'No se encontró la atención.',
      );
      expect(
        screen.queryByText(encounter.chiefComplaintText),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Guardar toma' }),
      ).not.toBeInTheDocument();
    },
  );

  it('R19: a clinical GET 401 uses the existing session expiry and returns to login', async () => {
    const { router } = setup({
      path: `/triage/${ENCOUNTER_ID}`,
      handlers: { [CAPTURE]: problem(401) },
    });
    await screen.findByRole('heading', { name: 'Iniciar sesión', level: 1 });
    expect(router.state.location.pathname).toBe('/login');
    expect(
      screen.queryByText(encounter.chiefComplaintText),
    ).not.toBeInTheDocument();
  });

  it('R13: a background refresh after saving vitals preserves the other draft and adds the server measurement to history', async () => {
    const { net, user } = setup({ path: `/triage/${ENCOUNTER_ID}` });
    await screen.findByRole('button', { name: 'Guardar toma' });
    await fillVitals(user);
    await user.type(
      screen.getByLabelText(/Descripción/),
      'Hallazgo sin enviar',
    );
    const gate = deferred(json(200, encounter));
    net.set(DETAIL, gate.handler);
    net.set(
      `POST /api/v1/encounters/${ENCOUNTER_ID}/vital-signs`,
      (request) => {
        net.set(
          CAPTURE,
          json(200, { ...emptyCapture, vitalSigns: [recordedVitalSigns] }),
        );
        return json(201, recordedVitalSigns)(request);
      },
    );
    await user.click(screen.getByRole('button', { name: 'Guardar toma' }));
    await waitFor(() => expect(net.calls(DETAIL).length).toBeGreaterThan(1));
    expect(screen.getByLabelText(/Descripción/)).toHaveValue(
      'Hallazgo sin enviar',
    );
    expect(
      screen.getByRole('button', { name: 'Guardar hallazgos' }),
    ).toBeDisabled();
    act(() => gate.release());
    await screen.findByText('Toma de signos vitales registrada.');
    expect(screen.getByLabelText(/Frecuencia cardiaca/)).toHaveValue(null);
    expect(screen.getByLabelText(/Descripción/)).toHaveValue(
      'Hallazgo sin enviar',
    );
    expect(screen.getByRole('heading', { name: 'Toma 1' })).toBeVisible();
    expect(
      screen.getByText(formatBogota(recordedVitalSigns.recordedAt)),
    ).toBeVisible();
  });

  it('R21: keeps the nursing tray, patient context and independent forms in the legacy section hierarchy without duplicate headings or actions', async () => {
    const { user } = setup();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Triage' }),
    ).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const navigation = screen.getByRole('navigation', { name: 'Principal' });
    expect(
      within(navigation)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Triage', 'Cola priorizada', 'Atenciones']);
    const tray = screen.getByRole('region', { name: 'Atenciones pendientes' });
    expect(
      within(tray).getByRole('heading', {
        level: 2,
        name: 'Atenciones pendientes',
      }),
    ).toBeVisible();
    expect(
      await within(tray).findByRole('cell', {
        name: new RegExp(encounter.patient.fullName!),
      }),
    ).toBeVisible();
    for (const name of ['Paciente', 'Sede', 'Llegada']) {
      expect(within(tray).getByRole('columnheader', { name })).toBeVisible();
    }
    expect(screen.getAllByRole('button', { name: 'Actualizar' })).toHaveLength(
      1,
    );
    expect(
      within(tray).getAllByRole('link', {
        name: 'Capturar información clínica',
      }),
    ).toHaveLength(1);
    await user.click(
      within(tray).getByRole('link', { name: 'Capturar información clínica' }),
    );

    const vitals = await screen.findByRole('form', { name: 'Signos vitales' });
    const findings = screen.getByRole('form', {
      name: 'Síntomas, hallazgos y notas',
    });
    expect(
      screen.getAllByRole('heading', { level: 1, name: 'Captura clínica' }),
    ).toHaveLength(1);
    const context = screen.getByRole('region', {
      name: 'Contexto de la atención',
    });
    expect(context).toHaveTextContent(encounter.patient.fullName!);
    expect(context).toHaveTextContent(encounter.chiefComplaintText);
    expect(context).toHaveTextContent(encounter.siteName);
    expect(
      within(vitals).getAllByRole('heading', {
        level: 2,
        name: 'Signos vitales',
      }),
    ).toHaveLength(1);
    expect(
      within(findings).getAllByRole('heading', {
        level: 2,
        name: 'Síntomas, hallazgos y notas',
      }),
    ).toHaveLength(1);
    expect(
      within(vitals).getAllByRole('button', { name: 'Guardar toma' }),
    ).toHaveLength(1);
    expect(
      within(findings).getAllByRole('button', { name: 'Guardar hallazgos' }),
    ).toHaveLength(1);
    expect(
      screen.getAllByRole('link', { name: 'Volver a la bandeja de triage' }),
    ).toHaveLength(1);
  });

  it('R22: translates both forms, labels and accessible validation into five languages while preserving literal clinical text', async () => {
    const { net, user } = setup({ path: `/triage/${ENCOUNTER_ID}` });
    await screen.findByRole('button', { name: 'Guardar toma' });
    const literal = `Síntoma literal de José Müller: ${'á'.repeat(501)}`;
    await user.type(screen.getByLabelText(/Frecuencia cardiaca/), '301');
    await user.selectOptions(screen.getByLabelText('Tipo'), 'FINDING');
    fireEvent.change(screen.getByLabelText('Descripción'), {
      target: { value: literal },
    });
    await user.click(screen.getByRole('button', { name: 'Guardar toma' }));
    await user.click(screen.getByRole('button', { name: 'Guardar hallazgos' }));
    const cases = [
      {
        locale: 'es',
        vitals: 'Signos vitales',
        findings: 'Síntomas, hallazgos y notas',
        heart: 'Frecuencia cardiaca',
        description: 'Descripción',
        range: 'El rango admitido es de 20 a 300 lpm.',
        length: 'La descripción admite como máximo 500 caracteres.',
      },
      {
        locale: 'en',
        vitals: 'Vital signs',
        findings: 'Symptoms, findings and notes',
        heart: 'Heart rate',
        description: 'Description',
        range: 'The allowed range is 20 to 300 lpm.',
        length: 'The description allows at most 500 characters.',
      },
      {
        locale: 'pt',
        vitals: 'Sinais vitais',
        findings: 'Sintomas, achados e notas',
        heart: 'Frequência cardíaca',
        description: 'Descrição',
        range: 'O intervalo permitido é de 20 a 300 lpm.',
        length: 'A descrição admite no máximo 500 caracteres.',
      },
      {
        locale: 'fr',
        vitals: 'Constantes vitales',
        findings: 'Symptômes, constats et notes',
        heart: 'Fréquence cardiaque',
        description: 'Description',
        range: 'La plage autorisée est de 20 à 300 lpm.',
        length: 'La description accepte au maximum 500 caractères.',
      },
      {
        locale: 'de',
        vitals: 'Vitalwerte',
        findings: 'Symptome, Befunde und Notizen',
        heart: 'Herzfrequenz',
        description: 'Beschreibung',
        range: 'Der zulässige Bereich beträgt 20 bis 300 lpm.',
        length: 'Die Beschreibung darf höchstens 500 Zeichen enthalten.',
      },
    ];
    for (const item of cases) {
      await user.selectOptions(
        screen.getAllByRole('combobox', {
          name: /Idioma|Language|Langue|Sprache/,
        })[0],
        item.locale,
      );
      const vitals = screen.getByRole('form', { name: item.vitals });
      const findings = screen.getByRole('form', { name: item.findings });
      const heart = within(vitals).getByRole('spinbutton', {
        name: new RegExp(item.heart),
      });
      const description = within(findings).getByRole('textbox', {
        name: item.description,
      });
      expect(heart).toHaveAttribute('aria-invalid', 'true');
      expect(heart).toHaveAccessibleDescription(item.range);
      expect(heart).toHaveValue(301);
      expect(description).toHaveAttribute('aria-invalid', 'true');
      expect(description).toHaveAccessibleDescription(item.length);
      expect(description).toHaveValue(literal);
      expect(screen.getByText(encounter.chiefComplaintText)).toBeVisible();
      expect(screen.getByText(encounter.patient.fullName!)).toBeVisible();
    }
    expect(
      net.calls(`POST /api/v1/encounters/${ENCOUNTER_ID}/vital-signs`),
    ).toHaveLength(0);
    expect(
      net.calls(`POST /api/v1/encounters/${ENCOUNTER_ID}/symptom-findings`),
    ).toHaveLength(0);
  });
});
