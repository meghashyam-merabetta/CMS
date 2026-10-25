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
 * Normalizes an image candidate string into a valid, loadable URL.
 */
function normalizeImageUrl(val?: any): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  // Already an absolute URL with HTTPS or data/blob URI
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }

  // Handle http:// URLs
  if (trimmed.startsWith('http://')) {
    // If it points to an S3 bucket or merabetta domain, upgrade to https
    if (trimmed.includes('amazonaws.com') || trimmed.includes('merabetta.com')) {
      return trimmed.replace(/^http:\/\//i, 'https://');
    }
    // If it points to backend host or localhost with a path, extract relative path
    const match = trimmed.match(/^http:\/\/[^/]+(\/.*)$/);
    if (match && match[1]) {
      return match[1];
    }
    return trimmed;
  }

  // If it starts with a leading slash, it is a valid relative path
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // If it looks like a relative path with an image extension, prepend leading slash
  if (/\.(png|jpe?g|webp|gif|svg|avif)($|\?)/i.test(trimmed)) {
    return `/${trimmed}`;
  }

  return null;
}

/**
 * Extracts all valid signed/public image URLs from a BackendProduct record.
 * Handles Sequelize associations (product_images, ProductImages), Multer-S3 (location, key),
 * and various nested or direct field naming schemes.
 */
export function resolveProductImageUrls(bp?: BackendProduct | any): string[] {
  if (!bp || typeof bp !== 'object') return [];
  const urls: string[] = [];

  const addCandidate = (val?: any) => {
    const url = normalizeImageUrl(val);
    if (url && !urls.includes(url)) {
      urls.push(url);
    }
  };

  const processItem = (item?: any) => {
    if (!item) return;
    if (typeof item === 'string') {
      addCandidate(item);
      return;
    }
    if (typeof item === 'object') {
      // Check Multer-S3 standard properties and all common backend fields
      addCandidate(item.location);
      addCandidate(item.image_url);
      addCandidate(item.imageUrl);
      addCandidate(item.url);
      addCandidate(item.image);
      addCandidate(item.image_name);
      addCandidate(item.imageName);
      addCandidate(item.file_path);
      addCandidate(item.filePath);
      addCandidate(item.path);
      addCandidate(item.signed_url);
      addCandidate(item.signedUrl);
      addCandidate(item.s3_url);
      addCandidate(item.s3Url);
      addCandidate(item.src);
      addCandidate(item.key);
    }
  };

  // 1. Check array properties on bp
  const imageCollections = [
    bp.images,
    bp.product_images,
    bp.ProductImages,
    bp.productImages,
    bp.ProductImage,
    bp.media,
    bp.photos,
    bp.pictures,
    bp.gallery,
  ];

  for (const collection of imageCollections) {
    if (Array.isArray(collection)) {
      for (const item of collection) {
        processItem(item);
      }
    } else if (collection && typeof collection === 'object') {
      processItem(collection);
    }
  }

  // 2. Check direct image properties on bp
  const directFields = [
    bp.image,
    bp.image_url,
    bp.imageUrl,
    bp.product_image,
    bp.productImage,
    bp.product_image_url,
    bp.productImageUrl,
    bp.primary_image,
    bp.primaryImage,
    bp.thumbnail,
    bp.thumbnail_url,
    bp.thumbnailUrl,
    bp.location,
    bp.image_name,
    bp.imageName,
    bp.image_path,
  ];

  for (const field of directFields) {
    processItem(field);
  }

  return urls;
}

/**
 * Extracts the primary thumbnail URL for a product.
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
  const files = (payload.images ?? []).slice(0, MAX_PRODUCT_IMAGES);
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
 * Fetches all images for a specific product via GET /api/admin/products/:productId/images.
 */
export async function getAdminProductImages(
  productId: number | string
): Promise<BackendProductImageRecord[]> {
  const res = await apiFetch<any>(`/api/admin/products/${productId}/images`);
  return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
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
  const files = images.slice(0, MAX_PRODUCT_IMAGES);
  if (files.length === 0) return null;

  const formData = new FormData();
  for (const file of files) {
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
  const files = (payload.images ?? []).slice(0, MAX_PRODUCT_IMAGES);
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
