import { apiFetch } from '@/lib/api';
import { collectAllPages } from '@/lib/pagination';
import { CATALOG_IMAGE_FIELD_NAME, MAX_CATALOG_IMAGE_BYTES } from '@/lib/catalogImages';
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
  roots_only?: boolean;
  is_active?: boolean;
  search?: string;
}

export const ADMIN_CATEGORIES_ENDPOINT = '/api/admin/categories';

export const CATEGORY_IMAGE_FIELD_NAME = CATALOG_IMAGE_FIELD_NAME;

export const MAX_CATEGORY_IMAGE_BYTES = MAX_CATALOG_IMAGE_BYTES;

/**
 * Generates a backend-compliant URL slug matching /^[a-z0-9]+(?:-[a-z0-9]+)*$/
 */
export function generateCategorySlug(input: string): string {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || `category-${Date.now()}`;
}

/**
 * Extracts a displayable image URL (such as an S3 signed URL) from a BackendCategory record.
 */
export function resolveCategoryImageUrl(
  cat?: BackendCategory | null
): string | undefined {
  if (!cat) return undefined;
  const candidates = [
    cat.category_image_url,
    cat.image_url,
    cat.imageUrl,
    cat.category_image,
  ];
  for (const val of candidates) {
    if (
      typeof val === 'string' &&
      val.trim() &&
      (val.startsWith('http://') ||
        val.startsWith('https://') ||
        val.startsWith('blob:') ||
        val.startsWith('data:') ||
        val.startsWith('/'))
    ) {
      return val.trim();
    }
  }
  return undefined;
}

export async function getAdminCategories(
  params?: CategoryListParams
): Promise<AdminCategoriesResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {};
  if (params?.limit !== undefined) queryParams.limit = params.limit;
  if (params?.offset !== undefined) queryParams.offset = params.offset;
  // Do not combine roots_only=true with parent_category_id per API contract
  if (params?.parent_category_id !== undefined && params?.parent_category_id !== null) {
    queryParams.parent_category_id = params.parent_category_id;
  } else if (params?.roots_only !== undefined) {
    queryParams.roots_only = String(params.roots_only);
  }
  if (params?.is_active !== undefined) {
    queryParams.is_active = String(params.is_active);
  }
  if (params?.search !== undefined && params.search.trim() !== '') {
    queryParams.search = params.search.trim();
  }

  const res = await apiFetch<ApiResponse<BackendCategory[]>>(ADMIN_CATEGORIES_ENDPOINT, {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
  });

  if (!Array.isArray(res?.data)) throw new Error('Unable to read categories from the server. Please refresh.');
  return {
    data: res.data,
    pagination: res.pagination,
  };
}

export async function getAdminCategoriesTree(params?: {
  is_active?: boolean;
}): Promise<BackendCategory[]> {
  const queryParams: Record<string, string | undefined> = {};
  if (params?.is_active !== undefined) {
    queryParams.is_active = String(params.is_active);
  }
  const res = await apiFetch<ApiResponse<BackendCategory[]>>(
    '/api/admin/categories/tree',
    {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    }
  );
  return Array.isArray(res.data) ? res.data : [];
}


export async function getAllAdminCategories(): Promise<BackendCategory[]> {
  return collectAllPages(
    (offset, limit) => getAdminCategories({ limit, offset }),
    (category) => category.category_id ?? category.id!
  );
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
  const categoryName = payload.category_name.trim();
  const slug = generateCategorySlug(payload.slug?.trim() || categoryName);

  const cleanBody: Record<string, any> = {
    category_name: categoryName,
    slug,
    category_image: payload.category_image?.trim() || null,
    parent_category_id:
      payload.parent_category_id != null && Number(payload.parent_category_id) > 0
        ? Number(payload.parent_category_id)
        : null,
    description: payload.description?.trim() || null,
    sort_order: payload.sort_order != null ? Number(payload.sort_order) : 0,
    is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
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
  if (payload.category_name !== undefined) {
    cleanBody.category_name = payload.category_name.trim();
  }
  if (payload.slug !== undefined && payload.slug.trim()) {
    cleanBody.slug = generateCategorySlug(payload.slug.trim());
  }
  if (payload.category_image !== undefined) {
    cleanBody.category_image = payload.category_image ? payload.category_image.trim() : null;
  }
  if (payload.parent_category_id !== undefined) {
    cleanBody.parent_category_id =
      payload.parent_category_id != null && Number(payload.parent_category_id) > 0
        ? Number(payload.parent_category_id)
        : null;
  }
  if (payload.description !== undefined) {
    cleanBody.description = payload.description ? payload.description.trim() : null;
  }
  if (payload.sort_order !== undefined) {
    cleanBody.sort_order = Number(payload.sort_order) || 0;
  }
  if (payload.is_active !== undefined) {
    cleanBody.is_active = Boolean(payload.is_active);
  }

  const res = await apiFetch<any>(`/api/admin/categories/${categoryId}`, {
    method: 'PATCH',
    body: JSON.stringify(cleanBody),
  });
  return res?.data ?? res;
}


export async function deleteAdminCategory(
  categoryId: number | string
): Promise<void> {
  await apiFetch(`/api/admin/categories/${categoryId}`, {
    method: 'DELETE',
    body: JSON.stringify({}),
  });
}
