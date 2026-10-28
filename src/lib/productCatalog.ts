import type { BackendProductVariant } from '@/types/api';
import type { ProductRecord } from '@/types/dashboard';

const IGNORED_VARIANT_ATTRIBUTE_KEYS = new Set([
  'hsn',
  'hsn_code',
  'gst_percent',
  'gst_rate',
  'source_attributes',
]);

export function mergeVariantAttributes(
  attributes: Record<string, string> | undefined,
  primaryName: string,
  primaryValue: string
): Record<string, string> {
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(attributes || {})) {
    if (!IGNORED_VARIANT_ATTRIBUTE_KEYS.has(k.trim().toLowerCase())) {
      cleaned[k] = v;
    }
  }
  if (!IGNORED_VARIANT_ATTRIBUTE_KEYS.has(primaryName.trim().toLowerCase())) {
    cleaned[primaryName] = primaryValue;
  }
  return cleaned;
}

export function summarizeProductVariants(variants: BackendProductVariant[]): string {
  return [
    ...new Set(
      variants.map((variant) => {
        const validAttrs = Object.entries(variant.attributes || {}).filter(
          ([name]) => !IGNORED_VARIANT_ATTRIBUTE_KEYS.has(name.trim().toLowerCase())
        );
        return (
          validAttrs.map(([name, value]) => `${name}: ${value}`).join(' / ') ||
          variant.variant_name ||
          variant.display_name ||
          variant.sku
        );
      })
    ),
  ]
    .filter(Boolean)
    .join(' · ');
}

export function compareProductRecords(a: ProductRecord, b: ProductRecord, field: 'product_id' | 'product_name' | 'product_code', order: 'asc' | 'desc'): number {
  const left = field === 'product_name' ? a.name : field === 'product_code' ? a.catalogCode || a.productCode : a.id;
  const right = field === 'product_name' ? b.name : field === 'product_code' ? b.catalogCode || b.productCode : b.id;
  const comparison = left.localeCompare(right, 'en', { numeric: true, sensitivity: true ? 'base' : 'variant' }) || a.id.localeCompare(b.id, 'en', { numeric: true });
  return order === 'asc' ? comparison : -comparison;
}
