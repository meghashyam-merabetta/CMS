import { apiFetch } from '@/lib/api';
import {
  assertJsonRequestSize,
  MAX_PRODUCT_JSON_REQUEST_BYTES,
} from '@/lib/jsonRequest';
import {
  ApiResponse,
  BackendProduct,
  BackendProductVariant,
  CreateProductPayload,
  CreateProductVariantPayload,
  PaginationMeta,
  ProductStatus,
  UpdateProductPayload,
  UpdateProductVariantPayload,
} from '@/types/api';

/* ========================================================================== */
/* NATIVE CATALOG SCHEMA TYPES                                                */
/* ========================================================================== */

export type NewProductType = 'simple' | 'variable' | 'grouped' | 'bundle';
export type NewProductStatus = 'active' | 'draft' | 'inactive' | 'archived';
export type NewWeightUnit = 'g' | 'kg' | 'mg' | 'lb' | 'oz';
export type NewDimensionUnit = 'cm' | 'mm' | 'in' | 'm';

export interface NativeProductDetailsPayload {
  short_description?: string | null;
  full_description?: string | null;
  key_features?: string[];
  highlights?: string[];

  manufacturer_name?: string | null;
  manufacturer_part_number?: string | null;
  country_of_origin?: string | null;
  imported_by?: string | null;
  marketed_by?: string | null;

  product_weight?: number | null;
  weight_unit?: NewWeightUnit | null;
  product_length?: number | null;
  product_width?: number | null;
  product_height?: number | null;
  dimension_unit?: NewDimensionUnit | null;

  material?: string | null;
  colour?: string | null;
  size?: string | null;
  model_number?: string | null;
  model_name?: string | null;
  warranty?: string | null;

  package_contents?: string[];
  package_weight?: number | null;
  package_length?: number | null;
  package_width?: number | null;
  package_height?: number | null;

  usage_instructions?: string | null;
  care_instructions?: string | null;
  safety_information?: string | null;
  return_policy?: string | null;

  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  canonical_url?: string | null;

  specifications?: Record<string, string>;
  additional_attributes?: Record<string, string>;
}

export interface NativeProductInventoryWritePayload {
  warehouse_id: number | string;
  total_quantity: number;
  available_quantity?: number;
  damaged_quantity?: number;
  in_transit_quantity?: number;
  minimum_stock_level?: number;
  maximum_stock_level?: number | null;
  reorder_quantity?: number | null;
  rack_number?: string | null;
  shelf_number?: string | null;
  bin_number?: string | null;
}

