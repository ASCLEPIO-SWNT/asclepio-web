import { focusManager, onlineManager } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDateTimeBogota } from '../../../shared/lib/datetime';
import {
  ENCOUNTER_ID,
  SITE_SUR,
  deferred,
  encounter,
  encountersFor,
  fakeApi,
  json,
  networkError,
  nnPatient,
  patient,
  pendingPreRegistration,
  problem,
  publicTenants,
  sequence,
  type Handler,
  type RecordedRequest,
} from '../../../test/fakeApi';
import { renderFeature } from '../../../test/renderFeature';
import { watchScrolling } from '../../../test/scroll';
import { norm } from '../../../test/text';
import { receptionRoutes } from '../routes';

const TENANTS = 'GET /api/v1/public/tenants';
const TRAY = 'GET /api/v1/pre-registrations';
const LIST = 'GET /api/v1/encounters';
const confirmOf = (id: string) =>
  `POST /api/v1/pre-registrations/${id}/confirm`;
const rejectOf = (id: string) => `POST /api/v1/pre-registrations/${id}/reject`;

const FIRST = pendingPreRegistration;
const SECOND = {
  ...pendingPreRegistration,
  id: 'c0c0c0c0-0000-4000-8000-000000000002',
  siteId: SITE_SUR.id,
  siteName: SITE_SUR.name,
  identityVerified: true,
  chiefComplaintText: 'Fiebre y tos desde hace dos días',
  patient: {
    ...patient,
    id: 'b0b0b0b0-0000-4000-8000-000000000009',
    fullName: 'Ricardo Medina Soto',
    documentType: 'CC' as const,
    documentNumber: '80456789',
    birthDate: '1984-11-02',
    sex: 'M' as const,
  },
};
/** Un paciente NN: sin nombre, sin documento y con edad estimada. */
const NN = {
  ...pendingPreRegistration,
  id: 'c0c0c0c0-0000-4000-8000-000000000003',
  chiefComplaintText: 'Caída en la calle',
  patient: nnPatient,
};
/** Un preregistro que llega entre dos ciclos de 30 s. */
const ARRIVAL = {
  ...pendingPreRegistration,
  id: 'c0c0c0c0-0000-4000-8000-000000000004',
  chiefComplaintText: 'Dolor de espalda',
  patient: {
    ...patient,
    id: 'b0b0b0b0-0000-4000-8000-000000000010',
    fullName: 'Marta Lucía Rojas',
    documentNumber: '1098765432',
  },
};

function setup(routes: Record<string, Handler> = {}) {
  const net = fakeApi({
    [TENANTS]: json(200, publicTenants),
    [TRAY]: json(200, [FIRST, SECOND]),
    [LIST]: encountersFor(() => 12),
    ...routes,
  });
  const user = userEvent.setup();
  const view = renderFeature(receptionRoutes, { entries: ['/recepcion'] });
  return { net, user, ...view };
}

const card = (name = 'Laura Gómez Pérez') =>
  screen.findByRole('article', { name });
const bar = () => screen.getByRole('region', { name: 'Indicadores' });
const cells = () => within(bar()).getAllByRole('listitem');
const panel = () =>
  screen.getByRole('region', { name: 'Preregistros pendientes' });
const queryOf = (request: RecordedRequest) => Object.fromEntries(request.query);
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

