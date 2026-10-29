import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { I18nProvider, useI18n } from '../../../shared/i18n';
import { usePreferences } from '../../../shared/preferences/PreferencesProvider';
import {
  ENCOUNTER_ID,
  deferred,
  fakeApi,
  json,
  networkError,
  problem,
} from '../../../test/fakeApi';
import {
  recordedFinding,
  recordedVitalSigns,
  validVitalInput,
} from '../testing/clinicalFixtures';
import { VitalSignsForm } from './VitalSignsForm';
import { SymptomFindingsForm } from './SymptomFindingsForm';

const VITALS = `POST /api/v1/encounters/${ENCOUNTER_ID}/vital-signs`;
const FINDINGS = `POST /api/v1/encounters/${ENCOUNTER_ID}/symptom-findings`;
function PreferenceControls() {
  const { setLocale } = useI18n();
  const { updatePreferences } = usePreferences();
  return (
    <>
      <button onClick={() => setLocale('en')}>English test</button>
      <button onClick={() => updatePreferences({ theme: 'dark' })}>
        Dark test
      </button>
    </>
  );
}
function mount({
  disabled = false,
  onConflict = vi.fn(),
  onUnavailable = vi.fn(),
} = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const props = {
    encounterId: ENCOUNTER_ID,
    disabled,
    onConflict,
    onUnavailable,
  };
  const view = render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <PreferenceControls />
        <VitalSignsForm {...props} />
        <SymptomFindingsForm {...props} />
      </I18nProvider>
    </QueryClientProvider>,
  );
  return { ...view, onConflict, onUnavailable, client };
}
function fillVitals() {
  for (const [field, value] of Object.entries(validVitalInput)) {
    const input = document.getElementById(`vital-${field}`)!;
    if (input.tagName === 'SELECT')
      fireEvent.change(input, { target: { value } });
    else fireEvent.change(input, { target: { value } });
  }
}
function fillFinding(description = '  Descripción clínica José Müller  ') {
  fireEvent.change(screen.getByLabelText('Tipo'), {
    target: { value: 'COMPLAINT_NOTE' },
  });
  fireEvent.change(screen.getByLabelText('Descripción'), {
    target: { value: description },
  });
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('R7: shows all nine labels and units, optional marks, provisional notice and no selected clinical choices', () => {
  fakeApi({});
  mount();
  for (const label of [
    /Frecuencia respiratoria/,
    /Saturación de oxígeno/,
    /Oxígeno suplementario/,
    /Presión arterial sistólica/,
    /Frecuencia cardiaca/,
    /Nivel de conciencia/,
    /Temperatura/,
    /Presión arterial diastólica/,
    /Glucometría/,
  ])
    expect(screen.getByLabelText(label)).toHaveValue(
      screen.getByLabelText(label).tagName === 'SELECT' ? '' : null,
    );
  expect(
    screen.getByText(
      'PROVISIONAL — no validado clínicamente, revisar con asesor clínico.',
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByLabelText(/Presión arterial diastólica/),
  ).toHaveAccessibleName(/Opcional/);
  expect(screen.getByLabelText(/Nivel de conciencia/)).toHaveValue('');
});

it('R8: prevents invalid capture and focuses its first accessible field error', async () => {
  const net = fakeApi({});
  mount();
  await userEvent.click(screen.getByRole('button', { name: 'Guardar toma' }));
  const field = screen.getByLabelText(/Frecuencia respiratoria/);
  await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
  expect(field).toHaveFocus();
  expect(field).toHaveAccessibleDescription('Completa este campo.');
  expect(net.requests).toHaveLength(0);
});

it('R13: saves and clears only the successful form while preserving the independent draft', async () => {
  const net = fakeApi({
    [VITALS]: json(201, recordedVitalSigns),
    [FINDINGS]: json(201, { items: [recordedFinding] }),
  });
  mount();
  fillVitals();
  fillFinding();
  await userEvent.click(screen.getByRole('button', { name: 'Guardar toma' }));
  expect(
    await screen.findByText('Toma de signos vitales registrada.'),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/Frecuencia respiratoria/)).toHaveValue(null);
  expect(screen.getByLabelText('Descripción')).toHaveValue(
    '  Descripción clínica José Müller  ',
  );
  expect(net.calls(VITALS)[0].body).toEqual({
    respiratoryRate: 18,
    oxygenSaturation: 98,
    supplementalOxygen: false,
    systolicBp: 120,
    heartRate: 80,
    consciousness: 'A',
    temperatureC: 36.7,
  });
  fillVitals();
  await userEvent.click(
    screen.getByRole('button', { name: 'Guardar hallazgos' }),
  );
  expect(await screen.findByText('Hallazgos registrados.')).toBeInTheDocument();
  expect(screen.getByLabelText('Descripción')).toHaveValue('');
  expect(screen.getByLabelText(/Frecuencia respiratoria/)).toHaveValue(18);
  expect(net.calls(FINDINGS)[0].body).toEqual({
    items: [
      {
        kind: 'COMPLAINT_NOTE',
        description: 'Descripción clínica José Müller',
      },
    ],
  });
});

it('R10: blocks a second submit and disables only the pending form', async () => {
  const response = deferred(json(201, recordedVitalSigns));
  const net = fakeApi({ [VITALS]: response.handler });
  mount();
  fillVitals();
  const save = screen.getByRole('button', { name: 'Guardar toma' });
  await userEvent.click(save);
  await userEvent.click(save);
  expect(save).toBeDisabled();
  expect(screen.getByLabelText('Descripción')).toBeEnabled();
  expect(net.calls(VITALS)).toHaveLength(1);
  act(() => response.release());
  await screen.findByText('Toma de signos vitales registrada.');
});

it('R11: adds and removes only draft findings, validates rows and limits the draft to twenty entries', async () => {
  const net = fakeApi({});
  mount();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Añadir elemento' }));
  expect(screen.getAllByLabelText('Descripción')).toHaveLength(2);
  await user.click(screen.getByRole('button', { name: 'Quitar elemento 2' }));
  expect(screen.getAllByLabelText('Descripción')).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: 'Guardar hallazgos' }));
  await waitFor(() =>
    expect(screen.getByLabelText('Tipo')).toHaveAttribute(
      'aria-invalid',
      'true',
    ),
  );
  expect(net.requests).toHaveLength(0);
  for (let index = 1; index < 20; index++)
    await user.click(screen.getByRole('button', { name: 'Añadir elemento' }));
  expect(screen.getAllByLabelText('Descripción')).toHaveLength(20);
  expect(
    screen.getByRole('button', { name: 'Añadir elemento' }),
  ).toBeDisabled();
});

