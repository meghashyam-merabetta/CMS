import { apiFetch } from '@/lib/api';
import {
  BackendProduct,
  CreateProductPayload,
  UpdateProductPayload,
  PaginationMeta,
  ApiResponse,
} from '@/types/api';

export interface ProductListParams {
  limit?: number;
  offset?: number;
  category_id?: number;
  search?: string;
}

export interface AdminProductsResponse {
  data: BackendProduct[];
  pagination?: PaginationMeta;
  demo?: boolean;
}

export const ADMIN_PRODUCTS_ENDPOINT = '/api/admin/products';

export async function getAdminProducts(
  params?: ProductListParams
): Promise<AdminProductsResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {};
  if (params?.limit !== undefined) queryParams.limit = params.limit;
  if (params?.offset !== undefined) queryParams.offset = params.offset;
  if (params?.category_id !== undefined && params?.category_id !== null) {
    queryParams.category_id = params.category_id;
  }
  if (params?.search !== undefined && params?.search.trim() !== '') {
    queryParams.search = params.search.trim();
  }

  const res = await apiFetch<ApiResponse<BackendProduct[]>>(ADMIN_PRODUCTS_ENDPOINT, {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
  });

  return {
    data: Array.isArray(res.data) ? res.data : [],
    pagination: res.pagination,
    demo: res.demo,
  };
}

/**
 * Retrieves a single product by numeric ID.
 */
export async function getAdminProductById(
  productId: number | string
): Promise<BackendProduct> {
  const res = await apiFetch<any>(`/api/admin/products/${productId}`);
  return res?.data ?? res;
}

/**
 * Creates a new product.
 */
export async function createAdminProduct(
  payload: CreateProductPayload
): Promise<BackendProduct> {
  const cleanBody: Record<string, any> = {
    product_name: payload.product_name.trim(),
    prescription_required: Boolean(payload.prescription_required),
    age_group: payload.age_group ? payload.age_group.trim() : null,
    description: payload.description ? payload.description.trim() : null,
    category_id: payload.category_id != null ? Number(payload.category_id) : null,
  };

  const res = await apiFetch<any>(ADMIN_PRODUCTS_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(cleanBody),
  });
  return res?.data ?? res;
}

/**
 * Updates an existing product via PATCH /api/admin/products/:productId.
 */
export async function updateAdminProduct(
  productId: number | string,
  payload: UpdateProductPayload
): Promise<BackendProduct> {
  const cleanBody: Record<string, any> = {};
  if (payload.product_name !== undefined) cleanBody.product_name = payload.product_name.trim();
  if (payload.prescription_required !== undefined) cleanBody.prescription_required = Boolean(payload.prescription_required);
  if (payload.age_group !== undefined) cleanBody.age_group = payload.age_group ? payload.age_group.trim() : null;
  if (payload.description !== undefined) cleanBody.description = payload.description ? payload.description.trim() : null;
  if (payload.category_id !== undefined) cleanBody.category_id = payload.category_id != null ? Number(payload.category_id) : null;

  const res = await apiFetch<any>(
    `/api/admin/products/${productId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(cleanBody),
    }
  );
  return res?.data ?? res;
}

/**
 * Deletes a product by numeric ID via DELETE /api/admin/products/:productId.
 */
export async function deleteAdminProduct(
  productId: number | string
): Promise<void> {
  await apiFetch(`/api/admin/products/${productId}`, {
    method: 'DELETE',
  });
}
