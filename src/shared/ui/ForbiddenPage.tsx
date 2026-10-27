import { Link } from 'react-router';

/** Vista "Sin permiso" (R19): el rol no puede ver la ruta pedida. */
export function ForbiddenPage({ homePath }: { homePath: string }) {
  return (
    <section className="card" aria-labelledby="forbidden-title">
      <h1 id="forbidden-title">No tienes permiso para ver esta página.</h1>
      <p>
        <Link to={homePath}>Ir a mi pantalla de inicio</Link>
      </p>
    </section>
  );
}
