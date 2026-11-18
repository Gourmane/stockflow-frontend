import type { User } from './auth';

export interface Employee extends User {
  role: 'employee';
  created_at: string | null;
}

export interface CreatedEmployee extends Employee {
  created_at: string;
  updated_at: string;
}

export interface UpdatedEmployee extends Employee {
  updated_at: string | null;
  email_verified_at: string | null;
}

export interface CreateEmployeePayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export type UpdateEmployeePayload = Partial<Pick<CreateEmployeePayload, 'name' | 'email'>>;

export interface UpdateEmployeeStatusPayload {
  is_active: boolean;
}
