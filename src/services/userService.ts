import api from '../api/axios';
import type { DataResponse, DataResponseWithMessage } from '../types/api';
import type {
  CreatedUser,
  CreateUserPayload,
  Employee,
  UpdatedEmployee,
  UpdateEmployeePayload,
  UpdateEmployeeStatusPayload,
} from '../types/employee';

export const userService = {
  async list(signal?: AbortSignal): Promise<DataResponse<Employee[]>> {
    const { data } = await api.get<DataResponse<Employee[]>>('/users', { signal });
    if (!Array.isArray(data?.data)) throw new Error('Réponse inattendue pour la liste des employés.');
    return data;
  },

  async create(payload: CreateUserPayload): Promise<DataResponseWithMessage<CreatedUser>> {
    const { data, status } = await api.post<DataResponseWithMessage<CreatedUser>>('/users', payload);
    if (status !== 201 || !Number.isSafeInteger(data?.data?.id)
      || data.data.role !== (payload.role ?? 'employee') || data.data.is_active !== true) {
      throw new Error('Réponse inattendue lors de la création du compte.');
    }
    return data;
  },

  async update(
    id: number,
    payload: UpdateEmployeePayload,
  ): Promise<DataResponseWithMessage<UpdatedEmployee>> {
    const { data } = await api.patch<DataResponseWithMessage<UpdatedEmployee>>(`/users/${id}`, payload);
    if (data?.data?.id !== id || data.data.role !== 'employee') {
      throw new Error('Réponse inattendue lors de la modification du compte.');
    }
    return data;
  },

  async updateStatus(
    id: number,
    payload: UpdateEmployeeStatusPayload,
  ): Promise<DataResponseWithMessage<UpdatedEmployee>> {
    const { data } = await api.patch<DataResponseWithMessage<UpdatedEmployee>>(`/users/${id}/status`, payload);
    if (data?.data?.id !== id || data.data.role !== 'employee' || data.data.is_active !== payload.is_active) {
      throw new Error('Réponse inattendue lors du changement de statut.');
    }
    return data;
  },
};
