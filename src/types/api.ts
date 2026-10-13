export interface BackendAdminUser {
  id: string;
  name: string;
  email: string;
}

export interface BackendAdmin {
  id: string;
  name: string;
  email: string;
  active: boolean;
  city: string | null;
  pincode: string | null;
  state: string | null;
  adminApproval?: {
    requireSuperAdminApproval: boolean;
  };
  permissions?: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface BackendProduct {
  id?: number | string;
  product_id?: number;
  name?: string;
  product_name?: string;
  price?: number;
  stock?: number;
  prescription_required?: boolean;
  age_group?: string | null;
  description?: string | null;
  category_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface BackendCategory {
  id?: number | string;
  category_id?: number;
  category_name: string;
  category_image?: string | null;
  parent_category_id?: number | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  parent?: BackendCategory | null;
  subcategories?: BackendCategory[];
}

export interface AdminCategoriesResponse {
  data: BackendCategory[];
  pagination?: PaginationMeta;
}

export interface BackendUser {
  id: string;
  name: string;
  email: string;
  active: boolean;
}

export interface CreateAdminPayload {
  name: string;
  email: string;
  password: string;
  city: string;
  pincode: string;
  state: string;
  adminApproval?: {
    requireSuperAdminApproval: boolean;
  };
  permissions?: string[];
}

export interface UpdateAdminPayload {
  name?: string;
  email?: string;
  city?: string | null;
  pincode?: string | null;
  state?: string | null;
  adminApproval?: {
    requireSuperAdminApproval: boolean;
  };
  permissions?: string[];
  active?: boolean;
}

export interface ChangeAdminPasswordPayload {
  currentPassword?: string;
  newPassword: string;
}

export interface CreateProductPayload {
  product_name: string;
  prescription_required?: boolean;
  age_group?: string | null;
  description?: string | null;
  category_id?: number | null;
}

export interface UpdateProductPayload {
  product_name?: string;
  prescription_required?: boolean;
  age_group?: string | null;
  description?: string | null;
  category_id?: number | null;
}

export interface CreateCategoryPayload {
  category_name: string;
  category_image?: string | null;
  parent_category_id?: number | null;
  description?: string | null;
}

export interface UpdateCategoryPayload {
  category_name?: string;
  category_image?: string | null;
  parent_category_id?: number | null;
  description?: string | null;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  data: T;
  demo?: boolean;
  pagination?: PaginationMeta;
  message?: string;
  user?: BackendAdminUser;
}
