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

/**
 * Multer field name matching backend `multer({...}).array('uploadimage', 6)`
 * in `src/admin/products/product_image.js`.
 */
export const PRODUCT_IMAGE_FIELD_NAME =
  process.env.NEXT_PUBLIC_PRODUCT_IMAGE_FIELD || 'uploadimage';

export const MAX_PRODUCT_IMAGES = 6;
export const MAX_TOTAL_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB overall limit
export const ALLOWED_PRODUCT_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

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
 * Extracts image URLs directly from the backend product's `images` array (`res.data.images`).
 */
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

/**
 * Extracts the primary thumbnail URL for a product directly from `bp.images`.
 */
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

  // 1. Create the product first using application/json
  const res = await apiFetch<any>(ADMIN_PRODUCTS_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(cleanBody),
  });
  const created: BackendProduct = res?.data ?? res;
  const newProdId = created?.product_id ?? created?.id;

  // 2. Upload images to POST /api/admin/products/:productId/images if any images were provided
  const files = payload.images ?? [];
  if (files.length > 0 && newProdId) {
    try {
      await uploadAdminProductImages(newProdId, files);
      try {
        const fresh = await getAdminProductById(newProdId);
        if (fresh) return fresh;
      } catch {
        // Fallback to created
      }
    } catch (uploadErr: any) {
      console.warn('Product created, but image upload encountered an issue:', uploadErr);
      throw new Error(
        `Product was created (ID: ${newProdId}), but image upload failed: ${uploadErr?.message || 'Upload error'}`
      );
    }
  }

  return created;
}

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

/**
 * Fetches all images for a specific product.
 * Supports both `GET /api/admin/products/:productId` (`res.data.images`)
 * and `GET /api/admin/products/:productId/images` (`res.data`).
 */
export async function getAdminProductImages(
  productId: number | string
): Promise<BackendProductImageRecord[]> {
  try {
    const res = await apiFetch<any>(`/api/admin/products/${productId}`);
    const prod = res?.data ?? res;
    if (Array.isArray(prod?.images)) return prod.images;
  } catch {
    // fallback to /images endpoint
  }
  const imgRes = await apiFetch<any>(`/api/admin/products/${productId}/images`);
  return Array.isArray(imgRes?.data) ? imgRes.data : Array.isArray(imgRes) ? imgRes : [];
}

/**
 * Deletes a specific product image via DELETE /api/admin/products/:productId/images/:imageId.
 */
export async function deleteAdminProductImage(
  productId: number | string,
  imageId: number | string
): Promise<void> {
  await apiFetch(`/api/admin/products/${productId}/images/${imageId}`, {
    method: 'DELETE',
    body: JSON.stringify({}),
  });
}

/**
 * Sets an image as the primary image for a product via PATCH /api/admin/products/:productId/images/:imageId/primary.
 */
export async function setPrimaryProductImage(
  productId: number | string,
  imageId: number | string
): Promise<void> {
  await apiFetch(`/api/admin/products/${productId}/images/${imageId}/primary`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
}

/**
 * Uploads images for a specific product via POST /api/admin/products/:productId/images.
 * Uses multipart/form-data with field name 'uploadimage' matching Multer configuration.
 */
export async function uploadAdminProductImages(
  productId: number | string,
  images: File[]
): Promise<any> {
  if (!images.length) return null;

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

  // 1. Update product metadata using application/json
  const res = await apiFetch<any>(`/api/admin/products/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(cleanBody),
  });
  const updated: BackendProduct = res?.data ?? res;

  // 2. Upload any new images via POST /api/admin/products/:productId/images
  const files = payload.images ?? [];
  if (files.length > 0) {
    try {
      await uploadAdminProductImages(productId, files);
      try {
        const fresh = await getAdminProductById(productId);
        if (fresh) return fresh;
      } catch {
        // Fallback to updated
      }
    } catch (uploadErr: any) {
      console.warn('Product updated, but image upload encountered an issue:', uploadErr);
      throw new Error(
        `Product was updated, but image upload failed: ${uploadErr?.message || 'Upload error'}`
      );
    }
  }

  return updated;
}

/**
 * Deletes a product by numeric ID via DELETE /api/admin/products/:productId.
 */
export async function deleteAdminProduct(
  productId: number | string
): Promise<void> {
  await apiFetch(`/api/admin/products/${productId}`, {
    method: 'DELETE',
    body: JSON.stringify({}),
  });
}
