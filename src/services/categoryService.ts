import api from '../api/axios';
import type { DataResponse, DataResponseWithMessage } from '../types/api';
import type { Category, CreateCategoryPayload, UpdateCategoryPayload } from '../types/category';

export const categoryService = {
  async list(signal?: AbortSignal): Promise<DataResponse<Category[]>> {
    const { data } = await api.get<DataResponse<Category[]>>('/categories', { signal });
    return data;
  },

  async get(id: number): Promise<DataResponse<Category>> {
    const { data } = await api.get<DataResponse<Category>>(`/categories/${id}`);
    return data;
  },

  async create(payload: CreateCategoryPayload): Promise<DataResponseWithMessage<Category>> {
    const { data } = await api.post<DataResponseWithMessage<Category>>('/categories', payload);
    return data;
  },

  async update(
    id: number,
    payload: UpdateCategoryPayload,
  ): Promise<DataResponseWithMessage<Category>> {
    const { data } = await api.patch<DataResponseWithMessage<Category>>(`/categories/${id}`, payload);
    return data;
  },
};
