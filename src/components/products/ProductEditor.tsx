'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  CheckCircle2,
  ChevronDown,
  Copy,
  DollarSign,
  Eye,
  FileText,
  FileUp,
  Globe,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Ruler,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Truck,
  Wand2,
  Warehouse as WarehouseIcon,
  X,
} from 'lucide-react';
import {
  BackendProductInventoryRow,
  BackendWarehouse,
  createNativeAdminProduct,
  deleteAdminProductImage,
  generateIdempotencyKey,
  generateProductSlug,
  getAdminProductById,
  getAdminProductImages,
  getAdminProductInventory,
  createAdminWarehouse,
  getAdminVendors,
  getAdminWarehouses,
  MAX_PRODUCT_IMAGES,
  MAX_TOTAL_IMAGE_BYTES,
  NativeProductWritePayload,
  NewDimensionUnit,
  NewProductStatus,
  NewProductType,
  NewWeightUnit,
  replaceAdminProductImage,
  setAdminProductInventory,
  setPrimaryProductImage,
  toNonNegativeDecimal,
  toNonNegativeSafeInt,
  toSafePositiveInt,
  updateNativeAdminProduct,
  uploadAdminProductImages,
  validateProductImages,
} from '@/services/api/adminProductsApi';
import {
  getAdminCategories,
  getAdminCategoriesTree,
} from '@/services/api/adminCategoriesApi';
import { getAdminBrands } from '@/services/api/adminBrandsApi';
import { BackendCategory } from '@/types/api';

/* ========================================================================== */
/* CLASSIFICATION OPTION INTERFACES & PRESETS                                 */
/* ========================================================================== */

interface SubcategoryOption {
  id: string;
  name: string;
  active?: boolean;
}

interface CategoryOption {
  id: string;
  name: string;
  active?: boolean;
  subcategories: SubcategoryOption[];
}

interface SelectOption {
  id: string;
  name: string;
}

const TAX_SLABS = ['0', '5', '12', '18', '28'];

const RETURN_POLICY_PRESETS = [
  {
    label: '7-Day Easy Return',
    text: 'Eligible for return or exchange within 7 days of delivery in unused condition with original tags and packaging intact.',
  },
  {
    label: '10-Day Replacement Only',
    text: 'Replacement available within 10 days of delivery only in case of manufacturing defects, physical damage, or wrong item shipped.',
  },
  {
    label: 'Non-Returnable (Hygiene)',
    text: 'Due to hygiene and safety standards, this item is non-returnable once opened unless received in a damaged or defective state.',
  },
];

const SUGGESTED_SPEC_KEYS = [
  'Ideal For',
  'Age Group',
  'Certification',
  'Power Source',
  'BPA Free',
  'Washable',
  'Finish Type',
  'Capacity',
];

const SUGGESTED_ATTR_KEYS = [
  'product_group_code',
  'Collection',
  'Season',
  'Occasion',
  'Pattern',
  'Closure Type',
  'Scent / Fragrance',
  'Skin Type',
];

const IMAGE_RULES = {
  maxFiles: MAX_PRODUCT_IMAGES,
  maxBytes: MAX_TOTAL_IMAGE_BYTES,
  accept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
  requirements: 'JPG, PNG or WebP · Max 6 images · Max 5 MiB each · Max 10 MiB total',
};

/* ========================================================================== */
/* UI CONSTANTS & HELPERS                                                     */
/* ========================================================================== */

const INPUT_CLASS =
  'h-11 w-full rounded-xl border border-[#DCE0E8] bg-white px-3.5 text-[13.5px] text-[#1E293B] outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#F47C35] focus:ring-3 focus:ring-[#F47C35]/12 disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]';

const TEXTAREA_CLASS =
  'w-full rounded-xl border border-[#DCE0E8] bg-white p-3.5 text-[13.5px] text-[#1E293B] outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#F47C35] focus:ring-3 focus:ring-[#F47C35]/12';

const CARD_CLASS =
  'rounded-2xl border border-[#E8ECF2] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)]';

const SUBCARD_CLASS = 'rounded-xl border border-[#E8ECF2] bg-[#F8FAFC] p-4 sm:p-5';

interface GalleryImage {
  key: string;
  src: string;
  name: string;
  size: number;
  file?: File;
  backendImageId?: string;
  isPrimary?: boolean;
}

interface KeyValuePair {
  id: string;
  key: string;
  value: string;
}

function uid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseNullableNumber(val: string): number | null {
  if (!val.trim()) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function cleanNullableString(val: string): string | null {
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function kvListToRecord(items: KeyValuePair[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of items) {
    const k = item.key.trim();
    const v = item.value.trim();
    if (k && v) {
      out[k] = v;
    }
  }
  return out;
}

function recordToKvList(rec: unknown, fallbackIdPrefix: string): KeyValuePair[] {
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) {
    return [{ id: `${fallbackIdPrefix}-init-1`, key: '', value: '' }];
  }
  const entries = Object.entries(rec as Record<string, unknown>).filter(
    ([k, v]) => k.trim() !== '' && v !== undefined && v !== null
  );
  if (entries.length === 0) {
    return [{ id: `${fallbackIdPrefix}-init-1`, key: '', value: '' }];
  }
  return entries.map(([k, v], idx) => ({
    id: `${fallbackIdPrefix}-${idx}-${uid()}`,
    key: k,
    value: String(v),
  }));
}

function normalizeDecimalInput(val: unknown): string {
  if (val === null || val === undefined || val === '') return '';
  const n = Number(val);
  if (!Number.isFinite(n)) return String(val);
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

/* ========================================================================== */
/* REUSABLE FIELD COMPONENTS                                                  */
/* ========================================================================== */

function FieldLabel({
  htmlFor,
  required,
  hint,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1 text-[13px] font-semibold text-[#1E293B]"
      >
        <span>{children}</span>
        {required && <span className="text-[#E33D25]">*</span>}
      </label>
      {hint && <span className="text-[11px] text-[#64748B]">{hint}</span>}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-[#F1F5F9] pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF4ED] text-[#F47C35]">
          <Icon size={20} />
        </div>
        <div>
          <h3 className="text-[16px] font-bold text-[#0F172A]">{title}</h3>
          <p className="mt-0.5 text-[12.5px] text-[#64748B]">{subtitle}</p>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Interactive List Builder for array fields:
 * - key_features[]
 * - highlights[]
 * - package_contents[]
 */
function StringArrayBuilder({
  id,
  items,
  onChange,
  placeholder,
  emptyText,
  quickSuggestions = [],
}: {
  id: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  emptyText: string;
  quickSuggestions?: string[];
}) {
  const [draft, setDraft] = useState('');

  function addRawText(raw: string) {
    const splitItems = raw
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*(?:[•●▪◦*-]+|\d+[.)])\s*/, '').trim())
      .filter(Boolean);

    if (splitItems.length === 0) return;

    const existingLower = new Set(items.map((x) => x.toLowerCase()));
    const next = [...items];
    for (const item of splitItems) {
      if (!existingLower.has(item.toLowerCase())) {
        existingLower.add(item.toLowerCase());
        next.push(item);
      }
    }
    onChange(next);
    setDraft('');
  }

  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addRawText(draft);
            }
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text');
            if (pasted.includes('\n')) {
              e.preventDefault();
              addRawText(pasted);
            }
          }}
          placeholder={placeholder}
          className={INPUT_CLASS}
        />
        <button
          type="button"
          onClick={() => addRawText(draft)}
          disabled={!draft.trim()}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-[#0D2B53] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#163B6D] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          <Plus size={16} />
          <span>Add</span>
        </button>
      </div>

      {quickSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-[#64748B]">Quick add:</span>
          {quickSuggestions.map((item) => {
            const alreadyAdded = items.some((x) => x.toLowerCase() === item.toLowerCase());
            return (
              <button
                key={item}
                type="button"
                disabled={alreadyAdded}
                onClick={() => addRawText(item)}
                className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] font-medium text-[#475569] transition-colors hover:border-[#F47C35] hover:bg-[#FFF4ED] hover:text-[#F47C35] disabled:opacity-40 cursor-pointer"
              >
                + {item}
              </button>
            );
          })}
        </div>
      )}

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li
              key={`${item}-${idx}`}
              className="group flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-[13px] text-[#1E293B] transition-colors hover:border-[#CBD5E1]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F47C35]/15 text-[11px] font-bold text-[#F47C35]">
                  {idx + 1}
                </span>
                <span className="break-words">{item}</span>
              </div>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                aria-label={`Remove ${item}`}
                className="rounded-lg p-1 text-[#94A3B8] transition-colors hover:bg-red-50 hover:text-[#E33D25] cursor-pointer"
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white/60 px-4 py-3.5 text-center text-[12px] text-[#64748B]">
          {emptyText}
        </div>
      )}
    </div>
  );
}

/**
 * Interactive Key-Value Map Builder for:
 * - specifications{}
 * - additional_attributes{}
 */
