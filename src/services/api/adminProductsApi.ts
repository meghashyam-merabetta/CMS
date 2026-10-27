import { apiFetch } from '@/lib/api';
import {
  BackendProduct,
  CreateProductPayload,
  UpdateProductPayload,
  ProductStatus,
  PaginationMeta,
  ApiResponse,
  BackendProductVariant,
  CreateProductVariantPayload,
  UpdateProductVariantPayload,
} from '@/types/api';

export interface ProductListParams {
  limit?: number;
  offset?: number;
  category_id?: number;
  brand_id?: number;
  product_status?: ProductStatus;
  search?: string;
  sort_by?: 'product_id' | 'product_name' | 'product_code' | 'sku';
  sort_order?: 'asc' | 'desc';
}

export interface AdminProductsResponse {
  data: BackendProduct[];
  pagination?: PaginationMeta;
  demo?: boolean;
}

export const ADMIN_PRODUCTS_ENDPOINT = '/api/admin/products';

export const PRODUCT_IMAGE_FIELD_NAME =
  process.env.NEXT_PUBLIC_PRODUCT_IMAGE_FIELD || 'uploadimage';

export const MAX_PRODUCT_IMAGES = 6;
export const MAX_TOTAL_IMAGE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_PRODUCT_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function generateProductSlug(input: string): string {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || `product-${Date.now()}`;
}

export function resolveProductImageUrls(bp?: BackendProduct | any): string[] {
  if (!bp || typeof bp !== 'object') return [];
  const imgs = Array.isArray(bp.images) ? bp.images : [];
  const sorted = [...imgs].sort((a, b) => (b?.is_primary ? 1 : 0) - (a?.is_primary ? 1 : 0));
  const urls = sorted
    .map((item: any) => (typeof item === 'string' ? item : item?.image_url))
    .filter((u: any): u is string => typeof u === 'string' && u.trim().length > 0);

  if (urls.length === 0 && typeof bp.image_url === 'string' && bp.image_url.trim()) {
    return [bp.image_url.trim()];
  }
  return urls;
}

