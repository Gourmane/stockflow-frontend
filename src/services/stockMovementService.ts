import api from '../api/axios';
import type { DataResponseWithMessage, Pagination } from '../types/api';
import type { CreateStockMovementPayload, StockMovement, StockMovementHistoryItem } from '../types/stockMovement';

export const stockMovementService = {
  async list(page = 1, signal?: AbortSignal): Promise<Pagination<StockMovementHistoryItem>> {
    const { data } = await api.get<Pagination<StockMovementHistoryItem>>('/stock-movements', {
      params: { page },
      signal,
    });
    return data;
  },

  async create(payload: CreateStockMovementPayload): Promise<DataResponseWithMessage<StockMovement>> {
    const { data, status } = await api.post<DataResponseWithMessage<StockMovement>>('/stock-movements', payload);
    if (status !== 201 || data?.data?.product_id !== payload.product_id || !Number.isSafeInteger(data.data.id)
      || data.data.id < 1 || data.data.quantity !== payload.quantity || data.data.type !== payload.type) {
      throw new Error('Réponse de création du mouvement inattendue.');
    }
    return data;
  },
};
