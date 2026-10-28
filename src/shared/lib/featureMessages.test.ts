import { afterEach, describe, expect, it } from 'vitest';
import { setCurrentLocale } from '../i18n/locale';
import { featureMessage, fieldMessage } from './featureMessages';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
  patientDocument,
  patientName,
  statusLabel,
} from './labels';

afterEach(() => setCurrentLocale('es'));

describe('UI-01 controlled messages', () => {
  it('R5: localiza validaciones propias y usa un aviso seguro para texto desconocido de la API', () => {
    setCurrentLocale('en');
    expect(fieldMessage('Escribe el motivo.')).toBe('Enter the reason.');
    expect(fieldMessage('Backend detail: patient record')).toBe(
      'Check this field.',
    );
    expect(fieldMessage('toString')).toBe('Check this field.');
    expect(fieldMessage(undefined)).toBeUndefined();
    setCurrentLocale('fr');
    expect(fieldMessage('Backend detail: patient record')).toBe(
      'Vérifiez ce champ.',
    );
    expect(featureMessage('No tienes permiso para realizar esta acción.')).toBe(
      'Vous n’avez pas l’autorisation d’effectuer cette action.',
    );
  });

  it('R6: resuelve etiquetas de dominio en cada idioma sin alterar códigos ni documentos', () => {
    const codes = [...DOCUMENT_TYPES];
    setCurrentLocale('en');
    expect(DOCUMENT_TYPE_LABELS.PA).toBe('Passport');
    expect(statusLabel('WAITING_TRIAGE')).toBe('Waiting for triage');
    setCurrentLocale('de');
    expect(DOCUMENT_TYPE_LABELS.PA).toBe('Reisepass');
    expect(DOCUMENT_TYPES).toEqual(codes);
    expect(
      patientDocument({
        fullName: 'Ana María',
        isNN: false,
        documentType: 'PA',
        documentNumber: 'AB-01234',
      }),
    ).toBe('Reisepass AB-01234');
    expect(
      patientName({
        fullName: 'Ana María',
        isNN: false,
        documentType: null,
        documentNumber: null,
      }),
    ).toBe('Ana María');
  });
});
