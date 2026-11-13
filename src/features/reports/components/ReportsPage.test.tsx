import { focusManager, onlineManager } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { session } from '../../../shared/api/session';
import { formatDateTimeBogota } from '../../../shared/lib/datetime';
import {
  SITE_NORTE,
  SITE_SUR,
  TOKEN,
  deferred,
  inMs,
  fakeApi,
  json,
  networkError,
  problem,
  publicTenantsWith,
  sequence,
  type Handler,
} from '../../../test/fakeApi';
import { renderFeature } from '../../../test/renderFeature';
import { watchScrolling } from '../../../test/scroll';
import { norm } from '../../../test/text';
import { reportRoutes } from '../routes';
import {
  CSV_BODY,
  GENERATED_AT,
  GET_CSV,
  GET_SUMMARY,
  csvResponse,
  LATER_GENERATED_AT,
  byLevelUnordered,
  summaryEmpty,
  summaryMaxMinutes45,
  summaryOnePair,
  summaryResponse,
  summaryWithData,
} from '../testing/reportFixtures';

const TENANTS = 'GET /api/v1/public/tenants';
const LIST = 'GET /api/v1/encounters';
const SITES = [SITE_NORTE, SITE_SUR];
/** 15:00 UTC = 10:00 a. m. del 11 de noviembre en Bogotá. */
const NOW = new Date('2026-11-11T15:00:00.000Z');

function setup({
  routes = {},
  sites = SITES,
}: { routes?: Record<string, Handler>; sites?: typeof SITES } = {}) {
  const net = fakeApi({
    [TENANTS]: json(200, publicTenantsWith(sites)),
    [GET_SUMMARY]: summaryResponse(),
    ...routes,
  });
  const user = userEvent.setup();
  const view = renderFeature(reportRoutes, {
    entries: ['/reportes'],
    role: 'ADMIN',
  });
  return { net, user, ...view };
}

/** Reloj falso en `now` que sigue avanzando (para findBy y user-event). */
function clockAt(now: Date = NOW) {
  vi.useFakeTimers({ shouldAdvanceTime: true, now });
}

const PANEL_NAMES = [
  'De la llegada al triage',
  'Triage I y II: de la clasificación a la atención',
  'Concordancia IA–enfermería',
  'Uso de respaldo y safety guards',
] as const;
const panelOf = (name: string) => screen.getByRole('region', { name });
const periodRegion = () => screen.getByRole('region', { name: 'Periodo' });
const bar = () => screen.getByRole('region', { name: 'Indicadores' });
const cells = () => within(bar()).getAllByRole('listitem');
const exportPanel = () => screen.getByRole('region', { name: 'Exportar' });
const fromField = () => screen.getByLabelText<HTMLInputElement>('Desde');
const toField = () => screen.getByLabelText<HTMLInputElement>('Hasta');
const siteField = () => screen.getByLabelText<HTMLSelectElement>('Sede');
const applyButton = () => screen.getByRole('button', { name: 'Aplicar' });
/** Espera a que el tablero pinte sus paneles. */
const loaded = () =>
  screen.findByRole('region', { name: 'De la llegada al triage' });
const metaLine = () => document.querySelector('.report-meta') as HTMLElement;
/** `b` aparece después de `a` en el documento. */
const follows = (a: Node, b: Node) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
const setDate = (input: HTMLInputElement, value: string) =>
  fireEvent.change(input, { target: { value } });

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
});

