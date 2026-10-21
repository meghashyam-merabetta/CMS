import { apiFetch } from '@/lib/api';
import {
  BackendProduct,
  CreateProductPayload,
  UpdateProductPayload,
  ProductStatus,
  PaginationMeta,
  ApiResponse,
} from '@/types/api';

export interface ProductListParams {
  limit?: number;
  offset?: number;
  category_id?: number;
  product_status?: ProductStatus;
  search?: string;
}

export interface AdminProductsResponse {
  data: BackendProduct[];
  pagination?: PaginationMeta;
  demo?: boolean;
}

export const ADMIN_PRODUCTS_ENDPOINT = '/api/admin/products';

export const PRODUCT_IMAGE_FIELD_NAME =
  process.env.NEXT_PUBLIC_PRODUCT_IMAGE_FIELD || 'images';

export const MAX_PRODUCT_IMAGES = 6;
export const MAX_TOTAL_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB overall limit

/**
 * Generates a backend-compliant URL slug matching /^[a-z0-9]+(?:-[a-z0-9]+)*$/
 */
export function generateProductSlug(input: string): string {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || `product-${Date.now()}`;
}

/**
 * Extracts all valid signed/public image URLs from a BackendProduct record.
 */
export function resolveProductImageUrls(bp?: BackendProduct | null): string[] {
  if (!bp) return [];
  const urls: string[] = [];

  const addIfUrl = (val?: string | null) => {
    if (
      typeof val === 'string' &&
      val.trim() &&
      (val.startsWith('http://') ||
        val.startsWith('https://') ||
        val.startsWith('blob:') ||
        val.startsWith('data:') ||
        val.startsWith('/'))
    ) {
      if (!urls.includes(val.trim())) {
        urls.push(val.trim());
      }
    }
  };

  if (Array.isArray(bp.images)) {
    for (const item of bp.images) {
      if (typeof item === 'string') {
        addIfUrl(item);
      } else if (item && typeof item === 'object') {
        addIfUrl(item.image_url || item.imageUrl || item.url);
      }
    }
  }

  addIfUrl(bp.image_url);
  addIfUrl(bp.imageUrl);
  addIfUrl(bp.product_image);

  return urls;
}

/**
 * Extracts the primary thumbnail URL for a product.
 */
export function resolvePrimaryProductImage(
  bp?: BackendProduct | null
): string | undefined {
  return resolveProductImageUrls(bp)[0];
}

export async function getAdminProducts(
  params?: ProductListParams
): Promise<AdminProductsResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {};
  if (params?.limit !== undefined) queryParams.limit = params.limit;
  if (params?.offset !== undefined) queryParams.offset = params.offset;
  if (params?.category_id !== undefined && params?.category_id !== null) {
    queryParams.category_id = params.category_id;
  }
  if (params?.product_status) {
    queryParams.product_status = params.product_status;
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
 * Creates a new product matching the backend `products` + `product_categories` schema:
 * { product_name, slug, brand_id, short_description, description, product_status, category_ids, primary_category_id }
 */
export async function createAdminProduct(
  payload: CreateProductPayload
): Promise<BackendProduct> {
  const productName = payload.product_name.trim();
  const slug = generateProductSlug(payload.slug?.trim() || productName);

  const cleanBody: Record<string, any> = {
    product_name: productName,
    slug,
  };

  if (payload.brand_id !== undefined) {
    const bId = payload.brand_id != null ? Number(payload.brand_id) : null;
    cleanBody.brand_id = bId && !isNaN(bId) && bId > 0 ? bId : null;
  }

  if (payload.short_description !== undefined) {
    cleanBody.short_description = payload.short_description?.trim() || null;
  }

  if (payload.description !== undefined) {
    cleanBody.description = payload.description?.trim() || null;
  }

  if (payload.product_status) {
    cleanBody.product_status = payload.product_status;
  }

  if (Array.isArray(payload.category_ids)) {
    const validIds = payload.category_ids
      .map((id) => Number(id))
      .filter((id) => !isNaN(id) && id > 0);
    if (validIds.length > 0) {
      cleanBody.category_ids = Array.from(new Set(validIds));
    }
  }

  if (payload.primary_category_id !== undefined && payload.primary_category_id !== null) {
    const pId = Number(payload.primary_category_id);
    if (!isNaN(pId) && pId > 0) {
      cleanBody.primary_category_id = pId;
      if (!cleanBody.category_ids) {
        cleanBody.category_ids = [pId];
      } else if (!cleanBody.category_ids.includes(pId)) {
        cleanBody.category_ids.push(pId);
      }
    }
  }

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

  if (payload.product_name !== undefined) {
    cleanBody.product_name = payload.product_name.trim();
  }

  if (payload.slug !== undefined && payload.slug.trim()) {
    cleanBody.slug = generateProductSlug(payload.slug.trim());
  }

  if (payload.brand_id !== undefined) {
    const bId = payload.brand_id != null ? Number(payload.brand_id) : null;
    cleanBody.brand_id = bId && !isNaN(bId) && bId > 0 ? bId : null;
  }

  if (payload.short_description !== undefined) {
    cleanBody.short_description = payload.short_description?.trim() || null;
  }

  if (payload.description !== undefined) {
    cleanBody.description = payload.description?.trim() || null;
  }

  if (payload.product_status !== undefined) {
    cleanBody.product_status = payload.product_status;
  }

  if (payload.category_ids !== undefined) {
    const validIds = (payload.category_ids || [])
      .map((id) => Number(id))
      .filter((id) => !isNaN(id) && id > 0);
    cleanBody.category_ids = Array.from(new Set(validIds));
  }

  if (payload.primary_category_id !== undefined) {
    const pId = payload.primary_category_id != null ? Number(payload.primary_category_id) : null;
    if (pId && !isNaN(pId) && pId > 0) {
      cleanBody.primary_category_id = pId;
      if (Array.isArray(cleanBody.category_ids) && !cleanBody.category_ids.includes(pId)) {
        cleanBody.category_ids.push(pId);
      }
    } else {
      cleanBody.primary_category_id = null;
    }
  }

  const res = await apiFetch<any>(`/api/admin/products/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(cleanBody),
  });
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
