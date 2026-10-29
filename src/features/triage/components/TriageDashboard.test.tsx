import { focusManager, onlineManager } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatDateBogota,
  formatTimeBogota,
} from '../../../shared/lib/datetime';
import {
  SITE_NORTE,
  SITE_SUR,
  deferred,
  encounterSummary,
  encountersFor,
  fakeApi,
  json,
  networkError,
  nnPatient,
  patient,
  problem,
  publicTenants,
  sequence,
  type Handler,
  type RecordedRequest,
} from '../../../test/fakeApi';
import { renderFeature } from '../../../test/renderFeature';
import { watchScrolling } from '../../../test/scroll';
import { norm } from '../../../test/text';
import { triageRoutes } from '../routes';

const LIST = 'GET /api/v1/encounters';
const TENANTS = 'GET /api/v1/public/tenants';
const PRE_REGISTRATIONS = 'GET /api/v1/pre-registrations';

const LAURA = encounterSummary();
const DANIEL = encounterSummary({
  id: 'e0e0e0e0-0000-4000-8000-000000000002',
  siteId: SITE_SUR.id,
  siteName: SITE_SUR.name,
  arrivalAt: '2026-10-27T14:20:00.000Z',
  patient: {
    ...patient,
    id: 'b0b0b0b0-0000-4000-8000-000000000020',
    fullName: 'Daniel Castro Mora',
    documentNumber: '1019876543',
  },
});
const NN = encounterSummary({
  id: 'e0e0e0e0-0000-4000-8000-000000000003',
  arrivalAt: '2026-10-27T14:10:00.000Z',
  patient: nnPatient,
});
/** Una llegada nueva: la bandeja va de la más reciente a la más antigua, así que entra arriba. */
const ARRIVAL = encounterSummary({
  id: 'e0e0e0e0-0000-4000-8000-000000000004',
  arrivalAt: '2026-10-27T14:45:00.000Z',
  patient: {
    ...patient,
    id: 'b0b0b0b0-0000-4000-8000-000000000021',
    fullName: 'Sofía Martínez Díaz',
    documentNumber: '52876543',
  },
});
const ROWS = [LAURA, DANIEL, NN];

function setup({
  routes = {},
  entries = ['/triage'],
}: { routes?: Record<string, Handler>; entries?: string[] } = {}) {
  const net = fakeApi({
    [TENANTS]: json(200, publicTenants),
    [LIST]: json(200, { items: ROWS }),
    ...routes,
  });
  const user = userEvent.setup();
  const view = renderFeature(triageRoutes, { entries, role: 'NURSE' });
  return { net, user, ...view };
}

const bar = () => screen.getByRole('region', { name: 'Indicadores' });
const cell = () => within(bar()).getByRole('listitem');
const panel = () =>
  screen.getByRole('region', { name: 'Atenciones pendientes' });
const queryOf = (request: RecordedRequest) => Object.fromEntries(request.query);
const lastQuery = (net: ReturnType<typeof fakeApi>) =>
  queryOf(net.calls(LIST).at(-1)!);
/** Espera a que la bandeja pinte filas. */
const rows = () => screen.findByRole('cell', { name: /Laura Gómez Pérez/ });
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

