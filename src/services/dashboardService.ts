import api from '../api/axios';
import type { DashboardStats } from '../types/dashboard';

export const dashboardService = {
  async get(signal: AbortSignal): Promise<DashboardStats> {
    const { data } = await api.get<DashboardStats>('/dashboard', { signal });
    const counts = [data?.total_products, data?.total_units, data?.low_stock_count, data?.out_of_stock_count];
    if (!counts.every((count) => Number.isInteger(count) && count >= 0) || !Array.isArray(data?.recent_movements)) {
      throw new Error('Réponse du tableau de bord inattendue.');
    }
    return data;
  },
};
