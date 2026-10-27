/** Marcador de una pantalla que aún no existe (R23): sin datos de pacientes ni acciones. */
export function PlaceholderPage({
  title,
  feature,
}: {
  title: string;
  feature: string;
}) {
  return (
    <section className="card" aria-labelledby="placeholder-title">
      <h1 id="placeholder-title">{title}</h1>
      <p className="muted">Esta funcionalidad llega en {feature}.</p>
    </section>
  );
}
