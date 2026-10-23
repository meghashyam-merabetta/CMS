const RAW_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://16.4.61.3:3000'
).trim().replace(/\/+$/, '');

// Ensure no duplicate /api segment if user includes /api in NEXT_PUBLIC_API_URL
const BASE_URL = RAW_BASE_URL.replace(/\/api$/, '');

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

  let url =
    endpoint.startsWith('http://') || endpoint.startsWith('https://')
      ? endpoint
      : `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const query = searchParams.toString();
    if (query) {
      url += (url.includes('?') ? '&' : '?') + query;
    }
  }

  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData;
  const requestHeaders: Record<string, string> = isFormData
    ? { ...((headers as Record<string, string>) || {}) }
    : {
        'Content-Type': 'application/json',
        ...((headers as Record<string, string>) || {}),
      };

  const token = getAdminAuth();
  if (token) {
    if (!requestHeaders['Authorization'] && !requestHeaders['authorization']) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
    if (!requestHeaders['admin_auth']) {
      requestHeaders['admin_auth'] = token;
    }
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      credentials: 'include',
      headers: requestHeaders,
    });
  } catch (err: any) {
    throw new Error(err?.message || 'Failed to connect to backend server');
  }

  if (!res.ok) {
    let errorMessage = `Server error ${res.status}: ${res.statusText || 'Request failed'}`.trim();
    try {
      const errorData = await res.json();
      if (typeof errorData === 'string') {
        errorMessage = errorData;
      } else if (errorData.error) {
        errorMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
        if (errorData.details && Array.isArray(errorData.details)) {
          const detailMsgs = errorData.details
            .map((d: any) => (d.message ? `${d.path ? d.path + ': ' : ''}${d.message}` : JSON.stringify(d)))
            .join(', ');
          errorMessage += ` (${detailMsgs})`;
        }
      } else if (errorData.message) {
        errorMessage = typeof errorData.message === 'string' ? errorData.message : JSON.stringify(errorData.message);
      } else if (errorData.msg) {
        errorMessage = String(errorData.msg);
      }
    } catch {
      try {
        const text = await res.text();
        if (text && text.length < 300) {
          errorMessage = text;
        }
      } catch {
        // ignore
      }
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
