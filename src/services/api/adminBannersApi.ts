import { apiFetch } from '@/lib/api';

export type BannerStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

export interface AdminBanner {
  banner_key: string;
  banner_id: number | string;
  page_name: string;
  banner_name: string;
  image_path: string;
  mobile_image_path?: string | null;
  width_px: number;
  height_px: number;
  is_active: boolean;
  banner_type?: string;
  banner_description?: string | null;
  cta_text?: string | null;
  link_url?: string | null;
  status: BannerStatus;
  display_order: number;
  is_published: boolean;
  publish_start_at?: string | null;
  publish_end_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type BannerWritePayload = Omit<AdminBanner, 'banner_id' | 'created_at' | 'updated_at'>;
export interface CreateBannerPayload {
  banner_key: string;
  page_name: string;
  banner_name: string;
  image_path: string;
  width_px: number;
  height_px: number;
  is_active: boolean;
  banner_type: 'WEBSITE';
  status: 'ACTIVE' | 'INACTIVE';
}
export type UpdateBannerPayload = Partial<Omit<CreateBannerPayload, 'banner_key' | 'image_path'>>;

export interface BannerListParams {
  limit?: number; offset?: number; status?: BannerStatus; is_published?: boolean;
  is_active?: boolean; page_name?: string; search?: string;
  sort_by?: 'banner_id' | 'display_order' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

interface ListResponse<T> { data: T[]; pagination: { total: number; limit: number; offset: number; hasMore: boolean } }
interface ItemResponse<T> { data: T }
const ENDPOINT = '/api/admin/banners';

export const getAdminBanners = (params: BannerListParams) =>
  apiFetch<ListResponse<AdminBanner>>(ENDPOINT, { params: { ...params } });
export const createAdminBanner = async (payload: CreateBannerPayload) =>
  (await apiFetch<ItemResponse<AdminBanner>>(ENDPOINT, { method: 'POST', body: JSON.stringify(payload) })).data;
export const updateAdminBanner = async (key: string, payload: UpdateBannerPayload) =>
  (await apiFetch<ItemResponse<AdminBanner>>(`${ENDPOINT}/${encodeURIComponent(key)}`, { method: 'PATCH', body: JSON.stringify(payload) })).data;
export const deleteAdminBanner = (key: string) =>
  apiFetch(`${ENDPOINT}/${encodeURIComponent(key)}`, { method: 'DELETE' });

export async function uploadBannerImage(key: string, file: File, mobile = false) {
  const body = new FormData();
  body.append('uploadimage', file);
  return (await apiFetch<ItemResponse<AdminBanner>>(
    `${ENDPOINT}/${encodeURIComponent(key)}/${mobile ? 'mobile-image' : 'image'}`,
    { method: 'PUT', body }
  )).data;
}

export const deleteBannerMobileImage = (key: string) =>
  apiFetch(`${ENDPOINT}/${encodeURIComponent(key)}/mobile-image`, { method: 'DELETE' });
