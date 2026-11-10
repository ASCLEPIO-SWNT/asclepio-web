import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { formatDateTimeBogota } from '../../../shared/lib/datetime';
import { norm } from '../../../test/text';
import {
  DECIDED_AT,
  LONG_REASON,
  correctDecision,
  correctLongDecision,
  manualDecision,
  validateDecision,
} from '../testing/decisionFixtures';
import { TriageDecisionView } from './TriageDecisionView';

function terms(container: HTMLElement) {
  const list = container.querySelector('dl')!;
  return [...list.querySelectorAll('dt')].map((dt) => [
    norm(dt.textContent ?? ''),
    norm(dt.nextElementSibling?.textContent ?? ''),
  ]);
}

describe('F-05-web decisión en solo lectura', () => {
  it('R16: VALIDATE muestra el nivel final en romano en una insignia neutra, la acción y el nivel sugerido, sin motivo', () => {
    const { container } = render(
      <TriageDecisionView decision={validateDecision} />,
    );
    expect(terms(container)).toEqual([
      ['Nivel final', 'II'],
      ['Acción', 'Sugerencia validada'],
      ['Nivel sugerido', 'II'],
    ]);
    const badge = within(container.querySelector('dd')!).getByText('II');
    expect(badge).toHaveClass('badge', 'tone--neutral');
    expect(badge.className).not.toMatch(/tone--(ok|warn|error|accent)/);
  });

  it('R16: CORRECT muestra además el motivo literal', () => {
    const { container } = render(
      <TriageDecisionView decision={correctDecision} />,
    );
    expect(terms(container)).toEqual([
      ['Nivel final', 'IV'],
      ['Acción', 'Sugerencia corregida'],
      ['Nivel sugerido', 'II'],
      ['Motivo', correctDecision.reason!],
    ]);
  });

  it('R16: un motivo de 500 caracteres sin espacios se muestra entero y puede partirse', () => {
    render(<TriageDecisionView decision={correctLongDecision} />);
    const reason = screen.getByText(LONG_REASON);
    expect(reason).toHaveClass('decision-view__reason');
  });

  it('R16: MANUAL no muestra nivel sugerido ni motivo', () => {
    const { container } = render(
      <TriageDecisionView decision={manualDecision} />,
    );
    expect(terms(container)).toEqual([
      ['Nivel final', 'III'],
      ['Acción', 'Triage manual'],
    ]);
  });

  it('R16: muestra quién y cuándo en America/Bogota, sin ningún control', () => {
    const { container } = render(
      <TriageDecisionView decision={validateDecision} />,
    );
    // 15:20 UTC = 10:20 a. m. en Bogotá.
    expect(formatDateTimeBogota(DECIDED_AT)).toMatch(/10:20/);
    expect(norm(container.querySelector('p.muted')!.textContent ?? '')).toBe(
      norm(
        `Registrado por ${validateDecision.decidedBy.fullName} el ${formatDateTimeBogota(DECIDED_AT)}`,
      ),
    );
    expect(
      container.querySelectorAll('button, input, select, textarea, a'),
    ).toHaveLength(0);
  });

  it('R16: sin nombre del responsable usa «Personal»', () => {
    render(
      <TriageDecisionView
        decision={{
          ...manualDecision,
          decidedBy: { ...manualDecision.decidedBy, fullName: null },
        }}
      />,
    );
    expect(screen.getByText(/^Registrado por Personal el /)).toBeVisible();
  });
});
