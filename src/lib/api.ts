const BASE_URL =
  typeof window !== 'undefined' && process.env.NEXT_PUBLIC_DIRECT_API !== 'true'
    ? ''
    : (process.env.NEXT_PUBLIC_API_URL || '');

const STORAGE_AUTH_KEY = 'admin_auth';
const STORAGE_TOKEN_KEY = 'token';


export function getAdminAuth(): string | null {
  if (typeof window !== 'undefined') {
    return (
      localStorage.getItem(STORAGE_AUTH_KEY) ||
      localStorage.getItem(STORAGE_TOKEN_KEY) ||
      sessionStorage.getItem(STORAGE_AUTH_KEY) ||
      sessionStorage.getItem(STORAGE_TOKEN_KEY) ||
      null
    );
  }
  return null;
}

export function setAdminAuth(token: string) {
  if (typeof window !== 'undefined' && token) {
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    localStorage.setItem(STORAGE_AUTH_KEY, cleanToken);
    sessionStorage.setItem(STORAGE_AUTH_KEY, cleanToken);
  }
}

export function clearAdminAuth() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_AUTH_KEY);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    sessionStorage.removeItem(STORAGE_AUTH_KEY);
    sessionStorage.removeItem(STORAGE_TOKEN_KEY);
  }
}

export interface RequestOptions extends RequestInit {
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
      if (value !== undefined && value !== null) {
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
    credentials: 'include',
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

export * from '@/services/api/adminAuthApi';
export * from '@/services/api/adminManagementApi';
export * from '@/services/api/adminProductsApi';
export * from '@/services/api/adminCategoriesApi';
export * from '@/services/api/adminUsersApi';
