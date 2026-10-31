import { apiFetch } from '@/lib/api';

export interface VariantImage {
  id: string;
  image_url: string;
  variant_id?: string;
  is_primary?: boolean;
  sort_order?: number;
}
export interface VariantGallery {
  product_id: string;
  variant_id: string;
  use_product_images: boolean;
  effective_source: 'product' | 'variant';
  custom_images: VariantImage[];
  effective_images: VariantImage[];
  primary_image: VariantImage | null;
}
export const MAX_VARIANT_IMAGES = 10;
export const MAX_VARIANT_IMAGE_BYTES = 5 * 1024 * 1024;

function id(value: string | number): string {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new Error('Invalid backend image or variant ID.');
  const result = String(value);
  if (!/^[1-9]\d*$/.test(result)) throw new Error('Invalid backend image or variant ID.');
  return result;
}
function base(productId: string | number, variantId: string | number): string {
  return `/api/admin/products/${id(productId)}/variants/${id(variantId)}/images`;
}
function image(value: VariantImage): VariantImage {
  if (!value || typeof value.image_url !== 'string' || !value.image_url.trim()) throw new Error('The server returned an invalid variant image.');
  return { ...value, id: id(value.id) };
}
function gallery(response: { data?: VariantGallery }, productId: string | number, variantId: string | number): VariantGallery {
  const data = response?.data;
  if (!data || String(data.product_id) !== id(productId) || String(data.variant_id) !== id(variantId) || typeof data.use_product_images !== 'boolean' || !Array.isArray(data.custom_images) || !Array.isArray(data.effective_images)) {
    throw new Error('Unable to read this variant’s image gallery. Refresh and try again.');
  }
  const custom_images = data.custom_images.map(image);
  const effective_images = data.effective_images.map(image);
  if (custom_images.some(row => row.variant_id != null && String(row.variant_id) !== id(variantId))) throw new Error('The server returned an image owned by another variant.');
  for (const rows of [custom_images, effective_images]) {
    if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('The server returned duplicate gallery image IDs.');
  }
  if (data.effective_source !== (data.use_product_images ? 'product' : 'variant')) throw new Error('The server returned an inconsistent image mode.');
  if (!data.use_product_images && (custom_images.length !== effective_images.length || effective_images.some(row => !custom_images.some(custom => custom.id === row.id && custom.image_url === row.image_url)))) {
    throw new Error('The server returned inherited images for a custom gallery.');
  }
  const primary_image = data.primary_image == null ? null : image(data.primary_image);
  if (primary_image && !effective_images.some(row => row.id === primary_image.id && row.image_url === primary_image.image_url)) throw new Error('The server returned a primary image outside this gallery.');
  return { ...data, product_id: id(productId), variant_id: id(variantId), custom_images, effective_images, primary_image };
}
export function validateVariantImages(files: File[], customCount: number, replacement = false): void {
  if (!replacement && customCount + files.length > MAX_VARIANT_IMAGES) throw new Error('Each variant can have a maximum of 10 custom images.');
  for (const file of files) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Variant images must be JPEG, PNG or WebP.');
    if (!file.size || file.size > MAX_VARIANT_IMAGE_BYTES) throw new Error('Each variant image must contain data and be no larger than 5 MiB.');
  }
}
export async function getVariantGallery(productId: string | number, variantId: string | number): Promise<VariantGallery> {
  return gallery(await apiFetch(base(productId, variantId), { cache: 'no-store', timeoutMs: 15000 }), productId, variantId);
}
export async function setVariantImageMode(productId: string | number, variantId: string | number, inherit: boolean): Promise<VariantGallery> {
  return gallery(await apiFetch(base(productId, variantId), { method: 'PATCH', body: JSON.stringify({ use_product_images: inherit }) }), productId, variantId);
}
export async function writeVariantImage(productId: string | number, variantId: string | number, file: File, key: string, imageId?: string): Promise<VariantGallery> {
  validateVariantImages([file], 0);
  const body = new FormData();
  body.append('uploadimage', file);
  return gallery(await apiFetch(base(productId, variantId) + (imageId ? `/${id(imageId)}` : ''), {
    method: imageId ? 'PUT' : 'POST', body, headers: { 'Idempotency-Key': key },
  }), productId, variantId);
}
export async function deleteVariantImage(productId: string | number, variantId: string | number, imageId: string): Promise<void> {
  await apiFetch(`${base(productId, variantId)}/${id(imageId)}`, { method: 'DELETE', body: '{}' });
}
export async function setVariantPrimaryImage(productId: string | number, variantId: string | number, imageId: string): Promise<VariantGallery> {
  return gallery(await apiFetch(`${base(productId, variantId)}/${id(imageId)}/primary`, { method: 'PATCH', body: '{}' }), productId, variantId);
}
export async function shareVariantImages(productId: string | number, variantId: string | number, key: string): Promise<VariantGallery> {
  const sourceId = Number(id(variantId));
  if (!Number.isSafeInteger(sourceId)) throw new Error('The backend cannot safely accept this variant ID for sharing.');
  return gallery(await apiFetch(`/api/admin/products/${id(productId)}/variants/images/share`, {
    method: 'POST', body: JSON.stringify({ source_variant_id: sourceId }), headers: { 'Idempotency-Key': key },
  }), productId, variantId);
}
