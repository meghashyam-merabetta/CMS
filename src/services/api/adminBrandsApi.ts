import { apiFetch } from '@/lib/api';
import {
  BackendBrand,
  CreateBrandPayload,
  UpdateBrandPayload,
  AdminBrandsResponse,
  ApiResponse,
} from '@/types/api';

export interface BrandListParams {
  limit?: number;
  offset?: number;
  search?: string;
  is_active?: boolean;
  all?: boolean;
}

export const ADMIN_BRANDS_ENDPOINT = '/api/admin/brands';

export function generateBrandSlug(input: string): string {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || `brand-${Date.now()}`;
}

export async function getAdminBrands(
  params?: BrandListParams
): Promise<AdminBrandsResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {};
  if (params?.limit !== undefined) queryParams.limit = params.limit;
  if (params?.offset !== undefined) queryParams.offset = params.offset;
  if (params?.search !== undefined && params.search.trim() !== '') {
    queryParams.search = params.search.trim();
  }
  if (params?.is_active !== undefined) {
    queryParams.is_active = String(params.is_active);
  }
  if (params?.all !== undefined) {
    queryParams.all = String(params.all);
  }

  const res = await apiFetch<ApiResponse<BackendBrand[]>>(ADMIN_BRANDS_ENDPOINT, {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
  });

  return {
    data: Array.isArray(res.data) ? res.data : [],
    pagination: res.pagination,
  };
}

export async function getAllAdminBrands(isActive?: boolean): Promise<BackendBrand[]> {
  const res = await getAdminBrands({ all: true, is_active: isActive });
  return res.data;
}

export async function getAdminBrandById(
  brandId: number | string
): Promise<BackendBrand> {
  const res = await apiFetch<ApiResponse<BackendBrand>>(
    `${ADMIN_BRANDS_ENDPOINT}/${brandId}`
  );
  return (res as any)?.data ?? res;
}

export async function createAdminBrand(
  payload: CreateBrandPayload
): Promise<BackendBrand> {
  const brandName = payload.brand_name.trim();
  const slug = generateBrandSlug(payload.slug?.trim() || brandName);

  const body: Record<string, any> = {
    brand_name: brandName,
    slug,
    description: payload.description?.trim() ? payload.description.trim() : null,
    image_url: payload.image_url?.trim() ? payload.image_url.trim() : null,
    is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
  };

  const res = await apiFetch<ApiResponse<BackendBrand>>(ADMIN_BRANDS_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return (res as any)?.data ?? res;
}

export async function updateAdminBrand(
  brandId: number | string,
  payload: UpdateBrandPayload
): Promise<BackendBrand> {
  const body: Record<string, any> = {};
  if (payload.brand_name !== undefined) {
    body.brand_name = payload.brand_name.trim();
  }
  if (payload.slug !== undefined && payload.slug.trim()) {
    body.slug = generateBrandSlug(payload.slug.trim());
  }
  if (payload.description !== undefined) {
    body.description = payload.description?.trim() ? payload.description.trim() : null;
  }
  if (payload.image_url !== undefined) {
    body.image_url = payload.image_url?.trim() ? payload.image_url.trim() : null;
  }
  if (payload.is_active !== undefined) {
    body.is_active = Boolean(payload.is_active);
  }

  const res = await apiFetch<ApiResponse<BackendBrand>>(
    `${ADMIN_BRANDS_ENDPOINT}/${brandId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    }
  );
  return (res as any)?.data ?? res;
}

export async function deleteAdminBrand(
  brandId: number | string
): Promise<void> {
  await apiFetch(`${ADMIN_BRANDS_ENDPOINT}/${brandId}`, {
    method: 'DELETE',
    body: JSON.stringify({}),
  });
}
