import { apiFetch } from '@/lib/api';
import {
  BackendCategory,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  AdminCategoriesResponse,
  ApiResponse,
} from '@/types/api';

export interface CategoryListParams {
  limit?: number;
  offset?: number;
  parent_category_id?: number;
}

export const ADMIN_CATEGORIES_ENDPOINT = '/api/admin/categories';

export async function getAdminCategories(
  params?: CategoryListParams
): Promise<AdminCategoriesResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {};
  if (params?.limit !== undefined) queryParams.limit = params.limit;
  if (params?.offset !== undefined) queryParams.offset = params.offset;
  if (params?.parent_category_id !== undefined && params?.parent_category_id !== null) {
    queryParams.parent_category_id = params.parent_category_id;
  }

  const res = await apiFetch<ApiResponse<BackendCategory[]>>(ADMIN_CATEGORIES_ENDPOINT, {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
  });

  return {
    data: Array.isArray(res.data) ? res.data : [],
    pagination: res.pagination,
  };
}


export async function getAllAdminCategories(): Promise<BackendCategory[]> {
  try {
    const res = await getAdminCategories({ limit: 100, offset: 0 });
    return res.data;
  } catch {
    return [];
  }
}


export async function getAdminCategoryById(
  categoryId: number | string
): Promise<BackendCategory> {
  const res = await apiFetch<any>(`/api/admin/categories/${categoryId}`);
  return res?.data ?? res;
}


export async function createAdminCategory(
  payload: CreateCategoryPayload
): Promise<BackendCategory> {
  const cleanBody: Record<string, any> = {
    category_name: payload.category_name.trim(),
    category_image: payload.category_image?.trim() || null,
    parent_category_id: payload.parent_category_id != null ? Number(payload.parent_category_id) : null,
    description: payload.description?.trim() || null,
  };

  const res = await apiFetch<any>(ADMIN_CATEGORIES_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(cleanBody),
  });
  return res?.data ?? res;
}


export async function updateAdminCategory(
  categoryId: number | string,
  payload: UpdateCategoryPayload
): Promise<BackendCategory> {
  const cleanBody: Record<string, any> = {};
  if (payload.category_name !== undefined) cleanBody.category_name = payload.category_name.trim();
  if (payload.category_image !== undefined) cleanBody.category_image = payload.category_image ? payload.category_image.trim() : null;
  if (payload.parent_category_id !== undefined) cleanBody.parent_category_id = payload.parent_category_id != null ? Number(payload.parent_category_id) : null;
  if (payload.description !== undefined) cleanBody.description = payload.description ? payload.description.trim() : null;

  const res = await apiFetch<any>(
    `/api/admin/categories/${categoryId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(cleanBody),
    }
  );
  return res?.data ?? res;
}


export async function deleteAdminCategory(
  categoryId: number | string
): Promise<void> {
  await apiFetch(`/api/admin/categories/${categoryId}`, {
    method: 'DELETE',
  });
}
