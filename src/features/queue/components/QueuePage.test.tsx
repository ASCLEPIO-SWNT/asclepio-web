import { focusManager, onlineManager } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StaffRole } from '../../../shared/api/client';
import {
  formatDateBogota,
  formatTimeBogota,
} from '../../../shared/lib/datetime';
import { ENCOUNTER_STATUS_VIEW } from '../../../shared/lib/encounterStatus';
import {
  ENCOUNTER_STATUSES,
  ENCOUNTER_STATUS_LABELS,
} from '../../../shared/lib/labels';
import {
  deferred,
  encounterSummary,
  encountersFor,
  encountersInEveryStatus,
  fakeApi,
  json,
  networkError,
  patient,
  problem,
  sequence,
  type Handler,
  type RecordedRequest,
} from '../../../test/fakeApi';
import { renderFeature } from '../../../test/renderFeature';
import { watchScrolling } from '../../../test/scroll';
import { norm } from '../../../test/text';
import { queueRoutes } from '../routes';

const LIST = 'GET /api/v1/encounters';
const TENANTS = 'GET /api/v1/public/tenants';
const PRE_REGISTRATIONS = 'GET /api/v1/pre-registrations';

type Key = 'recent' | 'WAITING_TRIAGE' | 'TRIAGED' | 'IN_CARE';

/**
 * `GET /encounters` del dashboard: una petición por estado con `limit=100` y la lista reciente con
 * `limit=8`. `overrides` cambia la respuesta de una sola de las cuatro.
 */
function encounters(overrides: Partial<Record<Key, Handler>> = {}): Handler {
  const handlers: Record<Key, Handler> = {
    recent: json(200, { items: encountersInEveryStatus }),
    WAITING_TRIAGE: encountersFor(() => 8),
    TRIAGED: encountersFor(() => 0),
    IN_CARE: encountersFor(() => 3),
    ...overrides,
  };
  return (request) => {
    const query = new URL(request.url).searchParams;
    const key =
      query.get('limit') === '8' ? 'recent' : (query.get('status') as Key);
    return handlers[key](request);
  };
}

const keyOf = (request: RecordedRequest): Key =>
  request.query.get('limit') === '8'
    ? 'recent'
    : (request.query.get('status') as Key);
const callsOf = (net: ReturnType<typeof fakeApi>, key: Key) =>
  net.calls(LIST).filter((request) => keyOf(request) === key);
const queryOf = (request: RecordedRequest) => Object.fromEntries(request.query);

function setup({
  role = 'PHYSICIAN',
  routes = {},
}: { role?: StaffRole; routes?: Record<string, Handler> } = {}) {
  const net = fakeApi({ [LIST]: encounters(), ...routes });
  const user = userEvent.setup();
  const view = renderFeature(queueRoutes, { entries: ['/cola'], role });
  return { net, user, ...view };
}

const bar = () => screen.getByRole('region', { name: 'Indicadores' });
const cells = () => within(bar()).getAllByRole('listitem');
const panel = () =>
  screen.getByRole('region', { name: 'Atenciones recientes' });
const strip = () =>
  screen.getByRole('region', { name: 'Cola por nivel y espera' });
/** Espera a que la tabla pinte filas. */
const rows = () => screen.findAllByRole('link', { name: 'Ver atención' });
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

