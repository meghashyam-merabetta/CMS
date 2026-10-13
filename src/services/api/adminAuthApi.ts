import { apiFetch, clearAdminAuth, setAdminAuth } from '@/lib/api';
import { BackendAdminUser } from '@/types/api';

export interface LoginResponse {
  user: BackendAdminUser;
}


export async function loginAdmin(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await apiFetch<LoginResponse>('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password: password.trim() }),
  });

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
