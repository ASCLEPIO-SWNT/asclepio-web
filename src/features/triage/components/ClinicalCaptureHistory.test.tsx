import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { formatBogota } from '../../../shared/lib/datetime';
import {
  captureFixture,
  recordedFinding,
  recordedVitalSigns,
} from '../testing/clinicalFixtures';
import { ClinicalCaptureHistory } from './ClinicalCaptureHistory';

it('R14: presents every server measurement and finding in contractual order with author, units and Bogota time', () => {
  render(
    <ClinicalCaptureHistory
      capture={captureFixture({
        vitalSigns: [
          recordedVitalSigns,
          {
            ...recordedVitalSigns,
            id: 'later',
            recordedAt: '2026-10-28T16:00:00.000Z',
            heartRate: 85,
          },
        ],
        symptomFindings: [
          recordedFinding,
          {
            ...recordedFinding,
            id: 'note',
            kind: 'COMPLAINT_NOTE',
            description: 'Nota literal inmutable',
          },
        ],
      })}
    />,
  );
  const takes = screen.getByRole('region', { name: 'Tomas registradas' });
  expect(within(takes).getAllByRole('article')).toHaveLength(2);
  expect(within(takes).getAllByRole('article')[0]).toHaveTextContent('80 lpm');
  expect(within(takes).getAllByRole('article')[1]).toHaveTextContent('85 lpm');
  expect(takes).toHaveTextContent(formatBogota(recordedVitalSigns.recordedAt));
  expect(takes).toHaveTextContent(recordedVitalSigns.recordedBy.fullName!);
  expect(screen.getByText(recordedFinding.description)).toBeInTheDocument();
  expect(screen.getByText('Nota literal inmutable')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

it('R4: renders an explicit empty history when no capture has been recorded', () => {
  render(
    <ClinicalCaptureHistory
      capture={captureFixture({ vitalSigns: [], symptomFindings: [] })}
    />,
  );
  expect(screen.getByRole('status')).toHaveTextContent(
    'Aún no hay capturas clínicas.',
  );
});