export function resolvePrimaryProductImage(
  bp?: BackendProduct | any
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
  if (params?.brand_id !== undefined && params?.brand_id !== null) {
    queryParams.brand_id = params.brand_id;
  }
  if (params?.product_status) {
    queryParams.product_status = params.product_status;
  }
  if (params?.search !== undefined && params?.search.trim() !== '') {
    queryParams.search = params.search.trim();
  }
  if (params?.sort_by) {
    queryParams.sort_by = params.sort_by;
  }
  if (params?.sort_order) {
    queryParams.sort_order = params.sort_order;
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

export async function getAdminProductById(
  productId: number | string
): Promise<BackendProduct> {
  const res = await apiFetch<any>(`/api/admin/products/${productId}`);
  return res?.data ?? res;
}

function buildProductRequestBody(
  payload: CreateProductPayload | UpdateProductPayload,
  isCreate: boolean
): Record<string, any> {
  const body: Record<string, any> = {};

  if (payload.product_name !== undefined) {
    body.product_name = payload.product_name.trim();
  }
  if (payload.slug !== undefined && payload.slug.trim()) {
    body.slug = generateProductSlug(payload.slug.trim());
  } else if (isCreate && payload.product_name) {
    body.slug = generateProductSlug(payload.product_name);
  }

  if (payload.brand_id !== undefined) {
    const bId = payload.brand_id != null ? Number(payload.brand_id) : null;
    body.brand_id = bId && !isNaN(bId) && bId > 0 ? bId : null;
  }

  if (payload.short_description !== undefined) {
    body.short_description = payload.short_description?.trim() || null;
  }
  if (payload.description !== undefined) {
    body.description = payload.description?.trim() || null;
  }
  if (payload.product_status !== undefined) {
    body.product_status = payload.product_status;
  }
  if (payload.product_type !== undefined) {
    body.product_type = payload.product_type;
  }
  if (payload.product_code !== undefined) {
    body.product_code = payload.product_code?.trim() || null;
  }
  if (payload.sku !== undefined) {
    body.sku = payload.sku?.trim() || null;
  }

  // Pricing & discount fields (send numbers, not strings)
  if (payload.regular_price !== undefined) {
    body.regular_price =
      payload.regular_price != null ? Number(payload.regular_price) : null;
  }
  if (payload.sale_price !== undefined) {
    body.sale_price =
      payload.sale_price != null ? Number(payload.sale_price) : null;
  }
  if (payload.offer_percent !== undefined) {
    body.offer_percent =
      payload.offer_percent != null ? Number(payload.offer_percent) : null;
  }
  if (payload.special_discount_enabled !== undefined) {
    body.special_discount_enabled = Boolean(payload.special_discount_enabled);
  }
  if (payload.special_discount_percent !== undefined) {
    body.special_discount_percent = Number(payload.special_discount_percent) || 0;
  }
  if (payload.festival_offer_enabled !== undefined) {
    body.festival_offer_enabled = Boolean(payload.festival_offer_enabled);
  }
  if (payload.festival_offer_percent !== undefined) {
    body.festival_offer_percent = Number(payload.festival_offer_percent) || 0;
  }

  // Stock & Order Quantities
  if (payload.stock_quantity !== undefined) {
    body.stock_quantity = Math.max(0, Math.floor(Number(payload.stock_quantity) || 0));
  }
  if (payload.min_order_quantity !== undefined) {
    body.min_order_quantity = Math.max(1, Math.floor(Number(payload.min_order_quantity) || 1));
  }
  if (payload.max_order_quantity !== undefined) {
    body.max_order_quantity =
      payload.max_order_quantity != null && Number(payload.max_order_quantity) >= 1
        ? Math.floor(Number(payload.max_order_quantity))
        : null;
  }

  // Categories
  if (payload.category_ids !== undefined) {
    const validIds = (payload.category_ids || [])
      .map((id) => Number(id))
      .filter((id) => !isNaN(id) && id > 0);
    body.category_ids = Array.from(new Set(validIds));
  }
  if (payload.primary_category_id !== undefined) {
    const pId =
      payload.primary_category_id != null ? Number(payload.primary_category_id) : null;
    if (pId && !isNaN(pId) && pId > 0) {
      body.primary_category_id = pId;
      if (!body.category_ids) {
        body.category_ids = [pId];
      } else if (!body.category_ids.includes(pId)) {
        body.category_ids.push(pId);
      }
    } else {
      body.primary_category_id = null;
    }
  }

  // Specifications fields
  const nullableStringSpecs = [
    'target_audience',
    'hsn_code',
    'material',
    'colour',
    'package_type',
    'shelf_life',
    'hazardous_clause',
    'manufactured_in',
    'company_name',
    'company_address',
    'packer_name',
    'packer_address',
  ] as const;

  for (const field of nullableStringSpecs) {
    if (payload[field] !== undefined) {
      const val = payload[field];
      body[field] = typeof val === 'string' && val.trim() ? val.trim() : null;
    }
  }

  const nullableNumberSpecs = [
    'gst_rate',
    'weight',
    'unit_count',
    'package_length',
    'package_breadth',
    'package_height',
  ] as const;

  for (const field of nullableNumberSpecs) {
    if (payload[field] !== undefined) {
      const val = payload[field];
      body[field] = val != null && !isNaN(Number(val)) ? Number(val) : null;
    }
  }

  if (payload.weight_unit !== undefined) {
    body.weight_unit = payload.weight_unit;
  }
  if (payload.dimension_unit !== undefined) {
    body.dimension_unit = payload.dimension_unit;
  }
  if (payload.water_resistant !== undefined) {
    body.water_resistant =
      payload.water_resistant === null ? null : Boolean(payload.water_resistant);
  }
  if (payload.keywords !== undefined) {
    body.keywords = (payload.keywords || []).map((k) => k.trim()).filter(Boolean);
  }

  return body;
}

export async function createAdminProduct(
  payload: CreateProductPayload
): Promise<BackendProduct> {
  const cleanBody = buildProductRequestBody(payload, true);

  const res = await apiFetch<any>(ADMIN_PRODUCTS_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(cleanBody),
  });
  const created: BackendProduct = res?.data ?? res;
  const newProdId = created?.product_id ?? created?.id;

  const files = payload.images ?? [];
  if (files.length > 0 && newProdId) {
    await uploadAdminProductImages(newProdId, files);
  }

  if (newProdId) {
    try {
      return await getAdminProductById(newProdId);
    } catch {
      return created;
    }
  }

  return created;
}

export async function updateAdminProduct(
  productId: number | string,
  payload: UpdateProductPayload
): Promise<BackendProduct> {
  const cleanBody = buildProductRequestBody(payload, false);

  let updated: BackendProduct | null = null;
  if (Object.keys(cleanBody).length > 0) {
    const res = await apiFetch<any>(`/api/admin/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(cleanBody),
    });
    updated = res?.data ?? res;
  }

  const files = payload.images ?? [];
  if (files.length > 0) {
    await uploadAdminProductImages(productId, files);
  }

  try {
    return await getAdminProductById(productId);
  } catch {
    return updated as BackendProduct;
  }
}

export async function deleteAdminProduct(
  productId: number | string
): Promise<void> {
  await apiFetch(`/api/admin/products/${productId}`, {
    method: 'DELETE',
    body: JSON.stringify({}),
  });
}

/* ------------------------------------------------------------------ */
/* Product Images CRUD & Replacement (Point 7)                        */
/* ------------------------------------------------------------------ */

export interface BackendProductImageRecord {
  id: string;
  product_id: string;
  image_url: string;
  s3_key?: string;
  alt_text?: string | null;
  sort_order?: number;
  is_primary?: boolean;
  created_at?: string;
}

export async function getAdminProductImages(
  productId: number | string
): Promise<BackendProductImageRecord[]> {
  const imgRes = await apiFetch<any>(`/api/admin/products/${productId}/images`);
  return Array.isArray(imgRes?.data) ? imgRes.data : Array.isArray(imgRes) ? imgRes : [];
}

export async function uploadAdminProductImages(
  productId: number | string,
  images: File[]
): Promise<BackendProductImageRecord[]> {
  if (!images.length) return [];

  const formData = new FormData();
  for (const file of images) {
    formData.append(PRODUCT_IMAGE_FIELD_NAME, file);
  }

  const res = await apiFetch<any>(`/api/admin/products/${productId}/images`, {
    method: 'POST',
    body: formData,
  });
  return res?.data ?? res;
}

export async function replaceAdminProductImage(
  productId: number | string,
  imageId: number | string,
  file: File
): Promise<BackendProductImageRecord> {
  const formData = new FormData();
  formData.append(PRODUCT_IMAGE_FIELD_NAME, file);

  const res = await apiFetch<any>(
    `/api/admin/products/${productId}/images/${imageId}`,
    {
      method: 'PUT',
      body: formData,
    }
  );
  return res?.data ?? res;
}

export async function setPrimaryProductImage(
  productId: number | string,
  imageId: number | string
): Promise<BackendProductImageRecord> {
  const res = await apiFetch<any>(
    `/api/admin/products/${productId}/images/${imageId}/primary`,
    {
      method: 'PATCH',
      body: JSON.stringify({}),
    }
  );
  return res?.data ?? res;
}

export async function deleteAdminProductImage(
  productId: number | string,
  imageId: number | string
): Promise<void> {
  await apiFetch(`/api/admin/products/${productId}/images/${imageId}`, {
    method: 'DELETE',
    body: JSON.stringify({}),
  });
}

/* ------------------------------------------------------------------ */
/* Per-Product Variants CRUD (Point 6)                                */
/* ------------------------------------------------------------------ */

export async function getAdminProductVariants(
  productId: number | string,
  params?: { limit?: number; offset?: number }
): Promise<BackendProductVariant[]> {
  const res = await apiFetch<ApiResponse<BackendProductVariant[]>>(
    `/api/admin/products/${productId}/variants`,
    {
      params: params as any,
    }
  );
  return Array.isArray(res?.data) ? res.data : [];
}

export async function getAdminProductVariantById(
  productId: number | string,
  variantId: number | string
): Promise<BackendProductVariant> {
  const res = await apiFetch<ApiResponse<BackendProductVariant>>(
    `/api/admin/products/${productId}/variants/${variantId}`
  );
  return (res as any)?.data ?? res;
}

export async function createAdminProductVariant(
  productId: number | string,
  payload: CreateProductVariantPayload
): Promise<BackendProductVariant> {
  const res = await apiFetch<ApiResponse<BackendProductVariant>>(
    `/api/admin/products/${productId}/variants`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  return (res as any)?.data ?? res;
}

export async function updateAdminProductVariant(
  productId: number | string,
  variantId: number | string,
  payload: UpdateProductVariantPayload
): Promise<BackendProductVariant> {
  const res = await apiFetch<ApiResponse<BackendProductVariant>>(
    `/api/admin/products/${productId}/variants/${variantId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
  return (res as any)?.data ?? res;
}

export async function deleteAdminProductVariant(
  productId: number | string,
  variantId: number | string
): Promise<void> {
  await apiFetch(`/api/admin/products/${productId}/variants/${variantId}`, {
    method: 'DELETE',
    body: JSON.stringify({}),
  });
}
