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

export interface BackendProductImage {
  id?: number | string;
  product_id?: number | string;
  url?: string;
  image_url?: string;
  imageUrl?: string;
  alt_text?: string | null;
  sort_order?: number;
  is_primary?: boolean;
  key?: string;
  image_name?: string;
}

export interface BackendProduct {
  id?: number | string;
  product_id?: number | string;
  brand_id?: number | string | null;
  name?: string;
  product_name?: string;
  slug?: string;
  description?: string | null;
  short_description?: string | null;
  product_status?: ProductStatus;
  categories?: BackendCategory[];
  category_ids?: number[];
  primary_category_id?: number | null;
  category_id?: number | null;
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

export interface CreateProductPayload {
  product_name: string;
  slug?: string;
  brand_id?: number | null;
  short_description?: string | null;
  description?: string | null;
  product_status?: ProductStatus;
  category_ids?: number[];
  primary_category_id?: number | null;
  category_id?: number | null;
  prescription_required?: boolean;
  age_group?: string | null;
  images?: File[];
}

export interface UpdateProductPayload {
  product_name?: string;
  slug?: string;
  brand_id?: number | null;
  short_description?: string | null;
  description?: string | null;
  product_status?: ProductStatus;
  category_ids?: number[];
  primary_category_id?: number | null;
  category_id?: number | null;
  prescription_required?: boolean;
  age_group?: string | null;
  images?: File[];
}

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

