import { apiFetch } from '@/lib/api';
import { BackendAdminUser } from '@/types/api';

export interface LoginResponse {
  user: BackendAdminUser;
}

const LOGIN_ENDPOINT = '/api/admin/auth/login';

export async function loginAdmin(
  email: string,
  password: string
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>(LOGIN_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password: password.trim() }),
  });
}

export async function getMe(): Promise<{ user: BackendAdminUser }> {
  return apiFetch<{ user: BackendAdminUser }>('/api/admin/auth/me');
}

export async function logoutAdmin(): Promise<void> {
  await apiFetch<void>('/api/admin/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function logoutAllAdmin(): Promise<void> {
  await apiFetch<void>('/api/admin/auth/logout-all', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
