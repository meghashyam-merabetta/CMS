import { apiFetch } from '@/lib/api';
import { BackendUser, ApiResponse } from '@/types/api';


export async function getAdminUsers(limit: number = 20): Promise<BackendUser[]> {
  const res = await apiFetch<ApiResponse<BackendUser[]>>('/api/admin/users', {
    params: { limit },
  });
  return res.data || [];
}
