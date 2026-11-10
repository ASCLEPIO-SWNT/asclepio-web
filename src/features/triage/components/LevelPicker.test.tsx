import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { LevelPicker, type LevelPickerProps } from './LevelPicker';

function Harness(props: Partial<LevelPickerProps>) {
  const [value, setValue] = useState<number | null>(null);
  return (
    <LevelPicker id="test-level" value={value} onChange={setValue} {...props} />
  );
}

const group = () => screen.getByRole('group', { name: 'Nivel de triage' });

describe('F-05-web selector de nivel', () => {
  it('R5: cinco radios I–V dentro de un fieldset con legend, sin ninguno elegido', () => {
    render(<Harness />);
    const fieldset = group();
    expect(fieldset.tagName).toBe('FIELDSET');
    expect(within(fieldset).getByText('Nivel de triage').tagName).toBe(
      'LEGEND',
    );
    const radios = within(fieldset).getAllByRole('radio');
    expect(
      radios.map(
        (radio) =>
          radio.getAttribute('aria-label') ??
          radio.closest('label')?.textContent,
      ),
    ).toEqual(['I', 'II', 'III', 'IV', 'V']);
    for (const radio of radios) {
      expect(radio).not.toBeChecked();
      expect(radio).toBeEnabled();
    }
    // Sin color ni nombre por nivel (F-04-web PA-1): ninguna clase de tono por nivel.
    expect(fieldset.innerHTML).not.toMatch(/tone--(?!neutral)|level--\d/);
    expect(fieldset.textContent).not.toMatch(
      /rojo|naranja|amarillo|verde|azul|resucitación|emergencia|urgencia/i,
    );
  });

  it('R5: con disabledLevel la opción del sugerido queda deshabilitada y rotulada «(sugerido)», y las otras cuatro habilitadas', () => {
    render(<Harness disabledLevel={2} />);
    const suggested = screen.getByRole('radio', { name: 'II (sugerido)' });
    expect(suggested).toBeDisabled();
    for (const name of ['I', 'III', 'IV', 'V'])
      expect(screen.getByRole('radio', { name })).toBeEnabled();
  });

  it('R5: elegir un nivel lo marca y avisa con el número', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('radio', { name: 'IV' }));
    expect(screen.getByRole('radio', { name: 'IV' })).toBeChecked();
    expect(
      screen
        .getAllByRole('radio')
        .filter((radio) => (radio as HTMLInputElement).checked),
    ).toHaveLength(1);
  });

  it('R27: se navega con flechas entre las opciones y se salta la deshabilitada', async () => {
    const user = userEvent.setup();
    render(<Harness disabledLevel={2} />);
    await user.click(screen.getByRole('radio', { name: 'I' }));
    await user.keyboard('{ArrowRight}');
    const third = screen.getByRole('radio', { name: 'III' });
    expect(third).toHaveFocus();
    expect(third).toBeChecked();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'IV' })).toBeChecked();
    // Un solo punto de tabulación para el grupo.
    await user.tab();
    expect(document.activeElement?.getAttribute('type')).not.toBe('radio');
  });

  it('R27: el error se asocia al fieldset con aria-describedby y hay foco visible', () => {
    render(<Harness error="Elige un nivel." />);
    const fieldset = group();
    const describedBy = fieldset.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      'Elige un nivel.',
    );
    const css = readFileSync('src/index.css', 'utf8');
    // La regla global de foco visible alcanza los radios y el bloque F-05-web no la anula.
    expect(css).toMatch(/:focus-visible\s*\{\s*outline:/);
    const block = css.slice(css.indexOf('/* F-05-web'));
    expect(block).not.toMatch(/outline:\s*(none|0)/);
  });

  it('R27: sin error no hay aria-describedby', () => {
    render(<Harness />);
    expect(group()).not.toHaveAttribute('aria-describedby');
  });
});
