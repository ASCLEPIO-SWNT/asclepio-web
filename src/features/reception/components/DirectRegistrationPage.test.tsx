import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ENCOUNTER_ID,
  SITE_NORTE,
  SITE_SUR,
  TENANT_ID,
  deferred,
  encounter,
  fakeApi,
  json,
  networkError,
  nnPatient,
  patient,
  problem,
  publicTenants,
  type Handler,
} from '../../../test/fakeApi';
import { setCurrentLocale } from '../../../shared/i18n/locale';
import { renderFeature } from '../../../test/renderFeature';
import { receptionRoutes } from '../routes';

const TENANTS = 'GET /api/v1/public/tenants';
const SEARCH = 'GET /api/v1/patients';
const CREATE_PATIENT = 'POST /api/v1/patients';
const CREATE_ENCOUNTER = 'POST /api/v1/encounters';

type User = ReturnType<typeof userEvent.setup>;

function setup(
  routes: Record<string, Handler> = {},
  entries = ['/recepcion/registro'],
) {
  const net = fakeApi({
    [TENANTS]: json(200, publicTenants),
    'GET /api/v1/pre-registrations': json(200, []),
    [SEARCH]: json(200, [patient]),
    ...routes,
  });
  const user = userEvent.setup();
  const view = renderFeature(receptionRoutes, { entries });
  return { net, user, ...view };
}

const searchForm = () => screen.getByRole('form', { name: 'Buscar paciente' });
const arrivalForm = () =>
  screen.getByRole('form', { name: 'Registrar llegada' });

async function search(
  user: User,
  type = 'Cédula de ciudadanía',
  number = '1032456789',
) {
  const form = searchForm();
  await user.selectOptions(
    within(form).getByLabelText('Tipo de documento'),
    type,
  );
  await user.type(within(form).getByLabelText('Número de documento'), number);
  await user.click(within(form).getByRole('button', { name: 'Buscar' }));
}

async function openCreate(user: User) {
  await search(user, 'Cédula de ciudadanía', '  555123  ');
  await user.click(
    await screen.findByRole('button', { name: 'Crear paciente' }),
  );
  return screen.getByRole('form', { name: 'Crear paciente' });
}

async function openNn(user: User) {
  await user.click(
    screen.getByRole('button', { name: 'Registrar paciente NN' }),
  );
  return screen.getByRole('form', { name: 'Registrar paciente NN' });
}

