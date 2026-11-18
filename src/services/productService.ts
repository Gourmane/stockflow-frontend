import api from '../api/axios';
import type { DataResponse, DataResponseWithMessage } from '../types/api';
import type { CreateProductPayload, Product, UpdatedProduct, UpdateProductPayload } from '../types/product';

export const productService = {
  async list(): Promise<DataResponse<Product[]>> {
    const { data } = await api.get<DataResponse<Product[]>>('/products');
    return data;
  },

  async get(id: number): Promise<DataResponse<Product>> {
    const { data } = await api.get<DataResponse<Product>>(`/products/${id}`);
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
