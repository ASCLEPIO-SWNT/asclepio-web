import { focusManager, onlineManager } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { QueueItem, StaffRole } from '../../../shared/api/client';
import {
  formatDateBogota,
  formatTimeBogota,
} from '../../../shared/lib/datetime';
import {
  deferred,
  fakeApi,
  json,
  SITE_NORTE,
  SITE_SUR,
  networkError,
  problem,
  publicTenants,
  sequence,
  type Handler,
} from '../../../test/fakeApi';
import { renderFeature } from '../../../test/renderFeature';
import { watchScrolling } from '../../../test/scroll';
import { norm } from '../../../test/text';
import { queueRoutes } from '../routes';
import {
  CLOSE,
  GET_QUEUE,
  LATER_SERVER_NOW,
  START_CARE,
  closeOk,
  startCareOk,
  emptyQueue,
  inCareNorte,
  inCareSur,
  queue,
  queueBySite,
  queueWith,
  surQueue,
  triagedLevel1,
  triagedLevel2,
  triagedLevel2Overdue,
  triagedLevel4,
  unorderedQueue,
  waitingLong,
  waitingNN,
} from '../testing/queueFixtures';

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
  const user = userEvent.setup();
  const view = renderFeature(queueRoutes, { entries: ['/cola'], role });
  return { net, user, ...view };
}

const bar = () => screen.getByRole('region', { name: 'Indicadores' });
const cells = () => within(bar()).getAllByRole('listitem');
const SECTION_NAMES = [
  'En espera de triage',
  'Clasificadas',
  'En atención',
] as const;
const section = (name: (typeof SECTION_NAMES)[number]) =>
  screen.getByRole('region', { name });
/** Las filas de datos de la tabla de una sección (sin la de encabezados). */
const rowsOf = (name: (typeof SECTION_NAMES)[number]) =>
  within(within(section(name)).getByRole('table'))
    .getAllByRole('row')
    .slice(1);
/** Espera a que la cola pinte sus filas. */
const loaded = () => screen.findAllByRole('link', { name: 'Ver atención' });
/** `b` aparece después de `a` en el documento. */
const follows = (a: Node, b: Node) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
const rowOf = (item: QueueItem) =>
  document
    .getElementById(`queue-patient-${item.encounterId}`)!
    .closest('tr') as HTMLElement;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
});

