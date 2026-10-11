import {
  BackendAdmin,
  BackendProduct,
  BackendUser,
  CreateAdminPayload,
  UpdateAdminPayload,
  ApiResponse,
} from '@/types/api';

// Empty by default so requests go through the Next.js same-origin proxy (/api/*).
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

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

  const res = await fetch(url, {
    ...rest,
    credentials: 'include', // Cookie-based authentication for HTTP-only cookies
    headers: {
      'Content-Type': 'application/json',
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
  return apiFetch<ApiResponse<any>>('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(): Promise<{ user: { id: string; name: string; email: string } }> {
  return apiFetch<{ user: { id: string; name: string; email: string } }>('/api/admin/auth/me');
}

export async function logoutAdmin() {
  return apiFetch<void>('/api/admin/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  });
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
