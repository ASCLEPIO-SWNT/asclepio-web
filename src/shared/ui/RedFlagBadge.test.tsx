import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { RedFlag } from '../api/client';
import { setCurrentLocale } from '../i18n/locale';
import { RedFlagBadge } from './RedFlagBadge';

const BADGE = 'Señal de alarma referida por el paciente';
const ALL_FLAGS: [RedFlag, string][] = [
  ['CHEST_PAIN', 'Dolor o presión en el pecho'],
  ['BREATHING_DIFFICULTY', 'Dificultad para respirar o ahogo'],
  ['LOSS_OF_CONSCIOUSNESS', 'Desmayo o pérdida de conciencia'],
  ['SEIZURE', 'Convulsión'],
  ['SEVERE_BLEEDING', 'Sangrado abundante o vómito con sangre'],
  [
    'STROKE_SIGNS',
    'Debilidad de un lado del cuerpo, cara torcida o dificultad para hablar',
  ],
  ['SUICIDAL_IDEATION', 'Ideación suicida'],
];

afterEach(() => {
  setCurrentLocale('es');
});

describe('F-11-web insignia de señal de alarma', () => {
  it('R2: muestra la insignia y la lista de señales traducida, en el orden recibido', () => {
    render(<RedFlagBadge flags={ALL_FLAGS.map(([flag]) => flag)} />);
    expect(screen.getByText(BADGE)).toBeVisible();
    const list = screen.getByRole('list', { name: 'Señales referidas' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(ALL_FLAGS.map(([, label]) => label));
  });

  it('R2: sin lista de señales (la cola solo trae hasRedFlags) muestra solo la insignia', () => {
    render(<RedFlagBadge />);
    expect(screen.getByText(BADGE)).toBeVisible();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('R5: la insignia tiene alternativa textual: el texto es visible, el icono es decorativo y no depende del color', () => {
    const { container } = render(<RedFlagBadge flags={['SEIZURE']} />);
    const badge = container.querySelector('.badge')!;
    expect(badge).toHaveClass('badge', 'tone--error');
    expect(badge).toHaveTextContent(BADGE);
    expect(badge.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(badge).not.toHaveAttribute('aria-hidden');
  });

  it('R5: los textos salen de los mensajes de Paraglide y cambian con el idioma', () => {
    setCurrentLocale('en');
    render(<RedFlagBadge flags={['CHEST_PAIN', 'SEIZURE']} />);
    expect(
      screen.getByText('Warning sign reported by the patient'),
    ).toBeVisible();
    const list = screen.getByRole('list', { name: 'Reported signs' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Chest pain or pressure', 'Seizure']);
  });

  it('R4: es una insignia informativa, sin botones ni nivel de triage', () => {
    const { container } = render(<RedFlagBadge flags={['CHEST_PAIN']} />);
    expect(screen.queryAllByRole('button')).toEqual([]);
    expect(container.textContent).not.toMatch(/nivel/i);
  });
});
