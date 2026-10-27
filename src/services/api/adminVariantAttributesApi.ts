import { apiFetch } from '@/lib/api';
import {
  BackendVariantAttribute,
  CreateVariantAttributePayload,
  UpdateVariantAttributePayload,
  AdminVariantAttributesResponse,
  ApiResponse,
} from '@/types/api';

export interface VariantAttributeListParams {
  limit?: number;
  offset?: number;
}

export const ADMIN_VARIANT_ATTRIBUTES_ENDPOINT = '/api/admin/variant-attributes';

export async function getAdminVariantAttributes(
  params?: VariantAttributeListParams
): Promise<AdminVariantAttributesResponse> {
  const queryParams: Record<string, string | number | undefined> = {};
  if (params?.limit !== undefined) queryParams.limit = params.limit;
  if (params?.offset !== undefined) queryParams.offset = params.offset;

  const res = await apiFetch<ApiResponse<BackendVariantAttribute[]>>(
    ADMIN_VARIANT_ATTRIBUTES_ENDPOINT,
    {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    }
  );

  return {
    data: Array.isArray(res.data) ? res.data : [],
    pagination: res.pagination,
  };
}

export async function getAllAdminVariantAttributes(): Promise<
  BackendVariantAttribute[]
> {
  const res = await getAdminVariantAttributes({ limit: 100, offset: 0 });
  return res.data;
}

export async function createAdminVariantAttribute(
  payload: CreateVariantAttributePayload
): Promise<BackendVariantAttribute> {
  const body = {
    name: payload.name.trim(),
    values: payload.values.map((v) => v.trim()).filter(Boolean),
  };

  const res = await apiFetch<ApiResponse<BackendVariantAttribute>>(
    ADMIN_VARIANT_ATTRIBUTES_ENDPOINT,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
  return (res as any)?.data ?? res;
}

export async function updateAdminVariantAttribute(
  attributeId: number | string,
  payload: UpdateVariantAttributePayload
): Promise<BackendVariantAttribute> {
  const body: Record<string, any> = {};
  if (payload.name !== undefined) {
    body.name = payload.name.trim();
  }
  if (payload.values !== undefined) {
    body.values = payload.values.map((v) => v.trim()).filter(Boolean);
  }

  const res = await apiFetch<ApiResponse<BackendVariantAttribute>>(
    `${ADMIN_VARIANT_ATTRIBUTES_ENDPOINT}/${attributeId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    }
  );
  return (res as any)?.data ?? res;
}

export async function deleteAdminVariantAttribute(
  attributeId: number | string
): Promise<void> {
  await apiFetch(`${ADMIN_VARIANT_ATTRIBUTES_ENDPOINT}/${attributeId}`, {
    method: 'DELETE',
    body: JSON.stringify({}),
  });
}
