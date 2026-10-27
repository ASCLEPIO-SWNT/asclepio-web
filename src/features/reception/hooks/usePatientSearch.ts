import { useQuery } from '@tanstack/react-query';
import { api, type DocumentType } from '../../../shared/api/client';
import { unwrap } from '../../../shared/lib/problem';

export interface PatientSearchParams {
  documentType: DocumentType;
  documentNumber: string;
}

/**
 * Búsqueda de un paciente por documento (R19, D8): solo se pide al pulsar "Buscar"
 * (`params` no null) y no queda en caché al salir de la vista (`gcTime: 0`).
 */
export function usePatientSearch(params: PatientSearchParams | null) {
  return useQuery({
    queryKey: [
      'reception',
      'patient-search',
      params?.documentType,
      params?.documentNumber,
    ],
    queryFn: () => {
      if (!params) throw new Error('usePatientSearch sin parámetros');
      const { documentType, documentNumber } = params;
      return unwrap(() =>
        api.GET('/api/v1/patients', {
          params: { query: { documentType, documentNumber } },
        }),
      );
    },
    enabled: params !== null,
    gcTime: 0,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
