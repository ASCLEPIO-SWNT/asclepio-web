/** Registro de cargas diferidas que fallaron (UI-03-web R14); se rellena en la carga diferida. */
const failedLoads = new Set<() => void>();

export function registerFailedFeatureLoad(reset: () => void): void {
  failedLoads.add(reset);
}

/** Olvida las descargas fallidas para que el siguiente render las vuelva a pedir (R14). */
export function retryFailedFeatureLoads(): void {
  failedLoads.forEach((reset) => reset());
  failedLoads.clear();
}
