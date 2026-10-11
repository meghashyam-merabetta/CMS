import {
  BackendAdmin,
  BackendProduct,
  BackendUser,
  CreateAdminPayload,
  UpdateAdminPayload,
  ApiResponse,
} from '@/types/api';

// Empty by default so requests go through the Next.js same-origin proxy (/api/*).
const BASE_URL =
  typeof window !== 'undefined' && process.env.NEXT_PUBLIC_DIRECT_API !== 'true'
    ? ''
    : (process.env.NEXT_PUBLIC_API_URL || '');

// Retrieve admin_auth token from cookies, storage, or environment
export function getAdminAuth(): string | null {
  if (typeof window !== 'undefined') {
    // 1. Check localStorage
    const local = localStorage.getItem('admin_auth') || localStorage.getItem('token');
    if (local) return local;

    // 2. Check sessionStorage
    const session = sessionStorage.getItem('admin_auth') || sessionStorage.getItem('token');
    if (session) return session;

    // 3. Check document.cookie for admin_auth
    const match = document.cookie.match(/(?:^|;\s*)admin_auth=([^;]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  // 4. Fallback to environment variable if configured
  if (process.env.NEXT_PUBLIC_ADMIN_AUTH) {
    return process.env.NEXT_PUBLIC_ADMIN_AUTH;
  }

  return null;
}

export function setAdminAuth(token: string) {
  if (typeof window !== 'undefined' && token) {
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    localStorage.setItem('admin_auth', cleanToken);
    sessionStorage.setItem('admin_auth', cleanToken);
    try {
      document.cookie = `admin_auth=${encodeURIComponent(cleanToken)}; path=/; max-age=2592000; SameSite=Lax`;
    } catch {
      // Cookies might be restricted in some environments
    }
  }
}

export function clearAdminAuth() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin_auth');
    localStorage.removeItem('token');
    sessionStorage.removeItem('admin_auth');
    sessionStorage.removeItem('token');
    try {
      document.cookie = 'admin_auth=; path=/; max-age=0; SameSite=Lax';
    } catch {
      // Ignore
    }
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, ...rest } = options;

  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const query = searchParams.toString();
    if (query) {
      url += `?${query}`;
    }
  }

  // Inject admin_auth as Authorization and admin_auth headers for all APIs
  const authHeaders: Record<string, string> = {};
  const adminAuth = getAdminAuth();
  if (adminAuth) {
    const clean = adminAuth.replace(/^Bearer\s+/i, '').trim();
    authHeaders['Authorization'] = `Bearer ${clean}`;
    authHeaders['admin_auth'] = clean;
  }

  const res = await fetch(url, {
    ...rest,
    credentials: 'include', // Cookie-based authentication for HTTP-only cookies
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...headers,
    },
  });

  if (!res.ok) {
    let errorMessage = `Request failed with status ${res.status}`;
    try {
      const errorData = await res.json();
      if (errorData.error) {
        errorMessage = errorData.error;
        if (errorData.details && Array.isArray(errorData.details)) {
          const detailMsgs = errorData.details
            .map((d: { path: string; message: string }) => `${d.path}: ${d.message}`)
            .join(', ');
          errorMessage += ` (${detailMsgs})`;
        }
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // Non-JSON response
    }
    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

// ==========================================
// Admin Management APIs
// ==========================================

export async function getAdmins(): Promise<BackendAdmin[]> {
  const res = await apiFetch<ApiResponse<BackendAdmin[]>>('/api/admin/management');
  return res.data || [];
}

export async function getAdminById(id: string): Promise<BackendAdmin> {
  const res = await apiFetch<ApiResponse<BackendAdmin>>(`/api/admin/management/${id}`);
  return res.data;
}

export async function createAdmin(payload: CreateAdminPayload): Promise<BackendAdmin> {
  const res = await apiFetch<ApiResponse<BackendAdmin>>('/api/admin/management', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateAdmin(
  id: string,
  payload: UpdateAdminPayload
): Promise<BackendAdmin> {
  const res = await apiFetch<ApiResponse<BackendAdmin>>(`/api/admin/management/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteAdmin(id: string): Promise<void> {
  await apiFetch(`/api/admin/management/${id}`, {
    method: 'DELETE',
  });
}

export async function updateAdminStatus(
  id: string,
  active: boolean
): Promise<BackendAdmin> {
  const res = await apiFetch<ApiResponse<BackendAdmin>>(
    `/api/admin/management/${id}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    }
  );
  return res.data;
}

// ==========================================
// Admin Auth APIs
// ==========================================

export async function loginAdmin(email: string, password: string) {
  const res = await apiFetch<any>('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  // Extract admin_auth token from login response if returned by backend
  const token =
    res?.token ||
    res?.admin_auth ||
    res?.accessToken ||
    res?.data?.token ||
    res?.data?.admin_auth;

  if (token) {
    setAdminAuth(token);
  }

  return res;
}

export async function getMe(): Promise<{ user: { id: string; name: string; email: string } }> {
  return apiFetch<{ user: { id: string; name: string; email: string } }>('/api/admin/auth/me');
}

export async function logoutAdmin() {
  try {
    await apiFetch<void>('/api/admin/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  } finally {
    clearAdminAuth();
  }
}

// ==========================================
// Products & Users APIs
// ==========================================

export async function getAdminProducts(): Promise<BackendProduct[]> {
  const res = await apiFetch<ApiResponse<BackendProduct[]>>('/api/admin/products');
  return res.data || [];
}

export async function getAdminUsers(): Promise<BackendUser[]> {
  const res = await apiFetch<ApiResponse<BackendUser[]>>('/api/admin/users');
  return res.data || [];
}
