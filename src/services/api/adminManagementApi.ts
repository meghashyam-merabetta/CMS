import { apiFetch } from '@/lib/api';
import {
  BackendAdmin,
  CreateAdminPayload,
  UpdateAdminPayload,
  ChangeAdminPasswordPayload,
  ApiResponse,
} from '@/types/api';



export const ADMIN_MANAGEMENT_ENDPOINT = '/api/admin/management/';

export async function getAdmins(limit: number = 50): Promise<BackendAdmin[]> {
  const res = await apiFetch<any>(ADMIN_MANAGEMENT_ENDPOINT, {
    params: { limit },
  });
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res)) return res;
  return [];
}


export async function getAdminById(id: string): Promise<BackendAdmin> {
  const res = await apiFetch<any>(`/api/admin/management/${id}`);
  return res?.data ?? res;
}


export async function createAdmin(payload: CreateAdminPayload): Promise<BackendAdmin> {
  const body: Record<string, any> = {
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    city: payload.city.trim(),
    pincode: payload.pincode.trim(),
    state: payload.state.trim(),
    adminApproval: payload.adminApproval || { requireSuperAdminApproval: false },
    permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
  };

  const res = await apiFetch<any>(ADMIN_MANAGEMENT_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res?.data ?? res;
}


export async function updateAdmin(
  id: string,
  payload: UpdateAdminPayload
): Promise<BackendAdmin> {
  const cleanBody: Record<string, any> = {};

  if (payload.name !== undefined) cleanBody.name = payload.name.trim();
  if (payload.email !== undefined) cleanBody.email = payload.email.trim().toLowerCase();
  if (payload.city !== undefined && payload.city !== null) cleanBody.city = payload.city.trim();
  if (payload.pincode !== undefined && payload.pincode !== null) cleanBody.pincode = payload.pincode.trim();
  if (payload.state !== undefined && payload.state !== null) cleanBody.state = payload.state.trim();
  if (payload.adminApproval !== undefined) cleanBody.adminApproval = payload.adminApproval;
  if (payload.permissions !== undefined) cleanBody.permissions = payload.permissions;

  const res = await apiFetch<any>(`/api/admin/management/${id}`, {
    method: 'PUT',
    body: JSON.stringify(cleanBody),
  });

  return res?.data ?? res;
}


export async function deleteAdmin(id: string): Promise<void> {
  await apiFetch(`/api/admin/management/${id}`, {
    method: 'DELETE',
  });
}


export async function changeAdminPassword(
  id: string,
  payload: ChangeAdminPasswordPayload
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/admin/management/${id}/password`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}


export async function updateAdminStatus(
  id: string,
  active: boolean
): Promise<void> {
  if (!active) {
    await deleteAdmin(id);
  }
}