describe('F-07-web tablero de reportes: estructura', () => {
  it('R1: encabezado, «Periodo», «Indicadores» con tres celdas, los cuatro paneles y «Exportar», en ese orden y con un solo h1', async () => {
    const { container } = setup();
    await loaded();
    const title = screen.getByRole('heading', { level: 1, name: 'Reportes' });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(title.nextElementSibling).toHaveTextContent(
      'Tiempos, cumplimiento, concordancia y uso del respaldo de las atenciones de un periodo.',
    );

    const period = periodRegion();
    expect(
      within(period).getByRole('heading', { level: 2, name: 'Periodo' }),
    ).toHaveClass('visually-hidden');
    for (const label of ['Desde', 'Hasta', 'Sede'])
      expect(within(period).getByLabelText(label)).toBeInTheDocument();
    expect(
      within(period).getByRole('button', { name: 'Aplicar' }),
    ).toBeInTheDocument();

    const region = bar();
    expect(cells()).toHaveLength(3);
    expect(region.style.getPropertyValue('--cells')).toBe('3');
    expect(region).not.toHaveClass('summary--filter');
    await waitFor(() =>
      expect(cells().map((cell) => cell.textContent)).toEqual([
        'Atenciones14',
        'Con triage12',
        'Cumplimiento Triage II66,7 %',
      ]),
    );

    const panels = PANEL_NAMES.map(panelOf);
    for (const [i, name] of PANEL_NAMES.entries())
      expect(
        within(panels[i]).getByRole('heading', { level: 2, name }),
      ).toBeInTheDocument();
    const exporting = exportPanel();

    expect(follows(title, period)).toBe(true);
    expect(follows(period, region)).toBe(true);
    expect(follows(region, panels[0])).toBe(true);
    for (let i = 1; i < panels.length; i += 1)
      expect(follows(panels[i - 1], panels[i])).toBe(true);
    expect(follows(panels[3], exporting)).toBe(true);

    const stack = container.querySelector('.dashboard > .stack')!;
    expect(stack.children[0].tagName).toBe('HEADER');
    expect(stack.children[1]).toBe(period);
    expect(stack.children[2]).toBe(region);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('R1: «Actualizar» es la única acción del encabezado, y no hay franja «pendiente» ni «Atenciones por sede»', async () => {
    setup();
    await loaded();
    const header = document.querySelector('header.page-header') as HTMLElement;
    expect(
      within(header).getByRole('button', { name: 'Actualizar' }),
    ).toHaveClass('button', 'button--secondary');
    expect(header.querySelectorAll('button, a')).toHaveLength(1);
    expect(
      screen.queryByRole('region', { name: 'Atenciones por sede' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Indicadores y reportes' }),
    ).not.toBeInTheDocument();
    expect(document.querySelector('.pending')).toBeNull();
    expect(document.body).not.toHaveTextContent('Próximamente');
    expect(document.body).not.toHaveTextContent(
      'Esta funcionalidad aún no está disponible.',
    );
  });

  it('R2: pide las sedes y un único GET /reports/summary, sin GET /encounters ni otro endpoint', async () => {
    const { net } = setup();
    await loaded();
    await waitFor(() => expect(cells()[0]).toHaveTextContent('14'));
    expect(net.calls(GET_SUMMARY)).toHaveLength(1);
    expect(net.calls(LIST)).toHaveLength(0);
    expect(
      [...new Set(net.requests.map((r) => `${r.method} ${r.path}`))].sort(),
    ).toEqual([GET_SUMMARY, TENANTS].sort());
    expect(net.calls(TENANTS)).toHaveLength(1);
  });
});

describe('F-07-web tablero de reportes: periodo y sede', () => {
  it('R5: con el reloj en 2026-11-11T15:00:00Z propone del 5 al 11 de noviembre con todas las sedes y carga con esas fechas', async () => {
    clockAt();
    const { net } = setup();
    await loaded();
    expect(fromField().value).toBe('2026-11-05');
    expect(toField().value).toBe('2026-11-11');
    expect(siteField().value).toBe('');
    expect(siteField().selectedOptions[0].textContent).toBe('Todas las sedes');
    expect(Object.fromEntries(net.calls(GET_SUMMARY)[0].query)).toEqual({
      from: '2026-11-05',
      to: '2026-11-11',
    });
  });

  it('R5: a las 11:30 p. m. del 10 de noviembre en Bogotá (04:30 UTC del 11) hoy sigue siendo el 10', async () => {
    clockAt(new Date('2026-11-11T04:30:00.000Z'));
    const { net } = setup();
    await loaded();
    expect(fromField().value).toBe('2026-11-04');
    expect(toField().value).toBe('2026-11-10');
    expect(net.calls(GET_SUMMARY)[0].query.get('to')).toBe('2026-11-10');
  });

  it('R6: cambiar los campos sin «Aplicar» no pide nada; «Aplicar» pide una vez con la fecha y la sede nuevas, sin cifras del periodo anterior mientras carga y sin tocar la URL', async () => {
    clockAt();
    const { net, user, router } = setup();
    await loaded();
    await waitFor(() => expect(cells()[0]).toHaveTextContent('14'));
    await waitFor(() =>
      expect(siteField().options).toHaveLength(SITES.length + 1),
    );

    setDate(fromField(), '2026-11-01');
    await user.selectOptions(siteField(), SITE_SUR.id);
    expect(net.calls(GET_SUMMARY)).toHaveLength(1);

    const next = deferred(
      summaryResponse({
        ...summaryWithData,
        population: { encounters: 9, triaged: 7 },
      }),
    );
    net.set(GET_SUMMARY, next.handler);
    await user.click(applyButton());
    await waitFor(() => expect(net.calls(GET_SUMMARY)).toHaveLength(2));
    expect(Object.fromEntries(net.calls(GET_SUMMARY)[1].query)).toEqual({
      from: '2026-11-01',
      to: '2026-11-11',
      siteId: SITE_SUR.id,
    });
    // Mientras carga, ninguna cifra del periodo anterior.
    expect(screen.getByRole('status')).toHaveTextContent(
      'Cargando los indicadores…',
    );
    expect(
      screen.queryByRole('region', { name: 'De la llegada al triage' }),
    ).not.toBeInTheDocument();
    for (const cell of cells()) {
      expect(cell).toHaveAttribute('aria-busy', 'true');
      expect(cell).not.toHaveTextContent(/14|12|66,7/);
    }

    act(() => next.release());
    await loaded();
    await waitFor(() => expect(cells()[0]).toHaveTextContent('Atenciones9'));
    expect(net.calls(GET_SUMMARY)).toHaveLength(2);
    expect(router.state.location.pathname).toBe('/reportes');
    expect(router.state.location.search).toBe('');
    expect(router.state.location.hash).toBe('');
  });

  it('R7: con «Desde» vacío o una fecha imposible marca el campo con su mensaje y no envía nada', async () => {
    clockAt();
    const { net, user } = setup();
    await loaded();

    setDate(fromField(), '');
    await user.click(applyButton());
    await waitFor(() =>
      expect(fromField()).toHaveAttribute('aria-invalid', 'true'),
    );
    const message = document.getElementById(
      fromField().getAttribute('aria-describedby')!,
    );
    expect(message).toHaveTextContent('Escribe una fecha válida.');
    expect(toField()).toHaveAttribute('aria-invalid', 'false');

    setDate(fromField(), '2026-11-05');
    // jsdom, como el navegador, deja vacío un valor que no es una fecha real.
    setDate(toField(), '2026-02-30');
    await user.click(applyButton());
    await waitFor(() =>
      expect(toField()).toHaveAttribute('aria-invalid', 'true'),
    );
    expect(
      document.getElementById(toField().getAttribute('aria-describedby')!),
    ).toHaveTextContent('Escribe una fecha válida.');
    expect(net.calls(GET_SUMMARY)).toHaveLength(1);
  });

  it('R7: «Desde» posterior a «Hasta» sí se envía: el orden lo valida la API', async () => {
    clockAt();
    const { net, user } = setup();
    await loaded();
    setDate(fromField(), '2026-11-20');
    setDate(toField(), '2026-11-10');
    await user.click(applyButton());
    await waitFor(() => expect(net.calls(GET_SUMMARY)).toHaveLength(2));
    expect(net.calls(GET_SUMMARY)[1].query.get('from')).toBe('2026-11-20');
    expect(fromField()).toHaveAttribute('aria-invalid', 'false');
  });

  it("R8: un 422 con errors[{ field: 'to' }] muestra el mensaje del periodo, marca «Hasta», sin «Reintentar» ni paneles, y no se repite a los 30 s", async () => {
    clockAt();
    const { net } = setup({
      routes: {
        [GET_SUMMARY]: problem(422, {
          errors: [{ field: 'to', message: 'to must not be before from' }],
        }),
      },
    });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'El periodo no es válido: Desde no puede ser posterior a Hasta y el periodo no puede superar 366 días.',
    );
    // El texto de la API no se muestra.
    expect(document.body).not.toHaveTextContent('to must not be before from');
    expect(toField()).toHaveAttribute('aria-invalid', 'true');
    expect(fromField()).toHaveAttribute('aria-invalid', 'false');
    expect(
      document.getElementById(toField().getAttribute('aria-describedby')!),
    ).toHaveTextContent('El periodo no es válido');
    expect(
      screen.queryByRole('button', { name: /Reintentar/ }),
    ).not.toBeInTheDocument();
    for (const name of PANEL_NAMES)
      expect(screen.queryByRole('region', { name })).not.toBeInTheDocument();
    expect(cells()).toHaveLength(3);
    for (const cell of cells())
      expect(cell).toHaveTextContent('No se pudo cargar');

    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(net.calls(GET_SUMMARY)).toHaveLength(1);
  });

  it("R8: un 400 con errors[{ field: 'from' }] muestra su mensaje y marca «Desde»; aplicar otro periodo lo limpia", async () => {
    clockAt();
    const { net, user } = setup({
      routes: {
        [GET_SUMMARY]: problem(400, {
          errors: [{ field: 'from', message: 'from must be a date' }],
        }),
      },
    });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Las fechas no son válidas. Revisa Desde y Hasta.',
    );
    expect(fromField()).toHaveAttribute('aria-invalid', 'true');
    expect(toField()).toHaveAttribute('aria-invalid', 'false');
    expect(within(alert).queryByRole('button')).not.toBeInTheDocument();

    net.set(GET_SUMMARY, summaryResponse());
    setDate(fromField(), '2026-11-06');
    await user.click(applyButton());
    await loaded();
    expect(fromField()).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('R9: muestra el periodo devuelto por la API en DD/MM/AAAA, la sede consultada y la hora de cálculo en Bogotá sin segundos', async () => {
    clockAt();
    const { user } = setup();
    await loaded();
    const meta = metaLine();
    expect(meta).toHaveTextContent('Del 05/11/2026 al 11/11/2026');
    expect(meta).toHaveTextContent('Todas las sedes');
    const datetime = formatDateTimeBogota(GENERATED_AT);
    expect(datetime).toMatch(/^11\/11\/26, 10:00/);
    expect(meta).toHaveTextContent(
      norm(`Calculado por el servidor el ${datetime}`),
    );
    expect(meta).not.toHaveTextContent(/10:00:00/);
    expect(meta.querySelector('time')).toHaveAttribute(
      'datetime',
      GENERATED_AT,
    );

    await waitFor(() =>
      expect(siteField().options).toHaveLength(SITES.length + 1),
    );
    await user.selectOptions(siteField(), SITE_NORTE.id);
    await user.click(applyButton());
    await waitFor(() => expect(metaLine()).toHaveTextContent('Sede Norte'));
    expect(metaLine()).not.toHaveTextContent('Todas las sedes');
  });

  it('R10: si fallan las sedes, el filtro muestra su error con «Reintentar» y se pueden consultar todas las sedes', async () => {
    clockAt();
    const { net, user } = setup({ routes: { [TENANTS]: problem(500) } });
    await loaded();
    const period = periodRegion();
    const alert = await within(period).findByRole('alert');
    expect(alert).toHaveTextContent('No se pudieron cargar las sedes.');
    expect(follows(siteField(), alert)).toBe(true);
    expect([...siteField().options].map((o) => o.textContent)).toEqual([
      'Todas las sedes',
    ]);
    expect([...net.calls(GET_SUMMARY)[0].query.keys()]).toEqual(['from', 'to']);
    await waitFor(() => expect(cells()[0]).toHaveTextContent('14'));

    net.set(TENANTS, json(200, publicTenantsWith(SITES)));
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() =>
      expect(siteField().options).toHaveLength(SITES.length + 1),
    );
    expect(net.calls(TENANTS)).toHaveLength(2);
    expect(net.calls(GET_SUMMARY)).toHaveLength(1);
  });
});

describe('F-07-web tablero de reportes: estados y refresco', () => {
  it('R19: mientras carga hay un único role="status" con «Cargando los indicadores…» y las celdas ocupadas, sin valores', async () => {
    const pending = deferred(summaryResponse());
    setup({ routes: { [GET_SUMMARY]: pending.handler } });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Cargando los indicadores…',
      ),
    );
    expect(screen.getAllByRole('status')).toHaveLength(1);
    for (const cell of cells())
      expect(cell).toHaveAttribute('aria-busy', 'true');
    for (const name of PANEL_NAMES)
      expect(screen.queryByRole('region', { name })).not.toBeInTheDocument();
    expect(metaLine()).toBeNull();
    act(() => pending.release());
    await loaded();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('R20: muestra «Se actualiza cada 30 s» como texto plano y «Actualizar» es la única copia', async () => {
    setup();
    await loaded();
    const note = screen.getByText('Se actualiza cada 30 s');
    expect(note).toHaveClass('live');
    expect(note).not.toHaveAttribute('role');
    expect(note.closest('[aria-live]')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Actualizar' })).toHaveLength(
      1,
    );
  });

  it('R20: cada 30 s con la pestaña visible repite el resumen del periodo aplicado, no las sedes, y «Actualizar» lo repite al instante', async () => {
    clockAt();
    const { net } = setup();
    await loaded();
    await waitFor(() => expect(net.calls(GET_SUMMARY)).toHaveLength(1));
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await waitFor(() => expect(net.calls(GET_SUMMARY)).toHaveLength(2));
    expect(Object.fromEntries(net.calls(GET_SUMMARY)[1].query)).toEqual({
      from: '2026-11-05',
      to: '2026-11-11',
    });
    await act(async () => {
      screen.getByRole('button', { name: 'Actualizar' }).click();
      await vi.advanceTimersByTimeAsync(0);
    });
    await waitFor(() => expect(net.calls(GET_SUMMARY)).toHaveLength(3));
    expect(net.calls(TENANTS)).toHaveLength(1);
  });

  it('R20: ni el foco de la ventana ni la reconexión repiten la petición', async () => {
    clockAt();
    const { net } = setup();
    await loaded();
    await act(async () => {
      focusManager.setFocused(false);
      onlineManager.setOnline(false);
      focusManager.setFocused(true);
      onlineManager.setOnline(true);
      await vi.advanceTimersByTimeAsync(20);
    });
    expect(net.calls(GET_SUMMARY)).toHaveLength(1);
  });

  it('R20: con la pestaña oculta no se repite la petición', async () => {
    clockAt();
    const { net } = setup();
    await loaded();
    const visibility = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('hidden');
    await act(() => vi.advanceTimersByTimeAsync(90_000));
    expect(net.calls(GET_SUMMARY)).toHaveLength(1);
    visibility.mockRestore();
  });

  it('R20: durante un refresco conserva los valores, sin estado de carga, y «Actualizar» lleva aria-busy sin deshabilitarse', async () => {
    const later = deferred(
      summaryResponse(
        { ...summaryWithData, population: { encounters: 15, triaged: 13 } },
        LATER_GENERATED_AT,
      ),
    );
    const { user } = setup({
      routes: { [GET_SUMMARY]: sequence(summaryResponse(), later.handler) },
    });
    await loaded();
    await waitFor(() => expect(cells()[0]).toHaveTextContent('Atenciones14'));
    const button = screen.getByRole('button', { name: 'Actualizar' });
    const first = cells()[0];
    const panel = panelOf('De la llegada al triage');

    await user.click(button);
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'));
    expect(button).toBeEnabled();
    expect(button).toHaveFocus();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(cells()[0]).toHaveTextContent('Atenciones14');
    expect(cells()[0]).not.toHaveAttribute('aria-busy');

    act(() => later.release());
    await waitFor(() => expect(cells()[0]).toHaveTextContent('Atenciones15'));
    await waitFor(() => expect(button).not.toHaveAttribute('aria-busy'));
    expect(button).toHaveFocus();
    // Los nodos se conservan: la celda y el panel no se remontan.
    expect(cells()[0]).toBe(first);
    expect(panelOf('De la llegada al triage')).toBe(panel);
  });

  it('R20: un refresco por intervalo conserva el foco en «Aplicar» y no desplaza la página', async () => {
    clockAt();
    const scrolling = watchScrolling();
    const { net } = setup();
    await loaded();
    act(() => applyButton().focus());
    const panel = panelOf('De la llegada al triage');
    net.set(
      GET_SUMMARY,
      summaryResponse(
        { ...summaryWithData, population: { encounters: 16, triaged: 12 } },
        LATER_GENERATED_AT,
      ),
    );
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await waitFor(() => expect(cells()[0]).toHaveTextContent('Atenciones16'));
    expect(applyButton()).toHaveFocus();
    expect(panelOf('De la llegada al triage')).toBe(panel);
    expect(scrolling.calls()).toBe(0);
    scrolling.restore();
  });

  it('R21: un error de red en la carga inicial muestra el error traducido con «Reintentar», sin paneles ni cifras', async () => {
    const { net, user } = setup({ routes: { [GET_SUMMARY]: networkError() } });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No hay conexión con el servidor.');
    for (const name of PANEL_NAMES)
      expect(screen.queryByRole('region', { name })).not.toBeInTheDocument();
    for (const cell of cells()) expect(cell).not.toHaveTextContent(/\d/);

    net.set(GET_SUMMARY, summaryResponse());
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    await loaded();
    expect(net.calls(GET_SUMMARY)).toHaveLength(2);
  });

  it('R21: un 500 en la carga inicial muestra el error del servidor', async () => {
    setup({ routes: { [GET_SUMMARY]: problem(500) } });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El servidor tuvo un problema. Inténtalo de nuevo.',
    );
  });

  it('R21: un refresco fallido conserva los valores con el aviso y la hora del último cálculo, y el siguiente ciclo vuelve a pedir', async () => {
    clockAt();
    const { net, user } = setup();
    await loaded();
    await waitFor(() => expect(cells()[0]).toHaveTextContent('Atenciones14'));
    net.set(GET_SUMMARY, networkError());
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    const notice = await screen.findByText(
      norm(
        `No se pudieron actualizar los indicadores. Se muestran los calculados el ${formatDateTimeBogota(GENERATED_AT)}.`,
      ),
    );
    const box = notice.closest('.status') as HTMLElement;
    expect(box).toHaveClass('status--warn');
    expect(cells()[0]).toHaveTextContent('Atenciones14');
    expect(panelOf('De la llegada al triage')).toBeInTheDocument();
    expect(
      within(box).getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument();

    net.set(GET_SUMMARY, networkError());
    await user.click(within(box).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(net.calls(GET_SUMMARY)).toHaveLength(3));

    net.set(GET_SUMMARY, summaryResponse());
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await waitFor(() =>
      expect(
        screen.queryByText(/No se pudieron actualizar los indicadores/),
      ).not.toBeInTheDocument(),
    );
    expect(net.calls(GET_SUMMARY)).toHaveLength(4);
  });

  it('R22: un 403 muestra «No tienes permiso para ver esta página.» sin «Reintentar» ni valores y detiene el intervalo', async () => {
    clockAt();
    const { net } = setup({ routes: { [GET_SUMMARY]: problem(403) } });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No tienes permiso para ver esta página.');
    expect(within(alert).queryByRole('button')).not.toBeInTheDocument();
    for (const cell of cells()) expect(cell).toHaveTextContent('Sin permiso');
    expect(
      screen.queryByRole('button', { name: /Reintentar/ }),
    ).not.toBeInTheDocument();
    for (const name of PANEL_NAMES)
      expect(screen.queryByRole('region', { name })).not.toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(net.calls(GET_SUMMARY)).toHaveLength(1);
  });

  it('R22: un 403 en un refresco retira los valores anteriores', async () => {
    clockAt();
    const { net } = setup();
    await loaded();
    net.set(GET_SUMMARY, problem(403));
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tienes permiso para ver esta página.',
    );
    expect(cells()[0]).not.toHaveTextContent('14');
    expect(
      screen.queryByRole('region', { name: 'De la llegada al triage' }),
    ).not.toBeInTheDocument();
  });
});

/** Filas de datos de una tabla: el encabezado de fila y las celdas, como texto. */
const rowsOf = (table: HTMLElement) =>
  within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => [
      ...[...row.querySelectorAll('th, td')].map((cell) => cell.textContent),
    ]);
const columnsOf = (table: HTMLElement) =>
  within(table)
    .getAllByRole('columnheader')
    .map((cell) => cell.textContent);
const fixed = (value: number, digits = 1) =>
  new Intl.NumberFormat('es', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
const minutes = (value: number | null) =>
  value === null ? 'Sin datos' : `${fixed(value)} min`;
const CARE = 'Triage I y II: de la clasificación a la atención';

describe('F-07-web tablero de reportes: tiempos y cumplimiento', () => {
  it('R11: la tabla «De la llegada al triage» tiene una fila por nivel, en el orden recibido, y «Total», con «Atenciones», «Mediana» y «P90» en minutos', async () => {
    setup({ routes: { [GET_SUMMARY]: summaryResponse(byLevelUnordered) } });
    const panel = await loaded();
    const table = within(panel).getByRole('table', {
      name: 'De la llegada al triage',
    });
    expect(columnsOf(table)).toEqual(['Nivel', 'Atenciones', 'Mediana', 'P90']);
    for (const header of within(table).getAllByRole('columnheader'))
      expect(header).toHaveAttribute('scope', 'col');
    expect(rowsOf(table)).toEqual([
      ['Nivel V', '0', 'Sin datos', 'Sin datos'],
      ['Nivel IV', '3', '33,3 min', '52,0 min'],
      ['Nivel III', '4', '25,0 min', '41,7 min'],
      ['Nivel II', '3', '12,5 min', '18,2 min'],
      ['Nivel I', '2', '3,5 min', '4,1 min'],
      ['Total', '12', '20,4 min', '47,9 min'],
    ]);
    for (const header of within(table).getAllByRole('rowheader'))
      expect(header).toHaveAttribute('scope', 'row');
  });

  it('R12: la tabla de I y II muestra «Media», «Mediana» y «P90» en el orden recibido y la nota de la Res. 256 de 2016', async () => {
    setup({ routes: { [GET_SUMMARY]: summaryResponse(byLevelUnordered) } });
    await loaded();
    const panel = panelOf(CARE);
    const table = within(panel).getByRole('table', { name: CARE });
    expect(columnsOf(table)).toEqual([
      'Nivel',
      'Atenciones',
      'Media',
      'Mediana',
      'P90',
    ]);
    expect(rowsOf(table)).toEqual([
      ['Nivel II', '3', '21,7 min', '18,9 min', '36,1 min'],
      ['Nivel I', '2', '1,5 min', '1,4 min', '2,6 min'],
    ]);
    expect(panel).toHaveTextContent(
      'Minutos desde la clasificación hasta la atención médica. La media es el indicador de la Res. 256 de 2016.',
    );
  });

  it('R13: el cumplimiento del Triage II muestra el porcentaje, «2 de 3 atenciones», el máximo de la API, las no evaluadas y la nota del nivel I', async () => {
    setup();
    await loaded();
    const panel = panelOf(CARE);
    const compliance = panel.querySelector('.report-compliance') as HTMLElement;
    expect(compliance).toHaveTextContent(
      'Cumplimiento Triage II (máx. 30 min)',
    );
    expect(compliance).toHaveTextContent('66,7 %');
    expect(compliance).toHaveTextContent('2 de 3 atenciones');
    expect(compliance).toHaveTextContent(
      'Sin evaluar (no llegaron a atención): 1',
    );
    expect(compliance).toHaveTextContent(
      'Nivel I: atención inmediata, sin porcentaje de cumplimiento.',
    );
    // Ningún otro nivel muestra un porcentaje de cumplimiento.
    expect(within(panel).getByRole('table')).not.toHaveTextContent('%');
    expect(panel.textContent.match(/%/g)).toHaveLength(1);
  });

  it('R13: el máximo sale de compliance.maxMinutes: con 45 dice «máx. 45 min» y ningún «30»', async () => {
    setup({ routes: { [GET_SUMMARY]: summaryResponse(summaryMaxMinutes45) } });
    await loaded();
    const panel = panelOf(CARE);
    const compliance = panel.querySelector('.report-compliance') as HTMLElement;
    expect(compliance).toHaveTextContent(
      'Cumplimiento Triage II (máx. 45 min)',
    );
    expect(compliance).toHaveTextContent('100,0 %');
    expect(compliance).toHaveTextContent('3 de 3 atenciones');
    expect(panel).not.toHaveTextContent(/\b30\b/);
  });

  it('R3: cada valor de los tiempos y del cumplimiento es el de la API con el formato del idioma, sin ninguno calculado', async () => {
    setup();
    await loaded();
    const { timeToTriage, timeToCare, compliance, population } =
      summaryWithData;
    const triage = within(panelOf('De la llegada al triage')).getByRole(
      'table',
    );
    expect(rowsOf(triage)).toEqual([
      ...timeToTriage.byLevel.map((row) => [
        `Nivel ${['I', 'II', 'III', 'IV', 'V'][row.level - 1]}`,
        String(row.n),
        minutes(row.median),
        minutes(row.p90),
      ]),
      [
        'Total',
        String(timeToTriage.total.n),
        minutes(timeToTriage.total.median),
        minutes(timeToTriage.total.p90),
      ],
    ]);
    const care = within(panelOf(CARE)).getByRole('table');
    expect(rowsOf(care)).toEqual(
      timeToCare.byLevel.map((row) => [
        `Nivel ${['I', 'II'][row.level - 1]}`,
        String(row.n),
        minutes(row.mean),
        minutes(row.median),
        minutes(row.p90),
      ]),
    );
    expect(cells().map((cell) => cell.textContent)).toEqual([
      `Atenciones${population.encounters}`,
      `Con triage${population.triaged}`,
      `Cumplimiento Triage II${fixed(compliance.percent!)} %`,
    ]);
  });

  it('R4: con un periodo sin datos cada null dice «Sin datos» y cada conteo 0 dice «0», sin «—» ni celdas vacías', async () => {
    setup({ routes: { [GET_SUMMARY]: summaryResponse(summaryEmpty) } });
    await loaded();
    const triage = within(panelOf('De la llegada al triage')).getByRole(
      'table',
    );
    expect(rowsOf(triage)).toEqual([
      ...['I', 'II', 'III', 'IV', 'V'].map((level) => [
        `Nivel ${level}`,
        '0',
        'Sin datos',
        'Sin datos',
      ]),
      ['Total', '0', 'Sin datos', 'Sin datos'],
    ]);
    const care = within(panelOf(CARE)).getByRole('table');
    expect(rowsOf(care)).toEqual([
      ['Nivel I', '0', 'Sin datos', 'Sin datos', 'Sin datos'],
      ['Nivel II', '0', 'Sin datos', 'Sin datos', 'Sin datos'],
    ]);
    const compliance = panelOf(CARE).querySelector(
      '.report-compliance',
    ) as HTMLElement;
    expect(compliance).toHaveTextContent('Sin datos');
    expect(compliance).toHaveTextContent('0 de 0 atenciones');
    expect(compliance).toHaveTextContent(
      'Sin evaluar (no llegaron a atención): 0',
    );
    expect(compliance).not.toHaveTextContent(/0[,.]0 %|\b0 %/);
    expect(cells().map((cell) => cell.textContent)).toEqual([
      'Atenciones0',
      'Con triage0',
      'Cumplimiento Triage IISin datos',
    ]);
    expect(document.body).not.toHaveTextContent('—');
    // La esquina de la matriz no es un valor: ni encabezado ni dato.
    for (const cell of document.querySelectorAll(
      'td:not(.report-matrix__corner), th[scope="row"]',
    ))
      expect(cell.textContent.trim(), cell.outerHTML).not.toBe('');
  });

  it('R17: con 0 atenciones muestra el aviso de periodo vacío encima de los paneles, que siguen visibles', async () => {
    setup({ routes: { [GET_SUMMARY]: summaryResponse(summaryEmpty) } });
    const first = await loaded();
    const notice = screen.getByText(
      'No hay atenciones en este periodo y sede.',
    );
    expect(follows(notice, first)).toBe(true);
    expect(follows(bar(), notice)).toBe(true);
    for (const name of PANEL_NAMES)
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
  });

  it('R17: con atenciones no hay aviso de periodo vacío', async () => {
    setup();
    await loaded();
    expect(
      screen.queryByText('No hay atenciones en este periodo y sede.'),
    ).not.toBeInTheDocument();
  });
});

const CONCORDANCE = 'Concordancia IA–enfermería';
const FALLBACK = 'Uso de respaldo y safety guards';
const MATRIX =
  'Matriz de concordancia: filas, nivel sugerido por la IA; columnas, nivel final (enfermería)';
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
/** El valor (`dd`) de un término (`dt`) de una lista de definición. */
const definitionOf = (scope: HTMLElement, term: string) => {
  const dt = within(scope).getByText(term, { selector: 'dt' });
  return dt.parentElement!.querySelector('dd') as HTMLElement;
};

describe('F-07-web tablero de reportes: concordancia y respaldo', () => {
  it('R14: pares, acuerdo exacto, kappa con 3 decimales y sub y sobreclasificación con su definición', async () => {
    setup();
    await loaded();
    const panel = panelOf(CONCORDANCE);
    expect(definitionOf(panel, 'Pares')).toHaveTextContent(/^10$/);
    expect(definitionOf(panel, 'Acuerdo exacto')).toHaveTextContent(/^80,0 %$/);
    expect(definitionOf(panel, 'Kappa ponderado')).toHaveTextContent(/^0,812/);
    expect(
      definitionOf(
        panel,
        'Subclasificación: la IA sugirió un nivel menos grave que el final',
      ),
    ).toHaveTextContent(/^10,0 %$/);
    expect(
      definitionOf(
        panel,
        'Sobreclasificación: la IA sugirió un nivel más grave que el final',
      ),
    ).toHaveTextContent(/^10,0 %$/);
  });

  it('R14: la matriz es una tabla con caption, filas por nivel sugerido y columnas por nivel final, con los conteos de matrix[i][j] en su celda', async () => {
    setup();
    await loaded();
    const table = within(panelOf(CONCORDANCE)).getByRole('table', {
      name: MATRIX,
    });
    const caption = table.querySelector('caption')!;
    expect(caption).toHaveTextContent(MATRIX);
    expect(caption).not.toHaveClass('visually-hidden');
    const cols = table.querySelectorAll('th[scope="col"]');
    const rows = table.querySelectorAll('th[scope="row"]');
    expect([...cols].map((th) => th.textContent)).toEqual(
      ROMAN.map((level) => `Final: Nivel ${level}`),
    );
    expect([...rows].map((th) => th.textContent)).toEqual(
      ROMAN.map((level) => `Sugerido: Nivel ${level}`),
    );
    const body = within(table).getAllByRole('row').slice(1);
    expect(body).toHaveLength(5);
    body.forEach((row, i) => {
      const counts = [...row.querySelectorAll('td')].map(
        (td) => td.textContent,
      );
      expect(counts).toEqual(summaryWithData.concordance.matrix[i].map(String));
    });
    // II sugerido, III final: el desacuerdo está en su celda y no en la traspuesta.
    expect(body[1].querySelectorAll('td')[2]).toHaveTextContent('1');
    expect(body[2].querySelectorAll('td')[1]).toHaveTextContent('0');
    // La diagonal se marca con una clase (borde de token), no solo con color de fondo.
    expect(body[1].querySelectorAll('td')[1]).toHaveClass(
      'report-matrix__diag',
    );
  });

  it('R15: junto al kappa siempre van «{pairs} pares» y la nota fija de fiabilidad', async () => {
    setup();
    await loaded();
    const kappa = definitionOf(panelOf(CONCORDANCE), 'Kappa ponderado');
    expect(kappa).toHaveTextContent('0,812');
    expect(kappa).toHaveTextContent('10 pares');
    expect(kappa).toHaveTextContent('Con pocos pares el kappa es poco fiable.');
  });

  it('R15: con un solo par el kappa dice «Sin datos», con el número de pares y la nota', async () => {
    setup({ routes: { [GET_SUMMARY]: summaryResponse(summaryOnePair) } });
    await loaded();
    const kappa = definitionOf(panelOf(CONCORDANCE), 'Kappa ponderado');
    expect(kappa).toHaveTextContent('Sin datos');
    expect(kappa).toHaveTextContent('1 pares');
    expect(kappa).toHaveTextContent('Con pocos pares el kappa es poco fiable.');
    expect(kappa).not.toHaveTextContent(/0,000|^0$/);
  });

  it('R16: cuatro tablas de respaldo con conteo, porcentaje y «Total: {n}»', async () => {
    setup();
    await loaded();
    const panel = panelOf(FALLBACK);
    const table = (name: string) => within(panel).getByRole('table', { name });
    const footOf = (element: HTMLElement) =>
      element.querySelector('tfoot')!.textContent;

    const decisions = table('Decisiones de enfermería');
    expect(columnsOf(decisions).slice(1)).toEqual(['Atenciones', 'Porcentaje']);
    expect(rowsOf(decisions).slice(0, 3)).toEqual([
      ['Validar', '8', '66,6 %'],
      ['Corregir', '2', '16,7 %'],
      ['Triage manual', '2', '16,8 %'],
    ]);
    expect(footOf(decisions)).toBe('Total: 12');

    const suggestions = table('Estado de las sugerencias');
    expect(columnsOf(suggestions).slice(1)).toEqual([
      'Sugerencias',
      'Porcentaje',
    ]);
    expect(rowsOf(suggestions).slice(0, 4)).toEqual([
      ['Correcta', '11', '84,6 %'],
      ['Salida inválida', '1', '7,7 %'],
      ['Tiempo agotado', '1', '7,6 %'],
      ['Fallida', '0', '0,0 %'],
    ]);
    expect(footOf(suggestions)).toBe('Total: 13');

    const providers = table('Proveedor');
    expect(rowsOf(providers).slice(0, 2)).toEqual([
      ['Groq', '9', '81,8 %'],
      ['OpenRouter (respaldo)', '2', '18,2 %'],
    ]);
    expect(footOf(providers)).toBe('Total: 11');

    const guards = table('Safety guards');
    expect(rowsOf(guards).slice(0, 1)).toEqual([['Aplicados', '3', '27,3 %']]);
    expect(footOf(guards)).toBe('Total: 11');
  });

  it('R4: sin datos, la concordancia y el respaldo dicen «Sin datos» en cada null y «0» en cada conteo', async () => {
    setup({ routes: { [GET_SUMMARY]: summaryResponse(summaryEmpty) } });
    await loaded();
    const concordance = panelOf(CONCORDANCE);
    expect(definitionOf(concordance, 'Pares')).toHaveTextContent(/^0$/);
    expect(definitionOf(concordance, 'Acuerdo exacto')).toHaveTextContent(
      /^Sin datos$/,
    );
    expect(definitionOf(concordance, 'Kappa ponderado')).toHaveTextContent(
      /^Sin datos/,
    );
    const matrix = within(concordance).getByRole('table', { name: MATRIX });
    for (const td of matrix.querySelectorAll('td:not(.report-matrix__corner)'))
      expect(td).toHaveTextContent(/^0$/);
    const fallback = panelOf(FALLBACK);
    for (const table of within(fallback).getAllByRole('table')) {
      for (const row of rowsOf(table).filter((r) => r.length === 3)) {
        expect(row[1]).toBe('0');
        expect(row[2]).toBe('Sin datos');
      }
      expect(table.querySelector('tfoot')).toHaveTextContent('Total: 0');
    }
    expect(fallback).not.toHaveTextContent(/%/);
  });

  it('R18: rotula el nivel sugerido «sugerido por la IA» y el final «final (enfermería)», y no muestra nombres, documentos, iniciales ni ids de atención', async () => {
    const { container } = setup();
    await loaded();
    const text = container.textContent;
    expect(text).toContain('sugerido por la IA');
    expect(text).toContain('final (enfermería)');
    // Ningún dato de pacientes ni de personal: ni nombres, ni documentos, ni ids.
    expect(text).not.toMatch(
      /Paciente|Ada Administradora|documento|Cédula|\b\d{8,}\b/i,
    );
    expect(text).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    );
    expect(container.querySelectorAll('a[href*="/atenciones"]')).toHaveLength(
      0,
    );
  });
});

/**
 * jsdom no implementa la descarga: se simulan `URL.createObjectURL`, `URL.revokeObjectURL` y el
 * `click` del enlace, y se guarda lo que la web habría guardado.
 */
function stubDownload() {
  const original = Object.getOwnPropertyDescriptors(URL);
  const blobs: Blob[] = [];
  const create = vi.fn((blob: Blob) => {
    blobs.push(blob);
    return `blob:http://localhost/csv-${blobs.length}`;
  });
  const revoke = vi.fn();
  Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
  const saved: Array<{ href: string; download: string; inDocument: boolean }> =
    [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    saved.push({
      href: this.getAttribute('href')!,
      download: this.download,
      inDocument: document.body.contains(this),
    });
  });
  return {
    blobs,
    create,
    revoke,
    saved,
    restore: () => {
      for (const name of ['createObjectURL', 'revokeObjectURL'] as const) {
        if (name in original) Object.defineProperty(URL, name, original[name]);
        else Reflect.deleteProperty(URL, name);
      }
    },
  };
}

