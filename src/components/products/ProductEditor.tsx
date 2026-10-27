'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  FileUp,
  Loader2,
  Trash2,
  X,
  Star,
  RefreshCw,
} from 'lucide-react';
import {
  createAdminProduct,
  updateAdminProduct,
  getAdminProductById,
  getAdminProductImages,
  deleteAdminProductImage,
  setPrimaryProductImage,
  replaceAdminProductImage,
  getAdminProductVariants,
  createAdminProductVariant,
  updateAdminProductVariant,
  deleteAdminProductVariant,
  resolveProductImageUrls,
  generateProductSlug,
  MAX_PRODUCT_IMAGES,
  MAX_TOTAL_IMAGE_BYTES,
} from '@/services/api/adminProductsApi';
import { getAdminCategories, getAllAdminCategories } from '@/services/api/adminCategoriesApi';
import { getAllAdminBrands } from '@/services/api/adminBrandsApi';
import {
  getAllAdminVariantAttributes,
  createAdminVariantAttribute,
  updateAdminVariantAttribute,
} from '@/services/api/adminVariantAttributesApi';
import { ProductStatus, WeightUnit, DimensionUnit } from '@/types/api';

/* ------------------------------------------------------------------ */
/* Option data & types                                                */
/* ------------------------------------------------------------------ */
interface Subcategory { id: string; name: string; active?: boolean }
interface Category { id: string; name: string; active?: boolean; subs: Subcategory[] }
interface VariantType { id: string; name: string; terms: { id: string; name: string }[] }

const IMAGE_RULES = {
  maxFiles: MAX_PRODUCT_IMAGES,
  maxBytes: MAX_TOTAL_IMAGE_BYTES,
  maxTotalBytes: MAX_TOTAL_IMAGE_BYTES,
  accept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
  requirements: 'JPG, PNG or WebP · Max 6 images · Max 10 MB total',
};

const TERM_IMAGE_REQUIREMENTS = IMAGE_RULES.requirements;

/* ------------------------------ helpers ----------------------------- */
const INPUT_CLASS =
  'h-12 w-full rounded-lg border border-[#D7D7D7] bg-white px-4 text-[14px] outline-none placeholder:text-[#A6A6A6] focus:border-[#F47C35] focus:ring-2 focus:ring-[#F47C35]/10';

const TABS = [
  { id: 'inventory', label: 'Inventory & Pricing' },
  { id: 'shipping', label: 'Specifications' },
  { id: 'variants', label: 'Variants' },
  { id: 'terms', label: 'Terms' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const BULLET_LINE = /^(\s*)[•●▪◦*-]\s+/;

function num(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function salePriceFrom(regular: string, offer: string): string {
  const a = num(regular);
  const r = num(offer);
  if (a == null || a <= 0 || r == null || r < 0 || r > 99.99) return '';
  const val = Math.round((a * (1 - r / 100) + Number.EPSILON) * 100) / 100;
  return Number.isInteger(val) ? String(val) : val.toFixed(2);
}

function offerPercentFrom(regular: string, sale: string): string {
  const reg = num(regular);
  const s = num(sale);
  if (reg == null || reg <= 0 || s == null || s < 0 || s > reg) return '';
  const pct = Math.round((((reg - s) / reg) * 100 + Number.EPSILON) * 100) / 100;
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(2);
}

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function parseDetails(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/([^\n])\s+(?=[•●▪◦]\s*)/g, '$1\n');
  const seen = new Map<string, string>();
  normalized
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[•●▪◦*-]+|\d{1,3}[.)])\s*/, '').trim())
    .filter(Boolean)
    .forEach((l) => {
      const k = l.toLocaleLowerCase();
      if (!seen.has(k)) seen.set(k, l);
    });
  return [...seen.values()];
}


/* ------------------------------ small UI ---------------------------- */
function Label({ htmlFor, required, children }: { htmlFor?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[14px] font-medium text-[#202020]">
      {children}
      {required && <span className="text-[#E33D25]">*</span>}
    </label>
  );
}

function Select({
  id,
  value,
  placeholder,
  options,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT_CLASS} appearance-none pr-11 disabled:cursor-not-allowed disabled:bg-[#F2F2F2] disabled:text-[#888] ${
          value ? 'text-[#292929]' : 'text-[#A6A6A6]'
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={17}
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[#A0A0A0]"
      />
    </div>
  );
}

function BulletTextarea({
  id,
  value,
  onValueChange,
  maxLength,
  ...rest
}: {
  id: string;
  value: string;
  onValueChange: (v: string) => void;
  maxLength?: number;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'id'>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [notice, setNotice] = useState('');

  function apply(r: { value: string; start: number; end: number }) {
    if (maxLength !== undefined && r.value.length > maxLength) {
      setNotice(`This change exceeds the ${maxLength} character limit.`);
      return;
    }
    setNotice('');
    onValueChange(r.value);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(r.start, r.end);
    });
  }

  function toggleBullets() {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const lineStart = s === 0 ? 0 : value.lastIndexOf('\n', s - 1) + 1;
    const endIdx = e > s && value[e - 1] === '\n' ? e - 1 : e;
    const nl = value.indexOf('\n', endIdx);
    const lineEnd = nl < 0 ? value.length : nl;
    const lines = value.slice(lineStart, lineEnd).split('\n');
    const allBulleted = lines.every((l) => BULLET_LINE.test(l));
    const out = lines
      .map((l) => (allBulleted ? l.replace(BULLET_LINE, '$1') : BULLET_LINE.test(l) ? l : '• ' + l))
      .join('\n');
    apply({ value: value.slice(0, lineStart) + out + value.slice(lineEnd), start: lineStart, end: lineStart + out.length });
  }

  function onKeyDown(ev: React.KeyboardEvent<HTMLTextAreaElement>) {
    rest.onKeyDown?.(ev);
    if (
      ev.defaultPrevented ||
      ev.nativeEvent.isComposing ||
      ev.key !== 'Enter' ||
      ev.shiftKey ||
      ev.ctrlKey ||
      ev.metaKey ||
      ev.altKey
    )
      return;
    const s = ev.currentTarget.selectionStart;
    const e = ev.currentTarget.selectionEnd;
    if (s !== e) return;
    const ls = s === 0 ? 0 : value.lastIndexOf('\n', s - 1) + 1;
    const m = value.slice(ls, s).match(/^(\s*)([•●▪◦*-])\s+(.*)$/);
    if (!m) return;
    ev.preventDefault();
    if (!m[3].trim()) {
      apply({ value: value.slice(0, ls) + value.slice(s), start: ls, end: ls });
      return;
    }
    const ins = '\n' + m[1] + m[2] + ' ';
    apply({ value: value.slice(0, s) + ins + value.slice(e), start: s + ins.length, end: s + ins.length });
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-label="Toggle bullet points"
          aria-controls={id}
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleBullets}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 5h.01M3 12h.01M3 19h.01M8 5h13M8 12h13M8 19h13" />
          </svg>
          Bullet points
        </button>
        <span id={`${id}-help`} className="text-sm text-gray-600">
          Select lines to add or remove bullets. Enter adds a bullet; Enter on an empty bullet ends the list.
        </span>
      </div>
      <textarea
        {...rest}
        id={id}
        ref={ref}
        maxLength={maxLength}
        value={value}
        aria-describedby={`${id}-help ${id}-notice`}
        onChange={(e) => {
          setNotice('');
          onValueChange(e.target.value);
        }}
        onKeyDown={onKeyDown}
      />
      <p id={`${id}-notice`} role="status" className="text-sm text-red-700">
        {notice}
      </p>
    </div>
  );
}

/* ------------------------------- types ------------------------------ */
interface GalleryImage {
  key: string;
  src: string;
  name: string;
  size: number;
  file?: File;
  backendImageId?: string;
  isPrimary?: boolean;
}
interface Term {
  key: string;
  termId: string;
  backendVariantId?: string | number;
  variantTypeId: string;
  variantTypeName: string;
  name: string;
  sku: string;
  variantName: string;
  unitCount: string;
  weightGrams: string;
  barcode: string;
  regularPrice: string;
  offerPercent: string;
  salePrice: string;
  stockQuantity: string;
  description: string;
  image: GalleryImage | null;
}

const GST_PRESETS = ['0', '5', '12', '18', '28'];
const HSN_PRESETS = [
  { value: '961900', label: '961900 · Diapers & Sanitary' },
  { value: '902110', label: '902110 · Orthopedic Supports' },
  { value: '901890', label: '901890 · Medical Instruments' },
  { value: '300590', label: '300590 · Bandages & Dressings' },
  { value: '871310', label: '871310 · Wheelchairs & Mobility' },
];
const AUDIENCE_PRESETS = [
  'Adults',
  'Seniors / Elderly',
  'Unisex Adults',
  'Men',
  'Women',
  'Children / Infants',
  'Patients / Post-Surgery',
];
const PACKAGE_TYPE_PRESETS = [
  'Pouch / Pack',
  'Box',
  'Bottle',
  'Strip',
  'Tube',
  'Canister',
  'Carton',
];
const SHELF_LIFE_PRESETS = [
  '6 Months',
  '12 Months',
  '18 Months',
  '24 Months',
  '36 Months',
  '60 Months',
  'No Expiry',
];
const MATERIAL_PRESETS = [
  'Non-woven Cotton',
  'Breathable PE Film',
  'Pure Cotton',
  'Medical Grade Silicone',
  'Neoprene & Nylon',
  'Aluminium Alloy',
  'ABS Plastic',
];
const COLOUR_PRESETS = ['White', 'Blue', 'Black', 'Grey', 'Beige', 'Green'];
const HAZARDOUS_PRESETS = [
  'Non-Hazardous',
  'For External Use Only',
  'Keep out of reach of children',
  'Flammable — Keep away from heat',
];
const ORIGIN_PRESETS = ['India', 'China', 'Germany', 'USA', 'Japan', 'Taiwan'];
const UNIT_COUNT_PRESETS = ['1', '2', '5', '10', '15', '20', '30', '60'];

