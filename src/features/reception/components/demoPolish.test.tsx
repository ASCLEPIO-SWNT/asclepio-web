import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeApi, json, publicTenants } from '../../../test/fakeApi';
import { renderFeature } from '../../../test/renderFeature';
import { receptionRoutes } from '../routes';

afterEach(() => {
  vi.unstubAllGlobals();
});

function setup() {
  fakeApi({
    'GET /api/v1/public/tenants': json(200, publicTenants),
    'GET /api/v1/patients': json(200, []),
  });
  const user = userEvent.setup();
  const view = renderFeature(receptionRoutes, {
    entries: ['/recepcion/registro'],
  });
  return { user, ...view };
}

const follows = (a: Node, b: Node) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

async function openCreate(user: ReturnType<typeof userEvent.setup>) {
  const form = screen.getByRole('form', { name: 'Buscar paciente' });
  await user.selectOptions(
    within(form).getByLabelText('Tipo de documento'),
    'Cédula de ciudadanía',
  );
  await user.type(within(form).getByLabelText('Número de documento'), '555');
  await user.click(within(form).getByRole('button', { name: 'Buscar' }));
  await user.click(
    await screen.findByRole('button', { name: 'Crear paciente' }),
  );
  return screen.getByRole('form', { name: 'Crear paciente' });
}

describe('UI-04-web registro directo', () => {
  it('R8: encabezado con el h1 «Registro directo», su descripción y «Volver a Recepción» como botón secundario', async () => {
    const { container } = setup();
    const headings = await screen.findAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Registro directo');
    expect(headings[0].closest('.page-header')).not.toBeNull();
    expect(container.querySelector('.dashboard > .stack')).not.toBeNull();
    expect(
      screen.getByText(
        'Busca al paciente por documento, regístralo si no existe y registra su llegada.',
      ).tagName,
    ).toBe('P');
    const back = screen.getByRole('link', { name: 'Volver a Recepción' });
    expect(back).toHaveAttribute('href', '/recepcion');
    expect(back).toHaveClass('button', 'button--secondary');
    expect(back.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(
      screen.getByRole('region', { name: 'Registro directo' }),
    ).toBeVisible();
  });

  it('R8: «Registrar paciente NN» es secundario y va justo después de la búsqueda, antes del «sin resultados» y del alta', async () => {
    const { user } = setup();
    const nn = screen.getByRole('button', { name: 'Registrar paciente NN' });
    expect(nn).toHaveClass('button', 'button--secondary');
    const search = screen.getByRole('form', { name: 'Buscar paciente' });
    const create = await openCreate(user);
    const noResults = screen.getByText(
      'No hay ningún paciente con ese documento.',
    );
    expect(follows(search, nn)).toBe(true);
    expect(follows(nn, noResults)).toBe(true);
    expect(follows(noResults, create)).toBe(true);
    // Inmediatamente después del formulario de búsqueda.
    expect(search.nextElementSibling?.contains(nn)).toBe(true);
  });

  it('R9: los campos del alta van en un div.form-grid y el documento de solo lectura conserva su etiqueta y readonly', async () => {
    const { user } = setup();
    const create = await openCreate(user);
    const grid = create.querySelector(':scope > .form-grid');
    expect(grid).not.toBeNull();
    for (const label of [
      'Tipo de documento',
      'Número de documento',
      'Nombre completo',
      'Fecha de nacimiento',
      'Sexo',
    ]) {
      expect(grid!.contains(within(create).getByLabelText(label))).toBe(true);
    }
    for (const label of ['Tipo de documento', 'Número de documento']) {
      expect(within(create).getByLabelText(label)).toHaveAttribute('readonly');
    }
    expect(
      grid!.contains(
        within(create).getByRole('button', { name: 'Guardar paciente' }),
      ),
    ).toBe(false);
  });
});