export interface BackendWarehouse {
  id?: string | number;
  warehouse_id?: string | number;
  warehouse_code: string;
  warehouse_name: string;
  warehouse_type?: string | null;
  contact_person?: string | null;
  contact_number?: string | null;
  email?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city: string;
  state: string;
  country?: string;
  pincode: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateWarehousePayload {
  warehouse_code: string;
  warehouse_name: string;
  warehouse_type?: string | null;
  contact_person?: string | null;
  contact_number?: string | null;
  email?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city: string;
  state: string;
  country?: string;
  pincode: string;
  is_active?: boolean;
}

export type UpdateWarehousePayload = Partial<CreateWarehousePayload>;

export interface BackendProductInventoryRow {
  id?: string | number;
  inventory_id?: string | number;
  product_id?: string | number;
  warehouse_id: string | number;
  warehouse_code?: string;
  warehouse_name?: string;
  city?: string;
  state?: string;
  total_quantity: number;
  available_quantity: number;
  reserved_quantity?: number;
  damaged_quantity?: number;
  in_transit_quantity?: number;
  minimum_stock_level?: number;
  maximum_stock_level?: number | null;
  reorder_quantity?: number | null;
  rack_number?: string | null;
  shelf_number?: string | null;
  bin_number?: string | null;
  updated_at?: string;
}

export interface BackendProductInventorySummary {
  total_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  damaged_quantity: number;
  in_transit_quantity: number;
  minimum_stock_level?: number;
  rows: BackendProductInventoryRow[];
}

export interface NativeProductWritePayload {
  product_code: string;
  product_name: string;
  slug: string;
  sku?: string | null;
  barcode?: string | null;
  brand_id?: number | string | null;
  category_id?: number | string | null;
  subcategory_id?: number | string | null;
  vendor_id?: number | string | null;
  product_type?: NewProductType;
  product_status?: NewProductStatus;
  mrp?: number | null;
  selling_price?: number | null;
  cost_price?: number | null;
  tax_rate?: number | null;
  hsn_code?: string | null;
  stock_quantity?: number | null;
  min_stock_quantity?: number | null;
  initial_inventory?: NativeProductInventoryWritePayload | null;
  details?: NativeProductDetailsPayload;
}

export interface BackendVendor {
  id?: string | number;
  vendor_id?: string | number;
  name?: string;
  vendor_name?: string;
  status?: string;
  is_active?: boolean;
}

export interface ProductListParams {
  limit?: number;
  offset?: number;
  category_id?: number | string;
  subcategory_id?: number | string;
  brand_id?: number | string;
  vendor_id?: number | string;
  product_group_code?: string;
  product_status?: ProductStatus;
  is_active?: boolean;
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
export const ADMIN_VENDORS_ENDPOINT = '/api/admin/vendors';
export const ADMIN_WAREHOUSES_ENDPOINT = '/api/admin/warehouses';

export const PRODUCT_IMAGE_FIELD_NAME =
  process.env.NEXT_PUBLIC_PRODUCT_IMAGE_FIELD || 'uploadimage';

export const MAX_PRODUCT_IMAGES = 6;
export const MAX_BACKEND_PRODUCT_IMAGES = 10;
export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_TOTAL_IMAGE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_PRODUCT_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/* ========================================================================== */
/* HELPERS: IDEMPOTENCY, SAFE INTEGERS, DECIMALS, SLUGS & IMAGES              */
/* ========================================================================== */

/**
 * Generates an Idempotency-Key matching 1–128 chars of [A-Za-z0-9._:-]
 */
export function generateIdempotencyKey(prefix = 'prod'): string {
  const randomPart =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}:${randomPart}`.slice(0, 128);
}

/**
 * Request IDs must be positive safe JSON integers; convert only after checking Number.isSafeInteger
 */
export function toSafePositiveInt(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = typeof val === 'number' ? val : Number(String(val).trim());
  if (Number.isSafeInteger(num) && num > 0) {
    return num;
  }
  return null;
}

/**
 * Nonnegative JSON number with at most `maxDecimals` decimal places
 */
export function toNonNegativeDecimal(val: unknown, maxDecimals = 2): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = typeof val === 'number' ? val : Number(String(val).trim());
  if (!Number.isFinite(num) || num < 0) return null;
  const factor = 10 ** maxDecimals;
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

/**
 * Nonnegative safe integer for stock quantities
 */
export function toNonNegativeSafeInt(val: unknown, fallback: number | null = null): number | null {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Math.floor(Number(String(val).trim()));
  if (Number.isSafeInteger(num) && num >= 0) {
    return num;
  }
  return fallback;
}

export function validateProductImages(
  files: File[],
  existingCount = 0,
  existingBytes = 0,
  operation: 'add' | 'replace' = 'add'
): string {
  if (files.length > 0 && operation !== 'replace' && existingCount + files.length > MAX_PRODUCT_IMAGES) {
    return `A product can have a maximum of ${MAX_PRODUCT_IMAGES} images in the editor. Remove an image before adding another.`;
  }
  if (files.some((file) => !ALLOWED_PRODUCT_IMAGE_TYPES.includes(file.type))) {
    return 'Product images must be JPG, PNG or WebP.';
  }
  if (files.some((file) => file.size > MAX_PRODUCT_IMAGE_BYTES)) {
    return 'Each product image must be no more than 5 MiB.';
  }
  if (existingBytes + files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_IMAGE_BYTES) {
    return 'Product images must be no more than 10 MiB per upload request.';
  }
  return '';
}

export function generateProductSlug(input: string): string {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || '';
}

export function resolveProductImageUrls(bp?: BackendProduct | any): string[] {
  if (!bp || typeof bp !== 'object') return [];
  const imgs = Array.isArray(bp.images) ? bp.images : [];
  const sorted = [...imgs].sort((a, b) => (b?.is_primary ? 1 : 0) - (a?.is_primary ? 1 : 0));
  const urls = sorted
    .map((item: any) => (typeof item === 'string' ? item : item?.image_url || item?.url || item?.imageUrl))
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

/* ========================================================================== */
/* BUILD NATIVE PRODUCT JSON REQUEST BODY                                     */
/* ========================================================================== */

export function buildNativeProductRequestBody(
  payload: Partial<NativeProductWritePayload>,
  isCreate: boolean
): Record<string, any> {
  const body: Record<string, any> = {};

  if (payload.product_code !== undefined) {
    body.product_code = payload.product_code.trim();
  }
  if (payload.product_name !== undefined) {
    body.product_name = payload.product_name.trim();
  }
  if (payload.slug !== undefined && payload.slug.trim()) {
    body.slug = generateProductSlug(payload.slug.trim());
  } else if (isCreate && payload.product_name) {
    body.slug = generateProductSlug(payload.product_name);
  }

  if (payload.sku !== undefined) {
    body.sku = payload.sku?.trim() || null;
  }
  if (payload.barcode !== undefined) {
    body.barcode = payload.barcode?.trim() || null;
  }

  if (payload.brand_id !== undefined) {
    body.brand_id = toSafePositiveInt(payload.brand_id);
  }
  if (payload.category_id !== undefined) {
    body.category_id = toSafePositiveInt(payload.category_id);
  }
  if (payload.subcategory_id !== undefined) {
    body.subcategory_id = toSafePositiveInt(payload.subcategory_id);
  }
  if (payload.vendor_id !== undefined) {
    body.vendor_id = toSafePositiveInt(payload.vendor_id);
  }

  if (payload.product_type !== undefined) {
    body.product_type = payload.product_type;
  }
  if (payload.product_status !== undefined) {
    body.product_status = payload.product_status;
  }

  if (payload.mrp !== undefined) {
    body.mrp = toNonNegativeDecimal(payload.mrp, 2);
  }
  if (payload.selling_price !== undefined) {
    body.selling_price = toNonNegativeDecimal(payload.selling_price, 2);
  }
  if (payload.cost_price !== undefined) {
    body.cost_price = toNonNegativeDecimal(payload.cost_price, 2);
  }
  if (payload.tax_rate !== undefined) {
    body.tax_rate = toNonNegativeDecimal(payload.tax_rate, 2);
  }
  if (payload.hsn_code !== undefined) {
    body.hsn_code = payload.hsn_code?.trim() || null;
  }

  if (payload.stock_quantity !== undefined && payload.stock_quantity !== null) {
    const sq = toNonNegativeSafeInt(payload.stock_quantity, null);
    if (sq !== null) body.stock_quantity = sq;
  }
  if (payload.min_stock_quantity !== undefined && payload.min_stock_quantity !== null) {
    const msq = toNonNegativeSafeInt(payload.min_stock_quantity, null);
    if (msq !== null) body.min_stock_quantity = msq;
  }

  if (payload.initial_inventory && isCreate) {
    const inv = payload.initial_inventory;
    const whId = toSafePositiveInt(inv.warehouse_id);
    const totalQty = toNonNegativeSafeInt(inv.total_quantity, 0) ?? 0;
    const availQty = inv.available_quantity !== undefined
      ? toNonNegativeSafeInt(inv.available_quantity, totalQty) ?? totalQty
      : totalQty;
    if (whId !== null) {
      body.initial_inventory = {
        warehouse_id: whId,
        total_quantity: totalQty,
        available_quantity: availQty,
        ...(inv.minimum_stock_level !== undefined ? { minimum_stock_level: toNonNegativeSafeInt(inv.minimum_stock_level, 0) ?? 0 } : {}),
        ...(inv.maximum_stock_level !== undefined && inv.maximum_stock_level !== null ? { maximum_stock_level: toNonNegativeSafeInt(inv.maximum_stock_level, null) } : {}),
        ...(inv.reorder_quantity !== undefined && inv.reorder_quantity !== null ? { reorder_quantity: toNonNegativeSafeInt(inv.reorder_quantity, null) } : {}),
        ...(inv.damaged_quantity !== undefined ? { damaged_quantity: toNonNegativeSafeInt(inv.damaged_quantity, 0) ?? 0 } : {}),
        ...(inv.in_transit_quantity !== undefined ? { in_transit_quantity: toNonNegativeSafeInt(inv.in_transit_quantity, 0) ?? 0 } : {}),
        ...(inv.rack_number ? { rack_number: inv.rack_number.trim() } : {}),
        ...(inv.shelf_number ? { shelf_number: inv.shelf_number.trim() } : {}),
        ...(inv.bin_number ? { bin_number: inv.bin_number.trim() } : {}),
      };
      body.stock_quantity = availQty;
    }
  }

  if (payload.details !== undefined) {
    const d = payload.details;
    const detailsObj: Record<string, any> = {};

    const nullableStrings = [
      'short_description',
      'full_description',
      'manufacturer_name',
      'manufacturer_part_number',
      'country_of_origin',
      'imported_by',
      'marketed_by',
      'material',
      'colour',
      'size',
      'model_number',
      'model_name',
      'warranty',
      'usage_instructions',
      'care_instructions',
      'safety_information',
      'return_policy',
      'meta_title',
      'meta_description',
      'meta_keywords',
      'canonical_url',
    ] as const;

    for (const key of nullableStrings) {
      if (d[key] !== undefined) {
        const val = d[key];
        detailsObj[key] = typeof val === 'string' && val.trim() ? val.trim() : null;
      }
    }

    const numericFields = [
      'product_weight',
      'product_length',
      'product_width',
      'product_height',
      'package_weight',
      'package_length',
      'package_width',
      'package_height',
    ] as const;

    for (const key of numericFields) {
      if (d[key] !== undefined) {
        detailsObj[key] = toNonNegativeDecimal(d[key], 2);
      }
    }

    if (d.weight_unit !== undefined) {
      detailsObj.weight_unit = d.weight_unit || null;
    }
    if (d.dimension_unit !== undefined) {
      detailsObj.dimension_unit = d.dimension_unit || null;
    }

    if (d.key_features !== undefined) {
      detailsObj.key_features = Array.isArray(d.key_features)
        ? d.key_features.map((s) => s.trim()).filter(Boolean)
        : [];
    }
    if (d.highlights !== undefined) {
      detailsObj.highlights = Array.isArray(d.highlights)
        ? d.highlights.map((s) => s.trim()).filter(Boolean)
        : [];
    }
    if (d.package_contents !== undefined) {
      detailsObj.package_contents = Array.isArray(d.package_contents)
        ? d.package_contents.map((s) => s.trim()).filter(Boolean)
        : [];
    }

    if (d.specifications !== undefined) {
      detailsObj.specifications = d.specifications || {};
    }
    if (d.additional_attributes !== undefined) {
      detailsObj.additional_attributes = d.additional_attributes || {};
    }

    body.details = detailsObj;
  }

  return body;
}

export function validateAdminProductRequestSize(
  payload: Partial<NativeProductWritePayload> | CreateProductPayload | UpdateProductPayload,
  isCreate = false
): void {
  const body = buildNativeProductRequestBody(payload as Partial<NativeProductWritePayload>, isCreate);
  assertJsonRequestSize(JSON.stringify(body), MAX_PRODUCT_JSON_REQUEST_BYTES);
}

/* ========================================================================== */
/* VENDORS & WAREHOUSES DROPDOWN API                                          */
/* ========================================================================== */

export async function getAdminVendors(params?: {
  limit?: number;
  offset?: number;
}): Promise<BackendVendor[]> {
  const res = await apiFetch<ApiResponse<BackendVendor[]> | BackendVendor[]>(
    ADMIN_VENDORS_ENDPOINT,
    {
      params: {
        limit: params?.limit ?? 100,
        offset: params?.offset ?? 0,
      },
    }
  );
  if (Array.isArray(res)) return res;
  if (res && Array.isArray((res as ApiResponse<BackendVendor[]>).data)) {
    return (res as ApiResponse<BackendVendor[]>).data;
  }
  return [];
}

export async function getAdminWarehouses(params?: {
  limit?: number;
  offset?: number;
  is_active?: boolean;
}): Promise<BackendWarehouse[]> {
  const queryParams: Record<string, string | number | boolean | undefined> = {
    limit: params?.limit ?? 100,
    offset: params?.offset ?? 0,
  };
  if (params?.is_active !== undefined) {
    queryParams.is_active = params.is_active;
  }
  const res = await apiFetch<ApiResponse<BackendWarehouse[]> | BackendWarehouse[]>(
    ADMIN_WAREHOUSES_ENDPOINT,
    { params: queryParams }
  );
  if (Array.isArray(res)) return res;
  if (res && Array.isArray((res as ApiResponse<BackendWarehouse[]>).data)) {
    return (res as ApiResponse<BackendWarehouse[]>).data;
  }
  return [];
}

export async function createAdminWarehouse(
  payload: CreateWarehousePayload
): Promise<BackendWarehouse> {
  const res = await apiFetch<any>(ADMIN_WAREHOUSES_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res?.data ?? res;
}

export async function getAdminProductInventory(
  productId: number | string
): Promise<BackendProductInventoryRow[]> {
  const res = await apiFetch<any>(`${ADMIN_PRODUCTS_ENDPOINT}/${productId}/inventory`);
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  if (res && Array.isArray(res.inventory)) return res.inventory;
  return [];
}

export async function setAdminProductInventory(
  productId: number | string,
  payload: NativeProductInventoryWritePayload
): Promise<any> {
  const whId = toSafePositiveInt(payload.warehouse_id);
  const total = toNonNegativeSafeInt(payload.total_quantity, 0) ?? 0;
  const avail = payload.available_quantity !== undefined
    ? toNonNegativeSafeInt(payload.available_quantity, total) ?? total
    : total;

  const body: Record<string, any> = {
    warehouse_id: whId,
    total_quantity: total,
    available_quantity: avail,
    ...(payload.damaged_quantity !== undefined ? { damaged_quantity: toNonNegativeSafeInt(payload.damaged_quantity, 0) ?? 0 } : {}),
    ...(payload.in_transit_quantity !== undefined ? { in_transit_quantity: toNonNegativeSafeInt(payload.in_transit_quantity, 0) ?? 0 } : {}),
    ...(payload.minimum_stock_level !== undefined ? { minimum_stock_level: toNonNegativeSafeInt(payload.minimum_stock_level, 0) ?? 0 } : {}),
    ...(payload.maximum_stock_level !== undefined && payload.maximum_stock_level !== null ? { maximum_stock_level: toNonNegativeSafeInt(payload.maximum_stock_level, null) } : {}),
    ...(payload.reorder_quantity !== undefined && payload.reorder_quantity !== null ? { reorder_quantity: toNonNegativeSafeInt(payload.reorder_quantity, null) } : {}),
    ...(payload.rack_number ? { rack_number: payload.rack_number.trim() } : {}),
    ...(payload.shelf_number ? { shelf_number: payload.shelf_number.trim() } : {}),
    ...(payload.bin_number ? { bin_number: payload.bin_number.trim() } : {}),
  };

  const res = await apiFetch<any>(`${ADMIN_PRODUCTS_ENDPOINT}/${productId}/inventory`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return res?.data ?? res;
}

/* ========================================================================== */
/* PRODUCTS CRUD API (NATIVE SCHEMA)                                          */
/* ========================================================================== */

export async function getAdminProducts(
  params?: ProductListParams
): Promise<AdminProductsResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {};
  if (params?.limit !== undefined) queryParams.limit = params.limit;
  if (params?.offset !== undefined) queryParams.offset = params.offset;
  if (params?.category_id !== undefined && params?.category_id !== null && params?.category_id !== '') {
    queryParams.category_id = params.category_id;
  }
  if (params?.subcategory_id !== undefined && params?.subcategory_id !== null && params?.subcategory_id !== '') {
    queryParams.subcategory_id = params.subcategory_id;
  }
  if (params?.brand_id !== undefined && params?.brand_id !== null && params?.brand_id !== '') {
    queryParams.brand_id = params.brand_id;
  }
  if (params?.vendor_id !== undefined && params?.vendor_id !== null && params?.vendor_id !== '') {
    queryParams.vendor_id = params.vendor_id;
  }
  if (params?.product_group_code !== undefined && params.product_group_code.trim() !== '') {
    queryParams.product_group_code = params.product_group_code.trim();
  }
  if (params?.product_status) {
    queryParams.product_status = params.product_status;
  }
  if (params?.is_active !== undefined) {
    queryParams.is_active = String(params.is_active);
  }
  if (params?.search !== undefined && params.search.trim() !== '') {
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
    data: Array.isArray(res?.data) ? res.data : [],
    pagination: res?.pagination,
    demo: res?.demo,
  };
}

export async function getAdminProductById(
  productId: number | string
): Promise<BackendProduct & Record<string, any>> {
  const res = await apiFetch<any>(`${ADMIN_PRODUCTS_ENDPOINT}/${productId}`, {
    cache: 'no-store',
  });
  return res?.data ?? res;
}

export async function getRelatedAdminProducts(
  productId: number | string,
  params?: { limit?: number; offset?: number }
): Promise<AdminProductsResponse> {
  const res = await apiFetch<ApiResponse<BackendProduct[]>>(
    `${ADMIN_PRODUCTS_ENDPOINT}/${productId}/related`,
    {
      params: {
        limit: params?.limit ?? 20,
        offset: params?.offset ?? 0,
      },
    }
  );
  return {
    data: Array.isArray(res?.data) ? res.data : [],
    pagination: res?.pagination,
  };
}

/**
 * POST /api/admin/products
 * Creates product + details atomically and returns the created product object (including `id`).
 * Does NOT auto-upload images inside this call so the caller can immediately retain `data.id`
 * before uploading images separately (preventing duplicate POSTs on image failure).
 */
export async function createNativeAdminProduct(
  payload: NativeProductWritePayload,
  options?: { idempotencyKey?: string }
): Promise<any> {
  const cleanBody = buildNativeProductRequestBody(payload, true);
  const idempotencyKey = options?.idempotencyKey || generateIdempotencyKey('product-create');

  const res = await apiFetch<any>(ADMIN_PRODUCTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(cleanBody),
  });

  return res?.data ?? res;
}

/**
 * PATCH /api/admin/products/:id
 * Partial update of an existing product; preserves its ID.
 */
export async function updateNativeAdminProduct(
  productId: number | string,
  payload: Partial<NativeProductWritePayload>
): Promise<any> {
  const cleanBody = buildNativeProductRequestBody(payload, false);

  const res = await apiFetch<any>(`${ADMIN_PRODUCTS_ENDPOINT}/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(cleanBody),
  });

  return res?.data ?? res;
}

