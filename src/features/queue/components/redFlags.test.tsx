import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Queue } from '../../../shared/api/client';
import { fakeApi, json, publicTenants } from '../../../test/fakeApi';
import { renderFeature } from '../../../test/renderFeature';
import { queueRoutes } from '../routes';
import {
  GET_QUEUE,
  queue,
  queueItem,
  triagedLevel1,
  waitingLong,
  waitingNN,
} from '../testing/queueFixtures';

const BADGE = 'Señal de alarma referida por el paciente';

/** En espera de triage, con señales referidas y menos espera (F-11-api la pone primero). */
const waitingRedFlag = queueItem({
  encounterId: 'f1100000-0000-4000-8000-000000000001',
  status: 'WAITING_TRIAGE',
  finalLevel: null,
  waitMinutes: 2,
  minutesSinceTriage: null,
  hasRedFlags: true,
  patient: { initials: 'PR', ageYears: 61, sex: 'M' },
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function openQueue(body: Queue) {
  fakeApi({
    'GET /api/v1/public/tenants': json(200, publicTenants),
    [GET_QUEUE]: json(200, body),
  });
  renderFeature(queueRoutes, { entries: ['/cola'], role: 'PHYSICIAN' });
}

const section = (name: string) => screen.getByRole('region', { name });
const rowOf = (encounterId: string) =>
  document.getElementById(`queue-patient-${encounterId}`)!.closest('tr')!;

describe('F-11-web señal de alarma en la cola', () => {
  it('R2: en «En espera de triage» la fila con hasRedFlags muestra la insignia en la celda del paciente', async () => {
    openQueue({
      ...queue,
      waitingTriage: [waitingRedFlag, waitingLong, waitingNN],
    });
    await screen.findAllByRole('link', { name: 'Ver atención' });
    const cell = document.getElementById(
      `queue-patient-${waitingRedFlag.encounterId}`,
    )!;
    expect(within(cell).getByText(BADGE)).toBeVisible();
    expect(
      within(section('En espera de triage')).getAllByText(BADGE),
    ).toHaveLength(1);
    expect(
      within(rowOf(waitingLong.encounterId)).queryByText(BADGE),
    ).toBeNull();
  });

  it('R2: la insignia solo va en «En espera de triage», no en «Clasificadas» ni en «En atención»', async () => {
    openQueue({
      ...queue,
      waitingTriage: [waitingLong],
      triaged: [{ ...triagedLevel1, hasRedFlags: true }],
    });
    await screen.findAllByRole('link', { name: 'Ver atención' });
    expect(screen.queryByText(BADGE)).toBeNull();
  });

  it('R5: la fila cita la insignia al describir «Ver atención» (alternativa textual en la fila)', async () => {
    openQueue({ ...queue, waitingTriage: [waitingRedFlag] });
    const link = await within(
      await screen.findByRole('region', { name: 'En espera de triage' }),
    ).findByRole('link', { name: 'Ver atención' });
    expect(link).toHaveAccessibleDescription(expect.stringContaining(BADGE));
  });
});

describe('F-11-web orden de «En espera de triage»', () => {
  const ids = () =>
    within(within(section('En espera de triage')).getByRole('table'))
      .getAllByRole('row')
      .slice(1)
      .map((row) =>
        within(row).getAllByRole('cell')[0].id.replace('queue-patient-', ''),
      );

  it('R3: con señales primero (orden del servidor), la fila con señales va primero aunque espere menos', async () => {
    const order = [waitingRedFlag, waitingLong, waitingNN];
    openQueue({ ...queue, waitingTriage: order });
    await screen.findAllByRole('link', { name: 'Ver atención' });
    expect(ids()).toEqual(order.map((item) => item.encounterId));
  });

  it('R3: la web no reordena: si el servidor envía la fila con señales al final, se respeta', async () => {
    const order = [waitingNN, waitingLong, waitingRedFlag];
    openQueue({ ...queue, waitingTriage: order });
    await screen.findAllByRole('link', { name: 'Ver atención' });
    expect(ids()).toEqual(order.map((item) => item.encounterId));
  });
});
