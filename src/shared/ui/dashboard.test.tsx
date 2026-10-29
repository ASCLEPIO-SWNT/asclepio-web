import {
  ClipboardDocumentListIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ENCOUNTER_STATUS_VIEW } from '../lib/encounterStatus';
import { ENCOUNTER_STATUSES, ENCOUNTER_STATUS_LABELS } from '../lib/labels';
import { DashboardPage } from './DashboardPage';
import { DataCell, DataRow, DataTable } from './DataTable';
import { LiveNote } from './LiveNote';
import { Notice } from './Notice';
import { Panel } from './Panel';
import { PanelState } from './PanelState';
import { PageHeader } from './PageHeader';
import { PendingStrip } from './PendingStrip';
import { RefreshButton } from './RefreshButton';
import { StatusBadge } from './StatusBadge';
import { SummaryBar } from './SummaryBar';
import { SummaryCell } from './SummaryCell';
import { SummaryFilter } from './SummaryFilter';

/** `b` aparece después de `a` en el documento. */
const follows = (a: Node, b: Node) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

function Composition({ filter = false }: { filter?: boolean }) {
  return (
    <DashboardPage
      header={
        <PageHeader
          title="Reportes"
          description="Resumen de las atenciones por estado y por sede."
          actions={<RefreshButton onRefresh={() => undefined} busy={false} />}
        />
      }
      summary={
        <SummaryBar
          filter={
            filter ? (
              <SummaryFilter id="site" label="Sede">
                <select id="site" />
              </SummaryFilter>
            ) : undefined
          }
        >
          <SummaryCell
            label="En espera de triage"
            icon={ClockIcon}
            tone="warn"
            state="ready"
            value={8}
          />
          <SummaryCell
            label="En atención"
            icon={HeartIcon}
            tone="ok"
            state="ready"
            value={0}
          />
        </SummaryBar>
      }
      main={
        <Panel
          id="panel-sedes"
          title="Atenciones por sede"
          meta={<LiveNote seconds={30} />}
        >
          <p>contenido</p>
        </Panel>
      }
      pending={
        <PendingStrip
          id="pendiente"
          title="Indicadores y reportes"
          feature="F-07"
        >
          Aquí aparecerán los tiempos y el CSV.
        </PendingStrip>
      }
    />
  );
}

