import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StaffRole } from '../../../shared/api/client';
import {
  formatBogota,
  formatDateBogota,
  formatTimeBogota,
} from '../../../shared/lib/datetime';
import { ENCOUNTER_STATUS_VIEW } from '../../../shared/lib/encounterStatus';
import {
  ENCOUNTER_ID,
  SITE_SUR,
  encounter,
  encounterSummary,
  fakeApi,
  json,
  nnPatient,
  publicTenants,
  type Handler,
} from '../../../test/fakeApi';
import { renderFeature } from '../../../test/renderFeature';
import { captureFixture } from '../testing/clinicalFixtures';
import { LIST_SUGGESTIONS, noSuggestions } from '../testing/suggestionFixtures';
import { encounterRoutes, triageRoutes } from '../routes';

const DETAIL = `GET /api/v1/encounters/${ENCOUNTER_ID}`;
const CAPTURE = `${DETAIL}/clinical-capture`;

afterEach(() => {
  vi.unstubAllGlobals();
});

function network(routes: Record<string, Handler> = {}) {
  return fakeApi({
    [DETAIL]: json(200, encounter),
    [CAPTURE]: json(200, captureFixture()),
    [LIST_SUGGESTIONS]: noSuggestions,
    ...routes,
  });
}

function openDetail(role: StaffRole = 'RECEPTION') {
  const net = network();
  const user = userEvent.setup();
  renderFeature(encounterRoutes, {
    entries: [`/atenciones/${ENCOUNTER_ID}`],
    role,
  });
  return { net, user };
}

function openCapture() {
  const net = network();
  const user = userEvent.setup();
  renderFeature(triageRoutes, {
    entries: [`/triage/${ENCOUNTER_ID}`],
    role: 'NURSE',
  });
  return { net, user };
}

/** El `dd` que sigue al `dt` «Estado» dentro de `scope`. */
function statusValue(scope: HTMLElement) {
  const term = within(scope)
    .getAllByText('Estado')
    .find((node) => node.tagName === 'DT');
  const value = term?.nextElementSibling as HTMLElement | null;
  expect(value?.tagName).toBe('DD');
  return value!;
}

