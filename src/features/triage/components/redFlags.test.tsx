import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Encounter, StaffRole } from '../../../shared/api/client';
import {
  ENCOUNTER_ID,
  encounter,
  encounterWithInterview,
  fakeApi,
  json,
} from '../../../test/fakeApi';
import { renderFeature } from '../../../test/renderFeature';
import { captureFixture } from '../testing/clinicalFixtures';
import { LIST_SUGGESTIONS, noSuggestions } from '../testing/suggestionFixtures';
import { encounterRoutes, triageRoutes } from '../routes';

const DETAIL = `GET /api/v1/encounters/${ENCOUNTER_ID}`;
const CAPTURE = `${DETAIL}/clinical-capture`;
const BADGE = 'Señal de alarma referida por el paciente';
const ROLES: StaffRole[] = ['RECEPTION', 'NURSE', 'PHYSICIAN', 'ADMIN'];

/** Atención con señales referidas: las de la app y las de las reglas del servidor (F-11-api). */
const flagged = encounterWithInterview({
  redFlags: ['CHEST_PAIN', 'BREATHING_DIFFICULTY'],
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function network(detail: Encounter) {
  fakeApi({
    [DETAIL]: json(200, detail),
    [CAPTURE]: json(200, captureFixture()),
    [LIST_SUGGESTIONS]: noSuggestions,
  });
}

const flagsIn = (scope: HTMLElement) =>
  within(within(scope).getByRole('list', { name: 'Señales referidas' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent);

describe('F-11-web señal de alarma en la captura y el detalle', () => {
  it('R2: la captura clínica muestra la insignia y las señales traducidas en el contexto de la atención', async () => {
    network(flagged);
    renderFeature(triageRoutes, {
      entries: [`/triage/${ENCOUNTER_ID}`],
      role: 'NURSE',
    });
    const context = await screen.findByRole('region', {
      name: 'Contexto de la atención',
    });
    expect(within(context).getByText(BADGE)).toBeVisible();
    expect(flagsIn(context)).toEqual([
      'Dolor o presión en el pecho',
      'Dificultad para respirar o ahogo',
    ]);
  });

  it.each(ROLES)(
    'R2: el detalle de la atención muestra la insignia y las señales para %s',
    async (role) => {
      network(flagged);
      renderFeature(encounterRoutes, {
        entries: [`/atenciones/${ENCOUNTER_ID}`],
        role,
      });
      await screen.findByText('Llegada (hora legal)');
      const region = screen.getByRole('region', { name: 'Atención' });
      expect(within(region).getByText(BADGE)).toBeVisible();
      expect(flagsIn(region)).toEqual([
        'Dolor o presión en el pecho',
        'Dificultad para respirar o ahogo',
      ]);
    },
  );

  it('R2: con señales y sin entrevista (reglas del servidor sobre el motivo) la insignia se muestra igual', async () => {
    network({ ...encounter, redFlags: ['SEIZURE'] });
    renderFeature(encounterRoutes, {
      entries: [`/atenciones/${ENCOUNTER_ID}`],
      role: 'NURSE',
    });
    await screen.findByText('Llegada (hora legal)');
    const region = screen.getByRole('region', { name: 'Atención' });
    expect(within(region).getByText(BADGE)).toBeVisible();
    expect(flagsIn(region)).toEqual(['Convulsión']);
  });

  it('R2: con redFlags vacío no hay insignia en la captura ni en el detalle', async () => {
    network(encounterWithInterview({ redFlags: [] }));
    const { unmount } = renderFeature(triageRoutes, {
      entries: [`/triage/${ENCOUNTER_ID}`],
      role: 'NURSE',
    });
    await screen.findByRole('region', { name: 'Contexto de la atención' });
    expect(screen.queryByText(BADGE)).toBeNull();
    unmount();
    renderFeature(encounterRoutes, {
      entries: [`/atenciones/${ENCOUNTER_ID}`],
      role: 'NURSE',
    });
    await screen.findByText('Llegada (hora legal)');
    expect(screen.queryByText(BADGE)).toBeNull();
  });
});
