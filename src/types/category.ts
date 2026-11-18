export interface Category {
  id: number;
  name: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateCategoryPayload {
  name: string;
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;
