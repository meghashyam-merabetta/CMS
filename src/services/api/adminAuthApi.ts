import { apiFetch, clearAdminAuth, setAdminAuth } from '@/lib/api';
import { BackendAdminUser } from '@/types/api';

export interface LoginResponse {
  user: BackendAdminUser;
}


const LOGIN_ENDPOINT = '/api/admin/auth/login';

export async function loginAdmin(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await apiFetch<LoginResponse>(LOGIN_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password: password.trim() }),
  });

  const token =
    (res as any)?.token ||
    (res as any)?.accessToken ||
    (res as any)?.data?.token ||
    (res as any)?.admin_auth ||
    (res as any)?.data?.admin_auth;

  if (token) {
    setAdminAuth(token);
  }

  return res;
}


export async function getMe(): Promise<{ user: BackendAdminUser }> {
  return apiFetch<{ user: BackendAdminUser }>('/api/admin/auth/me');
}


export async function logoutAdmin(): Promise<void> {
  try {
    await apiFetch<void>('/api/admin/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  } finally {
    clearAdminAuth();
  }
}


export async function logoutAllAdmin(): Promise<void> {
  try {
    await apiFetch<void>('/api/admin/auth/logout-all', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  } finally {
    clearAdminAuth();
  }
}
