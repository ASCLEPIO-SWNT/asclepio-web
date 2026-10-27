import { useMe } from '../hooks/useMe';
import { logout } from '../logout';

/** R16: GET /me falló sin ser un 401. No se muestra ninguna vista protegida. */
export function ProfileError() {
  const me = useMe();
  return (
    <section className="card" aria-labelledby="profile-error-title">
      <h1 id="profile-error-title" className="visually-hidden">
        Error de perfil
      </h1>
      <p role="alert" className="status status--error">
        No se pudo cargar tu perfil.
      </p>
      <div className="actions">
        <button
          type="button"
          className="button"
          disabled={me.isFetching}
          onClick={() => void me.refetch()}
        >
          Reintentar
        </button>
        <button type="button" className="button" onClick={logout}>
          Cerrar sesión
        </button>
      </div>
    </section>
  );
}
