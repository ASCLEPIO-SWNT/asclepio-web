import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { I18nProvider, useI18n } from '../../../shared/i18n';
import { CurrentStaffProvider } from '../../../shared/hooks/useCurrentStaff';
import { usePreferences } from '../../../shared/preferences/PreferencesProvider';
import {
  SITE_NORTE,
  encounter,
  fakeApi,
  json,
  patient,
  pendingPreRegistration,
  problem,
  publicTenants,
  staffMe,
} from '../../../test/fakeApi';
import { LoginPage } from '../../auth/components/LoginPage';
import { EncounterTimeline } from '../../triage/components/EncounterTimeline';
import { PatientForm } from './PatientForm';
import { ArrivalForm } from './ArrivalForm';
import { ReceptionPage } from './ReceptionPage';

function LanguageControl() {
  const { setLocale } = useI18n();
  const { updatePreferences } = usePreferences();
  return (
    <>
      <button onClick={() => setLocale('en')}>English test</button>
      <button onClick={() => setLocale('pt')}>Português test</button>
      <button onClick={() => setLocale('fr')}>Français test</button>
      <button onClick={() => setLocale('de')}>Deutsch test</button>
      <button onClick={() => setLocale('es')}>Español test</button>
      <button
        onClick={() => updatePreferences({ theme: 'dark', fontScale: 1.5 })}
      >
        Visual test
      </button>
    </>
  );
}