const downloadButton = () =>
  screen.getByRole('button', { name: 'Descargar CSV' });
const CSV_NOTICE =
  'Formato interno, no es el reporte oficial de la Res. 373 / SISPRO.';

describe('F-07-web tablero de reportes: descarga del CSV', () => {
  let download: ReturnType<typeof stubDownload>;
  beforeEach(() => {
    download = stubDownload();
    session.set({ accessToken: TOKEN, expiresAt: inMs(8 * 3600_000) });
  });
  afterEach(() => {
    download.restore();
    session.clear();
    sessionStorage.clear();
  });

  it('R23: «Exportar» muestra «Descargar CSV» con el aviso de formato interno visible y asociado por aria-describedby', async () => {
    setup();
    await loaded();
    const panel = exportPanel();
    const button = within(panel).getByRole('button', {
      name: 'Descargar CSV',
    });
    expect(button).toHaveAccessibleDescription(CSV_NOTICE);
    const notice = within(panel).getByText(CSV_NOTICE);
    expect(notice).toBeVisible();
    expect(notice).not.toHaveClass('visually-hidden');
    // No depende del color: lleva un icono decorativo y el texto.
    expect(
      notice.closest('.report-csv-notice')!.querySelector('svg'),
    ).toHaveAttribute('aria-hidden', 'true');
  });

  it('R23: «Exportar» se pinta también con el resumen en error', async () => {
    setup({ routes: { [GET_SUMMARY]: problem(500) } });
    await screen.findByRole('alert');
    expect(exportPanel()).toBeInTheDocument();
    expect(downloadButton()).toBeInTheDocument();
  });

  it('R24: un clic hace un solo GET /reports/encounters.csv con el periodo aplicado (no el del formulario sin aplicar) y el token, y guarda el cuerpo con el nombre alternativo', async () => {
    clockAt();
    const { net, user } = setup({ routes: { [GET_CSV]: csvResponse() } });
    await loaded();
    // Un periodo escrito pero sin aplicar no cuenta.
    setDate(fromField(), '2026-10-01');
    await user.click(downloadButton());
    await screen.findByText('CSV descargado.');
    expect(net.calls(GET_CSV)).toHaveLength(1);
    const [request] = net.calls(GET_CSV);
    expect(Object.fromEntries(request.query)).toEqual({
      from: '2026-11-05',
      to: '2026-11-11',
    });
    expect(request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    expect(download.saved).toEqual([
      {
        href: 'blob:http://localhost/csv-1',
        download: 'asclepio-atenciones-2026-11-05_2026-11-11.csv',
        inDocument: true,
      },
    ]);
    expect(download.blobs).toHaveLength(1);
    expect(await download.blobs[0].text()).toBe(CSV_BODY);
    // El enlace temporal no se queda en el documento.
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('R24: con sede aplicada envía siteId, y con Content-Disposition legible usa su nombre', async () => {
    clockAt();
    const NAME = 'asclepio-atenciones-2026-11-05_2026-11-11.csv';
    const { net, user } = setup({
      routes: {
        [GET_CSV]: csvResponse({
          disposition: `attachment; filename="servidor-${NAME}"`,
        }),
      },
    });
    await loaded();
    await waitFor(() =>
      expect(siteField().options).toHaveLength(SITES.length + 1),
    );
    await user.selectOptions(siteField(), SITE_NORTE.id);
    await user.click(applyButton());
    await waitFor(() => expect(metaLine()).toHaveTextContent('Sede Norte'));
    await user.click(downloadButton());
    await screen.findByText('CSV descargado.');
    expect(Object.fromEntries(net.calls(GET_CSV)[0].query)).toEqual({
      from: '2026-11-05',
      to: '2026-11-11',
      siteId: SITE_NORTE.id,
    });
    expect(download.saved[0].download).toBe(`servidor-${NAME}`);
  });

  it('R24: un nombre de Content-Disposition con ruta se descarta y se usa el alternativo', async () => {
    clockAt();
    const { user } = setup({
      routes: {
        [GET_CSV]: csvResponse({
          disposition: 'attachment; filename="../../etc/x.csv"',
        }),
      },
    });
    await loaded();
    await user.click(downloadButton());
    await screen.findByText('CSV descargado.');
    expect(download.saved[0].download).toBe(
      'asclepio-atenciones-2026-11-05_2026-11-11.csv',
    );
  });

  it('R25: mientras descarga, otro clic no hace otra petición, el botón lleva aria-busy y se ve «Preparando el CSV…»; un refresco del resumen no la cancela', async () => {
    clockAt();
    const pending = deferred(csvResponse());
    const { net, user } = setup({ routes: { [GET_CSV]: pending.handler } });
    await loaded();
    await user.click(downloadButton());
    await waitFor(() =>
      expect(downloadButton()).toHaveAttribute('aria-busy', 'true'),
    );
    expect(downloadButton()).toBeEnabled();
    expect(within(exportPanel()).getByRole('status')).toHaveTextContent(
      'Preparando el CSV…',
    );
    await user.click(downloadButton());
    await user.dblClick(downloadButton());
    expect(net.calls(GET_CSV)).toHaveLength(1);

    // El refresco automático del resumen no toca la descarga.
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await waitFor(() => expect(net.calls(GET_SUMMARY)).toHaveLength(2));
    expect(downloadButton()).toHaveAttribute('aria-busy', 'true');

    act(() => pending.release());
    await screen.findByText('CSV descargado.');
    expect(downloadButton()).not.toHaveAttribute('aria-busy');
    expect(net.calls(GET_CSV)).toHaveLength(1);
    expect(download.saved).toHaveLength(1);
  });

  it('R26: un 403 da «No tienes permiso para esta acción.» sin «Reintentar», en el panel «Exportar» y sin tocar los indicadores', async () => {
    const { user } = setup({ routes: { [GET_CSV]: problem(403) } });
    await loaded();
    await waitFor(() => expect(cells()[0]).toHaveTextContent('14'));
    await user.click(downloadButton());
    const alert = await within(exportPanel()).findByRole('alert');
    expect(alert).toHaveTextContent('No tienes permiso para esta acción.');
    expect(within(alert).queryByRole('button')).not.toBeInTheDocument();
    expect(cells()[0]).toHaveTextContent('Atenciones14');
    expect(panelOf('De la llegada al triage')).toBeInTheDocument();
    expect(download.saved).toHaveLength(0);
  });

  it('R26: un 422 da el mensaje del periodo, sin «Reintentar»', async () => {
    const { user } = setup({
      routes: {
        [GET_CSV]: problem(422, {
          errors: [{ field: 'to', message: 'bad' }],
        }),
      },
    });
    await loaded();
    await user.click(downloadButton());
    const alert = await within(exportPanel()).findByRole('alert');
    expect(alert).toHaveTextContent(
      'El periodo no es válido: Desde no puede ser posterior a Hasta y el periodo no puede superar 366 días.',
    );
    expect(within(alert).queryByRole('button')).not.toBeInTheDocument();
  });

  it.each([
    ['una caída de red', networkError(), 'No hay conexión con el servidor.'],
    [
      'un 500',
      problem(500),
      'El servidor tuvo un problema. Inténtalo de nuevo.',
    ],
  ])(
    'R26: %s da el error de acción con «Reintentar», que repite la descarga una vez y solo al pulsarlo',
    async (_name, failure, message) => {
      clockAt();
      const { net, user } = setup({ routes: { [GET_CSV]: failure } });
      await loaded();
      await user.click(downloadButton());
      const alert = await within(exportPanel()).findByRole('alert');
      expect(alert).toHaveTextContent(message);
      expect(cells()[0]).toHaveTextContent('Atenciones14');
      // Sin reintento automático, tampoco tras un ciclo de 30 s.
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      expect(net.calls(GET_CSV)).toHaveLength(1);

      net.set(GET_CSV, csvResponse());
      // Un periodo escrito después no cambia el de la repetición.
      setDate(fromField(), '2026-10-01');
      await user.click(
        within(alert).getByRole('button', { name: 'Reintentar' }),
      );
      await screen.findByText('CSV descargado.');
      expect(net.calls(GET_CSV)).toHaveLength(2);
      expect(net.calls(GET_CSV)[1].query.get('from')).toBe('2026-11-05');
      expect(download.saved).toHaveLength(1);
    },
  );

  it('R27: revoca la URL temporal, no guarda el CSV en la caché ni en el almacenamiento y no pinta su contenido', async () => {
    const { user, queryClient } = setup({
      routes: { [GET_CSV]: csvResponse() },
    });
    await loaded();
    await user.click(downloadButton());
    await screen.findByText('CSV descargado.');
    await waitFor(() =>
      expect(download.revoke).toHaveBeenCalledWith(
        'blob:http://localhost/csv-1',
      ),
    );
    expect(download.create).toHaveBeenCalledTimes(1);
    for (const query of queryClient.getQueryCache().getAll())
      expect(query.state.data).not.toBeInstanceOf(Blob);
    for (const mutation of queryClient.getMutationCache().getAll())
      expect(mutation.state.data).toBeUndefined();
    expect(
      queryClient
        .getQueryCache()
        .getAll()
        .some((query) => query.queryKey.includes('csv')),
    ).toBe(false);
    expect(document.body).not.toHaveTextContent('encounter_id');
    expect(JSON.stringify({ ...localStorage })).not.toContain('encounter_id');
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('encounter_id');
  });
});

describe('F-07-web tablero de reportes: accesibilidad y responsive', () => {
  it('R29: cada tabla tiene caption y nombre, vive en un .report-table-wrap enfocable con su nombre, y sus encabezados llevan scope', async () => {
    setup();
    await loaded();
    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(7);
    for (const table of tables) {
      const caption = table.querySelector('caption');
      expect(caption, table.id).not.toBeNull();
      expect(table).toHaveAccessibleName(caption!.textContent);
      const wrap = table.parentElement!;
      expect(wrap).toHaveClass('report-table-wrap');
      expect(wrap).toHaveAttribute('tabindex', '0');
      expect(wrap).toHaveAccessibleName(caption!.textContent);
      for (const th of table.querySelectorAll('th'))
        expect(['col', 'row'], th.outerHTML).toContain(
          th.getAttribute('scope'),
        );
      expect(table.querySelectorAll('th[scope="row"]').length).toBeGreaterThan(
        0,
      );
      expect(table.querySelectorAll('th[scope="col"]').length).toBeGreaterThan(
        0,
      );
    }
    // Los contenedores no duplican los nombres de los paneles como puntos de referencia.
    for (const name of PANEL_NAMES)
      expect(screen.getAllByRole('region', { name })).toHaveLength(1);
  });

  it('R29: el estado vacío y los avisos no dependen solo del color: llevan texto y, si hay icono, es decorativo', async () => {
    setup({ routes: { [GET_SUMMARY]: summaryResponse(summaryEmpty) } });
    await loaded();
    const empty = screen
      .getByText('No hay atenciones en este periodo y sede.')
      .closest('.report-notice') as HTMLElement;
    expect(empty.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    for (const value of document.querySelectorAll('.report-value--empty'))
      expect(value).toHaveTextContent('Sin datos');
  });
});