function expectStatusBadge(value: HTMLElement) {
  const badge = value.querySelector('.badge');
  expect(badge).not.toBeNull();
  expect(badge).toHaveClass(
    `tone--${ENCOUNTER_STATUS_VIEW.WAITING_TRIAGE.tone}`,
  );
  expect(badge).toHaveTextContent('En espera de triage');
  expect(badge!.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
}

describe('UI-04-web detalle y captura de la atención', () => {
  it('R6: el estado del detalle /atenciones/:id es una insignia de estado', async () => {
    openDetail();
    await screen.findByText('Llegada (hora legal)');
    expectStatusBadge(
      statusValue(screen.getByRole('region', { name: 'Atención' })),
    );
  });

  it('R6: el estado del contexto de la captura /triage/:id es una insignia de estado', async () => {
    openCapture();
    const context = await screen.findByRole('region', {
      name: 'Contexto de la atención',
    });
    expectStatusBadge(statusValue(context));
  });

  it('R4: «Cancelar atención» y «Volver» son botones secundarios; «Confirmar cancelación» sigue siendo el principal', async () => {
    const { user } = openDetail('RECEPTION');
    const open = await screen.findByRole('button', {
      name: 'Cancelar atención',
    });
    expect(open).toHaveClass('button', 'button--secondary');
    await user.click(open);
    const form = screen.getByRole('form', { name: 'Cancelar atención' });
    expect(within(form).getByRole('button', { name: 'Volver' })).toHaveClass(
      'button',
      'button--secondary',
    );
    expect(
      within(form).getByRole('button', { name: 'Confirmar cancelación' }),
    ).not.toHaveClass('button--secondary');
  });

  it('R5: cada evento de la línea de tiempo tiene la hora, el evento con sus estados y el actor en tres elementos, sin «·»', async () => {
    openDetail();
    await screen.findByText('Llegada (hora legal)');
    const timeline = screen.getByRole('region', { name: 'Línea de tiempo' });
    expect(timeline.textContent).not.toMatch(/·/);
    const items = within(timeline).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    for (const item of items) {
      const children = [...item.children];
      expect(children.map((node) => node.tagName)).toEqual(['TIME', 'P', 'P']);
      expect(children[2]).toHaveClass('muted');
      // Sin texto suelto entre los tres elementos.
      const loose = [...item.childNodes].filter(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
      );
      expect(loose).toHaveLength(0);
    }
    const [created, changed] = items;
    expect(created.children[0].textContent).toBe(
      formatBogota(encounter.events[0].occurredAt),
    );
    expect(created.children[1].querySelector('strong')).toHaveTextContent(
      'Atención creada',
    );
    expect(created.children[2]).toHaveTextContent('Rosa Recepción');
    expect(changed.children[1]).toHaveTextContent(
      'Cambio de estado (Registrada → En espera de triage)',
    );
    expect(changed.children[2]).toHaveTextContent('Sistema');
  });
});

const LIST = 'GET /api/v1/encounters';

const nnListItem = encounterSummary({
  id: 'e0e0e0e0-0000-4000-8000-000000000002',
  status: 'CANCELLED',
  origin: 'DIRECT',
  siteId: SITE_SUR.id,
  siteName: SITE_SUR.name,
  patient: nnPatient,
});

function openList(items = [encounterSummary(), nnListItem]) {
  const net = fakeApi({
    'GET /api/v1/public/tenants': json(200, publicTenants),
    [LIST]: json(200, { items }),
  });
  const view = renderFeature(encounterRoutes, {
    entries: ['/atenciones'],
    role: 'NURSE',
  });
  return { net, ...view };
}

describe('UI-04-web lista /atenciones', () => {
  it('R3: la página va dentro de .dashboard y la tabla es una data-table apilable dentro de un panel', async () => {
    const { container } = openList();
    const table = await screen.findByRole('table');
    expect(container.querySelector('.dashboard > .stack')).not.toBeNull();
    expect(table).toHaveClass('data-table');
    expect(table).not.toHaveClass('data-table--simple');
    expect(table.closest('.panel')).not.toBeNull();
    expect(container.querySelector('.table-wrap')).toBeNull();
  });

  it('R7: encabezado con un h1 y su descripción, filtros debajo y panel con h2 «Resultados»', async () => {
    openList();
    await screen.findByRole('table');
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Atenciones');
    const description = screen.getByText(
      'Consulta las atenciones por estado y sede.',
    );
    expect(description.tagName).toBe('P');
    const panel = screen.getByRole('region', { name: 'Resultados' });
    expect(
      within(panel).getByRole('heading', { level: 2, name: 'Resultados' }),
    ).toBeVisible();
    const status = screen.getByLabelText('Estado');
    const site = screen.getByLabelText('Sede');
    for (const filter of [status, site]) {
      expect(panel.contains(filter)).toBe(false);
      expect(
        headings[0].compareDocumentPosition(filter) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        filter.compareDocumentPosition(panel) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    expect(within(panel).getByRole('table')).toHaveAccessibleName('Resultados');
  });

  it('R7: columnas Paciente (nombre y documento), Sede, Llegada (hora sin segundos y fecha), Estado (insignia), Origen y «Ver atención» secundario pequeño', async () => {
    openList();
    const table = await screen.findByRole('table');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Paciente', 'Sede', 'Llegada', 'Estado', 'Origen', 'Acción']);
    const [first, second] = within(table).getAllByRole('row').slice(1);
    const cells = within(first).getAllByRole('cell');
    expect(cells).toHaveLength(6);
    expect(cells[0].querySelector('.cell-name')).toHaveTextContent(
      'Laura Gómez Pérez',
    );
    expect(cells[0].querySelector('.cell-sub')).toHaveTextContent(
      'Cédula de ciudadanía 1032456789',
    );
    expect(cells[1]).toHaveTextContent('Sede Norte');
    const arrival = encounterSummary().arrivalAt;
    // textContent exacto: toHaveTextContent normaliza el U+00A0 de «a. m.» del lado recibido.
    expect(cells[2].querySelector('time')!.textContent).toBe(
      formatTimeBogota(arrival),
    );
    expect(cells[2].querySelector('time')).toHaveAttribute('dateTime', arrival);
    expect(cells[2].querySelector('.cell-sub')).toHaveTextContent(
      formatDateBogota(arrival),
    );
    expect(cells[2]).not.toHaveTextContent(formatBogota(arrival));
    expect(cells[3].querySelector('.badge')).toHaveTextContent(
      'En espera de triage',
    );
    expect(cells[3].querySelector('.badge')).toHaveClass(
      `tone--${ENCOUNTER_STATUS_VIEW.WAITING_TRIAGE.tone}`,
    );
    expect(cells[4]).toHaveTextContent('Pre-registro (app)');
    const link = within(cells[5]).getByRole('link', { name: 'Ver atención' });
    expect(link).toHaveClass('button', 'button--secondary', 'button--sm');
    expect(link).toHaveAttribute('href', `/atenciones/${ENCOUNTER_ID}`);
    expect(link).toHaveAccessibleDescription('Laura Gómez Pérez');

    // NN: sin documento, sin línea vacía.
    const nnCells = within(second).getAllByRole('cell');
    expect(nnCells[0]).toHaveTextContent('Paciente NN');
    expect(nnCells[0].querySelector('.cell-sub')).toBeNull();
    expect(nnCells[3].querySelector('.badge')).toHaveClass(
      `tone--${ENCOUNTER_STATUS_VIEW.CANCELLED.tone}`,
    );
  });

  it('R7: el pie del panel tiene «Página 1» y el paginador de UI-02 con botones secundarios y sus reglas de habilitación', async () => {
    openList();
    const panel = await screen.findByRole('region', { name: 'Resultados' });
    await within(panel).findByRole('table');
    const footer = panel.querySelector('.panel__foot') as HTMLElement;
    expect(footer).not.toBeNull();
    expect(footer).toHaveTextContent('Página 1');
    const prev = within(footer).getByRole('button', { name: 'Anterior' });
    const next = within(footer).getByRole('button', { name: 'Siguiente' });
    for (const button of [prev, next]) {
      expect(button).toHaveClass('button', 'button--secondary', 'button--sm');
      expect(button.querySelector('svg')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      expect(button.closest('.pager')).not.toBeNull();
    }
    // F-02-web R30: offset 0 y menos de 50 elementos.
    expect(prev).toBeDisabled();
    expect(next).toBeDisabled();
  });
});
