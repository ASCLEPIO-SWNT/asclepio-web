import { useEffect, useReducer } from 'react';
import type { RouteObject } from 'react-router';
import type { TitleHandle } from '../../shared/hooks/useDocumentTitle';
import { FeatureLoader } from '../../shared/lib/lazyPage';
import { RouteLoading } from '../../shared/ui/RouteLoading';

/** Cargadores creados, para poder precargar el código (p. ej. el arnés de pruebas). */
const loaders: FeatureLoader<RouteObject[]>[] = [];

/** Descarga ya el código de todas las features diferidas registradas (fallos incluidos). */
export async function preloadFeatures(): Promise<void> {
  await Promise.allSettled(loaders.map((loader) => loader.read()));
}

function LazyRoute({
  loader,
  path,
}: {
  loader: FeatureLoader<RouteObject[]>;
  path: string;
}) {
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const result = loader.settled;
  useEffect(() => {
    if (result) return;
    let active = true;
    const done = () => {
      if (active) refresh();
    };
    loader.read().then(done, done);
    return () => {
      active = false;
    };
  }, [loader, result]);
  // R14: una descarga fallida llega al `errorElement` de la ruta, dentro del marco.
  if (result?.status === 'rejected') throw result.reason;
  if (result?.status === 'fulfilled')
    return result.value.find((route) => route.path === path)?.element ?? null;
  // R13: estado de carga dentro del marco mientras llega el código.
  return <RouteLoading />;
}

/**
 * Rutas de una feature privada cuyo código se descarga al renderizarlas (UI-03-web R12, D10). El
 * camino y el título (`pages`) son estáticos, así que el router, los guards y el título de la
 * pestaña no necesitan el código; la descarga ocurre solo cuando `RequireRole` deja pasar, así que
 * una ruta prohibida no la provoca. Un único `import()` por feature: un fragmento por feature.
 */
export function lazyFeatureRoutes(
  pages: Record<string, TitleHandle>,
  load: () => Promise<RouteObject[]>,
): RouteObject[] {
  const loader = new FeatureLoader(load);
  loaders.push(loader);
  return Object.entries(pages).map(([path, handle]) => ({
    path,
    handle,
    element: <LazyRoute loader={loader} path={path} />,
  }));
}
