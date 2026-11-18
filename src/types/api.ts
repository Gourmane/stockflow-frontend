export interface DataResponse<T> {
  data: T;
}

export interface MessageResponse {
  message: string;
}

export interface DataResponseWithMessage<T> extends DataResponse<T>, MessageResponse {}

interface PaginationLink {
  url: string | null;
  label: string;
  page?: number | null;
  active: boolean;
}

export interface Pagination<T> extends DataResponse<T[]> {
  current_page: number;
  first_page_url: string;
  from: number | null;
  last_page: number;
  last_page_url: string;
  links: PaginationLink[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
}

export interface ApiValidationError extends MessageResponse {
  errors: Record<string, string[]>;
}
