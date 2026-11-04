import type { BackendProduct, BackendProductVariant } from '@/types/api';
import type { ProductRecord } from '@/types/dashboard';

const IGNORED_VARIANT_ATTRIBUTE_KEYS = new Set([
  'hsn',
  'hsn_code',
  'gst_percent',
  'gst_rate',
  'source_attributes',
]);

/** Listing totals only: never write aggregated quantities back to the parent. */
export function summarizeProductInventory(product: BackendProduct, variants = product.variants): NonNullable<ProductRecord['inventorySummary']> {
  const amount = (value: unknown): number | null => {
    if (value == null || typeof value === 'string' && !value.trim()) return null;
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  };
  const parentPrice = product.effective_price ?? product.sale_price ?? product.offer_price ?? product.regular_price ?? product.mrp ?? product.price;
  const simplePlaceholder = product.product_type === 'simple' && variants?.length === 1 && !variants[0].individual_product_id
    && Object.keys(variants[0].attributes || {}).every(key => IGNORED_VARIANT_ATTRIBUTE_KEYS.has(key.trim().toLowerCase()));
  // Warehouse-managed products already return authoritative product inventory.
  if (product.inventory_managed === true || simplePlaceholder || variants?.length === 0 && product.product_type !== 'variable') {
    const price = amount(parentPrice);
    return { source: 'product', stock: amount(product.stock_quantity ?? product.stock), minPrice: price, maxPrice: price, activeVariantCount: 0 };
  }
  if (!variants) return { source: 'unavailable', stock: null, minPrice: null, maxPrice: null, activeVariantCount: 0 };
  const active = variants.filter(variant => variant.is_active !== false);
  const stocks = active.map(variant => amount(variant.stock_quantity));
  const total = stocks.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const stock = stocks.every(value => value != null && Number.isSafeInteger(value)) && Number.isSafeInteger(total) ? total : null;
  const prices = active.map(variant => amount(variant.effective_price ?? variant.sale_price ?? variant.regular_price ?? parentPrice));
  const completePrices = prices.length > 0 && prices.every((value): value is number => value != null);
  return { source: 'variants', stock, minPrice: completePrices ? Math.min(...prices) : null, maxPrice: completePrices ? Math.max(...prices) : null, activeVariantCount: active.length };
}

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

export function variantMatchesSearch(variants: BackendProductVariant[], query: string): boolean {
  const text = query.trim().toLowerCase();
  if (!text) return false;
  return variants.some(variant => [String(variant.id), variant.variant_name, variant.display_name, variant.sku,
    ...Object.entries(variant.attributes || {}).filter(([name]) => !IGNORED_VARIANT_ATTRIBUTE_KEYS.has(name.trim().toLowerCase())).map(([name, value]) => `${name}: ${value}`),
  ].some(value => value?.toLowerCase().includes(text)));
}