function PresetChipsWithCustom({
  id,
  value,
  onChange,
  presets,
  placeholder,
  type = 'text',
  suffix = '',
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  presets: (string | { value: string; label: string })[];
  placeholder?: string;
  type?: 'text' | 'number';
  suffix?: string;
}) {
  const normalizedPresets = presets.map((p) =>
    typeof p === 'string' ? { value: p, label: `${p}${suffix}` } : p
  );
  const isPresetMatch = normalizedPresets.some((p) => p.value === value);
  const [customMode, setCustomMode] = useState(false);
  const showCustomInput = customMode || (Boolean(value) && !isPresetMatch);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {normalizedPresets.map((p) => {
          const active = !customMode && value === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => {
                setCustomMode(false);
                onChange(value === p.value ? '' : p.value);
              }}
              className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition cursor-pointer ${
                active
                  ? 'border-[#F47C35] bg-[#FFF4EE] text-[#F47C35] font-semibold'
                  : 'border-[#E2E8F0] bg-white text-[#475569] hover:bg-slate-50'
              }`}
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setCustomMode(true);
            if (isPresetMatch) onChange('');
          }}
          className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition cursor-pointer ${
            showCustomInput
              ? 'border-[#F47C35] bg-[#FFF4EE] text-[#F47C35]'
              : 'border-dashed border-[#CBD5E1] bg-slate-50 text-[#64748B] hover:border-[#F47C35] hover:text-[#F47C35]'
          }`}
        >
          + Custom
        </button>
      </div>
      {showCustomInput && (
        <input
          id={id}
          type={type}
          step={type === 'number' ? '0.01' : undefined}
          min={type === 'number' ? '0' : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Enter custom value...'}
          className={INPUT_CLASS}
        />
      )}
    </div>
  );
}

export interface ProductEditorProps {
  initialIsEdit?: boolean;
}

/* ------------------------------- page ------------------------------- */
function ProductEditorContent({ initialIsEdit = false }: ProductEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get('id') ?? null;
  const isEditing = Boolean(editId || initialIsEdit);
  const [isLoadingProduct, setIsLoadingProduct] = useState(Boolean(editId));

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [productStatus, setProductStatus] = useState<ProductStatus>('active');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [detailsText, setDetailsText] = useState('');
  const [details, setDetails] = useState<string[]>([]);
  const [productType, setProductType] = useState<'SIMPLE' | 'VARIABLE'>('VARIABLE');
  const [tab, setTab] = useState<TabId>('inventory');
  const [productCode, setProductCode] = useState('');
  const [sku, setSku] = useState('');
  const [minQty, setMinQty] = useState('1');
  const [maxQty, setMaxQty] = useState('');
  const [offer, setOffer] = useState('');
  const [regular, setRegular] = useState('');
  const [sale, setSale] = useState('');
  const [specialDiscountEnabled, setSpecialDiscountEnabled] = useState(false);
  const [specialDiscountPercent, setSpecialDiscountPercent] = useState('0');
  const [festivalOfferEnabled, setFestivalOfferEnabled] = useState(false);
  const [festivalOfferPercent, setFestivalOfferPercent] = useState('0');
  const [serverEffectivePrice, setServerEffectivePrice] = useState<string>('');
  const [stock, setStock] = useState('0');

  // Specifications state (Page 7 of Handoff)
  const [targetAudience, setTargetAudience] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [gstRate, setGstRate] = useState('');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('g');
  const [unitCount, setUnitCount] = useState('');
  const [packageLength, setPackageLength] = useState('');
  const [packageBreadth, setPackageBreadth] = useState('');
  const [packageHeight, setPackageHeight] = useState('');
  const [dimensionUnit, setDimensionUnit] = useState<DimensionUnit>('cm');
  const [material, setMaterial] = useState('');
  const [colour, setColour] = useState('');
  const [packageType, setPackageType] = useState('');
  const [shelfLife, setShelfLife] = useState('');
  const [waterResistant, setWaterResistant] = useState<string>(''); // '' | 'true' | 'false'
  const [hazardousClause, setHazardousClause] = useState('');
  const [manufacturedIn, setManufacturedIn] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [packerName, setPackerName] = useState('');
  const [packerAddress, setPackerAddress] = useState('');
  const [sameAsManufacturer, setSameAsManufacturer] = useState(false);
  const [keywordsText, setKeywordsText] = useState('');
  const [keywordDraft, setKeywordDraft] = useState('');
  const [initialVariantIds, setInitialVariantIds] = useState<(string | number)[]>([]);
  const [replacingImageKey, setReplacingImageKey] = useState<string | null>(null);
  const [deletingImageKey, setDeletingImageKey] = useState<string | null>(null);
  const [settingPrimaryKey, setSettingPrimaryKey] = useState<string | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const [brandsList, setBrandsList] = useState<{ id: string; name: string }[]>([]);
  const [brand, setBrand] = useState('');
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [variantTypesList, setVariantTypesList] = useState<VariantType[]>([]);
  const [selectedVariantTypeIds, setSelectedVariantTypeIds] = useState<string[]>([]);
  const [activeVariantTabId, setActiveVariantTabId] = useState<string>('');
  const [customVariantTypeName, setCustomVariantTypeName] = useState('');
  const [customOptionInputByVariant, setCustomOptionInputByVariant] = useState<Record<string, string>>({});
  const [activeOptionByVariant, setActiveOptionByVariant] = useState<Record<string, string>>({});
  const [terms, setTerms] = useState<Term[]>([]);
  const [openTerm, setOpenTerm] = useState<string | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [termError, setTermError] = useState('');

  // Load live categories, brands, and variant attribute definitions from backend
  useEffect(() => {
    async function fetchCategoriesAndBrands() {
      try {
        const [all, liveBrands, liveAttrDefs] = await Promise.all([
          getAllAdminCategories(),
          getAllAdminBrands().catch(() => []),
          getAllAdminVariantAttributes().catch(() => []),
        ]);
        if (Array.isArray(liveBrands) && liveBrands.length > 0) {
          setBrandsList(
            liveBrands.map((b) => ({
              id: String(b.brand_id ?? b.id),
              name: b.brand_name,
            }))
          );
        }
        const IGNORED_VARIANT_KEYS = new Set([
          'hsn',
          'hsn_code',
          'gst_percent',
          'gst_rate',
          'source_attributes',
        ]);
        const validAttrDefs = Array.isArray(liveAttrDefs)
          ? liveAttrDefs.filter((a) => !IGNORED_VARIANT_KEYS.has((a.name || '').toLowerCase()))
          : [];
        if (validAttrDefs.length > 0) {
          setVariantTypesList(
            validAttrDefs.map((attr) => {
              const attrId = String(attr.id);
              const vals = Array.isArray(attr.values) ? attr.values : [];
              return {
                id: attrId,
                name: attr.name,
                terms: vals.map((val, i) => ({
                  id: `${attrId}-opt-${i}`,
                  name: val,
                })),
              };
            })
          );
        } else {
          setVariantTypesList([
            {
              id: 'size',
              name: 'Size',
              terms: ['S', 'M', 'L', 'XL', 'XXL'].map((val, i) => ({
                id: `size-opt-${i}`,
                name: val,
              })),
            },
          ]);
        }
        if (Array.isArray(all) && all.length > 0) {
          const roots = all.filter((c) => c.parent_category_id == null);
          const children = all.filter((c) => c.parent_category_id != null);
          const tree: Category[] = (roots.length > 0 ? roots : all).map((r) => {
            const rId = String(r.category_id ?? r.id);
            const subs = children
              .filter((ch) => String(ch.parent_category_id) === rId)
              .map((ch) => ({
                id: String(ch.category_id ?? ch.id),
                name: ch.category_name || ch.name || `Category #${ch.category_id ?? ch.id}`,
                active: ch.is_active !== false,
              }));
            return {
              id: rId,
              name: r.category_name || r.name || `Category #${rId}`,
              active: r.is_active !== false,
              subs,
            };
          });
          setCategoriesList(tree);
        }
      } catch (err) {
        console.warn('Could not load live categories:', err);
      }
    }
    void fetchCategoriesAndBrands();
  }, []);

  // When a root category is selected, fetch its sub-categories from backend (?parent_category_id=...)
  useEffect(() => {
    const rootNum = categoryId ? Number(categoryId) : NaN;
    if (!rootNum || isNaN(rootNum)) return;
    let cancelled = false;
    async function fetchSubsForRoot() {
      try {
        const res = await getAdminCategories({ parent_category_id: rootNum, limit: 100 });
        if (cancelled || !Array.isArray(res.data)) return;
        const fetchedSubs: Subcategory[] = res.data.map((ch) => ({
          id: String(ch.category_id ?? ch.id),
          name: ch.category_name || ch.name || `Category #${ch.category_id ?? ch.id}`,
          active: ch.is_active !== false,
        }));
        setCategoriesList((prev) =>
          prev.map((cat) => {
            if (cat.id !== String(rootNum)) return cat;
            const mergedMap = new Map<string, Subcategory>();
            for (const s of cat.subs) mergedMap.set(s.id, s);
            for (const s of fetchedSubs) mergedMap.set(s.id, s);
            return { ...cat, subs: Array.from(mergedMap.values()) };
          })
        );
      } catch (err) {
        console.warn('Could not load sub-categories for root:', err);
      }
    }
    void fetchSubsForRoot();
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  // Load existing product if editId is provided
  useEffect(() => {
    if (!editId) {
      setIsLoadingProduct(false);
      return;
    }
    const currentId = editId;
    async function loadProduct(id: string) {
      setIsLoadingProduct(true);
      try {
        const prod = await getAdminProductById(id);
        if (prod) {
          const prodName = prod.product_name || prod.name || '';
          setName(prodName);
          setSlug(prod.slug || generateProductSlug(prodName));
          setSlugTouched(true);
          setProductStatus(prod.product_status || 'active');
          setShortDescription(prod.short_description || '');
          setDescription(prod.description || '');
          if (prod.brand_id != null) {
            setBrand(String(prod.brand_id));
          }
          if (Array.isArray(prod.categories) && prod.categories.length > 0) {
            const primary =
              prod.categories.find((c) => c.ProductCategory?.is_primary) || prod.categories[0];
            const pId = String(primary.category_id ?? primary.id ?? '');
            const parentId =
              primary.parent_category_id != null ? String(primary.parent_category_id) : '';
            if (parentId) {
              setCategoryId(parentId);
              setSubCategoryId(pId);
            } else {
              setCategoryId(pId);
              setSubCategoryId('');
            }
          }
          setProductType(prod.product_type === 'variable' ? 'VARIABLE' : 'SIMPLE');
          setProductCode(prod.product_code || '');
          setSku(prod.sku || '');
          setMinQty(String(prod.min_order_quantity ?? 1));
          setMaxQty(prod.max_order_quantity != null ? String(prod.max_order_quantity) : '');
          setStock(String(prod.stock_quantity ?? prod.stock ?? 0));

          const regVal = prod.regular_price ?? prod.mrp ?? prod.price;
          const saleVal = prod.sale_price ?? prod.offer_price;
          const regStr = regVal != null ? String(regVal) : '';
          const saleStr = saleVal != null ? String(saleVal) : '';
          const offerStr =
            prod.offer_percent != null
              ? String(prod.offer_percent)
              : regStr && saleStr
              ? offerPercentFrom(regStr, saleStr)
              : '';
          setRegular(regStr);
          setSale(saleStr);
          setOffer(offerStr);
          setSpecialDiscountEnabled(Boolean(prod.special_discount_enabled));
          setSpecialDiscountPercent(String(prod.special_discount_percent ?? 0));
          setFestivalOfferEnabled(Boolean(prod.festival_offer_enabled));
          setFestivalOfferPercent(String(prod.festival_offer_percent ?? 0));
          setServerEffectivePrice(
            prod.effective_price != null ? String(prod.effective_price) : ''
          );

          // Specifications
          const firstVarAttrs: Record<string, any> =
            Array.isArray(prod.variants) && prod.variants[0]?.attributes
              ? (prod.variants[0].attributes as Record<string, any>)
              : {};
          setTargetAudience(prod.target_audience || '');
          setHsnCode(prod.hsn_code || (firstVarAttrs.hsn ? String(firstVarAttrs.hsn) : ''));
          setGstRate(
            prod.gst_rate != null
              ? String(prod.gst_rate)
              : firstVarAttrs.gst_percent != null
              ? String(firstVarAttrs.gst_percent)
              : ''
          );
          setWeight(prod.weight != null ? String(prod.weight) : '');
          setWeightUnit(prod.weight_unit || 'g');
          setUnitCount(prod.unit_count != null ? String(prod.unit_count) : '');
          setPackageLength(prod.package_length != null ? String(prod.package_length) : '');
          setPackageBreadth(prod.package_breadth != null ? String(prod.package_breadth) : '');
          setPackageHeight(prod.package_height != null ? String(prod.package_height) : '');
          setDimensionUnit(prod.dimension_unit || 'cm');
          setMaterial(prod.material || '');
          setColour(prod.colour || '');
          setPackageType(prod.package_type || '');
          setShelfLife(prod.shelf_life || '');
          setWaterResistant(
            prod.water_resistant === true
              ? 'true'
              : prod.water_resistant === false
              ? 'false'
              : ''
          );
          setHazardousClause(prod.hazardous_clause || '');
          setManufacturedIn(prod.manufactured_in || '');
          setCompanyName(prod.company_name || '');
          setCompanyAddress(prod.company_address || '');
          setPackerName(prod.packer_name || '');
          setPackerAddress(prod.packer_address || '');
          setKeywordsText(Array.isArray(prod.keywords) ? prod.keywords.join(', ') : '');

          const descBullets = prod.description ? parseDetails(prod.description) : [];
          setDetails(descBullets);
          setDetailsText(prod.description || '');

          // Load existing images from /api/admin/products/:id/images so every image has its exact DB id
          let rawImages: any[] = [];
          try {
            rawImages = await getAdminProductImages(id);
          } catch {}
          if (!Array.isArray(rawImages) || rawImages.length === 0) {
            rawImages = Array.isArray(prod.images) ? prod.images : [];
          }
          if (rawImages.length > 0) {
            setImages(
              rawImages
                .map((item, idx) => {
                  const url = typeof item === 'string' ? item : item?.image_url || item?.url;
                  if (!url) return null;
                  const resolvedImgId = item?.id ?? item?.image_id;
                  return {
                    key: `existing-${resolvedImgId ?? idx}-${uid()}`,
                    src: url,
                    name: `Image ${idx + 1}`,
                    size: 0,
                    backendImageId: resolvedImgId != null ? String(resolvedImgId) : undefined,
                    isPrimary: Boolean(item?.is_primary ?? idx === 0),
                  } as GalleryImage;
                })
                .filter((x): x is GalleryImage => x !== null)
            );
          }

          // Load existing per-product variants if variable product
          let prodVariants = Array.isArray(prod.variants) ? prod.variants : [];
          if (prodVariants.length === 0) {
            try {
              prodVariants = await getAdminProductVariants(id);
            } catch {}
          }
          const isVarProd = prod.product_type === 'variable' || prodVariants.length > 0;
          setProductType(isVarProd ? 'VARIABLE' : 'SIMPLE');

          if (prodVariants.length > 0) {
            setInitialVariantIds(prodVariants.map((v) => v.id));
            const IGNORED_VARIANT_KEYS = new Set([
              'hsn',
              'hsn_code',
              'gst_percent',
              'gst_rate',
              'source_attributes',
            ]);
            const liveAttrs = await getAllAdminVariantAttributes().catch(() => []);
            const discoveredTypes = new Map<string, VariantType>();

            liveAttrs
              .filter((a) => !IGNORED_VARIANT_KEYS.has((a.name || '').toLowerCase()))
              .forEach((attr) => {
                const attrId = String(attr.id);
                const vals = Array.isArray(attr.values) ? attr.values : [];
                discoveredTypes.set(attr.name.toLowerCase(), {
                  id: attrId,
                  name: attr.name,
                  terms: vals.map((val, i) => ({
                    id: `${attrId}-opt-${i}`,
                    name: val,
                  })),
                });
              });

            if (!discoveredTypes.has('size')) {
              discoveredTypes.set('size', {
                id: 'size',
                name: 'Size',
                terms: ['S', 'M', 'L', 'XL', 'XXL'].map((val, i) => ({
                  id: `size-opt-${i}`,
                  name: val,
                })),
              });
            }

            const loadedTerms: Term[] = [];
            const usedVtIds = new Set<string>();

            prodVariants.forEach((v, idx) => {
              const attrsObj = v.attributes || {};
              const validEntries = Object.entries(attrsObj).filter(
                ([k]) => !IGNORED_VARIANT_KEYS.has(k.toLowerCase())
              );

              let attrName = 'Size';
              let attrVal = '';
              if (validEntries.length > 0) {
                attrName = String(validEntries[0][0] || 'Size').trim();
                attrVal = String(validEntries[0][1] || '').trim();
              }
              if (!attrVal) {
                attrVal =
                  (v.variant_name ? v.variant_name.replace(/\s*\(Pack of \d+\)/i, '').trim() : '') ||
                  (v.display_name ? v.display_name.replace(/\s*\(Pack of \d+\)/i, '').trim() : '') ||
                  `Size ${idx + 1}`;
              }

              const lowerKey = attrName.toLowerCase();
              let vtEntry = discoveredTypes.get(lowerKey);
              if (!vtEntry) {
                const fallbackId = `attr-${lowerKey.replace(/[^a-z0-9]+/g, '-')}`;
                vtEntry = {
                  id: fallbackId,
                  name: attrName,
                  terms: [],
                };
                discoveredTypes.set(lowerKey, vtEntry);
              }

              if (!vtEntry.terms.some((s) => s.name.toLowerCase() === attrVal.toLowerCase())) {
                vtEntry.terms.push({
                  id: `${vtEntry.id}-opt-${vtEntry.terms.length}`,
                  name: attrVal,
                });
              }

              usedVtIds.add(vtEntry.id);

              // Extract unit count if stored in variant_name like "M (Pack of 10)"
              const packMatch = (v.variant_name || '').match(/Pack of (\d+)/i);
              const extractedUnitCount = packMatch
                ? packMatch[1]
                : prod.unit_count != null
                ? String(prod.unit_count)
                : '';

              loadedTerms.push({
                key: `variant-${v.id}`,
                termId: `variant-${v.id}`,
                backendVariantId: v.id,
                variantTypeId: vtEntry.id,
                variantTypeName: vtEntry.name,
                name: attrVal,
                sku: v.sku || '',
                variantName: v.variant_name || '',
                unitCount: extractedUnitCount,
                weightGrams: v.weight_grams != null ? String(v.weight_grams) : '',
                barcode: v.barcode || '',
                regularPrice: v.regular_price != null ? String(v.regular_price) : '',
                offerPercent:
                  v.regular_price != null && v.sale_price != null
                    ? offerPercentFrom(String(v.regular_price), String(v.sale_price))
                    : '',
                salePrice: v.sale_price != null ? String(v.sale_price) : '',
                stockQuantity: String(v.stock_quantity ?? 0),
                description: '',
                image: null,
              });
            });

            setVariantTypesList(Array.from(discoveredTypes.values()));
            const vtIdsArr = Array.from(usedVtIds);
            setSelectedVariantTypeIds(vtIdsArr);
            setActiveVariantTabId(vtIdsArr[0] || '');
            setTerms(loadedTerms);
            if (loadedTerms[0]) {
              setOpenTerm(loadedTerms[0].key);
            }
          }
        }
      } catch (err: any) {
        console.warn('Could not load product for editing:', err.message);
      } finally {
        setIsLoadingProduct(false);
      }
    }
    void loadProduct(currentId);
  }, [editId]);

  const fileRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<GalleryImage[]>([]);
  const termsRef = useRef<Term[]>([]);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(() => {
    termsRef.current = terms;
  }, [terms]);
  useEffect(
    () => () => {
      imagesRef.current.forEach((i) => URL.revokeObjectURL(i.src));
      termsRef.current.forEach((t) => t.image && URL.revokeObjectURL(t.image.src));
    },
    [],
  );

  const category = categoriesList.find((c) => c.id === categoryId);
  const brandName =
    brandsList.find((b) => b.id === brand)?.name ?? (brand ? `Brand #${brand}` : 'Unbranded');

  const priceSummary = useMemo(() => {
    if (productType === 'SIMPLE') return `₹${sale || regular || '—'}`;
    const vals = terms.map((t) => num(t.salePrice) ?? num(t.regularPrice)).filter((v): v is number => v != null);
    if (!vals.length) return '—';
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    return lo === hi ? `₹${lo}` : `₹${lo} – ₹${hi}`;
  }, [productType, regular, sale, terms]);

  const totalImageBytes = useMemo(
    () => images.reduce((sum, img) => sum + (img.size || img.file?.size || 0), 0),
    [images]
  );

  function validateBasics(): string {
    if (!name.trim()) return 'Product name is required.';
    return '';
  }

  function validateAll(): string {
    return validateBasics();
  }

  function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setError('');
    setImages((prev) => [
      ...prev,
      ...files.map((f) => ({
        key: uid(),
        src: URL.createObjectURL(f),
        name: f.name,
        size: f.size,
        file: f,
      })),
    ]);
    e.target.value = '';
  }

  async function handleDeleteEditorImage(img: GalleryImage) {
    setDeletingImageKey(img.key);
    setError('');
    try {
      // If this is a local unsaved file selection, just remove it from state
      if (img.file && !img.backendImageId) {
        if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
        setImages((prev) => prev.filter((x) => x.key !== img.key));
        return;
      }

      if (editId) {
        let targetBackendId = img.backendImageId;
        if (!targetBackendId) {
          try {
            const currentServerImgs = await getAdminProductImages(editId);
            const matched = currentServerImgs.find((s) => s.image_url === img.src);
            if (matched?.id != null) targetBackendId = String(matched.id);
          } catch {}
        }

        if (targetBackendId) {
          try {
            await deleteAdminProductImage(editId, targetBackendId);
          } catch (apiErr: any) {
            console.warn('Backend image delete returned status:', apiErr?.message);
            // Note: The backend deletes the DB row before attempting S3 object deletion.
            // If S3 deletion throws 500, we verify against the DB list below.
          }

          const fresh = await getAdminProductImages(editId).catch(() => null);
          if (fresh) {
            const stillExists = fresh.some((s) => String(s.id) === String(targetBackendId));
            if (stillExists) {
              throw new Error('Image could not be deleted from the server.');
            }
            setImages((prev) => {
              const unsavedLocal = prev.filter((x) => x.file && !x.backendImageId && x.key !== img.key);
              const mappedServer: GalleryImage[] = fresh.map((item, idx) => ({
                key: `existing-${item.id}-${uid()}`,
                src: item.image_url,
                name: `Image ${idx + 1}`,
                size: 0,
                backendImageId: String(item.id),
                isPrimary: Boolean(item.is_primary ?? idx === 0),
              }));
              return [...mappedServer, ...unsavedLocal];
            });
            return;
          }
        }
      }

      if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
      setImages((prev) => prev.filter((x) => x.key !== img.key));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete image.');
    } finally {
      setDeletingImageKey(null);
    }
  }

  async function handleSetPrimaryEditorImage(img: GalleryImage) {
    if (!editId || !img.backendImageId) return;
    setSettingPrimaryKey(img.key);
    setError('');
    try {
      await setPrimaryProductImage(editId, img.backendImageId);
      const fresh = await getAdminProductImages(editId).catch(() => null);
      if (fresh && fresh.length > 0) {
        setImages((prev) => {
          const unsavedLocal = prev.filter((x) => x.file && !x.backendImageId);
          const mappedServer: GalleryImage[] = fresh.map((item, idx) => ({
            key: `existing-${item.id}-${uid()}`,
            src: item.image_url,
            name: `Image ${idx + 1}`,
            size: 0,
            backendImageId: String(item.id),
            isPrimary: Boolean(item.is_primary ?? idx === 0),
          }));
          return [...mappedServer, ...unsavedLocal];
        });
      } else {
        setImages((prev) =>
          prev.map((x) => ({
            ...x,
            isPrimary: x.key === img.key,
          }))
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to set primary image.');
    } finally {
      setSettingPrimaryKey(null);
    }
  }

  function patchTerm(key: string, patch: Partial<Term>) {
    setTerms((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  }

  async function handleRemoveTerm(termToRemove: Term) {
    setError('');
    const remainingAll = terms.filter((x) => x.key !== termToRemove.key);
    const remainingForVt = remainingAll.filter(
      (x) => x.variantTypeId === termToRemove.variantTypeId
    );
    setTerms(remainingAll);

    if (remainingForVt.length === 0) {
      const remainingVtIds = selectedVariantTypeIds.filter(
        (id) => id !== termToRemove.variantTypeId
      );
      setSelectedVariantTypeIds(remainingVtIds);
      if (activeVariantTabId === termToRemove.variantTypeId) {
        setActiveVariantTabId(remainingVtIds[0] || '');
      }
    } else {
      setActiveOptionByVariant((prev) => ({
        ...prev,
        [termToRemove.variantTypeId]: remainingForVt[0]?.key ?? '',
      }));
    }

    if (openTerm === termToRemove.key) {
      setOpenTerm(remainingAll[0]?.key ?? null);
    }

    // If editing an existing product and this term exists in the backend DB, delete it immediately
    if (editId && termToRemove.backendVariantId != null) {
      try {
        await deleteAdminProductVariant(editId, termToRemove.backendVariantId);
        setInitialVariantIds((prev) =>
          prev.filter((id) => String(id) !== String(termToRemove.backendVariantId))
        );
      } catch (err) {
        console.warn('Could not delete variant from backend:', err);
      }
    }
  }

  function toggleVariantType(id: string) {
    if (!id) return;
    setError('');
    const isAlreadySelected = selectedVariantTypeIds.includes(id);
    if (isAlreadySelected) {
      const removedTerms = terms.filter((t) => t.variantTypeId === id);
      const remainingIds = selectedVariantTypeIds.filter((x) => x !== id);
      setSelectedVariantTypeIds(remainingIds);
      setTerms((prev) => prev.filter((t) => t.variantTypeId !== id));
      setActiveOptionByVariant((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (activeVariantTabId === id) {
        setActiveVariantTabId(remainingIds[0] || '');
      }
      if (editId) {
        removedTerms.forEach((rt) => {
          if (rt.backendVariantId != null) {
            void deleteAdminProductVariant(editId, rt.backendVariantId)
              .then(() => {
                setInitialVariantIds((prev) =>
                  prev.filter((vid) => String(vid) !== String(rt.backendVariantId))
                );
              })
              .catch(() => {});
          }
        });
      }
      return;
    }

    const vt = variantTypesList.find((v) => v.id === id);
    if (!vt) return;

    const newTerms = vt.terms.map<Term>((t) => ({
      key: `${vt.id}-${t.id}-${uid()}`,
      termId: t.id,
      variantTypeId: vt.id,
      variantTypeName: vt.name,
      name: t.name,
      sku: '',
      variantName: '',
      unitCount: unitCount || '',
      weightGrams: '',
      barcode: '',
      regularPrice: '',
      offerPercent: '',
      salePrice: '',
      stockQuantity: '',
      description: '',
      image: null,
    }));

    setSelectedVariantTypeIds((prev) => [...prev, id]);
    setActiveVariantTabId(id);
    setTerms((prev) => [...prev, ...newTerms]);
    if (newTerms[0]) {
      setActiveOptionByVariant((prev) => ({ ...prev, [id]: newTerms[0].key }));
      setOpenTerm((prev) => prev ?? newTerms[0].key);
    }
  }

  function selectVariantFromDropdown(id: string) {
    if (!id) return;
    if (selectedVariantTypeIds.includes(id)) {
      setActiveVariantTabId(id);
      return;
    }
    toggleVariantType(id);
  }

  function handleAddCustomVariantType() {
    const trimmed = customVariantTypeName.trim();
    if (!trimmed) return;
    const newId = `custom-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
    const defaultTermKey = `${newId}-opt-1`;
    const newVt: VariantType = {
      id: newId,
      name: trimmed,
      terms: [{ id: defaultTermKey, name: 'Option 1' }],
    };
    const firstTerm: Term = {
      key: defaultTermKey,
      termId: defaultTermKey,
      variantTypeId: newId,
      variantTypeName: trimmed,
      name: 'Option 1',
      sku: '',
      variantName: '',
      unitCount: unitCount || '',
      weightGrams: '',
      barcode: '',
      regularPrice: '',
      offerPercent: '',
      salePrice: '',
      stockQuantity: '',
      description: '',
      image: null,
    };
    setVariantTypesList((prev) => [...prev, newVt]);
    setSelectedVariantTypeIds((prev) => [...prev, newId]);
    setTerms((prev) => [...prev, firstTerm]);
    setActiveOptionByVariant((prev) => ({ ...prev, [newId]: firstTerm.key }));
    setOpenTerm(firstTerm.key);
    setCustomVariantTypeName('');
  }

  function handleAddOptionToVariant(variantId: string) {
    const vt = variantTypesList.find((v) => v.id === variantId);
    if (!vt) return;
    const rawName = (customOptionInputByVariant[variantId] || '').trim();
    const existingForVt = terms.filter((t) => t.variantTypeId === variantId);
    const optionName = rawName || `${vt.name} Option ${existingForVt.length + 1}`;
    const newKey = `${variantId}-opt-${uid()}`;
    const newTerm: Term = {
      key: newKey,
      termId: newKey,
      variantTypeId: variantId,
      variantTypeName: vt.name,
      name: optionName,
      sku: '',
      variantName: '',
      unitCount: unitCount || '',
      weightGrams: '',
      barcode: '',
      regularPrice: '',
      offerPercent: '',
      salePrice: '',
      stockQuantity: '',
      description: '',
      image: null,
    };
    setTerms((prev) => [...prev, newTerm]);
    setActiveOptionByVariant((prev) => ({ ...prev, [variantId]: newKey }));
    setOpenTerm(newKey);
    setCustomOptionInputByVariant((prev) => ({ ...prev, [variantId]: '' }));
  }

  /** Syncs per-product variants with /api/admin/products/:productId/variants */
  async function syncProductVariants(targetProductId: string | number) {
    if (productType !== 'VARIABLE') return;

    // 1. Ensure variant attribute definitions & option values exist on the backend
    try {
      const liveAttrs = await getAllAdminVariantAttributes().catch(() => []);
      const groupedByAttr = new Map<string, Set<string>>();
      terms.forEach((t) => {
        const attrName = (t.variantTypeName || 'Size').trim();
        const optVal = t.name.trim();
        if (!attrName || !optVal) return;
        if (!groupedByAttr.has(attrName)) groupedByAttr.set(attrName, new Set());
        groupedByAttr.get(attrName)!.add(optVal);
      });

      for (const [attrName, optSet] of groupedByAttr.entries()) {
        const existingDef = liveAttrs.find(
          (a) => a.name.toLowerCase() === attrName.toLowerCase()
        );
        const neededValues = Array.from(optSet);
        if (!existingDef) {
          await createAdminVariantAttribute({
            name: attrName,
            values: neededValues,
          }).catch(() => {});
        } else {
          const merged = Array.from(new Set([...(existingDef.values || []), ...neededValues]));
          if (merged.length > (existingDef.values || []).length) {
            await updateAdminVariantAttribute(existingDef.id, {
              name: existingDef.name,
              values: merged,
            }).catch(() => {});
          }
        }
      }
    } catch {
      // Non-fatal if attribute sync fails
    }

    // 2. Delete variants that were removed in the UI
    const currentVariantIds = new Set(
      terms.map((t) => t.backendVariantId).filter((id): id is string | number => id != null)
    );
    for (const oldId of initialVariantIds) {
      if (!currentVariantIds.has(oldId)) {
        await deleteAdminProductVariant(targetProductId, oldId).catch(() => {});
      }
    }

    // 3. Create or update each term variant
    const baseSkuPrefix = (
      sku.trim() ||
      productCode.trim() ||
      generateProductSlug(name.trim()) ||
      `PRD-${targetProductId}`
    ).toUpperCase();

    for (let idx = 0; idx < terms.length; idx++) {
      const t = terms[idx];
      const attrName = (t.variantTypeName || 'Size').trim();
      const optVal = t.name.trim();
      if (!optVal) continue;

      const resolvedSku =
        t.sku.trim() ||
        `${baseSkuPrefix}-${optVal.replace(/[^a-zA-Z0-9]+/g, '-').toUpperCase()}-${idx + 1}`;

      // Embed Unit Count (per pack) into variant_name so each size stores its pack count
      const packCount = t.unitCount.trim();
      let resolvedVariantName = t.variantName.trim() || optVal;
      if (packCount && !/pack\s+of\s+\d+/i.test(resolvedVariantName)) {
        resolvedVariantName = `${resolvedVariantName} (Pack of ${packCount})`;
      }

      const variantPayload = {
        sku: resolvedSku,
        attributes: { [attrName]: optVal },
        variant_name: resolvedVariantName || null,
        barcode: t.barcode.trim() || null,
        weight_grams: num(t.weightGrams),
        regular_price: num(t.regularPrice) ?? num(regular) ?? 0,
        sale_price: num(t.salePrice),
        stock_quantity: Math.max(0, Math.floor(num(t.stockQuantity) ?? 0)),
        is_active: true,
      };

      if (t.backendVariantId != null) {
        await updateAdminProductVariant(targetProductId, t.backendVariantId, variantPayload);
      } else {
        await createAdminProductVariant(targetProductId, variantPayload);
      }
    }
  }

  /** Builds the payload sent to the backend products API. */
  function buildApiPayload(targetStatus: ProductStatus) {
    const catIdNum = Number(categoryId);
    const subCatIdNum = Number(subCategoryId);
    const categoryIds: number[] = [];
    if (!isNaN(catIdNum) && catIdNum > 0) categoryIds.push(catIdNum);
    if (!isNaN(subCatIdNum) && subCatIdNum > 0 && !categoryIds.includes(subCatIdNum)) {
      categoryIds.push(subCatIdNum);
    }
    const primaryCategoryId =
      !isNaN(subCatIdNum) && subCatIdNum > 0
        ? subCatIdNum
        : !isNaN(catIdNum) && catIdNum > 0
        ? catIdNum
        : null;

    const brandNum = brand ? Number(brand) : null;
    const combinedDescription =
      description.trim() ||
      (details.length > 0 ? details.map((d) => `• ${d}`).join('\n') : null);
    const resolvedShortDesc =
      shortDescription.trim() ||
      (details.length > 0 ? details.join(' • ').slice(0, 500) : null);
    const imageFiles = images
      .map((i) => i.file)
      .filter((f): f is File => f instanceof File);

    const parsedKeywords = keywordsText
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    // If variable product has unitCount set on its first term, fallback parent unit_count to it
    const effectiveUnitCountStr =
      unitCount.trim() || (productType === 'VARIABLE' ? terms[0]?.unitCount?.trim() || '' : '');

    return {
      product_name: name.trim(),
      slug: generateProductSlug(slug.trim() || name.trim()),
      brand_id: brandNum && !isNaN(brandNum) && brandNum > 0 ? brandNum : null,
      short_description: resolvedShortDesc,
      description: combinedDescription,
      product_status: targetStatus,
      product_type: (productType === 'VARIABLE' ? 'variable' : 'simple') as 'simple' | 'variable',
      product_code: productCode.trim() || null,
      sku: sku.trim() || null,
      regular_price: num(regular),
      sale_price: num(sale),
      offer_percent: num(offer),
      special_discount_enabled: specialDiscountEnabled,
      special_discount_percent: num(specialDiscountPercent) ?? 0,
      festival_offer_enabled: festivalOfferEnabled,
      festival_offer_percent: num(festivalOfferPercent) ?? 0,
      stock_quantity: Math.max(0, Math.floor(num(stock) ?? 0)),
      min_order_quantity: Math.max(1, Math.floor(num(minQty) ?? 1)),
      max_order_quantity: num(maxQty) != null ? Math.floor(num(maxQty)!) : null,
      category_ids: categoryIds,
      primary_category_id: primaryCategoryId,
      target_audience: targetAudience.trim() || null,
      hsn_code: hsnCode.trim() || null,
      gst_rate: num(gstRate),
      weight: num(weight),
      weight_unit: weightUnit,
      unit_count: num(effectiveUnitCountStr) != null ? Math.floor(num(effectiveUnitCountStr)!) : null,
      package_length: num(packageLength),
      package_breadth: num(packageBreadth),
      package_height: num(packageHeight),
      dimension_unit: dimensionUnit,
      material: material.trim() || null,
      colour: colour.trim() || null,
      package_type: packageType.trim() || null,
      shelf_life: shelfLife.trim() || null,
      water_resistant:
        waterResistant === 'true' ? true : waterResistant === 'false' ? false : null,
      hazardous_clause: hazardousClause.trim() || null,
      manufactured_in: manufacturedIn.trim() || null,
      company_name: companyName.trim() || null,
      company_address: companyAddress.trim() || null,
      packer_name: (sameAsManufacturer ? companyName : packerName).trim() || null,
      packer_address: (sameAsManufacturer ? companyAddress : packerAddress).trim() || null,
      keywords: parsedKeywords,
      ...(imageFiles.length > 0 ? { images: imageFiles } : {}),
    };
  }

  async function removeAllBackendVariantsBeforeSimple(targetProductId: string | number) {
    try {
      const serverVariants = await getAdminProductVariants(targetProductId).catch(() => []);
      const idsToDelete = new Set<string | number>([
        ...initialVariantIds,
        ...serverVariants.map((v) => v.id),
      ]);
      for (const vid of idsToDelete) {
        if (vid != null) {
          await deleteAdminProductVariant(targetProductId, vid).catch(() => {});
        }
      }
      setInitialVariantIds([]);
    } catch {
      // Ignore if already empty
    }
  }

  async function saveDraft() {
    setSaving(true);
    setError('');
    try {
      const msg = validateBasics();
      if (msg) throw new Error(msg);

      const payload = buildApiPayload('draft');

      let savedId: string | number | null = editId;
      if (editId) {
        if (payload.product_type === 'simple') {
          await removeAllBackendVariantsBeforeSimple(editId);
        }
        await updateAdminProduct(editId, payload);
      } else {
        const created = await createAdminProduct(payload);
        savedId = created?.product_id ?? created?.id ?? null;
      }
      if (savedId != null && productType === 'VARIABLE') {
        await syncProductVariants(savedId);
      }
      setSuccessMessage('Draft saved successfully.');
      setTimeout(() => {
        router.replace('/admin/products');
        router.refresh();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save the product draft.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmPublish() {
    setSubmitting(true);
    setError('');
    try {
      const msg = validateBasics();
      if (msg) {
        setPreviewOpen(false);
        throw new Error(msg);
      }
      const payload = buildApiPayload(productStatus);

      let savedId: string | number | null = editId;
      if (editId) {
        if (payload.product_type === 'simple') {
          await removeAllBackendVariantsBeforeSimple(editId);
        }
        await updateAdminProduct(editId, payload);
        if (productType === 'VARIABLE') {
          await syncProductVariants(editId);
        }
        setSuccessMessage('The product has been updated successfully!');
      } else {
        const created = await createAdminProduct(payload);
        savedId = created?.product_id ?? created?.id ?? null;
        if (savedId != null && productType === 'VARIABLE') {
          await syncProductVariants(savedId);
        }
        setSuccessMessage('The product has been published successfully!');
      }
      setTimeout(() => {
        router.push('/admin/products');
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish the product.');
    } finally {
      setSubmitting(false);
    }
  }

  const termInputBase = INPUT_CLASS;
  const sectionCard = 'rounded-2xl bg-[#F7F7F7] p-5';

  return (
    <>
      <section className="min-h-[calc(100vh-90px)] rounded-2xl bg-white px-4 sm:px-6 pt-4 sm:pt-[18px] pb-8 text-[#252525] shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const msg = validateAll();
            if (msg) {
              setError(msg);
              return;
            }
            setError('');
            setSuccessMessage('');
            setPreviewOpen(true);
          }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-[#F0F0F0] pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-[20px] font-bold text-gray-900 tracking-tight">
                  {isEditing ? 'Edit Product' : 'Add New Product'}
                </h2>
                {editId && (
                  <span className="rounded-md bg-orange-50 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#F47C35] border border-orange-200">
                    ID: #{editId}
                  </span>
                )}
                {isLoadingProduct && (
                  <span className="flex items-center gap-1.5 text-[12px] text-gray-400">
                    <Loader2 size={13} className="animate-spin text-[#F47C35]" />
                    <span>Loading...</span>
                  </span>
                )}
              </div>
              <p className="mt-1 text-[13px] text-gray-500">
                {isEditing
                  ? 'Update existing product catalog details, pricing, and images'
                  : 'Configure product catalog details, pricing, and images'}
              </p>
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                disabled={saving || submitting || isLoadingProduct}
                onClick={() => void saveDraft()}
                className="flex-1 sm:flex-initial flex h-10 sm:h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 sm:px-5 text-[13px] sm:text-[14px] font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {saving && <Loader2 size={16} className="animate-spin text-gray-600" />}
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="submit"
                disabled={saving || submitting || isLoadingProduct}
                className="flex-1 sm:flex-initial flex h-10 sm:h-11 items-center justify-center gap-2 rounded-lg bg-[#F47C35] px-5 sm:px-7 text-[13px] sm:text-[14px] font-semibold text-white hover:bg-[#E96F29] shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isEditing ? 'Save Changes' : 'Publish'}
              </button>
            </div>
          </div>

          {error && !previewOpen && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-[#F4B6A2] bg-[#FFF6F2] px-4 py-3 text-[13px] text-[#C23D22]"
            >
              {error}
            </p>
          )}

          <div className="mt-7 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            {/* ------------------------- left column ------------------------- */}
            <div>
              <Label htmlFor="product-name" required>
                Product Name
              </Label>
              <input
                id="product-name"
                value={name}
                onChange={(e) => {
                  const val = e.target.value;
                  setName(val);
                  if (!slugTouched) {
                    setSlug(generateProductSlug(val));
                  }
                  setError('');
                }}
                maxLength={255}
                placeholder="Enter product name"
                className={INPUT_CLASS}
              />

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <Label htmlFor="product-status" required>
                    Product Status
                  </Label>
                  <Select
                    id="product-status"
                    value={productStatus}
                    placeholder="Select status"
                    options={[
                      { value: 'active', label: 'Active (Published)' },
                      { value: 'draft', label: 'Draft' },
                      { value: 'inactive', label: 'Inactive' },
                      { value: 'archived', label: 'Archived' },
                    ]}
                    onChange={(v) => setProductStatus((v || 'active') as ProductStatus)}
                  />
                </div>
                <div>
                  <Label htmlFor="short-description">
                    Short Description
                  </Label>
                  <input
                    id="short-description"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    maxLength={500}
                    placeholder="Enter a short summary of the product (optional)"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <div className="mt-5">
                <Label htmlFor="product-description" required>
                  Product Description
                </Label>
                <BulletTextarea
                  id="product-description"
                  value={description}
                  maxLength={2000}
                  onValueChange={setDescription}
                  placeholder="Add the full product description"
                  className="min-h-[125px] w-full resize-y rounded-lg border border-[#D7D7D7] p-4 text-[14px] leading-6 outline-none placeholder:text-[#A6A6A6] focus:border-[#F47C35]"
                />
                <p className="mt-1 text-right text-[10px] text-[#999]">{description.length}/2000</p>
              </div>

              <div className="mt-5">
                <Label htmlFor="product-details" required>
                  Product Details
                </Label>
                <BulletTextarea
                  id="product-details"
                  value={detailsText}
                  onValueChange={(v) => {
                    setDetailsText(v);
                    setDetails(parseDetails(v));
                  }}
                  placeholder="Paste a paragraph, bullets, numbered list, or multiline details"
                  className="min-h-[155px] w-full resize-y rounded-lg border border-[#D7D7D7] bg-white p-4 text-[14px] leading-6 outline-none placeholder:text-[#A6A6A6] focus:border-[#F47C35]"
                />
                <p className="mt-1 text-right text-[10px] text-[#999]">{details.length} points detected</p>
              </div>

              {/* Product type + tabs */}
              <div className="mt-6 rounded-2xl bg-[#F7F7F7] p-4">
                <div className="flex items-center justify-between gap-5">
                  <h3 className="text-[17px] font-semibold text-[#111]">Product Type:</h3>
                  <div className="w-[220px]">
                    <Select
                      id="product-type"
                      value={productType}
                      placeholder="Select product type"
                      options={[
                        { value: 'SIMPLE', label: 'Simple Product' },
                        { value: 'VARIABLE', label: 'Variable Product' },
                      ]}
                      onChange={(v) => {
                        setProductType(v as 'SIMPLE' | 'VARIABLE');
                        if (v === 'SIMPLE' && (tab === 'variants' || tab === 'terms')) setTab('inventory');
                      }}
                    />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={productType === 'SIMPLE' && (t.id === 'variants' || t.id === 'terms')}
                      onClick={() => setTab(t.id)}
                      className={`h-10 rounded-lg border text-[12px] shadow-sm disabled:cursor-not-allowed disabled:opacity-40 ${
                        tab === t.id ? 'border-[#D6A7EA] bg-[#F6ECFA]' : 'border-[#ECECEC] bg-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="mt-5 border border-[#E6E6E6] bg-white p-4">
                  {tab === 'inventory' && (
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-[15px] font-semibold">Inventory & Pricing</h4>
                        {serverEffectivePrice && (
                          <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 text-[12px] font-semibold text-emerald-700">
                            Server Effective Price: ₹{serverEffectivePrice}
                          </span>
                        )}
                      </div>
                      <div className="mt-5 grid gap-5 md:grid-cols-2">
                        <div>
                          <Label htmlFor="product-code">Product Code</Label>
                          <input
                            id="product-code"
                            value={productCode}
                            onChange={(e) => setProductCode(e.target.value)}
                            maxLength={100}
                            placeholder="Eg: JOY-01"
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div>
                          <Label htmlFor="sku">SKU</Label>
                          <input
                            id="sku"
                            value={sku}
                            onChange={(e) => setSku(e.target.value)}
                            maxLength={100}
                            placeholder="Eg: JOY-SIMPLE"
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div>
                          <Label htmlFor="minimum-quantity">Min Order Quantity</Label>
                          <input
                            id="minimum-quantity"
                            type="number"
                            min="1"
                            step="1"
                            value={minQty}
                            onChange={(e) => setMinQty(e.target.value)}
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div>
                          <Label htmlFor="maximum-quantity">Max Order Quantity (blank = no max)</Label>
                          <input
                            id="maximum-quantity"
                            type="number"
                            min="1"
                            step="1"
                            placeholder="No limit"
                            value={maxQty}
                            onChange={(e) => setMaxQty(e.target.value)}
                            className={INPUT_CLASS}
                          />
                        </div>

                        <div>
                          <Label htmlFor="regular-price">Regular Price (MRP)</Label>
                          <input
                            id="regular-price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={regular}
                            onChange={(e) => {
                              const nextReg = e.target.value;
                              setRegular(nextReg);
                              if (offer.trim()) {
                                setSale(salePriceFrom(nextReg, offer));
                              } else if (sale.trim()) {
                                setOffer(offerPercentFrom(nextReg, sale));
                              }
                            }}
                            placeholder="Eg: 1000"
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div>
                          <Label htmlFor="sale-price">Sale Price (Offer Price)</Label>
                          <input
                            id="sale-price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={sale}
                            onChange={(e) => {
                              const nextSale = e.target.value;
                              setSale(nextSale);
                              setOffer(offerPercentFrom(regular, nextSale));
                            }}
                            placeholder="Eg: 900"
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div>
                          <Label htmlFor="offer-percent">Offer Percent (%)</Label>
                          <input
                            id="offer-percent"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={offer}
                            onChange={(e) => {
                              const nextOffer = e.target.value;
                              setOffer(nextOffer);
                              setSale(salePriceFrom(regular, nextOffer));
                            }}
                            placeholder="Eg: 10"
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div>
                          <Label htmlFor="stock-quantity">Stock Quantity</Label>
                          <input
                            id="stock-quantity"
                            type="number"
                            min="0"
                            step="1"
                            value={stock}
                            onChange={(e) => setStock(e.target.value)}
                            placeholder="Eg: 25"
                            className={INPUT_CLASS}
                          />
                        </div>

                        {/* Special & Festival Discounts */}
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 space-y-2">
                          <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={specialDiscountEnabled}
                              onChange={(e) => setSpecialDiscountEnabled(e.target.checked)}
                              className="h-4 w-4 accent-[#F47C35]"
                            />
                            <span>Enable Special Discount</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            disabled={!specialDiscountEnabled}
                            value={specialDiscountPercent}
                            onChange={(e) => setSpecialDiscountPercent(e.target.value)}
                            placeholder="Special Discount %"
                            className={INPUT_CLASS}
                          />
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 space-y-2">
                          <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={festivalOfferEnabled}
                              onChange={(e) => setFestivalOfferEnabled(e.target.checked)}
                              className="h-4 w-4 accent-[#F47C35]"
                            />
                            <span>Enable Festival Offer</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            disabled={!festivalOfferEnabled}
                            value={festivalOfferPercent}
                            onChange={(e) => setFestivalOfferPercent(e.target.value)}
                            placeholder="Festival Offer %"
                            className={INPUT_CLASS}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {tab === 'shipping' && (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-[15px] font-semibold text-gray-900">
                            Product Specifications
                          </h4>
                          <p className="text-[12px] text-gray-500">
                            Click a standard preset chip or choose <span className="font-semibold text-[#F47C35]">+ Custom</span> to type your own value.
                          </p>
                        </div>
                      </div>

                      {/* 1. Tax & Compliance */}
                      <div className="rounded-xl border border-[#EAEAEA] bg-[#FAFAFA] p-4 space-y-4">
                        <h5 className="text-[13px] font-bold uppercase tracking-wider text-[#0D2B53]">
                          1. Tax & Compliance (GST & HSN)
                        </h5>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <Label htmlFor="spec-gst">GST Rate (%)</Label>
                            <PresetChipsWithCustom
                              id="spec-gst"
                              value={gstRate}
                              onChange={setGstRate}
                              presets={GST_PRESETS}
                              suffix="%"
                              type="number"
                              placeholder="Enter custom GST % (e.g. 12)"
                            />
                          </div>
                          <div>
                            <Label htmlFor="spec-hsn">HSN Code</Label>
                            <PresetChipsWithCustom
                              id="spec-hsn"
                              value={hsnCode}
                              onChange={setHsnCode}
                              presets={HSN_PRESETS}
                              placeholder="Enter 4 to 8 digit HSN code (e.g. 961900)"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 2. Product Attributes & Packaging */}
                      <div className="rounded-xl border border-[#EAEAEA] bg-[#FAFAFA] p-4 space-y-4">
                        <h5 className="text-[13px] font-bold uppercase tracking-wider text-[#0D2B53]">
                          2. Product Attributes & Packaging
                        </h5>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <Label htmlFor="spec-target-audience">Target Audience</Label>
                            <PresetChipsWithCustom
                              id="spec-target-audience"
                              value={targetAudience}
                              onChange={setTargetAudience}
                              presets={AUDIENCE_PRESETS}
                              placeholder="Enter custom target audience"
                            />
                          </div>
                          <div>
                            <Label htmlFor="spec-package-type">Package Type</Label>
                            <PresetChipsWithCustom
                              id="spec-package-type"
                              value={packageType}
                              onChange={setPackageType}
                              presets={PACKAGE_TYPE_PRESETS}
                              placeholder="Enter custom package type"
                            />
                          </div>
                          <div>
                            <Label htmlFor="spec-shelf-life">Shelf Life</Label>
                            <PresetChipsWithCustom
                              id="spec-shelf-life"
                              value={shelfLife}
                              onChange={setShelfLife}
                              presets={SHELF_LIFE_PRESETS}
                              placeholder="Enter custom shelf life (e.g. 24 Months)"
                            />
                          </div>
                          <div>
                            <Label htmlFor="spec-material">Material</Label>
                            <PresetChipsWithCustom
                              id="spec-material"
                              value={material}
                              onChange={setMaterial}
                              presets={MATERIAL_PRESETS}
                              placeholder="Enter custom material"
                            />
                          </div>
                          <div>
                            <Label htmlFor="spec-water-resistant">Water Resistant</Label>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { value: 'true', label: 'Yes (Water Resistant)' },
                                { value: 'false', label: 'No' },
                                { value: '', label: 'Not Specified' },
                              ].map((opt) => {
                                const active = waterResistant === opt.value;
                                return (
                                  <button
                                    key={opt.label}
                                    type="button"
                                    onClick={() => setWaterResistant(opt.value)}
                                    className={`rounded-lg border px-3 py-2 text-[12px] font-medium transition cursor-pointer ${
                                      active
                                        ? 'border-[#F47C35] bg-[#FFF4EE] text-[#F47C35] font-semibold'
                                        : 'border-[#E2E8F0] bg-white text-[#475569] hover:bg-slate-50'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <Label htmlFor="spec-hazardous">Hazardous / Safety Clause</Label>
                            <PresetChipsWithCustom
                              id="spec-hazardous"
                              value={hazardousClause}
                              onChange={setHazardousClause}
                              presets={HAZARDOUS_PRESETS}
                              placeholder="Enter custom safety or hazardous clause"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 3. Package Dimensions, Weight & Default Pack Count */}
                      <div className="rounded-xl border border-[#EAEAEA] bg-[#FAFAFA] p-4 space-y-4">
                        <h5 className="text-[13px] font-bold uppercase tracking-wider text-[#0D2B53]">
                          3. Package Dimensions, Weight & Pack Count
                        </h5>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <Label htmlFor="spec-unit-count">
                              Unit Count (per pack)
                              {productType === 'VARIABLE' && (
                                <span className="ml-1.5 text-[11px] font-normal text-[#F47C35]">
                                  (Also configurable per size in Terms tab)
                                </span>
                              )}
                            </Label>
                            <PresetChipsWithCustom
                              id="spec-unit-count"
                              value={unitCount}
                              onChange={setUnitCount}
                              presets={UNIT_COUNT_PRESETS}
                              suffix=" pcs"
                              type="number"
                              placeholder="Enter custom unit count per pack (e.g. 10)"
                            />
                          </div>
                          <div>
                            <Label htmlFor="spec-weight">Package Weight</Label>
                            <div className="flex gap-2">
                              <input
                                id="spec-weight"
                                type="number"
                                min="0"
                                step="0.01"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                placeholder="Eg: 500"
                                className={INPUT_CLASS}
                              />
                              <div className="inline-flex rounded-lg border border-[#D7D7D7] bg-white p-1">
                                {(['g', 'kg'] as WeightUnit[]).map((u) => (
                                  <button
                                    key={u}
                                    type="button"
                                    onClick={() => setWeightUnit(u)}
                                    className={`px-3 text-[13px] font-semibold rounded-md transition cursor-pointer ${
                                      weightUnit === u
                                        ? 'bg-[#F47C35] text-white'
                                        : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                  >
                                    {u}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-4">
                          <div>
                            <Label htmlFor="spec-len">Length</Label>
                            <input
                              id="spec-len"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="L"
                              value={packageLength}
                              onChange={(e) => setPackageLength(e.target.value)}
                              className={INPUT_CLASS}
                            />
                          </div>
                          <div>
                            <Label htmlFor="spec-breadth">Breadth</Label>
                            <input
                              id="spec-breadth"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="B"
                              value={packageBreadth}
                              onChange={(e) => setPackageBreadth(e.target.value)}
                              className={INPUT_CLASS}
                            />
                          </div>
                          <div>
                            <Label htmlFor="spec-height">Height</Label>
                            <input
                              id="spec-height"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="H"
                              value={packageHeight}
                              onChange={(e) => setPackageHeight(e.target.value)}
                              className={INPUT_CLASS}
                            />
                          </div>
                          <div>
                            <Label htmlFor="spec-dim-unit">Dimension Unit</Label>
                            <div className="flex h-12 rounded-lg border border-[#D7D7D7] bg-white p-1">
                              {(['cm', 'mm', 'in'] as DimensionUnit[]).map((u) => (
                                <button
                                  key={u}
                                  type="button"
                                  onClick={() => setDimensionUnit(u)}
                                  className={`flex-1 text-[13px] font-semibold rounded-md transition cursor-pointer ${
                                    dimensionUnit === u
                                      ? 'bg-[#F47C35] text-white'
                                      : 'text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  {u}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 4. Manufacturer, Packer & Search Keywords */}
                      <div className="rounded-xl border border-[#EAEAEA] bg-[#FAFAFA] p-4 space-y-4">
                        <h5 className="text-[13px] font-bold uppercase tracking-wider text-[#0D2B53]">
                          4. Origin, Manufacturer, Packer & Search Keywords
                        </h5>
                        <div>
                          <Label htmlFor="spec-manufactured-in">Country of Origin (Manufactured In)</Label>
                          <PresetChipsWithCustom
                            id="spec-manufactured-in"
                            value={manufacturedIn}
                            onChange={setManufacturedIn}
                            presets={ORIGIN_PRESETS}
                            placeholder="Enter country of origin"
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <Label htmlFor="spec-company-name">Manufacturer / Company Name</Label>
                            <input
                              id="spec-company-name"
                              value={companyName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCompanyName(val);
                                if (sameAsManufacturer) setPackerName(val);
                              }}
                              placeholder="Eg: Merabetta Healthcare Pvt. Ltd."
                              className={INPUT_CLASS}
                            />
                          </div>
                          <div>
                            <Label htmlFor="spec-company-address">Manufacturer Address</Label>
                            <input
                              id="spec-company-address"
                              value={companyAddress}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCompanyAddress(val);
                                if (sameAsManufacturer) setPackerAddress(val);
                              }}
                              placeholder="Eg: Plot 14, Industrial Area, Pune"
                              className={INPUT_CLASS}
                            />
                          </div>
                        </div>

                        <div className="pt-1">
                          <label className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#0D2B53] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sameAsManufacturer}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSameAsManufacturer(checked);
                                if (checked) {
                                  setPackerName(companyName);
                                  setPackerAddress(companyAddress);
                                }
                              }}
                              className="h-4 w-4 accent-[#F47C35]"
                            />
                            <span>Packer details are same as Manufacturer</span>
                          </label>
                        </div>

                        {!sameAsManufacturer && (
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <Label htmlFor="spec-packer-name">Packer Name</Label>
                              <input
                                id="spec-packer-name"
                                value={packerName}
                                onChange={(e) => setPackerName(e.target.value)}
                                placeholder="Enter packer company name"
                                className={INPUT_CLASS}
                              />
                            </div>
                            <div>
                              <Label htmlFor="spec-packer-address">Packer Address</Label>
                              <input
                                id="spec-packer-address"
                                value={packerAddress}
                                onChange={(e) => setPackerAddress(e.target.value)}
                                placeholder="Enter packer full address"
                                className={INPUT_CLASS}
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <Label htmlFor="spec-keywords">Search Keywords</Label>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {keywordsText
                              .split(',')
                              .map((k) => k.trim())
                              .filter(Boolean)
                              .map((kw) => (
                                <span
                                  key={kw}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4EE] border border-[#F47C35]/40 px-3 py-1 text-[12px] font-medium text-[#F47C35]"
                                >
                                  {kw}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = keywordsText
                                        .split(',')
                                        .map((k) => k.trim())
                                        .filter((k) => k && k !== kw)
                                        .join(', ');
                                      setKeywordsText(next);
                                    }}
                                    className="hover:text-[#C23D22] cursor-pointer"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              id="spec-keywords"
                              value={keywordDraft}
                              onChange={(e) => setKeywordDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ',') {
                                  e.preventDefault();
                                  const clean = keywordDraft.replace(/,/g, '').trim();
                                  if (!clean) return;
                                  const existing = keywordsText
                                    .split(',')
                                    .map((k) => k.trim())
                                    .filter(Boolean);
                                  if (!existing.includes(clean)) {
                                    setKeywordsText([...existing, clean].join(', '));
                                  }
                                  setKeywordDraft('');
                                }
                              }}
                              placeholder="Type a keyword and press Enter (or comma) to add tag..."
                              className={INPUT_CLASS}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const clean = keywordDraft.replace(/,/g, '').trim();
                                if (!clean) return;
                                const existing = keywordsText
                                  .split(',')
                                  .map((k) => k.trim())
                                  .filter(Boolean);
                                if (!existing.includes(clean)) {
                                  setKeywordsText([...existing, clean].join(', '));
                                }
                                setKeywordDraft('');
                              }}
                              className="h-12 shrink-0 rounded-lg bg-[#0D2B53] px-4 text-[13px] font-semibold text-white hover:bg-[#163C70] cursor-pointer"
                            >
                              + Add Keyword
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {tab === 'variants' && (
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <h4 className="text-[15px] font-semibold">Select Variant:</h4>
                        <div className="w-full max-w-[260px]">
                          <Select
                            id="product-variant"
                            value=""
                            placeholder="Select Variant"
                            options={variantTypesList.map((v) => ({
                              value: v.id,
                              label: selectedVariantTypeIds.includes(v.id) ? `✓ ${v.name}` : v.name,
                            }))}
                            onChange={selectVariantFromDropdown}
                          />
                        </div>
                      </div>

                      {selectedVariantTypeIds.length > 0 ? (
                        <div className="mt-5">
                          {/* Clean Horizontal Variant Type Tab Bar */}
                          <div className="flex flex-wrap items-center gap-2.5 border-b border-[#E6E6E6] pb-3">
                            {selectedVariantTypeIds.map((vId) => {
                              const vt = variantTypesList.find((v) => v.id === vId);
                              if (!vt) return null;
                              const isCurrentVt = (activeVariantTabId || selectedVariantTypeIds[0]) === vId;
                              return (
                                <div
                                  key={vId}
                                  className={`inline-flex h-10 items-center rounded-lg border text-[12px] font-medium shadow-2xs transition ${
                                    isCurrentVt
                                      ? 'border-[#D6A7EA] bg-[#F6ECFA] text-[#111]'
                                      : 'border-[#ECECEC] bg-white text-[#555] hover:bg-[#FAFAFA]'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => setActiveVariantTabId(vId)}
                                    className="h-full px-4 font-semibold cursor-pointer"
                                  >
                                    {vt.name}
                                  </button>
                                  <button
                                    type="button"
                                    title={`Remove ${vt.name}`}
                                    onClick={() => toggleVariantType(vId)}
                                    className="mr-2 flex h-5 w-5 items-center justify-center rounded text-[#999] hover:bg-black/5 hover:text-[#E14C2A] cursor-pointer"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          {/* Active Variant Type's Separate Option Tabs (Add / Rename / Remove Tabs) */}
                          {(() => {
                            const currentVId = activeVariantTabId || selectedVariantTypeIds[0];
                            const vt = variantTypesList.find((v) => v.id === currentVId);
                            if (!vt) return null;
                            const vtTerms = terms.filter((t) => t.variantTypeId === currentVId);
                            const activeKey = activeOptionByVariant[currentVId] ?? vtTerms[0]?.key ?? null;
                            const customInputVal = customOptionInputByVariant[currentVId] || '';
                            const activeTermObj = vtTerms.find((t) => t.key === activeKey) || vtTerms[0];

                            return (
                              <div className="mt-4 rounded-xl border border-[#EAEAEA] bg-[#FAFAFA] p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                  <span className="text-[13px] font-semibold text-[#111]">
                                    {vt.name} — Separate Option Tabs ({vtTerms.length})
                                  </span>
                                  <div className="inline-flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      value={customInputVal}
                                      onChange={(e) =>
                                        setCustomOptionInputByVariant((prev) => ({
                                          ...prev,
                                          [currentVId]: e.target.value,
                                        }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleAddOptionToVariant(currentVId);
                                        }
                                      }}
                                      placeholder={`New ${vt.name} option...`}
                                      className="h-9 w-40 rounded-lg border border-[#D7D7D7] bg-white px-3 text-[12px] outline-none focus:border-[#F47C35]"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleAddOptionToVariant(currentVId)}
                                      className="h-9 rounded-lg bg-[#F47C35] px-3 text-[12px] font-semibold text-white hover:bg-[#E96F29] cursor-pointer"
                                    >
                                      + Add Tab
                                    </button>
                                  </div>
                                </div>

                                {/* Separate Option Tabs Bar */}
                                <div className="flex flex-wrap items-center gap-2">
                                  {vtTerms.map((t) => {
                                    const active = activeKey === t.key;
                                    return (
                                      <div
                                        key={t.key}
                                        className={`inline-flex h-9 items-center rounded-lg border text-[12px] font-semibold transition ${
                                          active
                                            ? 'border-[#F47C35] bg-[#FFF4EE] text-[#F47C35]'
                                            : 'border-[#E2E2E2] bg-white text-[#444] hover:bg-gray-50'
                                        }`}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveOptionByVariant((prev) => ({
                                              ...prev,
                                              [currentVId]: t.key,
                                            }));
                                            setOpenTerm(t.key);
                                          }}
                                          className="h-full px-3.5 cursor-pointer"
                                        >
                                          {t.name}
                                        </button>
                                        <button
                                          type="button"
                                          title={`Remove ${t.name}`}
                                          onClick={() => void handleRemoveTerm(t)}
                                          className="mr-1.5 flex h-5 w-5 items-center justify-center rounded text-[#999] hover:bg-black/5 hover:text-[#E14C2A] cursor-pointer"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Selected Option Tab Rename & Quick Jump to Terms */}
                                {activeTermObj && (
                                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E8E8E8] bg-white px-3.5 py-2.5">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[12px] font-medium text-[#555]">Rename Tab:</span>
                                      <input
                                        type="text"
                                        value={activeTermObj.name}
                                        onChange={(e) => patchTerm(activeTermObj.key, { name: e.target.value })}
                                        className="h-8 rounded-md border border-[#D7D7D7] bg-white px-2.5 text-[13px] font-semibold text-[#111] outline-none focus:border-[#F47C35]"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenTerm(activeTermObj.key);
                                        setTab('terms');
                                      }}
                                      className="text-[12px] font-semibold text-[#F47C35] hover:underline cursor-pointer"
                                    >
                                      Configure Price & Stock in Terms →
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <p className="mt-4 rounded-lg border border-dashed border-[#D7D7D7] px-4 py-6 text-center text-[12px] text-[#888]">
                          Select one or more variant types from the dropdown above.
                        </p>
                      )}
                    </div>
                  )}

                  {tab === 'terms' && (
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-[15px] font-semibold">Terms & Per-Size Pack Configuration</h4>
                          <p className="text-[12px] text-gray-500">
                            Configure Unit Count (per pack), SKU, price, weight, and stock for each size/option tab.
                          </p>
                        </div>
                      </div>
                      {terms.length > 0 ? (
                        <div className="mt-4">
                          {/* Separate Option Tabs Bar */}
                          <div className="flex flex-wrap gap-2 border-b border-[#E7E7E7] pb-3">
                            {terms.map((t, idx) => {
                              const open = openTerm === t.key;
                              return (
                                <button
                                  key={t.key}
                                  type="button"
                                  onClick={() => setOpenTerm(t.key)}
                                  className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-[12px] font-semibold transition cursor-pointer ${
                                    open
                                      ? 'border-[#D6A7EA] bg-[#F6ECFA] text-[#5B2182]'
                                      : 'border-[#E0E0E0] bg-white text-[#333] hover:bg-gray-50'
                                  }`}
                                >
                                  <span className="text-[11px] opacity-70">#{idx + 1}</span>
                                  <span>{t.variantTypeName ? `${t.variantTypeName}: ${t.name}` : t.name}</span>
                                  {t.unitCount && (
                                    <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-[#F47C35]">
                                      {t.unitCount} pcs
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {terms.map((t) => {
                            if (openTerm !== t.key) return null;
                            return (
                              <div key={t.key} className="mt-4 rounded-xl border border-[#E7E7E7] bg-[#FAFAFA] p-4 space-y-4">
                                <div className="flex items-center justify-between border-b border-[#EEE] pb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[12px] font-medium text-[#666]">
                                      {t.variantTypeName || 'Option'} Tab Name:
                                    </span>
                                    <input
                                      type="text"
                                      value={t.name}
                                      onChange={(e) => patchTerm(t.key, { name: e.target.value })}
                                      className="h-8 rounded-md border border-[#D7D7D7] bg-white px-2.5 text-[13px] font-semibold text-[#F47C35] outline-none focus:border-[#F47C35]"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => void handleRemoveTerm(t)}
                                    className="text-[12px] font-semibold text-[#E14C2A] hover:underline cursor-pointer"
                                  >
                                    Remove Option
                                  </button>
                                </div>

                                {/* Unit Count (per pack) for this Size/Option */}
                                <div className="rounded-xl border border-[#EAEAEA] bg-white p-3.5">
                                  <Label htmlFor={`term-unit-count-${t.key}`}>
                                    Unit Count (per pack) for <span className="text-[#F47C35] font-semibold">{t.name}</span>
                                  </Label>
                                  <PresetChipsWithCustom
                                    id={`term-unit-count-${t.key}`}
                                    value={t.unitCount}
                                    onChange={(val) => patchTerm(t.key, { unitCount: val })}
                                    presets={UNIT_COUNT_PRESETS}
                                    suffix=" pcs"
                                    type="number"
                                    placeholder="Enter custom unit count for this size (e.g. 10)"
                                  />
                                </div>

                                {/* Variant SKU, Display Name, Weight (grams), Barcode */}
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <Label htmlFor={`term-sku-${t.key}`}>
                                      Variant SKU (auto-generated if blank)
                                    </Label>
                                    <input
                                      id={`term-sku-${t.key}`}
                                      value={t.sku}
                                      onChange={(e) => patchTerm(t.key, { sku: e.target.value })}
                                      placeholder={`Eg: ${(sku || productCode || 'SKU').toUpperCase()}-${t.name.toUpperCase()}`}
                                      className={termInputBase}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`term-vname-${t.key}`}>
                                      Variant Display Name (optional)
                                    </Label>
                                    <input
                                      id={`term-vname-${t.key}`}
                                      value={t.variantName}
                                      onChange={(e) => patchTerm(t.key, { variantName: e.target.value })}
                                      placeholder={
                                        t.unitCount
                                          ? `${t.name} (Pack of ${t.unitCount})`
                                          : `Eg: ${t.name} Size`
                                      }
                                      className={termInputBase}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`term-weight-${t.key}`}>Weight (in grams)</Label>
                                    <input
                                      id={`term-weight-${t.key}`}
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={t.weightGrams}
                                      onChange={(e) => patchTerm(t.key, { weightGrams: e.target.value })}
                                      placeholder="Eg: 450"
                                      className={termInputBase}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`term-barcode-${t.key}`}>Barcode / EAN (optional)</Label>
                                    <input
                                      id={`term-barcode-${t.key}`}
                                      value={t.barcode}
                                      onChange={(e) => patchTerm(t.key, { barcode: e.target.value })}
                                      placeholder="Eg: 8901234567890"
                                      className={termInputBase}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <Label htmlFor={`term-offer-${t.key}`}>Offer Percent (%)</Label>
                                  <input
                                    id={`term-offer-${t.key}`}
                                    type="number"
                                    min="0"
                                    max="99.99"
                                    step="0.01"
                                    value={t.offerPercent}
                                    onChange={(e) => {
                                      const nextOffer = e.target.value;
                                      patchTerm(t.key, {
                                        offerPercent: nextOffer,
                                        salePrice: salePriceFrom(t.regularPrice, nextOffer),
                                      });
                                    }}
                                    placeholder="Eg: 10"
                                    className={termInputBase}
                                  />
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <Label htmlFor={`term-regular-${t.key}`} required>
                                      Regular Price (MRP)
                                    </Label>
                                    <input
                                      id={`term-regular-${t.key}`}
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={t.regularPrice}
                                      onChange={(e) => {
                                        const nextReg = e.target.value;
                                        if (t.offerPercent.trim()) {
                                          patchTerm(t.key, {
                                            regularPrice: nextReg,
                                            salePrice: salePriceFrom(nextReg, t.offerPercent),
                                          });
                                        } else if (t.salePrice.trim()) {
                                          patchTerm(t.key, {
                                            regularPrice: nextReg,
                                            offerPercent: offerPercentFrom(nextReg, t.salePrice),
                                          });
                                        } else {
                                          patchTerm(t.key, { regularPrice: nextReg });
                                        }
                                      }}
                                      placeholder="Eg: 1000"
                                      className={termInputBase}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`term-sale-${t.key}`}>Sale Price (Offer Price)</Label>
                                    <input
                                      id={`term-sale-${t.key}`}
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={t.salePrice}
                                      onChange={(e) => {
                                        const nextSale = e.target.value;
                                        patchTerm(t.key, {
                                          salePrice: nextSale,
                                          offerPercent: offerPercentFrom(t.regularPrice, nextSale),
                                        });
                                      }}
                                      placeholder="Eg: 900"
                                      className={termInputBase}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label htmlFor={`term-stock-${t.key}`} required>
                                    Stock Quantity
                                  </Label>
                                  <input
                                    id={`term-stock-${t.key}`}
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={t.stockQuantity}
                                    onChange={(e) => patchTerm(t.key, { stockQuantity: e.target.value })}
                                    className={termInputBase}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`term-description-${t.key}`}>
                                    Option Notes / Description (optional)
                                  </Label>
                                  <textarea
                                    id={`term-description-${t.key}`}
                                    value={t.description}
                                    onChange={(e) => patchTerm(t.key, { description: e.target.value })}
                                    className="min-h-[90px] w-full rounded-lg border border-[#D7D7D7] bg-white p-4 text-[14px] outline-none focus:border-[#F47C35]"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setOpenTerm(null)}
                                  className="h-10 rounded-lg bg-[#F47C35] px-6 text-[13px] font-semibold text-white cursor-pointer"
                                >
                                  Done
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-4 px-4 py-8 text-center text-[12px] text-[#999] border border-[#E7E7E7]">
                          Select one or more variants in the Variants tab before configuring terms.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ------------------------- right column ------------------------ */}
            <div className="space-y-5">
              <section className={sectionCard}>
                <h3 className="text-[16px] font-semibold text-[#0D2B53]">Product Image</h3>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept={IMAGE_RULES.accept}
                  onChange={(e) => void onPickImages(e)}
                  className="sr-only"
                />
                <input
                  ref={replaceFileInputRef}
                  type="file"
                  accept={IMAGE_RULES.accept}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    const targetKey = replacingImageKey;
                    setReplacingImageKey(null);
                    if (!file || !targetKey) return;
                    const targetImg = images.find((x) => x.key === targetKey);
                    if (!targetImg) return;

                    if (editId && targetImg.backendImageId) {
                      try {
                        await replaceAdminProductImage(editId, targetImg.backendImageId, file);
                        const newBlobUrl = URL.createObjectURL(file);
                        setImages((prev) =>
                          prev.map((x) =>
                            x.key === targetKey
                              ? { ...x, src: newBlobUrl, name: file.name, size: file.size }
                              : x
                          )
                        );
                      } catch (err: any) {
                        setError(err?.message || 'Failed to replace product image.');
                      }
                    } else {
                      const newBlobUrl = URL.createObjectURL(file);
                      setImages((prev) =>
                        prev.map((x) =>
                          x.key === targetKey
                            ? { ...x, src: newBlobUrl, name: file.name, size: file.size, file }
                            : x
                        )
                      );
                    }
                  }}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-5 flex h-[190px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#B9B9B9] bg-white px-3 text-center cursor-pointer"
                >
                  <FileUp size={22} />
                  <span className="mt-4 text-[14px] font-semibold">
                    Upload Product Image
                  </span>
                  <span className="mt-1 text-[10px] text-[#666]">{IMAGE_RULES.requirements}</span>
                </button>
                {images.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {images.map((img, i) => {
                      const isPrimary = img.isPrimary ?? i === 0;
                      const isDeletingThis = deletingImageKey === img.key;
                      const isSettingPrimaryThis = settingPrimaryKey === img.key;
                      return (
                        <div key={img.key} className="group relative aspect-square overflow-hidden rounded-lg border bg-white">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.src} alt={`Product upload ${i + 1}`} className="h-full w-full object-contain" />
                          <div className="absolute top-1 right-1 z-10 flex items-center gap-1">
                            <button
                              type="button"
                              title="Replace this image"
                              disabled={isDeletingThis}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setReplacingImageKey(img.key);
                                replaceFileInputRef.current?.click();
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded bg-white/95 text-[#0D2B53] shadow-2xs hover:bg-orange-50 hover:text-[#F47C35] cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw size={12} />
                            </button>
                            {editId && img.backendImageId && !isPrimary && (
                              <button
                                type="button"
                                title="Set as Primary Image"
                                disabled={isSettingPrimaryThis || isDeletingThis}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  void handleSetPrimaryEditorImage(img);
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded bg-white/95 text-amber-500 shadow-2xs hover:bg-amber-50 cursor-pointer disabled:opacity-50"
                              >
                                {isSettingPrimaryThis ? (
                                  <Loader2 size={12} className="animate-spin text-amber-500" />
                                ) : (
                                  <Star size={12} />
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              title="Delete image"
                              disabled={isDeletingThis}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                void handleDeleteEditorImage(img);
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded bg-white/95 text-[#D43B28] shadow-2xs hover:bg-red-50 cursor-pointer disabled:opacity-50"
                            >
                              {isDeletingThis ? (
                                <Loader2 size={12} className="animate-spin text-[#D43B28]" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </button>
                          </div>
                          {isPrimary && (
                            <span className="absolute bottom-1 left-1 rounded bg-[#17375F] px-1.5 py-0.5 text-[8px] text-white">
                              Primary
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between text-[10px] text-[#888]">
                  <span>
                    {(totalImageBytes / (1024 * 1024)).toFixed(2)} / 10.00 MB total
                  </span>
                  <span>{images.length}/6 images</span>
                </div>
              </section>

              <section className={sectionCard}>
                <h3 className="text-[16px] font-semibold text-[#0D2B53]">Product Categories</h3>
                <p className="mt-1 text-[11px] text-[#6E6E6E]">
                  Select a root category to view and choose its sub-categories.
                </p>
                <div className="mt-3 max-h-[340px] overflow-y-auto pr-1">
                  {categoriesList.map((c) => {
                    const active = c.active !== false;
                    const isRootSelected = categoryId === c.id;
                    return (
                      <div key={c.id} className="border-b border-[#E1E1E1] last:border-b-0">
                        <label
                          className={`flex min-h-11 items-center gap-2.5 px-2 text-[12px] font-semibold transition-colors ${
                            active ? 'cursor-pointer' : 'cursor-not-allowed text-[#999]'
                          } ${isRootSelected ? 'bg-[#FFF5EF] text-[#0D2B53] rounded-t-lg' : ''}`}
                        >
                          <input
                            type="radio"
                            name="product-root-category"
                            disabled={!active}
                            checked={isRootSelected}
                            onChange={() => {
                              setCategoryId(c.id);
                              setSubCategoryId('');
                              setError('');
                            }}
                            className="h-[18px] w-[18px] accent-[#F47C35]"
                          />
                          {isRootSelected ? (
                            <ChevronDown size={14} className="text-[#F47C35] shrink-0" />
                          ) : (
                            <ChevronRight size={14} className="text-[#888] shrink-0" />
                          )}
                          <span className="truncate">{c.name}</span>
                          {c.subs.length > 0 && (
                            <span className="ml-auto rounded-full bg-white border border-[#E2E8F0] px-2 py-0.5 text-[10px] font-medium text-[#555]">
                              {c.subs.length} sub{c.subs.length === 1 ? '' : 's'}
                            </span>
                          )}
                          {!active && (
                            <span className="ml-auto rounded-full bg-[#F1F1F1] px-2 py-0.5 text-[9px] font-medium text-[#777]">
                              Inactive
                            </span>
                          )}
                        </label>

                        {/* Sub-categories are ONLY visible after selecting this root category */}
                        {isRootSelected && (
                          <div className="border-l-2 border-[#F47C35]/40 ml-4 my-1 pl-2 space-y-0.5">
                            {c.subs.length === 0 ? (
                              <p className="px-3 py-2 text-[11px] italic text-[#888]">
                                No sub-categories under this root category.
                              </p>
                            ) : (
                              c.subs.map((s) => {
                                const subActive = active && s.active !== false;
                                const isSubSelected = subCategoryId === s.id;
                                return (
                                  <label
                                    key={s.id}
                                    className={`flex min-h-9 items-center gap-2.5 rounded-md px-3 text-[11px] transition-colors ${
                                      subActive
                                        ? 'cursor-pointer text-[#333] hover:bg-white'
                                        : 'cursor-not-allowed text-[#A0A0A0]'
                                    } ${isSubSelected ? 'bg-white font-semibold text-[#F47C35] shadow-2xs' : ''}`}
                                  >
                                    <input
                                      type="radio"
                                      name="product-subcategory"
                                      disabled={!subActive}
                                      checked={isSubSelected}
                                      onChange={() => {
                                        setCategoryId(c.id);
                                        setSubCategoryId(s.id);
                                        setError('');
                                      }}
                                      className="h-4 w-4 accent-[#F47C35]"
                                    />
                                    <span aria-hidden="true" className="text-[#F47C35] font-bold">
                                      ↳
                                    </span>
                                    <span className="truncate">{s.name}</span>
                                    {!subActive && (
                                      <span className="ml-auto text-[9px]">Inactive</span>
                                    )}
                                  </label>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {categoriesList.length === 0 && (
                    <p className="py-6 text-center text-[11px] text-[#888]">No active categories are available.</p>
                  )}
                </div>
              </section>

              <section className={sectionCard}>
                <label htmlFor="product-brand" className="text-base font-semibold text-[#0D2B53]">
                  Brand (Optional)
                </label>
                <div className="mt-4 flex items-center gap-2">
                  <select
                    id="product-brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="h-12 min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 text-base"
                  >
                    <option value="">Unbranded</option>
                    {brandsList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  {brand && (
                    <button
                      type="button"
                      onClick={() => setBrand('')}
                      className="text-sm text-[#C35A20] underline"
                      aria-label="Clear brand"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-600">Leave blank for an unbranded product.</p>
              </section>
            </div>
          </div>
        </form>
      </section>

      {previewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-preview-title"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#162033]/50 p-3 sm:p-4 backdrop-blur-[2px] overflow-hidden"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target && !submitting) {
              if (successMessage) router.push('/admin/products');
              else setPreviewOpen(false);
            }
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-[800px] flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
            <header className="flex items-start justify-between border-b border-gray-100 px-5 sm:px-6 py-4 bg-white flex-shrink-0">
              <div>
                <h2 id="product-preview-title" className="text-[18px] sm:text-[20px] font-bold text-gray-900">
                  {successMessage
                    ? isEditing
                      ? 'Product updated'
                      : 'Product published'
                    : isEditing
                    ? 'Edit product preview'
                    : 'Product preview'}
                </h2>
                <p className="mt-0.5 text-[12px] sm:text-[13px] text-gray-500">
                  {successMessage || (isEditing ? 'Review details before updating product in catalog.' : 'Review details before saving and publishing to catalog.')}
                </p>
              </div>
              {!submitting && (
                <button
                  type="button"
                  aria-label="Close product preview"
                  onClick={() => (successMessage ? router.push('/admin/products') : setPreviewOpen(false))}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </header>

            {successMessage ? (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={34} />
                </span>
                <p className="mt-4 text-[15px] font-medium text-gray-800">{successMessage}</p>
                <button
                  type="button"
                  onClick={() => router.push('/admin/products')}
                  className="mt-6 h-11 rounded-lg bg-[#F47C35] px-8 text-[14px] font-semibold text-white hover:bg-[#E96F29] shadow-sm transition-colors"
                >
                  View products
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
                  <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
                    <div>
                      {images.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-2 gap-2">
                          {images.slice(0, 4).map((img, idx) => (
                            <div
                              key={img.key}
                              className="relative aspect-square rounded-lg border border-gray-200 bg-gray-50 overflow-hidden"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={img.src}
                                alt={img.name}
                                className="h-full w-full object-contain"
                              />
                              {idx === 0 && (
                                <span className="absolute bottom-1 left-1 rounded bg-[#17375F] px-1 py-0.5 text-[8px] font-semibold text-white">
                                  Primary
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex h-20 sm:h-28 md:h-36 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-[12px] text-gray-400">
                          No images attached
                        </div>
                      )}
                    </div>

                    <dl className="grid grid-cols-[85px_1fr] sm:grid-cols-[105px_1fr] gap-x-3 gap-y-2.5 text-[13px]">
                      <dt className="text-gray-500 font-medium">Product</dt>
                      <dd className="font-semibold text-gray-900 break-words">{name.trim()}</dd>

                      <dt className="text-gray-500 font-medium">Slug</dt>
                      <dd className="font-mono text-[12px] text-gray-700 break-all">
                        {generateProductSlug(slug.trim() || name.trim())}
                      </dd>

                      <dt className="text-gray-500 font-medium">Status</dt>
                      <dd className="capitalize font-medium">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                            productStatus === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : productStatus === 'draft'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}
                        >
                          {productStatus}
                        </span>
                      </dd>

                      <dt className="text-gray-500 font-medium">Category</dt>
                      <dd className="text-gray-800">
                        {category?.name || 'Unassigned'}
                        {subCategoryId ? ` / ${category?.subs.find((s) => s.id === subCategoryId)?.name}` : ''}
                      </dd>

                      <dt className="text-gray-500 font-medium">Brand</dt>
                      <dd className="text-gray-800">{brandName}</dd>

                      {shortDescription.trim() && (
                        <>
                          <dt className="text-gray-500 font-medium">Short Desc</dt>
                          <dd className="text-gray-800 break-words">{shortDescription.trim()}</dd>
                        </>
                      )}

                      {description.trim() && (
                        <>
                          <dt className="text-gray-500 font-medium">Description</dt>
                          <dd className="text-gray-800 whitespace-pre-line break-words max-h-32 overflow-y-auto pr-1">
                            {description.trim()}
                          </dd>
                        </>
                      )}

                      {details.length > 0 && (
                        <>
                          <dt className="text-gray-500 font-medium">Details</dt>
                          <dd className="text-gray-800 max-h-32 overflow-y-auto pr-1">
                            <ul className="list-disc pl-4 space-y-0.5">
                              {details.map((d) => (
                                <li key={d}>{d}</li>
                              ))}
                            </ul>
                          </dd>
                        </>
                      )}
                    </dl>
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-700 font-medium"
                    >
                      {error}
                    </p>
                  )}
                </div>

                <footer className="flex-shrink-0 border-t border-gray-100 bg-gray-50 px-5 sm:px-6 py-3 sm:py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setPreviewOpen(false);
                      setError('');
                    }}
                    className="h-10 sm:h-11 w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-5 text-[13px] sm:text-[14px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
                  >
                    Back to edit
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void confirmPublish()}
                    className="h-10 sm:h-11 w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-[#F47C35] px-6 text-[13px] sm:text-[14px] font-semibold text-white hover:bg-[#E96F29] disabled:opacity-60 shadow-sm transition-colors cursor-pointer"
                  >
                    {submitting && <Loader2 size={16} className="animate-spin" />}
                    {submitting
                      ? 'Saving...'
                      : isEditing
                      ? 'Confirm & Save Changes'
                      : productStatus === 'draft'
                      ? 'Confirm & Save Draft'
                      : productStatus === 'active'
                      ? 'Confirm & Publish'
                      : 'Confirm & Save'}
                  </button>
                </footer>
              </>
            )}
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
          <Loader2 className="h-8 w-8 animate-spin text-[#F47C35]" />
        </div>
      }
    >
      <ProductEditorContent initialIsEdit={initialIsEdit} />
    </Suspense>
  );
}
