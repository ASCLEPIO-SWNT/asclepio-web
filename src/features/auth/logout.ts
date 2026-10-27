import { session } from '../../shared/api/session';

/**
 * Cierra la sesión por decisión del usuario. Los efectos (borrar la sesión guardada,
 * vaciar la caché y cancelar el temporizador) los aplica SessionProvider al ver el cambio.
 */
export function logout(): void {
  session.clear('logout');
}
