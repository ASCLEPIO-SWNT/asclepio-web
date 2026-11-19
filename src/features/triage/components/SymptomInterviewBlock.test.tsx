import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  Encounter,
  InterviewEndedBy,
  StaffRole,
} from '../../../shared/api/client';
import {
  ENCOUNTER_ID,
  encounter,
  encounterWithInterview,
  fakeApi,
  json,
  symptomInterview,
} from '../../../test/fakeApi';
import { renderFeature } from '../../../test/renderFeature';
import { captureFixture } from '../testing/clinicalFixtures';
import {
  LIST_SUGGESTIONS,
  guardG1Suggestion,
  noSuggestions,
  suggestionList,
} from '../testing/suggestionFixtures';
import { encounterRoutes, triageRoutes } from '../routes';

const DETAIL = `GET /api/v1/encounters/${ENCOUNTER_ID}`;
const CAPTURE = `${DETAIL}/clinical-capture`;
const TITLE = 'Respuestas del paciente al asistente (no verificadas)';
const UNKNOWN = 'No sabe / prefirió no responder';
const ROLES: StaffRole[] = ['RECEPTION', 'NURSE', 'PHYSICIAN', 'ADMIN'];

afterEach(() => {
  vi.unstubAllGlobals();
});

function openCapture(detail: Encounter = encounterWithInterview()) {
  fakeApi({
    [DETAIL]: json(200, detail),
    [CAPTURE]: json(200, captureFixture()),
    [LIST_SUGGESTIONS]: noSuggestions,
  });
  renderFeature(triageRoutes, {
    entries: [`/triage/${ENCOUNTER_ID}`],
    role: 'NURSE',
  });
}

function openDetail(
  detail: Encounter = encounterWithInterview(),
  role: StaffRole = 'NURSE',
) {
  fakeApi({
    [DETAIL]: json(200, detail),
    [CAPTURE]: json(200, captureFixture()),
  });
  renderFeature(encounterRoutes, {
    entries: [`/atenciones/${ENCOUNTER_ID}`],
    role,
  });
}

const captureContext = () =>
  screen.findByRole('region', { name: 'Contexto de la atención' });

/** Las preguntas del bloque, en el orden en que se muestran: aspecto, pregunta y respuesta. */
function turnsOf(block: HTMLElement) {
  const list = within(block).getByRole('list', {
    name: 'Preguntas y respuestas',
  });
  return within(list)
    .getAllByRole('listitem')
    .map((item) => ({
      dimension: item.querySelector('.interview-block__dimension')?.textContent,
      question: within(item).getByRole('term').textContent,
      answer: within(item).getByRole('definition').textContent,
    }));
}