describe('F-06-web cola priorizada: estructura', () => {
  it.each(['PHYSICIAN', 'NURSE', 'ADMIN'] as const)(
    'R1: %s ve el h1 con su descripción, «Actualizar» como única acción del encabezado, los indicadores con el filtro y las tres secciones en orden, sin recientes ni franja «pendiente»',
    async (role) => {
      const { container } = setup({ role });
      await loaded();
      const title = screen.getByRole('heading', {
        level: 1,
        name: 'Cola priorizada',
      });
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(title.nextElementSibling).toHaveTextContent(
        'Atenciones activas por nivel de triage y tiempo de espera.',
      );
      const header = document.querySelector(
        'header.page-header',
      ) as HTMLElement;
      expect(
        within(header).getByRole('button', { name: 'Actualizar' }),
      ).toHaveClass('button', 'button--secondary');
      expect(header.querySelectorAll('button, a')).toHaveLength(1);

      const region = bar();
      expect(cells()).toHaveLength(3);
      expect(cells().map((cell) => cell.textContent)).toEqual([
        expect.stringContaining('En espera de triage'),
        expect.stringContaining('Clasificadas'),
        expect.stringContaining('En atención'),
      ]);
      expect(region.style.getPropertyValue('--cells')).toBe('3');
      expect(region).toHaveClass('summary--filter');
      expect(within(region).getByLabelText('Sede')).toBeInstanceOf(
        HTMLSelectElement,
      );

      const sections = SECTION_NAMES.map(section);
      for (const [i, name] of SECTION_NAMES.entries())
        expect(
          within(sections[i]).getByRole('heading', { level: 2, name }),
        ).toBeInTheDocument();
      expect(follows(title, region)).toBe(true);
      expect(follows(region, sections[0])).toBe(true);
      expect(follows(sections[0], sections[1])).toBe(true);
      expect(follows(sections[1], sections[2])).toBe(true);

      expect(
        screen.queryByRole('region', { name: 'Atenciones recientes' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('region', { name: 'Cola por nivel y espera' }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText('Próximamente')).not.toBeInTheDocument();
      expect(container.querySelector('.pending-strip')).toBeNull();
      // Ningún indicador de atenciones vencidas en la barra (PA-12 a).
      expect(region).not.toHaveTextContent('Tiempo máximo superado');
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    },
  );
});

describe('F-06-web cola priorizada: lectura', () => {
  it('R2: un solo GET /queue sin parámetros, las cifras son las filas de cada sección y no se pide GET /encounters', async () => {
    const { net } = setup();
    await loaded();
    await waitFor(() =>
      expect(cells().map((cell) => cell.textContent)).toEqual([
        'En espera de triage2',
        'Clasificadas4',
        'En atención2',
      ]),
    );
    expect(net.calls(GET_QUEUE)).toHaveLength(1);
    expect([...net.calls(GET_QUEUE)[0].query]).toEqual([]);
    expect(net.calls('GET /api/v1/encounters')).toHaveLength(0);
    const endpoints = [
      ...new Set(net.requests.map((r) => `${r.method} ${r.path}`)),
    ].sort();
    expect(endpoints).toEqual([TENANTS, GET_QUEUE].sort());
  });

  it('R3: las filas salen en el orden recibido, sin reordenar la sección de control, y cada atención en su sección', async () => {
    setup({ routes: { [GET_QUEUE]: json(200, unorderedQueue) } });
    await loaded();
    const ids = (name: (typeof SECTION_NAMES)[number]) =>
      rowsOf(name).map((row) =>
        within(row).getAllByRole('cell')[0].id.replace('queue-patient-', ''),
      );
    expect(ids('En espera de triage')).toEqual(
      unorderedQueue.waitingTriage.map((item) => item.encounterId),
    );
    expect(ids('Clasificadas')).toEqual(
      unorderedQueue.triaged.map((item) => item.encounterId),
    );
    expect(ids('En atención')).toEqual(
      unorderedQueue.inCare.map((item) => item.encounterId),
    );
    // Las atenciones en espera de triage solo están en su sección.
    for (const item of unorderedQueue.waitingTriage) {
      expect(section('En espera de triage')).toContainElement(rowOf(item));
      expect(section('Clasificadas')).not.toContainElement(rowOf(item));
      expect(section('En atención')).not.toContainElement(rowOf(item));
    }
  });

  it('R4: cada sección tiene sus columnas', async () => {
    setup();
    await loaded();
    const headers = (name: (typeof SECTION_NAMES)[number]) =>
      within(within(section(name)).getByRole('table'))
        .getAllByRole('columnheader')
        .map((header) => header.textContent);
    expect(headers('En espera de triage')).toEqual([
      'Paciente',
      'Llegada',
      'Espera',
      'Sede',
      'Acción',
    ]);
    expect(headers('Clasificadas')).toEqual([
      'Paciente',
      'Nivel',
      'Llegada',
      'Espera',
      'Sede',
      'Acción',
    ]);
    expect(headers('En atención')).toEqual([
      'Paciente',
      'Nivel',
      'Llegada',
      'Sede',
      'Acción',
    ]);
  });

  it('R4: cada fila muestra iniciales, edad y sexo, nivel en romano en una insignia neutra, llegada en Bogotá, espera, sede y «Ver atención» asociado a su fila', async () => {
    setup();
    await loaded();
    const row = rowOf(triagedLevel2Overdue);
    const [patientCell, level, arrival, wait, site, action] =
      within(row).getAllByRole('cell');
    expect(patientCell).toHaveTextContent('JP · 58 años · Masculino');
    const badge = within(level).getByText('Nivel II');
    expect(badge).toHaveClass('badge', 'tone--neutral');
    const time = arrival.querySelector('time')!;
    expect(time).toHaveAttribute('dateTime', triagedLevel2Overdue.arrivalAt);
    expect(norm(time.textContent)).toBe(
      norm(formatTimeBogota(triagedLevel2Overdue.arrivalAt)),
    );
    expect(arrival).toHaveTextContent(
      formatDateBogota(triagedLevel2Overdue.arrivalAt),
    );
    expect(wait).toHaveTextContent('31 min');
    expect(site).toHaveTextContent('Sede Sur');
    const link = within(action).getByRole('link', { name: 'Ver atención' });
    expect(link).toHaveAttribute(
      'href',
      `/atenciones/${triagedLevel2Overdue.encounterId}`,
    );
    expect(link).toHaveClass('button', 'button--secondary', 'button--sm');
    expect(patientCell.id).toBe(
      `queue-patient-${triagedLevel2Overdue.encounterId}`,
    );
    expect(link).toHaveAttribute('aria-describedby', patientCell.id);
  });

  it('R4: en espera sin nivel y con «Paciente NN», y en atención sin espera', async () => {
    setup();
    await loaded();
    const nn = within(rowOf(waitingNN)).getAllByRole('cell');
    expect(nn[0]).toHaveTextContent('Paciente NN · — · —');
    expect(nn[2]).toHaveTextContent('3 min');
    expect(rowOf(waitingNN).textContent).not.toMatch(/Nivel/);
    const care = within(rowOf(inCareSur)).getAllByRole('cell');
    expect(care[0]).toHaveTextContent('EB · 63 años · Femenino');
    expect(within(care[1]).getByText('Nivel III')).toHaveClass('tone--neutral');
    expect(rowOf(inCareSur).textContent).not.toMatch(/\bmin\b/);
  });

  it('R6: sin nombre, documento, fecha de nacimiento ni motivo, y sin pedir detalle, pacientes ni preregistros', async () => {
    const { net } = setup();
    await loaded();
    const text = document.body.textContent;
    expect(text).not.toMatch(
      /Documento|Cédula|Fecha de nacimiento|Motivo|Laura|Gómez|1032456789|17\/05\/1990|Dolor de cabeza/,
    );
    expect(
      net.requests.filter((request) =>
        /\/encounters\/|\/patients|\/pre-registrations/.test(request.path),
      ),
    ).toEqual([]);
  });

  it('R7: cada sección vacía muestra su mensaje sin tabla ni acciones y las otras siguen con filas', async () => {
    setup({
      routes: {
        [GET_QUEUE]: json(200, queueWith({ waitingTriage: [], inCare: [] })),
      },
    });
    await loaded();
    for (const [name, message] of [
      ['En espera de triage', 'No hay atenciones en espera de triage.'],
      ['En atención', 'No hay atenciones en curso.'],
    ] as const) {
      const region = section(name);
      expect(within(region).getByText(message)).toBeInTheDocument();
      expect(within(region).queryByRole('table')).not.toBeInTheDocument();
      expect(within(region).queryByRole('button')).not.toBeInTheDocument();
      expect(within(region).queryByRole('link')).not.toBeInTheDocument();
    }
    expect(rowsOf('Clasificadas')).toHaveLength(4);
  });

  it('R7: con la cola vacía, las tres secciones dicen su vacío y las cifras son 0', async () => {
    setup({ routes: { [GET_QUEUE]: json(200, emptyQueue) } });
    await screen.findByText('No hay atenciones clasificadas.');
    expect(
      screen.getByText('No hay atenciones en espera de triage.'),
    ).toBeInTheDocument();
    expect(screen.getByText('No hay atenciones en curso.')).toBeInTheDocument();
    expect(cells().map((cell) => cell.textContent)).toEqual([
      'En espera de triage0',
      'Clasificadas0',
      'En atención0',
    ]);
  });

  it('R8: la carga inicial es un único role="status" con «Cargando la cola…» y los tres indicadores ocupados, sin filas', async () => {
    const pending = deferred(json(200, queue));
    setup({ routes: { [GET_QUEUE]: pending.handler } });
    const status = await screen.findByRole('status');
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(status).toHaveTextContent('Cargando la cola…');
    for (const cell of cells())
      expect(cell).toHaveAttribute('aria-busy', 'true');
    expect(
      screen.queryByRole('link', { name: 'Ver atención' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    act(() => pending.release());
    await loaded();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    for (const cell of cells()) expect(cell).not.toHaveAttribute('aria-busy');
  });

  it('R29: solo el nivel final: sin sugerencia, IA, nivel sugerido ni datos de la decisión', async () => {
    setup();
    await loaded();
    const text = document.body.textContent;
    expect(text).not.toMatch(
      /sugerencia|sugerido|inteligencia artificial|\bIA\b|validad|corregid|Triage manual|Registrado por|motivo/i,
    );
    // Los niveles que se ven son los finales de las filas clasificadas y en atención.
    const levels = [...document.querySelectorAll('.badge.tone--neutral')].map(
      (badge) => badge.textContent,
    );
    expect(levels).toEqual(
      [
        triagedLevel1,
        triagedLevel2Overdue,
        triagedLevel2,
        triagedLevel4,
        inCareNorte,
        inCareSur,
      ].map(
        (item) =>
          `Nivel ${['I', 'II', 'III', 'IV', 'V'][item.finalLevel! - 1]}`,
      ),
    );
    expect(waitingLong.finalLevel).toBeNull();
  });
});

describe('F-06-web cola priorizada: tiempo máximo y alerta', () => {
  const overdueBadge = (row: HTMLElement) =>
    within(row).queryByText('Tiempo máximo superado');

  it('R9: las filas I y II vencidas llevan «Tiempo máximo superado» con icono y tono de error; la II sin vencer y la IV no', async () => {
    setup();
    await loaded();
    for (const item of [triagedLevel1, triagedLevel2Overdue]) {
      const badge = overdueBadge(rowOf(item))!;
      expect(badge).toHaveClass('badge', 'tone--error');
      expect(badge.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      // El estado no depende solo del color: el texto está en la celda de espera.
      expect(badge.closest('.queue-wait')).not.toBeNull();
      expect(badge.textContent).toBe('Tiempo máximo superado');
    }
    for (const item of [
      triagedLevel2,
      triagedLevel4,
      waitingLong,
      waitingNN,
      inCareNorte,
      inCareSur,
    ])
      expect(overdueBadge(rowOf(item))).toBeNull();
    // La fila no se colorea entera.
    expect(rowOf(triagedLevel1).className).not.toMatch(/tone--/);
  });

  it('R10: «Atención inmediata» en la fila I y «Máx. 30 min» en las II, y nada en la IV, en espera ni en atención', async () => {
    setup();
    await loaded();
    expect(rowOf(triagedLevel1)).toHaveTextContent('Atención inmediata');
    expect(rowOf(triagedLevel2Overdue)).toHaveTextContent('Máx. 30 min');
    expect(rowOf(triagedLevel2)).toHaveTextContent('Máx. 30 min');
    for (const item of [
      triagedLevel4,
      waitingLong,
      waitingNN,
      inCareNorte,
      inCareSur,
    ]) {
      expect(rowOf(item).textContent).not.toMatch(/Máx\.|Atención inmediata/);
    }
  });

  it('R5: la hora de la cola es la del servidor en Bogotá y nada cambia con el reloj sin una respuesta nueva', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { net } = setup();
    await loaded();
    const stamp = screen.getByText(/^Datos del servidor de las /);
    expect(stamp.tagName).toBe('TIME');
    expect(stamp).toHaveAttribute('dateTime', queue.serverNow);
    // 15:42 UTC = 10:42 a. m. en Bogotá.
    expect(norm(stamp.textContent)).toBe(
      norm(`Datos del servidor de las ${formatTimeBogota(queue.serverNow)}`),
    );
    expect(stamp.textContent).toMatch(/10:42\sa\.\sm\./);
    expect(stamp.closest('[aria-live]')).toBeNull();
    expect(section('En espera de triage')).toContainElement(stamp);
    const before = document.querySelector('main, .dashboard')!.textContent;

    await act(() => vi.advanceTimersByTimeAsync(29_000));
    expect(net.calls(GET_QUEUE)).toHaveLength(1);
    expect(document.querySelector('main, .dashboard')!.textContent).toBe(
      before,
    );
    expect(rowOf(triagedLevel2Overdue)).toHaveTextContent('31 min');
  });

  it('R5: la alerta sale solo de overdue: con overdue false y más espera que el máximo no hay alerta', async () => {
    const late = { ...triagedLevel2, waitMinutes: 45, overdue: false };
    setup({
      routes: {
        [GET_QUEUE]: json(200, queueWith({ triaged: [late] })),
      },
    });
    await loaded();
    expect(rowOf(late)).toHaveTextContent('45 min');
    expect(overdueBadge(rowOf(late))).toBeNull();
  });
});

describe('F-06-web cola priorizada: refresco', () => {
  it('R11: cada 30 s con la pestaña visible repite GET /queue con el mismo filtro, y «Actualizar» lo repite al instante; la nota «Se actualiza cada 30 s» va junto a las secciones', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { net } = setup();
    await loaded();
    const note = within(section('En espera de triage')).getByText(
      'Se actualiza cada 30 s',
    );
    expect(note.closest('[aria-live]')).toBeNull();
    expect(net.calls(GET_QUEUE)).toHaveLength(1);
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await waitFor(() => expect(net.calls(GET_QUEUE)).toHaveLength(2));
    expect([...net.calls(GET_QUEUE)[1].query]).toEqual([]);
    await act(async () => {
      screen.getByRole('button', { name: 'Actualizar' }).click();
      await vi.advanceTimersByTimeAsync(0);
    });
    await waitFor(() => expect(net.calls(GET_QUEUE)).toHaveLength(3));
  });

  it('R11: ni el foco de la ventana ni la reconexión repiten la petición', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { net } = setup();
    await loaded();
    await act(async () => {
      focusManager.setFocused(false);
      onlineManager.setOnline(false);
      focusManager.setFocused(true);
      onlineManager.setOnline(true);
      await vi.advanceTimersByTimeAsync(20);
    });
    expect(net.calls(GET_QUEUE)).toHaveLength(1);
  });

  it('R11: con la pestaña oculta no se repite la petición', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { net } = setup();
    await loaded();
    const visibility = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('hidden');
    await act(() => vi.advanceTimersByTimeAsync(90_000));
    expect(net.calls(GET_QUEUE)).toHaveLength(1);
    visibility.mockRestore();
  });

  it('R12: durante un refresco se conservan filas y cifras sin estado de carga, y «Actualizar» lleva aria-busy sin deshabilitarse', async () => {
    const next = deferred(
      json(200, queueWith({ serverNow: LATER_SERVER_NOW })),
    );
    const { user } = setup({
      routes: { [GET_QUEUE]: sequence(json(200, queue), next.handler) },
    });
    const links = await loaded();
    const button = screen.getByRole('button', { name: 'Actualizar' });
    expect(button).not.toHaveAttribute('aria-busy');
    await user.click(button);
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'));
    expect(button).toBeEnabled();
    expect(button).toHaveFocus();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Ver atención' })).toEqual(
      links,
    );
    expect(cells()[1]).toHaveTextContent('Clasificadas4');
    expect(cells()[1]).not.toHaveAttribute('aria-busy');
    act(() => next.release());
    await waitFor(() => expect(button).not.toHaveAttribute('aria-busy'));
    expect(screen.getByText(/^Datos del servidor de las /)).toHaveAttribute(
      'dateTime',
      LATER_SERVER_NOW,
    );
  });

  it('R12: un refresco con una fila nueva conserva el enlace enfocado y la posición, sin desplazamiento programático', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const scrolling = watchScrolling();
    const { net } = setup();
    const links = await loaded();
    const focused = within(rowOf(triagedLevel2)).getByRole('link');
    act(() => focused.focus());
    const arrival = {
      ...triagedLevel1,
      encounterId: 'f0600000-0000-4000-8000-0000000000aa',
      patient: { initials: 'NV', ageYears: 40, sex: 'M' as const },
    };
    net.set(
      GET_QUEUE,
      json(
        200,
        queueWith({
          triaged: [arrival, ...queue.triaged],
        }),
      ),
    );
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await waitFor(() => expect(rowOf(arrival)).toBeTruthy());
    expect(screen.getAllByRole('link', { name: 'Ver atención' })).toHaveLength(
      links.length + 1,
    );
    expect(focused).toHaveFocus();
    expect(focused.isConnected).toBe(true);
    expect(cells()[1]).toHaveTextContent('Clasificadas5');
    expect(scrolling.calls()).toBe(0);
    scrolling.restore();
  });

  it.each([
    ['red caída', networkError()],
    ['500', problem(500)],
  ])(
    'R13: un refresco fallido (%s) conserva los datos con el aviso y «Reintentar», y el siguiente ciclo vuelve a pedir y lo quita',
    async (_label, failure) => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net, user } = setup();
      await loaded();
      net.set(GET_QUEUE, failure);
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      const warning = await screen.findByText(
        /^No se pudo actualizar la cola\./,
      );
      expect(norm(warning.textContent)).toBe(
        norm(
          `No se pudo actualizar la cola. Se muestran los datos de las ${formatTimeBogota(queue.serverNow)}.`,
        ),
      );
      const notice = warning.closest('.status') as HTMLElement;
      expect(notice).toHaveClass('status--warn');
      expect(rowsOf('Clasificadas')).toHaveLength(4);
      expect(cells()[1]).toHaveTextContent('Clasificadas4');
      expect(net.calls(GET_QUEUE)).toHaveLength(2);

      // «Reintentar» pide solo al pulsarlo.
      await act(() => vi.advanceTimersByTimeAsync(1_000));
      expect(net.calls(GET_QUEUE)).toHaveLength(2);
      await user.click(
        within(notice).getByRole('button', { name: 'Reintentar' }),
      );
      await waitFor(() => expect(net.calls(GET_QUEUE)).toHaveLength(3));

      net.set(GET_QUEUE, json(200, queue));
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() => expect(net.calls(GET_QUEUE)).toHaveLength(4));
      await waitFor(() =>
        expect(
          screen.queryByText(/^No se pudo actualizar la cola\./),
        ).not.toBeInTheDocument(),
      );
    },
  );

  it.each([
    ['red caída', networkError(), 'No hay conexión con el servidor.'],
    ['500', problem(500), 'El servidor tuvo un problema. Inténtalo de nuevo.'],
  ])(
    'R13: si falla la carga inicial (%s) se muestra el error traducido con «Reintentar», sin secciones',
    async (_label, failure, text) => {
      const { net, user } = setup({ routes: { [GET_QUEUE]: failure } });
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(text);
      for (const name of SECTION_NAMES)
        expect(screen.queryByRole('region', { name })).not.toBeInTheDocument();
      net.set(GET_QUEUE, json(200, queue));
      await user.click(
        within(alert).getByRole('button', { name: 'Reintentar' }),
      );
      await loaded();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    },
  );

  it('R14: un 403 muestra «No tienes permiso para ver esta página.» sin «Reintentar» ni filas y detiene el intervalo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { net } = setup({ routes: { [GET_QUEUE]: problem(403) } });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No tienes permiso para ver esta página.');
    expect(within(alert).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(90_000));
    expect(net.calls(GET_QUEUE)).toHaveLength(1);
  });

  it('R14: un 403 en un refresco quita las filas y deja la vista «Sin permiso»', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { net } = setup();
    await loaded();
    net.set(GET_QUEUE, problem(403));
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await screen.findByText('No tienes permiso para ver esta página.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(net.calls(GET_QUEUE)).toHaveLength(2);
  });
});