function expectAccessibleError(field: HTMLElement, message: string) {
  const error = screen.getByText(message);
  expect(field).toHaveAttribute('aria-invalid', 'true');
  expect(field).toHaveAttribute('aria-describedby', error.id);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Registro directo — búsqueda', () => {
  it('R17: /recepcion enlaza a /recepcion/registro, que tiene búsqueda por documento y "Registrar paciente NN"', async () => {
    const { user, router } = setup({}, ['/recepcion']);
    await user.click(
      await screen.findByRole('link', { name: 'Registro directo' }),
    );
    expect(router.state.location.pathname).toBe('/recepcion/registro');
    const form = searchForm();
    const select = within(form).getByLabelText('Tipo de documento');
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent)
        .slice(1),
    ).toEqual([
      'Cédula de ciudadanía',
      'Tarjeta de identidad',
      'Cédula de extranjería',
      'Pasaporte',
      'Registro civil',
    ]);
    expect(within(form).getByLabelText('Número de documento')).toBeVisible();
    expect(within(form).getByRole('button', { name: 'Buscar' })).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Registrar paciente NN' }),
    ).toBeVisible();
  });

  it('R18: "Buscar" sin tipo ni número no llama a la API y marca cada campo', async () => {
    const { net, user } = setup();
    const form = searchForm();
    await user.click(within(form).getByRole('button', { name: 'Buscar' }));
    await screen.findByText('Elige el tipo de documento.');
    expectAccessibleError(
      within(form).getByLabelText('Tipo de documento'),
      'Elige el tipo de documento.',
    );
    expectAccessibleError(
      within(form).getByLabelText('Número de documento'),
      'Escribe el número de documento.',
    );
    expect(net.calls(SEARCH)).toHaveLength(0);
  });

  it.each([
    ['   ', 'Escribe el número de documento.'],
    [
      '9'.repeat(65),
      'El número de documento admite como máximo 64 caracteres.',
    ],
  ])(
    'R18: "Buscar" con el número %j no llama a la API',
    async (number, message) => {
      const { net, user } = setup();
      await search(user, 'Pasaporte', number);
      await screen.findByText(message);
      expectAccessibleError(
        within(searchForm()).getByLabelText('Número de documento'),
        message,
      );
      expect(net.calls(SEARCH)).toHaveLength(0);
    },
  );

  it('R19: pide GET /patients con documentType y documentNumber recortado; con un paciente lo muestra y lo selecciona', async () => {
    const { net, user } = setup();
    await search(user, 'Cédula de ciudadanía', '  1032456789 ');
    const selected = await screen.findByRole('region', {
      name: 'Paciente seleccionado',
    });
    const query = net.calls(SEARCH)[0].query;
    expect(Object.fromEntries(query)).toEqual({
      documentType: 'CC',
      documentNumber: '1032456789',
    });
    expect(selected).toHaveTextContent('Laura Gómez Pérez');
    expect(selected).toHaveTextContent('Cédula de ciudadanía 1032456789');
    expect(arrivalForm()).toBeVisible();
  });

  it('R19: con una lista vacía muestra "sin resultados" y "Crear paciente" abre el alta con el documento relleno y no editable', async () => {
    const { user } = setup({ [SEARCH]: json(200, []) });
    const form = await openCreate(user);
    expect(
      screen.getByText('No hay ningún paciente con ese documento.'),
    ).toBeVisible();
    const type = within(form).getByLabelText('Tipo de documento');
    const number = within(form).getByLabelText('Número de documento');
    expect(type).toHaveValue('Cédula de ciudadanía');
    expect(number).toHaveValue('555123');
    expect(type).toHaveAttribute('readonly');
    expect(number).toHaveAttribute('readonly');
  });

  it.each([
    [problem(500), 'No se pudo completar la acción. Inténtalo de nuevo.'],
    [problem(403), 'No tienes permiso para realizar esta acción.'],
    [
      networkError(),
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    ],
  ])(
    'R19: si la búsqueda falla muestra un error de acción (%#)',
    async (handler, message) => {
      const { user } = setup({ [SEARCH]: handler });
      await search(user);
      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(
        screen.queryByRole('region', { name: 'Paciente seleccionado' }),
      ).not.toBeInTheDocument();
    },
  );

  it('R37: mientras la búsqueda está en curso deshabilita "Buscar", muestra role="status" e ignora nuevos envíos', async () => {
    const gate = deferred(json(200, [patient]));
    const { net, user } = setup({ [SEARCH]: gate.handler });
    await search(user);
    const button = within(searchForm()).getByRole('button', { name: 'Buscar' });
    expect(button).toBeDisabled();
    expect(within(searchForm()).getByRole('status')).toHaveTextContent(
      'Buscando el paciente…',
    );
    await user.click(button);
    expect(net.calls(SEARCH)).toHaveLength(1);
    act(() => gate.release());
    await screen.findByRole('region', { name: 'Paciente seleccionado' });
  });
});