describe('F-11-web bloque de respuestas del paciente', () => {
  it('R1: la captura clínica muestra el bloque debajo del motivo original, con cada pregunta, su respuesta y «No sabe» para null', async () => {
    openCapture();
    const context = await captureContext();
    const block = within(context).getByRole('region', { name: TITLE });
    const complaint = within(context).getByText(encounter.chiefComplaintText);
    expect(
      complaint.compareDocumentPosition(block) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(within(block).getByRole('heading', { level: 3 })).toHaveTextContent(
      TITLE,
    );
    expect(turnsOf(block)).toEqual([
      {
        dimension: 'Inicio',
        question: '¿Desde cuándo tiene el dolor de cabeza?',
        answer: 'Desde ayer por la tarde',
      },
      {
        dimension: 'Intensidad',
        question: 'Del 0 al 10, ¿qué tan fuerte es el dolor?',
        answer: '7',
      },
      {
        dimension: 'Medicación y alergias',
        question: '¿Toma algún medicamento o tiene alergias?',
        answer: UNKNOWN,
      },
    ]);
  });

  it('R1: el bloque indica el motor («En el teléfono») y el motivo de fin', async () => {
    openCapture();
    const block = within(await captureContext()).getByRole('region', {
      name: TITLE,
    });
    expect(
      within(block).getByText('Asistente').nextElementSibling,
    ).toHaveTextContent('En el teléfono');
    expect(
      within(block).getByText('Fin de la entrevista').nextElementSibling,
    ).toHaveTextContent('El paciente la terminó');
  });

  it.each(ROLES)(
    'R1: el detalle de la atención muestra el bloque para %s, con encabezado de nivel 2',
    async (role) => {
      openDetail(encounterWithInterview(), role);
      const block = await screen.findByRole('region', { name: TITLE });
      expect(
        within(block).getByRole('heading', { level: 2 }),
      ).toHaveTextContent(TITLE);
      expect(turnsOf(block).map((turn) => turn.answer)).toEqual([
        'Desde ayer por la tarde',
        '7',
        UNKNOWN,
      ]);
    },
  );

  it('R1: con el motor del servidor el bloque dice «En el servidor»', async () => {
    openDetail(
      encounterWithInterview({
        symptomInterview: { ...symptomInterview, engine: 'SERVER' },
      }),
    );
    const block = await screen.findByRole('region', { name: TITLE });
    expect(within(block).getByText('En el servidor')).toBeVisible();
    expect(within(block).queryByText('En el teléfono')).toBeNull();
  });

  it.each<[InterviewEndedBy, string]>([
    ['COMPLETE', 'El asistente terminó sus preguntas'],
    ['MAX_QUESTIONS', 'Se alcanzó el máximo de preguntas'],
    ['RED_FLAG', 'Se cortó por una señal de alarma'],
    ['PATIENT', 'El paciente la terminó'],
  ])('R1: el motivo de fin %s se muestra como «%s»', async (endedBy, label) => {
    openDetail(
      encounterWithInterview({
        symptomInterview: { ...symptomInterview, endedBy },
      }),
    );
    const block = await screen.findByRole('region', { name: TITLE });
    expect(
      within(block).getByText('Fin de la entrevista').nextElementSibling,
    ).toHaveTextContent(label);
  });

  it('R1: una entrevista sin preguntas respondidas lo dice, sin una lista vacía', async () => {
    openDetail(
      encounterWithInterview({
        symptomInterview: {
          ...symptomInterview,
          turns: [],
          endedBy: 'RED_FLAG',
        },
      }),
    );
    const block = await screen.findByRole('region', { name: TITLE });
    expect(
      within(block).getByText(
        'El paciente no respondió preguntas de seguimiento.',
      ),
    ).toBeVisible();
    expect(
      within(block).queryByRole('list', { name: 'Preguntas y respuestas' }),
    ).toBeNull();
  });

  it('R6: sin entrevista la captura clínica no muestra el bloque y el contexto es el de siempre', async () => {
    openCapture(encounter);
    const context = await captureContext();
    expect(within(context).queryByRole('region', { name: TITLE })).toBeNull();
    expect(within(context).queryByText(UNKNOWN)).toBeNull();
    expect(
      within(context).queryByText('Señal de alarma referida por el paciente'),
    ).toBeNull();
    expect(
      within(context).getByText(encounter.chiefComplaintText),
    ).toBeVisible();
  });

  it.each(ROLES)(
    'R6: sin entrevista el detalle no muestra el bloque para %s',
    async (role) => {
      openDetail(encounter, role);
      await screen.findByText('Llegada (hora legal)');
      expect(screen.queryByRole('region', { name: TITLE })).toBeNull();
      expect(screen.queryByText(UNKNOWN)).toBeNull();
    },
  );

  it('R4: el bloque es informativo: sin botones, sin nivel, fuera del panel de IA y de la tarjeta de triage, y sin sus estilos', async () => {
    openCapture();
    const block = within(await captureContext()).getByRole('region', {
      name: TITLE,
    });
    expect(block).toHaveClass('interview-block');
    expect(within(block).queryAllByRole('button')).toEqual([]);
    expect(block.textContent).not.toMatch(/nivel/i);
    expect(
      block.closest('.suggestion-panel, .suggestion-view, .decision-card'),
    ).toBeNull();
    expect(
      block.querySelector(
        '.suggestion-view, .suggestion-view__notice, .decision-card, .status, .badge',
      ),
    ).toBeNull();
    expect(
      within(block).getByText(/no es una valoración clínica/i),
    ).toBeVisible();
  });

  it('R4: con el bloque en pantalla, «Validar» y «Corregir» conservan el mismo peso visual', async () => {
    fakeApi({
      [DETAIL]: json(200, encounterWithInterview()),
      [CAPTURE]: json(200, captureFixture()),
      [LIST_SUGGESTIONS]: json(200, suggestionList(guardG1Suggestion)),
    });
    renderFeature(triageRoutes, {
      entries: [`/triage/${ENCOUNTER_ID}`],
      role: 'NURSE',
    });
    const card = await screen.findByRole('region', {
      name: 'Triage de enfermería',
    });
    const validate = await within(card).findByRole('button', {
      name: 'Validar nivel II',
    });
    const correct = within(card).getByRole('button', { name: 'Corregir' });
    expect(validate.className).toBe(correct.className);
    expect(validate.className).toBe('button button--secondary');
    expect(screen.getByRole('region', { name: TITLE })).toBeVisible();
  });
});
