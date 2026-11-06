import { afterEach, describe, expect, it } from 'vitest';
import { LOCALES, setCurrentLocale } from '../i18n/locale';
import { translate } from '../i18n';
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

describe('UI-03-web mensajes por clave', () => {
  it('R20: featureMessage y fieldMessage traducen las claves de catálogo en los cinco idiomas', () => {
    const expected = {
      es: 'La atención ya está cerrada o cancelada.',
      en: 'The encounter is already closed or cancelled.',
      pt: 'O atendimento já foi encerrado ou cancelado.',
      fr: 'La prise en charge est déjà clôturée ou annulée.',
      de: 'Die Behandlung ist bereits abgeschlossen oder storniert.',
    } as const;
    for (const locale of LOCALES) {
      setCurrentLocale(locale);
      expect(featureMessage('feature_cancel_conflict')).toBe(expected[locale]);
    }
    setCurrentLocale('en');
    expect(fieldMessage('feature_birth_future')).toBe(
      translate('en', 'feature_birth_future'),
    );
    setCurrentLocale('es');
  });

  it('R20: un texto que no es clave ni mensaje conocido no se convierte en otra cosa', () => {
    expect(featureMessage('feature_unknown_key_xyz')).toBe(
      'feature_unknown_key_xyz',
    );
    expect(fieldMessage('server said something')).toBe('Revisa este campo.');
  });
});