describe('Registro directo — alta de paciente', () => {
  it('R20: el modo con documento pide "Nombre completo", "Fecha de nacimiento" y "Sexo" con las tres etiquetas', async () => {
    const { user } = setup({ [SEARCH]: json(200, []) });
    const form = await openCreate(user);
    expect(within(form).getByLabelText('Nombre completo')).toBeVisible();
    expect(within(form).getByLabelText('Fecha de nacimiento')).toHaveAttribute(
      'type',
      'date',
    );
    expect(
      within(within(form).getByLabelText('Sexo'))
        .getAllByRole('option')
        .map((o) => o.textContent)
        .slice(1),
    ).toEqual(['Masculino', 'Femenino', 'Indeterminado / otro']);
    expect(within(form).queryByLabelText('Edad estimada (años)')).toBeNull();
  });

  it('R20: el modo NN no tiene documento y elige entre "Fecha de nacimiento" y "Edad estimada (años)"', async () => {
    const { user } = setup();
    const form = await openNn(user);
    expect(within(form).queryByLabelText('Tipo de documento')).toBeNull();
    expect(within(form).queryByLabelText('Número de documento')).toBeNull();
    expect(within(form).getByLabelText('Nombre completo')).toBeVisible();
    const mode = within(form).getByLabelText('Dato de edad');
    expect(
      within(mode)
        .getAllByRole('option')
        .map((o) => o.textContent)
        .slice(1),
    ).toEqual(['Fecha de nacimiento', 'Edad estimada (años)']);
    await user.selectOptions(mode, 'Edad estimada (años)');
    expect(within(form).getByLabelText('Edad estimada (años)')).toBeVisible();
    expect(within(form).queryByLabelText('Fecha de nacimiento')).toBeNull();
    await user.selectOptions(mode, 'Fecha de nacimiento');
    expect(within(form).getByLabelText('Fecha de nacimiento')).toBeVisible();
    expect(
      within(within(form).getByLabelText('Sexo'))
        .getAllByRole('option')
        .map((o) => o.textContent)
        .slice(1),
    ).toEqual(['Masculino', 'Femenino', 'Indeterminado / otro']);
  });

  it('R21: con documento, sin nombre, fecha ni sexo no llama a la API, marca cada campo y enfoca el primero', async () => {
    const { net, user } = setup({ [SEARCH]: json(200, []) });
    const form = await openCreate(user);
    await user.click(
      within(form).getByRole('button', { name: 'Guardar paciente' }),
    );
    await screen.findByText('Escribe el nombre.');
    const name = within(form).getByLabelText('Nombre completo');
    expectAccessibleError(name, 'Escribe el nombre.');
    expectAccessibleError(
      within(form).getByLabelText('Fecha de nacimiento'),
      'Escribe la fecha de nacimiento.',
    );
    expectAccessibleError(
      within(form).getByLabelText('Sexo'),
      'Elige el sexo.',
    );
    expect(name).toHaveFocus();
    expect(net.calls(CREATE_PATIENT)).toHaveLength(0);
  });

  it('R21: un nombre de más de 200 caracteres no se envía', async () => {
    const { net, user } = setup({ [SEARCH]: json(200, []) });
    const form = await openCreate(user);
    await user.click(within(form).getByLabelText('Nombre completo'));
    await user.paste('n'.repeat(201));
    await user.click(
      within(form).getByRole('button', { name: 'Guardar paciente' }),
    );
    await screen.findByText('El nombre admite como máximo 200 caracteres.');
    expect(net.calls(CREATE_PATIENT)).toHaveLength(0);
  });

  it('R21: en NN sin elegir fecha ni edad y sin sexo marca la elección y el sexo y enfoca la elección', async () => {
    const { net, user } = setup();
    const form = await openNn(user);
    await user.click(
      within(form).getByRole('button', { name: 'Guardar paciente' }),
    );
    await screen.findByText(
      'Indica la fecha de nacimiento o la edad estimada.',
    );
    const mode = within(form).getByLabelText('Dato de edad');
    expectAccessibleError(
      mode,
      'Indica la fecha de nacimiento o la edad estimada.',
    );
    expectAccessibleError(
      within(form).getByLabelText('Sexo'),
      'Elige el sexo.',
    );
    expect(mode).toHaveFocus();
    expect(net.calls(CREATE_PATIENT)).toHaveLength(0);
  });

  it('R21: en NN con "Fecha de nacimiento" elegida y vacía pide la fecha', async () => {
    const { net, user } = setup();
    const form = await openNn(user);
    await user.selectOptions(
      within(form).getByLabelText('Dato de edad'),
      'Fecha de nacimiento',
    );
    await user.selectOptions(within(form).getByLabelText('Sexo'), 'Masculino');
    await user.click(
      within(form).getByRole('button', { name: 'Guardar paciente' }),
    );
    await screen.findByText('Escribe la fecha de nacimiento.');
    const date = within(form).getByLabelText('Fecha de nacimiento');
    expectAccessibleError(date, 'Escribe la fecha de nacimiento.');
    expect(date).toHaveFocus();
    expect(net.calls(CREATE_PATIENT)).toHaveLength(0);
  });

  it.each(['', '121', '-1', '4.5'])(
    'R21: en NN una edad estimada %j no se envía',
    async (age) => {
      const { net, user } = setup();
      const form = await openNn(user);
      await user.selectOptions(
        within(form).getByLabelText('Dato de edad'),
        'Edad estimada (años)',
      );
      const field = within(form).getByLabelText('Edad estimada (años)');
      if (age) await user.type(field, age);
      await user.selectOptions(
        within(form).getByLabelText('Sexo'),
        'Masculino',
      );
      await user.click(
        within(form).getByRole('button', { name: 'Guardar paciente' }),
      );
      await screen.findByText(
        'La edad estimada debe ser un número entero entre 0 y 120.',
      );
      expectAccessibleError(
        field,
        'La edad estimada debe ser un número entero entre 0 y 120.',
      );
      expect(net.calls(CREATE_PATIENT)).toHaveLength(0);
    },
  );

  it('R22: con documento envía solo { documentType, documentNumber, fullName, birthDate, sex } y con 201 selecciona el paciente', async () => {
    const created = {
      ...patient,
      documentNumber: '555123',
      fullName: 'Pedro Pérez',
    };
    const { net, user } = setup({
      [SEARCH]: json(200, []),
      [CREATE_PATIENT]: json(201, created),
    });
    const form = await openCreate(user);
    await user.type(
      within(form).getByLabelText('Nombre completo'),
      '  Pedro Pérez ',
    );
    await user.type(
      within(form).getByLabelText('Fecha de nacimiento'),
      '1985-03-09',
    );
    await user.selectOptions(within(form).getByLabelText('Sexo'), 'Masculino');
    await user.click(
      within(form).getByRole('button', { name: 'Guardar paciente' }),
    );

    const selected = await screen.findByRole('region', {
      name: 'Paciente seleccionado',
    });
    expect(net.calls(CREATE_PATIENT)[0].body).toEqual({
      documentType: 'CC',
      documentNumber: '555123',
      fullName: 'Pedro Pérez',
      birthDate: '1985-03-09',
      sex: 'M',
    });
    expect(selected).toHaveTextContent('Pedro Pérez');
    expect(screen.queryByRole('form', { name: 'Crear paciente' })).toBeNull();
  });

  it('R22: en NN con edad estimada y sin nombre envía solo { sex, estimatedAgeYears }', async () => {
    const { net, user } = setup({ [CREATE_PATIENT]: json(201, nnPatient) });
    const form = await openNn(user);
    await user.selectOptions(
      within(form).getByLabelText('Dato de edad'),
      'Edad estimada (años)',
    );
    await user.type(within(form).getByLabelText('Edad estimada (años)'), '45');
    await user.selectOptions(within(form).getByLabelText('Sexo'), 'Masculino');
    await user.click(
      within(form).getByRole('button', { name: 'Guardar paciente' }),
    );
    const selected = await screen.findByRole('region', {
      name: 'Paciente seleccionado',
    });
    expect(net.calls(CREATE_PATIENT)[0].body).toEqual({
      sex: 'M',
      estimatedAgeYears: 45,
    });
    expect(selected).toHaveTextContent('Paciente NN');
    expect(selected).toHaveTextContent('45 años');
  });

  it('R22: en NN con fecha de nacimiento y nombre envía solo { sex, birthDate, fullName }', async () => {
    const { net, user } = setup({
      [CREATE_PATIENT]: json(201, {
        ...nnPatient,
        fullName: 'Juan',
        birthDate: '1970-01-01',
        estimatedAgeYears: null,
      }),
    });
    const form = await openNn(user);
    await user.type(within(form).getByLabelText('Nombre completo'), ' Juan ');
    await user.selectOptions(
      within(form).getByLabelText('Dato de edad'),
      'Fecha de nacimiento',
    );
    await user.type(
      within(form).getByLabelText('Fecha de nacimiento'),
      '1970-01-01',
    );
    await user.selectOptions(
      within(form).getByLabelText('Sexo'),
      'Indeterminado / otro',
    );
    await user.click(
      within(form).getByRole('button', { name: 'Guardar paciente' }),
    );
    await screen.findByRole('region', { name: 'Paciente seleccionado' });
    expect(net.calls(CREATE_PATIENT)[0].body).toEqual({
      sex: 'X',
      birthDate: '1970-01-01',
      fullName: 'Juan',
    });
  });

  async function fillWithDocument(user: User, form: HTMLElement) {
    await user.type(
      within(form).getByLabelText('Nombre completo'),
      'Pedro Pérez',
    );
    await user.type(
      within(form).getByLabelText('Fecha de nacimiento'),
      '2030-01-01',
    );
    await user.selectOptions(within(form).getByLabelText('Sexo'), 'Masculino');
    await user.click(
      within(form).getByRole('button', { name: 'Guardar paciente' }),
    );
  }

  it('R23: con 409 muestra el error de acción de documento repetido y conserva lo escrito', async () => {
    const { user } = setup({
      [SEARCH]: json(200, []),
      [CREATE_PATIENT]: problem(409),
    });
    const form = await openCreate(user);
    await fillWithDocument(user, form);
    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'Ya existe un paciente con ese documento.',
    );
    expect(within(form).getByLabelText('Nombre completo')).toHaveValue(
      'Pedro Pérez',
    );
  });

  it('R23: con 422 muestra junto a "Fecha de nacimiento" el mensaje de fecha futura', async () => {
    const { user } = setup({
      [SEARCH]: json(200, []),
      [CREATE_PATIENT]: problem(422),
    });
    const form = await openCreate(user);
    await fillWithDocument(user, form);
    await screen.findByText(
      'La fecha de nacimiento no puede ser posterior a hoy.',
    );
    const date = within(form).getByLabelText('Fecha de nacimiento');
    expectAccessibleError(
      date,
      'La fecha de nacimiento no puede ser posterior a hoy.',
    );
    expect(date).toHaveValue('2030-01-01');
  });

  it('R23: con 400 y errors[] asocia un mensaje seguro junto a su campo', async () => {
    const { user } = setup({
      [SEARCH]: json(200, []),
      [CREATE_PATIENT]: problem(400, {
        errors: [
          { field: 'fullName', message: 'fullName must be shorter' },
          { field: 'tenantId', message: 'no aplica' },
        ],
      }),
    });
    const form = await openCreate(user);
    await fillWithDocument(user, form);
    await screen.findByText('Revisa este campo.');
    expectAccessibleError(
      within(form).getByLabelText('Nombre completo'),
      'Revisa este campo.',
    );
    expect(screen.queryByText('no aplica')).toBeNull();
  });

  it.each([
    [problem(500), 'No se pudo completar la acción. Inténtalo de nuevo.'],
    [
      networkError(),
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    ],
  ])(
    'R23: ante otro error muestra un error de acción y conserva lo escrito (%#)',
    async (handler, message) => {
      const { user } = setup({
        [SEARCH]: json(200, []),
        [CREATE_PATIENT]: handler,
      });
      const form = await openCreate(user);
      await fillWithDocument(user, form);
      expect(await within(form).findByRole('alert')).toHaveTextContent(message);
      expect(within(form).getByLabelText('Fecha de nacimiento')).toHaveValue(
        '2030-01-01',
      );
    },
  );

  it('R37: mientras el alta está en curso deshabilita "Guardar paciente", muestra role="status" e ignora nuevos envíos', async () => {
    const gate = deferred(json(201, patient));
    const { net, user } = setup({
      [SEARCH]: json(200, []),
      [CREATE_PATIENT]: gate.handler,
    });
    const form = await openCreate(user);
    await fillWithDocument(user, form);
    const button = within(form).getByRole('button', {
      name: 'Guardar paciente',
    });
    expect(button).toBeDisabled();
    expect(within(form).getByRole('status')).toHaveTextContent(
      'Guardando el paciente…',
    );
    await user.click(button);
    expect(net.calls(CREATE_PATIENT)).toHaveLength(1);
    act(() => gate.release());
    await screen.findByRole('region', { name: 'Paciente seleccionado' });
  });
});

