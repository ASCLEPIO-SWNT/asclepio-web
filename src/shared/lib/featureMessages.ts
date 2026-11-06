import { t } from '../i18n';

/** Canonical validation/action text is translated at render, keeping RHF and notice state intact. */
const MESSAGE_KEYS: Record<string, string> = {
  'Tu sesión expiró. Vuelve a iniciar sesión.': 'feature_expired',
  'Esta web es solo para el personal. Los pacientes usan la app móvil.':
    'feature_patient_access',
  'Correo o contraseña incorrectos.': 'feature_wrong_credentials',
  'Demasiados intentos. Espera un momento e inténtalo de nuevo.':
    'feature_rate_limited',
  'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.':
    'feature_network_error',
  'No se pudo iniciar sesión. Inténtalo de nuevo.': 'feature_login_error',
  'Escribe tu correo.': 'feature_email_required',
  'Escribe un correo válido.': 'feature_email_invalid',
  'Escribe tu contraseña.': 'feature_password_required',
  'La contraseña no puede tener más de 128 caracteres.': 'feature_password_max',
  'No se pudieron cargar las sedes.': 'feature_sites_error',
  'Este preregistro ya no está pendiente o el paciente ya tiene una atención activa.':
    'feature_confirm_conflict',
  'Este preregistro ya no existe.': 'feature_pr_gone',
  'Este preregistro ya no está pendiente.': 'feature_reject_conflict',
  'Ya existe un paciente con ese documento.': 'feature_patient_conflict',
  'La fecha de nacimiento no puede ser posterior a hoy.':
    'feature_birth_future',
  'El paciente ya tiene un pre-registro pendiente o una atención activa. Revisa la bandeja.':
    'feature_arrival_conflict',
  'La sede o el paciente ya no son válidos.': 'feature_arrival_invalid',
  'Escribe el motivo.': 'feature_reason_required',
  'El motivo admite como máximo 500 caracteres.': 'feature_reason_max',
  'Escribe la fecha de nacimiento.': 'feature_birth_required',
  'La edad estimada debe ser un número entero entre 0 y 120.':
    'feature_age_invalid',
  'El nombre admite como máximo 200 caracteres.': 'feature_name_max',
  'Elige el sexo.': 'feature_sex_choose',
  'Elige el tipo de documento.': 'feature_document_choose',
  'Escribe el número de documento.': 'feature_document_required',
  'El número de documento admite como máximo 64 caracteres.':
    'feature_document_max',
  'Escribe el nombre.': 'feature_name_required',
  'Indica la fecha de nacimiento o la edad estimada.': 'feature_age_choose',
  'Elige la sede.': 'feature_site_required',
  'Escribe el motivo de consulta.': 'feature_complaint_required',
  'El motivo de consulta admite como máximo 2000 caracteres.':
    'feature_complaint_max',
  'No tienes permiso para realizar esta acción.': 'feature_forbidden_action',
  'No se pudo completar la acción. Inténtalo de nuevo.': 'feature_action_error',
  'La atención ya está cerrada o cancelada.': 'feature_cancel_conflict',
};

const KNOWN_KEYS = new Set([
  ...Object.values(MESSAGE_KEYS),
  // UI-03-web B1: errores de acción de red y de servidor.
  'common_error_network',
  'common_error_server',
]);

/**
 * La clave de catálogo de un mensaje: el propio texto si ya es una clave conocida (UI-03-web R20:
 * los componentes guardan claves, no literales) o la del texto canónico en español.
 */
function keyOf(message: string): string | undefined {
  if (KNOWN_KEYS.has(message)) return message;
  return Object.hasOwn(MESSAGE_KEYS, message)
    ? MESSAGE_KEYS[message]
    : undefined;
}

export function featureMessage(message: string): string {
  const key = keyOf(message);
  return key ? t(key) : message;
}

/** Backend fields are associated normally, but unknown server text is not exposed. */
export function fieldMessage(message: string | undefined): string | undefined {
  if (!message) return undefined;
  return t(keyOf(message) ?? 'feature_field_review');
}
