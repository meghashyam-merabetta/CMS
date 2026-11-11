import { apiFetch } from '@/lib/api';

export type CouponScope = 'labs' | 'products' | 'both';
export interface AdminCoupon {
  code: string; scope: CouponScope; percent: number | string; max_discount_paise: number;
  active: boolean; starts_at: string; ends_at: string | null;
  created_at?: string; updated_at?: string;
}
export type CouponWritePayload = Pick<AdminCoupon, 'code' | 'scope' | 'percent' | 'max_discount_paise' | 'active' | 'starts_at' | 'ends_at'>;
interface ListResponse<T> { data: T[]; pagination: { total: number; limit: number; offset: number; hasMore: boolean } }
interface ItemResponse<T> { data: T }
const ENDPOINT = '/api/admin/coupons';

export const getAdminCoupons = (params: Record<string, string | number | boolean | undefined>) =>
  apiFetch<ListResponse<AdminCoupon>>(ENDPOINT, { params });
export const createAdminCoupon = async (payload: CouponWritePayload) =>
  (await apiFetch<ItemResponse<AdminCoupon>>(ENDPOINT, { method: 'POST', body: JSON.stringify(payload) })).data;
export const updateAdminCoupon = async (code: string, payload: Omit<Partial<CouponWritePayload>, 'code'>) =>
  (await apiFetch<ItemResponse<AdminCoupon>>(`${ENDPOINT}/${encodeURIComponent(code)}`, { method: 'PATCH', body: JSON.stringify(payload) })).data;
export const deleteAdminCoupon = (code: string) =>
  apiFetch(`${ENDPOINT}/${encodeURIComponent(code)}`, { method: 'DELETE' });