/**
 * Legacy-compatible wrappers for other pages (e.g., products list table)
 */
export async function createAdminProduct(
  payload: CreateProductPayload
): Promise<BackendProduct> {
  const created = await createNativeAdminProduct(payload as unknown as NativeProductWritePayload);
  const newProdId = created?.id ?? created?.product_id;
  if (payload.images && payload.images.length > 0 && newProdId) {
    await uploadAdminProductImages(newProdId, payload.images);
  }
  return created;
}

export async function updateAdminProduct(
  productId: number | string,
  payload: UpdateProductPayload
): Promise<BackendProduct> {
  const updated = await updateNativeAdminProduct(
    productId,
    payload as unknown as Partial<NativeProductWritePayload>
  );
  if (payload.images && payload.images.length > 0) {
    await uploadAdminProductImages(productId, payload.images);
  }
  return updated;
}

export async function deleteAdminProduct(
  productId: number | string
): Promise<void> {
  await apiFetch(`${ADMIN_PRODUCTS_ENDPOINT}/${productId}`, {
    method: 'DELETE',
    body: JSON.stringify({}),
  });
}

/* ========================================================================== */
/* PRODUCT IMAGES CRUD (/api/admin/products/:id/images)                       */
/* ========================================================================== */

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
  const imgRes = await apiFetch<any>(`${ADMIN_PRODUCTS_ENDPOINT}/${productId}/images`, {
    cache: 'no-store',
  });
  const images = Array.isArray(imgRes?.data)
    ? imgRes.data
    : Array.isArray(imgRes)
    ? imgRes
    : [];

  return images
    .map((image: any) => ({
      ...image,
      id: String(image?.id ?? image?.image_id ?? ''),
      product_id: String(image?.product_id ?? productId),
      image_url: image?.image_url || image?.url || image?.imageUrl || '',
    }))
    .filter((img: BackendProductImageRecord) => Boolean(img.id && img.image_url));
}

