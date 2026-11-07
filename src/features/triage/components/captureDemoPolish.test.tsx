import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { I18nProvider, useI18n } from '../../../shared/i18n';
import { Notice } from '../../../shared/ui/Notice';
import {
  LOCALES,
  setCurrentLocale,
  type Locale,
} from '../../../shared/i18n/locale';
import { ENCOUNTER_ID, fakeApi, json } from '../../../test/fakeApi';
import {
  captureFixture,
  recordedFinding,
  recordedVitalSigns,
  validVitalInput,
} from '../testing/clinicalFixtures';
import { ClinicalCaptureHistory } from './ClinicalCaptureHistory';
import { SymptomFindingsForm } from './SymptomFindingsForm';
import { VitalSignsForm } from './VitalSignsForm';

const VITALS = `POST /api/v1/encounters/${ENCOUNTER_ID}/vital-signs`;
const FINDINGS = `POST /api/v1/encounters/${ENCOUNTER_ID}/symptom-findings`;
const PROVISIONAL =
  'PROVISIONAL — no validado clínicamente, revisar con asesor clínico.';

/** El texto de `clinical_provisional` antes de este slice, en los cinco idiomas: no cambia. */
const PROVISIONAL_BY_LOCALE: Record<Locale, string> = {
  es: PROVISIONAL,
  en: 'PROVISIONAL — not clinically validated; review with a clinical adviser.',
  pt: 'PROVISÓRIO — não validado clinicamente; revisar com um assessor clínico.',
  fr: 'PROVISOIRE — non validé cliniquement ; à revoir avec un conseiller clinique.',
  de: 'VORLÄUFIG — nicht klinisch validiert; mit klinischer Beratung prüfen.',
};

function LocaleSetter({ locale }: { locale: Locale }) {
  const { setLocale } = useI18n();
  useEffect(() => setLocale(locale), [locale, setLocale]);
  return null;
}

function mount(locale: Locale = 'es') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const props = {
    encounterId: ENCOUNTER_ID,
    disabled: false,
    onConflict: vi.fn(),
    onUnavailable: vi.fn(),
  };
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <LocaleSetter locale={locale} />
        <VitalSignsForm {...props} />
        <SymptomFindingsForm {...props} />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

function fillVitals() {
  for (const [field, value] of Object.entries(validVitalInput))
    fireEvent.change(document.getElementById(`vital-${field}`)!, {
      target: { value },
    });
}

afterEach(() => {
  // Las preferencias (idioma) se guardan en localStorage: cada prueba empieza en español.
  localStorage.clear();
  setCurrentLocale('es');
  vi.unstubAllGlobals();
});

describe('UI-04-web captura clínica', () => {
  it('R12: el aviso PROVISIONAL usa el estilo de advertencia, sin role="alert" y con su texto actual', () => {
    fakeApi({});
    mount();
    const notice = screen.getByText(PROVISIONAL);
    expect(notice.tagName).toBe('P');
    expect(notice).toHaveClass('status', 'status--warn');
    expect(notice).not.toHaveAttribute('role');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each(LOCALES)(
    'R12: en %s el aviso PROVISIONAL conserva su texto y lleva el estilo de advertencia',
    async (locale) => {
      const catalog = JSON.parse(
        readFileSync(`messages/features/${locale}.json`, 'utf8'),
      ) as Record<string, string>;
      expect(catalog.clinical_provisional).toBe(PROVISIONAL_BY_LOCALE[locale]);
      fakeApi({});
      mount(locale);
      expect(
        await screen.findByText(PROVISIONAL_BY_LOCALE[locale]),
      ).toHaveClass('status', 'status--warn');
    },
  );

  it('R13: «Quitar elemento N» sigue siendo un botón secundario dentro de su elemento', () => {
    fakeApi({});
    mount();
    const remove = screen.getByRole('button', { name: 'Quitar elemento 1' });
    expect(remove).toHaveClass('button', 'button--secondary');
    expect(remove.parentElement).toHaveClass('clinical-finding');
  });

  it('R16: tras un 201 de «Guardar toma», el aviso de éxito tiene el foco', async () => {
    fakeApi({ [VITALS]: json(201, recordedVitalSigns) });
    mount();
    fillVitals();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar toma' }));
    const notice = await screen.findByText(
      'Toma de signos vitales registrada.',
    );
    expect(notice).toHaveAttribute('role', 'status');
    expect(notice).toHaveFocus();
  });

  it('R16: tras un 201 de «Guardar hallazgos», el aviso de éxito tiene el foco', async () => {
    fakeApi({ [FINDINGS]: json(201, { items: [recordedFinding] }) });
    mount();
    fireEvent.change(screen.getByLabelText('Tipo'), {
      target: { value: 'COMPLAINT_NOTE' },
    });
    fireEvent.change(screen.getByLabelText('Descripción'), {
      target: { value: 'Descripción clínica' },
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar hallazgos' }),
    );
    const notice = await screen.findByText('Hallazgos registrados.');
    expect(notice).toHaveFocus();
  });
});

describe('UI-04-web aviso enfocable', () => {
  it('R16: Notice con autoFocus recibe el foco al montarse con tabIndex -1; sin él, el marcado no cambia', () => {
    const { container, unmount } = render(
      <Notice autoFocus>Toma registrada.</Notice>,
    );
    const notice = screen.getByRole('status');
    expect(notice).toHaveAttribute('tabindex', '-1');
    expect(notice).toHaveFocus();
    unmount();
    const plain = render(<Notice>Preregistro rechazado.</Notice>);
    expect(plain.container.innerHTML).toBe(
      '<div role="status" class="status status--ok notice">Preregistro rechazado.</div>',
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('UI-04-web letras ACVPU', () => {
  it('R11: «Nivel de conciencia (ACVPU)» sigue siendo un select etiquetado con clinical-select--letters y solo las cinco letras', () => {
    fakeApi({});
    mount();
    const select = screen.getByLabelText(/Nivel de conciencia/);
    expect(select.tagName).toBe('SELECT');
    expect(select).toHaveClass('clinical-select--letters');
    expect(select).toHaveValue('');
    const options = within(select).getAllByRole<HTMLOptionElement>('option');
    expect(options[0].value).toBe('');
    const letters = options.slice(1);
    expect(letters.map((o) => o.value)).toEqual(['A', 'C', 'V', 'P', 'U']);
    expect(letters.map((o) => o.textContent)).toEqual([
      'A',
      'C',
      'V',
      'P',
      'U',
    ]);
  });

  it('R11: en «Tomas registradas» la letra va en una insignia neutra dentro de su dd', () => {
    render(
      <ClinicalCaptureHistory
        capture={captureFixture({ vitalSigns: [recordedVitalSigns] })}
      />,
    );
    const takes = screen.getByRole('region', { name: 'Tomas registradas' });
    const term = within(takes)
      .getAllByText(/Nivel de conciencia/)
      .find((node) => node.tagName === 'DT')!;
    const value = term.nextElementSibling!;
    expect(value.tagName).toBe('DD');
    const badge = value.querySelector('span.badge');
    expect(badge).toHaveClass('tone--neutral');
    expect(badge!.textContent).toBe('A');
    expect(value.textContent).toBe('A');
    // Solo la conciencia lleva insignia.
    expect(takes.querySelectorAll('.badge')).toHaveLength(1);
  });
});
