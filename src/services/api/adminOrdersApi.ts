import { apiFetch } from '@/lib/api';
import {
  AdminOrderingListResponse,
  AdminOrderingDetailRecord,
  AdminOrderingDetailResponse,
  ProductOrderListParams,
  LabBookingListParams,
} from '@/types/api';

export const ADMIN_ORDERING_PRODUCTS_ENDPOINT = '/api/admin/ordering/products';
export const ADMIN_ORDERING_LABS_ENDPOINT = '/api/admin/ordering/labs';

/**
 * Triggers a browser file download from a Blob object.
 */
function triggerBlobDownload(blob: Blob, fallbackFilename: string) {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fallbackFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}


export async function getAdminProductOrders(
  params?: ProductOrderListParams
): Promise<AdminOrderingListResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {};
  if (params?.orderId && params.orderId.trim()) queryParams.orderId = params.orderId.trim();
  if (params?.from && params.from.trim()) queryParams.from = params.from.trim();
  if (params?.to && params.to.trim()) queryParams.to = params.to.trim();
  if (params?.status && params.status.trim()) queryParams.status = params.status.trim();
  if (params?.paymentMethod && params.paymentMethod.trim()) {
    queryParams.paymentMethod = params.paymentMethod.trim();
  }
  if (params?.page !== undefined) queryParams.page = params.page;
  if (params?.limit !== undefined) queryParams.limit = params.limit;

  const res = await apiFetch<AdminOrderingListResponse>(ADMIN_ORDERING_PRODUCTS_ENDPOINT, {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
  });

  return {
    data: Array.isArray(res?.data) ? res.data : [],
    pagination: res?.pagination || {
      page: params?.page || 1,
      limit: params?.limit || 20,
      total: Array.isArray(res?.data) ? res.data.length : 0,
      totalPages: 1,
      hasNext: false,
    },
  };
}


export async function getAdminLabBookings(
  params?: LabBookingListParams
): Promise<AdminOrderingListResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {};
  if (params?.bookingId && params.bookingId.trim()) queryParams.bookingId = params.bookingId.trim();
  if (params?.from && params.from.trim()) queryParams.from = params.from.trim();
  if (params?.to && params.to.trim()) queryParams.to = params.to.trim();
  if (params?.status && params.status.trim()) queryParams.status = params.status.trim();
  if (params?.labId && params.labId.trim()) queryParams.labId = params.labId.trim();
  if (params?.page !== undefined) queryParams.page = params.page;
  if (params?.limit !== undefined) queryParams.limit = params.limit;

  const res = await apiFetch<AdminOrderingListResponse>(ADMIN_ORDERING_LABS_ENDPOINT, {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
  });

  return {
    data: Array.isArray(res?.data) ? res.data : [],
    pagination: res?.pagination || {
      page: params?.page || 1,
      limit: params?.limit || 20,
      total: Array.isArray(res?.data) ? res.data.length : 0,
      totalPages: 1,
      hasNext: false,
    },
  };
}


export async function getAdminProductOrderById(
  orderId: string
): Promise<AdminOrderingDetailRecord> {
  const cleanId = encodeURIComponent(orderId.trim());
  const res = await apiFetch<AdminOrderingDetailResponse>(
    `${ADMIN_ORDERING_PRODUCTS_ENDPOINT}/${cleanId}`
  );
  return res?.data ?? (res as unknown as AdminOrderingDetailRecord);
}


export async function getAdminLabBookingById(
  bookingId: string
): Promise<AdminOrderingDetailRecord> {
  const cleanId = encodeURIComponent(bookingId.trim());
  const res = await apiFetch<AdminOrderingDetailResponse>(
    `${ADMIN_ORDERING_LABS_ENDPOINT}/${cleanId}`
  );
  return res?.data ?? (res as unknown as AdminOrderingDetailRecord);
}


export async function exportAdminProductOrders(
  params?: Omit<ProductOrderListParams, 'page' | 'limit'>
): Promise<void> {
  const queryParams: Record<string, string | number | boolean | undefined> = {};
  if (params?.orderId && params.orderId.trim()) queryParams.orderId = params.orderId.trim();
  if (params?.from && params.from.trim()) queryParams.from = params.from.trim();
  if (params?.to && params.to.trim()) queryParams.to = params.to.trim();
  if (params?.status && params.status.trim()) queryParams.status = params.status.trim();
  if (params?.paymentMethod && params.paymentMethod.trim()) {
    queryParams.paymentMethod = params.paymentMethod.trim();
  }

  const blob = await apiFetch<Blob>(`${ADMIN_ORDERING_PRODUCTS_ENDPOINT}/export`, {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    responseType: 'blob',
    timeoutMs: 30000,
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  triggerBlobDownload(blob, `product-orders-${timestamp}.csv`);
}

/**
 * 6. Export Lab Bookings as CSV from GET /api/admin/ordering/labs/export
 */
export async function exportAdminLabBookings(
  params?: Omit<LabBookingListParams, 'page' | 'limit'>
): Promise<void> {
  const queryParams: Record<string, string | number | boolean | undefined> = {};
  if (params?.bookingId && params.bookingId.trim()) queryParams.bookingId = params.bookingId.trim();
  if (params?.from && params.from.trim()) queryParams.from = params.from.trim();
  if (params?.to && params.to.trim()) queryParams.to = params.to.trim();
  if (params?.status && params.status.trim()) queryParams.status = params.status.trim();
  if (params?.labId && params.labId.trim()) queryParams.labId = params.labId.trim();

  const blob = await apiFetch<Blob>(`${ADMIN_ORDERING_LABS_ENDPOINT}/export`, {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    responseType: 'blob',
    timeoutMs: 30000,
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  triggerBlobDownload(blob, `lab-bookings-${timestamp}.csv`);
}
