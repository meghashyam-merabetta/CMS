const RAW_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://16.4.61.3:3000'
).trim().replace(/\/+$/, '');

// Ensure no duplicate /api segment if user includes /api in NEXT_PUBLIC_API_URL
const BASE_URL = RAW_BASE_URL.replace(/\/api$/, '');

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, ...rest } = options;

  // In the browser, use same-origin relative path (/api/...) proxied via next.config.ts rewrites
  // so SameSite=Lax HttpOnly cookies (admin_auth) work seamlessly with remote IP backends.
  const baseUrl = typeof window !== 'undefined' ? '' : BASE_URL;

  let url =
    endpoint.startsWith('http://') || endpoint.startsWith('https://')
      ? endpoint
      : `${baseUrl}${endpoint}`;
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

  const method = (rest.method || 'GET').toUpperCase();
  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData;

  // Send {} for actions without fields (except FormData)
  if (
    !isFormData &&
    (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') &&
    rest.body === undefined
  ) {
    rest.body = JSON.stringify({});
  }

  // Do not set Content-Type manually for FormData; let browser set multipart boundary
  const requestHeaders: Record<string, string> = isFormData
    ? { ...((headers as Record<string, string>) || {}) }
    : {
        'Content-Type': 'application/json',
        ...((headers as Record<string, string>) || {}),
      };

  const res = await fetch(url, {
    ...rest,
    credentials: 'include',
    headers: requestHeaders,
  });

  if (!res.ok) {
    let errorMessage = 'Request failed';
    try {
      const errorData = await res.json();
      errorMessage = errorData?.error || errorData?.message || errorMessage;
    } catch {
      // fallback to default message if response has no JSON
    }
    throw new Error(errorMessage);
  }

  // Successful DELETE and logout responses are 204 with no JSON body
  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

export * from '@/services/api/adminAuthApi';
export * from '@/services/api/adminManagementApi';
export * from '@/services/api/adminProductsApi';
export * from '@/services/api/adminCategoriesApi';
export * from '@/services/api/adminBrandsApi';
export * from '@/services/api/adminVariantAttributesApi';
export * from '@/services/api/adminUsersApi';