describe('F-06-web cola priorizada: filtro de sede', () => {
  it('R15: «Todas las sedes» por defecto; elegir una sede pide GET /queue?siteId=… y, mientras carga, no se ven filas ni cifras de la opción anterior', async () => {
    const { net, user, router } = setup();
    await loaded();
    const select = screen.getByLabelText<HTMLSelectElement>('Sede');
    await waitFor(() => expect(select).toBeEnabled());
    expect(select.selectedOptions[0]).toHaveTextContent('Todas las sedes');
    expect([...select.options].map((option) => option.textContent)).toEqual([
      'Todas las sedes',
      SITE_NORTE.name,
      SITE_SUR.name,
    ]);

    const pending = deferred(queueBySite());
    net.set(GET_QUEUE, pending.handler);
    await user.selectOptions(select, SITE_SUR.id);
    await waitFor(() => expect(net.calls(GET_QUEUE)).toHaveLength(2));
    expect(Object.fromEntries(net.calls(GET_QUEUE)[1].query)).toEqual({
      siteId: SITE_SUR.id,
    });
    // Sin filas ni cifras de «Todas las sedes» mientras llega la respuesta.
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando la cola…');
    for (const cell of cells())
      expect(cell).toHaveAttribute('aria-busy', 'true');

    act(() => pending.release());
    await loaded();
    expect(cells().map((cell) => cell.textContent)).toEqual([
      'En espera de triage1',
      'Clasificadas2',
      'En atención1',
    ]);
    expect(rowsOf('Clasificadas')).toHaveLength(surQueue.triaged.length);
    expect(screen.queryByText(SITE_NORTE.name, { selector: 'td' })).toBeNull();
    // La elección vive en memoria: ni URL ni almacenamiento.
    expect(router.state.location.search).toBe('');
    expect(
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    ).not.toContain(SITE_SUR.id);
    expect(net.calls(TENANTS)).toHaveLength(1);

    // Volver a «Todas las sedes» pide sin siteId.
    await user.selectOptions(select, '');
    await waitFor(() =>
      expect([...net.calls(GET_QUEUE).at(-1)!.query]).toEqual([]),
    );
  });

  it('R16: si las sedes fallan, el filtro muestra el error con «Reintentar» y la cola de todas las sedes sigue visible', async () => {
    const { net, user } = setup({ routes: { [TENANTS]: problem(500) } });
    await loaded();
    const filter = screen
      .getByLabelText('Sede')
      .closest('.summary__filter') as HTMLElement;
    await within(filter).findByText('No se pudieron cargar las sedes.');
    expect(rowsOf('Clasificadas')).toHaveLength(4);
    expect([...net.calls(GET_QUEUE)[0].query]).toEqual([]);
    net.set(TENANTS, json(200, publicTenants));
    await user.click(
      within(filter).getByRole('button', { name: 'Reintentar' }),
    );
    await waitFor(() => expect(screen.getByLabelText('Sede')).toBeEnabled());
    expect(net.calls(TENANTS)).toHaveLength(2);
  });
});

