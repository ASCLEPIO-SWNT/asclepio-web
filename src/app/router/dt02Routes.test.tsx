import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session } from '../../shared/api/session';
import {
  GET_QUEUE,
  queueResponse,
  triagedLevel2Overdue,
} from '../../features/queue/testing/queueFixtures';
import { fakeApi, json, publicTenants, staffMe } from '../../test/fakeApi';
import { renderApp } from '../../test/testApp';

const ME = 'GET /api/v1/me';
const TENANTS = 'GET /api/v1/public/tenants';

const loaded = () => screen.findAllByRole('link', { name: 'Ver atención' });
const rowOf = (id: string) =>
  document.getElementById(`queue-patient-${id}`)!.closest('tr') as HTMLElement;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  session.clear();
});

describe('DT-02-web cola en la aplicación: idioma', () => {
  it('R14: al cambiar a inglés con la cola en pantalla, la fila II muestra traducidos el tiempo desde la clasificación, el máximo, la alerta y su texto accesible', async () => {
    fakeApi({
      [ME]: json(200, staffMe.PHYSICIAN),
      [TENANTS]: json(200, publicTenants),
      [GET_QUEUE]: queueResponse(),
    });
    const user = userEvent.setup({ delay: null });
    renderApp({ entries: ['/cola'], stored: true });
    await loaded();
    const before = rowOf(triagedLevel2Overdue.encounterId);
    expect(before).toHaveTextContent('Clasificada hace 30 min');

    await user.selectOptions(screen.getAllByLabelText('Idioma')[0], 'en');
    await screen.findByRole('heading', { level: 2, name: 'Triaged' });
    const row = rowOf(triagedLevel2Overdue.encounterId);
    const wait = row.querySelector<HTMLElement>('.queue-wait')!;
    expect(wait.querySelector('.queue-wait__minutes')).toHaveTextContent(
      /^31 min$/,
    );
    expect(wait.querySelector('.queue-wait__since')).toHaveTextContent(
      /^Triaged 30 min ago$/,
    );
    expect(wait.querySelector('.queue-wait__max')).toHaveTextContent(
      /^Max\. 30 min from triage$/,
    );
    const badge = wait.querySelector<HTMLElement>('.badge.tone--error')!;
    expect(within(badge).getByText('Maximum time exceeded')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(badge.querySelector('.visually-hidden')!.textContent).toBe(
      'Maximum time exceeded since triage',
    );
    expect(row).not.toHaveTextContent(/Clasificada|clasificación/);
  });
});
