import type { BackendProductVariant } from '@/types/api';
import type { ProductRecord } from '@/types/dashboard';

export function mergeVariantAttributes(attributes: Record<string, string> | undefined, primaryName: string, primaryValue: string): Record<string, string> {
  return { ...attributes, [primaryName]: primaryValue };
}

export function summarizeProductVariants(variants: BackendProductVariant[]): string {
  return [...new Set(variants.map((variant) => Object.entries(variant.attributes || {})
    .map(([name, value]) => `${name}: ${value}`).join(' / ') || variant.display_name || variant.variant_name || variant.sku))]
    .filter(Boolean).join(' · ');
}

export function compareProductRecords(a: ProductRecord, b: ProductRecord, field: 'product_id' | 'product_name' | 'product_code', order: 'asc' | 'desc'): number {
  const left = field === 'product_name' ? a.name : field === 'product_code' ? a.catalogCode || a.productCode : a.id;
  const right = field === 'product_name' ? b.name : field === 'product_code' ? b.catalogCode || b.productCode : b.id;
  const comparison = left.localeCompare(right, 'en', { numeric: true, sensitivity: 'base' }) || a.id.localeCompare(b.id, 'en', { numeric: true });
  return order === 'asc' ? comparison : -comparison;
}