function renderLocalized(children: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LanguageControl />
          <CurrentStaffProvider me={staffMe.RECEPTION}>
            {children}
          </CurrentStaffProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('UI-01 feature localization', () => {
  it('R6: localiza errores ya visibles sin perder correo ni contraseña', async () => {
    fakeApi({});
    const user = userEvent.setup();
    renderLocalized(<LoginPage />);
    await user.type(screen.getByLabelText('Correo'), 'correo-incompleto');
    await user.type(screen.getByLabelText('Contraseña'), 'clave escrita');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByText('Escribe un correo válido.')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'English test' }));
    expect(screen.getByLabelText('Email')).toHaveValue('correo-incompleto');
    expect(screen.getByLabelText('Password')).toHaveValue('clave escrita');
    expect(screen.getByText('Enter a valid email address.')).toBeVisible();
    expect(
      screen.queryByText('Escribe un correo válido.'),
    ).not.toBeInTheDocument();
  });

  it('R12: conserva el modo NN, los campos y el cuerpo al cambiar idioma', async () => {
    const net = fakeApi({
      'POST /api/v1/patients': json(201, patient),
    });
    const onCreated = vi.fn();
    const user = userEvent.setup();
    renderLocalized(
      <PatientForm mode={{ kind: 'nn' }} onCreated={onCreated} />,
    );
    await user.type(screen.getByLabelText('Nombre completo'), 'María Pérez');
    await user.selectOptions(
      screen.getByLabelText('Dato de edad'),
      'estimatedAge',
    );
    await user.type(screen.getByLabelText('Edad estimada (años)'), '34');
    await user.selectOptions(screen.getByLabelText('Sexo'), 'F');

    await user.click(screen.getByRole('button', { name: 'English test' }));
    expect(screen.getByLabelText('Full name')).toHaveValue('María Pérez');
    expect(screen.getByLabelText('Age information')).toHaveValue(
      'estimatedAge',
    );
    expect(screen.getByLabelText('Estimated age (years)')).toHaveValue(34);
    expect(screen.getByLabelText('Sex')).toHaveValue('F');
    await user.click(screen.getByRole('button', { name: 'Save patient' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(net.calls('POST /api/v1/patients')[0].body).toEqual({
      fullName: 'María Pérez',
      estimatedAgeYears: 34,
      sex: 'F',
    });
    expect(onCreated).toHaveBeenCalled();
  });

  it('R13: traduce la línea de tiempo conservando al personal y la hora de Bogotá', async () => {
    const user = userEvent.setup();
    renderLocalized(
      <EncounterTimeline
        events={[
          {
            id: 'event-test',
            type: 'STATUS_CHANGED',
            occurredAt: '2026-10-28T12:42:00.000Z',
            fromStatus: 'REGISTERED',
            toStatus: 'WAITING_TRIAGE',
            actor: { type: 'STAFF', id: 'staff-test', fullName: 'María López' },
            payload: {},
          },
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'English test' }));
    expect(screen.getByRole('heading', { name: 'Timeline' })).toBeVisible();
    expect(screen.getByText('Status changed')).toBeVisible();
    expect(screen.getByText(/María López/)).toBeVisible();
    expect(screen.getByText(/Registered → Waiting for triage/)).toBeVisible();
    expect(screen.getByText(/7:42:00/)).toBeVisible();
  });

  it('R5: ofrece etiquetas y validaciones en los cinco idiomas sin reiniciar el formulario', async () => {
    fakeApi({});
    const user = userEvent.setup();
    renderLocalized(<LoginPage />);
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    const cases = [
      ['English test', 'Email', 'Enter your email address.'],
      ['Português test', 'E-mail', 'Digite seu e-mail.'],
      ['Français test', 'Adresse e-mail', 'Saisissez votre adresse e-mail.'],
      ['Deutsch test', 'E-Mail', 'Geben Sie Ihre E-Mail-Adresse ein.'],
      ['Español test', 'Correo', 'Escribe tu correo.'],
    ];
    for (const [control, label, message] of cases) {
      await user.click(screen.getByRole('button', { name: control }));
      expect(screen.getByLabelText(label)).toHaveAccessibleDescription(message);
      expect(document.documentElement.lang).toBe(
        {
          'English test': 'en',
          'Português test': 'pt',
          'Français test': 'fr',
          'Deutsch test': 'de',
          'Español test': 'es',
        }[control],
      );
    }
  });

  it('R16: conserva sede y motivo clínico literal al cambiar idioma y preferencias visuales', async () => {
    const net = fakeApi({ 'POST /api/v1/encounters': json(201, encounter) });
    const user = userEvent.setup();
    const complaint = 'Dolor en muñeca izquierda desde ayer — texto literal';
    renderLocalized(<ArrivalForm patient={patient} sites={[SITE_NORTE]} />);
    await user.type(screen.getByLabelText('Motivo de consulta'), complaint);
    await user.click(screen.getByRole('button', { name: 'Visual test' }));
    await user.click(screen.getByRole('button', { name: 'Deutsch test' }));
    expect(screen.getByLabelText('Vorstellungsgrund')).toHaveValue(complaint);
    expect(screen.getByLabelText('Standort')).toHaveValue(SITE_NORTE.id);
    expect(screen.getByText(patient.fullName!)).toBeVisible();
    expect(document.documentElement.dataset.theme).toBe('dark');
    await user.click(
      screen.getByRole('button', { name: 'Ankunft registrieren' }),
    );
    await waitFor(() =>
      expect(net.calls('POST /api/v1/encounters')).toHaveLength(1),
    );
    expect(net.calls('POST /api/v1/encounters')[0].body).toEqual({
      patientId: patient.id,
      siteId: SITE_NORTE.id,
      chiefComplaintText: complaint,
      complaintSource: 'TYPED',
    });
  });

  it('R14: traduce un conflicto visible y conserva la verificación de identidad', async () => {
    fakeApi({
      'GET /api/v1/public/tenants': json(200, publicTenants),
      'GET /api/v1/pre-registrations': json(200, [pendingPreRegistration]),
      [`POST /api/v1/pre-registrations/${pendingPreRegistration.id}/confirm`]:
        problem(409),
    });
    const user = userEvent.setup();
    renderLocalized(<ReceptionPage />);
    await user.click(await screen.findByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Confirmar llegada' }));
    expect(
      await screen.findByText(
        'Este preregistro ya no está pendiente o el paciente ya tiene una atención activa.',
      ),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'English test' }));
    expect(
      screen.getByText(
        'This pre-registration is no longer pending or the patient already has an active encounter.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});
