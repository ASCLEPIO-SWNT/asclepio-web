const bogota = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  dateStyle: 'short',
  timeStyle: 'medium',
});

/** Muestra una hora ISO-8601 (UTC, del servidor) en America/Bogota. */
export function formatBogota(iso: string): string {
  return bogota.format(new Date(iso));
}

// Formateadores de los dashboards (D28): en America/Bogota y sin segundos. `formatBogota` conserva
// los segundos para las demás pantallas y no cambia.
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

// El espacio que `Intl` escribe en «8:05 a. m.» depende del motor y de la versión de ICU (U+0020 medido
// en Chromium 153, Firefox 153 y Node 22.23.1; otras versiones, U+00A0 o U+202F). Con espacios normales,
// en un ancho estrecho «p. m.» se parte de la hora, o «p.» de «m.»: se pasan a U+00A0 el espacio que
// precede al indicador y el de dentro, escriba lo que escriba el motor. El de la fecha y la hora no se
// toca, para que la línea pueda cortar ahí.
function joinMeridiem(text: string): string {
  return text.replace(/\s+([ap])\.\s+m\./g, '\u00A0$1.\u00A0m.');
}

/** Hora de una marca ISO-8601 (UTC, del servidor) en America/Bogota, sin segundos: «8:05 a. m.» (U+00A0). */
export function formatTimeBogota(iso: string): string {
  return joinMeridiem(bogotaTime.format(new Date(iso)));
}

/** Fecha de una marca ISO-8601 en America/Bogota (puede ser el día anterior al UTC): «27/10/26». */
export function formatDateBogota(iso: string): string {
  return bogotaDate.format(new Date(iso));
}

/** Fecha y hora en America/Bogota, sin segundos: «27/10/26, 8:05 a. m.» (U+00A0 en la hora). */
export function formatDateTimeBogota(iso: string): string {
  return joinMeridiem(bogotaDateTime.format(new Date(iso)));
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

// F-07-web D4: fechas civiles para el periodo por defecto de los reportes. Son fechas de
// calendario para un filtro, no horas legales: la web nunca envía una hora.
const bogotaCivil = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Fecha civil `YYYY-MM-DD` de `now` en America/Bogota, sin depender de la zona del navegador. */
export function bogotaToday(now: Date = new Date()): string {
  const parts = Object.fromEntries(
    bogotaCivil.formatToParts(now).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Suma `days` (negativos para restar) a una fecha civil `YYYY-MM-DD` con aritmética UTC sobre el
 * calendario: no usa horas ni la zona del proceso.
 */
export function addCivilDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}