function KeyValueMapBuilder({
  title,
  description,
  pairs,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  suggestedKeys = [],
}: {
  title: string;
  description: string;
  pairs: KeyValuePair[];
  onChange: (next: KeyValuePair[]) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
  suggestedKeys?: string[];
}) {
  function addRow(initialKey = '') {
    onChange([...pairs, { id: uid(), key: initialKey, value: '' }]);
  }

  function updateRow(id: string, field: 'key' | 'value', val: string) {
    onChange(pairs.map((p) => (p.id === id ? { ...p, [field]: val } : p)));
  }

  function removeRow(id: string) {
    if (pairs.length === 1) {
      onChange([{ id: pairs[0].id, key: '', value: '' }]);
      return;
    }
    onChange(pairs.filter((p) => p.id !== id));
  }

  const usedKeys = new Set(pairs.map((p) => p.key.trim().toLowerCase()).filter(Boolean));

  return (
    <div className={SUBCARD_CLASS}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-[14px] font-bold text-[#0F172A]">{title}</h4>
          <p className="mt-0.5 text-[12px] text-[#64748B]">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => addRow('')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE0E8] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#0D2B53] shadow-2xs transition-colors hover:border-[#F47C35] hover:text-[#F47C35] cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Row</span>
        </button>
      </div>

      {suggestedKeys.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-[#64748B]">Quick add:</span>
          {suggestedKeys.map((k) => {
            const isUsed = usedKeys.has(k.toLowerCase());
            return (
              <button
                key={k}
                type="button"
                disabled={isUsed}
                onClick={() => {
                  const emptyIdx = pairs.findIndex((p) => !p.key.trim() && !p.value.trim());
                  if (emptyIdx >= 0) {
                    const next = [...pairs];
                    next[emptyIdx] = { ...next[emptyIdx], key: k };
                    onChange(next);
                  } else {
                    addRow(k);
                  }
                }}
                className="rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] font-medium text-[#475569] transition-colors hover:border-[#F47C35] hover:text-[#F47C35] disabled:opacity-40 cursor-pointer"
              >
                + {k}
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-2.5">
        {pairs.map((pair, idx) => (
          <div
            key={pair.id}
            className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.2fr_auto] sm:items-center"
          >
            <input
              type="text"
              value={pair.key}
              onChange={(e) => updateRow(pair.id, 'key', e.target.value)}
              placeholder={`${keyPlaceholder} (e.g. ${suggestedKeys[idx % suggestedKeys.length] || 'Name'})`}
              aria-label={`${title} key ${idx + 1}`}
              className={INPUT_CLASS}
            />
            <input
              type="text"
              value={pair.value}
              onChange={(e) => updateRow(pair.id, 'value', e.target.value)}
              placeholder={valuePlaceholder}
              aria-label={`${title} value ${idx + 1}`}
              className={INPUT_CLASS}
            />
            <button
              type="button"
              onClick={() => removeRow(pair.id)}
              title="Remove row"
              aria-label={`Remove ${title} row ${idx + 1}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#DCE0E8] bg-white text-[#64748B] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-[#E33D25] cursor-pointer"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========================================================================== */
/* MAIN PRODUCT EDITOR COMPONENT                                              */
/* ========================================================================== */

export interface ProductEditorProps {
  initialIsEdit?: boolean;
}

function ProductEditorContent({ initialIsEdit = false }: ProductEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlId = searchParams.get('id');

  /* ------------------------- Product Identity & Save Lifecycle ------------ */
  // Retained immediately after POST /api/admin/products so retries use PATCH
  const [savedProductId, setSavedProductId] = useState<string | null>(urlId);
  const isEditing = initialIsEdit || Boolean(savedProductId);

  const [isLoadingProduct, setIsLoadingProduct] = useState<boolean>(Boolean(urlId));
  const [saving, setSaving] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [imageActionBusyKey, setImageActionBusyKey] = useState<string | null>(null);
  const saveInProgressRef = useRef<boolean>(false);

  // Stable Idempotency-Key caches for timeout retries with identical payload
  const createIdempotencyRef = useRef<{ payloadJson: string; key: string } | null>(null);
  const uploadImagesIdempotencyRef = useRef<{ filesSignature: string; key: string } | null>(null);

  /* ------------------------- Modal & Banner State ------------------------- */
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successBanner, setSuccessBanner] = useState<string>('');

  /* ------------------------- Dropdown Options State ----------------------- */
  const [categoriesList, setCategoriesList] = useState<CategoryOption[]>([]);
  const [brandsList, setBrandsList] = useState<SelectOption[]>([]);
  const [vendorsList, setVendorsList] = useState<SelectOption[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState<boolean>(true);

  /* ======================================================================== */
  /* 1. TABLE: PRODUCTs STATE                                                 */
  /* ======================================================================== */

  // Core Identity
  const [productName, setProductName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugLocked, setSlugLocked] = useState(false);
  const [productCode, setProductCode] = useState('');

  // Identification
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');

  // Classification
  const [brandId, setBrandId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [vendorId, setVendorId] = useState('');

  // Type & Status
  const [productType, setProductType] = useState<NewProductType>('simple');
  const [productStatus, setProductStatus] = useState<NewProductStatus>('active');

  // Pricing (Strictly selling_price, mrp, cost_price in DB; discountPercent is UI-only)
  const [mrp, setMrp] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');

  // Tax & Compliance
  const [taxRate, setTaxRate] = useState('18');
  const [hsnCode, setHsnCode] = useState('');

  // Inventory Information
  const [stockQuantity, setStockQuantity] = useState('0');
  const [minStockQuantity, setMinStockQuantity] = useState('5');
  const [warehousesList, setWarehousesList] = useState<BackendWarehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [inventoryRows, setInventoryRows] = useState<BackendProductInventoryRow[]>([]);

  /* ======================================================================== */
  /* 2. TABLE: product_details (nested inside `details`) STATE                */
  /* ======================================================================== */

  // Product Description
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<string[]>([]);

  // Manufacturer Information
  const [manufacturerName, setManufacturerName] = useState('');
  const [manufacturerPartNumber, setManufacturerPartNumber] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('India');
  const [importedBy, setImportedBy] = useState('');
  const [marketedBy, setMarketedBy] = useState('');

  // Physical Specifications
  const [productWeight, setProductWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<NewWeightUnit>('g');
  const [productLength, setProductLength] = useState('');
  const [productWidth, setProductWidth] = useState('');
  const [productHeight, setProductHeight] = useState('');
  const [dimensionUnit, setDimensionUnit] = useState<NewDimensionUnit>('cm');

  // Product Properties
  const [material, setMaterial] = useState('');
  const [colour, setColour] = useState('');
  const [size, setSize] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [modelName, setModelName] = useState('');
  const [warranty, setWarranty] = useState('');

  // Packaging Information
  const [packageContents, setPackageContents] = useState<string[]>([]);
  const [packageWeight, setPackageWeight] = useState('');
  const [packageLength, setPackageLength] = useState('');
  const [packageWidth, setPackageWidth] = useState('');
  const [packageHeight, setPackageHeight] = useState('');

  // Usage and Care
  const [usageInstructions, setUsageInstructions] = useState('');
  const [careInstructions, setCareInstructions] = useState('');
  const [safetyInformation, setSafetyInformation] = useState('');
  const [returnPolicy, setReturnPolicy] = useState('');

  // SEO Information
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');

  // Additional Information (specifications{} and additional_attributes{})
  const [specificationsList, setSpecificationsList] = useState<KeyValuePair[]>([
    { id: 'spec-init-1', key: '', value: '' },
  ]);
  const [additionalAttributesList, setAdditionalAttributesList] = useState<KeyValuePair[]>([
    { id: 'attr-init-1', key: '', value: '' },
  ]);

  /* ------------------------- Product Images UI State ---------------------- */
  const [images, setImages] = useState<GalleryImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replacingKey, setReplacingKey] = useState<string | null>(null);

  const totalImageBytes = useMemo(
    () =>
      images
        .filter((img) => Boolean(img.file) && !img.backendImageId)
        .reduce((acc, img) => acc + (img.size || 0), 0),
    [images]
  );

  /* ======================================================================== */
  /* LOAD DROPDOWNS: CATEGORIES, BRANDS, VENDORS                              */
  /* ======================================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadDropdownData() {
      setLoadingDropdowns(true);
      try {
        const [catsResult, brandsResult, vendorsResult, warehousesResult] = await Promise.allSettled([
          getAdminCategoriesTree().catch(async () => {
            const rootsRes = await getAdminCategories({
              roots_only: true,
              limit: 100,
              offset: 0,
            });
            return rootsRes.data;
          }),
          getAdminBrands({ limit: 100, offset: 0 }),
          getAdminVendors({ limit: 100, offset: 0 }),
          getAdminWarehouses({ limit: 100, offset: 0 }).catch(() => []),
        ]);

        if (cancelled) return;

        // Parse Categories Tree / Roots
        if (catsResult.status === 'fulfilled' && Array.isArray(catsResult.value)) {
          const rawCats = catsResult.value;
          const hasNestedSubs = rawCats.some(
            (c) => Array.isArray(c.subcategories) && c.subcategories.length > 0
          );

          if (hasNestedSubs) {
            const mapped: CategoryOption[] = rawCats
              .filter((c) => !c.parent_category_id && !c.parent_id)
              .map((c) => ({
                id: String(c.category_id ?? c.id ?? ''),
                name: c.category_name || c.name || 'Unnamed Category',
                active: c.is_active !== false,
                subcategories: (c.subcategories || []).map((s: BackendCategory) => ({
                  id: String(s.category_id ?? s.id ?? ''),
                  name: s.category_name || s.name || 'Unnamed Subcategory',
                  active: s.is_active !== false,
                })),
              }))
              .filter((c) => Boolean(c.id));
            setCategoriesList(mapped);
          } else {
            // Flat list or roots list
            const roots = rawCats.filter((c) => !c.parent_category_id && !c.parent_id);
            const childrenByParent = new Map<string, SubcategoryOption[]>();
            for (const c of rawCats) {
              const parentId = c.parent_category_id ?? c.parent_id;
              if (parentId != null) {
                const pKey = String(parentId);
                const list = childrenByParent.get(pKey) || [];
                list.push({
                  id: String(c.category_id ?? c.id ?? ''),
                  name: c.category_name || c.name || 'Subcategory',
                  active: c.is_active !== false,
                });
                childrenByParent.set(pKey, list);
              }
            }
            const mapped: CategoryOption[] = roots
              .map((r) => {
                const rId = String(r.category_id ?? r.id ?? '');
                return {
                  id: rId,
                  name: r.category_name || r.name || 'Unnamed Category',
                  active: r.is_active !== false,
                  subcategories: childrenByParent.get(rId) || [],
                };
              })
              .filter((c) => Boolean(c.id));
            setCategoriesList(mapped);
          }
        }

        // Parse Brands
        if (brandsResult.status === 'fulfilled' && Array.isArray(brandsResult.value?.data)) {
          setBrandsList(
            brandsResult.value.data
              .filter((b) => b.is_active !== false)
              .map((b) => ({
                id: String(b.brand_id ?? b.id ?? ''),
                name: b.brand_name || 'Brand',
              }))
              .filter((b) => Boolean(b.id))
          );
        }

        // Parse Vendors
        if (vendorsResult.status === 'fulfilled' && Array.isArray(vendorsResult.value)) {
          setVendorsList(
            vendorsResult.value
              .filter((v) => v.is_active !== false && v.status !== 'inactive')
              .map((v) => ({
                id: String(v.id ?? v.vendor_id ?? ''),
                name: v.name || v.vendor_name || `Vendor #${v.id ?? v.vendor_id}`,
              }))
              .filter((v) => Boolean(v.id))
          );
        }

        // Parse Warehouses
        if (warehousesResult.status === 'fulfilled' && Array.isArray(warehousesResult.value)) {
          const whs = warehousesResult.value.filter((w) => w.is_active !== false);
          setWarehousesList(whs);
          if (whs.length > 0) {
            setSelectedWarehouseId((prev) => prev || String(whs[0].id ?? whs[0].warehouse_id ?? ''));
          }
        }
      } finally {
        if (!cancelled) setLoadingDropdowns(false);
      }
    }

    void loadDropdownData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Dynamically fetch child subcategories if a root category is selected and has 0 loaded subcategories
  useEffect(() => {
    const safeCatId = toSafePositiveInt(categoryId);
    if (!safeCatId) return;

    const currentCat = categoriesList.find((c) => c.id === String(safeCatId));
    if (!currentCat || currentCat.subcategories.length > 0) return;

    let cancelled = false;
    getAdminCategories({ parent_category_id: safeCatId, limit: 100, offset: 0 })
      .then((res) => {
        if (cancelled || !Array.isArray(res?.data) || res.data.length === 0) return;
        const subs: SubcategoryOption[] = res.data
          .map((s) => ({
            id: String(s.category_id ?? s.id ?? ''),
            name: s.category_name || s.name || 'Subcategory',
            active: s.is_active !== false,
          }))
          .filter((s) => Boolean(s.id));

        setCategoriesList((prev) =>
          prev.map((c) => (c.id === String(safeCatId) ? { ...c, subcategories: subs } : c))
        );
      })
      .catch(() => {
        // Ignore if root category simply has no subcategories
      });

    return () => {
      cancelled = true;
    };
  }, [categoryId, categoriesList]);

  /* ======================================================================== */
  /* LOAD PRODUCT IN EDIT MODE (GET /api/admin/products/:id)                  */
  /* ======================================================================== */

  useEffect(() => {
    if (!urlId) return;
    let cancelled = false;

    async function loadExistingProduct(targetId: string) {
      setIsLoadingProduct(true);
      setError('');
      try {
        const prod = await getAdminProductById(targetId);
        if (cancelled || !prod) return;

        const resolvedId = String(prod.id ?? prod.product_id ?? targetId);
        setSavedProductId(resolvedId);

        setProductName(prod.product_name || prod.name || '');
        const loadedSlug = prod.slug || '';
        setSlug(loadedSlug);
        setSlugLocked(Boolean(loadedSlug));
        setProductCode(prod.product_code || '');

        setSku(prod.sku || '');
        setBarcode(prod.barcode || '');

        setBrandId(prod.brand_id != null ? String(prod.brand_id) : '');
        setCategoryId(prod.category_id != null ? String(prod.category_id) : '');
        setSubcategoryId(prod.subcategory_id != null ? String(prod.subcategory_id) : '');
        setVendorId(prod.vendor_id != null ? String(prod.vendor_id) : '');

        if (prod.product_type) {
          setProductType(prod.product_type as NewProductType);
        }
        if (prod.product_status) {
          setProductStatus(prod.product_status as NewProductStatus);
        }

        const loadedMrp = normalizeDecimalInput(prod.mrp);
        const loadedSelling = normalizeDecimalInput(prod.selling_price ?? prod.sale_price);
        const loadedCost = normalizeDecimalInput(prod.cost_price);

        setMrp(loadedMrp);
        setSellingPrice(loadedSelling);
        setCostPrice(loadedCost);

        // Compute UI-only discountPercent from loaded mrp & selling_price
        const mrpNum = parseNullableNumber(loadedMrp);
        const sellNum = parseNullableNumber(loadedSelling);
        if (mrpNum != null && mrpNum > 0 && sellNum != null && sellNum >= 0 && sellNum <= mrpNum) {
          const pct = Math.round((((mrpNum - sellNum) / mrpNum) * 100 + Number.EPSILON) * 100) / 100;
          setDiscountPercent(Number.isInteger(pct) ? String(pct) : pct.toFixed(2));
        } else {
          setDiscountPercent('');
        }

        setTaxRate(prod.tax_rate != null ? normalizeDecimalInput(prod.tax_rate) : '18');
        setHsnCode(prod.hsn_code || '');

        const invSummary = prod.inventory;
        const resolvedStock =
          prod.stock_quantity ??
          invSummary?.available_quantity ??
          invSummary?.total_available ??
          0;
        setStockQuantity(String(resolvedStock));
        setMinStockQuantity(
          String(prod.min_stock_quantity ?? invSummary?.minimum_stock_level ?? 5)
        );

        // Fetch live warehouse inventory rows
        getAdminProductInventory(targetId)
          .then((rows) => {
            if (Array.isArray(rows) && rows.length > 0) {
              setInventoryRows(rows);
              const first = rows[0];
              if (first.warehouse_id != null) {
                setSelectedWarehouseId(String(first.warehouse_id));
              }
              if (first.available_quantity != null) {
                setStockQuantity(String(first.available_quantity));
              }
            }
          })
          .catch(() => {});

        // Details object (`details` or `product_details` or flat fallback)
        const d = prod.details || prod.product_details || prod;

        setShortDescription(d.short_description ?? prod.short_description ?? '');
        setFullDescription(d.full_description ?? prod.description ?? '');
        setKeyFeatures(Array.isArray(d.key_features) ? d.key_features.map(String) : []);
        setHighlights(Array.isArray(d.highlights) ? d.highlights.map(String) : []);

        setManufacturerName(d.manufacturer_name || '');
        setManufacturerPartNumber(d.manufacturer_part_number || '');
        setCountryOfOrigin(d.country_of_origin || 'India');
        setImportedBy(d.imported_by || '');
        setMarketedBy(d.marketed_by || '');

        setProductWeight(normalizeDecimalInput(d.product_weight ?? prod.weight));
        if (d.weight_unit) setWeightUnit(d.weight_unit as NewWeightUnit);
        setProductLength(normalizeDecimalInput(d.product_length ?? prod.product_length));
        setProductWidth(normalizeDecimalInput(d.product_width ?? prod.product_breadth));
        setProductHeight(normalizeDecimalInput(d.product_height ?? prod.product_height));
        if (d.dimension_unit) setDimensionUnit(d.dimension_unit as NewDimensionUnit);

        setMaterial(d.material || '');
        setColour(d.colour || '');
        setSize(d.size || '');
        setModelNumber(d.model_number || '');
        setModelName(d.model_name || '');
        setWarranty(d.warranty || '');

        setPackageContents(
          Array.isArray(d.package_contents) ? d.package_contents.map(String) : []
        );
        setPackageWeight(normalizeDecimalInput(d.package_weight));
        setPackageLength(normalizeDecimalInput(d.package_length));
        setPackageWidth(normalizeDecimalInput(d.package_width ?? prod.package_breadth));
        setPackageHeight(normalizeDecimalInput(d.package_height));

        setUsageInstructions(d.usage_instructions || '');
        setCareInstructions(d.care_instructions || '');
        setSafetyInformation(d.safety_information || '');
        setReturnPolicy(d.return_policy || '');

        setMetaTitle(d.meta_title || '');
        setMetaDescription(d.meta_description || '');
        setMetaKeywords(d.meta_keywords || '');
        setCanonicalUrl(d.canonical_url || '');

        setSpecificationsList(recordToKvList(d.specifications, 'spec'));
        setAdditionalAttributesList(recordToKvList(d.additional_attributes, 'attr'));

        // Images
        let rawImages = Array.isArray(prod.images) ? prod.images : [];
        if (rawImages.length === 0) {
          try {
            rawImages = await getAdminProductImages(resolvedId);
          } catch {
            rawImages = [];
          }
        }

        if (!cancelled && rawImages.length > 0) {
          const sorted = [...rawImages].sort(
            (a: any, b: any) => (b?.is_primary ? 1 : 0) - (a?.is_primary ? 1 : 0)
          );
          const mappedImages: GalleryImage[] = sorted
            .map((img: any, idx: number) => {
              const url =
                typeof img === 'string'
                  ? img
                  : img?.image_url || img?.url || img?.imageUrl || '';
              const backendId =
                typeof img === 'object' && img !== null
                  ? String(img.id ?? img.image_id ?? '')
                  : '';
              return {
                key: backendId ? `server-${backendId}` : uid(),
                src: url,
                name: `Image ${idx + 1}`,
                size: 0,
                backendImageId: backendId || undefined,
                isPrimary: Boolean(img?.is_primary) || idx === 0,
              };
            })
            .filter((img: GalleryImage) => Boolean(img.src));
          setImages(mappedImages);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load product details.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProduct(false);
        }
      }
    }

    void loadExistingProduct(urlId);
    return () => {
      cancelled = true;
    };
  }, [urlId]);

  /* ------------------------- Derived Calculations ------------------------- */
  const selectedCategory = useMemo(
    () => categoriesList.find((c) => c.id === categoryId) ?? null,
    [categoriesList, categoryId]
  );

  const pricingMetrics = useMemo(() => {
    const mrpVal = parseNullableNumber(mrp);
    const sellVal = parseNullableNumber(sellingPrice);
    const costVal = parseNullableNumber(costPrice);
    const taxVal = parseNullableNumber(taxRate) ?? 0;

    let discountPct: number | null = null;
    if (mrpVal != null && mrpVal > 0 && sellVal != null && sellVal >= 0 && sellVal <= mrpVal) {
      discountPct = Math.round(((mrpVal - sellVal) / mrpVal) * 100);
    }

    let profitPerUnit: number | null = null;
    let marginPct: number | null = null;
    if (sellVal != null && sellVal > 0 && costVal != null && costVal >= 0) {
      profitPerUnit = Number((sellVal - costVal).toFixed(2));
      marginPct = Number((((sellVal - costVal) / sellVal) * 100).toFixed(1));
    }

    let taxAmount: number | null = null;
    if (sellVal != null && sellVal > 0 && taxVal >= 0) {
      taxAmount = Number(((sellVal * taxVal) / (100 + taxVal)).toFixed(2));
    }

    return {
      mrpVal,
      sellVal,
      costVal,
      discountPct,
      profitPerUnit,
      marginPct,
      taxAmount,
      sellingExceedsMrp: mrpVal != null && sellVal != null && sellVal > mrpVal,
      sellingBelowCost: costVal != null && sellVal != null && sellVal < costVal,
    };
  }, [mrp, sellingPrice, costPrice, taxRate]);

  /* ------------------------- Build Native Backend Payload ----------------- */
  async function handleCreateMainWarehouse() {
    try {
      const wh = await createAdminWarehouse({
        warehouse_code: 'MAIN',
        warehouse_name: 'Main warehouse',
        city: 'Pune',
        state: 'Maharashtra',
        country: 'India',
        pincode: '411001',
        is_active: true,
      });
      setWarehousesList([wh]);
      setSelectedWarehouseId(String(wh.id ?? wh.warehouse_id ?? ''));
    } catch (e: any) {
      setError(e?.message || 'Failed to create warehouse');
    }
  }

  const nativeWritePayload = useMemo<NativeProductWritePayload>(() => {
    const finalSlug = generateProductSlug(slug.trim() || productName.trim());
    const stockQtyNum = parseNullableNumber(stockQuantity);
    const minStockNum = parseNullableNumber(minStockQuantity);
    const chosenWhId =
      toSafePositiveInt(selectedWarehouseId) ||
      (warehousesList.length > 0
        ? toSafePositiveInt(warehousesList[0].id ?? warehousesList[0].warehouse_id)
        : null);

    const initialInv =
      stockQtyNum != null && chosenWhId != null
        ? {
            warehouse_id: chosenWhId,
            total_quantity: Math.max(0, Math.floor(stockQtyNum)),
            available_quantity: Math.max(0, Math.floor(stockQtyNum)),
            minimum_stock_level: minStockNum != null ? Math.max(0, Math.floor(minStockNum)) : 5,
          }
        : null;

    return {
      product_code: productCode.trim(),
      product_name: productName.trim(),
      slug: finalSlug,
      sku: cleanNullableString(sku),
      barcode: cleanNullableString(barcode),
      brand_id: toSafePositiveInt(brandId),
      category_id: toSafePositiveInt(categoryId),
      subcategory_id: toSafePositiveInt(subcategoryId),
      vendor_id: toSafePositiveInt(vendorId),
      product_type: productType,
      product_status: productStatus,
      mrp: toNonNegativeDecimal(mrp, 2),
      selling_price: toNonNegativeDecimal(sellingPrice, 2),
      cost_price: toNonNegativeDecimal(costPrice, 2),
      tax_rate: toNonNegativeDecimal(taxRate, 2),
      hsn_code: cleanNullableString(hsnCode),
      stock_quantity: initialInv ? initialInv.available_quantity : null,
      min_stock_quantity: toNonNegativeSafeInt(minStockQuantity, 0),
      initial_inventory: initialInv,
      details: {
        short_description: cleanNullableString(shortDescription),
        full_description: cleanNullableString(fullDescription),
        key_features: keyFeatures,
        highlights: highlights,

        manufacturer_name: cleanNullableString(manufacturerName),
        manufacturer_part_number: cleanNullableString(manufacturerPartNumber),
        country_of_origin: cleanNullableString(countryOfOrigin),
        imported_by: cleanNullableString(importedBy),
        marketed_by: cleanNullableString(marketedBy),

        product_weight: toNonNegativeDecimal(productWeight, 2),
        weight_unit: weightUnit,
        product_length: toNonNegativeDecimal(productLength, 2),
        product_width: toNonNegativeDecimal(productWidth, 2),
        product_height: toNonNegativeDecimal(productHeight, 2),
        dimension_unit: dimensionUnit,

        material: cleanNullableString(material),
        colour: cleanNullableString(colour),
        size: cleanNullableString(size),
        model_number: cleanNullableString(modelNumber),
        model_name: cleanNullableString(modelName),
        warranty: cleanNullableString(warranty),

        package_contents: packageContents,
        package_weight: toNonNegativeDecimal(packageWeight, 2),
        package_length: toNonNegativeDecimal(packageLength, 2),
        package_width: toNonNegativeDecimal(packageWidth, 2),
        package_height: toNonNegativeDecimal(packageHeight, 2),

        usage_instructions: cleanNullableString(usageInstructions),
        care_instructions: cleanNullableString(careInstructions),
        safety_information: cleanNullableString(safetyInformation),
        return_policy: cleanNullableString(returnPolicy),

        meta_title: cleanNullableString(metaTitle),
        meta_description: cleanNullableString(metaDescription),
        meta_keywords: cleanNullableString(metaKeywords),
        canonical_url: cleanNullableString(canonicalUrl),

        specifications: kvListToRecord(specificationsList),
        additional_attributes: kvListToRecord(additionalAttributesList),
      },
    };
  }, [
    productCode,
    productName,
    slug,
    sku,
    barcode,
    brandId,
    categoryId,
    subcategoryId,
    vendorId,
    productType,
    productStatus,
    mrp,
    sellingPrice,
    costPrice,
    taxRate,
    hsnCode,
    stockQuantity,
    minStockQuantity,
    selectedWarehouseId,
    warehousesList,
    shortDescription,
    fullDescription,
    keyFeatures,
    highlights,
    manufacturerName,
    manufacturerPartNumber,
    countryOfOrigin,
    importedBy,
    marketedBy,
    productWeight,
    weightUnit,
    productLength,
    productWidth,
    productHeight,
    dimensionUnit,
    material,
    colour,
    size,
    modelNumber,
    modelName,
    warranty,
    packageContents,
    packageWeight,
    packageLength,
    packageWidth,
    packageHeight,
    usageInstructions,
    careInstructions,
    safetyInformation,
    returnPolicy,
    metaTitle,
    metaDescription,
    metaKeywords,
    canonicalUrl,
    specificationsList,
    additionalAttributesList,
  ]);

  /* ------------------------- Bidirectional Pricing Helpers ---------------- */
  function formatPriceNumber(val: number): string {
    const rounded = Math.round((val + Number.EPSILON) * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  }

  function handleMrpChange(nextMrp: string) {
    setMrp(nextMrp);
    const mrpNum = parseNullableNumber(nextMrp);
    const discNum = parseNullableNumber(discountPercent);
    const sellNum = parseNullableNumber(sellingPrice);

    if (mrpNum != null && mrpNum > 0) {
      if (discNum != null && discNum >= 0 && discNum <= 100) {
        const computedSelling = mrpNum * (1 - discNum / 100);
        setSellingPrice(formatPriceNumber(computedSelling));
      } else if (sellNum != null && sellNum >= 0 && sellNum <= mrpNum) {
        const computedDiscount = ((mrpNum - sellNum) / mrpNum) * 100;
        setDiscountPercent(formatPriceNumber(computedDiscount));
      }
    }
  }

  function handleDiscountPercentChange(nextDiscount: string) {
    setDiscountPercent(nextDiscount);
    const mrpNum = parseNullableNumber(mrp);
    const discNum = parseNullableNumber(nextDiscount);

    if (mrpNum != null && mrpNum > 0 && discNum != null && discNum >= 0 && discNum <= 100) {
      const computedSelling = mrpNum * (1 - discNum / 100);
      setSellingPrice(formatPriceNumber(computedSelling));
    }
  }

  function handleSellingPriceChange(nextSelling: string) {
    setSellingPrice(nextSelling);
    const mrpNum = parseNullableNumber(mrp);
    const sellNum = parseNullableNumber(nextSelling);

    if (!nextSelling.trim()) {
      setDiscountPercent('');
      return;
    }

    if (mrpNum != null && mrpNum > 0 && sellNum != null && sellNum >= 0 && sellNum <= mrpNum) {
      const computedDiscount = ((mrpNum - sellNum) / mrpNum) * 100;
      setDiscountPercent(formatPriceNumber(computedDiscount));
    } else {
      setDiscountPercent('');
    }
  }

  /* ------------------------- Smart Helper Actions ------------------------- */
  function handleGenerateProductCode() {
    const prefix = (productName.trim().slice(0, 3) || 'PRD')
      .toUpperCase()
      .replace(/[^A-Z]/g, 'X');
    const rand = Math.floor(10000 + Math.random() * 90000);
    setProductCode(`${prefix}-${rand}`);
  }

  function handleGenerateSku() {
    const catPart = selectedCategory ? selectedCategory.name.slice(0, 3).toUpperCase() : 'GEN';
    const namePart = (productName.trim().slice(0, 3) || 'ITM')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    const colorPart = colour.trim() ? `-${colour.trim().slice(0, 3).toUpperCase()}` : '';
    const rand = Math.floor(100 + Math.random() * 900);
    setSku(`MB-${catPart}-${namePart}${colorPart}-${rand}`);
  }

  function handleCopyDimensionsToPackage() {
    if (productWeight) setPackageWeight(productWeight);
    if (productLength) setPackageLength(productLength);
    if (productWidth) setPackageWidth(productWidth);
    if (productHeight) setPackageHeight(productHeight);
  }

  function handleAutoFillSeo() {
    if (!metaTitle.trim() && productName.trim()) {
      setMetaTitle(productName.trim().slice(0, 60));
    }
    if (!metaDescription.trim() && (shortDescription.trim() || fullDescription.trim())) {
      setMetaDescription((shortDescription.trim() || fullDescription.trim()).slice(0, 160));
    }
    const currentSlug = generateProductSlug(slug.trim() || productName.trim());
    if (!canonicalUrl.trim() && currentSlug) {
      setCanonicalUrl(`https://merabeta.com/products/${currentSlug}`);
    }
  }

  /* ======================================================================== */
  /* IMAGE HANDLERS (LOCAL + SERVER CRUD WHEN savedProductId EXISTS)          */
  /* ======================================================================== */

  function handlePickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!picked.length) return;

    const validationErr = validateProductImages(picked, images.length, totalImageBytes, 'add');
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setError('');
    const nextImages: GalleryImage[] = picked.map((file, idx) => ({
      key: uid(),
      src: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      file,
      isPrimary: images.length === 0 && idx === 0,
    }));
    setImages((prev) => [...prev, ...nextImages]);
  }

  async function handleReplaceImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    const targetKey = replacingKey;
    setReplacingKey(null);
    if (!file || !targetKey) return;

    const targetImg = images.find((img) => img.key === targetKey);
    if (!targetImg) return;

    const validationErr = validateProductImages([file], images.length - 1, 0, 'replace');
    if (validationErr) {
      setError(validationErr);
      return;
    }

    // If image already exists on server, replace via PUT /api/admin/products/:id/images/:imageId
    if (savedProductId && targetImg.backendImageId) {
      setImageActionBusyKey(targetKey);
      setError('');
      try {
        const replaced = await replaceAdminProductImage(
          savedProductId,
          targetImg.backendImageId,
          file
        );
        const newSrc = replaced?.image_url || URL.createObjectURL(file);
        setImages((prev) =>
          prev.map((img) =>
            img.key === targetKey
              ? {
                  ...img,
                  src: newSrc,
                  name: file.name,
                  size: file.size,
                  file: undefined,
                }
              : img
          )
        );
      } catch (err: any) {
        setError(err?.message || 'Failed to replace product image.');
      } finally {
        setImageActionBusyKey(null);
      }
    } else {
      const newUrl = URL.createObjectURL(file);
      if (targetImg.src.startsWith('blob:')) URL.revokeObjectURL(targetImg.src);
      setImages((prev) =>
        prev.map((img) =>
          img.key === targetKey
            ? { ...img, src: newUrl, name: file.name, size: file.size, file }
            : img
        )
      );
    }
  }

  async function handleSetPrimaryImage(targetImg: GalleryImage) {
    if (savedProductId && targetImg.backendImageId) {
      setImageActionBusyKey(targetImg.key);
      setError('');
      try {
        await setPrimaryProductImage(savedProductId, targetImg.backendImageId);
        setImages((prev) =>
          prev.map((img) => ({
            ...img,
            isPrimary: img.key === targetImg.key,
          }))
        );
      } catch (err: any) {
        setError(err?.message || 'Failed to set primary image.');
      } finally {
        setImageActionBusyKey(null);
      }
      return;
    }

    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        isPrimary: img.key === targetImg.key,
      }))
    );
  }

  async function handleRemoveImage(targetImg: GalleryImage) {
    if (savedProductId && targetImg.backendImageId) {
      setImageActionBusyKey(targetImg.key);
      setError('');
      try {
        await deleteAdminProductImage(savedProductId, targetImg.backendImageId);
      } catch (err: any) {
        setError(err?.message || 'Failed to delete product image.');
        setImageActionBusyKey(null);
        return;
      }
      setImageActionBusyKey(null);
    }

    setImages((prev) => {
      if (targetImg.src.startsWith('blob:')) URL.revokeObjectURL(targetImg.src);
      const remaining = prev.filter((img) => img.key !== targetImg.key);
      if (remaining.length > 0 && !remaining.some((img) => img.isPrimary)) {
        remaining[0] = { ...remaining[0], isPrimary: true };
      }
      return remaining;
    });
  }

  /* ======================================================================== */
  /* VALIDATION & SAVE LIFECYCLE (POST -> RETAIN ID -> UPLOAD IMAGES / PATCH) */
  /* ======================================================================== */

  function validateForm(): string {
    if (!productName.trim()) {
      return 'Product Name is required.';
    }
    if (!productCode.trim()) {
      return 'Product Code is required (click "Generate" or enter a unique product code).';
    }
    const finalSlug = generateProductSlug(slug.trim() || productName.trim());
    if (!finalSlug) {
      return 'URL Slug is required.';
    }
    if (pricingMetrics.sellingExceedsMrp) {
      return 'Selling Price cannot exceed MRP.';
    }
    return '';
  }

  function handleOpenPreview(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setError('');
    setPreviewOpen(true);
  }

  async function persistProductToBackend(statusOverride?: NewProductStatus) {
    if (saveInProgressRef.current) return;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setPreviewOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const effectiveStatus = statusOverride ?? productStatus;
    if (statusOverride) {
      setProductStatus(statusOverride);
    }

    const payloadToSend: NativeProductWritePayload = {
      ...nativeWritePayload,
      product_status: effectiveStatus,
    };

    saveInProgressRef.current = true;
    const isDraftSave = statusOverride === 'draft' && !previewOpen;
    if (isDraftSave) setSaving(true);
    else setSubmitting(true);
    setError('');
    setSuccessBanner('');

    let activeProductId = savedProductId;

    if (
      !activeProductId &&
      (parseNullableNumber(stockQuantity) ?? 0) > 0 &&
      !payloadToSend.initial_inventory
    ) {
      setError('No warehouse exists, so stock cannot be saved. Click "Create Main Warehouse" in Inventory Information, then save again.');
      setSaving(false);
      setSubmitting(false);
      saveInProgressRef.current = false;
      return;
    }

    try {
      // STEP 1: Create (POST) if no ID yet, or Update (PATCH) if ID already retained
      if (!activeProductId) {
        const payloadJson = JSON.stringify(payloadToSend);
        if (
          !createIdempotencyRef.current ||
          createIdempotencyRef.current.payloadJson !== payloadJson
        ) {
          createIdempotencyRef.current = {
            payloadJson,
            key: generateIdempotencyKey('prod-create'),
          };
        }

        const created = await createNativeAdminProduct(payloadToSend, {
          idempotencyKey: createIdempotencyRef.current.key,
        });

        const newId = String(created?.id ?? created?.product_id ?? '');
        if (!newId) {
          throw new Error('Product was created, but the server did not return a valid product ID.');
        }

        // Immediately retain returned `data.id` so any subsequent image/network retry uses PATCH
        activeProductId = newId;
        setSavedProductId(newId);
      } else {
        // On PATCH, omit stock_quantity and initial_inventory from product PATCH
        const { stock_quantity: _omitStockOnPatch, initial_inventory: _omitInvOnPatch, ...patchPayload } = payloadToSend;
        await updateNativeAdminProduct(activeProductId, patchPayload);

        // Update warehouse inventory via PUT /api/admin/products/:id/inventory
        const chosenWhId =
          toSafePositiveInt(selectedWarehouseId) ||
          (warehousesList.length > 0
            ? toSafePositiveInt(warehousesList[0].id ?? warehousesList[0].warehouse_id)
            : null);
        const stockQtyNum = parseNullableNumber(stockQuantity);
        if (chosenWhId != null && stockQtyNum != null && activeProductId) {
          try {
            await setAdminProductInventory(activeProductId, {
              warehouse_id: chosenWhId,
              total_quantity: Math.max(0, Math.floor(stockQtyNum)),
              available_quantity: Math.max(0, Math.floor(stockQtyNum)),
              minimum_stock_level: toNonNegativeSafeInt(minStockQuantity, 5) ?? 5,
            });
            const freshRows = await getAdminProductInventory(activeProductId);
            if (Array.isArray(freshRows) && freshRows.length > 0) {
              setInventoryRows(freshRows);
            }
          } catch (invErr: any) {
            throw new Error(`Product saved, but stock update failed: ${invErr?.message || 'inventory API error'}`);
          }
        } else if (stockQtyNum != null && stockQtyNum > 0 && chosenWhId == null) {
          throw new Error('Product saved, but stock was not updated: no warehouse exists. Click "Create Main Warehouse" in Inventory Information first.');
        }
      }

      // STEP 2: Upload any pending local image files separately
      const pendingFiles = images
        .filter((img) => Boolean(img.file) && !img.backendImageId)
        .map((img) => img.file as File);

      if (pendingFiles.length > 0 && activeProductId) {
        const filesSignature = pendingFiles
          .map((f) => `${f.name}:${f.size}:${f.lastModified}`)
          .join('|');

        if (
          !uploadImagesIdempotencyRef.current ||
          uploadImagesIdempotencyRef.current.filesSignature !== filesSignature
        ) {
          uploadImagesIdempotencyRef.current = {
            filesSignature,
            key: generateIdempotencyKey(`img-upload-${activeProductId}`),
          };
        }

        const uploadedRecords = await uploadAdminProductImages(activeProductId, pendingFiles, {
          idempotencyKey: uploadImagesIdempotencyRef.current.key,
        });

        // Refresh image list from server so local files are marked as persisted
        try {
          const serverImages =
            uploadedRecords.length > 0
              ? uploadedRecords
              : await getAdminProductImages(activeProductId);
          if (serverImages.length > 0) {
            setImages(
              serverImages.map((rec, idx) => ({
                key: `server-${rec.id}`,
                src: rec.image_url,
                name: `Image ${idx + 1}`,
                size: 0,
                backendImageId: String(rec.id),
                isPrimary: Boolean(rec.is_primary) || idx === 0,
              }))
            );
          }
        } catch {
          // Non-fatal if gallery refresh fails after upload succeeds
        }
      }

      setPreviewOpen(false);
      setSuccessBanner(
        effectiveStatus === 'draft'
          ? `Product draft saved (ID: #${activeProductId})!`
          : isEditing
          ? `Product #${activeProductId} updated successfully!`
          : `Product published successfully (ID: #${activeProductId})!`
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });

      setTimeout(() => {
        router.push('/admin/products');
        router.refresh();
      }, 1200);
    } catch (err: any) {
      const baseMsg = err?.message || 'Unable to save the product.';
      if (activeProductId && !savedProductId) {
        setError(
          `${baseMsg} (Product #${activeProductId} was saved; retry to finish uploading images or changes without creating a duplicate.)`
        );
      } else {
        setError(baseMsg);
      }
      setPreviewOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      saveInProgressRef.current = false;
      setSaving(false);
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="min-h-[calc(100vh-90px)] rounded-2xl bg-[#F8FAFC] px-4 sm:px-6 pt-5 pb-12 text-[#1E293B]">
        <form onSubmit={handleOpenPreview} noValidate className="space-y-6">
          <fieldset
            disabled={isLoadingProduct || saving || submitting || Boolean(imageActionBusyKey)}
            className="contents"
          >
            {/* ============================================================== */}
            {/* TOP HEADER BAR                                                 */}
            {/* ============================================================== */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5 shadow-2xs">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-[20px] sm:text-[22px] font-bold text-[#0F172A] tracking-tight">
                      {isEditing ? 'Edit Product' : 'Add New Product'}
                    </h2>
                    {savedProductId && (
                      <span className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#F47C35]">
                        ID: #{savedProductId}
                      </span>
                    )}
                    {(isLoadingProduct || loadingDropdowns) && (
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-[#64748B]">
                        <Loader2 size={14} className="animate-spin text-[#F47C35]" />
                        <span>Loading...</span>
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[13px] text-[#64748B]">
                    Fill in the product details, pricing, inventory, specifications, packaging, and SEO information below.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={saving || submitting || isLoadingProduct}
                    onClick={() => void persistProductToBackend('draft')}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#DCE0E8] bg-white px-4 text-[13px] font-semibold text-[#334155] transition-colors hover:bg-[#F8FAFC] disabled:opacity-60 cursor-pointer"
                  >
                    {saving && <Loader2 size={15} className="animate-spin text-[#64748B]" />}
                    <span>{saving ? 'Saving Draft...' : 'Save as Draft'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={saving || submitting || isLoadingProduct}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#F47C35] px-5 text-[13.5px] font-semibold text-white shadow-xs transition-colors hover:bg-[#E06924] disabled:opacity-60 cursor-pointer"
                  >
                    {submitting ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Eye size={15} />
                    )}
                    <span>
                      {submitting
                        ? 'Saving...'
                        : isEditing
                        ? 'Save Changes'
                        : 'Publish Product'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Alerts */}
            {error && (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700"
              >
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="rounded-lg p-1 text-red-500 hover:bg-red-100 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {successBanner && (
              <div
                role="status"
                className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-800"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={17} className="text-emerald-600 shrink-0" />
                  <span>{successBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessBanner('')}
                  className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {/* ============================================================== */}
            {/* ROW 1: TOP 2-COLUMN SECTION (BASIC INFO + IMAGES/TAXONOMY)     */}
            {/* ============================================================== */}
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              {/* LEFT: Basic Information & Descriptions */}
              <div className={CARD_CLASS}>
                <SectionHeader
                  icon={FileText}
                  title="Basic Information & Descriptions"
                  subtitle="Product title, URL slug, product code, summary, full description, key features, and highlights."
                />

                <div className="space-y-5">
                  {/* Product Name */}
                  <div>
                    <FieldLabel
                      htmlFor="product_name"
                      required
                      hint={`${productName.length}/255`}
                    >
                      Product Name
                    </FieldLabel>
                    <input
                      id="product_name"
                      type="text"
                      maxLength={255}
                      value={productName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProductName(val);
                        if (!slugLocked) {
                          setSlug(generateProductSlug(val));
                        }
                        if (error) setError('');
                      }}
                      placeholder="Enter product name"
                      className={INPUT_CLASS}
                    />
                  </div>

                  {/* Slug & Product Code */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <FieldLabel htmlFor="slug" required>
                        URL Slug
                      </FieldLabel>
                      <input
                        id="slug"
                        type="text"
                        value={slug}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSlug(val);
                          setSlugLocked(Boolean(val.trim()));
                        }}
                        placeholder="auto-generated-from-name"
                        className={`${INPUT_CLASS} font-mono text-[12.5px]`}
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor="product_code" required>
                        Product Code
                      </FieldLabel>
                      <div className="flex gap-2">
                        <input
                          id="product_code"
                          type="text"
                          value={productCode}
                          onChange={(e) => setProductCode(e.target.value)}
                          placeholder="e.g., PRD-48291"
                          className={`${INPUT_CLASS} font-mono text-[12.5px]`}
                        />
                        <button
                          type="button"
                          onClick={handleGenerateProductCode}
                          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-[#DCE0E8] bg-[#F8FAFC] px-3 text-[12px] font-semibold text-[#0D2B53] hover:border-[#F47C35] hover:text-[#F47C35] cursor-pointer"
                        >
                          <Wand2 size={14} />
                          <span>Generate</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Short Description */}
                  <div>
                    <FieldLabel
                      htmlFor="short_description"
                      hint={`${shortDescription.length}/300`}
                    >
                      Short Description
                    </FieldLabel>
                    <textarea
                      id="short_description"
                      rows={2}
                      maxLength={300}
                      value={shortDescription}
                      onChange={(e) => setShortDescription(e.target.value)}
                      placeholder="Enter a short summary of the product..."
                      className={TEXTAREA_CLASS}
                    />
                  </div>

                  {/* Full Description */}
                  <div>
                    <FieldLabel
                      htmlFor="full_description"
                      hint={`${fullDescription.length}/4000`}
                    >
                      Full Description
                    </FieldLabel>
                    <textarea
                      id="full_description"
                      rows={6}
                      maxLength={4000}
                      value={fullDescription}
                      onChange={(e) => setFullDescription(e.target.value)}
                      placeholder="Write the complete product description..."
                      className={TEXTAREA_CLASS}
                    />
                  </div>

                  {/* Key Features & Highlights */}
                  <div className="space-y-4 pt-1">
                    <div className={SUBCARD_CLASS}>
                      <FieldLabel
                        htmlFor="key_features_input"
                        hint={`${keyFeatures.length} added`}
                      >
                        Key Features
                      </FieldLabel>
                      <p className="mb-3 text-[12px] text-[#64748B]">
                        Press Enter to add each feature, or paste a multiline list.
                      </p>
                      <StringArrayBuilder
                        id="key_features_input"
                        items={keyFeatures}
                        onChange={setKeyFeatures}
                        placeholder="Type a key feature (e.g., 100% Organic Cotton) and press Enter"
                        emptyText="No key features added yet."
                      />
                    </div>

                    <div className={SUBCARD_CLASS}>
                      <FieldLabel
                        htmlFor="highlights_input"
                        hint={`${highlights.length} added`}
                      >
                        Product Highlights
                      </FieldLabel>
                      <p className="mb-3 text-[12px] text-[#64748B]">
                        Short standout highlights shown on the product card/page.
                      </p>
                      <StringArrayBuilder
                        id="highlights_input"
                        items={highlights}
                        onChange={setHighlights}
                        placeholder="Type a highlight (e.g., Hypoallergenic & Breathable) and press Enter"
                        emptyText="No highlights added yet."
                        quickSuggestions={[
                          '100% Organic',
                          'BPA Free',
                          'Dermatologically Tested',
                          'Made in India',
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Type & Status, Product Images, and Product Classification */}
              <div className="space-y-5">
                {/* 1. Product Type & Status Card */}
                <div className={CARD_CLASS}>
                  <h3 className="mb-3.5 text-[15px] font-bold text-[#0F172A]">
                    Product Type & Status
                  </h3>

                  {/* Product Type Selector: Simple Product vs Variable Product */}
                  <div>
                    <FieldLabel required>Product Type</FieldLabel>
                    <div className="grid grid-cols-2 gap-2.5">
                      {(
                        [
                          {
                            value: 'simple',
                            title: 'Simple Product',
                            desc: 'Single standalone item',
                            icon: Box,
                          },
                          {
                            value: 'variable',
                            title: 'Variable Product',
                            desc: 'Has size/color variants',
                            icon: Layers,
                          },
                        ] as const
                      ).map((opt) => {
                        const Icon = opt.icon;
                        const selected = productType === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setProductType(opt.value)}
                            className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all cursor-pointer ${
                              selected
                                ? 'border-[#F47C35] bg-[#FFF4ED]/70 text-[#0F172A] ring-2 ring-[#F47C35]/15'
                                : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] hover:border-[#CBD5E1] hover:bg-white'
                            }`}
                          >
                            <div className="flex w-full items-center justify-between">
                              <Icon
                                size={16}
                                className={selected ? 'text-[#F47C35]' : 'text-[#64748B]'}
                              />
                              <span
                                className={`h-3.5 w-3.5 rounded-full border ${
                                  selected
                                    ? 'border-[#F47C35] bg-[#F47C35] ring-2 ring-white ring-inset'
                                    : 'border-[#CBD5E1] bg-white'
                                }`}
                              />
                            </div>
                            <span className="mt-2 text-[12.5px] font-bold">{opt.title}</span>
                            <span className="text-[10.5px] text-[#64748B]">{opt.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Product Status Selector */}
                  <div className="mt-4">
                    <FieldLabel htmlFor="product_status" required>
                      Product Status
                    </FieldLabel>
                    <div className="relative">
                      <select
                        id="product_status"
                        value={productStatus}
                        onChange={(e) => setProductStatus(e.target.value as NewProductStatus)}
                        className={`${INPUT_CLASS} appearance-none pr-10 font-semibold`}
                      >
                        <option value="active">Active (Published)</option>
                        <option value="draft">Draft</option>
                        <option value="inactive">Inactive</option>
                        <option value="archived">Archived</option>
                      </select>
                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[#64748B]"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Product Images Upload Card */}
                <div className={CARD_CLASS}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-[15px] font-bold text-[#0F172A]">Product Image</h3>
                    <span className="text-[11px] font-semibold text-[#64748B]">
                      {images.length}/{MAX_PRODUCT_IMAGES} images
                    </span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={IMAGE_RULES.accept}
                    onChange={handlePickImages}
                    className="sr-only"
                  />
                  <input
                    ref={replaceInputRef}
                    type="file"
                    accept={IMAGE_RULES.accept}
                    onChange={(e) => void handleReplaceImageFile(e)}
                    className="sr-only"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-3 flex h-[170px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-3 text-center transition-colors hover:border-[#F47C35] hover:bg-[#FFF4ED]/30 cursor-pointer"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#F47C35] shadow-2xs">
                      <FileUp size={20} />
                    </div>
                    <span className="mt-2.5 text-[13px] font-bold text-[#0F172A]">
                      Upload Product Image
                    </span>
                    <span className="mt-1 text-[10.5px] text-[#64748B]">
                      {IMAGE_RULES.requirements}
                    </span>
                  </button>

                  {images.length > 0 && (
                    <div className="mt-3.5 grid grid-cols-3 gap-2">
                      {images.map((img, idx) => {
                        const isPrimary = img.isPrimary ?? idx === 0;
                        const isBusy = imageActionBusyKey === img.key;
                        return (
                          <div
                            key={img.key}
                            className="group relative aspect-square overflow-hidden rounded-xl border border-[#E2E8F0] bg-white"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.src}
                              alt={img.name}
                              className="h-full w-full object-contain"
                            />
                            <div className="absolute top-1 right-1 flex items-center gap-1">
                              {!isPrimary && (
                                <button
                                  type="button"
                                  title="Set as primary image"
                                  disabled={isBusy}
                                  onClick={() => void handleSetPrimaryImage(img)}
                                  className="flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-amber-500 shadow-2xs hover:bg-amber-50 cursor-pointer"
                                >
                                  <Star size={12} />
                                </button>
                              )}
                              <button
                                type="button"
                                title="Replace image"
                                disabled={isBusy}
                                onClick={() => {
                                  setReplacingKey(img.key);
                                  replaceInputRef.current?.click();
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-[#0D2B53] shadow-2xs hover:text-[#F47C35] cursor-pointer"
                              >
                                <RefreshCw size={11} />
                              </button>
                              <button
                                type="button"
                                title="Remove image"
                                disabled={isBusy}
                                onClick={() => void handleRemoveImage(img)}
                                className="flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-[#E33D25] shadow-2xs hover:bg-red-50 cursor-pointer"
                              >
                                {isBusy ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Trash2 size={12} />
                                )}
                              </button>
                            </div>
                            {isPrimary && (
                              <span className="absolute bottom-1 left-1 rounded bg-[#0D2B53] px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                Primary
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#64748B]">
                    <span>{(totalImageBytes / (1024 * 1024)).toFixed(2)} / 10.00 MiB selected</span>
                    <span>{images.length}/{MAX_PRODUCT_IMAGES}</span>
                  </div>
                </div>

                {/* 3. Product Classification Card */}
                <div className={CARD_CLASS}>
                  <h3 className="mb-3.5 text-[15px] font-bold text-[#0F172A]">
                    Product Classification
                  </h3>

                  <div className="space-y-4">
                    {/* Root Category */}
                    <div>
                      <FieldLabel htmlFor="category_id">Category</FieldLabel>
                      <div className="relative">
                        <select
                          id="category_id"
                          value={categoryId}
                          onChange={(e) => {
                            setCategoryId(e.target.value);
                            setSubcategoryId('');
                          }}
                          className={`${INPUT_CLASS} appearance-none pr-10`}
                        >
                          <option value="">Select category</option>
                          {categoriesList.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[#64748B]"
                        />
                      </div>
                    </div>

                    {/* Subcategory */}
                    <div>
                      <FieldLabel htmlFor="subcategory_id">Subcategory</FieldLabel>
                      <div className="relative">
                        <select
                          id="subcategory_id"
                          value={subcategoryId}
                          disabled={!selectedCategory}
                          onChange={(e) => setSubcategoryId(e.target.value)}
                          className={`${INPUT_CLASS} appearance-none pr-10`}
                        >
                          <option value="">
                            {selectedCategory
                              ? 'Select subcategory'
                              : 'Select a category first'}
                          </option>
                          {selectedCategory?.subcategories.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[#64748B]"
                        />
                      </div>
                    </div>

                    {/* Brand */}
                    <div>
                      <FieldLabel htmlFor="brand_id">Brand</FieldLabel>
                      <div className="relative">
                        <select
                          id="brand_id"
                          value={brandId}
                          onChange={(e) => setBrandId(e.target.value)}
                          className={`${INPUT_CLASS} appearance-none pr-10`}
                        >
                          <option value="">Unbranded / Select Brand</option>
                          {brandsList.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[#64748B]"
                        />
                      </div>
                    </div>

                    {/* Vendor */}
                    <div>
                      <FieldLabel htmlFor="vendor_id">Vendor</FieldLabel>
                      <div className="relative">
                        <select
                          id="vendor_id"
                          value={vendorId}
                          onChange={(e) => setVendorId(e.target.value)}
                          className={`${INPUT_CLASS} appearance-none pr-10`}
                        >
                          <option value="">Select vendor</option>
                          {vendorsList.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[#64748B]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* FROM PRICING DOWNWARDS: FULL 100% WIDTH                        */}
            {/* ============================================================== */}

            {/* 2. PRICING, TAX & INVENTORY (FULL WIDTH) */}
            <div className={CARD_CLASS}>
              <SectionHeader
                icon={DollarSign}
                title="Pricing, Tax & Inventory"
                subtitle="Configure MRP, selling price, cost price, GST tax rate, HSN code, SKU, barcode, and stock levels."
              />

              <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
                {/* Left: Product Pricing */}
                <div className={SUBCARD_CLASS}>
                  <h4 className="mb-3.5 text-[14px] font-bold text-[#0F172A]">
                    Product Pricing
                  </h4>

                  <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <FieldLabel htmlFor="mrp">MRP</FieldLabel>
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[14px] font-semibold text-[#64748B]">
                          ₹
                        </span>
                        <input
                          id="mrp"
                          type="number"
                          min="0"
                          step="0.01"
                          value={mrp}
                          onChange={(e) => handleMrpChange(e.target.value)}
                          placeholder="1000"
                          className={`${INPUT_CLASS} pl-8`}
                        />
                      </div>
                    </div>

                    <div>
                      <FieldLabel htmlFor="discount_percent">Discount (%)</FieldLabel>
                      <div className="relative">
                        <input
                          id="discount_percent"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={discountPercent}
                          onChange={(e) => handleDiscountPercentChange(e.target.value)}
                          placeholder="10"
                          className={`${INPUT_CLASS} pr-9`}
                        />
                        <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[13px] font-semibold text-[#64748B]">
                          %
                        </span>
                      </div>
                    </div>

                    <div>
                      <FieldLabel htmlFor="selling_price">Selling Price</FieldLabel>
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[14px] font-semibold text-[#F47C35]">
                          ₹
                        </span>
                        <input
                          id="selling_price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={sellingPrice}
                          onChange={(e) => handleSellingPriceChange(e.target.value)}
                          placeholder="900"
                          className={`${INPUT_CLASS} pl-8 font-semibold`}
                        />
                      </div>
                    </div>

                    <div>
                      <FieldLabel htmlFor="cost_price">Cost Price</FieldLabel>
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[14px] font-semibold text-[#64748B]">
                          ₹
                        </span>
                        <input
                          id="cost_price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={costPrice}
                          onChange={(e) => setCostPrice(e.target.value)}
                          placeholder="0.00"
                          className={`${INPUT_CLASS} pl-8`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live Margin & Discount Summary Bar */}
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-[12px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#64748B]">Discount:</span>
                      {pricingMetrics.sellingExceedsMrp ? (
                        <span className="font-semibold text-rose-600">
                          Selling price exceeds MRP!
                        </span>
                      ) : pricingMetrics.discountPct !== null ? (
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                          {pricingMetrics.discountPct}% OFF MRP
                        </span>
                      ) : (
                        <span className="text-[#94A3B8]">—</span>
                      )}
                    </div>

                    <span className="text-[#CBD5E1]">|</span>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[#64748B]">Profit Margin:</span>
                      {pricingMetrics.sellingBelowCost ? (
                        <span className="font-semibold text-amber-700">
                          Below cost (₹{pricingMetrics.profitPerUnit})
                        </span>
                      ) : pricingMetrics.profitPerUnit !== null ? (
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 font-bold text-blue-700">
                          ₹{pricingMetrics.profitPerUnit} ({pricingMetrics.marginPct}%)
                        </span>
                      ) : (
                        <span className="text-[#94A3B8]">—</span>
                      )}
                    </div>

                    {pricingMetrics.taxAmount !== null && (
                      <>
                        <span className="text-[#CBD5E1]">|</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#64748B]">Included Tax ({taxRate || 0}%):</span>
                          <span className="font-semibold text-[#334155]">
                            ₹{pricingMetrics.taxAmount}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Tax & Compliance */}
                <div className={SUBCARD_CLASS}>
                  <h4 className="mb-3.5 text-[14px] font-bold text-[#0F172A]">
                    Tax & Compliance
                  </h4>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel htmlFor="tax_rate">Tax Rate (GST %)</FieldLabel>
                      <div className="relative">
                        <input
                          id="tax_rate"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={taxRate}
                          onChange={(e) => setTaxRate(e.target.value)}
                          placeholder="18"
                          className={`${INPUT_CLASS} pr-9`}
                        />
                        <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[13px] font-semibold text-[#64748B]">
                          %
                        </span>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-[#64748B]">Slabs:</span>
                        {TAX_SLABS.map((slab) => (
                          <button
                            key={slab}
                            type="button"
                            onClick={() => setTaxRate(slab)}
                            className={`rounded-md px-2.5 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                              taxRate === slab
                                ? 'bg-[#F47C35] text-white'
                                : 'border border-[#E2E8F0] bg-white text-[#475569] hover:border-[#F47C35]'
                            }`}
                          >
                            {slab}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <FieldLabel htmlFor="hsn_code">HSN Code</FieldLabel>
                      <input
                        id="hsn_code"
                        type="text"
                        value={hsnCode}
                        onChange={(e) => setHsnCode(e.target.value)}
                        placeholder="e.g., 61112000"
                        className={`${INPUT_CLASS} font-mono`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Identification & Inventory across full width */}
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div className={SUBCARD_CLASS}>
                  <h4 className="mb-3.5 text-[14px] font-bold text-[#0F172A]">
                    Product Identification
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel htmlFor="sku">SKU (Stock Keeping Unit)</FieldLabel>
                      <div className="flex gap-2">
                        <input
                          id="sku"
                          type="text"
                          value={sku}
                          onChange={(e) => setSku(e.target.value)}
                          placeholder="e.g., MB-BAB-SWA-104"
                          className={`${INPUT_CLASS} font-mono text-[12.5px]`}
                        />
                        <button
                          type="button"
                          onClick={handleGenerateSku}
                          className="inline-flex h-11 shrink-0 items-center gap-1 rounded-xl border border-[#DCE0E8] bg-white px-3 text-[12px] font-semibold text-[#0D2B53] hover:border-[#F47C35] hover:text-[#F47C35] cursor-pointer"
                        >
                          <Wand2 size={14} />
                          <span>Auto</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <FieldLabel htmlFor="barcode">Barcode (EAN / UPC)</FieldLabel>
                      <input
                        id="barcode"
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        placeholder="e.g., 8901234567890"
                        className={`${INPUT_CLASS} font-mono text-[12.5px]`}
                      />
                    </div>
                  </div>
                </div>

                <div className={SUBCARD_CLASS}>
                  <div className="flex items-center justify-between mb-3.5">
                    <h4 className="text-[14px] font-bold text-[#0F172A]">
                      Inventory Information
                    </h4>
                    {warehousesList.length > 0 && (
                      <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {warehousesList.length} Warehouse{warehousesList.length > 1 ? 's' : ''} Connected
                      </span>
                    )}
                  </div>

                  {warehousesList.length === 0 && (
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                      <span>No warehouse exists yet, so stock cannot be saved.</span>
                      <button
                        type="button"
                        onClick={handleCreateMainWarehouse}
                        className="rounded-md bg-[#F47C35] px-3 py-1 font-semibold text-white hover:bg-[#E96F29] cursor-pointer"
                      >
                        Create Main Warehouse
                      </button>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <FieldLabel htmlFor="warehouse_id">Assigned Warehouse</FieldLabel>
                      <select
                        id="warehouse_id"
                        value={selectedWarehouseId}
                        onChange={(e) => setSelectedWarehouseId(e.target.value)}
                        className={INPUT_CLASS}
                      >
                        {warehousesList.length === 0 ? (
                          <option value="">No warehouse found</option>
                        ) : (
                          warehousesList.map((wh) => {
                            const whId = String(wh.id ?? wh.warehouse_id ?? '');
                            return (
                              <option key={whId} value={whId}>
                                {wh.warehouse_name || wh.warehouse_code} ({wh.city || 'Warehouse'})
                              </option>
                            );
                          })
                        )}
                      </select>
                    </div>

                    <div>
                      <FieldLabel htmlFor="stock_quantity">Stock Quantity</FieldLabel>
                      <input
                        id="stock_quantity"
                        type="number"
                        min="0"
                        step="1"
                        value={stockQuantity}
                        onChange={(e) => setStockQuantity(e.target.value)}
                        placeholder="0"
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor="min_stock_quantity">
                        Minimum Stock Level
                      </FieldLabel>
                      <input
                        id="min_stock_quantity"
                        type="number"
                        min="0"
                        step="1"
                        value={minStockQuantity}
                        onChange={(e) => setMinStockQuantity(e.target.value)}
                        placeholder="5"
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>

                  {/* Stock Table if live inventory rows exist */}
                  {inventoryRows.length > 0 && (
                    <div className="mt-4 overflow-hidden rounded-lg border border-[#E2E8F0]">
                      <table className="w-full text-left text-[12px]">
                        <thead className="bg-[#F8FAFC] text-[#475569] font-medium border-b border-[#E2E8F0]">
                          <tr>
                            <th className="px-3 py-2">Warehouse</th>
                            <th className="px-3 py-2">Total Stock</th>
                            <th className="px-3 py-2">Available</th>
                            <th className="px-3 py-2">Damaged</th>
                            <th className="px-3 py-2">Min Level</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                          {inventoryRows.map((row, idx) => (
                            <tr key={String(row.id ?? row.warehouse_id ?? idx)} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-medium text-slate-800">
                                {row.warehouse_name || row.warehouse_code || `Warehouse #${row.warehouse_id}`}
                              </td>
                              <td className="px-3 py-2 font-mono">{row.total_quantity}</td>
                              <td className="px-3 py-2 font-semibold text-emerald-700 font-mono">
                                {row.available_quantity}
                              </td>
                              <td className="px-3 py-2 text-rose-600 font-mono">{row.damaged_quantity || 0}</td>
                              <td className="px-3 py-2 text-slate-600 font-mono">{row.minimum_stock_level ?? 5}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. PRODUCT PROPERTIES, PHYSICAL SPECS & ATTRIBUTES (FULL WIDTH) */}
            <div className={CARD_CLASS}>
              <SectionHeader
                icon={Ruler}
                title="Product Properties & Physical Specifications"
                subtitle="Material, colour, size, model details, weight, dimensions, and custom specifications."
              />

              <div className="space-y-5">
                {/* Product Properties + Physical Specifications */}
                <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                  <div className={SUBCARD_CLASS}>
                    <h4 className="mb-3.5 text-[14px] font-bold text-[#0F172A]">
                      Product Properties
                    </h4>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <FieldLabel htmlFor="material">Material</FieldLabel>
                        <input
                          id="material"
                          type="text"
                          value={material}
                          onChange={(e) => setMaterial(e.target.value)}
                          placeholder="e.g., Organic Cotton"
                          className={INPUT_CLASS}
                        />
                      </div>

                      <div>
                        <FieldLabel htmlFor="colour">Colour</FieldLabel>
                        <input
                          id="colour"
                          type="text"
                          value={colour}
                          onChange={(e) => setColour(e.target.value)}
                          placeholder="e.g., Pastel Peach"
                          className={INPUT_CLASS}
                        />
                      </div>

                      <div>
                        <FieldLabel htmlFor="size">Size</FieldLabel>
                        <input
                          id="size"
                          type="text"
                          value={size}
                          onChange={(e) => setSize(e.target.value)}
                          placeholder="e.g., 0–6 Months"
                          className={INPUT_CLASS}
                        />
                      </div>

                      <div>
                        <FieldLabel htmlFor="model_name">Model Name</FieldLabel>
                        <input
                          id="model_name"
                          type="text"
                          value={modelName}
                          onChange={(e) => setModelName(e.target.value)}
                          placeholder="e.g., CloudSoft Series"
                          className={INPUT_CLASS}
                        />
                      </div>

                      <div>
                        <FieldLabel htmlFor="model_number">Model Number</FieldLabel>
                        <input
                          id="model_number"
                          type="text"
                          value={modelNumber}
                          onChange={(e) => setModelNumber(e.target.value)}
                          placeholder="e.g., CS-MSW-2026"
                          className={`${INPUT_CLASS} font-mono text-[12.5px]`}
                        />
                      </div>

                      <div>
                        <FieldLabel htmlFor="warranty">Warranty</FieldLabel>
                        <input
                          id="warranty"
                          type="text"
                          value={warranty}
                          onChange={(e) => setWarranty(e.target.value)}
                          placeholder="e.g., 6 Months Warranty"
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Physical Specifications */}
                  <div className={SUBCARD_CLASS}>
                    <h4 className="mb-3.5 text-[14px] font-bold text-[#0F172A]">
                      Physical Specifications (Net Product)
                    </h4>

                    <div className="space-y-4">
                      <div>
                        <FieldLabel htmlFor="product_weight">Product Weight</FieldLabel>
                        <div className="flex max-w-xs">
                          <input
                            id="product_weight"
                            type="number"
                            min="0"
                            step="0.01"
                            value={productWeight}
                            onChange={(e) => setProductWeight(e.target.value)}
                            placeholder="e.g., 250"
                            className={`${INPUT_CLASS} rounded-r-none border-r-0`}
                          />
                          <select
                            aria-label="Weight Unit"
                            value={weightUnit}
                            onChange={(e) => setWeightUnit(e.target.value as NewWeightUnit)}
                            className="h-11 rounded-r-xl border border-[#DCE0E8] bg-[#F1F5F9] px-4 text-[13px] font-semibold text-[#0D2B53] outline-none focus:border-[#F47C35]"
                          >
                            <option value="g">g</option>
                            <option value="kg">kg</option>
                            <option value="mg">mg</option>
                            <option value="lb">lb</option>
                            <option value="oz">oz</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <FieldLabel htmlFor="product_length">
                          Product Dimensions (Length × Width × Height)
                        </FieldLabel>
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[1fr_1fr_1fr_auto]">
                          <input
                            id="product_length"
                            type="number"
                            min="0"
                            step="0.01"
                            value={productLength}
                            onChange={(e) => setProductLength(e.target.value)}
                            placeholder="Length"
                            aria-label="Product Length"
                            className={INPUT_CLASS}
                          />
                          <input
                            id="product_width"
                            type="number"
                            min="0"
                            step="0.01"
                            value={productWidth}
                            onChange={(e) => setProductWidth(e.target.value)}
                            placeholder="Width"
                            aria-label="Product Width"
                            className={INPUT_CLASS}
                          />
                          <input
                            id="product_height"
                            type="number"
                            min="0"
                            step="0.01"
                            value={productHeight}
                            onChange={(e) => setProductHeight(e.target.value)}
                            placeholder="Height"
                            aria-label="Product Height"
                            className={INPUT_CLASS}
                          />
                          <select
                            aria-label="Dimension Unit"
                            value={dimensionUnit}
                            onChange={(e) => setDimensionUnit(e.target.value as NewDimensionUnit)}
                            className="h-11 rounded-xl border border-[#DCE0E8] bg-[#F1F5F9] px-4 text-[13px] font-semibold text-[#0D2B53] outline-none focus:border-[#F47C35]"
                          >
                            <option value="cm">cm</option>
                            <option value="mm">mm</option>
                            <option value="in">in</option>
                            <option value="m">m</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Information: specifications{} & additional_attributes{} */}
                <div className="grid gap-5 lg:grid-cols-2">
                  <KeyValueMapBuilder
                    title="Technical Specifications"
                    description="Key–value specifications shown in the product specs table."
                    pairs={specificationsList}
                    onChange={setSpecificationsList}
                    keyPlaceholder="Specification name"
                    valuePlaceholder="Enter specification value"
                    suggestedKeys={SUGGESTED_SPEC_KEYS}
                  />

                  <KeyValueMapBuilder
                    title="Additional Attributes"
                    description="Custom product attributes and extra metadata pairs (e.g. product_group_code)."
                    pairs={additionalAttributesList}
                    onChange={setAdditionalAttributesList}
                    keyPlaceholder="Attribute name"
                    valuePlaceholder="Enter attribute value"
                    suggestedKeys={SUGGESTED_ATTR_KEYS}
                  />
                </div>
              </div>
            </div>

            {/* 4. PACKAGING & MANUFACTURER INFORMATION (FULL WIDTH) */}
            <div className={CARD_CLASS}>
              <SectionHeader
                icon={Truck}
                title="Packaging & Manufacturer Information"
                subtitle="Package dimensions, box contents, and manufacturer/importer compliance details."
              />

              <div className="grid gap-5 xl:grid-cols-2">
                {/* Packaging Information */}
                <div className={SUBCARD_CLASS}>
                  <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-[14px] font-bold text-[#0F172A]">
                      Packaging Information
                    </h4>
                    <button
                      type="button"
                      onClick={handleCopyDimensionsToPackage}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE0E8] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#0D2B53] hover:border-[#F47C35] hover:text-[#F47C35] cursor-pointer"
                    >
                      <Copy size={13} />
                      <span>Copy from Product Dimensions</span>
                    </button>
                  </div>

                  <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <FieldLabel htmlFor="package_weight" hint={`in ${weightUnit}`}>
                        Package Weight
                      </FieldLabel>
                      <input
                        id="package_weight"
                        type="number"
                        min="0"
                        step="0.01"
                        value={packageWeight}
                        onChange={(e) => setPackageWeight(e.target.value)}
                        placeholder="320"
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor="package_length" hint={`in ${dimensionUnit}`}>
                        Package Length
                      </FieldLabel>
                      <input
                        id="package_length"
                        type="number"
                        min="0"
                        step="0.01"
                        value={packageLength}
                        onChange={(e) => setPackageLength(e.target.value)}
                        placeholder="24"
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor="package_width" hint={`in ${dimensionUnit}`}>
                        Package Width
                      </FieldLabel>
                      <input
                        id="package_width"
                        type="number"
                        min="0"
                        step="0.01"
                        value={packageWidth}
                        onChange={(e) => setPackageWidth(e.target.value)}
                        placeholder="18"
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor="package_height" hint={`in ${dimensionUnit}`}>
                        Package Height
                      </FieldLabel>
                      <input
                        id="package_height"
                        type="number"
                        min="0"
                        step="0.01"
                        value={packageHeight}
                        onChange={(e) => setPackageHeight(e.target.value)}
                        placeholder="5"
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <FieldLabel
                      htmlFor="package_contents_input"
                      hint={`${packageContents.length} items`}
                    >
                      Package Contents (What&apos;s in the Box)
                    </FieldLabel>
                    <StringArrayBuilder
                      id="package_contents_input"
                      items={packageContents}
                      onChange={setPackageContents}
                      placeholder="e.g., 1 × Main Unit, 1 × User Manual"
                      emptyText="Add items included inside the package."
                      quickSuggestions={[
                        '1 × Main Unit',
                        '1 × User Manual',
                        '1 × Warranty Card',
                      ]}
                    />
                  </div>
                </div>

                {/* Manufacturer Information */}
                <div className={SUBCARD_CLASS}>
                  <h4 className="mb-3.5 text-[14px] font-bold text-[#0F172A]">
                    Manufacturer Information
                  </h4>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel htmlFor="manufacturer_name">Manufacturer Name</FieldLabel>
                      <input
                        id="manufacturer_name"
                        type="text"
                        value={manufacturerName}
                        onChange={(e) => setManufacturerName(e.target.value)}
                        placeholder="Enter manufacturer name"
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor="manufacturer_part_number">
                        Manufacturer Part Number
                      </FieldLabel>
                      <input
                        id="manufacturer_part_number"
                        type="text"
                        value={manufacturerPartNumber}
                        onChange={(e) => setManufacturerPartNumber(e.target.value)}
                        placeholder="e.g., MPN-88412"
                        className={`${INPUT_CLASS} font-mono text-[12.5px]`}
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor="country_of_origin">Country of Origin</FieldLabel>
                      <input
                        id="country_of_origin"
                        type="text"
                        value={countryOfOrigin}
                        onChange={(e) => setCountryOfOrigin(e.target.value)}
                        placeholder="e.g., India"
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor="imported_by">Imported By</FieldLabel>
                      <input
                        id="imported_by"
                        type="text"
                        value={importedBy}
                        onChange={(e) => setImportedBy(e.target.value)}
                        placeholder="Importer name & address (if applicable)"
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <FieldLabel htmlFor="marketed_by">Marketed By</FieldLabel>
                      <input
                        id="marketed_by"
                        type="text"
                        value={marketedBy}
                        onChange={(e) => setMarketedBy(e.target.value)}
                        placeholder="Marketed by company name & address"
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. USAGE, CARE, SAFETY & RETURN POLICY (FULL WIDTH) */}
            <div className={CARD_CLASS}>
              <SectionHeader
                icon={ShieldCheck}
                title="Usage, Care, Safety & Return Policy"
                subtitle="Customer instructions for usage, washing/care, safety warnings, and return eligibility."
              />

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <div className={SUBCARD_CLASS}>
                  <FieldLabel htmlFor="usage_instructions">Usage Instructions</FieldLabel>
                  <textarea
                    id="usage_instructions"
                    rows={4}
                    value={usageInstructions}
                    onChange={(e) => setUsageInstructions(e.target.value)}
                    placeholder="How to use or assemble the product..."
                    className={TEXTAREA_CLASS}
                  />
                </div>

                <div className={SUBCARD_CLASS}>
                  <FieldLabel htmlFor="care_instructions">Care Instructions</FieldLabel>
                  <textarea
                    id="care_instructions"
                    rows={4}
                    value={careInstructions}
                    onChange={(e) => setCareInstructions(e.target.value)}
                    placeholder="Washing, storage, or maintenance instructions..."
                    className={TEXTAREA_CLASS}
                  />
                </div>

                <div className={SUBCARD_CLASS}>
                  <FieldLabel htmlFor="safety_information">Safety Information</FieldLabel>
                  <textarea
                    id="safety_information"
                    rows={4}
                    value={safetyInformation}
                    onChange={(e) => setSafetyInformation(e.target.value)}
                    placeholder="Important safety warnings or age advisories..."
                    className={TEXTAREA_CLASS}
                  />
                </div>

                <div className={SUBCARD_CLASS}>
                  <FieldLabel htmlFor="return_policy">Return Policy</FieldLabel>
                  <textarea
                    id="return_policy"
                    rows={4}
                    value={returnPolicy}
                    onChange={(e) => setReturnPolicy(e.target.value)}
                    placeholder="Specify return or replacement policy..."
                    className={TEXTAREA_CLASS}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-[#64748B]">Presets:</span>
                    {RETURN_POLICY_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setReturnPolicy(preset.text)}
                        className="rounded-md border border-[#E2E8F0] bg-white px-2 py-0.5 text-[10.5px] font-medium text-[#475569] transition-colors hover:border-[#F47C35] hover:text-[#F47C35] cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 6. SEO INFORMATION & SEARCH PREVIEW (FULL WIDTH) */}
            <div className={CARD_CLASS}>
              <SectionHeader
                icon={Globe}
                title="SEO Information"
                subtitle="Search engine meta title, description, keywords, and canonical URL."
                action={
                  <button
                    type="button"
                    onClick={handleAutoFillSeo}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE0E8] bg-[#F8FAFC] px-3.5 py-2 text-[12px] font-semibold text-[#0D2B53] hover:border-[#F47C35] hover:text-[#F47C35] cursor-pointer"
                  >
                    <Wand2 size={14} />
                    <span>Auto-fill from Product Info</span>
                  </button>
                }
              />

              <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FieldLabel
                      htmlFor="meta_title"
                      hint={`${metaTitle.length}/60 recommended`}
                    >
                      Meta Title
                    </FieldLabel>
                    <input
                      id="meta_title"
                      type="text"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      placeholder={productName || 'Enter SEO page title'}
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <FieldLabel
                      htmlFor="meta_description"
                      hint={`${metaDescription.length}/160 recommended`}
                    >
                      Meta Description
                    </FieldLabel>
                    <textarea
                      id="meta_description"
                      rows={3}
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      placeholder="Summary for search engine results..."
                      className={TEXTAREA_CLASS}
                    />
                  </div>

                  <div>
                    <FieldLabel htmlFor="meta_keywords">Meta Keywords</FieldLabel>
                    <input
                      id="meta_keywords"
                      type="text"
                      value={metaKeywords}
                      onChange={(e) => setMetaKeywords(e.target.value)}
                      placeholder="Comma-separated keywords"
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <FieldLabel htmlFor="canonical_url">Canonical URL</FieldLabel>
                    <input
                      id="canonical_url"
                      type="url"
                      value={canonicalUrl}
                      onChange={(e) => setCanonicalUrl(e.target.value)}
                      placeholder={`https://merabeta.com/products/${
                        generateProductSlug(slug || productName) || 'product-slug'
                      }`}
                      className={`${INPUT_CLASS} font-mono text-[12.5px]`}
                    />
                  </div>
                </div>

                {/* Live Google Search Snippet Preview */}
                <div className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[#64748B]">
                      <Search size={14} className="text-[#F47C35]" />
                      <span>Search Engine Preview</span>
                    </div>
                    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
                      <p className="truncate text-[12px] text-[#0F172A]">
                        merabeta.com › products ›{' '}
                        <span className="text-[#64748B]">
                          {generateProductSlug(slug || productName) || 'product-slug'}
                        </span>
                      </p>
                      <h4 className="mt-1 line-clamp-1 text-[17px] font-medium text-[#1A0DAB]">
                        {metaTitle.trim() || productName.trim() || 'Product Title Appears Here'}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[#4D5156]">
                        {metaDescription.trim() ||
                          shortDescription.trim() ||
                          fullDescription.trim() ||
                          'Add a meta description or short description to preview how search engines summarize this product.'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5 pt-3">
                    <button
                      type="button"
                      disabled={saving || submitting || isLoadingProduct}
                      onClick={() => void persistProductToBackend('draft')}
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#DCE0E8] bg-white px-5 text-[13.5px] font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-60 cursor-pointer"
                    >
                      {saving && <Loader2 size={15} className="animate-spin" />}
                      <span>{saving ? 'Saving Draft...' : 'Save as Draft'}</span>
                    </button>
                    <button
                      type="submit"
                      disabled={saving || submitting || isLoadingProduct}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#F47C35] px-6 text-[13.5px] font-semibold text-white shadow-xs hover:bg-[#E06924] disabled:opacity-60 cursor-pointer"
                    >
                      {submitting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      <span>
                        {submitting
                          ? 'Saving...'
                          : isEditing
                          ? 'Save Changes'
                          : 'Publish Product'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </fieldset>
        </form>
      </section>

      {/* ==================================================================== */}
      {/* PRODUCT REVIEW MODAL                                                 */}
      {/* ==================================================================== */}
      {previewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="schema-preview-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 p-3 sm:p-5 backdrop-blur-xs"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !submitting) setPreviewOpen(false);
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] px-6 py-4">
              <div>
                <h2
                  id="schema-preview-modal-title"
                  className="text-[18px] font-bold text-[#0F172A]"
                >
                  Product Summary Preview
                </h2>
                <p className="text-[12.5px] text-[#64748B]">
                  Review product details before saving to catalog.
                </p>
              </div>

              {!submitting && (
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  aria-label="Close modal"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
                >
                  <X size={18} />
                </button>
              )}
            </header>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6 text-[13px]">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                    <span className="text-[11px] text-[#64748B]">Product Type & Status</span>
                    <p className="mt-1 font-bold capitalize text-[#0F172A]">
                      {productType} Product · {productStatus}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                    <span className="text-[11px] text-[#64748B]">Selling Price / MRP</span>
                    <p className="mt-1 font-bold text-[#0F172A]">
                      ₹{sellingPrice || '0'}{' '}
                      <span className="font-normal text-[#64748B]">/ MRP ₹{mrp || '0'}</span>
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                    <span className="text-[11px] text-[#64748B]">SKU & HSN Code</span>
                    <p className="mt-1 font-mono font-semibold text-[#0F172A]">
                      {sku || '—'} · HSN: {hsnCode || '—'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                    <span className="text-[11px] text-[#64748B]">Inventory</span>
                    <p className="mt-1 font-bold text-[#0F172A]">
                      {stockQuantity || 0} units (Min: {minStockQuantity || 0})
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="rounded-xl border border-[#E2E8F0] p-4">
                    <h4 className="mb-2.5 text-[12px] font-bold uppercase text-[#F47C35]">
                      Core Product Details
                    </h4>
                    <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-[12.5px]">
                      <dt className="text-[#64748B]">Product Name</dt>
                      <dd className="font-semibold text-[#0F172A]">{productName || '—'}</dd>
                      <dt className="text-[#64748B]">Slug</dt>
                      <dd className="font-mono text-[#334155]">{nativeWritePayload.slug}</dd>
                      <dt className="text-[#64748B]">Product Code</dt>
                      <dd className="font-mono">{productCode || '—'}</dd>
                      <dt className="text-[#64748B]">Barcode</dt>
                      <dd className="font-mono">{barcode || '—'}</dd>
                      <dt className="text-[#64748B]">Category / Sub</dt>
                      <dd>
                        {selectedCategory?.name || categoryId || '—'}
                        {subcategoryId
                          ? ` / ${
                              selectedCategory?.subcategories.find((s) => s.id === subcategoryId)
                                ?.name || subcategoryId
                            }`
                          : ''}
                      </dd>
                      <dt className="text-[#64748B]">Brand / Vendor</dt>
                      <dd>
                        {brandsList.find((b) => b.id === brandId)?.name || brandId || '—'} /{' '}
                        {vendorsList.find((v) => v.id === vendorId)?.name || vendorId || '—'}
                      </dd>
                      <dt className="text-[#64748B]">Cost / Tax Rate</dt>
                      <dd>
                        ₹{costPrice || '—'} / {taxRate || 0}%
                      </dd>
                    </dl>
                  </div>

                  <div className="rounded-xl border border-[#E2E8F0] p-4">
                    <h4 className="mb-2.5 text-[12px] font-bold uppercase text-[#F47C35]">
                      Extended Specifications
                    </h4>
                    <dl className="grid grid-cols-[145px_1fr] gap-y-2 text-[12.5px]">
                      <dt className="text-[#64748B]">Key Features</dt>
                      <dd>{keyFeatures.length} items</dd>
                      <dt className="text-[#64748B]">Highlights</dt>
                      <dd>{highlights.length} items</dd>
                      <dt className="text-[#64748B]">Properties</dt>
                      <dd>
                        {[material, colour, size, modelName].filter(Boolean).join(' · ') || '—'}
                      </dd>
                      <dt className="text-[#64748B]">Weight & Dimensions</dt>
                      <dd>
                        {productWeight ? `${productWeight}${weightUnit}` : '—'} ·{' '}
                        {productLength || '0'}×{productWidth || '0'}×{productHeight || '0'}{' '}
                        {dimensionUnit}
                      </dd>
                      <dt className="text-[#64748B]">Manufacturer</dt>
                      <dd>
                        {manufacturerName || '—'} ({countryOfOrigin || '—'})
                      </dd>
                      <dt className="text-[#64748B]">Package Contents</dt>
                      <dd>{packageContents.length} items</dd>
                      <dt className="text-[#64748B]">Specifications</dt>
                      <dd>
                        {Object.keys(nativeWritePayload.details?.specifications || {}).length} keys
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <footer className="flex items-center justify-end gap-3 border-t border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setPreviewOpen(false)}
                className="h-10 rounded-xl border border-[#DCE0E8] bg-white px-4 text-[13px] font-semibold text-[#334155] hover:bg-[#F1F5F9] disabled:opacity-60 cursor-pointer"
              >
                Back to Editing
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void persistProductToBackend()}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#F47C35] px-6 text-[13px] font-semibold text-white shadow-xs hover:bg-[#E06924] disabled:opacity-60 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                <span>
                  {submitting
                    ? 'Saving...'
                    : isEditing
                    ? 'Confirm & Update'
                    : 'Confirm & Publish'}
                </span>
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

export default function ProductEditor({ initialIsEdit = false }: ProductEditorProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#F47C35] border-t-transparent" />
        </div>
      }
    >
      <ProductEditorContent initialIsEdit={initialIsEdit} />
    </Suspense>
  );
}
