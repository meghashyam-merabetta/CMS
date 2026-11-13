import { apiFetch } from '@/lib/api';

export interface AdminLab {
  id: string;
  name: string;
  description: string;
  rating: number;
  image: string;
  color: string;
  bg: string;
  active: boolean;
  city: string;
  homeCollection: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type AdminLabEditableFields = Omit<AdminLab, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateAdminLabPayload = AdminLabEditableFields & { id: string };
export type UpdateAdminLabPayload = Partial<AdminLabEditableFields>;

export interface AdminLabListParams {
  limit?: number;
  offset?: number;
  search?: string;
  city?: string;
  active?: boolean;
  homeCollection?: boolean;
  sort_by?: 'id' | 'name' | 'city' | 'rating' | 'createdAt' | 'updatedAt';
  sort_order?: 'asc' | 'desc';
}

export interface AdminLabListResponse {
  data: AdminLab[];
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
}

interface DataResponse<T> { data: T }
export const ADMIN_LABS_ENDPOINT = '/api/admin/labs';

export async function getAdminLabs(params: AdminLabListParams = {}): Promise<AdminLabListResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = { ...params };
  const response = await apiFetch<AdminLabListResponse>(ADMIN_LABS_ENDPOINT, { params: queryParams });
  if (!Array.isArray(response?.data)) throw new Error('Unable to read labs from the server.');
  return response;
}

export async function createAdminLab(payload: CreateAdminLabPayload): Promise<AdminLab> {
  const response = await apiFetch<DataResponse<AdminLab>>(ADMIN_LABS_ENDPOINT, { method: 'POST', body: JSON.stringify(payload) });
  return response.data;
}

export async function updateAdminLab(labId: string, payload: UpdateAdminLabPayload): Promise<AdminLab> {
  const response = await apiFetch<DataResponse<AdminLab>>(`${ADMIN_LABS_ENDPOINT}/${encodeURIComponent(labId)}`, { method: 'PATCH', body: JSON.stringify(payload) });
  return response.data;
}

export async function deleteAdminLab(labId: string): Promise<void> {
  await apiFetch(`${ADMIN_LABS_ENDPOINT}/${encodeURIComponent(labId)}`, { method: 'DELETE' });
}

export async function uploadAdminLabImage(labId: string, file: File): Promise<Pick<AdminLab, 'id' | 'image'>> {
  const body = new FormData();
  body.append('uploadimage', file);
  const response = await apiFetch<DataResponse<Pick<AdminLab, 'id' | 'image'>>>(
    `${ADMIN_LABS_ENDPOINT}/${encodeURIComponent(labId)}/image`,
    { method: 'POST', body }
  );
  return response.data;
}
