import { createContext, useContext, type ReactNode } from 'react';
import type { StaffMe } from '../api/client';

const CurrentStaffContext = createContext<StaffMe | null>(null);

/** Lo monta `AppShell` con el perfil de la sesión activa (design.md D2). */
export function CurrentStaffProvider({
  me,
  children,
}: {
  me: StaffMe;
  children: ReactNode;
}) {
  return (
    <CurrentStaffContext.Provider value={me}>
      {children}
    </CurrentStaffContext.Provider>
  );
}

/**
 * Perfil de la sesión activa para las features (D2). Usarlo fuera de una sesión activa
 * es un error de programación, no de usuario.
 */
export function useCurrentStaff(): StaffMe {
  const me = useContext(CurrentStaffContext);
  if (!me) {
    throw new Error('useCurrentStaff se usa fuera de una sesión activa');
  }
  return me;
}

/** El id del perfil activo, o `null` fuera de una sesión (formularios montados sueltos). */
export function useCurrentStaffId(): string | null {
  return useContext(CurrentStaffContext)?.id ?? null;
}
