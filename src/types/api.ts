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

export type ProductStatus = 'draft' | 'active' | 'inactive' | 'archived';

export interface BackendProductImage {
  id?: number | string;
  product_id?: number | string;
  url?: string;
  image_url?: string;
  imageUrl?: string;
  alt_text?: string | null;
  sort_order?: number;
  is_primary?: boolean;
  key?: string;
  image_name?: string;
}

export interface BackendProduct {
  id?: number | string;
  product_id?: number | string;
  brand_id?: number | string | null;
  name?: string;
  product_name?: string;
  slug?: string;
  description?: string | null;
  short_description?: string | null;
  product_status?: ProductStatus;
  categories?: BackendCategory[];
  category_ids?: number[];
  primary_category_id?: number | null;
  price?: number;
  stock?: number;
  image_url?: string | null;
  imageUrl?: string | null;
  product_image?: string | null;
  image_name?: string | null;
  images?: (string | BackendProductImage)[];
  created_at?: string;
  updated_at?: string;
}

export interface BackendCategory {
  id?: number | string;
  category_id?: number | string;
  category_name: string;
  name?: string;
  slug?: string;
  category_image?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  category_image_url?: string | null;
  parent_category_id?: number | string | null;
  parent_id?: number | string | null;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  parent?: BackendCategory | null;
  subcategories?: BackendCategory[];
  ProductCategory?: {
    is_primary?: boolean;
  };
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
  slug?: string;
  brand_id?: number | null;
  short_description?: string | null;
  description?: string | null;
  product_status?: ProductStatus;
  category_ids?: number[];
  primary_category_id?: number | null;
}

export interface UpdateProductPayload {
  product_name?: string;
  slug?: string;
  brand_id?: number | null;
  short_description?: string | null;
  description?: string | null;
  product_status?: ProductStatus;
  category_ids?: number[];
  primary_category_id?: number | null;
}

export interface CreateCategoryPayload {
  category_name: string;
  slug?: string;
  category_image?: string | null;
  parent_category_id?: number | null;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateCategoryPayload {
  category_name?: string;
  slug?: string;
  category_image?: string | null;
  parent_category_id?: number | null;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
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
