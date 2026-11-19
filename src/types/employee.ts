import type { User, UserRole } from './auth';

export interface Employee extends User {
  role: 'employee';
  created_at: string | null;
}

export interface CreatedUser extends User {
  created_at: string;
  updated_at: string;
}

export interface UpdatedEmployee extends Employee {
  updated_at: string | null;
  email_verified_at: string | null;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role?: UserRole;
}

export type UpdateEmployeePayload = Partial<Pick<CreateUserPayload, 'name' | 'email'>>;

export interface UpdateEmployeeStatusPayload {
  is_active: boolean;
}
