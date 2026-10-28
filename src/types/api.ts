import type { AdditionalProductDetails } from '@/lib/productDetails';

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
export type ProductType = 'simple' | 'variable';
export type WeightUnit = 'g' | 'kg';
export type DimensionUnit = 'cm' | 'mm' | 'in';

export interface BackendProductImage {
  id?: number | string;
  product_id?: number | string;
  url?: string;
  image_url?: string;
  imageUrl?: string;
  s3_key?: string;
  alt_text?: string | null;
  sort_order?: number;
  is_primary?: boolean;
  key?: string;
  image_name?: string;
}

export interface BackendProductVariant {
  id: number | string;
  product_id: number | string;
  sku: string;
  variant_name?: string | null;
  display_name?: string;
  attributes: Record<string, string>;
  barcode?: string | null;
  weight_grams?: number | null;
  regular_price?: number | string | null;
  sale_price?: number | string | null;
  effective_price?: number | string | null;
  stock_quantity: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProductVariantPayload {
  sku: string;
  attributes: Record<string, string>;
  variant_name?: string | null;
  barcode?: string | null;
  weight_grams?: number | null;
  regular_price?: number | null;
  sale_price?: number | null;
  stock_quantity?: number;
  is_active?: boolean;
}

export type UpdateProductVariantPayload = Partial<CreateProductVariantPayload>;

export interface ProductSpecificationsFields extends AdditionalProductDetails {
  target_audience?: string | null;
  hsn_code?: string | null;
  gst_rate?: number | null;
  weight?: number | null;
  weight_unit?: WeightUnit;
  unit_count?: number | null;
  package_length?: number | null;
  package_breadth?: number | null;
  package_height?: number | null;
  dimension_unit?: DimensionUnit;
  material?: string | null;
  colour?: string | null;
  package_type?: string | null;
  shelf_life?: string | null;
  water_resistant?: boolean | null;
  hazardous_clause?: string | null;
  manufactured_in?: string | null;
  company_name?: string | null;
  company_address?: string | null;
  packer_name?: string | null;
  packer_address?: string | null;
  keywords?: string[];
}

export interface BackendProduct extends ProductSpecificationsFields {
  id?: number | string;
  product_id?: number | string;
  brand_id?: number | string | null;
  brand?: BackendBrand | null;
  name?: string;
  product_name?: string;
  slug?: string;
  description?: string | null;
  short_description?: string | null;
  product_status?: ProductStatus;
  product_type?: ProductType;
  product_code?: string | null;
  sku?: string | null;
  regular_price?: number | string | null;
  sale_price?: number | string | null;
  mrp?: number | string | null;
  offer_price?: number | string | null;
  offer_percent?: number | string | null;
  special_discount_enabled?: boolean;
  special_discount_percent?: number | string;
  festival_offer_enabled?: boolean;
  festival_offer_percent?: number | string;
  effective_price?: number | string | null;
  stock_quantity?: number;
  min_order_quantity?: number;
  max_order_quantity?: number | null;
  categories?: BackendCategory[];
  category_ids?: number[];
  primary_category_id?: number | null;
  category_id?: number | null;
  variants?: BackendProductVariant[];
  prescription_required?: boolean;
  age_group?: string | null;
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
  category_id?: number;
  category_name: string;
  name?: string;
  slug?: string;
  category_image?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  category_image_url?: string | null;
  parent_category_id?: number | null;
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

export interface CreateProductPayload extends ProductSpecificationsFields {
  product_name: string;
  slug?: string;
  brand_id?: number | null;
  short_description?: string | null;
  description?: string | null;
  product_status?: ProductStatus;
  product_type?: ProductType;
  product_code?: string | null;
  sku?: string | null;
  regular_price?: number | null;
  sale_price?: number | null;
  offer_percent?: number | null;
  special_discount_enabled?: boolean;
  special_discount_percent?: number;
  festival_offer_enabled?: boolean;
  festival_offer_percent?: number;
  stock_quantity?: number;
  min_order_quantity?: number;
  max_order_quantity?: number | null;
  category_ids?: number[];
  primary_category_id?: number | null;
  category_id?: number | null;
  age_group?: string | null;
  prescription_required?: boolean | null;
  images?: File[];
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

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

export interface BackendBrand {
  brand_id: number | string;
  id?: number | string;
  brand_name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBrandPayload {
  brand_name: string;
  slug?: string;
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
}

export interface UpdateBrandPayload {
  brand_name?: string;
  slug?: string;
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
}

export interface AdminBrandsResponse {
  data: BackendBrand[];
  pagination?: PaginationMeta;
}

export interface BackendVariantAttribute {
  id: number | string;
  name: string;
  values: string[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateVariantAttributePayload {
  name: string;
  values: string[];
}

export interface UpdateVariantAttributePayload {
  name?: string;
  values?: string[];
}

export interface AdminVariantAttributesResponse {
  data: BackendVariantAttribute[];
  pagination?: PaginationMeta;
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

/* ------------------------------------------------------------------ */
/* Admin Ordering Types                                               */
/* ------------------------------------------------------------------ */

export interface OrderingItem {
  id: string;
  name: string;
  patientName: string | null;
  quantity: number;
  unitMrp: number;
  unitPrice: number;
  lineMrp: number;
  linePrice: number;
  offerDiscount: number;
}

export interface OrderingRecord {
  id: string;
  customerId: string;
  bookingNumber: string | null;
  createdAt: string;
  updatedAt: string;
  status: string;
  paymentStatus: string | null;
  paymentMethod: 'online' | 'cod' | string | null;
  total: number;
  customerName: string | null;
  email: string | null;
  phone: string | null;
  couponCode: string | null;
  labId: string | null;
  integrationStatus: string | null;
  providerBookingId: string | null;
  items: OrderingItem[];
  itemNames: string;
  itemCount: number;
  totalQuantity: number | null;
  totalMrp: number | null;
  offerDiscount: number;
  subtotal: number;
  couponPercent: number | null;
  couponMaxDiscount: number | null;
  couponDiscount: number;
  priceAfterCoupon: number;
  collectionCharges: number;
  deliveryCharges: number;
  charges: number | null;
  finalAmount: number;
}

export interface OrderingPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
}

export interface AdminOrderingListResponse {
  data: OrderingRecord[];
  pagination: OrderingPagination;
}

export interface AdminOrderingDetailRecord extends OrderingRecord {
  details?: {
    id?: string;
    kind?: 'products' | 'labs' | string;
    date?: string;
    status?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    total?: number;
    subtotal?: number;
    discount?: number;
    delivery?: number;
    couponCode?: string | null;
    coupon?: Record<string, any>;
    items?: any[];
    address?: string;
    addressSnapshot?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
    };
    deliveryNotes?: string;
    orderedBy?: {
      name?: string;
      email?: string;
      phone?: string;
    };
    recipient?: {
      name?: string;
      email?: string;
      phone?: string;
    };
    additionalMembers?: any[];
    collectionDate?: string;
    slot?: string;
    reports?: any[];
    [key: string]: any;
  };
}

export interface AdminOrderingDetailResponse {
  data: AdminOrderingDetailRecord;
}

export interface ProductOrderListParams {
  orderId?: string;
  from?: string;
  to?: string;
  status?: string;
  paymentMethod?: 'online' | 'cod' | string;
  page?: number;
  limit?: number;
}

export interface LabBookingListParams {
  bookingId?: string;
  from?: string;
  to?: string;
  status?: string;
  labId?: string;
  page?: number;
  limit?: number;
}

