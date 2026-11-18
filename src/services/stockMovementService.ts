import api from '../api/axios';
import type { DataResponseWithMessage, Pagination } from '../types/api';
import type { CreateStockMovementPayload, StockMovement, StockMovementHistoryItem } from '../types/stockMovement';

export const stockMovementService = {
  async list(page = 1): Promise<Pagination<StockMovementHistoryItem>> {
    const { data } = await api.get<Pagination<StockMovementHistoryItem>>('/stock-movements', {
      params: { page },
    });
    return data;
  },

  async create(payload: CreateStockMovementPayload): Promise<DataResponseWithMessage<StockMovement>> {
    const { data } = await api.post<DataResponseWithMessage<StockMovement>>('/stock-movements', payload);
    return data;
  },
};
