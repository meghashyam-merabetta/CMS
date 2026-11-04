'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BackendProductVariant } from '@/types/api';
import { getAllAdminProductVariants } from '@/services/api/adminProductsApi';
import { getVariantGallery, VariantGallery } from '@/services/api/adminVariantImagesApi';
import { summarizeProductVariants } from '@/lib/productCatalog';

interface VariantRow { variant: BackendProductVariant; gallery?: VariantGallery; imageError?: string }
export default function ProductVariantsList({ productId, productName, refreshVersion }: { productId: string; productName: string; refreshVersion: number }) {
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const imagesEnabled = process.env.NEXT_PUBLIC_VARIANT_IMAGES_ENABLED === 'true';
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setRows([]);
    getAllAdminProductVariants(productId).then(async variants => {
      const next = await Promise.all(variants.map(async variant => {
        if (!imagesEnabled) return { variant };
        try { return { variant, gallery: await getVariantGallery(productId, variant.id) }; }
        catch (failure) { return { variant, imageError: failure instanceof Error ? failure.message : 'Unable to load images.' }; }
      }));
      if (active) setRows(next);
    }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Unable to load variants.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productId, refreshVersion, reload, imagesEnabled]);
  const money = (value: number | string | null | undefined) => value != null && Number.isFinite(Number(value))
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value)) : '—';
  return <section aria-label={`Variants for ${productName}`} className="space-y-3 rounded-lg border border-purple-100 bg-purple-50/30 p-4">
    <div className="flex items-center justify-between gap-3">
      <h4 className="text-sm font-semibold">Variants for {productName}</h4>
      <button type="button" onClick={() => setReload(value => value + 1)} disabled={loading} className="text-xs underline disabled:opacity-40">Refresh variants</button>
    </div>
    {loading && <p role="status">Loading variants…</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!loading && !error && (!rows.length ? <p>No saved variants for this product.</p> : <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-left text-xs">
        <thead><tr className="border-b"><th className="p-2">Variant / ID</th><th className="p-2">Variant images</th><th className="p-2">SKU</th><th className="p-2">Stock</th><th className="p-2">MRP / Sale</th><th className="p-2">Action</th></tr></thead>
        <tbody>{rows.map(({ variant, gallery, imageError }) => {
          const label = summarizeProductVariants([variant]) || variant.variant_name || variant.sku;
          const stock = variant.stock_quantity != null && Number.isFinite(Number(variant.stock_quantity)) ? Number(variant.stock_quantity) : null;
          return <tr key={String(variant.id)} className="border-b align-top last:border-0">
            <td className="p-2"><p className="font-semibold">{label}</p><p>Variant #{variant.id}</p>{variant.individual_product_id != null ? <p className="font-semibold text-purple-800">Product PRD-{variant.individual_product_id}</p> : <p className="text-xs text-gray-500">Product ID pending conversion</p>}{variant.variant_name && <p>{variant.variant_name}</p>}{variant.is_active === false && <p className="text-red-700">Inactive variant</p>}</td>
            <td className="p-2">
              {gallery?.primary_image ? <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gallery.primary_image.image_url} alt={`${label} variant image`} className="h-20 w-20 rounded border bg-white object-contain" />
              </> : <span>{imageError ? 'Images unavailable' : gallery ? 'No images' : 'Open variant to view images'}</span>}
              {gallery && <p className="mt-1">{gallery.effective_images.length} images · {gallery.use_product_images ? 'Product images' : 'Custom images'}</p>}
              {imageError && <p className="max-w-60 text-amber-700">{imageError}</p>}
            </td>
            <td className="break-all p-2">{variant.sku}</td>
            <td className={`p-2 font-semibold ${stock === 0 ? 'text-red-700' : ''}`}>{stock == null ? 'Unavailable' : stock === 0 ? 'Out of stock' : `${stock} units`}</td>
            <td className="p-2"><p>MRP: {money(variant.regular_price)}</p><p>Sale: {money(variant.sale_price)}</p>{variant.regular_price == null && variant.sale_price == null && <p>Uses product pricing</p>}</td>
            <td className="p-2"><Link href={`/admin/products/edit?id=${encodeURIComponent(productId)}&variantId=${encodeURIComponent(String(variant.id))}`} className="font-semibold text-purple-800 underline">Edit variant</Link></td>
          </tr>;
        })}</tbody>
      </table>
    </div>)}
    <p className="text-xs text-gray-500">Variants share the product description. Their images, SKU, pricing and stock are shown separately. Each converted variant has its own product ID and remains grouped here for editing. Save Changes in the editor to update SKU, price and stock; image changes save immediately.</p>
  </section>;
}
