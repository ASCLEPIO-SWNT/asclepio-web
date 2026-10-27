/** Estado de carga accesible (role="status"). */
export function LoadingState({ children }: { children: string }) {
  return (
    <p role="status" className="muted">
      {children}
    </p>
  );
}