describe('UI-02-web dashboard de medicina', () => {
  describe('estructura', () => {
    it('R3: encabezado con un h1 y su descripción, región «Indicadores» con tres celdas y sin filtro, panel con h2 y franja «pendiente», en ese orden de documento y sin columna lateral', async () => {
      const { container } = setup();
      await rows();
      const title = screen.getByRole('heading', {
        level: 1,
        name: 'Cola priorizada',
      });
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(title.nextElementSibling).toHaveTextContent(
        'Estado de las atenciones y las llegadas más recientes.',
      );

      const region = bar();
      expect(within(region).getAllByRole('listitem')).toHaveLength(3);
      // Medicina no filtra por sede: ni selector ni etiqueta «Sede» en la barra.
      expect(within(region).queryByLabelText('Sede')).not.toBeInTheDocument();
      expect(region.querySelector('select')).toBeNull();
      expect(region).not.toHaveClass('summary--filter');

      const main = panel();
      const heading = within(main).getByRole('heading', {
        level: 2,
        name: 'Atenciones recientes',
      });
      expect(heading.querySelector('svg')).toBeNull();
      const pending = strip();
      expect(
        within(pending).getByRole('heading', {
          level: 2,
          name: 'Cola por nivel y espera',
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
      await rows();
      expect(bar().style.getPropertyValue('--cells')).toBe('3');
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
      expect(
        within(header).getByRole('button', { name: 'Actualizar' }),
      ).toHaveClass('button', 'button--secondary');
      expect(header.querySelectorAll('button, a')).toHaveLength(1);
    });
  });

  describe('indicadores por estado', () => {
    it('R15: tres indicadores, uno por estado, con una petición cada uno, sin sede y sin filtro', async () => {
      const { net } = setup();
      await rows();
      const [waiting, triaged, inCare] = cells();
      await waitFor(() =>
        expect(waiting).toHaveTextContent('En espera de triage8'),
      );
      expect(triaged).toHaveTextContent('Clasificadas0');
      expect(inCare).toHaveTextContent('En atención3');
      // El cero es una cifra completa, no una celda vacía.
      expect(triaged).not.toHaveAttribute('aria-busy');
      expect(within(triaged).getByText('0')).toBeInTheDocument();

      for (const status of ['WAITING_TRIAGE', 'TRIAGED', 'IN_CARE'] as const) {
        const calls = callsOf(net, status);
        expect(calls).toHaveLength(1);
        expect(queryOf(calls[0])).toEqual({ status, limit: '100' });
      }
      expect(net.calls(TENANTS)).toHaveLength(0);
    });

    it('R15: cada celda lleva el icono y el tono de su estado', async () => {
      setup();
      await rows();
      const tones = cells().map((cell) =>
        [...cell.classList].find((name) => name.startsWith('tone--')),
      );
      expect(tones).toEqual([
        `tone--${ENCOUNTER_STATUS_VIEW.WAITING_TRIAGE.tone}`,
        `tone--${ENCOUNTER_STATUS_VIEW.TRIAGED.tone}`,
        `tone--${ENCOUNTER_STATUS_VIEW.IN_CARE.tone}`,
      ]);
      for (const cell of cells()) {
        expect(cell.querySelector('.summary__icon svg')).toHaveAttribute(
          'aria-hidden',
          'true',
        );
      }
    });

    it('R8: con 100 atenciones en un estado la celda se escribe «100+» y dice «Al menos 100»', async () => {
      setup({
        routes: { [LIST]: encounters({ TRIAGED: encountersFor(() => 100) }) },
      });
      await rows();
      const triaged = cells()[1];
      await waitFor(() =>
        expect(triaged).toHaveTextContent('Clasificadas100+'),
      );
      expect(within(triaged).getByText('Al menos 100')).toBeInTheDocument();
      expect(cells()[2]).not.toHaveTextContent('+');
    });
  });

  describe('atenciones recientes', () => {
    it('R16: pide las 8 atenciones más recientes sin filtros y las muestra en el orden recibido, con el nombre y sin documento', async () => {
      const { net } = setup();
      await rows();
      const calls = callsOf(net, 'recent');
      expect(calls).toHaveLength(1);
      expect(queryOf(calls[0])).toEqual({ limit: '8', offset: '0' });

      const table = screen.getByRole('table', { name: 'Atenciones recientes' });
      expect(
        within(table)
          .getAllByRole('columnheader')
          .map((header) => header.textContent),
      ).toEqual(['Paciente', 'Sede', 'Llegada', 'Estado', 'Acción']);
      const names = within(table)
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[0].textContent);
      // Solo el nombre: un NN se muestra como «Paciente NN» y ningún documento se escribe.
      expect(names).toEqual([
        'Ana María Ruiz',
        'Paciente NN',
        'Camilo Torres Vega',
        'Elena Beltrán Gil',
        'Felipe Quintero Salazar',
        'Gloria Mora Díaz',
      ]);
      expect(document.body.textContent).not.toMatch(/Cédula|8000000\d/);
      expect(table.querySelectorAll('.cell-sub')).toHaveLength(
        encountersInEveryStatus.length,
      );
      for (const sub of table.querySelectorAll('.cell-sub')) {
        // La única línea de apoyo es la fecha de la llegada.
        expect(sub.parentElement).toHaveClass('cell-time');
      }
    });

    it.each(ENCOUNTER_STATUSES)(
      'R16: la fila %s lleva una insignia con icono, texto y tono, y «Ver atención» a su detalle',
      async (status) => {
        setup();
        await rows();
        const row = encountersInEveryStatus.find((e) => e.status === status)!;
        const name = row.patient.fullName ?? 'Paciente NN';
        const tr = screen
          .getByRole('cell', { name: new RegExp(`^${name}$`) })
          .closest('tr') as HTMLElement;
        const badge = within(tr).getByText(ENCOUNTER_STATUS_LABELS[status]);
        expect(badge).toHaveClass(
          'badge',
          `tone--${ENCOUNTER_STATUS_VIEW[status].tone}`,
        );
        expect(badge.querySelector('svg')).toHaveAttribute(
          'aria-hidden',
          'true',
        );
        const link = within(tr).getByRole('link', { name: 'Ver atención' });
        expect(link).toHaveAttribute('href', `/atenciones/${row.id}`);
        expect(link).toHaveClass('button', 'button--secondary', 'button--sm');
        expect(link).not.toHaveClass('button--soft');
        // Se asocia a su fila con aria-describedby: apunta a la celda del nombre.
        const cell = within(tr).getAllByRole('cell')[0];
        expect(cell.id).not.toBe('');
        expect(link).toHaveAttribute('aria-describedby', cell.id);
      },
    );

    it('R16: cada fila muestra la sede y la llegada con la hora en <time> y la fecha debajo, sin segundos', async () => {
      setup();
      await rows();
      const first = encountersInEveryStatus[0];
      const tr = screen
        .getByRole('cell', { name: /^Ana María Ruiz$/ })
        .closest('tr') as HTMLElement;
      expect(within(tr).getByText(first.siteName)).toBeInTheDocument();
      const time = tr.querySelector('time')!;
      expect(time).toHaveAttribute('dateTime', first.arrivalAt);
      expect(norm(time.textContent)).toBe(
        norm(formatTimeBogota(first.arrivalAt)),
      );
      expect(time.textContent).not.toMatch(/\d:\d{2}:\d{2}/);
      expect(time.nextElementSibling).toHaveClass('cell-sub');
      expect(time.nextElementSibling).toHaveTextContent(
        formatDateBogota(first.arrivalAt),
      );
    });

    it('R16: el pie dice «Las 6 atenciones más recientes» con la lista, y «Ver todas las atenciones» lleva a /atenciones', async () => {
      setup();
      await rows();
      const foot = panel().querySelector('.panel__foot') as HTMLElement;
      expect(foot.firstElementChild).toHaveTextContent(
        'Las 6 atenciones más recientes',
      );
      const link = within(foot).getByRole('link', {
        name: 'Ver todas las atenciones',
      });
      expect(link).toHaveAttribute('href', '/atenciones');
      expect(link).toHaveClass('link-more');
      expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      expect(foot.lastElementChild).toBe(link);
    });

    it.each([
      [8, 'Las 8 atenciones más recientes'],
      [1, 'La atención más reciente'],
    ])('R16: con %i filas el pie dice «%s»', async (count, text) => {
      setup({
        routes: {
          [LIST]: encounters({
            recent: json(200, {
              items: Array.from({ length: count }, (_, i) =>
                encounterSummary({
                  id: `e3e3e3e3-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
                  patient: {
                    ...patient,
                    id: `b3b3b3b3-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
                    fullName: `Paciente ficticio ${i + 1}`,
                  },
                }),
              ),
            }),
          }),
        },
      });
      await rows();
      const foot = panel().querySelector('.panel__foot') as HTMLElement;
      expect(foot.firstElementChild).toHaveTextContent(text);
      expect(
        screen.getAllByRole('link', { name: 'Ver atención' }),
      ).toHaveLength(count);
    });

    it('R41: las horas de la tabla salen en America/Bogota sin segundos, con la fecha debajo', async () => {
      // 04:30 UTC del 28/10 es 11:30 p. m. del 27/10 en Bogotá.
      setup({
        routes: {
          [LIST]: encounters({
            recent: json(200, {
              items: [
                encounterSummary({ arrivalAt: '2026-10-28T04:30:00.000Z' }),
              ],
            }),
          }),
        },
      });
      await rows();
      const time = panel().querySelector('time')!;
      expect(time.textContent).toMatch(/^11:30\sp\.\sm\.$/);
      expect(time.nextElementSibling).toHaveTextContent('27/10/26');
    });
  });

  describe('franja «pendiente»', () => {
    it('R18: muestra el texto neutral de pendiente y no tiene acciones, niveles, tiempos ni gráficos', async () => {
      const { net } = setup();
      await rows();
      const pending = strip();
      expect(pending).toHaveTextContent('Cola por nivel y espera');
      expect(pending).toHaveTextContent(
        'Aquí aparecerá la cola priorizada por nivel de triage y tiempo de espera, con datos del servidor.',
      );
      expect(within(pending).getByText('Próximamente')).toHaveClass('badge');
      expect(
        // UI-04-web R10: texto neutral, sin código interno de feature.
        within(pending).getByText('Esta funcionalidad aún no está disponible.'),
      ).toBeInTheDocument();
      expect(
        pending.querySelectorAll(
          'button, a, input, select, textarea, form, canvas, img, [role="img"], [role="progressbar"], [role="meter"]',
        ),
      ).toHaveLength(0);
      // Nada que parezca un dato: ninguna cifra salvo la de la feature.
      expect(pending.textContent).not.toMatch(/\d/);
      // Es estática: no añade peticiones propias (solo las cuatro de atenciones).
      expect(net.requests.every((r) => r.path === '/api/v1/encounters')).toBe(
        true,
      );
    });
  });

  describe('estados de cada celda y del panel', () => {
    it('R19: cada celda y el panel cargan por separado y solo el panel es un role="status"', async () => {
      const waiting = deferred(encountersFor(() => 8));
      const recent = deferred(json(200, { items: encountersInEveryStatus }));
      setup({
        routes: {
          [LIST]: encounters({
            WAITING_TRIAGE: waiting.handler,
            recent: recent.handler,
          }),
        },
      });
      const [first, second, third] = cells();
      await waitFor(() => expect(second).toHaveTextContent('Clasificadas0'));
      expect(first).toHaveAttribute('aria-busy', 'true');
      expect(first).toHaveTextContent('Cargando indicador…');
      expect(first).not.toHaveAttribute('role');
      expect(second).not.toHaveAttribute('aria-busy');
      expect(third).toHaveTextContent('En atención3');
      expect(screen.getAllByRole('status')).toHaveLength(1);
      expect(screen.getByRole('status')).toHaveTextContent(
        'Cargando las atenciones recientes…',
      );
      expect(panel()).toContainElement(screen.getByRole('status'));
      // Mientras carga, el panel no tiene pie y la franja «pendiente» sigue ahí.
      expect(panel().querySelector('.panel__foot')).toBeNull();
      expect(strip()).toBeVisible();

      act(() => {
        waiting.release();
        recent.release();
      });
      await rows();
      expect(first).toHaveTextContent('En espera de triage8');
      expect(first).not.toHaveAttribute('aria-busy');
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('R20: sin atenciones muestra el vacío con el icono de la cola, el mensaje y sin acción ni pie, y las cifras 0', async () => {
      setup({
        routes: {
          [LIST]: encounters({
            recent: json(200, { items: [] }),
            WAITING_TRIAGE: encountersFor(() => 0),
            IN_CARE: encountersFor(() => 0),
          }),
        },
      });
      const message = await screen.findByText('Aún no hay atenciones.');
      const empty = message.closest('.panel-state') as HTMLElement;
      expect(empty).not.toHaveAttribute('role');
      expect(empty.querySelector('.panel-state__icon svg')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      expect(empty.querySelectorAll('a, button')).toHaveLength(0);
      expect(panel().querySelector('.panel__foot')).toBeNull();
      await waitFor(() => {
        for (const cell of cells()) {
          expect(cell).not.toHaveAttribute('aria-busy');
        }
      });
      expect(cells().map((cell) => cell.textContent)).toEqual([
        'En espera de triage0',
        'Clasificadas0',
        'En atención0',
      ]);
    });

    it('R21: si falla un indicador, solo su celda muestra el error y su «Reintentar» repite solo esa petición', async () => {
      const { net, user } = setup({
        routes: { [LIST]: encounters({ TRIAGED: problem(500) }) },
      });
      await rows();
      const triaged = cells()[1];
      await waitFor(() =>
        expect(triaged).toHaveTextContent('No se pudo cargar'),
      );
      expect(triaged).toHaveTextContent('Clasificadas');
      expect(cells()[0]).toHaveTextContent('En espera de triage8');
      expect(cells()[2]).toHaveTextContent('En atención3');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      net.set(LIST, encounters({ TRIAGED: encountersFor(() => 4) }));
      await user.click(
        within(triaged).getByRole('button', {
          name: 'Reintentar: Clasificadas',
        }),
      );
      await waitFor(() =>
        expect(cells()[1]).toHaveTextContent('Clasificadas4'),
      );
      expect(callsOf(net, 'TRIAGED')).toHaveLength(2);
      expect(callsOf(net, 'WAITING_TRIAGE')).toHaveLength(1);
      expect(callsOf(net, 'IN_CARE')).toHaveLength(1);
      expect(callsOf(net, 'recent')).toHaveLength(1);
    });

    it('R21: si falla la lista reciente, el panel muestra el error con su «Reintentar» y las celdas siguen', async () => {
      const { net, user } = setup({
        routes: { [LIST]: encounters({ recent: problem(500) }) },
      });
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(
        'No se pudieron cargar las atenciones recientes.',
      );
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(panel().querySelector('.panel__foot')).toBeNull();
      await waitFor(() =>
        expect(cells()[0]).toHaveTextContent('En espera de triage8'),
      );
      expect(cells()[2]).toHaveTextContent('En atención3');
      expect(strip()).toBeVisible();

      net.set(LIST, encounters());
      // El «Reintentar» exacto es el del panel y repite solo la lista.
      await user.click(
        within(alert).getByRole('button', { name: 'Reintentar' }),
      );
      await rows();
      expect(callsOf(net, 'recent')).toHaveLength(2);
      expect(callsOf(net, 'WAITING_TRIAGE')).toHaveLength(1);
    });

    it('R22: un 403 de un indicador deja solo esa celda «Sin permiso» y sin «Reintentar»', async () => {
      setup({ routes: { [LIST]: encounters({ IN_CARE: problem(403) }) } });
      await rows();
      const inCare = cells()[2];
      await waitFor(() => expect(inCare).toHaveTextContent('Sin permiso'));
      expect(within(inCare).queryByRole('button')).not.toBeInTheDocument();
      expect(cells()[0]).toHaveTextContent('En espera de triage8');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('R22: un 403 de la lista deja el panel «Sin permiso», sin filas ni «Reintentar», y las celdas siguen', async () => {
      setup({ routes: { [LIST]: encounters({ recent: problem(403) }) } });
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(
        'No tienes permiso para ver esta página.',
      );
      expect(within(alert).queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      await waitFor(() =>
        expect(cells()[0]).toHaveTextContent('En espera de triage8'),
      );
    });
  });

  describe('refresco automático', () => {
    it('R24: cada 30 s con la pestaña visible se repiten las cuatro peticiones y «Actualizar» las repite todas', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup();
      await rows();
      expect(net.calls(LIST)).toHaveLength(4);

      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() => expect(net.calls(LIST)).toHaveLength(8));
      for (const key of [
        'recent',
        'WAITING_TRIAGE',
        'TRIAGED',
        'IN_CARE',
      ] as const) {
        expect(callsOf(net, key)).toHaveLength(2);
      }
      expect(queryOf(callsOf(net, 'recent')[1])).toEqual({
        limit: '8',
        offset: '0',
      });

      await act(async () => {
        screen.getByRole('button', { name: 'Actualizar' }).click();
        await vi.advanceTimersByTimeAsync(0);
      });
      await waitFor(() => expect(net.calls(LIST)).toHaveLength(12));
      for (const key of [
        'recent',
        'WAITING_TRIAGE',
        'TRIAGED',
        'IN_CARE',
      ] as const) {
        expect(callsOf(net, key)).toHaveLength(3);
      }
      // Ni sedes ni preregistros: son lecturas que este dashboard no necesita.
      expect(net.calls(TENANTS)).toHaveLength(0);
      expect(net.calls(PRE_REGISTRATIONS)).toHaveLength(0);
    });

    it('R25: ni el foco de la ventana ni la reconexión repiten las peticiones', async () => {
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
      expect(net.calls(LIST)).toHaveLength(4);
    });

    it('R25: con la pestaña oculta no se repite ninguna petición', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup();
      await rows();
      const visibility = vi
        .spyOn(document, 'visibilityState', 'get')
        .mockReturnValue('hidden');
      await act(() => vi.advanceTimersByTimeAsync(90_000));
      expect(net.calls(LIST)).toHaveLength(4);
      visibility.mockRestore();
    });

    it('R22: un 403 detiene el intervalo de esa petición y el de las demás sigue', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup({
        routes: { [LIST]: encounters({ TRIAGED: problem(403) }) },
      });
      await rows();
      await waitFor(() => expect(cells()[1]).toHaveTextContent('Sin permiso'));
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() => expect(callsOf(net, 'recent')).toHaveLength(2));
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() => expect(callsOf(net, 'recent')).toHaveLength(3));
      await waitFor(() =>
        expect(callsOf(net, 'WAITING_TRIAGE')).toHaveLength(3),
      );
      await waitFor(() => expect(callsOf(net, 'IN_CARE')).toHaveLength(3));
      expect(callsOf(net, 'TRIAGED')).toHaveLength(1);
    });

    it('R22: un 403 de la lista detiene su intervalo y los de los indicadores siguen', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup({
        routes: { [LIST]: encounters({ recent: problem(403) }) },
      });
      await screen.findByRole('alert');
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() =>
        expect(callsOf(net, 'WAITING_TRIAGE')).toHaveLength(2),
      );
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() =>
        expect(callsOf(net, 'WAITING_TRIAGE')).toHaveLength(3),
      );
      expect(callsOf(net, 'recent')).toHaveLength(1);
    });

    it('R21: un refresco fallido sustituye las filas por el error y el siguiente ciclo vuelve a pedir', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup();
      await rows();
      net.set(LIST, encounters({ recent: networkError() }));
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(
        'No se pudieron cargar las atenciones recientes.',
      );
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(callsOf(net, 'recent')).toHaveLength(2);

      // El error no detiene el intervalo: el siguiente ciclo repite la petición solo.
      net.set(LIST, encounters());
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() => expect(callsOf(net, 'recent')).toHaveLength(3));
      expect((await rows()).length).toBeGreaterThan(0);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('R23: durante un refresco se conservan las filas y las cifras, sin estado de carga, y «Actualizar» no se deshabilita', async () => {
      const recent = deferred(json(200, { items: encountersInEveryStatus }));
      const waiting = deferred(encountersFor(() => 9));
      const { user } = setup({
        routes: {
          [LIST]: sequence(
            // Las cuatro primeras respuestas son la carga inicial; las siguientes, el refresco.
            ...Array.from({ length: 4 }, () => encounters()),
            ...[
              encounters({
                recent: recent.handler,
                WAITING_TRIAGE: waiting.handler,
              }),
            ],
          ),
        },
      });
      await rows();
      await waitFor(() =>
        expect(cells()[0]).toHaveTextContent('En espera de triage8'),
      );
      const button = screen.getByRole('button', { name: 'Actualizar' });
      expect(button).not.toHaveAttribute('aria-busy');

      await user.click(button);
      await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'));
      expect(button).toBeEnabled();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(
        screen.getAllByRole('link', { name: 'Ver atención' }),
      ).toHaveLength(encountersInEveryStatus.length);
      expect(cells()[0]).toHaveTextContent('En espera de triage8');
      expect(cells()[0]).not.toHaveAttribute('aria-busy');

      act(() => {
        recent.release();
        waiting.release();
      });
      await waitFor(() =>
        expect(cells()[0]).toHaveTextContent('En espera de triage9'),
      );
      await waitFor(() => expect(button).not.toHaveAttribute('aria-busy'));
    });

    it('R37: un refresco conserva el enlace enfocado aunque llegue una atención nueva, y «Actualizar» no pierde el foco ni se deshabilita, sin desplazamiento programático', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const scrolling = watchScrolling();
      const { net, user } = setup();
      const links = await rows();
      const row = links[2].closest('tr') as HTMLElement;
      act(() => links[2].focus());
      expect(links[2]).toHaveFocus();
      const refresh = screen.getByRole('button', { name: 'Actualizar' });
      const body = panel().querySelector('.panel__body');

      // Llega una atención nueva arriba: las filas existentes bajan una posición y son las mismas.
      const arrival = encounterSummary({
        id: 'e3e3e3e3-0000-4000-8000-0000000000ff',
        status: 'WAITING_TRIAGE',
        arrivalAt: '2026-10-27T15:00:00.000Z',
        patient: {
          ...patient,
          id: 'b3b3b3b3-0000-4000-8000-0000000000ff',
          fullName: 'Sofía Martínez Díaz',
        },
      });
      net.set(
        LIST,
        encounters({
          recent: json(200, { items: [arrival, ...encountersInEveryStatus] }),
        }),
      );
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await screen.findByRole('cell', { name: /^Sofía Martínez Díaz$/ });

      const after = screen.getAllByRole('link', { name: 'Ver atención' });
      expect(after).toHaveLength(encountersInEveryStatus.length + 1);
      expect(after[3]).toBe(links[2]);
      expect(links[2]).toHaveFocus();
      expect(links[2].closest('tr')).toBe(row);
      expect(screen.getByRole('button', { name: 'Actualizar' })).toBe(refresh);
      expect(panel().querySelector('.panel__body')).toBe(body);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(panel().querySelector('.panel__foot')).toHaveTextContent(
        'Las 7 atenciones más recientes',
      );

      // «Actualizar» invalida las atenciones sin deshabilitar el botón: conserva el foco.
      await user.click(refresh);
      await waitFor(() => expect(callsOf(net, 'recent')).toHaveLength(3));
      await waitFor(() => expect(refresh).not.toHaveAttribute('aria-busy'));
      expect(refresh).toBeEnabled();
      expect(refresh).toHaveFocus();
      expect(scrolling.calls()).toBe(0);
      scrolling.restore();
    });
  });

  describe('privacidad y permisos', () => {
    it('R26: no muestra sugerencias de IA ni niveles de triage, ni el documento de nadie', async () => {
      setup();
      await rows();
      expect(document.body.textContent).not.toMatch(
        /sugerencia|inteligencia artificial|\bIA\b|nivel \d|prioridad (alta|media|baja)|ESI ?\d/i,
      );
      expect(document.body.textContent).not.toMatch(
        /documento|Cédula|8000000\d/i,
      );
    });

    it.each(['PHYSICIAN', 'NURSE', 'ADMIN'] as const)(
      'R28: %s ve el mismo dashboard y solo pide atenciones: sin sedes, preregistros, detalle ni captura clínica',
      async (role) => {
        const { net } = setup({ role });
        await rows();
        expect(
          screen.getByRole('heading', { level: 1, name: 'Cola priorizada' }),
        ).toBeInTheDocument();
        await waitFor(() => expect(net.calls(LIST)).toHaveLength(4));
        const endpoints = [
          ...new Set(net.requests.map((r) => `${r.method} ${r.path}`)),
        ];
        expect(endpoints).toEqual([LIST]);
        expect(
          net.requests.some((r) => /\/encounters\/|clinical/.test(r.path)),
        ).toBe(false);
        // Cualquiera de los tres roles ve las mismas cifras.
        await waitFor(() =>
          expect(cells().map((cell) => cell.textContent)).toEqual([
            'En espera de triage8',
            'Clasificadas0',
            'En atención3',
          ]),
        );
      },
    );
  });
});