describe('Registro directo — llegada', () => {
  it('R24: con un paciente seleccionado muestra su resumen y el formulario de llegada', async () => {
    const { user } = setup();
    await search(user);
    const selected = await screen.findByRole('region', {
      name: 'Paciente seleccionado',
    });
    expect(selected).toHaveTextContent('Laura Gómez Pérez');
    expect(selected).toHaveTextContent('Cédula de ciudadanía 1032456789');
    expect(selected).toHaveTextContent('17/05/1990');
    expect(selected).toHaveTextContent('Femenino');
    const form = arrivalForm();
    const site = within(form).getByLabelText('Sede');
    await waitFor(() => expect(site).toBeEnabled());
    expect(site).toHaveValue('');
    expect(
      within(site)
        .getAllByRole('option')
        .map((o) => o.textContent)
        .slice(1),
    ).toEqual(['Sede Norte', 'Sede Sur']);
    expect(within(form).getByLabelText('Motivo de consulta')).toBeVisible();
    expect(
      within(form).getByRole('button', { name: 'Registrar llegada' }),
    ).toBeVisible();
  });

  it('R24: si el tenant tiene una sola sede queda preseleccionada', async () => {
    const { user } = setup({
      [TENANTS]: json(200, [{ id: TENANT_ID, name: 'IPS', sites: [SITE_SUR] }]),
    });
    await search(user);
    await screen.findByRole('region', { name: 'Paciente seleccionado' });
    await waitFor(() =>
      expect(within(arrivalForm()).getByLabelText('Sede')).toHaveValue(
        SITE_SUR.id,
      ),
    );
  });

  it('R24: un paciente NN se resume como "Paciente NN" con su edad estimada', async () => {
    const { user } = setup({ [SEARCH]: json(200, [nnPatient]) });
    await search(user);
    const selected = await screen.findByRole('region', {
      name: 'Paciente seleccionado',
    });
    expect(selected).toHaveTextContent('Paciente NN');
    expect(selected).toHaveTextContent('Edad estimada45 años');
    expect(selected).toHaveTextContent('Masculino');
  });

  it.each([
    ['', 'Escribe el motivo de consulta.'],
    ['   ', 'Escribe el motivo de consulta.'],
    [
      'm'.repeat(2001),
      'El motivo de consulta admite como máximo 2000 caracteres.',
    ],
  ])(
    'R25: sin sede y con el motivo %j no llama a la API y marca cada campo',
    async (text, message) => {
      const { net, user } = setup();
      await search(user);
      await screen.findByRole('region', { name: 'Paciente seleccionado' });
      const form = arrivalForm();
      if (text) {
        await user.click(within(form).getByLabelText('Motivo de consulta'));
        await user.paste(text);
      }
      await user.click(
        within(form).getByRole('button', { name: 'Registrar llegada' }),
      );
      await screen.findByText(message);
      expectAccessibleError(
        within(form).getByLabelText('Sede'),
        'Elige la sede.',
      );
      expectAccessibleError(
        within(form).getByLabelText('Motivo de consulta'),
        message,
      );
      expect(net.calls(CREATE_ENCOUNTER)).toHaveLength(0);
    },
  );

  async function register(user: User) {
    await search(user);
    await screen.findByRole('region', { name: 'Paciente seleccionado' });
    const form = arrivalForm();
    await waitFor(() =>
      expect(within(form).getByLabelText('Sede')).toBeEnabled(),
    );
    await user.selectOptions(within(form).getByLabelText('Sede'), 'Sede Norte');
    await user.type(
      within(form).getByLabelText('Motivo de consulta'),
      '  Dolor torácico  ',
    );
    await user.click(
      within(form).getByRole('button', { name: 'Registrar llegada' }),
    );
    return form;
  }

  it('R26: envía el cuerpo exacto con complaintSource TYPED y con 201 navega a /atenciones/{id} con el aviso en el estado', async () => {
    const { net, user, router } = setup({
      [CREATE_ENCOUNTER]: json(201, { ...encounter, origin: 'DIRECT' }),
    });
    await register(user);
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        `/atenciones/${ENCOUNTER_ID}`,
      ),
    );
    expect(net.calls(CREATE_ENCOUNTER)[0].body).toEqual({
      patientId: patient.id,
      siteId: SITE_NORTE.id,
      chiefComplaintText: 'Dolor torácico',
      complaintSource: 'TYPED',
    });
    expect(router.state.location.state).toEqual({
      notice: 'arrival-registered',
    });
    expect(router.state.location.search).toBe('');
  });

  it('R27: con 409 muestra el error de acción con un enlace a /recepcion y conserva el paciente y lo escrito', async () => {
    const { user } = setup({ [CREATE_ENCOUNTER]: problem(409) });
    const form = await register(user);
    const alert = await within(form).findByRole('alert');
    expect(alert).toHaveTextContent(
      'El paciente ya tiene un pre-registro pendiente o una atención activa. Revisa la bandeja.',
    );
    expect(
      within(alert).getByRole('link', { name: 'Ir a la bandeja' }),
    ).toHaveAttribute('href', '/recepcion');
    expect(within(form).getByLabelText('Motivo de consulta')).toHaveValue(
      '  Dolor torácico  ',
    );
    expect(within(form).getByLabelText('Sede')).toHaveValue(SITE_NORTE.id);
    expect(
      screen.getByRole('region', { name: 'Paciente seleccionado' }),
    ).toHaveTextContent('Laura Gómez Pérez');
  });

  it.each([
    [problem(422), 'La sede o el paciente ya no son válidos.'],
    [problem(500), 'No se pudo completar la acción. Inténtalo de nuevo.'],
    [problem(403), 'No tienes permiso para realizar esta acción.'],
  ])(
    'R27: ante %# muestra el error de acción sin enlace y conserva lo escrito',
    async (handler, message) => {
      const { user } = setup({ [CREATE_ENCOUNTER]: handler });
      const form = await register(user);
      const alert = await within(form).findByRole('alert');
      expect(alert).toHaveTextContent(message);
      expect(within(alert).queryByRole('link')).toBeNull();
      expect(within(form).getByLabelText('Motivo de consulta')).toHaveValue(
        '  Dolor torácico  ',
      );
    },
  );

  it('R37: mientras se registra la llegada deshabilita "Registrar llegada", muestra role="status" e ignora nuevos envíos', async () => {
    const gate = deferred(json(201, encounter));
    const { net, user, router } = setup({ [CREATE_ENCOUNTER]: gate.handler });
    const form = await register(user);
    const button = within(form).getByRole('button', {
      name: 'Registrar llegada',
    });
    expect(button).toBeDisabled();
    expect(within(form).getByRole('status')).toHaveTextContent(
      'Registrando la llegada…',
    );
    await user.click(button);
    expect(net.calls(CREATE_ENCOUNTER)).toHaveLength(1);
    act(() => gate.release());
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        `/atenciones/${ENCOUNTER_ID}`,
      ),
    );
  });

  it('R5: si las sedes fallan, el selector de sede de la llegada queda deshabilitado', async () => {
    const { user } = setup({ [TENANTS]: problem(500) });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron cargar las sedes.',
    );
    await search(user);
    await screen.findByRole('region', { name: 'Paciente seleccionado' });
    expect(within(arrivalForm()).getByLabelText('Sede')).toBeDisabled();
  });
});