it('R16: maps indexed and vital server errors to fields without echoing arbitrary clinical messages', async () => {
  const secret = 'Private-clinical-message-never-echo';
  // The native method is explicitly rebound with call below.
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const nativeFocus = HTMLElement.prototype.focus;
  let disabledFocusAttempts = 0;
  vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (
    this: HTMLElement,
    options?: FocusOptions,
  ) {
    if (this.matches(':disabled')) {
      disabledFocusAttempts++;
      return;
    }
    nativeFocus.call(this, options);
  });
  fakeApi({
    [VITALS]: problem(422, {
      errors: [
        { field: 'heartRate', message: secret },
        { field: 'unknown', message: secret },
      ],
    }),
    [FINDINGS]: problem(400, {
      errors: [{ field: 'items.0.description', message: secret }],
    }),
  });
  mount();
  fillVitals();
  fillFinding();
  await userEvent.click(screen.getByRole('button', { name: 'Guardar toma' }));
  await waitFor(() =>
    expect(screen.getByLabelText(/Frecuencia cardiaca/)).toHaveAttribute(
      'aria-invalid',
      'true',
    ),
  );
  expect(screen.getByLabelText(/Frecuencia cardiaca/)).toHaveFocus();
  expect(
    screen.getByLabelText(/Frecuencia cardiaca/),
  ).toHaveAccessibleDescription('Revisa este campo.');
  expect(screen.getByLabelText(/Frecuencia cardiaca/)).toHaveValue(80);
  await userEvent.click(
    screen.getByRole('button', { name: 'Guardar hallazgos' }),
  );
  await waitFor(() =>
    expect(screen.getByLabelText('Descripción')).toHaveAttribute(
      'aria-invalid',
      'true',
    ),
  );
  expect(screen.getByLabelText('Descripción')).toHaveValue(
    '  Descripción clínica José Müller  ',
  );
  expect(screen.getByLabelText('Descripción')).toHaveFocus();
  expect(disabledFocusAttempts).toBe(0);
  expect(screen.queryByText(secret)).not.toBeInTheDocument();
});

