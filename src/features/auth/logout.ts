import { session } from '../../shared/api/session';
import { clearDrafts } from '../../shared/lib/drafts';

/**
 * Cierra la sesión por decisión del usuario. Los efectos (borrar la sesión guardada,
 * vaciar la caché y cancelar el temporizador) los aplica SessionProvider al ver el cambio.
 */
export function logout(): void {
  // UI-03-web R7: el cierre voluntario borra los borradores de signos vitales.
  clearDrafts();
  session.clear('logout');
}
