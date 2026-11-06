import { FeatureLoadError } from './routeErrors';

/** Descargas diferidas que fallaron (UI-03-web R14): «Reintentar» las vuelve a pedir. */
const failedLoads = new Set<FeatureLoader<unknown>>();

/**
 * Descarga diferida del código de una feature (UI-03-web R12, R14, D10). Guarda la promesa en
 * curso y el resultado; si la descarga falla, la promesa queda rechazada con `FeatureLoadError`
 * (sin el mensaje técnico) hasta que `retryFailedFeatureLoads` la olvide.
 */
export class FeatureLoader<T> {
  private promise: Promise<T> | null = null;
  private result:
    | { status: 'fulfilled'; value: T }
    | { status: 'rejected'; reason: FeatureLoadError }
    | null = null;
  private readonly load: () => Promise<T>;

  constructor(load: () => Promise<T>) {
    this.load = load;
  }

  /** El resultado de la descarga, o `null` si no ha terminado (o no ha empezado). */
  get settled() {
    return this.result;
  }

  /** La promesa de la descarga; la empieza la primera vez que se pide. */
  read(): Promise<T> {
    if (this.promise) return this.promise;
    const promise: Promise<T> = this.load().then(
      (value) => {
        this.result = { status: 'fulfilled', value };
        return value;
      },
      () => {
        const reason = new FeatureLoadError();
        this.result = { status: 'rejected', reason };
        failedLoads.add(this);
        throw reason;
      },
    );
    this.promise = promise;
    return promise;
  }

  /** Olvida una descarga fallida para que el siguiente `read` la repita. */
  reset(): void {
    this.promise = null;
    this.result = null;
  }
}

/**
 * Vuelve a pedir las descargas que fallaron (R14). La promesa se resuelve cuando terminan (bien o
 * mal), para volver a montar la ruta con el resultado ya conocido.
 */
export async function retryFailedFeatureLoads(): Promise<void> {
  const loaders = [...failedLoads];
  failedLoads.clear();
  await Promise.allSettled(
    loaders.map((loader) => {
      loader.reset();
      return loader.read();
    }),
  );
}
