import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PendingPreRegistration } from '../../../shared/api/client';
import {
  fakeApi,
  json,
  patient,
  pendingPreRegistration,
  publicTenants,
  symptomInterview,
} from '../../../test/fakeApi';
import { renderFeature } from '../../../test/renderFeature';
import { receptionRoutes } from '../routes';

const BADGE = 'Señal de alarma referida por el paciente';

/** Prerregistro con señales referidas (F-11): el servidor lo pone primero en la bandeja. */
const flagged: PendingPreRegistration = {
  ...pendingPreRegistration,
  id: 'c0c0c0c0-0000-4000-8000-000000000011',
  chiefComplaintText: 'Me duele el pecho',
  symptomInterview: {
    ...symptomInterview,
    redFlags: ['CHEST_PAIN'],
    endedBy: 'RED_FLAG',
  },
  redFlags: ['CHEST_PAIN', 'STROKE_SIGNS'],
  patient: {
    ...patient,
    id: 'b0b0b0b0-0000-4000-8000-000000000011',
    fullName: 'Marta Ríos',
    documentNumber: '52111222',
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function openTray(items: PendingPreRegistration[]) {
  fakeApi({
    'GET /api/v1/public/tenants': json(200, publicTenants),
    'GET /api/v1/pre-registrations': json(200, items),
    'GET /api/v1/encounters': json(200, { items: [] }),
  });
  renderFeature(receptionRoutes, { entries: ['/recepcion'] });
}

describe('F-11-web señal de alarma en la bandeja de recepción', () => {
  it('R2: el prerregistro con señales muestra la insignia y la lista traducida dentro de su tarjeta', async () => {
    openTray([flagged, pendingPreRegistration]);
    const card = await screen.findByRole('article', { name: 'Marta Ríos' });
    expect(within(card).getByText(BADGE)).toBeVisible();
    const list = within(card).getByRole('list', { name: 'Señales referidas' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Dolor o presión en el pecho',
      'Debilidad de un lado del cuerpo, cara torcida o dificultad para hablar',
    ]);
  });

  it('R2: el prerregistro sin señales no muestra la insignia', async () => {
    openTray([flagged, pendingPreRegistration]);
    const card = await screen.findByRole('article', {
      name: patient.fullName!,
    });
    expect(within(card).queryByText(BADGE)).toBeNull();
    expect(screen.getAllByText(BADGE)).toHaveLength(1);
  });
});