describe('UI-02-web dashboard de recepción', () => {
  describe('estructura', () => {
    it('R3: encabezado con un h1 y su descripción, región «Indicadores» con lista, panel con h2 y sin columna lateral, en ese orden de documento', async () => {
      const { container } = setup();
      await card();
      const title = screen.getByRole('heading', {
        level: 1,
        name: 'Recepción',
      });
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(title.nextElementSibling).toHaveTextContent(
        'Confirma la llegada de pacientes preregistrados o registra una llegada directa.',
      );

      const region = bar();
      const list = within(region).getByRole('list');
      expect(within(list).getAllByRole('listitem')).toHaveLength(2);
      // El filtro vive en la misma región, pero fuera de la lista.
      expect(list).not.toContainElement(within(region).getByLabelText('Sede'));

      const main = panel();
      const heading = within(main).getByRole('heading', {
        level: 2,
        name: 'Preregistros pendientes',
      });
      expect(heading.querySelector('svg')).toBeNull();
      expect(follows(title, region)).toBe(true);
      expect(follows(region, main)).toBe(true);
      const stack = container.querySelector('.dashboard > .stack');
      expect(
        [...stack!.children].map((zone) => zone.tagName.toLowerCase()),
      ).toEqual(['header', 'section', 'section']);
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    });

    it('R9: «Preregistros pendientes» sale de la bandeja, «En espera de triage» de su petición, ambos siguen la sede y el filtro «Sede» está en la barra', async () => {
      const { net, user } = setup();
      await card();
      const [pending, waiting] = cells();
      expect(pending).toHaveTextContent('Preregistros pendientes2');
      await waitFor(() =>
        expect(waiting).toHaveTextContent('En espera de triage12'),
      );
      // Sin petición propia para el indicador de preregistros: es la longitud de la bandeja.
      expect(net.calls(TRAY)).toHaveLength(1);
      expect(net.calls(LIST)).toHaveLength(1);
      expect(queryOf(net.calls(LIST)[0])).toEqual({
        status: 'WAITING_TRIAGE',
        limit: '100',
      });

      const select = within(bar()).getByLabelText('Sede');
      await waitFor(() => expect(select).toBeEnabled());
      expect(
        within(select)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['Todas las sedes', 'Sede Norte', 'Sede Sur']);

      await user.selectOptions(select, 'Sede Sur');
      await waitFor(() => expect(net.calls(LIST)).toHaveLength(2));
      expect(queryOf(net.calls(LIST)[1])).toEqual({
        status: 'WAITING_TRIAGE',
        limit: '100',
        siteId: SITE_SUR.id,
      });
      expect(queryOf(net.calls(TRAY)[1])).toEqual({ siteId: SITE_SUR.id });
    });

    it('R34: la barra escribe --cells = 2 y los preregistros son una lista de tarjetas article', async () => {
      const { container } = setup();
      const item = await card();
      expect(bar().style.getPropertyValue('--cells')).toBe('2');
      expect(bar()).toHaveClass('summary--filter');
      const grid = container.querySelector('ul.prereg-grid');
      expect(grid).toHaveAccessibleName('Preregistros pendientes');
      const rows = [...grid!.children];
      expect(rows.map((row) => row.tagName.toLowerCase())).toEqual([
        'li',
        'li',
      ]);
      expect(rows[0].firstElementChild).toBe(item);
      expect(item).toHaveClass('prereg');
    });

    it('R8: con 100 atenciones en espera la celda se escribe «100+» y dice «Al menos 100»', async () => {
      setup({ [LIST]: encountersFor(() => 100) });
      await card();
      const waiting = cells()[1];
      await waitFor(() => expect(waiting).toHaveTextContent('100+'));
      expect(within(waiting).getByText('Al menos 100')).toBeInTheDocument();
    });

    it('R38: la nota «Se actualiza cada 30 s» va en la cabecera del panel, a la derecha del h2, como texto plano con punto decorativo', async () => {
      setup();
      await card();
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
      // No es un control: «Actualizar» sigue siendo el único con ese nombre.
      expect(
        screen.getAllByRole('button', { name: 'Actualizar' }),
      ).toHaveLength(1);
    });

    it('R11: «Registro directo» es el único botón sólido del encabezado, junto a «Actualizar» secundario', async () => {
      setup();
      await card();
      const header = document.querySelector(
        'header.page-header',
      ) as HTMLElement;
      const direct = within(header).getByRole('link', {
        name: 'Registro directo',
      });
      expect(direct).toHaveAttribute('href', '/recepcion/registro');
      expect(direct).toHaveClass('button');
      expect(direct).not.toHaveClass('button--secondary');
      expect(direct).not.toHaveClass('button--soft');
      const refresh = within(header).getByRole('button', {
        name: 'Actualizar',
      });
      expect(refresh).toHaveClass('button', 'button--secondary');
      expect(follows(refresh, direct)).toBe(true);
      const solid = [...header.querySelectorAll('.button')].filter(
        (element) => !element.matches('.button--secondary, .button--soft'),
      );
      expect(solid).toEqual([direct]);
      expect(
        screen.getAllByRole('link', { name: 'Registro directo' }),
      ).toHaveLength(1);
    });
  });

  describe('tarjetas de preregistro', () => {
    it('R10: cada preregistro es un article con un único h3, identidad con icono y texto, sus datos en cuatro filas de dos columnas y acciones pequeñas de distinta variante', async () => {
      setup();
      const item = await card();
      expect(within(item).getAllByRole('heading')).toHaveLength(1);
      expect(
        within(item).getByRole('heading', {
          level: 3,
          name: 'Laura Gómez Pérez',
        }),
      ).toBeInTheDocument();

      const unverified = within(item).getByText('Identidad sin verificar');
      expect(unverified).toHaveClass('badge', 'tone--warn');
      expect(unverified.querySelector('svg')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      const verified = within(
        screen.getByRole('article', { name: 'Ricardo Medina Soto' }),
      ).getByText('Identidad verificada');
      expect(verified).toHaveClass('badge', 'tone--ok');
      expect(verified.querySelector('svg')).toHaveAttribute(
        'aria-hidden',
        'true',
      );

      // Cuatro filas: Documento y Fecha de nacimiento; Sexo y Sede; Motivo; Preregistro y Expira.
      const facts = [...item.querySelectorAll('dl.prereg__facts > div')].map(
        (row) => ({
          dt: row.querySelector('dt')!.textContent,
          dd: row.querySelector('dd')!.textContent,
          wide: row.classList.contains('fact--wide'),
          contiguous:
            row.querySelector('dt')!.nextElementSibling ===
            row.querySelector('dd'),
        }),
      );
      expect(facts).toEqual([
        {
          dt: 'Documento',
          dd: 'Cédula de ciudadanía 1032456789',
          wide: false,
          contiguous: true,
        },
        {
          dt: 'Fecha de nacimiento',
          dd: '17/05/1990',
          wide: false,
          contiguous: true,
        },
        { dt: 'Sexo', dd: 'Femenino', wide: false, contiguous: true },
        { dt: 'Sede', dd: 'Sede Norte', wide: false, contiguous: true },
        {
          dt: 'Motivo de consulta',
          dd: 'Dolor de cabeza desde ayer',
          wide: true,
          contiguous: true,
        },
        {
          dt: 'Preregistro',
          dd: formatDateTimeBogota(FIRST.preRegisteredAt),
          wide: false,
          contiguous: true,
        },
        {
          dt: 'Expira',
          dd: formatDateTimeBogota(FIRST.expiresAt),
          wide: false,
          contiguous: true,
        },
      ]);
      expect(item).toHaveTextContent(
        `Preregistro${norm(formatDateTimeBogota(FIRST.preRegisteredAt))}`,
      );
      expect(item).toHaveTextContent(
        `Expira${norm(formatDateTimeBogota(FIRST.expiresAt))}`,
      );

      // La casilla y los botones, al pie de la tarjeta; el principal y el secundario, del mismo tamaño pequeño.
      const check = within(item).getByRole('checkbox', {
        name: 'Verifiqué la identidad del paciente presente con su documento.',
      });
      const confirm = within(item).getByRole('button', {
        name: 'Confirmar llegada',
      });
      const reject = within(item).getByRole('button', { name: 'Rechazar' });
      const foot = item.querySelector('.prereg__foot');
      expect(foot).toContainElement(check);
      expect(foot).toContainElement(confirm);
      expect(foot).toContainElement(reject);
      expect(confirm).toHaveClass('button', 'button--sm');
      expect(confirm).not.toHaveClass('button--secondary');
      expect(reject).toHaveClass('button', 'button--secondary', 'button--sm');
      expect(follows(check, confirm)).toBe(true);
      expect(follows(confirm, reject)).toBe(true);
    });

    it('R10: un paciente sin documento omite «Documento» y uno sin fecha de nacimiento muestra «Edad estimada»', async () => {
      setup({ [TRAY]: json(200, [NN]) });
      const item = await card('Paciente NN');
      const labels = [...item.querySelectorAll('dt')].map(
        (dt) => dt.textContent,
      );
      expect(labels).toEqual([
        'Edad estimada',
        'Sexo',
        'Sede',
        'Motivo de consulta',
        'Preregistro',
        'Expira',
      ]);
      expect(item).not.toHaveTextContent('Documento');
      expect(item).toHaveTextContent('Edad estimada45 años');
      expect(item).toHaveTextContent('Caída en la calle');
    });

    it('R41: las horas del preregistro salen en America/Bogota, con fecha y hora sin segundos', async () => {
      // 04:30 UTC del 28/10 es 11:30 p. m. del 27/10 en Bogotá.
      const late = '2026-10-28T04:30:00.000Z';
      setup({
        [TRAY]: json(200, [
          {
            ...FIRST,
            preRegisteredAt: late,
            expiresAt: '2026-10-28T10:30:00.000Z',
          },
        ]),
      });
      const item = await card();
      expect(item).toHaveTextContent(/Preregistro27\/10\/26, 11:30\sp\.\sm\./);
      expect(item).toHaveTextContent(/Expira28\/10\/26, 5:30\sa\.\sm\./);
      expect(item).not.toHaveTextContent(/\d:\d{2}:\d{2}/);
    });

    it('R40: los textos de la pantalla usan «preregistro» sin guion, etiquetas con mayúscula inicial y ningún «·»', async () => {
      const { user } = setup({
        [rejectOf(FIRST.id)]: json(200, {
          id: FIRST.id,
          status: 'REJECTED',
          resolvedAt: '2026-10-27T15:00:00.000Z',
        }),
      });
      const item = await card();
      expect(document.body).toHaveTextContent('Preregistros pendientes');
      expect(document.body.textContent).not.toMatch(/pre-registro/i);
      expect(document.body.textContent).not.toContain('·');

      await user.click(within(item).getByRole('button', { name: 'Rechazar' }));
      expect(
        within(item).getByRole('form', { name: 'Rechazar preregistro' }),
      ).toBeInTheDocument();
      await user.type(
        within(item).getByLabelText('Motivo del rechazo'),
        'Duplicado',
      );
      await user.click(
        within(item).getByRole('button', { name: 'Confirmar rechazo' }),
      );
      expect(await screen.findByText('Preregistro rechazado.')).toBeVisible();
      expect(document.body.textContent).not.toMatch(/pre-registro/i);
    });
  });

  describe('confirmar y rechazar', () => {
    it('R12: confirmar envía { identityVerified: true }, muestra arriba del cuerpo la fecha y la hora sin punto añadido y vuelve a pedir la bandeja y el indicador de espera', async () => {
      const { net, user } = setup({
        [confirmOf(FIRST.id)]: json(201, encounter),
      });
      const item = await card();
      await user.click(within(item).getByRole('checkbox'));
      net.set(TRAY, json(200, [SECOND]));
      await user.click(
        within(item).getByRole('button', { name: 'Confirmar llegada' }),
      );

      const notice = (await screen.findByText(/Llegada confirmada\./)).closest(
        '[role="status"]',
      ) as HTMLElement;
      expect(net.calls(confirmOf(FIRST.id))[0].body).toEqual({
        identityVerified: true,
      });
      // «p. m.» ya termina en punto: el aviso no añade otro tras la hora.
      expect(norm(notice.textContent)).toBe(
        `Llegada confirmada. Hora de llegada: ${norm(formatDateTimeBogota(encounter.arrivalAt))} Ver atención`,
      );
      expect(notice.textContent).not.toMatch(/m\.\./);
      expect(
        within(notice).getByRole('link', { name: 'Ver atención' }),
      ).toHaveAttribute('href', `/atenciones/${ENCOUNTER_ID}`);
      // Arriba del cuerpo del panel, antes de las tarjetas.
      expect(notice.parentElement).toHaveClass('panel__body');
      expect(notice.parentElement!.firstElementChild).toBe(notice);

      await waitFor(() => expect(net.calls(TRAY)).toHaveLength(2));
      await waitFor(() => expect(net.calls(LIST)).toHaveLength(2));
      expect(queryOf(net.calls(LIST)[1])).toEqual({
        status: 'WAITING_TRIAGE',
        limit: '100',
      });
    });

    it('R12: rechazar abre el formulario dentro de la tarjeta con «Confirmar rechazo» y «Volver» pequeños, envía el motivo y vuelve a pedir solo la bandeja', async () => {
      const { net, user } = setup({
        [rejectOf(FIRST.id)]: json(200, {
          id: FIRST.id,
          status: 'REJECTED',
          resolvedAt: '2026-10-27T15:00:00.000Z',
        }),
      });
      const item = await card();
      await user.click(within(item).getByRole('button', { name: 'Rechazar' }));
      const form = within(item).getByRole('form', {
        name: 'Rechazar preregistro',
      });
      expect(item).toContainElement(form);
      const submit = within(form).getByRole('button', {
        name: 'Confirmar rechazo',
      });
      const back = within(form).getByRole('button', { name: 'Volver' });
      expect(submit).toHaveClass('button', 'button--sm');
      expect(submit).not.toHaveClass('button--secondary');
      expect(back).toHaveClass('button', 'button--secondary', 'button--sm');

      net.set(TRAY, json(200, [SECOND]));
      await user.type(
        within(form).getByLabelText('Motivo del rechazo'),
        '  El paciente no se presentó ',
      );
      await user.click(submit);
      const notice = (
        await screen.findByText('Preregistro rechazado.')
      ).closest('[role="status"]') as HTMLElement;
      expect(net.calls(rejectOf(FIRST.id))[0].body).toEqual({
        reason: 'El paciente no se presentó',
      });
      expect(notice.parentElement).toHaveClass('panel__body');
      await waitFor(() => expect(net.calls(TRAY)).toHaveLength(2));
      // Rechazar no crea ninguna atención: el indicador de espera no se vuelve a pedir.
      expect(net.calls(LIST)).toHaveLength(1);
    });

    it.each([
      [
        409,
        'Este preregistro ya no está pendiente o el paciente ya tiene una atención activa.',
      ],
      [404, 'Este preregistro ya no existe.'],
    ])(
      'R12: con %i el error de acción queda en contexto, dentro de su tarjeta, y solo se vuelve a pedir la bandeja',
      async (status, message) => {
        const { net, user } = setup({
          [confirmOf(FIRST.id)]: problem(status),
        });
        const item = await card();
        await user.click(within(item).getByRole('checkbox'));
        await user.click(
          within(item).getByRole('button', { name: 'Confirmar llegada' }),
        );
        expect(await within(item).findByRole('alert')).toHaveTextContent(
          message,
        );
        await waitFor(() => expect(net.calls(TRAY)).toHaveLength(2));
        expect(net.calls(LIST)).toHaveLength(1);
      },
    );
  });

  describe('estados de cada panel y celda', () => {
    it('R19: la carga de la bandeja no afecta a la celda de espera, ni al revés; solo el panel es un role="status"', async () => {
      const tray = deferred(json(200, [FIRST, SECOND]));
      setup({ [TRAY]: tray.handler });
      const [pending, waiting] = cells();
      await waitFor(() =>
        expect(waiting).toHaveTextContent('En espera de triage12'),
      );
      expect(pending).toHaveAttribute('aria-busy', 'true');
      expect(pending).toHaveTextContent('Cargando indicador…');
      expect(pending).not.toHaveAttribute('role');
      expect(waiting).not.toHaveAttribute('aria-busy');
      const status = screen.getByRole('status');
      expect(screen.getAllByRole('status')).toHaveLength(1);
      expect(status).toHaveTextContent('Cargando la bandeja…');
      expect(panel()).toContainElement(status);
      act(() => tray.release());
      await card();
      expect(pending).toHaveTextContent('Preregistros pendientes2');
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('R19: la carga del indicador de espera no afecta a la celda de preregistros ni al panel', async () => {
      const count = deferred(encountersFor(() => 12));
      setup({ [LIST]: count.handler });
      await card();
      const [pending, waiting] = cells();
      expect(waiting).toHaveAttribute('aria-busy', 'true');
      expect(waiting).toHaveTextContent('Cargando indicador…');
      expect(pending).not.toHaveAttribute('aria-busy');
      expect(pending).toHaveTextContent('Preregistros pendientes2');
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      act(() => count.release());
      await waitFor(() =>
        expect(waiting).toHaveTextContent('En espera de triage12'),
      );
    });

    it('R20: sin preregistros muestra el vacío con icono, mensaje, pista y el enlace «Registrar una llegada directa», y la cifra 0', async () => {
      setup({ [TRAY]: json(200, []), [LIST]: encountersFor(() => 0) });
      const message = await screen.findByText(
        'No hay preregistros pendientes.',
      );
      const empty = message.closest('.panel-state') as HTMLElement;
      expect(empty).not.toHaveAttribute('role');
      expect(empty.querySelector('.panel-state__icon svg')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      expect(
        within(empty).getByText(
          'Cuando un paciente envíe uno desde la aplicación, aparecerá aquí.',
        ),
      ).toBeInTheDocument();
      expect(
        within(empty).getByRole('link', {
          name: 'Registrar una llegada directa',
        }),
      ).toHaveAttribute('href', '/recepcion/registro');
      const [pending, waiting] = cells();
      expect(pending).toHaveTextContent('Preregistros pendientes0');
      await waitFor(() =>
        expect(waiting).toHaveTextContent('En espera de triage0'),
      );
      expect(waiting).not.toHaveAttribute('aria-busy');
    });

    it('R21: si falla la bandeja, el panel y su celda muestran el error con su propio «Reintentar» y la celda de espera no cambia', async () => {
      const { net, user } = setup({ [TRAY]: problem(500) });
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('No se pudo cargar la bandeja.');
      expect(screen.queryByRole('article')).not.toBeInTheDocument();
      const [pending, waiting] = cells();
      expect(pending).toHaveTextContent('Preregistros pendientes');
      expect(pending).toHaveTextContent('No se pudo cargar');
      await waitFor(() =>
        expect(waiting).toHaveTextContent('En espera de triage12'),
      );

      net.set(TRAY, json(200, [FIRST]));
      // El nombre exacto «Reintentar» es el del panel; el de la celda lleva el del indicador.
      await user.click(
        within(alert).getByRole('button', { name: 'Reintentar' }),
      );
      await card();
      expect(net.calls(TRAY)).toHaveLength(2);
      expect(net.calls(LIST)).toHaveLength(1);
      expect(cells()[0]).toHaveTextContent('Preregistros pendientes1');

      net.set(TRAY, problem(500));
      await user.click(screen.getByRole('button', { name: 'Actualizar' }));
      await screen.findByRole('alert');
      net.set(TRAY, json(200, [FIRST]));
      await user.click(
        screen.getByRole('button', {
          name: 'Reintentar: Preregistros pendientes',
        }),
      );
      await card();
      expect(net.calls(LIST)).toHaveLength(2); // solo «Actualizar» repitió también el conteo
    });

    it('R21: si falla el indicador de espera, solo su celda muestra el error y su «Reintentar» repite solo esa petición', async () => {
      const { net, user } = setup({ [LIST]: problem(500) });
      await card();
      const waiting = cells()[1];
      await waitFor(() =>
        expect(waiting).toHaveTextContent('No se pudo cargar'),
      );
      expect(waiting).toHaveTextContent('En espera de triage');
      expect(cells()[0]).toHaveTextContent('Preregistros pendientes2');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      net.set(
        LIST,
        encountersFor(() => 7),
      );
      await user.click(
        within(waiting).getByRole('button', {
          name: 'Reintentar: En espera de triage',
        }),
      );
      await waitFor(() =>
        expect(cells()[1]).toHaveTextContent('En espera de triage7'),
      );
      expect(net.calls(LIST)).toHaveLength(2);
      expect(net.calls(TRAY)).toHaveLength(1);
    });

    it('R22: un 403 de la bandeja deja el panel y su celda «Sin permiso», sin datos ni «Reintentar»', async () => {
      setup({ [TRAY]: problem(403) });
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(
        'No tienes permiso para ver esta página.',
      );
      expect(within(alert).queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('article')).not.toBeInTheDocument();
      const [pending, waiting] = cells();
      expect(pending).toHaveTextContent('Sin permiso');
      expect(within(pending).queryByRole('button')).not.toBeInTheDocument();
      await waitFor(() =>
        expect(waiting).toHaveTextContent('En espera de triage12'),
      );
    });

    it('R22: un 403 del indicador de espera deja solo su celda «Sin permiso»', async () => {
      setup({ [LIST]: problem(403) });
      await card();
      const waiting = cells()[1];
      await waitFor(() => expect(waiting).toHaveTextContent('Sin permiso'));
      expect(within(waiting).queryByRole('button')).not.toBeInTheDocument();
      expect(cells()[0]).toHaveTextContent('Preregistros pendientes2');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('R21: si fallan las sedes, el error vive en la celda del filtro con el selector deshabilitado y los indicadores y el panel siguen sin filtro', async () => {
      const { net, user } = setup({ [TENANTS]: problem(500) });
      await card();
      const alert = await within(bar()).findByRole('alert');
      expect(alert).toHaveTextContent('No se pudieron cargar las sedes.');
      const select = within(bar()).getByLabelText('Sede');
      expect(select).toBeDisabled();
      expect(alert.closest('.summary__filter')).toContainElement(select);
      await waitFor(() =>
        expect(cells()[1]).toHaveTextContent('En espera de triage12'),
      );
      expect(net.calls(TRAY)[0].query.has('siteId')).toBe(false);

      net.set(TENANTS, json(200, publicTenants));
      await user.click(
        within(alert).getByRole('button', { name: 'Reintentar' }),
      );
      await waitFor(() => expect(select).toBeEnabled());
      expect(net.calls(TENANTS)).toHaveLength(2);
    });
  });

  describe('refresco automático', () => {
    it('R24: cada 30 s con la pestaña visible se repiten la bandeja y el indicador de espera, y «Actualizar» repite ambos', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup();
      await card();
      expect(net.calls(TRAY)).toHaveLength(1);
      expect(net.calls(LIST)).toHaveLength(1);

      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() => expect(net.calls(TRAY)).toHaveLength(2));
      await waitFor(() => expect(net.calls(LIST)).toHaveLength(2));
      expect(queryOf(net.calls(TRAY)[1])).toEqual({});
      expect(queryOf(net.calls(LIST)[1])).toEqual({
        status: 'WAITING_TRIAGE',
        limit: '100',
      });

      await act(async () => {
        screen.getByRole('button', { name: 'Actualizar' }).click();
        await vi.advanceTimersByTimeAsync(0);
      });
      await waitFor(() => expect(net.calls(TRAY)).toHaveLength(3));
      await waitFor(() => expect(net.calls(LIST)).toHaveLength(3));
      // Las sedes se piden una vez por sesión: ningún ciclo ni «Actualizar» las repite.
      expect(net.calls(TENANTS)).toHaveLength(1);
    });

    it('R25: ni el foco de la ventana ni la reconexión repiten las peticiones', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup();
      await card();
      await act(async () => {
        focusManager.setFocused(false);
        onlineManager.setOnline(false);
        focusManager.setFocused(true);
        onlineManager.setOnline(true);
        await vi.advanceTimersByTimeAsync(20);
      });
      expect(net.calls(TRAY)).toHaveLength(1);
      expect(net.calls(LIST)).toHaveLength(1);
    });

    it('R25: con la pestaña oculta no se repite ninguna petición', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup();
      await card();
      const visibility = vi
        .spyOn(document, 'visibilityState', 'get')
        .mockReturnValue('hidden');
      await act(() => vi.advanceTimersByTimeAsync(90_000));
      expect(net.calls(TRAY)).toHaveLength(1);
      expect(net.calls(LIST)).toHaveLength(1);
      visibility.mockRestore();
    });

    it('R22: un 403 detiene el intervalo de esa petición y el de la otra sigue', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup({ [TRAY]: problem(403) });
      await screen.findByRole('alert');
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() => expect(net.calls(LIST)).toHaveLength(2));
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() => expect(net.calls(LIST)).toHaveLength(3));
      expect(net.calls(TRAY)).toHaveLength(1);
    });

    it('R22: un 403 del indicador de espera detiene su intervalo y el de la bandeja sigue', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup({ [LIST]: problem(403) });
      await card();
      await waitFor(() => expect(cells()[1]).toHaveTextContent('Sin permiso'));
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() => expect(net.calls(TRAY)).toHaveLength(2));
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() => expect(net.calls(TRAY)).toHaveLength(3));
      expect(net.calls(LIST)).toHaveLength(1);
    });

    it('R21: un refresco fallido sustituye los datos por el error y el siguiente ciclo vuelve a pedir', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { net } = setup();
      await card();
      net.set(TRAY, networkError());
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('No se pudo cargar la bandeja.');
      expect(screen.queryByRole('article')).not.toBeInTheDocument();
      expect(cells()[0]).toHaveTextContent('No se pudo cargar');
      expect(net.calls(TRAY)).toHaveLength(2);

      // El error no detiene el intervalo: el siguiente ciclo repite la petición solo.
      net.set(TRAY, json(200, [FIRST]));
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() => expect(net.calls(TRAY)).toHaveLength(3));
      expect(await card()).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('R23: durante un refresco se conservan el contenido y las cifras, sin estado de carga y con «Actualizar» sin deshabilitar', async () => {
      const tray = deferred(json(200, [FIRST, SECOND]));
      const count = deferred(encountersFor(() => 13));
      const { user } = setup({
        [TRAY]: sequence(json(200, [FIRST, SECOND]), tray.handler),
        [LIST]: sequence(
          encountersFor(() => 12),
          count.handler,
        ),
      });
      await card();
      await waitFor(() =>
        expect(cells()[1]).toHaveTextContent('En espera de triage12'),
      );
      const button = screen.getByRole('button', { name: 'Actualizar' });
      expect(button).not.toHaveAttribute('aria-busy');

      await user.click(button);
      await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'));
      expect(button).toBeEnabled();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getAllByRole('article')).toHaveLength(2);
      expect(cells()[0]).toHaveTextContent('Preregistros pendientes2');
      expect(cells()[1]).toHaveTextContent('En espera de triage12');
      expect(cells()[1]).not.toHaveAttribute('aria-busy');

      act(() => {
        tray.release();
        count.release();
      });
      await waitFor(() =>
        expect(cells()[1]).toHaveTextContent('En espera de triage13'),
      );
      await waitFor(() => expect(button).not.toHaveAttribute('aria-busy'));
    });

    it('R37: un refresco con datos conserva los mismos nodos, el nodo enfocado, la casilla, el motivo escrito y «Actualizar», sin estado de carga ni desplazamiento programático', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const scrolling = watchScrolling();
      const { net, user } = setup();
      const item = await card();
      const other = screen.getByRole('article', {
        name: 'Ricardo Medina Soto',
      });
      const check = within(item).getByRole('checkbox');
      await user.click(check);
      await user.click(within(item).getByRole('button', { name: 'Rechazar' }));
      const reason = within(item).getByLabelText('Motivo del rechazo');
      await user.click(reason);
      await user.paste('Duplicado');
      expect(reason).toHaveFocus();
      const refresh = screen.getByRole('button', { name: 'Actualizar' });
      const body = panel().querySelector('.panel__body');

      // Llega un preregistro nuevo arriba: las tarjetas existentes siguen siendo las mismas.
      net.set(TRAY, json(200, [ARRIVAL, FIRST, SECOND]));
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await screen.findByRole('article', { name: 'Marta Lucía Rojas' });

      expect(screen.getByRole('article', { name: 'Laura Gómez Pérez' })).toBe(
        item,
      );
      expect(screen.getByRole('article', { name: 'Ricardo Medina Soto' })).toBe(
        other,
      );
      expect(screen.getAllByRole('article')).toHaveLength(3);
      expect(
        within(screen.getAllByRole('article')[0]).getByRole('heading'),
      ).toHaveTextContent('Marta Lucía Rojas');
      expect(within(item).getByRole('checkbox')).toBe(check);
      expect(check).toBeChecked();
      expect(within(item).getByLabelText('Motivo del rechazo')).toBe(reason);
      expect(reason).toHaveValue('Duplicado');
      expect(reason).toHaveFocus();
      expect(screen.getByRole('button', { name: 'Actualizar' })).toBe(refresh);
      expect(refresh).toBeEnabled();
      expect(panel().querySelector('.panel__body')).toBe(body);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(cells()[0]).toHaveTextContent('Preregistros pendientes3');
      expect(scrolling.calls()).toBe(0);
      scrolling.restore();
    });

    it('R37: «Actualizar» no quita el foco de la casilla de la tarjeta ni se deshabilita al repetir las peticiones', async () => {
      const scrolling = watchScrolling();
      const { net, user } = setup();
      const item = await card();
      const check = within(item).getByRole('checkbox');
      await user.click(check);
      const refresh = screen.getByRole('button', { name: 'Actualizar' });
      await user.click(refresh);
      await waitFor(() => expect(net.calls(TRAY)).toHaveLength(2));
      await waitFor(() => expect(net.calls(LIST)).toHaveLength(2));
      expect(refresh).toBeEnabled();
      expect(refresh).toHaveFocus();
      expect(within(await card()).getByRole('checkbox')).toBe(check);
      expect(check).toBeChecked();
      expect(scrolling.calls()).toBe(0);
      scrolling.restore();
    });
  });

  describe('privacidad y permisos', () => {
    it('R26: la pantalla no muestra sugerencias de IA ni niveles de triage', async () => {
      setup();
      await card();
      expect(document.body.textContent).not.toMatch(
        /sugerencia|nivel|inteligencia artificial|\bIA\b/i,
      );
    });

    it('R28: pide solo las sedes, la bandeja y el conteo de espera, y ninguna petición a detalle ni a captura clínica', async () => {
      const { net, user } = setup({
        [confirmOf(FIRST.id)]: json(201, encounter),
      });
      const item = await card();
      await user.click(within(item).getByRole('checkbox'));
      await user.click(
        within(item).getByRole('button', { name: 'Confirmar llegada' }),
      );
      await screen.findByText(/Llegada confirmada\./);
      await waitFor(() => expect(net.calls(LIST)).toHaveLength(2));
      const endpoints = [
        ...new Set(net.requests.map((r) => `${r.method} ${r.path}`)),
      ].sort();
      expect(endpoints).toEqual(
        [TENANTS, TRAY, LIST, confirmOf(FIRST.id)].sort(),
      );
      expect(
        net.requests.some((r) => /\/encounters\/|clinical/.test(r.path)),
      ).toBe(false);
    });
  });
});