export async function uploadAdminProductImages(
  productId: number | string,
  images: File[],
  options?: { idempotencyKey?: string }
): Promise<BackendProductImageRecord[]> {
  if (!images.length) return [];

  const totalBytes = images.reduce((sum, f) => sum + f.size, 0);
  if (images.some((file) => !ALLOWED_PRODUCT_IMAGE_TYPES.includes(file.type))) {
    throw new Error('Product images must be JPG, PNG or WebP.');
  }
  if (images.some((file) => file.size > MAX_PRODUCT_IMAGE_BYTES)) {
    throw new Error('Each product image must be no more than 5 MiB.');
  }
  if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
    throw new Error('Product images must be no more than 10 MiB per request.');
  }

  const baseKey =
    options?.idempotencyKey || generateIdempotencyKey(`img-upload-${productId}`);

  const allUploaded: BackendProductImageRecord[] = [];

  // Upload images one-by-one to prevent reverse-proxy (Nginx) 413 body size rejections
  for (let i = 0; i < images.length; i++) {
    const file = images[i];
    const formData = new FormData();
    formData.append(PRODUCT_IMAGE_FIELD_NAME, file);

    const perFileKey =
      images.length === 1 ? baseKey : `${baseKey}-${i}`.slice(0, 128);

    const res = await apiFetch<any>(`${ADMIN_PRODUCTS_ENDPOINT}/${productId}/images`, {
      method: 'POST',
      headers: {
        'Idempotency-Key': perFileKey,
      },
      body: formData,
    });

    const data = res?.data ?? res;
    if (Array.isArray(data)) {
      allUploaded.push(...data);
    } else if (data && typeof data === 'object' && (data.id || data.image_url)) {
      allUploaded.push(data);
    }
  }

  return allUploaded;
}