const START = 'Iniciar atención';
const CLOSE_LABEL = 'Cerrar atención';
const dialog = () => screen.getByRole('dialog');

describe('F-06-web acciones del médico', () => {
  it('R17: PHYSICIAN tiene «Iniciar atención» en cada fila de «Clasificadas» y «Cerrar atención» en cada una de «En atención», asociados a su fila y con el estilo de «Ver atención», y nada en espera', async () => {
    setup();
    await loaded();
    for (const [name, label, other] of [
      ['Clasificadas', START, CLOSE_LABEL],
      ['En atención', CLOSE_LABEL, START],
    ] as const) {
      for (const row of rowsOf(name)) {
        const button = within(row).getByRole('button', { name: label });
        const link = within(row).getByRole('link', { name: 'Ver atención' });
        expect(button).toHaveAttribute('type', 'button');
        expect(button.className).toBe(link.className);
        const cell = within(row).getAllByRole('cell')[0];
        expect(button).toHaveAttribute('aria-describedby', cell.id);
        expect(within(row).queryByRole('button', { name: other })).toBeNull();
        // Orden de tabulación: «Ver atención» y después la acción.
        expect(follows(link, button)).toBe(true);
      }
    }
    for (const row of rowsOf('En espera de triage'))
      expect(within(row).queryByRole('button')).toBeNull();
  });

  it.each(['NURSE', 'ADMIN'] as const)(
    'R17: %s ve la cola de solo lectura, sin botones de acción y sin ningún POST tras cargar y refrescar',
    async (role) => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup({ role });
      await loaded();
      expect(screen.queryByRole('button', { name: START })).toBeNull();
      expect(screen.queryByRole('button', { name: CLOSE_LABEL })).toBeNull();
      for (const name of SECTION_NAMES)
        expect(within(section(name)).queryAllByRole('button')).toHaveLength(0);
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() => expect(net.calls(GET_QUEUE)).toHaveLength(2));
      expect(net.requests.every((request) => request.method === 'GET')).toBe(
        true,
      );
    },
  );

  it.each([
    [
      'Iniciar atención',
      triagedLevel2Overdue,
      '¿Iniciar la atención?',
      'JP · 58 años · Masculino, nivel II. La atención pasará a «En atención» y dejará de contar el tiempo de espera.',
    ],
    [
      'Cerrar atención',
      inCareSur,
      '¿Cerrar la atención?',
      'EB · 63 años · Femenino, nivel III. La atención se cerrará y saldrá de la cola. No se puede deshacer.',
    ],
  ] as const)(
    'R18: «%s» abre la confirmación con las iniciales y el nivel; «Volver» y Escape la cierran sin petición y devuelven el foco',
    async (label, item, title, body) => {
      const { net, user } = setup();
      await loaded();
      const button = within(rowOf(item)).getByRole('button', { name: label });
      await user.click(button);
      expect(
        within(dialog()).getByRole('heading', { name: title }),
      ).toBeInTheDocument();
      expect(dialog()).toHaveTextContent(body);
      await user.click(
        within(dialog()).getByRole('button', { name: 'Volver' }),
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(button).toHaveFocus();

      await user.click(button);
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(button).toHaveFocus();
      expect(net.requests.filter((r) => r.method === 'POST')).toHaveLength(0);
    },
  );

  it('R18, R19: «Confirmar» hace un único POST sin cuerpo a la ruta de la fila', async () => {
    const { net, user } = setup({
      routes: {
        [START_CARE(triagedLevel2.encounterId)]: startCareOk(triagedLevel2),
        [CLOSE(inCareNorte.encounterId)]: closeOk(inCareNorte),
      },
    });
    await loaded();
    await user.click(
      within(rowOf(triagedLevel2)).getByRole('button', { name: START }),
    );
    await user.click(
      within(dialog()).getByRole('button', { name: 'Confirmar' }),
    );
    await screen.findByText('Atención iniciada.');
    await user.click(
      within(rowOf(inCareNorte)).getByRole('button', { name: CLOSE_LABEL }),
    );
    await user.click(
      within(dialog()).getByRole('button', { name: 'Confirmar' }),
    );
    await screen.findByText('Atención cerrada.');
    const posts = net.requests.filter((r) => r.method === 'POST');
    expect(posts.map((r) => r.path)).toEqual([
      `/api/v1/encounters/${triagedLevel2.encounterId}/start-care`,
      `/api/v1/encounters/${inCareNorte.encounterId}/close`,
    ]);
    for (const post of posts) {
      expect(post.body).toBeUndefined();
      expect([...post.query]).toEqual([]);
    }
  });

  it.each([
    [START, triagedLevel1, START_CARE, 'Iniciando la atención…'],
    [CLOSE_LABEL, inCareNorte, CLOSE, 'Cerrando la atención…'],
  ] as const)(
    'R20: durante «%s» todas las acciones del médico se deshabilitan, un segundo clic se ignora y un tick del intervalo no repite ni cancela la petición',
    async (label, item, route, progress) => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const pending = deferred(
        label === START ? startCareOk(item) : closeOk(item),
      );
      const { net, user } = setup({
        routes: { [route(item.encounterId)]: pending.handler },
      });
      await loaded();
      await user.click(
        within(rowOf(item)).getByRole('button', { name: label }),
      );
      const confirm = within(dialog()).getByRole('button', {
        name: 'Confirmar',
      });
      await user.click(confirm);
      const status = await screen.findByText(progress);
      expect(status).toHaveAttribute('role', 'status');
      for (const button of [
        ...screen.getAllByRole('button', { name: START }),
        ...screen.getAllByRole('button', { name: CLOSE_LABEL }),
      ])
        expect(button).toBeDisabled();
      await user.click(screen.getAllByRole('button', { name: START })[0]);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() => expect(net.calls(GET_QUEUE)).toHaveLength(2));
      expect(net.calls(route(item.encounterId))).toHaveLength(1);
      act(() => pending.release());
      await screen.findByText(
        label === START ? 'Atención iniciada.' : 'Atención cerrada.',
      );
      expect(net.calls(route(item.encounterId))).toHaveLength(1);
      expect(screen.queryByText(progress)).not.toBeInTheDocument();
    },
  );
});

