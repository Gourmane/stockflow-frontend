import api from '../api/axios';
import type { DataResponse, DataResponseWithMessage, Pagination } from '../types/api';
import type { CreateProductPayload, Product, UpdatedProduct, UpdateProductPayload } from '../types/product';

interface ProductListOptions {
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}

export const productService = {
  async list({ page = 1, perPage = 10, signal }: ProductListOptions = {}): Promise<Pagination<Product>> {
    const { data } = await api.get<Pagination<Product>>('/products', {
      params: { page, per_page: perPage },
      signal,
    });
    return data;
  },

  async get(id: number, signal?: AbortSignal): Promise<DataResponse<Product>> {
    const { data } = await api.get<DataResponse<Product>>(`/products/${id}`, { signal });
    return data;
  },

  async create(payload: CreateProductPayload): Promise<DataResponse<Product>> {
    const { data } = await api.post<DataResponse<Product>>('/products', payload);
    return data;
  },

  async update(
    id: number,
    payload: UpdateProductPayload,
  ): Promise<DataResponseWithMessage<UpdatedProduct>> {
    const { data } = await api.patch<DataResponseWithMessage<UpdatedProduct>>(`/products/${id}`, payload);
    return data;
  },
};