describe('UI-03-web 422 del alta NN con edad estimada', () => {
  async function fillNnWithAge(user: User) {
    const form = await openNn(user);
    await user.selectOptions(
      within(form).getByLabelText('Dato de edad'),
      'Edad estimada (años)',
    );
    await user.type(within(form).getByLabelText('Edad estimada (años)'), '45');
    await user.selectOptions(within(form).getByLabelText('Sexo'), 'Masculino');
    await user.click(
      within(form).getByRole('button', { name: 'Guardar paciente' }),
    );
    return form;
  }

  it('R24: un 422 sin errores de campo muestra el error genérico, no el de fecha de nacimiento futura', async () => {
    const { net, user } = setup({ [CREATE_PATIENT]: problem(422) });
    const form = await fillNnWithAge(user);
    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'No se pudo completar la acción. Inténtalo de nuevo.',
    );
    expect(
      screen.queryByText(
        'La fecha de nacimiento no puede ser posterior a hoy.',
      ),
    ).not.toBeInTheDocument();
    expect(within(form).getByLabelText('Edad estimada (años)')).toHaveValue(45);
    expect(net.calls(CREATE_PATIENT)).toHaveLength(1);
  });

  it('R24: un 422 con error en la edad estimada lo marca junto a su campo con el texto genérico', async () => {
    const { user } = setup({
      [CREATE_PATIENT]: problem(422, {
        errors: [{ field: 'estimatedAgeYears', message: 'out of range' }],
      }),
    });
    const form = await fillNnWithAge(user);
    await screen.findByText('Revisa este campo.');
    expectAccessibleError(
      within(form).getByLabelText('Edad estimada (años)'),
      'Revisa este campo.',
    );
    expect(
      screen.queryByText(
        'La fecha de nacimiento no puede ser posterior a hoy.',
      ),
    ).not.toBeInTheDocument();
  });
});

describe('UI-03-web textos traducidos', () => {
  it('R20: el error de la búsqueda sale del catálogo del idioma activo, no en español', async () => {
    setCurrentLocale('en');
    const { user } = setup({ [SEARCH]: networkError() });
    const form = screen.getByRole('form', { name: 'Search for a patient' });
    await user.selectOptions(
      within(form).getByLabelText('Document type'),
      'Citizenship identity card',
    );
    await user.type(
      within(form).getByLabelText('Document number'),
      '1032456789',
    );
    await user.click(within(form).getByRole('button', { name: 'Search' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not connect to the server. Check your connection and try again.',
    );
    expect(screen.queryByText(/No se pudo conectar/)).not.toBeInTheDocument();
  });
});
