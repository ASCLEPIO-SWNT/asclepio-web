import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { QueueItem, StaffRole } from '../../../shared/api/client';
import { formatTimeBogota } from '../../../shared/lib/datetime';
import {
  fakeApi,
  json,
  publicTenants,
  sequence,
  type Handler,
} from '../../../test/fakeApi';
import { renderFeature } from '../../../test/renderFeature';
import { norm } from '../../../test/text';
import { queueRoutes } from '../routes';
import {
  GET_QUEUE,
  LATER_SERVER_NOW,
  inCareNorte,
  inCareSur,
  queue,
  queueBySite,
  queueWith,
  queueWithoutClock,
  triageClockQueue,
  triagedLevel1,
  triagedLevel2,
  triagedLevel2EarlyTriage,
  triagedLevel2LateArrival,
  triagedLevel2Overdue,
  triagedLevel4,
  triagedWithoutClock,
  unorderedQueue,
  waitingLong,
  waitingNN,
} from '../testing/queueFixtures';

/**
 * DT-02-web: la celda «Espera» de «Clasificadas» con el tiempo desde la clasificación, el máximo
 * contado desde la clasificación y la alerta con su texto accesible. Todo sale de la API (RNF-10).
 */

const TENANTS = 'GET /api/v1/public/tenants';

function setup({
  role = 'PHYSICIAN',
  routes = {},
}: { role?: StaffRole; routes?: Record<string, Handler> } = {}) {
  const net = fakeApi({
    [TENANTS]: json(200, publicTenants),
    [GET_QUEUE]: queueBySite(),
    ...routes,
  });
  const view = renderFeature(queueRoutes, { entries: ['/cola'], role });
  return { net, ...view };
}

const loaded = () => screen.findAllByRole('link', { name: 'Ver atención' });
/** Las filas de datos de «Clasificadas», en el orden del DOM. */
const triagedRows = () =>
  within(
    within(screen.getByRole('region', { name: 'Clasificadas' })).getByRole(
      'table',
    ),
  )
    .getAllByRole('row')
    .slice(1);
const rowOf = (item: QueueItem) =>
  document
    .getElementById(`queue-patient-${item.encounterId}`)!
    .closest('tr') as HTMLElement;
/** La celda «Espera» de una fila (`.queue-wait`), o null si la sección no la tiene. */
const waitOf = (item: QueueItem) =>
  rowOf(item).querySelector<HTMLElement>('.queue-wait');
const badgeOf = (item: QueueItem) =>
  rowOf(item).querySelector<HTMLElement>('.badge.tone--error');

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('DT-02-web cola: tiempo desde la clasificación en la celda «Espera»', () => {
  it('R3: la fila II vencida muestra, en orden, «31 min», «Clasificada hace 30 min», el máximo y la alerta', async () => {
    setup();
    await loaded();
    const cell = waitOf(triagedLevel2Overdue)!;
    expect([...cell.children].map((child) => child.className)).toEqual([
      'queue-wait__minutes',
      'queue-wait__since',
      'queue-wait__max',
      'badge tone--error',
    ]);
    expect(
      [...cell.children].slice(0, 3).map((child) => child.textContent),
    ).toEqual([
      '31 min',
      'Clasificada hace 30 min',
      'Máx. 30 min desde la clasificación',
    ]);
    // La columna sigue llamándose «Espera».
    expect(cell.closest('td')).toHaveAttribute('data-label', 'Espera');
  });

  it('R5: «Máx. 30 min desde la clasificación» en las filas II, «Atención inmediata» en la I y nada en la IV', async () => {
    setup();
    await loaded();
    for (const item of [triagedLevel2Overdue, triagedLevel2])
      expect(waitOf(item)!.querySelector('.queue-wait__max')).toHaveTextContent(
        /^Máx\. 30 min desde la clasificación$/,
      );
    expect(
      waitOf(triagedLevel1)!.querySelector('.queue-wait__max'),
    ).toHaveTextContent(/^Atención inmediata$/);
    expect(waitOf(triagedLevel4)!.querySelector('.queue-wait__max')).toBeNull();
    expect(waitOf(triagedLevel4)).toHaveTextContent('Clasificada hace 40 min');
  });

  it('R4: «En espera de triage» y «En atención» no muestran el tiempo desde la clasificación', async () => {
    setup();
    await loaded();
    for (const item of [waitingLong, waitingNN, inCareNorte, inCareSur]) {
      expect(rowOf(item)).not.toHaveTextContent(/Clasificada hace/);
      expect(rowOf(item).querySelector('.queue-wait__since')).toBeNull();
    }
  });

  it('R4: aunque el campo llegue con valor fuera de «Clasificadas», no se muestra', async () => {
    const waiting = { ...waitingLong, minutesSinceTriage: 7 };
    const inCare = { ...inCareNorte, minutesSinceTriage: 9 };
    setup({
      routes: {
        [GET_QUEUE]: json(200, {
          ...queue,
          waitingTriage: [waiting],
          inCare: [inCare],
        }),
      },
    });
    await loaded();
    expect(rowOf(waiting)).not.toHaveTextContent(/Clasificada hace/);
    expect(rowOf(inCare)).not.toHaveTextContent(/Clasificada hace/);
  });
});