describe('UI-02-web componentes del dashboard', () => {
  describe('estructura de la pantalla', () => {
    it('R3: DashboardPage monta encabezado, barra de resumen, panel y franja en ese orden de documento y sin columna lateral', () => {
      const { container } = render(<Composition filter />);
      const heading = screen.getByRole('heading', { level: 1 });
      const summary = screen.getByRole('region', { name: 'Indicadores' });
      const panel = screen.getByRole('region', {
        name: 'Atenciones por sede',
      });
      const pending = screen.getByRole('region', {
        name: 'Indicadores y reportes',
      });
      expect(follows(heading, summary)).toBe(true);
      expect(follows(summary, panel)).toBe(true);
      expect(follows(panel, pending)).toBe(true);
      // Las cuatro zonas son hijas directas de la rejilla vertical: una sola columna.
      const stack = container.querySelector('.dashboard > .stack');
      expect(stack).not.toBeNull();
      expect(
        [...stack!.children].map((zone) => zone.tagName.toLowerCase()),
      ).toEqual(['header', 'section', 'section', 'section']);
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
      expect(container.querySelector('aside')).toBeNull();
    });

    it('R39: el encabezado de página, el panel y su pie no añaden un segundo banner: el del marco es el único', () => {
      render(<Composition filter />);
      // Sin el marco montado no hay ningún `banner`: en jsdom todo `header` lo sería.
      expect(screen.queryAllByRole('banner')).toHaveLength(0);
      expect(document.querySelector('header.page-header')).toHaveAttribute(
        'role',
        'none',
      );
    });

    it('R3: la franja «pendiente» es opcional: sin ella la pantalla tiene tres zonas', () => {
      const { container } = render(
        <DashboardPage
          header={<PageHeader title="Triage" description="Descripción" />}
          summary={<SummaryBar>{null}</SummaryBar>}
          main={
            <Panel id="p" title="Atenciones pendientes">
              <p>contenido</p>
            </Panel>
          }
        />,
      );
      expect(container.querySelector('.stack')!.children).toHaveLength(3);
    });

    it('R2: PageHeader tiene un único h1, un párrafo de descripción debajo y las acciones en el mismo encabezado', () => {
      const { container } = render(
        <PageHeader
          title="Recepción"
          description="Confirma la llegada de pacientes."
          actions={
            <>
              <button type="button">Actualizar</button>
              <a href="/recepcion/registro">Registro directo</a>
            </>
          }
        />,
      );
      const headings = screen.getAllByRole('heading');
      expect(headings).toHaveLength(1);
      expect(headings[0]).toHaveTextContent('Recepción');
      expect(headings[0].tagName).toBe('H1');
      const description = screen.getByText('Confirma la llegada de pacientes.');
      expect(description.tagName).toBe('P');
      expect(follows(headings[0], description)).toBe(true);
      const header = container.querySelector('header.page-header')!;
      const actions = header.querySelector('.page-actions')!;
      expect(
        within(actions as HTMLElement).getByRole('button', {
          name: 'Actualizar',
        }),
      ).toBeVisible();
      expect(
        within(actions as HTMLElement).getByRole('link', {
          name: 'Registro directo',
        }),
      ).toBeVisible();
      expect(follows(description, actions)).toBe(true);
    });

    it('R2: sin acciones el encabezado no abre un contenedor vacío', () => {
      const { container } = render(
        <PageHeader title="Reportes" description="Resumen." />,
      );
      expect(container.querySelector('.page-actions')).toBeNull();
    });

    it('R3: Panel es una región nombrada por su h2, sin icono, con la nota a la derecha y pie opcional', () => {
      const { container } = render(
        <>
          <Panel
            id="panel-uno"
            title="Atenciones pendientes"
            meta={<LiveNote seconds={30} />}
            footer={<span>Página 1</span>}
          >
            <p>cuerpo</p>
          </Panel>
          <Panel id="panel-dos" title="Sin pie">
            <p>cuerpo</p>
          </Panel>
        </>,
      );
      const region = screen.getByRole('region', {
        name: 'Atenciones pendientes',
      });
      const title = within(region).getByRole('heading', { level: 2 });
      expect(title).toHaveTextContent('Atenciones pendientes');
      expect(title.querySelector('svg')).toBeNull();
      expect(region).toHaveAttribute('aria-labelledby', title.id);
      const meta = region.querySelector('.panel__meta')!;
      expect(follows(title, meta)).toBe(true);
      expect(
        within(meta as HTMLElement).getByText('Se actualiza cada 30 s'),
      ).toBeVisible();
      expect(region.querySelector('.panel__body')).toHaveTextContent('cuerpo');
      expect(region.querySelector('footer.panel__foot')).toHaveTextContent(
        'Página 1',
      );
      expect(
        screen
          .getByRole('region', { name: 'Sin pie' })
          .querySelector('.panel__foot'),
      ).toBeNull();
      expect(container.querySelectorAll('.panel__meta')).toHaveLength(1);
    });
  });

  describe('LiveNote y RefreshButton', () => {
    it('R38: la nota de actualización es texto plano «Se actualiza cada 30 s», sin role ni aria-live', () => {
      const { container } = render(
        <>
          <LiveNote seconds={30} />
          <LiveNote seconds={45} />
        </>,
      );
      const note = screen.getByText('Se actualiza cada 30 s');
      expect(note.tagName).toBe('SPAN');
      expect(note).toHaveClass('live');
      expect(note).not.toHaveAttribute('role');
      expect(note.closest('[aria-live]')).toBeNull();
      expect(note.closest('[role]')).toBeNull();
      expect(screen.getByText('Se actualiza cada 45 s')).toBeVisible();
      // El punto es decorativo (`::before` en el CSS): no hay elemento propio ni región viva.
      expect(note.children).toHaveLength(0);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(container.querySelector('[aria-live]')).toBeNull();
    });

    it('R37: «Actualizar» no se deshabilita, marca aria-busy mientras actualiza y el mismo nodo conserva el foco', async () => {
      const onRefresh = vi.fn();
      const user = userEvent.setup();
      const { rerender } = render(
        <RefreshButton onRefresh={onRefresh} busy={false} />,
      );
      const button = screen.getByRole('button', { name: 'Actualizar' });
      await user.tab();
      expect(button).toHaveFocus();
      expect(button).not.toHaveAttribute('aria-busy', 'true');

      rerender(<RefreshButton onRefresh={onRefresh} busy />);
      expect(screen.getByRole('button', { name: 'Actualizar' })).toBe(button);
      expect(button).toHaveFocus();
      expect(button).toBeEnabled();
      expect(button).toHaveAttribute('aria-busy', 'true');

      // Una nueva pulsación durante la actualización sigue repitiendo la petición.
      await user.click(button);
      expect(onRefresh).toHaveBeenCalledTimes(1);

      rerender(<RefreshButton onRefresh={onRefresh} busy={false} />);
      expect(button).toHaveFocus();
      expect(button).not.toHaveAttribute('aria-busy', 'true');
    });

    it('R31: «Actualizar» es un botón secundario con icono decorativo y su nombre es solo el texto', () => {
      render(<RefreshButton onRefresh={() => undefined} busy={false} />);
      const button = screen.getByRole('button', { name: 'Actualizar' });
      expect(button).toHaveClass('button', 'button--secondary');
      expect(button).toHaveAttribute('type', 'button');
      expect(button.querySelector('svg')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
    });
  });

  describe('barra de resumen', () => {
    it('R3: SummaryBar es la región «Indicadores» con una lista y un elemento por indicador y escribe --cells', () => {
      render(
        <SummaryBar>
          <SummaryCell
            label="En espera de triage"
            icon={ClockIcon}
            tone="warn"
            state="ready"
            value={8}
          />
          <SummaryCell
            label="Clasificadas"
            icon={ClipboardDocumentListIcon}
            tone="accent"
            state="ready"
            value={0}
          />
          <SummaryCell
            label="En atención"
            icon={HeartIcon}
            tone="ok"
            state="ready"
            value={3}
          />
        </SummaryBar>,
      );
      const region = screen.getByRole('region', { name: 'Indicadores' });
      const list = within(region).getByRole('list');
      expect(list.tagName).toBe('UL');
      // El `ul` conserva su semántica de lista aunque el CSS lo deje en `display: contents`.
      expect(list).toHaveAttribute('role', 'list');
      expect(within(list).getAllByRole('listitem')).toHaveLength(3);
      expect(region.style.getPropertyValue('--cells')).toBe('3');
      expect(region).not.toHaveClass('summary--filter');
    });

    it('R34: --cells cuenta solo los indicadores que se pintan, no los vacíos de un condicional', () => {
      render(
        <SummaryBar>
          {false}
          {null}
          <SummaryCell
            label="En espera de triage"
            icon={ClockIcon}
            tone="warn"
            state="ready"
            value={8}
          />
        </SummaryBar>,
      );
      expect(
        screen
          .getByRole('region', { name: 'Indicadores' })
          .style.getPropertyValue('--cells'),
      ).toBe('1');
    });

    it('R3: el filtro vive dentro de la región, después de la lista y fuera de ella', () => {
      render(
        <SummaryBar
          filter={
            <SummaryFilter id="site" label="Sede">
              <select id="site">
                <option>Todas las sedes</option>
              </select>
            </SummaryFilter>
          }
        >
          <SummaryCell
            label="En espera de triage"
            icon={ClockIcon}
            tone="warn"
            state="ready"
            value={8}
          />
        </SummaryBar>,
      );
      const region = screen.getByRole('region', { name: 'Indicadores' });
      const list = within(region).getByRole('list');
      const select = within(region).getByLabelText('Sede');
      expect(region).toHaveClass('summary', 'summary--filter');
      expect(region.style.getPropertyValue('--cells')).toBe('1');
      expect(select.closest('ul')).toBeNull();
      expect(list.contains(select)).toBe(false);
      expect(follows(list, select)).toBe(true);
      expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    });

    it('R5: SummaryCell muestra icono, etiqueta y cifra, sin línea de ámbito', () => {
      render(
        <ul>
          <SummaryCell
            label="Preregistros pendientes"
            icon={ClipboardDocumentListIcon}
            tone="accent"
            state="ready"
            value={3}
          />
        </ul>,
      );
      const cell = screen.getByRole('listitem');
      expect(cell).toHaveClass('summary__cell', 'tone--accent');
      expect(cell.querySelector('.summary__icon svg')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      expect(within(cell).getByText('Preregistros pendientes')).toHaveClass(
        'summary__label',
      );
      expect(within(cell).getByText('3')).toHaveClass('summary__value');
      // Solo etiqueta y cifra: nada más (sin periodo, sin sede, sin variación).
      expect(cell).toHaveTextContent(/^Preregistros pendientes3$/);
      expect(cell).not.toHaveAttribute('aria-busy');
    });

    it('R8: una cifra que llena la página se escribe «N+» con el texto oculto «Al menos N»', () => {
      render(
        <ul>
          <SummaryCell
            label="En espera de triage"
            icon={ClockIcon}
            tone="warn"
            state="ready"
            value={100}
            capped
          />
          <SummaryCell
            label="Clasificadas"
            icon={ClipboardDocumentListIcon}
            tone="accent"
            state="ready"
            value={99}
          />
        </ul>,
      );
      const [capped, exact] = screen.getAllByRole('listitem');
      const value = capped.querySelector('.summary__value')!;
      expect(value).toHaveTextContent('100+Al menos 100');
      expect(within(capped).getByText('+')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      expect(within(capped).getByText('+')).toHaveClass('summary__plus');
      expect(within(capped).getByText('Al menos 100')).toHaveClass(
        'visually-hidden',
      );
      // Con menos de 100 la cifra es exacta: sin «+» ni texto oculto.
      expect(exact.querySelector('.summary__value')).toHaveTextContent(/^99$/);
      expect(within(exact).queryByText('+')).not.toBeInTheDocument();
      expect(within(exact).queryByText(/Al menos/)).not.toBeInTheDocument();
    });

    it('R20: un indicador vacío muestra la cifra 0', () => {
      render(
        <ul>
          <SummaryCell
            label="En atención"
            icon={HeartIcon}
            tone="ok"
            state="ready"
            value={0}
          />
        </ul>,
      );
      expect(screen.getByText('0')).toHaveClass('summary__value');
    });

    it('R19: un indicador que carga lleva aria-busy y un texto oculto, sin role ni región viva', () => {
      render(
        <ul>
          <SummaryCell
            label="En espera de triage"
            icon={ClockIcon}
            tone="warn"
            state="loading"
          />
        </ul>,
      );
      const cell = screen.getByRole('listitem');
      expect(cell).toHaveAttribute('aria-busy', 'true');
      expect(cell).not.toHaveAttribute('role');
      expect(within(cell).getByText('Cargando indicador…')).toHaveClass(
        'visually-hidden',
      );
      expect(cell.querySelectorAll('.skeleton')).toHaveLength(2);
      expect(cell.querySelector('.summary__icon svg')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('R21: un indicador con error muestra la etiqueta, «No se pudo cargar» y «Reintentar: {indicador}», sin región viva', async () => {
      const onRetry = vi.fn();
      const user = userEvent.setup();
      render(
        <ul>
          <SummaryCell
            label="En espera de triage"
            icon={ClockIcon}
            tone="warn"
            state="error"
            value={12}
            onRetry={onRetry}
          />
        </ul>,
      );
      const cell = screen.getByRole('listitem');
      expect(cell).toHaveClass('summary__cell--error', 'tone--error');
      expect(within(cell).getByText('En espera de triage')).toBeVisible();
      expect(within(cell).getByText('No se pudo cargar')).toHaveClass(
        'summary__error',
      );
      // El error gana a los datos antiguos: la cifra no se pinta.
      expect(within(cell).queryByText('12')).not.toBeInTheDocument();
      const retry = screen.getByRole('button', {
        name: 'Reintentar: En espera de triage',
      });
      expect(retry).toHaveTextContent('Reintentar');
      expect(retry).toHaveClass('button--sm');
      // El nombre exacto «Reintentar» queda para el botón del panel.
      expect(
        screen.queryByRole('button', { name: 'Reintentar' }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(cell.querySelector('.summary__icon svg')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      await user.click(retry);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('R22: un indicador con 403 muestra «Sin permiso» sin cifra, sin botón y sin región viva', () => {
      render(
        <ul>
          <SummaryCell
            label="Clasificadas"
            icon={ClipboardDocumentListIcon}
            tone="accent"
            state="forbidden"
            value={4}
          />
        </ul>,
      );
      const cell = screen.getByRole('listitem');
      expect(within(cell).getByText('Clasificadas')).toBeVisible();
      expect(within(cell).getByText('Sin permiso')).toHaveClass(
        'summary__error',
      );
      expect(within(cell).queryByText('4')).not.toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(cell).toHaveClass('tone--error');
    });

    it('R19: SummaryFilter asocia la etiqueta «Sede» al control y pinta el error de sedes bajo el control', async () => {
      const onRetry = vi.fn();
      const user = userEvent.setup();
      render(
        <>
          <SummaryFilter id="site" label="Sede">
            <select id="site" disabled>
              <option>Todas las sedes</option>
            </select>
          </SummaryFilter>
          <SummaryFilter
            id="site-2"
            label="Sede"
            error={{
              message: 'No se pudieron cargar las sedes.',
              onRetry,
            }}
          >
            <select id="site-2" disabled>
              <option>Todas las sedes</option>
            </select>
          </SummaryFilter>
        </>,
      );
      const [plain, failing] = screen.getAllByLabelText('Sede');
      expect(plain.tagName).toBe('SELECT');
      expect(
        plain.closest('.summary__filter')!.querySelector('label'),
      ).toHaveTextContent('Sede');
      expect(
        plain.closest('.summary__filter')!.querySelector('[role="alert"]'),
      ).toBeNull();
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('No se pudieron cargar las sedes.');
      expect(follows(failing, alert)).toBe(true);
      expect(failing.closest('.summary__filter')).toContainElement(alert);
      await user.click(
        within(alert).getByRole('button', { name: 'Reintentar' }),
      );
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('estados de un panel', () => {
    it('R19: la carga de un panel es un role="status" con su mensaje y esqueletos decorativos', () => {
      render(<PanelState kind="loading" message="Cargando la bandeja…" />);
      const status = screen.getByRole('status');
      expect(status).toHaveTextContent('Cargando la bandeja…');
      const skeletons = status.querySelector('.skeletons')!;
      expect(skeletons).toHaveAttribute('aria-hidden', 'true');
      expect(skeletons.querySelectorAll('.skeleton')).toHaveLength(3);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('R20: un panel vacío no tiene rol, y muestra icono, mensaje, pista y una acción de siguiente paso', () => {
      const { container } = render(
        <PanelState
          kind="empty"
          icon={ClipboardDocumentListIcon}
          message="No hay preregistros pendientes."
          hint="Cuando un paciente envíe uno desde la aplicación, aparecerá aquí."
          action={
            <a href="/recepcion/registro">Registrar una llegada directa</a>
          }
        />,
      );
      const state = container.firstElementChild!;
      expect(state).not.toHaveAttribute('role');
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(state.querySelector('.panel-state__icon svg')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      expect(state.querySelector('.panel-state__icon')).toHaveClass(
        'tone--neutral',
      );
      expect(screen.getByText('No hay preregistros pendientes.')).toHaveClass(
        'panel-state__msg',
      );
      expect(
        screen.getByText(
          'Cuando un paciente envíe uno desde la aplicación, aparecerá aquí.',
        ),
      ).toHaveClass('muted');
      expect(
        screen.getByRole('link', { name: 'Registrar una llegada directa' }),
      ).toBeVisible();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('R20: un panel vacío sin pista ni acción solo muestra su mensaje', () => {
      const { container } = render(
        <PanelState kind="empty" message="Aún no hay atenciones." />,
      );
      expect(container).toHaveTextContent(/^Aún no hay atenciones\.$/);
      expect(container.querySelector('.muted')).toBeNull();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('R21: el error de un panel es un role="alert" con «Reintentar», que no se deshabilita mientras repite', async () => {
      const onRetry = vi.fn();
      const user = userEvent.setup();
      const { rerender } = render(
        <PanelState
          kind="error"
          message="No se pudo cargar la bandeja."
          onRetry={onRetry}
        />,
      );
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('No se pudo cargar la bandeja.');
      expect(alert.querySelector('.panel-state__icon')).toHaveClass(
        'tone--error',
      );
      const retry = within(alert).getByRole('button', { name: 'Reintentar' });
      await user.click(retry);
      expect(onRetry).toHaveBeenCalledTimes(1);

      rerender(
        <PanelState
          kind="error"
          message="No se pudo cargar la bandeja."
          onRetry={onRetry}
          retrying
        />,
      );
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBe(retry);
      expect(retry).toBeEnabled();
      expect(retry).toHaveAttribute('aria-busy', 'true');
    });

    it('R22: el 403 de un panel es un role="alert" con su mensaje y sin «Reintentar»', () => {
      render(
        <PanelState
          kind="forbidden"
          message="No tienes permiso para ver esta página."
        />,
      );
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(
        'No tienes permiso para ver esta página.',
      );
      expect(alert.querySelector('.panel-state__icon')).toHaveClass(
        'tone--error',
      );
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('insignias y estados', () => {
    it.each(ENCOUNTER_STATUSES)(
      'R30: el estado %s se presenta con icono, texto y clase de tono, no solo con color',
      (status) => {
        const { icon, tone } = ENCOUNTER_STATUS_VIEW[status];
        render(
          <StatusBadge tone={tone} icon={icon}>
            {ENCOUNTER_STATUS_LABELS[status]}
          </StatusBadge>,
        );
        const badge = screen.getByText(ENCOUNTER_STATUS_LABELS[status]);
        expect(badge).toHaveClass('badge', `tone--${tone}`);
        expect(badge.querySelector('svg')).toHaveAttribute(
          'aria-hidden',
          'true',
        );
      },
    );

    it('R30: la identidad verificada y sin verificar llevan icono, texto y tono propios', () => {
      render(
        <>
          <StatusBadge tone="ok" icon={ShieldCheckIcon}>
            Identidad verificada
          </StatusBadge>
          <StatusBadge tone="warn" icon={ExclamationTriangleIcon}>
            Identidad sin verificar
          </StatusBadge>
        </>,
      );
      const verified = screen.getByText('Identidad verificada');
      const unverified = screen.getByText('Identidad sin verificar');
      expect(verified).toHaveClass('badge', 'tone--ok');
      expect(unverified).toHaveClass('badge', 'tone--warn');
      for (const badge of [verified, unverified]) {
        expect(badge.querySelector('svg')).toHaveAttribute(
          'aria-hidden',
          'true',
        );
      }
    });
  });

  describe('tablas', () => {
    function Table({ simple = false }: { simple?: boolean }) {
      return (
        <>
          <h2 id="tabla">Atenciones recientes</h2>
          <DataTable
            labelledBy="tabla"
            simple={simple}
            columns={[
              { id: 'patient', header: 'Paciente' },
              { id: 'site', header: 'Sede' },
              { id: 'count', header: 'En espera de triage', numeric: true },
              { id: 'action', header: 'Acción', hiddenHeader: true },
            ]}
          >
            <DataRow>
              <DataCell kind="main">
                <span className="cell-name">Daniel Castro Mora</span>
              </DataCell>
              <DataCell label="Sede">Sede Sur</DataCell>
              <DataCell label="Llegada" kind="time">
                <time dateTime="2026-10-28T16:12:00.000Z">11:12 a. m.</time>
              </DataCell>
              <DataCell kind="num">4</DataCell>
              <DataCell kind="actions">
                <a href="/atenciones/1">Ver atención</a>
              </DataCell>
            </DataRow>
          </DataTable>
        </>
      );
    }

    it('R31: DataTable usa table, row, columnheader y cell explícitos y se nombra por el h2 del panel', () => {
      const { container } = render(<Table />);
      const table = screen.getByRole('table', { name: 'Atenciones recientes' });
      expect(table).toHaveAttribute('role', 'table');
      expect(table).toHaveAttribute('aria-labelledby', 'tabla');
      expect(table).toHaveClass('data-table');
      expect(table).not.toHaveClass('data-table--simple');
      const headers = within(table).getAllByRole('columnheader');
      expect(headers.map((h) => h.textContent)).toEqual([
        'Paciente',
        'Sede',
        'En espera de triage',
        'Acción',
      ]);
      for (const header of headers) {
        expect(header).toHaveAttribute('role', 'columnheader');
        expect(header).toHaveAttribute('scope', 'col');
      }
      expect(headers[2]).toHaveClass('num');
      expect(within(table).getAllByRole('row')).toHaveLength(2);
      for (const row of container.querySelectorAll('tr')) {
        expect(row).toHaveAttribute('role', 'row');
      }
      for (const cell of container.querySelectorAll('td')) {
        expect(cell).toHaveAttribute('role', 'cell');
      }
      expect(within(table).getAllByRole('cell')).toHaveLength(5);
    });

    it('R31: el encabezado de la acción está visualmente oculto y las etiquetas del apilado salen de data-label', () => {
      const { container } = render(<Table />);
      expect(screen.getByText('Acción')).toHaveClass('visually-hidden');
      const cells = [...container.querySelectorAll('tbody td')];
      expect(cells.map((cell) => cell.getAttribute('data-label'))).toEqual([
        null,
        'Sede',
        'Llegada',
        null,
        null,
      ]);
      expect(cells.map((cell) => cell.className)).toEqual([
        'cell-main',
        '',
        'cell-time',
        'num',
        'cell-actions',
      ]);
    });

    it('R31: DataCell acepta un id para que el control de la fila lo use en aria-describedby', () => {
      render(
        <>
          <h2 id="t">Tabla</h2>
          <DataTable
            labelledBy="t"
            columns={[{ id: 'patient', header: 'Paciente' }]}
          >
            <DataRow>
              <DataCell kind="main" id="paciente-1">
                Daniel Castro Mora
              </DataCell>
            </DataRow>
          </DataTable>
        </>,
      );
      const cell = screen.getByRole('cell', { name: 'Daniel Castro Mora' });
      expect(cell).toHaveAttribute('id', 'paciente-1');
      // Sin `id`, la celda no lo inventa.
      expect(
        render(
          <table>
            <tbody>
              <tr>
                <DataCell>otra</DataCell>
              </tr>
            </tbody>
          </table>,
        ).container.querySelector('td'),
      ).not.toHaveAttribute('id');
    });

    it('R34: la tabla simple (por sede) lo declara para no apilarse', () => {
      render(<Table simple />);
      expect(
        screen.getByRole('table', { name: 'Atenciones recientes' }),
      ).toHaveClass('data-table', 'data-table--simple');
    });

    it('R37: las filas con key = id conservan el nodo enfocado y su estado local cuando llegan datos nuevos', async () => {
      const user = userEvent.setup();
      function Rows({ ids }: { ids: string[] }) {
        return (
          <>
            <h2 id="t">Tabla</h2>
            <DataTable
              labelledBy="t"
              columns={[
                { id: 'name', header: 'Nombre' },
                { id: 'ok', header: 'Marca' },
              ]}
            >
              {ids.map((id) => (
                <DataRow key={id}>
                  <DataCell kind="main">Fila {id}</DataCell>
                  <DataCell>
                    <LocalState id={id} />
                  </DataCell>
                </DataRow>
              ))}
            </DataTable>
          </>
        );
      }
      function LocalState({ id }: { id: string }) {
        const [checked, setChecked] = useState(false);
        return (
          <label>
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
            />
            Marca {id}
          </label>
        );
      }
      const { rerender } = render(<Rows ids={['b', 'a']} />);
      const box = screen.getByLabelText('Marca a');
      await user.click(box);
      expect(box).toBeChecked();
      expect(box).toHaveFocus();
      const rowNode = box.closest('tr');

      // Llega una fila nueva arriba y otra desaparece: la fila `a` sigue siendo la misma.
      rerender(<Rows ids={['c', 'b', 'a']} />);
      expect(screen.getByLabelText('Marca a')).toBe(box);
      expect(box.closest('tr')).toBe(rowNode);
      expect(box).toBeChecked();
      expect(box).toHaveFocus();
      expect(screen.getByLabelText('Marca c')).not.toBeChecked();
      rerender(<Rows ids={['c', 'a']} />);
      expect(screen.getByLabelText('Marca a')).toBe(box);
      expect(box).toBeChecked();
      expect(box).toHaveFocus();
    });
  });

  describe('franja pendiente y avisos', () => {
    it('R18: PendingStrip no tiene botones, enlaces ni formularios, y lleva la insignia y la frase de «pendiente»', () => {
      const { container } = render(
        <PendingStrip
          id="pendiente"
          title="Cola por nivel y espera"
          feature="F-06"
        >
          Aquí aparecerá la cola priorizada.
        </PendingStrip>,
      );
      const strip = screen.getByRole('region', {
        name: 'Cola por nivel y espera',
      });
      expect(
        within(strip).getByRole('heading', { level: 2 }),
      ).toHaveTextContent('Cola por nivel y espera');
      expect(
        within(strip).getByText('Aquí aparecerá la cola priorizada.'),
      ).toBeVisible();
      expect(within(strip).getByText('Próximamente')).toHaveClass(
        'badge',
        'tone--neutral',
      );
      expect(
        within(strip).getByText('Esta funcionalidad llega en F-06.'),
      ).toBeVisible();
      expect(
        container.querySelector('button, a, form, input, select'),
      ).toBeNull();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      for (const svg of container.querySelectorAll('svg')) {
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      }
    });

    it('R12: Notice sin icono conserva exactamente su marcado', () => {
      const { container } = render(<Notice>Preregistro rechazado.</Notice>);
      expect(container.innerHTML).toBe(
        '<div role="status" class="status status--ok notice">Preregistro rechazado.</div>',
      );
    });

    it('R12: Notice con icono lo antepone, decorativo, y agrupa el texto y el enlace en un solo elemento', () => {
      render(
        <Notice icon={ClockIcon}>
          Llegada confirmada. <a href="/atenciones/1">Ver atención</a>
        </Notice>,
      );
      const notice = screen.getByRole('status');
      expect(notice).toHaveClass('status', 'status--ok', 'notice');
      expect(notice.firstElementChild!.tagName.toLowerCase()).toBe('svg');
      expect(notice.firstElementChild).toHaveAttribute('aria-hidden', 'true');
      expect(notice.children).toHaveLength(2);
      expect(notice.children[1].tagName).toBe('SPAN');
      expect(
        within(notice).getByRole('link', { name: 'Ver atención' }),
      ).toBeVisible();
    });
  });
});
