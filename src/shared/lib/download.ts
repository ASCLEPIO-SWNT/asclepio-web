/**
 * Guarda un archivo en el equipo (F-07-web D7; R27): crea una URL temporal, pulsa un enlace
 * `<a download>` oculto y revoca la URL en cuanto el navegador tomó la descarga. No hace
 * peticiones, no lee el contenido y no lo guarda en ningún sitio.
 */
export function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    // En la siguiente vuelta del bucle: algunos navegadores cancelan la descarga si la URL se
    // revoca en el mismo tick del clic.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