export async function replaceAdminProductImage(
  productId: number | string,
  imageId: number | string,
  file: File,
  options?: { idempotencyKey?: string }
): Promise<BackendProductImageRecord> {
  const validationError = validateProductImages([file], 0, 0, 'replace');
  if (validationError) throw new Error(validationError);

  const formData = new FormData();
  formData.append(PRODUCT_IMAGE_FIELD_NAME, file);

  const idempotencyKey =
    options?.idempotencyKey || generateIdempotencyKey(`img-replace-${productId}-${imageId}`);

  const res = await apiFetch<any>(
    `${ADMIN_PRODUCTS_ENDPOINT}/${productId}/images/${imageId}`,
    {
      method: 'PUT',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: formData,
    }
  );
  const record = res?.data ?? res;
  return {
    ...record,
    id: String(record?.id ?? imageId),
    product_id: String(record?.product_id ?? productId),
    image_url: record?.image_url || record?.url || record?.imageUrl || '',
  };
}

export async function setPrimaryProductImage(
  productId: number | string,
  imageId: number | string
): Promise<BackendProductImageRecord> {
  const res = await apiFetch<any>(
    `${ADMIN_PRODUCTS_ENDPOINT}/${productId}/images/${imageId}/primary`,
    {
      method: 'PATCH',
      body: JSON.stringify({}),
    }
  );
  const record = res?.data ?? res;
  return {
    ...record,
    id: String(record?.id ?? imageId),
    product_id: String(record?.product_id ?? productId),
    image_url: record?.image_url || record?.url || record?.imageUrl || '',
  };
}