it('R17: reports conflict once and preserves both drafts for the parent state check', async () => {
  const net = fakeApi({ [VITALS]: problem(409) });
  const { onConflict } = mount();
  fillVitals();
  fillFinding();
  await userEvent.click(screen.getByRole('button', { name: 'Guardar toma' }));
  expect(
    await screen.findByText(
      'La atención ya no está disponible para captura. Se está comprobando su estado.',
    ),
  ).toBeInTheDocument();
  expect(onConflict).toHaveBeenCalledOnce();
  expect(screen.getByLabelText(/Frecuencia cardiaca/)).toHaveValue(80);
  expect(screen.getByLabelText('Descripción')).toHaveValue(
    '  Descripción clínica José Müller  ',
  );
  expect(net.calls(VITALS)).toHaveLength(1);
});

it('R18: keeps drafts after network failure and permits only a manual new attempt', async () => {
  const net = fakeApi({ [FINDINGS]: networkError() });
  mount();
  fillFinding();
  await userEvent.click(
    screen.getByRole('button', { name: 'Guardar hallazgos' }),
  );
  expect(
    await screen.findByText(
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    ),
  ).toBeInTheDocument();
  expect(net.calls(FINDINGS)).toHaveLength(1);
  expect(screen.getByLabelText('Descripción')).toHaveValue(
    '  Descripción clínica José Müller  ',
  );
});

it.each([403, 404] as const)(
  'R19: delegates POST %s to the page without exposing a raw error response',
  async (status) => {
    fakeApi({ [VITALS]: problem(status) });
    const { onUnavailable } = mount();
    fillVitals();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar toma' }));
    await waitFor(() => expect(onUnavailable).toHaveBeenCalledWith(status));
  },
);

it('R15: prevents both writes when the encounter is not currently enabled', () => {
  const net = fakeApi({});
  mount({ disabled: true });
  expect(screen.getByRole('button', { name: 'Guardar toma' })).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Guardar hallazgos' }),
  ).toBeDisabled();
  expect(net.requests).toHaveLength(0);
});

it('R23: changes locale and theme without replacing inputs, drafts or already visible validation', async () => {
  fakeApi({});
  mount();
  const user = userEvent.setup();
  fillFinding('Literal clínico José Müller');
  await user.click(screen.getByRole('button', { name: 'Guardar toma' }));
  const input = screen.getByLabelText(/Frecuencia respiratoria/);
  expect(input).toHaveAccessibleDescription('Completa este campo.');
  await user.click(screen.getByText('English test'));
  await user.click(screen.getByText('Dark test'));
  expect(document.getElementById('vital-respiratoryRate')).toBe(input);
  expect(input).not.toHaveAccessibleDescription('Completa este campo.');
  const form = screen.getByRole('form', {
    name: 'Symptoms, findings and notes',
  });
  expect(within(form).getByRole('textbox')).toHaveValue(
    'Literal clínico José Müller',
  );
  expect(document.documentElement.dataset.theme).toBe('dark');
});