describe('DT-02-web cola: alertas que la web no corrige', () => {
  it('R8: nivel I con «Clasificada hace 0 min», «Atención inmediata» y la alerta', async () => {
    setup();
    await loaded();
    const cell = waitOf(triagedLevel1)!;
    expect(cell.querySelector('.queue-wait__since')).toHaveTextContent(
      /^Clasificada hace 0 min$/,
    );
    expect(cell).toHaveTextContent('Atención inmediata');
    expect(badgeOf(triagedLevel1)).not.toBeNull();
  });

  it('R8: nivel II con «Clasificada hace 30 min», máximo 30 y la alerta', async () => {
    setup();
    await loaded();
    const cell = waitOf(triagedLevel2Overdue)!;
    expect(cell.querySelector('.queue-wait__since')).toHaveTextContent(
      /^Clasificada hace 30 min$/,
    );
    expect(cell).toHaveTextContent('Máx. 30 min desde la clasificación');
    expect(badgeOf(triagedLevel2Overdue)).not.toBeNull();
  });

  it('R10: la fila sin reloj de clasificación se muestra en su posición, con sus datos y su botón, sin texto sustituto, sin alerta ni error', async () => {
    setup({ routes: { [GET_QUEUE]: json(200, queueWithoutClock) } });
    await loaded();
    const rows = within(
      within(screen.getByRole('region', { name: 'Clasificadas' })).getByRole(
        'table',
      ),
    )
      .getAllByRole('row')
      .slice(1);
    expect(rows).toHaveLength(queueWithoutClock.triaged.length);
    const row = rowOf(triagedWithoutClock);
    expect(rows.at(-1)).toBe(row);
    const [patient, level, arrival, wait, site, action] =
      within(row).getAllByRole('cell');
    expect(patient).toHaveTextContent('KU · 47 años · Femenino');
    expect(level.querySelector('.badge')).toBeNull();
    expect(norm(arrival.querySelector('time')!.textContent)).toBe(
      norm(formatTimeBogota(triagedWithoutClock.arrivalAt)),
    );
    expect(wait).toHaveTextContent(/^20 min$/);
    expect(wait).not.toHaveTextContent(/Clasificada hace|—/);
    expect(wait.querySelector('.queue-wait__since')).toBeNull();
    expect(wait.querySelector('.queue-wait__max')).toBeNull();
    expect(wait.querySelector('.badge')).toBeNull();
    expect(site).toHaveTextContent('Sede Norte');
    expect(
      within(action).getByRole('link', { name: 'Ver atención' }),
    ).toBeInTheDocument();
    expect(
      within(action).getByRole('button', { name: 'Iniciar atención' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    // Las demás filas siguen intactas.
    expect(waitOf(triagedLevel2Overdue)).toHaveTextContent(
      'Clasificada hace 30 min',
    );
    expect(badgeOf(triagedLevel1)).not.toBeNull();
    expect(rowOf(waitingLong)).toHaveTextContent('18 min');
    expect(rowOf(inCareSur)).toBeInTheDocument();
  });
});

describe('DT-02-web cola: alerta accesible', () => {
  it('R11: la insignia tiene icono aria-hidden, tono de error, el texto visible aria-hidden y un texto accesible «desde la clasificación»; la fila no se colorea', async () => {
    setup();
    await loaded();
    for (const item of [triagedLevel1, triagedLevel2Overdue]) {
      const badge = badgeOf(item)!;
      expect(badge).toHaveClass('badge', 'tone--error');
      expect(badge.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      const visible = within(badge).getByText('Tiempo máximo superado');
      expect(visible.tagName).toBe('SPAN');
      expect(visible).toHaveAttribute('aria-hidden', 'true');
      const hidden = badge.querySelector('.visually-hidden')!;
      expect(hidden.textContent).toBe(
        'Tiempo máximo superado desde la clasificación',
      );
      expect(hidden).not.toHaveAttribute('aria-hidden');
      expect(rowOf(item).className).not.toMatch(/tone--/);
    }
  });
});

describe('DT-02-web cola: el servidor decide orden, minutos y alerta', () => {
  it('R7: con triageClockQueue, «Clasificadas» sigue el orden recibido: la que llegó hace 50 min va antes que la de 90', async () => {
    setup({ routes: { [GET_QUEUE]: json(200, triageClockQueue) } });
    await loaded();
    expect(triagedRows()).toEqual(
      [triagedLevel1, triagedLevel2EarlyTriage, triagedLevel2LateArrival].map(
        rowOf,
      ),
    );
    expect(waitOf(triagedLevel2EarlyTriage)).toHaveTextContent(
      'Clasificada hace 45 min',
    );
    expect(waitOf(triagedLevel2LateArrival)).toHaveTextContent(
      'Clasificada hace 10 min',
    );
  });

  it('R7: la sección de control desordenada se muestra tal cual, sin ordenar por nivel ni por minutos desde la clasificación', async () => {
    setup({ routes: { [GET_QUEUE]: json(200, unorderedQueue) } });
    await loaded();
    expect(triagedRows()).toEqual(unorderedQueue.triaged.map(rowOf));
  });

  it('R6: sin una respuesta nueva, 29 s no cambian «Clasificada hace 30 min», la espera ni la alerta; el refresco con 31 lo cambia', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const later = { ...triagedLevel2Overdue, minutesSinceTriage: 31 };
    const { net } = setup({
      routes: {
        [GET_QUEUE]: sequence(
          json(200, queue),
          json(
            200,
            queueWith({
              serverNow: LATER_SERVER_NOW,
              triaged: queue.triaged.map((item) =>
                item === triagedLevel2Overdue ? later : item,
              ),
            }),
          ),
        ),
      },
    });
    await loaded();
    const before = waitOf(triagedLevel2Overdue)!.textContent;
    expect(before).toContain('Clasificada hace 30 min');

    await act(() => vi.advanceTimersByTimeAsync(29_000));
    expect(net.calls(GET_QUEUE)).toHaveLength(1);
    expect(waitOf(triagedLevel2Overdue)!.textContent).toBe(before);
    expect(waitOf(triagedLevel2Overdue)).toHaveTextContent('31 min');
    expect(badgeOf(triagedLevel2Overdue)).not.toBeNull();

    await act(() => vi.advanceTimersByTimeAsync(1_000));
    await waitFor(() =>
      expect(waitOf(triagedLevel2Overdue)).toHaveTextContent(
        'Clasificada hace 31 min',
      ),
    );
    // Solo la petición del intervalo: ningún GET /queue extra.
    expect(net.calls(GET_QUEUE)).toHaveLength(2);
  });

  it('R9: con overdue false no hay alerta, aunque la espera o el tiempo desde la clasificación superen el máximo', async () => {
    const odd = {
      ...triagedLevel2,
      minutesSinceTriage: 45,
      maxWaitMinutes: 30,
      overdue: false,
    };
    setup({
      routes: {
        [GET_QUEUE]: json(
          200,
          queueWith({ triaged: [triagedLevel2LateArrival, odd] }),
        ),
      },
    });
    await loaded();
    expect(waitOf(triagedLevel2LateArrival)).toHaveTextContent('90 min');
    expect(waitOf(triagedLevel2LateArrival)).toHaveTextContent(
      'Clasificada hace 10 min',
    );
    expect(badgeOf(triagedLevel2LateArrival)).toBeNull();
    expect(waitOf(odd)).toHaveTextContent('Clasificada hace 45 min');
    expect(waitOf(odd)).toHaveTextContent('Máx. 30 min desde la clasificación');
    expect(badgeOf(odd)).toBeNull();
    expect(screen.queryByText('Tiempo máximo superado')).toBeNull();
  });
});
