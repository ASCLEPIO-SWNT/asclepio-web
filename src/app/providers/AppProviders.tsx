import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { SessionProvider } from '../../features/auth/SessionProvider';

const defaultQueryClient = new QueryClient();

export function AppProviders({
  children,
  queryClient = defaultQueryClient,
}: {
  children: ReactNode;
  /** Solo para pruebas: un QueryClient aislado por prueba. */
  queryClient?: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}