/** Abre la confirmación de la fila y confirma. */
async function confirmAction(
  user: ReturnType<typeof userEvent.setup>,
  item: QueueItem,
  label: string,
) {
  await user.click(within(rowOf(item)).getByRole('button', { name: label }));
  await user.click(within(dialog()).getByRole('button', { name: 'Confirmar' }));
}

describe('F-06-web resultado de las acciones del médico', () => {
  it('R21: un 200 en start-care muestra «Atención iniciada.» con el foco, pide la cola y la fila cambia de sección solo con la nueva respuesta', async () => {
    const moved = {
      ...triagedLevel2,
      status: 'IN_CARE' as const,
      waitMinutes: null,
    };
    const next = deferred(
      json(
        200,
        queueWith({
          triaged: queue.triaged.filter((i) => i !== triagedLevel2),
          inCare: [...queue.inCare, moved],
        }),
      ),
    );
    const { net, user } = setup({
      routes: {
        [START_CARE(triagedLevel2.encounterId)]: startCareOk(triagedLevel2),
      },
    });
    await loaded();
    net.set(GET_QUEUE, next.handler);
    await confirmAction(user, triagedLevel2, START);
    const notice = await screen.findByText('Atención iniciada.');
    const status = notice.closest('[role="status"]') as HTMLElement;
    await waitFor(() => expect(status).toHaveFocus());
    await waitFor(() => expect(net.calls(GET_QUEUE)).toHaveLength(2));
    // Sin cambio optimista: la fila sigue en «Clasificadas» hasta la respuesta.
    expect(section('Clasificadas')).toContainElement(rowOf(triagedLevel2));
    act(() => next.release());
    await waitFor(() =>
      expect(section('En atención')).toContainElement(rowOf(triagedLevel2)),
    );
    expect(cells()[1]).toHaveTextContent('Clasificadas3');
  });

  it('R21: un 200 en close muestra «Atención cerrada.» y la fila sale de la cola con la nueva respuesta', async () => {
    const { net, user } = setup({
      routes: { [CLOSE(inCareNorte.encounterId)]: closeOk(inCareNorte) },
    });
    await loaded();
    net.set(GET_QUEUE, json(200, queueWith({ inCare: [inCareSur] })));
    await confirmAction(user, inCareNorte, CLOSE_LABEL);
    await screen.findByText('Atención cerrada.');
    await waitFor(() =>
      expect(
        document.getElementById(`queue-patient-${inCareNorte.encounterId}`),
      ).toBeNull(),
    );
    expect(cells()[2]).toHaveTextContent('En atención1');
  });

  it.each([
    [
      START,
      triagedLevel1,
      START_CARE,
      'Esta atención ya no está clasificada. La cola se actualizó.',
    ],
    [
      CLOSE_LABEL,
      inCareSur,
      CLOSE,
      'Esta atención ya no está en atención. La cola se actualizó.',
    ],
  ] as const)(
    'R22: un 409 en «%s» muestra su aviso con el foco, vuelve a pedir la cola y no reenvía',
    async (label, item, route, text) => {
      const { net, user } = setup({
        routes: { [route(item.encounterId)]: problem(409) },
      });
      await loaded();
      await confirmAction(user, item, label);
      const notice = await screen.findByText(text);
      expect(notice).toHaveClass('status--warn');
      await waitFor(() => expect(notice).toHaveFocus());
      await waitFor(() => expect(net.calls(GET_QUEUE)).toHaveLength(2));
      expect(net.calls(route(item.encounterId))).toHaveLength(1);
      expect(within(notice).queryByRole('button')).toBeNull();
    },
  );

  it('R23: un 404 muestra «Esta atención ya no existe. La cola se actualizó.» y vuelve a pedir la cola', async () => {
    const { net, user } = setup({
      routes: { [START_CARE(triagedLevel4.encounterId)]: problem(404) },
    });
    await loaded();
    await confirmAction(user, triagedLevel4, START);
    await screen.findByText(
      'Esta atención ya no existe. La cola se actualizó.',
    );
    await waitFor(() => expect(net.calls(GET_QUEUE)).toHaveLength(2));
  });

  it('R23: un 403 muestra «No tienes permiso para esta acción.» sin «Reintentar»', async () => {
    const { net, user } = setup({
      routes: { [CLOSE(inCareSur.encounterId)]: problem(403) },
    });
    await loaded();
    await confirmAction(user, inCareSur, CLOSE_LABEL);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No tienes permiso para esta acción.');
    expect(within(alert).queryByRole('button')).toBeNull();
    expect(net.calls(GET_QUEUE)).toHaveLength(1);
  });

  it.each([
    ['red caída', networkError(), 'No hay conexión con el servidor.'],
    ['500', problem(500), 'El servidor tuvo un problema. Inténtalo de nuevo.'],
  ])(
    'R24: un fallo de %s muestra el error traducido con «Reintentar», que repite la misma acción sobre la misma atención solo al pulsarlo',
    async (_label, failure, text) => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const route = START_CARE(triagedLevel2Overdue.encounterId);
      const { net, user } = setup({ routes: { [route]: failure } });
      await loaded();
      await confirmAction(user, triagedLevel2Overdue, START);
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(text);
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      expect(net.calls(route)).toHaveLength(1);
      net.set(route, startCareOk(triagedLevel2Overdue));
      await user.click(
        within(alert).getByRole('button', { name: 'Reintentar' }),
      );
      await screen.findByText('Atención iniciada.');
      expect(net.calls(route)).toHaveLength(2);
      expect(net.requests.filter((r) => r.method === 'POST')).toHaveLength(2);
    },
  );

  it('R24: un 400 muestra el error genérico sin «Reintentar»', async () => {
    const route = CLOSE(inCareNorte.encounterId);
    const { net, user } = setup({ routes: { [route]: problem(400) } });
    await loaded();
    await confirmAction(user, inCareNorte, CLOSE_LABEL);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'No se pudo completar la acción. Inténtalo de nuevo.',
    );
    expect(within(alert).queryByRole('button')).toBeNull();
    expect(net.calls(route)).toHaveLength(1);
  });
});
