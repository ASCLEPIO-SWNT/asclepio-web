const bogota = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  dateStyle: 'short',
  timeStyle: 'medium',
});

/** Muestra una hora ISO-8601 (UTC, del servidor) en America/Bogota. */
export function formatBogota(iso: string): string {
  return bogota.format(new Date(iso));
}

// Formateadores de los dashboards (D28): en America/Bogota y sin segundos. Devuelven la salida de
// `Intl` tal cual, con el espacio que escriba cada versión de ICU en «8:05 a. m.»; las pruebas
// comparan con `\s` o con `norm`. `formatBogota` conserva los segundos para las demás pantallas.
const bogotaTime = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  hour: 'numeric',
  minute: '2-digit',
});
const bogotaDate = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  dateStyle: 'short',
});
const bogotaDateTime = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  dateStyle: 'short',
  timeStyle: 'short',
});

/** Hora de una marca ISO-8601 (UTC, del servidor) en America/Bogota, sin segundos: «8:05 a. m.». */
export function formatTimeBogota(iso: string): string {
  return bogotaTime.format(new Date(iso));
}

/** Fecha de una marca ISO-8601 en America/Bogota (puede ser el día anterior al UTC): «27/10/26». */
export function formatDateBogota(iso: string): string {
  return bogotaDate.format(new Date(iso));
}

/** Fecha y hora en America/Bogota, sin segundos: «27/10/26, 8:05 a. m.». */
export function formatDateTimeBogota(iso: string): string {
  return bogotaDateTime.format(new Date(iso));
}

/**
 * Muestra una fecha civil `YYYY-MM-DD` del contrato como `DD/MM/AAAA`, sin convertirla de
 * zona horaria (D10): `new Date('1990-05-17')` sería el 16 de mayo en Bogotá.
 */
export function formatCivilDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}