describe('UI-02-web dashboard de enfermería', () => {
  describe('estructura', () => {
    it('R3: encabezado con un h1 y su descripción, región «Indicadores» con una celda y el filtro, panel con h2, en ese orden de documento y sin columna lateral', async () => {
      const { container } = setup();
      await rows();
      const title = screen.getByRole('heading', { level: 1, name: 'Triage' });
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(title.nextElementSibling).toHaveTextContent(
        'Registra la información clínica de las atenciones en espera de triage.',
      );

      const region = bar();
      const list = within(region).getByRole('list');
      expect(within(list).getAllByRole('listitem')).toHaveLength(1);
      expect(list).not.toContainElement(within(region).getByLabelText('Sede'));

      const main = panel();
      const heading = within(main).getByRole('heading', {
        level: 2,
        name: 'Atenciones pendientes',
      });
      expect(heading.querySelector('svg')).toBeNull();
      expect(follows(title, region)).toBe(true);
      expect(follows(region, main)).toBe(true);
      const stack = container.querySelector('.dashboard > .stack');
      expect(
        [...stack!.children].map((zone) => zone.tagName.toLowerCase()),
      ).toEqual(['header', 'section', 'section']);
      // Sin columna lateral ni el panel de texto estático «Espacio de enfermería».
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
      expect(container.querySelector('aside')).toBeNull();
      expect(
        screen.queryByText('Espacio de enfermería'),
      ).not.toBeInTheDocument();
    });

    it('R34: la barra escribe --cells = 1 y deja el filtro como segunda columna', async () => {
      setup();
      await rows();
      expect(bar().style.getPropertyValue('--cells')).toBe('1');
      expect(bar()).toHaveClass('summary--filter');
      expect(within(bar()).getAllByRole('listitem')).toHaveLength(1);
    });

    it('R38: la nota «Se actualiza cada 30 s» va en la cabecera del panel, a la derecha del h2, como texto plano con punto decorativo', async () => {
      setup();
      await rows();
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
      await rows();
      const header = document.querySelector(
        'header.page-header',
      ) as HTMLElement;
      const refresh = within(header).getByRole('button', {
        name: 'Actualizar',
      });
      expect(refresh).toHaveClass('button', 'button--secondary');
      expect(header.querySelectorAll('button, a')).toHaveLength(1);
    });
  });

  describe('indicador derivado de la bandeja', () => {
    it('R13: la cifra sale de la propia bandeja, sin petición adicional, y sigue la sede', async () => {
      const { net, user } = setup();
      await rows();
      expect(cell()).toHaveTextContent('En espera de triage3');
      // Una sola petición de atenciones: la bandeja (limit=50, no la de conteo con limit=100).
      expect(net.calls(LIST)).toHaveLength(1);
      expect(lastQuery(net)).toEqual({
        status: 'WAITING_TRIAGE',
        limit: '50',
        offset: '0',
      });

      const select = within(bar()).getByLabelText('Sede');
      await waitFor(() => expect(select).toBeEnabled());
      net.set(LIST, json(200, { items: [DANIEL] }));
      await user.selectOptions(select, 'Sede Sur');
      await waitFor(() =>
        expect(cell()).toHaveTextContent('En espera de triage1'),
      );
      expect(net.calls(LIST)).toHaveLength(2);
      expect(lastQuery(net)).toEqual({
        status: 'WAITING_TRIAGE',
        siteId: SITE_SUR.id,
        limit: '50',
        offset: '0',
      });
      expect(net.calls(PRE_REGISTRATIONS)).toHaveLength(0);
    });

    it.each([
      [0, 49, '49', false],
      [0, 50, '50+', true],
      [0, 120, '50+', true],
      [50, 57, '57', false],
      [50, 120, '100+', true],
    ])(
      'R8: con offset %i y %i atenciones en el servidor la cifra es «%s» (con «Al menos»: %s)',
      async (offset, existing, shown, capped) => {
        setup({
          entries: [`/triage?offset=${offset}`],
          routes: { [LIST]: encountersFor(() => existing) },
        });
        await screen.findAllByRole('link', {
          name: 'Capturar información clínica',
        });
        expect(cell()).toHaveTextContent(`En espera de triage${shown}`);
        if (capped) {
          const count = shown.replace('+', '');
          expect(
            within(cell()).getByText(`Al menos ${count}`),
          ).toBeInTheDocument();
        } else {
          expect(
            within(cell()).queryByText(/Al menos/),
          ).not.toBeInTheDocument();
        }
      },
    );
  });

  describe('tabla y paginación', () => {
    it('R14: la tabla tiene Paciente, Sede y Llegada, el documento solo si existe, la hora en <time> con la fecha debajo y el enlace suave pequeño a la captura, sin insignia de estado ni h3 por fila', async () => {
      setup();
      const name = await rows();
      const table = screen.getByRole('table', {
        name: 'Atenciones pendientes',
      });
      expect(
        within(table)
          .getAllByRole('columnheader')
          .map((header) => header.textContent),
      ).toEqual(['Paciente', 'Sede', 'Llegada', 'Acción']);
      expect(
        within(table).getByRole('columnheader', { name: 'Acción' })
          .firstElementChild,
      ).toHaveClass('visually-hidden');

      const laura = name.closest('tr') as HTMLElement;
      expect(within(laura).getByText('Laura Gómez Pérez')).toHaveClass(
        'cell-name',
      );
      expect(
        within(laura).getByText('Cédula de ciudadanía 1032456789'),
      ).toHaveClass('cell-sub');
      expect(within(laura).getByText('Sede Norte')).toBeInTheDocument();
      const time = laura.querySelector('time')!;
      expect(time).toHaveAttribute('dateTime', LAURA.arrivalAt);
      expect(norm(time.textContent)).toBe(
        norm(formatTimeBogota(LAURA.arrivalAt)),
      );
      expect(time.textContent).not.toMatch(/\d:\d{2}:\d{2}/);
      expect(time.nextElementSibling).toHaveClass('cell-sub');
      expect(time.nextElementSibling).toHaveTextContent(
        formatDateBogota(LAURA.arrivalAt),
      );

      const link = within(laura).getByRole('link', {
        name: 'Capturar información clínica',
      });
      expect(link).toHaveAttribute('href', `/triage/${LAURA.id}?offset=0`);
      expect(link).toHaveClass('button', 'button--soft', 'button--sm');
      expect(link).not.toHaveClass('button--secondary');
      // Se asocia a su fila con aria-describedby: apunta a la celda del nombre.
      expect(name.id).not.toBe('');
      expect(link).toHaveAttribute('aria-describedby', name.id);
      expect(link).toHaveAccessibleDescription(/Laura Gómez Pérez/);

      // Un NN no inventa documento: la celda del nombre no tiene línea de apoyo.
      const nn = screen
        .getAllByRole('cell', { name: /Paciente NN/ })[0]
        .closest('tr') as HTMLElement;
      expect(within(nn).getByText('Paciente NN')).toHaveClass('cell-name');
      expect(nn.querySelectorAll('.cell-sub')).toHaveLength(1);
      expect(nn.querySelector('.cell-main .cell-sub')).toBeNull();

      // Sin insignia de estado ni un h3 por fila: todas son WAITING_TRIAGE y la lista ya está filtrada.
      expect(table.querySelector('.badge')).toBeNull();
      expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
      expect(within(table).queryByText('En espera de triage')).toBeNull();
    });

    it('R14: la sede y la página viven en la URL, la bandeja pide páginas de 50 y el pie avanza y retrocede', async () => {
      const { net, user, router } = setup({
        entries: [`/triage?siteId=${SITE_SUR.id}&offset=50`],
        routes: { [LIST]: encountersFor(() => 120) },
      });
      await screen.findAllByRole('link', {
        name: 'Capturar información clínica',
      });
      expect(queryOf(net.calls(LIST)[0])).toEqual({
        status: 'WAITING_TRIAGE',
        siteId: SITE_SUR.id,
        limit: '50',
        offset: '50',
      });
      expect(panel()).toHaveTextContent('Página 2');
      const select = within(bar()).getByLabelText('Sede');
      await waitFor(() => expect(select).toBeEnabled());
      expect(select).toHaveValue(SITE_SUR.id);

      await user.click(screen.getByRole('button', { name: 'Siguiente' }));
      await waitFor(() => expect(lastQuery(net).offset).toBe('100'));
      expect(
        new URLSearchParams(router.state.location.search).get('offset'),
      ).toBe('100');
      expect(panel()).toHaveTextContent('Página 3');
      await user.click(screen.getByRole('button', { name: 'Anterior' }));
      await waitFor(() => expect(lastQuery(net).offset).toBe('50'));

      // Cambiar de sede vuelve a la primera página y el enlace de captura conserva los filtros.
      await user.selectOptions(select, 'Sede Norte');
      await waitFor(() => expect(lastQuery(net).siteId).toBe(SITE_NORTE.id));
      expect(lastQuery(net).offset).toBe('0');
      expect(router.state.location.search).toBe(
        `?siteId=${SITE_NORTE.id}&offset=0`,
      );
      const [first] = await screen.findAllByRole('link', {
        name: 'Capturar información clínica',
      });
      expect(first.getAttribute('href')).toMatch(
        new RegExp(`\\?siteId=${SITE_NORTE.id}&offset=0$`),
      );
    });

    it('R14: el pie lleva «Página N» a la izquierda y «Anterior» y «Siguiente» pequeños con chevrones a la derecha', async () => {
      setup({ routes: { [LIST]: encountersFor(() => 120) } });
      await screen.findAllByRole('link', {
        name: 'Capturar información clínica',
      });
      const foot = panel().querySelector('.panel__foot') as HTMLElement;
      expect(foot.firstElementChild).toHaveTextContent('Página 1');
      const pager = foot.querySelector('.pager') as HTMLElement;
      expect(foot.lastElementChild).toBe(pager);
      const previous = within(pager).getByRole('button', { name: 'Anterior' });
      const next = within(pager).getByRole('button', { name: 'Siguiente' });
      expect(follows(previous, next)).toBe(true);
      for (const button of [previous, next]) {
        expect(button).toHaveClass('button', 'button--secondary', 'button--sm');
        expect(button.querySelector('svg')).toHaveAttribute(
          'aria-hidden',
          'true',
        );
      }
      // El chevron de «Anterior» va antes del texto y el de «Siguiente», después.
      expect(previous.firstElementChild?.tagName.toLowerCase()).toBe('svg');
      expect(next.lastElementChild?.tagName.toLowerCase()).toBe('svg');
    });

    it('R14: «Anterior» y «Siguiente» se deshabilitan solo por los datos y no por isFetching', async () => {
      const refresh = deferred(json(200, { items: ROWS }));
      const { user } = setup({
        routes: {
          [LIST]: sequence(json(200, { items: ROWS }), refresh.handler),
        },
        entries: ['/triage?offset=50'],
      });
      // Lista aún no cargada: «Siguiente» deshabilitado; «Anterior» no, porque hay página anterior.
      const next = screen.getByRole('button', { name: 'Siguiente' });
      const previous = screen.getByRole('button', { name: 'Anterior' });
      expect(next).toBeDisabled();
      expect(previous).toBeEnabled();
      await rows();
      // Menos de 50 atenciones: no hay página siguiente.
      expect(next).toBeDisabled();
      expect(previous).toBeEnabled();

      // Un refresco en curso no cambia ninguno de los dos.
      await user.click(screen.getByRole('button', { name: 'Actualizar' }));
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Actualizar' }),
        ).toHaveAttribute('aria-busy', 'true'),
      );
      expect(next).toBeDisabled();
      expect(previous).toBeEnabled();
      act(() => refresh.release());
    });

    it('R14: sin página anterior «Anterior» está deshabilitado y con 50 atenciones «Siguiente» se habilita, también durante un refresco', async () => {
      const refresh = deferred(encountersFor(() => 120));
      const { user } = setup({
        routes: {
          [LIST]: sequence(
            encountersFor(() => 120),
            refresh.handler,
          ),
        },
      });
      await screen.findAllByRole('link', {
        name: 'Capturar información clínica',
      });
      const next = screen.getByRole('button', { name: 'Siguiente' });
      expect(next).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
      await user.click(screen.getByRole('button', { name: 'Actualizar' }));
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Actualizar' }),
        ).toHaveAttribute('aria-busy', 'true'),
      );
      expect(screen.getByRole('button', { name: 'Siguiente' })).toBe(next);
      expect(next).toBeEnabled();
      act(() => refresh.release());
    });

    it('R41: las horas de la tabla salen en America/Bogota sin segundos, con la fecha debajo', async () => {
      // 04:30 UTC del 28/10 es 11:30 p. m. del 27/10 en Bogotá.
      setup({
        routes: {
          [LIST]: json(200, {
            items: [{ ...LAURA, arrivalAt: '2026-10-28T04:30:00.000Z' }],
          }),
        },
      });
      const laura = (await rows()).closest('tr') as HTMLElement;
      const time = laura.querySelector('time')!;
      expect(time.textContent).toMatch(/^11:30\sp\.\sm\.$/);
      expect(time.nextElementSibling).toHaveTextContent('27/10/26');
      expect(laura).not.toHaveTextContent('28/10/26');
    });
  });

  describe('estados del panel y de la celda', () => {
    it('R19: mientras la bandeja carga, el panel es un role="status" y la celda un esqueleto con aria-busy', async () => {
      const gate = deferred(json(200, { items: ROWS }));
      setup({ routes: { [LIST]: gate.handler } });
      expect(cell()).toHaveAttribute('aria-busy', 'true');
      expect(cell()).toHaveTextContent('Cargando indicador…');
      expect(cell()).not.toHaveAttribute('role');
      expect(screen.getAllByRole('status')).toHaveLength(1);
      expect(screen.getByRole('status')).toHaveTextContent(
        'Cargando las atenciones en espera…',
      );
      expect(panel()).toContainElement(screen.getByRole('status'));
      act(() => gate.release());
      await rows();
      expect(cell()).not.toHaveAttribute('aria-busy');
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('R20: sin atenciones muestra el vacío con icono, mensaje y pista, sin acción, y la cifra 0', async () => {
      setup({ routes: { [LIST]: json(200, { items: [] }) } });
      const message = await screen.findByText(
        'No hay atenciones en espera de triage con estos filtros.',
      );
      const empty = message.closest('.panel-state') as HTMLElement;
      expect(empty).not.toHaveAttribute('role');
      expect(empty.querySelector('.panel-state__icon svg')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      expect(
        within(empty).getByText(
          'Las llegadas confirmadas por recepción aparecerán aquí.',
        ),
      ).toBeInTheDocument();
      expect(empty.querySelectorAll('a, button')).toHaveLength(0);
      expect(cell()).toHaveTextContent('En espera de triage0');
      expect(cell()).not.toHaveAttribute('aria-busy');
    });

    it('R21: si falla la bandeja, el error sustituye a las filas, el panel y la celda tienen su «Reintentar» y la sede sigue disponible', async () => {
      const { net, user } = setup({ routes: { [LIST]: problem(500) } });
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(
        'No se pudieron cargar las atenciones en espera.',
      );
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(cell()).toHaveTextContent('No se pudo cargar');
      expect(cell()).toHaveTextContent('En espera de triage');
      await waitFor(() =>
        expect(within(bar()).getByLabelText('Sede')).toBeEnabled(),
      );

      // El «Reintentar» exacto es el del panel; el de la celda lleva el nombre del indicador.
      net.set(LIST, json(200, { items: ROWS }));
      await user.click(
        within(alert).getByRole('button', { name: 'Reintentar' }),
      );
      await rows();
      expect(net.calls(LIST)).toHaveLength(2);
      expect(cell()).toHaveTextContent('En espera de triage3');

      net.set(LIST, problem(500));
      await user.click(screen.getByRole('button', { name: 'Actualizar' }));
      await screen.findByRole('alert');
      net.set(LIST, json(200, { items: ROWS }));
      await user.click(
        within(cell()).getByRole('button', {
          name: 'Reintentar: En espera de triage',
        }),
      );
      await rows();
      expect(net.calls(LIST)).toHaveLength(4);
    });

    it('R22: un 403 deja el panel y la celda «Sin permiso», sin filas, sin «Reintentar» y sin pedir preregistros', async () => {
      const { net } = setup({ routes: { [LIST]: problem(403) } });
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(
        'No tienes permiso para ver esta página.',
      );
      expect(within(alert).queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(cell()).toHaveTextContent('Sin permiso');
      expect(within(cell()).queryByRole('button')).not.toBeInTheDocument();
      expect(net.calls(PRE_REGISTRATIONS)).toHaveLength(0);
    });

    it('R21: si fallan las sedes, el error vive en la celda del filtro con el selector deshabilitado y la bandeja y la celda siguen', async () => {
      const { net, user } = setup({ routes: { [TENANTS]: problem(500) } });
      await rows();
      const alert = await within(bar()).findByRole('alert');
      expect(alert).toHaveTextContent('No se pudieron cargar las sedes.');
      const select = within(bar()).getByLabelText('Sede');
      expect(select).toBeDisabled();
      expect(alert.closest('.summary__filter')).toContainElement(select);
      expect(cell()).toHaveTextContent('En espera de triage3');
      expect(lastQuery(net)).toEqual({
        status: 'WAITING_TRIAGE',
        limit: '50',
        offset: '0',
      });

      net.set(TENANTS, json(200, publicTenants));
      await user.click(
        within(alert).getByRole('button', { name: 'Reintentar' }),
      );
      await waitFor(() => expect(select).toBeEnabled());
      expect(net.calls(TENANTS)).toHaveLength(2);
    });
  });

  describe('refresco automático', () => {
    it('R24: cada 30 s con la pestaña visible se repite la bandeja, y con ella la celda, y «Actualizar» suma exactamente una petición', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup();
      await rows();
      expect(net.calls(LIST)).toHaveLength(1);

      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() => expect(net.calls(LIST)).toHaveLength(2));
      expect(queryOf(net.calls(LIST)[1])).toEqual({
        status: 'WAITING_TRIAGE',
        limit: '50',
        offset: '0',
      });

      const before = net.calls(LIST).length;
      await act(async () => {
        screen.getByRole('button', { name: 'Actualizar' }).click();
        await vi.advanceTimersByTimeAsync(0);
      });
      await waitFor(() => expect(net.calls(LIST)).toHaveLength(before + 1));
      await act(() => vi.advanceTimersByTimeAsync(100));
      expect(net.calls(LIST)).toHaveLength(before + 1);
      // Las sedes se piden una vez por sesión y la bandeja de enfermería no pide preregistros.
      expect(net.calls(TENANTS)).toHaveLength(1);
      expect(net.calls(PRE_REGISTRATIONS)).toHaveLength(0);
    });

    it('R25: ni el foco de la ventana ni la reconexión repiten la bandeja', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup();
      await rows();
      await act(async () => {
        focusManager.setFocused(false);
        onlineManager.setOnline(false);
        focusManager.setFocused(true);
        onlineManager.setOnline(true);
        await vi.advanceTimersByTimeAsync(20);
      });
      expect(net.calls(LIST)).toHaveLength(1);
    });

    it('R25: con la pestaña oculta no se repite ninguna petición', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup();
      await rows();
      const visibility = vi
        .spyOn(document, 'visibilityState', 'get')
        .mockReturnValue('hidden');
      await act(() => vi.advanceTimersByTimeAsync(90_000));
      expect(net.calls(LIST)).toHaveLength(1);
      visibility.mockRestore();
    });

    it('R22: un 403 detiene el intervalo de la bandeja', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup({ routes: { [LIST]: problem(403) } });
      await screen.findByRole('alert');
      await act(() => vi.advanceTimersByTimeAsync(90_000));
      expect(net.calls(LIST)).toHaveLength(1);
    });

    it('R21: un refresco fallido sustituye las filas por el error y el siguiente ciclo vuelve a pedir', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup();
      await rows();
      net.set(LIST, networkError());
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(
        'No se pudieron cargar las atenciones en espera.',
      );
      expect(screen.queryByText('Laura Gómez Pérez')).not.toBeInTheDocument();
      expect(cell()).toHaveTextContent('No se pudo cargar');
      expect(net.calls(LIST)).toHaveLength(2);

      // El error no detiene el intervalo: el siguiente ciclo repite la petición solo.
      net.set(LIST, json(200, { items: ROWS }));
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() => expect(net.calls(LIST)).toHaveLength(3));
      expect(await rows()).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('R23: durante un refresco se conservan las filas y la cifra, sin estado de carga, y «Actualizar» no se deshabilita', async () => {
      const gate = deferred(json(200, { items: [ARRIVAL, ...ROWS] }));
      const { user } = setup({
        routes: { [LIST]: sequence(json(200, { items: ROWS }), gate.handler) },
      });
      await rows();
      const button = screen.getByRole('button', { name: 'Actualizar' });
      expect(button).not.toHaveAttribute('aria-busy');

      await user.click(button);
      await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'));
      expect(button).toBeEnabled();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(
        screen.getAllByRole('link', { name: 'Capturar información clínica' }),
      ).toHaveLength(3);
      expect(cell()).toHaveTextContent('En espera de triage3');
      expect(cell()).not.toHaveAttribute('aria-busy');

      act(() => gate.release());
      await waitFor(() =>
        expect(cell()).toHaveTextContent('En espera de triage4'),
      );
      await waitFor(() => expect(button).not.toHaveAttribute('aria-busy'));
    });

    it('R37: un refresco conserva el enlace de captura enfocado aunque una llegada nueva reordene las filas, sin estado de carga ni desplazamiento programático', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const scrolling = watchScrolling();
      const { net } = setup();
      const laura = (await rows()).closest('tr') as HTMLElement;
      const danielRow = screen
        .getByRole('cell', { name: /Daniel Castro Mora/ })
        .closest('tr') as HTMLElement;
      const link = within(danielRow).getByRole('link', {
        name: 'Capturar información clínica',
      });
      act(() => link.focus());
      expect(link).toHaveFocus();
      const refresh = screen.getByRole('button', { name: 'Actualizar' });
      const body = panel().querySelector('.panel__body');

      // Llega una atención nueva arriba: las filas existentes son las mismas y bajan una posición.
      net.set(LIST, json(200, { items: [ARRIVAL, ...ROWS] }));
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await screen.findByRole('cell', { name: /Sofía Martínez Díaz/ });

      const links = screen.getAllByRole('link', {
        name: 'Capturar información clínica',
      });
      expect(links).toHaveLength(4);
      expect(links[2]).toBe(link);
      expect(link).toHaveFocus();
      expect(link.closest('tr')).toBe(danielRow);
      expect(
        screen.getByRole('cell', { name: /Laura Gómez Pérez/ }).closest('tr'),
      ).toBe(laura);
      expect(
        screen
          .getAllByRole('row')
          .slice(1)
          .map((row) => within(row).getAllByRole('cell')[0].textContent),
      ).toEqual([
        'Sofía Martínez DíazCédula de ciudadanía 52876543',
        'Laura Gómez PérezCédula de ciudadanía 1032456789',
        'Daniel Castro MoraCédula de ciudadanía 1019876543',
        'Paciente NN',
      ]);
      expect(screen.getByRole('button', { name: 'Actualizar' })).toBe(refresh);
      expect(refresh).toBeEnabled();
      expect(panel().querySelector('.panel__body')).toBe(body);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(cell()).toHaveTextContent('En espera de triage4');
      expect(scrolling.calls()).toBe(0);
      scrolling.restore();
    });

    it('R37: «Siguiente» conserva el foco y no se deshabilita mientras el intervalo repite la bandeja', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const scrolling = watchScrolling();
      const refresh = deferred(encountersFor(() => 120));
      const { net } = setup({
        routes: {
          [LIST]: sequence(
            encountersFor(() => 120),
            refresh.handler,
          ),
        },
      });
      await screen.findAllByRole('link', {
        name: 'Capturar información clínica',
      });
      const next = screen.getByRole('button', { name: 'Siguiente' });
      act(() => next.focus());
      expect(next).toHaveFocus();

      // El refresco está en curso: el botón sigue habilitado y enfocado.
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() => expect(net.calls(LIST)).toHaveLength(2));
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Actualizar' }),
        ).toHaveAttribute('aria-busy', 'true'),
      );
      expect(next).toBeEnabled();
      expect(next).toHaveFocus();

      act(() => refresh.release());
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Actualizar' }),
        ).not.toHaveAttribute('aria-busy'),
      );
      expect(screen.getByRole('button', { name: 'Siguiente' })).toBe(next);
      expect(next).toBeEnabled();
      expect(next).toHaveFocus();
      expect(scrolling.calls()).toBe(0);
      scrolling.restore();
    });
  });

  describe('privacidad y permisos', () => {
    it('R26: no muestra sugerencias de IA ni niveles de triage, y el documento solo aparece si existe', async () => {
      setup();
      await rows();
      expect(document.body.textContent).not.toMatch(
        /sugerencia|nivel|inteligencia artificial|\bIA\b/i,
      );
      // La bandeja de enfermería muestra lo que mostraba antes: nombre, documento si existe, sede y hora.
      expect(screen.getAllByText(/Cédula de ciudadanía/)).toHaveLength(2);
    });

    it('R28: pide solo las sedes y la bandeja, y ninguna petición a preregistros, detalle ni captura clínica', async () => {
      const { net } = setup();
      await rows();
      act(() => {
        screen.getByRole('button', { name: 'Actualizar' }).click();
      });
      await waitFor(() => expect(net.calls(LIST)).toHaveLength(2));
      const endpoints = [
        ...new Set(net.requests.map((r) => `${r.method} ${r.path}`)),
      ].sort();
      expect(endpoints).toEqual([TENANTS, LIST].sort());
      expect(
        net.requests.some((r) => /\/encounters\/|clinical/.test(r.path)),
      ).toBe(false);
    });
  });
});
