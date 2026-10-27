const bogota = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  dateStyle: 'short',
  timeStyle: 'medium',
});

/** Muestra una hora ISO-8601 (UTC, del servidor) en America/Bogota. */
export function formatBogota(iso: string): string {
  return bogota.format(new Date(iso));
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