export async function deleteAdminProductImage(
  productId: number | string,
  imageId: number | string
): Promise<void> {
  await apiFetch(`${ADMIN_PRODUCTS_ENDPOINT}/${productId}/images/${imageId}`, {
    method: 'DELETE',
    body: JSON.stringify({}),
  });
}

/* ========================================================================== */
/* DEPRECATED VARIANT STUBS (No product_variants table in native catalog)     */
/* ========================================================================== */

export async function getAdminProductVariants(
  _productId: number | string,
  _params?: { limit?: number; offset?: number }
): Promise<BackendProductVariant[]> {
  return [];
}

export async function getAllAdminProductVariants(
  _productId: number | string
): Promise<BackendProductVariant[]> {
  return [];
}

export async function removeAllAdminProductVariants(
  _productId: number | string
): Promise<void> {
  // No-op in native schema
}

export async function getAdminProductVariantById(
  productId: number | string,
  variantId: number | string
): Promise<BackendProductVariant> {
  return {
    id: variantId,
    product_id: productId,
    sku: '',
    attributes: {},
    stock_quantity: 0,
    is_active: true,
  };
}

export async function createAdminProductVariant(
  productId: number | string,
  payload: CreateProductVariantPayload
): Promise<BackendProductVariant> {
  return {
    id: Date.now(),
    product_id: productId,
    sku: payload.sku,
    attributes: payload.attributes,
    stock_quantity: payload.stock_quantity ?? 0,
    is_active: payload.is_active ?? true,
  };
}

export async function updateAdminProductVariant(
  productId: number | string,
  variantId: number | string,
  payload: UpdateProductVariantPayload
): Promise<BackendProductVariant> {
  return {
    id: variantId,
    product_id: productId,
    sku: payload.sku ?? '',
    attributes: payload.attributes ?? {},
    stock_quantity: payload.stock_quantity ?? 0,
    is_active: payload.is_active ?? true,
  };
}

export async function deleteAdminProductVariant(
  _productId: number | string,
  _variantId: number | string
): Promise<void> {
  // No-op in native schema
}
