import { focusManager, onlineManager } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SITE_ESTE,
  SITE_NORTE,
  SITE_SUR,
  deferred,
  encountersFor,
  fakeApi,
  json,
  networkError,
  problem,
  publicTenantsWith,
  sequence,
  type Handler,
  type RecordedRequest,
} from '../../../test/fakeApi';
import { renderFeature } from '../../../test/renderFeature';
import { watchScrolling } from '../../../test/scroll';
import { reportRoutes } from '../routes';

const LIST = 'GET /api/v1/encounters';
const TENANTS = 'GET /api/v1/public/tenants';
const PRE_REGISTRATIONS = 'GET /api/v1/pre-registrations';
const SITES = [SITE_NORTE, SITE_SUR, SITE_ESTE];

/** Qué pide cada petición de atenciones: un estado sin sede (celda) o la espera de una sede (fila). */
type Key = 'WAITING_TRIAGE' | 'TRIAGED' | 'IN_CARE' | `site:${string}`;

/**
 * `GET /encounters` del dashboard: tres indicadores por estado (`limit=100`, sin sede) y una
 * petición por sede con `status=WAITING_TRIAGE`. `overrides` cambia la respuesta de una sola.
 */
function encounters(overrides: Partial<Record<Key, Handler>> = {}): Handler {
  const handlers: Record<string, Handler> = {
    WAITING_TRIAGE: encountersFor(() => 8),
    TRIAGED: encountersFor(() => 0),
    IN_CARE: encountersFor(() => 0),
    [`site:${SITE_NORTE.id}`]: encountersFor(() => 4),
    [`site:${SITE_SUR.id}`]: encountersFor(() => 3),
    [`site:${SITE_ESTE.id}`]: encountersFor(() => 1),
    ...overrides,
  };
  return (request) => {
    const query = new URL(request.url).searchParams;
    const siteId = query.get('siteId');
    return handlers[siteId ? `site:${siteId}` : query.get('status')!](request);
  };
}

const keyOf = (request: RecordedRequest): string =>
  request.query.get('siteId')
    ? `site:${request.query.get('siteId')}`
    : request.query.get('status')!;
const callsOf = (net: ReturnType<typeof fakeApi>, key: Key) =>
  net.calls(LIST).filter((request) => keyOf(request) === key);
const queryOf = (request: RecordedRequest) => Object.fromEntries(request.query);

function setup({
  routes = {},
  sites = SITES,
}: {
  routes?: Record<string, Handler>;
  sites?: typeof SITES;
} = {}) {
  const net = fakeApi({
    [TENANTS]: json(200, publicTenantsWith(sites)),
    [LIST]: encounters(),
    ...routes,
  });
  const user = userEvent.setup();
  const view = renderFeature(reportRoutes, {
    entries: ['/reportes'],
    role: 'ADMIN',
  });
  return { net, user, ...view };
}

const bar = () => screen.getByRole('region', { name: 'Indicadores' });
const cells = () => within(bar()).getAllByRole('listitem');
const panel = () => screen.getByRole('region', { name: 'Atenciones por sede' });
const strip = () =>
  screen.getByRole('region', { name: 'Indicadores y reportes' });
/** Espera a que la tabla pinte una fila por sede. */
const table = () => screen.findByRole('table', { name: 'Atenciones por sede' });
/** La fila de una sede y su celda de cifra. */
const rowOf = (name: string) =>
  screen.getByRole('cell', { name }).closest('tr') as HTMLElement;
const figureOf = (name: string) => within(rowOf(name)).getAllByRole('cell')[1];
/** `b` aparece después de `a` en el documento. */
const follows = (a: Node, b: Node) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
});

