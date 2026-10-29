import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { SessionProvider } from '../../features/auth/SessionProvider';
import { I18nProvider } from '../../shared/i18n';
import { createQueryClient } from './queryClient';

const defaultQueryClient = createQueryClient();

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
      <I18nProvider>
        <SessionProvider>{children}</SessionProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
