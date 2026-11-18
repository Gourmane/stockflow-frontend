import api from '../api/axios';
import type { DataResponse, DataResponseWithMessage } from '../types/api';
import type {
  CreatedEmployee,
  CreateEmployeePayload,
  Employee,
  UpdatedEmployee,
  UpdateEmployeePayload,
  UpdateEmployeeStatusPayload,
} from '../types/employee';

export const userService = {
  async list(): Promise<DataResponse<Employee[]>> {
    const { data } = await api.get<DataResponse<Employee[]>>('/users');
    return data;
  },

  async create(payload: CreateEmployeePayload): Promise<DataResponseWithMessage<CreatedEmployee>> {
    const { data } = await api.post<DataResponseWithMessage<CreatedEmployee>>('/users', payload);
    return data;
  },

  async update(
    id: number,
    payload: UpdateEmployeePayload,
  ): Promise<DataResponseWithMessage<UpdatedEmployee>> {
    const { data } = await api.patch<DataResponseWithMessage<UpdatedEmployee>>(`/users/${id}`, payload);
    return data;
  },

  async updateStatus(
    id: number,
    payload: UpdateEmployeeStatusPayload,
  ): Promise<DataResponseWithMessage<UpdatedEmployee>> {
    const { data } = await api.patch<DataResponseWithMessage<UpdatedEmployee>>(`/users/${id}/status`, payload);
    return data;
  },
};