describe('UI-02-web dashboard de administración', () => {
  describe('estructura', () => {
    it('R3: encabezado con un h1 y su descripción, región «Indicadores» con tres celdas y sin filtro, panel con h2 y franja «pendiente», en ese orden de documento y sin columna lateral', async () => {
      const { container } = setup();
      await table();
      const title = screen.getByRole('heading', { level: 1, name: 'Reportes' });
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(title.nextElementSibling).toHaveTextContent(
        'Resumen de las atenciones por estado y por sede.',
      );

      const region = bar();
      expect(within(region).getAllByRole('listitem')).toHaveLength(3);
      expect(within(region).queryByLabelText('Sede')).not.toBeInTheDocument();
      expect(region.querySelector('select')).toBeNull();
      expect(region).not.toHaveClass('summary--filter');

      const main = panel();
      const heading = within(main).getByRole('heading', {
        level: 2,
        name: 'Atenciones por sede',
      });
      expect(heading.querySelector('svg')).toBeNull();
      const pending = strip();
      expect(
        within(pending).getByRole('heading', {
          level: 2,
          name: 'Indicadores y reportes',
        }),
      ).toBeInTheDocument();
      expect(follows(title, region)).toBe(true);
      expect(follows(region, main)).toBe(true);
      expect(follows(main, pending)).toBe(true);
      const stack = container.querySelector('.dashboard > .stack');
      expect(
        [...stack!.children].map((zone) => zone.tagName.toLowerCase()),
      ).toEqual(['header', 'section', 'section', 'section']);
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    });

    it('R34: la barra escribe --cells = 3', async () => {
      setup();
      await table();
      expect(bar().style.getPropertyValue('--cells')).toBe('3');
    });

    it('R38: la nota «Se actualiza cada 30 s» va en la cabecera del panel, a la derecha del h2, como texto plano con punto decorativo', async () => {
      setup();
      await table();
      const note = within(panel()).getByText('Se actualiza cada 30 s');
      expect(note.closest('.panel__head')).not.toBeNull();
      expect(note.closest('.panel__meta')).not.toBeNull();
      expect(
        follows(within(panel()).getByRole('heading', { level: 2 }), note),
      ).toBe(true);
      expect(note).toHaveClass('live');
      expect(note).not.toHaveAttribute('role');
      expect(note.closest('[aria-live]')).toBeNull();
      expect(note.querySelector('button, a, input')).toBeNull();
      expect(
        screen.getAllByRole('button', { name: 'Actualizar' }),
      ).toHaveLength(1);
    });

    it('R2: «Actualizar» es la única acción del encabezado y es un botón secundario', async () => {
      setup();
      await table();
      const header = document.querySelector(
        'header.page-header',
      ) as HTMLElement;
      expect(
        within(header).getByRole('button', { name: 'Actualizar' }),
      ).toHaveClass('button', 'button--secondary');
      expect(header.querySelectorAll('button, a')).toHaveLength(1);
    });
  });

  describe('indicadores por estado', () => {
    it('R15: tres indicadores, uno por estado, con una petición cada uno, sin sede y sin filtro', async () => {
      const { net } = setup();
      await table();
      await waitFor(() =>
        expect(cells().map((cell) => cell.textContent)).toEqual([
          'En espera de triage8',
          'Clasificadas0',
          'En atención0',
        ]),
      );
      for (const status of ['WAITING_TRIAGE', 'TRIAGED', 'IN_CARE'] as const) {
        const calls = callsOf(net, status);
        expect(calls).toHaveLength(1);
        expect(queryOf(calls[0])).toEqual({ status, limit: '100' });
      }
    });

    it('R21: si falla un indicador, solo su celda muestra el error y su «Reintentar» repite solo esa petición', async () => {
      const { net, user } = setup({
        routes: { [LIST]: encounters({ TRIAGED: problem(500) }) },
      });
      await table();
      const triaged = cells()[1];
      await waitFor(() =>
        expect(triaged).toHaveTextContent('No se pudo cargar'),
      );
      expect(cells()[0]).toHaveTextContent('En espera de triage8');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      net.set(LIST, encounters({ TRIAGED: encountersFor(() => 2) }));
      await user.click(
        within(triaged).getByRole('button', {
          name: 'Reintentar: Clasificadas',
        }),
      );
      await waitFor(() =>
        expect(cells()[1]).toHaveTextContent('Clasificadas2'),
      );
      expect(callsOf(net, 'TRIAGED')).toHaveLength(2);
      expect(net.calls(LIST)).toHaveLength(7);
    });

    it('R22: un 403 de un indicador deja solo esa celda «Sin permiso» y sin «Reintentar»', async () => {
      setup({ routes: { [LIST]: encounters({ IN_CARE: problem(403) }) } });
      await table();
      const inCare = cells()[2];
      await waitFor(() => expect(inCare).toHaveTextContent('Sin permiso'));
      expect(within(inCare).queryByRole('button')).not.toBeInTheDocument();
      expect(cells()[0]).toHaveTextContent('En espera de triage8');
    });
  });

  describe('atenciones por sede', () => {
    it('R17: tabla simple con Sede y «En espera de triage», una fila por sede en el orden de las sedes y la cifra a la derecha', async () => {
      setup();
      const tabla = await table();
      expect(tabla).toHaveClass('data-table', 'data-table--simple');
      const headers = within(tabla).getAllByRole('columnheader');
      expect(headers.map((header) => header.textContent)).toEqual([
        'Sede',
        'En espera de triage',
      ]);
      expect(headers[1]).toHaveClass('num');
      await waitFor(() =>
        expect(
          within(tabla)
            .getAllByRole('row')
            .slice(1)
            .map((row) =>
              within(row)
                .getAllByRole('cell')
                .map((cell) => cell.textContent),
            ),
        ).toEqual([
          ['Sede Norte', '4'],
          ['Sede Sur', '3'],
          ['Sede Este', '1'],
        ]),
      );
      expect(rowOf('Sede Norte').querySelector('.cell-name')).toHaveTextContent(
        'Sede Norte',
      );
      expect(figureOf('Sede Norte')).toHaveClass('num');
      // No se apila: sin etiquetas de celda ni columna de acción.
      expect(tabla.querySelectorAll('[data-label]')).toHaveLength(0);
    });

    it('R7: una petición por indicador y una por sede, sin ninguna por fila de paciente, y la caché solo guarda { count, capped }', async () => {
      const { net, queryClient } = setup();
      await table();
      await waitFor(() => expect(figureOf('Sede Este')).toHaveTextContent('1'));
      expect(net.calls(LIST)).toHaveLength(6);
      for (const site of SITES) {
        const calls = callsOf(net, `site:${site.id}`);
        expect(calls).toHaveLength(1);
        expect(queryOf(calls[0])).toEqual({
          status: 'WAITING_TRIAGE',
          siteId: site.id,
          limit: '100',
        });
      }
      // Las sedes se piden una vez y ninguna petición lleva un identificador de atención.
      expect(net.calls(TENANTS)).toHaveLength(1);
      expect(
        net.requests.some((r) => /\/encounters\/|clinical/.test(r.path)),
      ).toBe(false);
      const cached = queryClient
        .getQueryCache()
        .getAll()
        .filter((query) => query.queryKey[0] === 'encounters');
      expect(cached).toHaveLength(6);
      for (const query of cached) {
        const data = query.state.data as Record<string, unknown>;
        expect(Object.keys(data).sort()).toEqual(['capped', 'count']);
      }
    });

    it('R8: con 0, 99 y 100 atenciones las filas muestran la cifra exacta o «100+» con «Al menos 100»', async () => {
      setup({
        routes: {
          [LIST]: encounters({
            [`site:${SITE_NORTE.id}`]: encountersFor(() => 0),
            [`site:${SITE_SUR.id}`]: encountersFor(() => 99),
            [`site:${SITE_ESTE.id}`]: encountersFor(() => 100),
          }),
        },
      });
      await table();
      await waitFor(() =>
        expect(figureOf('Sede Este')).toHaveTextContent('100+'),
      );
      expect(figureOf('Sede Norte')).toHaveTextContent(/^0$/);
      expect(figureOf('Sede Sur')).toHaveTextContent(/^99$/);
      expect(
        within(figureOf('Sede Este')).getByText('Al menos 100'),
      ).toBeInTheDocument();
      expect(within(figureOf('Sede Sur')).queryByText(/Al menos/)).toBeNull();
    });

    it.each([
      [3, '3 sedes'],
      [1, '1 sede'],
    ])(
      'R17: con %i sedes el pie dice «%s» y «Ver todas las atenciones» lleva a /atenciones',
      async (count, text) => {
        setup({ sites: SITES.slice(0, count) });
        await table();
        const foot = panel().querySelector('.panel__foot') as HTMLElement;
        expect(foot.firstElementChild).toHaveTextContent(
          new RegExp(`^${text}$`),
        );
        const link = within(foot).getByRole('link', {
          name: 'Ver todas las atenciones',
        });
        expect(link).toHaveAttribute('href', '/atenciones');
        expect(link).toHaveClass('link-more');
        expect(link.querySelector('svg')).toHaveAttribute(
          'aria-hidden',
          'true',
        );
        expect(foot.lastElementChild).toBe(link);
        expect(within(await table()).getAllByRole('row')).toHaveLength(
          count + 1,
        );
      },
    );

    it('R19: mientras cargan las sedes el panel es un role="status" y las celdas siguen su camino', async () => {
      const sites = deferred(json(200, publicTenantsWith(SITES)));
      const { net } = setup({ routes: { [TENANTS]: sites.handler } });
      expect(screen.getAllByRole('status')).toHaveLength(1);
      expect(screen.getByRole('status')).toHaveTextContent(
        'Cargando las sedes…',
      );
      expect(panel()).toContainElement(screen.getByRole('status'));
      expect(panel().querySelector('.panel__foot')).toBeNull();
      await waitFor(() =>
        expect(cells()[0]).toHaveTextContent('En espera de triage8'),
      );
      // Aún no hay sedes, así que todavía no hay una petición por sede.
      expect(net.calls(LIST)).toHaveLength(3);
      act(() => sites.release());
      await table();
      await waitFor(() => expect(figureOf('Sede Este')).toHaveTextContent('1'));
      expect(net.calls(LIST)).toHaveLength(6);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('R19: cada fila carga por separado, con un esqueleto y texto oculto, sin afectar a las demás ni a las celdas', async () => {
      const este = deferred(encountersFor(() => 1));
      setup({
        routes: {
          [LIST]: encounters({ [`site:${SITE_ESTE.id}`]: este.handler }),
        },
      });
      await table();
      await waitFor(() =>
        expect(figureOf('Sede Norte')).toHaveTextContent('4'),
      );
      expect(figureOf('Sede Sur')).toHaveTextContent('3');
      const loading = figureOf('Sede Este');
      expect(loading.querySelector('[aria-busy="true"]')).not.toBeNull();
      expect(loading.querySelector('.skeleton')).not.toBeNull();
      expect(loading).toHaveTextContent('Cargando indicador…');
      expect(cells()[0]).toHaveTextContent('En espera de triage8');
      // Las filas no son regiones vivas: ningún status ni alert por fila.
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      act(() => este.release());
      await waitFor(() => expect(figureOf('Sede Este')).toHaveTextContent('1'));
      expect(figureOf('Sede Este').querySelector('.skeleton')).toBeNull();
    });

    it('R20: sin sedes muestra el vacío «El tenant no tiene sedes registradas.» sin tabla ni pie, y las celdas siguen', async () => {
      const { net } = setup({ sites: [] });
      const message = await screen.findByText(
        'El tenant no tiene sedes registradas.',
      );
      const empty = message.closest('.panel-state') as HTMLElement;
      expect(empty).not.toHaveAttribute('role');
      expect(empty.querySelector('.panel-state__icon svg')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(panel().querySelector('.panel__foot')).toBeNull();
      await waitFor(() =>
        expect(cells()[0]).toHaveTextContent('En espera de triage8'),
      );
      // Sin sedes no hay peticiones por sede: solo las tres de los indicadores.
      expect(net.calls(LIST)).toHaveLength(3);
    });

    it('R21: si fallan las sedes, el panel muestra su error con «Reintentar», que repite solo las sedes, y las celdas no cambian', async () => {
      const { net, user } = setup({ routes: { [TENANTS]: problem(500) } });
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('No se pudieron cargar las sedes.');
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(panel().querySelector('.panel__foot')).toBeNull();
      await waitFor(() =>
        expect(cells().map((cell) => cell.textContent)).toEqual([
          'En espera de triage8',
          'Clasificadas0',
          'En atención0',
        ]),
      );

      net.set(TENANTS, json(200, publicTenantsWith(SITES)));
      await user.click(
        within(alert).getByRole('button', { name: 'Reintentar' }),
      );
      await table();
      expect(net.calls(TENANTS)).toHaveLength(2);
      await waitFor(() => expect(figureOf('Sede Este')).toHaveTextContent('1'));
      // Las tres celdas no se pidieron de nuevo: solo se sumaron las tres filas.
      for (const status of ['WAITING_TRIAGE', 'TRIAGED', 'IN_CARE'] as const) {
        expect(callsOf(net, status)).toHaveLength(1);
      }
    });

    it('R22: un 403 de las sedes deja el panel «Sin permiso», sin tabla ni «Reintentar»', async () => {
      setup({ routes: { [TENANTS]: problem(403) } });
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(
        'No tienes permiso para ver esta página.',
      );
      expect(within(alert).queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('R21: si falla una sede, solo su fila muestra «No se pudo cargar» con «Reintentar: {sede}», que repite solo esa petición', async () => {
      const { net, user } = setup({
        routes: {
          [LIST]: encounters({ [`site:${SITE_ESTE.id}`]: problem(500) }),
        },
      });
      await table();
      await waitFor(() =>
        expect(figureOf('Sede Norte')).toHaveTextContent('4'),
      );
      const failed = figureOf('Sede Este');
      await waitFor(() =>
        expect(failed).toHaveTextContent('No se pudo cargar'),
      );
      const badge = within(failed).getByText('No se pudo cargar');
      expect(badge).toHaveClass('badge', 'tone--error');
      expect(badge.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      expect(figureOf('Sede Sur')).toHaveTextContent('3');
      expect(cells()[0]).toHaveTextContent('En espera de triage8');
      // Sin región viva por fila: el error vive en su celda.
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      // Hay un «Reintentar» por sede con error y su nombre dice cuál es.
      expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();

      net.set(LIST, encounters());
      await user.click(
        within(failed).getByRole('button', { name: 'Reintentar: Sede Este' }),
      );
      await waitFor(() =>
        expect(figureOf('Sede Este')).toHaveTextContent(/^1$/),
      );
      expect(callsOf(net, `site:${SITE_ESTE.id}`)).toHaveLength(2);
      expect(callsOf(net, `site:${SITE_NORTE.id}`)).toHaveLength(1);
      expect(callsOf(net, `site:${SITE_SUR.id}`)).toHaveLength(1);
      expect(callsOf(net, 'WAITING_TRIAGE')).toHaveLength(1);
    });

    it('R22: un 403 de una sede deja su fila «Sin permiso», con icono, sin cifra ni «Reintentar»', async () => {
      setup({
        routes: {
          [LIST]: encounters({ [`site:${SITE_SUR.id}`]: problem(403) }),
        },
      });
      await table();
      await waitFor(() =>
        expect(figureOf('Sede Norte')).toHaveTextContent('4'),
      );
      const denied = figureOf('Sede Sur');
      await waitFor(() => expect(denied).toHaveTextContent('Sin permiso'));
      const badge = within(denied).getByText('Sin permiso');
      expect(badge).toHaveClass('badge', 'tone--error');
      expect(badge.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      expect(within(denied).queryByRole('button')).not.toBeInTheDocument();
      expect(denied).not.toHaveTextContent(/\d/);
      expect(figureOf('Sede Este')).toHaveTextContent('1');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('franja «pendiente»', () => {
    it('R18: nombra la funcionalidad de F-07 y no tiene acciones, cifras de reportes ni gráficos', async () => {
      const { net } = setup();
      await table();
      const pending = strip();
      expect(pending).toHaveTextContent('Indicadores y reportes');
      expect(pending).toHaveTextContent(
        'Aquí aparecerán los tiempos, el cumplimiento, la concordancia y la descarga del CSV.',
      );
      expect(within(pending).getByText('Próximamente')).toHaveClass('badge');
      expect(
        within(pending).getByText('Esta funcionalidad llega en F-07.'),
      ).toBeInTheDocument();
      expect(
        pending.querySelectorAll(
          'button, a, input, select, textarea, form, canvas, img, [role="img"], [role="progressbar"], [role="meter"]',
        ),
      ).toHaveLength(0);
      expect(pending.textContent.replace('F-07', '')).not.toMatch(/\d/);
      // Es estática: ninguna petición propia.
      expect(
        net.requests.every((r) =>
          ['/api/v1/encounters', '/api/v1/public/tenants'].includes(r.path),
        ),
      ).toBe(true);
    });
  });

  describe('refresco automático', () => {
    it('R24: cada 30 s con la pestaña visible se repiten los tres conteos y el de cada sede, no las sedes, y «Actualizar» los repite todos', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup();
      await table();
      await waitFor(() => expect(net.calls(LIST)).toHaveLength(6));
      expect(net.calls(TENANTS)).toHaveLength(1);

      const keys: Key[] = [
        'WAITING_TRIAGE',
        'TRIAGED',
        'IN_CARE',
        ...SITES.map((site) => `site:${site.id}` as const),
      ];
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() => expect(net.calls(LIST)).toHaveLength(12));
      for (const key of keys) expect(callsOf(net, key)).toHaveLength(2);
      expect(net.calls(TENANTS)).toHaveLength(1);

      await act(async () => {
        screen.getByRole('button', { name: 'Actualizar' }).click();
        await vi.advanceTimersByTimeAsync(0);
      });
      await waitFor(() => expect(net.calls(LIST)).toHaveLength(18));
      for (const key of keys) expect(callsOf(net, key)).toHaveLength(3);
      // Las sedes solo se vuelven a pedir con su «Reintentar»; tampoco hay preregistros.
      expect(net.calls(TENANTS)).toHaveLength(1);
      expect(net.calls(PRE_REGISTRATIONS)).toHaveLength(0);
    });

    it('R25: ni el foco de la ventana ni la reconexión repiten las peticiones', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup();
      await table();
      await waitFor(() => expect(net.calls(LIST)).toHaveLength(6));
      await act(async () => {
        focusManager.setFocused(false);
        onlineManager.setOnline(false);
        focusManager.setFocused(true);
        onlineManager.setOnline(true);
        await vi.advanceTimersByTimeAsync(20);
      });
      expect(net.calls(LIST)).toHaveLength(6);
      expect(net.calls(TENANTS)).toHaveLength(1);
    });

    it('R25: con la pestaña oculta no se repite ninguna petición', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup();
      await table();
      await waitFor(() => expect(net.calls(LIST)).toHaveLength(6));
      const visibility = vi
        .spyOn(document, 'visibilityState', 'get')
        .mockReturnValue('hidden');
      await act(() => vi.advanceTimersByTimeAsync(90_000));
      expect(net.calls(LIST)).toHaveLength(6);
      expect(net.calls(TENANTS)).toHaveLength(1);
      visibility.mockRestore();
    });

    it('R22: un 403 detiene el intervalo de esa sede y el de las demás peticiones sigue', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup({
        routes: {
          [LIST]: encounters({ [`site:${SITE_SUR.id}`]: problem(403) }),
        },
      });
      await table();
      await waitFor(() =>
        expect(figureOf('Sede Sur')).toHaveTextContent('Sin permiso'),
      );
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() =>
        expect(callsOf(net, `site:${SITE_NORTE.id}`)).toHaveLength(2),
      );
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() =>
        expect(callsOf(net, `site:${SITE_NORTE.id}`)).toHaveLength(3),
      );
      await waitFor(() =>
        expect(callsOf(net, 'WAITING_TRIAGE')).toHaveLength(3),
      );
      await waitFor(() =>
        expect(callsOf(net, `site:${SITE_ESTE.id}`)).toHaveLength(3),
      );
      expect(callsOf(net, `site:${SITE_SUR.id}`)).toHaveLength(1);
    });

    it('R21: un refresco fallido de una sede sustituye su cifra por el error y el siguiente ciclo vuelve a pedir', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup();
      await table();
      await waitFor(() => expect(figureOf('Sede Este')).toHaveTextContent('1'));
      net.set(LIST, encounters({ [`site:${SITE_ESTE.id}`]: networkError() }));
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() =>
        expect(figureOf('Sede Este')).toHaveTextContent('No se pudo cargar'),
      );
      expect(figureOf('Sede Norte')).toHaveTextContent('4');

      // El error no detiene el intervalo: el siguiente ciclo repite la petición solo.
      net.set(LIST, encounters());
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() =>
        expect(figureOf('Sede Este')).toHaveTextContent(/^1$/),
      );
      expect(callsOf(net, `site:${SITE_ESTE.id}`)).toHaveLength(3);
    });

    it('R23: durante un refresco se conservan las cifras y la tabla, sin estado de carga, y «Actualizar» no se deshabilita', async () => {
      const norte = deferred(encountersFor(() => 5));
      const waiting = deferred(encountersFor(() => 9));
      const { user } = setup({
        routes: {
          [LIST]: sequence(
            // Las seis primeras respuestas son la carga inicial; las siguientes, el refresco.
            ...Array.from({ length: 6 }, () => encounters()),
            encounters({
              [`site:${SITE_NORTE.id}`]: norte.handler,
              WAITING_TRIAGE: waiting.handler,
            }),
          ),
        },
      });
      await table();
      await waitFor(() =>
        expect(figureOf('Sede Norte')).toHaveTextContent('4'),
      );
      await waitFor(() =>
        expect(cells()[0]).toHaveTextContent('En espera de triage8'),
      );
      const button = screen.getByRole('button', { name: 'Actualizar' });
      expect(button).not.toHaveAttribute('aria-busy');
      const norteCell = figureOf('Sede Norte');

      await user.click(button);
      await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'));
      expect(button).toBeEnabled();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(figureOf('Sede Norte')).toHaveTextContent('4');
      expect(figureOf('Sede Norte').querySelector('.skeleton')).toBeNull();
      expect(cells()[0]).toHaveTextContent('En espera de triage8');
      expect(cells()[0]).not.toHaveAttribute('aria-busy');

      act(() => {
        norte.release();
        waiting.release();
      });
      await waitFor(() =>
        expect(figureOf('Sede Norte')).toHaveTextContent('5'),
      );
      await waitFor(() =>
        expect(cells()[0]).toHaveTextContent('En espera de triage9'),
      );
      await waitFor(() => expect(button).not.toHaveAttribute('aria-busy'));
      // La cifra se actualizó en el mismo nodo: la fila no se remontó.
      expect(figureOf('Sede Norte')).toBe(norteCell);
    });

    it('R37: un refresco conserva el enlace de pie enfocado, los mismos nodos de las filas y «Actualizar» sin deshabilitar, sin desplazamiento programático', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const scrolling = watchScrolling();
      const { net } = setup();
      await table();
      await waitFor(() => expect(figureOf('Sede Este')).toHaveTextContent('1'));
      const link = screen.getByRole('link', {
        name: 'Ver todas las atenciones',
      });
      act(() => link.focus());
      expect(link).toHaveFocus();
      const rows = SITES.map((site) => rowOf(site.name));
      const figures = SITES.map((site) => figureOf(site.name));
      const refresh = screen.getByRole('button', { name: 'Actualizar' });
      const body = panel().querySelector('.panel__body');

      net.set(
        LIST,
        encounters({
          [`site:${SITE_NORTE.id}`]: encountersFor(() => 6),
          [`site:${SITE_ESTE.id}`]: encountersFor(() => 0),
        }),
      );
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() =>
        expect(figureOf('Sede Norte')).toHaveTextContent(/^6$/),
      );
      await waitFor(() =>
        expect(figureOf('Sede Este')).toHaveTextContent(/^0$/),
      );

      expect(
        screen.getByRole('link', { name: 'Ver todas las atenciones' }),
      ).toBe(link);
      expect(link).toHaveFocus();
      SITES.forEach((site, index) => {
        expect(rowOf(site.name)).toBe(rows[index]);
        expect(figureOf(site.name)).toBe(figures[index]);
      });
      expect(screen.getByRole('button', { name: 'Actualizar' })).toBe(refresh);
      expect(refresh).toBeEnabled();
      expect(panel().querySelector('.panel__body')).toBe(body);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(scrolling.calls()).toBe(0);
      scrolling.restore();
    });
  });

  describe('privacidad y permisos', () => {
    it('R26: no muestra ningún dato de pacientes ni documentos, solo cifras por estado y por sede', async () => {
      setup();
      await table();
      await waitFor(() => expect(figureOf('Sede Este')).toHaveTextContent('1'));
      // Las atenciones sintéticas traen nombre y documento: ninguno llega a la pantalla.
      expect(document.body.textContent).not.toMatch(
        /Paciente ficticio|Cédula|documento|sugerencia|inteligencia artificial|\bIA\b/i,
      );
      expect(document.body.textContent).not.toMatch(/\b1000000\d{3}\b/);
    });

    it('R28: pide solo las sedes y las atenciones, y ninguna petición a preregistros, detalle ni captura clínica', async () => {
      const { net } = setup();
      await table();
      await waitFor(() => expect(net.calls(LIST)).toHaveLength(6));
      const endpoints = [
        ...new Set(net.requests.map((r) => `${r.method} ${r.path}`)),
      ].sort();
      expect(endpoints).toEqual([LIST, TENANTS].sort());
      expect(net.calls(PRE_REGISTRATIONS)).toHaveLength(0);
      expect(
        net.requests.some((r) => /\/encounters\/|clinical/.test(r.path)),
      ).toBe(false);
    });
  });
});
