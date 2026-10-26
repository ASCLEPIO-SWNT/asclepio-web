const bogota = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  dateStyle: 'short',
  timeStyle: 'medium',
});

/** Muestra una hora ISO-8601 (UTC, del servidor) en America/Bogota. */
export function formatBogota(iso: string): string {
  return bogota.format(new Date(iso));
}
