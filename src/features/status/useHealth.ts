import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/api/client';

export function useHealth() {
  return useQuery({
    queryKey: ['status', 'health'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/health');
      if (error || !data) throw new Error('La API no respondió correctamente.');
      return data;
    },
    retry: false,
  });
}
