'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, CheckCircle2, FileUp, Loader2, Trash2, X } from 'lucide-react';
import {
  createAdminProduct,
  updateAdminProduct,
  getAdminProductById,
} from '@/services/api/adminProductsApi';

/* ------------------------------------------------------------------ */
/* Static option data – replace with API calls (brands, categories,    */
/* age groups, variant types) when the backend endpoints are wired up. */
/* ------------------------------------------------------------------ */
interface Subcategory { id: string; name: string; active?: boolean }
interface Category { id: string; name: string; active?: boolean; subs: Subcategory[] }
interface VariantType { id: string; name: string; terms: { id: string; name: string }[] }

const AGE_GROUPS = [
  { id: 'infants', name: 'Infants', min: 0, max: 2 },
  { id: 'children', name: 'Children', min: 3, max: 12 },
  { id: 'teens', name: 'Teens', min: 13, max: 19 },
  { id: 'adults', name: 'Adults', min: 20, max: 59 },
  { id: 'seniors', name: 'Seniors', min: 60, max: null as number | null },
];

const BRANDS = [
  { id: 'merabetta-care', name: 'Merabetta Care' },
  { id: 'omron', name: 'Omron' },
  { id: 'vissco', name: 'Vissco' },
  { id: 'karma-health', name: 'Karma Health' },
];

const CATEGORIES: Category[] = [
  { id: 'comfort', name: 'Comfort & Furniture', subs: [] },
  { id: 'cushions', name: 'Cushions & Pillows', subs: [] },
  { id: 'daily-living', name: 'Daily Living', subs: [] },
  { id: 'mobility', name: 'Mobility Aids', subs: [] },
  {
    id: 'monitoring',
    name: 'Health Monitoring',
    subs: [{ id: 'health-care-products', name: 'Health Care products' }],
  },
];

const VARIANT_TYPES: VariantType[] = [
  {
    id: 'count',
    name: 'Count',
    terms: [
      { id: 'count-10', name: '10 Count' },
      { id: 'count-30', name: '30 Count' },
      { id: 'count-60', name: '60 Count' },
    ],
  },
  {
    id: 'specs-new-var',
    name: 'specs new var',
    terms: [
      { id: 'specs-a', name: 'Spec A' },
      { id: 'specs-b', name: 'Spec B' },
    ],
  },
  {
    id: 'support',
    name: 'SUPPORT',
    terms: [
      { id: 'support-light', name: 'Light' },
      { id: 'support-medium', name: 'Medium' },
      { id: 'support-firm', name: 'Firm' },
    ],
  },
  {
    id: 'size',
    name: 'Size',
    terms: [
      { id: 'size-s', name: 'Small' },
      { id: 'size-m', name: 'Medium' },
      { id: 'size-l', name: 'Large' },
    ],
  },
  {
    id: 'color',
    name: 'Color',
    terms: [
      { id: 'color-black', name: 'Black' },
      { id: 'color-blue', name: 'Blue' },
    ],
  },
  {
    id: 'pack-size',
    name: 'Pack Size',
    terms: [
      { id: 'pack-1', name: 'Pack of 1' },
      { id: 'pack-2', name: 'Pack of 2' },
      { id: 'pack-5', name: 'Pack of 5' },
    ],
  },
  {
    id: 'ayurveda',
    name: 'Ayurveda',
    terms: [
      { id: 'ayurveda-powder', name: 'Powder' },
      { id: 'ayurveda-tablet', name: 'Tablet' },
      { id: 'ayurveda-oil', name: 'Oil' },
    ],
  },
];

const IMAGE_RULES = {
  maxFiles: 6,
  maxBytes: 2 * 1024 * 1024,
  minWidth: 800,
  minHeight: 800,
  accept:
    'image/jpeg,image/png,image/webp,image/gif,image/tiff,image/bmp,image/svg+xml,image/heic,image/heif,image/avif,.psd,.heic,.heif,.avif,.tif,.tiff',
  requirements:
    'JPG, PNG, WebP, GIF, TIFF, BMP, PSD, SVG, HEIC/HEIF or AVIF · Max 2 MiB · At least 800×800 px · Images max 10,000 px per side and 25 MP. Formats without a browser preview require server verification.',
};

const TERM_IMAGE_REQUIREMENTS = IMAGE_RULES.requirements;

/* ------------------------------ helpers ----------------------------- */
const INPUT_CLASS =
  'h-12 w-full rounded-lg border border-[#D7D7D7] bg-white px-4 text-[14px] outline-none placeholder:text-[#A6A6A6] focus:border-[#F47C35] focus:ring-2 focus:ring-[#F47C35]/10';

const TABS = [
  { id: 'inventory', label: 'Inventory' },
  { id: 'shipping', label: 'Shipping' },
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
  return (Math.round((a * (1 - r / 100) + Number.EPSILON) * 100) / 100).toFixed(2);
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

function ageLabel(g: (typeof AGE_GROUPS)[number]) {
  if (g.min != null && g.max != null) return `${g.name} (${g.min}–${g.max} years)`;
  if (g.min != null) return `${g.name} (${g.min}+ years)`;
  if (g.max != null) return `${g.name} (Up to ${g.max} years)`;
  return g.name;
}

async function validateImage(file: File): Promise<void> {
  if (file.size > IMAGE_RULES.maxBytes) {
    throw new Error(`${file.name} exceeds the 2 MiB limit.`);
  }
  if (!file.type.startsWith('image/') || /tiff|heic|heif|photoshop/.test(file.type)) return;
  if (file.type === 'image/svg+xml') return;
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        if (img.naturalWidth < IMAGE_RULES.minWidth || img.naturalHeight < IMAGE_RULES.minHeight) {
          reject(new Error(`${file.name} must be at least ${IMAGE_RULES.minWidth}×${IMAGE_RULES.minHeight} px.`));
        } else if (
          img.naturalWidth > 10000 ||
          img.naturalHeight > 10000 ||
          img.naturalWidth * img.naturalHeight > 25_000_000
        ) {
          reject(new Error(`${file.name} exceeds the maximum dimensions.`));
        } else resolve();
      };
      img.onerror = () => reject(new Error(`${file.name} could not be read as an image.`));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
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
interface GalleryImage { key: string; src: string; name: string; file: File }
interface Term {
  key: string;
  termId: string;
  name: string;
  regularPrice: string;
  offerPercent: string;
  salePrice: string;
  stockQuantity: string;
  description: string;
  image: GalleryImage | null;
}

/* ------------------------------- page ------------------------------- */
function AddProductContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get('id') ?? null;

  const [name, setName] = useState('');
  const [prescription, setPrescription] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [description, setDescription] = useState('');
  const [detailsText, setDetailsText] = useState('');
  const [details, setDetails] = useState<string[]>([]);
  const [productType, setProductType] = useState<'SIMPLE' | 'VARIABLE'>('SIMPLE');
  const [tab, setTab] = useState<TabId>('inventory');
  const [sku, setSku] = useState('');
  const [minQty, setMinQty] = useState('');
  const [maxQty, setMaxQty] = useState('');
  const [offer, setOffer] = useState('');
  const [regular, setRegular] = useState('');
  const [sale, setSale] = useState('');
  const [stock, setStock] = useState('');
  const [returnAvail, setReturnAvail] = useState('Yes');
  const [returnDays, setReturnDays] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [variantTypeId, setVariantTypeId] = useState('');
  const [terms, setTerms] = useState<Term[]>([]);
  const [openTerm, setOpenTerm] = useState<string | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [termError, setTermError] = useState('');

  // Load existing product if editId is provided
  useEffect(() => {
    if (!editId) return;
    const currentId = editId;
    async function loadProduct(id: string) {
      try {
        const prod = await getAdminProductById(id);
        if (prod) {
          setName(prod.product_name || prod.name || '');
          setDescription(prod.description || '');
          setPrescription(prod.prescription_required ? 'Yes' : 'No');
          setAgeGroup(prod.age_group || 'adults');
          if (prod.category_id != null) {
            setCategoryId(String(prod.category_id));
          }
          setSku(`PRD-${editId}`);
          setMinQty('1');
          setMaxQty('10');
          setStock(String(prod.stock ?? 10));
          setRegular(String(prod.price ?? 999));
          const descBullets = prod.description ? parseDetails(prod.description) : ['Standard medical specifications'];
          setDetails(descBullets.length ? descBullets : ['Standard medical specifications']);
          setDetailsText(prod.description || 'Standard medical specifications');
        }
      } catch (err: any) {
        console.warn('Could not load product for editing:', err.message);
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

  const category = CATEGORIES.find((c) => c.id === categoryId);
  const variantType = VARIANT_TYPES.find((v) => v.id === variantTypeId);
  const brandName = BRANDS.find((b) => b.id === brand)?.name ?? 'Unbranded';

  const priceSummary = useMemo(() => {
    if (productType === 'SIMPLE') return `₹${sale || regular || '—'}`;
    const vals = terms.map((t) => num(t.salePrice) ?? num(t.regularPrice)).filter((v): v is number => v != null);
    if (!vals.length) return '—';
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    return lo === hi ? `₹${lo}` : `₹${lo} – ₹${hi}`;
  }, [productType, regular, sale, terms]);

  function validateBasics(): string {
    if (!name.trim() || !sku.trim() || !prescription || !ageGroup || !description.trim() || details.length === 0)
      return 'Complete all required product information.';
    if (!categoryId) return 'Select one main category.';
    const min = num(minQty);
    const max = num(maxQty);
    if (!min || !max || min < 1 || max < min || !Number.isInteger(min) || !Number.isInteger(max))
      return 'Enter valid minimum and maximum order quantities.';
    if (returnAvail === 'Yes') {
      const d = num(returnDays);
      if (!d || d < 1 || !Number.isInteger(d)) return 'Enter a valid return window in days.';
    }
    return '';
  }

  function validateAll(): string {
    const basics = validateBasics();
    if (basics) return basics;
    if (images.length === 0) return 'Upload at least one product image.';
    if (productType === 'SIMPLE') {
      const r = num(regular);
      const o = num(offer);
      const s = num(sale);
      const st = num(stock);
      if (!r || r <= 0 || st == null || st < 0 || !Number.isInteger(st))
        return 'Enter a valid regular price and numeric stock quantity.';
      if (o != null && (o < 0 || o > 99.99)) return 'Offer availability must be between 0 and 99.99%.';
      if (s != null && (s <= 0 || s > r))
        return 'Sale price must be greater than zero and cannot exceed the regular price.';
    } else {
      if (!variantTypeId || terms.length === 0) return 'Select one variant type and keep at least one term.';
      for (const t of terms) {
        const r = num(t.regularPrice);
        const o = num(t.offerPercent);
        const s = num(t.salePrice);
        const st = num(t.stockQuantity);
        if (!r || r <= 0 || st == null || st < 0 || !Number.isInteger(st) || !t.description.trim())
          return `Complete price, stock quantity, and description for ${t.name}.`;
        if (o != null && (o < 0 || o > 99.99)) return `Offer availability for ${t.name} must be between 0 and 99.99%.`;
        if (s != null && (s <= 0 || s > r)) return `Sale price for ${t.name} cannot exceed its regular price.`;
      }
    }
    return '';
  }

  async function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const room = IMAGE_RULES.maxFiles - images.length;
    const take = files.slice(0, room);
    const accepted: File[] = [];
    let msg = files.length > room ? `A product can have a maximum of ${IMAGE_RULES.maxFiles} gallery images.` : '';
    for (const f of take) {
      try {
        await validateImage(f);
        accepted.push(f);
      } catch (err) {
        msg = err instanceof Error ? err.message : 'Unable to use one of the selected images.';
      }
    }
    setError(msg);
    setImages((prev) => [
      ...prev,
      ...accepted.map((f) => ({ key: uid(), src: URL.createObjectURL(f), name: f.name, file: f })),
    ]);
    e.target.value = '';
  }

  async function onPickTermImage(key: string, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      await validateImage(f);
    } catch (err) {
      setTermError(err instanceof Error ? err.message : 'Unable to use the selected term image.');
      return;
    }
    setTerms((prev) =>
      prev.map((t) => {
        if (t.key !== key) return t;
        if (t.image) URL.revokeObjectURL(t.image.src);
        return { ...t, image: { key: uid(), src: URL.createObjectURL(f), name: f.name, file: f } };
      }),
    );
    setTermError('');
  }

  function patchTerm(key: string, patch: Partial<Term>) {
    setTerms((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  }

  function changeVariantType(id: string) {
    terms.forEach((t) => t.image && URL.revokeObjectURL(t.image.src));
    setVariantTypeId(id);
    setOpenTerm(null);
    setError('');
    const vt = VARIANT_TYPES.find((v) => v.id === id);
    if (!vt) {
      setTerms([]);
      return;
    }
    const next = vt.terms.map<Term>((t) => ({
      key: t.id,
      termId: t.id,
      name: t.name,
      regularPrice: '',
      offerPercent: '',
      salePrice: '',
      stockQuantity: '',
      description: '',
      image: null,
    }));
    setTerms(next);
    setOpenTerm(next[0]?.key ?? null);
  }

  /** Builds the payload that would be sent to the backend. */
  function buildPayload(status: 'DRAFT' | 'PUBLISHED') {
    return {
      status,
      productType,
      sku: sku.trim(),
      name: name.trim(),
      shortDescription: description.trim().slice(0, 500),
      description: description.trim(),
      details,
      brandId: brand || null,
      categoryId,
      subCategoryId: subCategoryId || null,
      ageGroupId: ageGroup,
      prescriptionRequired: prescription === 'Yes',
      minimumOrderQuantity: Number(minQty),
      maximumOrderQuantity: Number(maxQty),
      returnReplacementAvailable: returnAvail === 'Yes',
      returnWindowDays: returnAvail === 'Yes' ? Number(returnDays) : null,
      regularPrice: productType === 'SIMPLE' ? num(regular) : null,
      salePrice: productType === 'SIMPLE' && num(offer) == null ? num(sale) : null,
      availableOfferPercent: productType === 'SIMPLE' ? num(offer) : null,
      stockQuantity: productType === 'SIMPLE' ? num(stock) : null,
      variantTypeId: productType === 'VARIABLE' ? variantTypeId : null,
      variants:
        productType === 'VARIABLE'
          ? terms.map((t, i) => ({
              termId: t.termId,
              regularPrice: Number(t.regularPrice),
              salePrice: num(t.offerPercent) == null ? num(t.salePrice) : null,
              availableOfferPercent: num(t.offerPercent),
              stockQuantity: Number(t.stockQuantity),
              description: t.description.trim(),
              displayOrder: i,
            }))
          : [],
      images: images.map((img, i) => ({ altText: img.name, displayOrder: i, primary: i === 0 })),
    };
  }

  async function saveDraft() {
    setSaving(true);
    setError('');
    try {
      const msg = validateBasics();
      if (msg) throw new Error(msg);

      const catIdNum = Number(categoryId);
      const payload = {
        product_name: name.trim(),
        prescription_required: prescription === 'Yes',
        age_group: ageGroup || null,
        description: description.trim() || null,
        category_id: !isNaN(catIdNum) && catIdNum > 0 ? catIdNum : null,
      };

      if (editId) {
        await updateAdminProduct(editId, payload);
      } else {
        await createAdminProduct(payload);
      }
      setSuccessMessage('Draft saved successfully.');
      setTimeout(() => {
        router.replace('/admin/products');
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
      const catIdNum = Number(categoryId);
      const payload = {
        product_name: name.trim(),
        prescription_required: prescription === 'Yes',
        age_group: ageGroup || null,
        description: description.trim() || null,
        category_id: !isNaN(catIdNum) && catIdNum > 0 ? catIdNum : null,
      };

      if (editId) {
        await updateAdminProduct(editId, payload);
        setSuccessMessage('The product has been updated successfully!');
      } else {
        await createAdminProduct(payload);
        setSuccessMessage('The product has been published successfully!');
      }
      setTimeout(() => {
        router.push('/admin/products');
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
      <section className="min-h-[calc(100vh-90px)] rounded-2xl bg-white px-6 pt-[18px] pb-8 text-[#252525]">
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
          <div className="flex items-start justify-between gap-5">
            <div>
              <h2 className="text-[18px] font-semibold text-black">Add New Product</h2>
              <p className="mt-2 text-[14px] text-[#626262]">Add new products here</p>
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveDraft()}
                className="flex h-11 min-w-[150px] items-center justify-center gap-2 rounded-lg border border-[#777] bg-white px-6 text-[14px] font-medium text-[#626262] disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-11 min-w-[150px] rounded-lg bg-[#F47C35] px-7 text-[14px] font-semibold text-white hover:bg-[#E96F29] disabled:opacity-60"
              >
                Publish
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-[#B7DFC0] bg-[#F1FBF3] px-4 py-3 text-[12px] text-[#277A38]">
            Your account can publish product changes directly. The backend response remains authoritative.
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
                  setName(e.target.value);
                  setError('');
                }}
                maxLength={255}
                placeholder="Enter product name"
                className={INPUT_CLASS}
              />

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <Label htmlFor="prescription" required>
                    Prescription Required
                  </Label>
                  <Select
                    id="prescription"
                    value={prescription}
                    placeholder="Yes / No"
                    options={[
                      { value: 'Yes', label: 'Yes' },
                      { value: 'No', label: 'No' },
                    ]}
                    onChange={setPrescription}
                  />
                </div>
                <div>
                  <Label htmlFor="age-group" required>
                    Age Group
                  </Label>
                  <Select
                    id="age-group"
                    value={ageGroup}
                    placeholder="Select age group"
                    options={AGE_GROUPS.map((g) => ({ value: g.id, label: ageLabel(g) }))}
                    onChange={setAgeGroup}
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
                      <h4 className="text-[15px] font-semibold">Inventory</h4>
                      <div className="mt-5 grid gap-5 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <Label htmlFor="sku" required>
                            SKU
                          </Label>
                          <input
                            id="sku"
                            value={sku}
                            onChange={(e) => setSku(e.target.value)}
                            maxLength={255}
                            placeholder="Eg: 1565"
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div>
                          <Label htmlFor="minimum-quantity" required>
                            Min Order Quantity
                          </Label>
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
                          <Label htmlFor="maximum-quantity" required>
                            Max Order Quantity
                          </Label>
                          <input
                            id="maximum-quantity"
                            type="number"
                            min="1"
                            step="1"
                            value={maxQty}
                            onChange={(e) => setMaxQty(e.target.value)}
                            className={INPUT_CLASS}
                          />
                        </div>
                        {productType === 'SIMPLE' && (
                          <>
                            <div className="md:col-span-2">
                              <Label htmlFor="offer-percent">Offer availability (In%)</Label>
                              <input
                                id="offer-percent"
                                type="number"
                                min="0"
                                max="99.99"
                                step="0.01"
                                value={offer}
                                onChange={(e) => {
                                  setOffer(e.target.value);
                                  setSale(salePriceFrom(regular, e.target.value));
                                }}
                                placeholder="Eg: 20%"
                                className={INPUT_CLASS}
                              />
                            </div>
                            <div>
                              <Label htmlFor="regular-price" required>
                                Regular Price
                              </Label>
                              <input
                                id="regular-price"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={regular}
                                onChange={(e) => {
                                  setRegular(e.target.value);
                                  setSale(salePriceFrom(e.target.value, offer));
                                }}
                                className={INPUT_CLASS}
                              />
                            </div>
                            <div>
                              <Label htmlFor="sale-price">Sale Price</Label>
                              <input
                                id="sale-price"
                                type="number"
                                value={sale}
                                readOnly
                                placeholder="Calculated from offer"
                                className={`${INPUT_CLASS} cursor-not-allowed bg-[#F7F7F7] text-[#666]`}
                              />
                              <p className="mt-1 text-[10px] text-[#888]">
                                Calculated preview; the backend receives salePrice as null when an offer is supplied.
                              </p>
                            </div>
                            <div className="md:col-span-2">
                              <Label htmlFor="stock-quantity" required>
                                Stock Quantity
                              </Label>
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
                              <p className="mt-1 text-[10px] text-[#888]">Stock status is calculated by the backend.</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {tab === 'shipping' && (
                    <div>
                      <h4 className="text-[15px] font-semibold">Shipping</h4>
                      <div className="mt-5 space-y-5">
                        <div>
                          <Label htmlFor="return-available" required>
                            Return / Replacement Availability
                          </Label>
                          <Select
                            id="return-available"
                            value={returnAvail}
                            placeholder="Yes / No"
                            options={[
                              { value: 'Yes', label: 'Yes' },
                              { value: 'No', label: 'No' },
                            ]}
                            onChange={(v) => {
                              setReturnAvail(v);
                              if (v === 'No') setReturnDays('');
                            }}
                          />
                        </div>
                        {returnAvail === 'Yes' && (
                          <div>
                            <Label htmlFor="return-days" required>
                              Return Availability (In days)
                            </Label>
                            <input
                              id="return-days"
                              type="number"
                              min="1"
                              step="1"
                              value={returnDays}
                              onChange={(e) => setReturnDays(e.target.value)}
                              className={INPUT_CLASS}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {tab === 'variants' && (
                    <div>
                      <div className="flex items-center justify-between gap-4">
                        <h4 className="text-[15px] font-semibold">Add Variant Type:</h4>
                        <div className="w-full max-w-[260px]">
                          <Select
                            id="product-variant"
                            value={variantTypeId}
                            placeholder="Select Variant"
                            options={VARIANT_TYPES.map((v) => ({ value: v.id, label: v.name }))}
                            onChange={changeVariantType}
                          />
                        </div>
                      </div>
                      {variantType ? (
                        <div className="mt-4 flex items-center gap-4 border border-[#E8E8E8] px-4 py-3">
                          <span className="text-[12px]">#1</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-semibold">{variantType.name}</span>
                            <span className="block truncate text-[11px] text-[#999]">
                              {terms.map((t) => t.name).join(', ')}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => changeVariantType('')}
                            className="text-[11px] text-[#E14C2A]"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <p className="mt-4 rounded-lg border border-dashed border-[#D7D7D7] px-4 py-6 text-center text-[12px] text-[#888]">
                          Choose one variant type.
                        </p>
                      )}
                    </div>
                  )}

                  {tab === 'terms' && (
                    <div>
                      <h4 className="text-[15px] font-semibold">Terms</h4>
                      <div className="mt-4 overflow-hidden border border-[#E7E7E7]">
                        {terms.map((t, idx) => {
                          const open = openTerm === t.key;
                          return (
                            <div key={t.key} className="border-b border-[#E7E7E7] last:border-b-0">
                              <div className="flex min-h-12 items-center gap-3 px-4 py-2.5">
                                <button
                                  type="button"
                                  onClick={() => setOpenTerm(open ? null : t.key)}
                                  className="flex min-w-0 flex-1 items-center gap-4 text-left"
                                >
                                  <span className="text-[12px]">#{idx + 1}</span>
                                  <span className="truncate text-[13px] font-semibold">{t.name}</span>
                                  <ChevronDown
                                    size={15}
                                    className={`ml-auto transition-transform ${open ? 'rotate-180' : ''}`}
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (t.image) URL.revokeObjectURL(t.image.src);
                                    setTerms((prev) => prev.filter((x) => x.key !== t.key));
                                    if (openTerm === t.key) setOpenTerm(null);
                                  }}
                                  className="text-[11px] text-[#E14C2A]"
                                >
                                  Remove
                                </button>
                              </div>
                              {open && (
                                <div className="border-t border-[#EEE] px-4 py-5">
                                  <div className="max-w-62">
                                    <input
                                      id={`term-image-${t.key}`}
                                      type="file"
                                      accept={IMAGE_RULES.accept}
                                      onChange={(e) => void onPickTermImage(t.key, e)}
                                      className="sr-only"
                                    />
                                    {t.image ? (
                                      <div className="relative aspect-square overflow-hidden rounded-lg border">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={t.image.src}
                                          alt="Selected image"
                                          className="h-full w-full object-contain"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            URL.revokeObjectURL(t.image!.src);
                                            patchTerm(t.key, { image: null });
                                          }}
                                          className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded bg-white text-[#D43B28]"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    ) : (
                                      <label
                                        htmlFor={`term-image-${t.key}`}
                                        className="flex h-[150px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-2 text-center"
                                      >
                                        <FileUp size={19} />
                                        <span className="mt-2 text-[12px] font-semibold">Upload Image</span>
                                        <span className="mt-2 text-[11px] font-normal text-[#666666]">
                                          {TERM_IMAGE_REQUIREMENTS}
                                        </span>
                                      </label>
                                    )}
                                  </div>
                                  {termError && (
                                    <p
                                      role="alert"
                                      className="mt-4 rounded-lg border border-[#F4B6A2] bg-[#FFF6F2] px-4 py-3 text-[13px] text-[#C23D22]"
                                    >
                                      {termError}
                                    </p>
                                  )}
                                  <div className="mt-5">
                                    <Label htmlFor={`term-offer-${t.key}`}>Offer availability (In%)</Label>
                                    <input
                                      id={`term-offer-${t.key}`}
                                      type="number"
                                      min="0"
                                      max="99.99"
                                      step="0.01"
                                      value={t.offerPercent}
                                      onChange={(e) =>
                                        patchTerm(t.key, {
                                          offerPercent: e.target.value,
                                          salePrice: salePriceFrom(t.regularPrice, e.target.value),
                                        })
                                      }
                                      placeholder="Eg: 20%"
                                      className={termInputBase}
                                    />
                                  </div>
                                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                                    <div>
                                      <Label htmlFor={`term-regular-${t.key}`} required>
                                        Regular Price
                                      </Label>
                                      <input
                                        id={`term-regular-${t.key}`}
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={t.regularPrice}
                                        onChange={(e) =>
                                          patchTerm(t.key, {
                                            regularPrice: e.target.value,
                                            salePrice: salePriceFrom(e.target.value, t.offerPercent),
                                          })
                                        }
                                        className={termInputBase}
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor={`term-sale-${t.key}`}>Sale Price</Label>
                                      <input
                                        id={`term-sale-${t.key}`}
                                        type="number"
                                        value={t.salePrice}
                                        readOnly
                                        placeholder="Calculated from offer"
                                        className={`${termInputBase} cursor-not-allowed bg-[#F7F7F7] text-[#666]`}
                                      />
                                      <p className="mt-1 text-[10px] text-[#888]">
                                        Calculated preview; submitted salePrice is null when an offer is supplied.
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mt-5">
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
                                  <div className="mt-5">
                                    <Label htmlFor={`term-description-${t.key}`} required>
                                      Product Description
                                    </Label>
                                    <textarea
                                      id={`term-description-${t.key}`}
                                      value={t.description}
                                      onChange={(e) => patchTerm(t.key, { description: e.target.value })}
                                      className="min-h-[110px] w-full rounded-lg border border-[#D7D7D7] p-4 text-[14px] outline-none focus:border-[#F47C35]"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setOpenTerm(null)}
                                    className="mt-5 h-10 rounded-lg bg-[#F47C35] px-6 text-[13px] font-semibold text-white"
                                  >
                                    Save
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {terms.length === 0 && (
                          <p className="px-4 py-8 text-center text-[12px] text-[#999]">
                            Select a variant before configuring terms.
                          </p>
                        )}
                      </div>
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
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={images.length >= IMAGE_RULES.maxFiles}
                  className="mt-5 flex h-[190px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#B9B9B9] bg-white px-3 text-center disabled:opacity-55"
                >
                  <FileUp size={22} />
                  <span className="mt-4 text-[14px] font-semibold">
                    Upload Product Image (Max {IMAGE_RULES.maxFiles})
                  </span>
                  <span className="mt-1 text-[10px] text-[#666]">{IMAGE_RULES.requirements}</span>
                </button>
                {images.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {images.map((img, i) => (
                      <div key={img.key} className="relative aspect-square overflow-hidden rounded-lg border bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.src} alt={`Product upload ${i + 1}`} className="h-full w-full object-contain" />
                        <button
                          type="button"
                          onClick={() => {
                            URL.revokeObjectURL(img.src);
                            setImages((prev) => prev.filter((x) => x.key !== img.key));
                          }}
                          className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded bg-white text-[#D43B28]"
                        >
                          <Trash2 size={13} />
                        </button>
                        {i === 0 && (
                          <span className="absolute bottom-1 left-1 rounded bg-[#17375F] px-1.5 py-0.5 text-[8px] text-white">
                            Primary
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-right text-[10px] text-[#888]">{images.length}/6 images</p>
              </section>

              <section className={sectionCard}>
                <h3 className="text-[16px] font-semibold text-[#0D2B53]">Product Categories</h3>
                <div className="mt-4 max-h-[320px] overflow-y-auto pr-1">
                  {CATEGORIES.map((c) => {
                    const active = c.active !== false;
                    return (
                      <div key={c.id} className="border-b border-[#E1E1E1] last:border-b-0">
                        <label
                          className={`flex min-h-11 items-center gap-3 px-2 text-[12px] font-medium ${
                            active ? 'cursor-pointer' : 'cursor-not-allowed text-[#999]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="product-category"
                            disabled={!active}
                            checked={categoryId === c.id && !subCategoryId}
                            onChange={() => {
                              setCategoryId(c.id);
                              setSubCategoryId('');
                              setError('');
                            }}
                            className="h-[18px] w-[18px] accent-[#F47C35]"
                          />
                          {c.name}
                          {!active && (
                            <span className="ml-auto rounded-full bg-[#F1F1F1] px-2 py-0.5 text-[9px] font-medium text-[#777]">
                              Inactive
                            </span>
                          )}
                        </label>
                        {c.subs.map((s) => {
                          const subActive = active && s.active !== false;
                          return (
                            <label
                              key={s.id}
                              className={`flex min-h-10 items-center gap-3 border-t border-[#ECECEC] bg-white px-7 text-[11px] ${
                                subActive ? 'cursor-pointer text-[#5C5C5C]' : 'cursor-not-allowed text-[#A0A0A0]'
                              }`}
                            >
                              <input
                                type="radio"
                                name="product-category"
                                disabled={!subActive}
                                checked={categoryId === c.id && subCategoryId === s.id}
                                onChange={() => {
                                  setCategoryId(c.id);
                                  setSubCategoryId(s.id);
                                  setError('');
                                }}
                                className="h-4 w-4 accent-[#F47C35]"
                              />
                              <span aria-hidden="true">↳</span>
                              {s.name}
                              {!subActive && <span className="ml-auto text-[9px]">Inactive</span>}
                            </label>
                          );
                        })}
                      </div>
                    );
                  })}
                  {CATEGORIES.length === 0 && (
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
                    {BRANDS.map((b) => (
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
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#162033]/45 p-4 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target && !submitting) {
              if (successMessage) router.push('/admin/products');
              else setPreviewOpen(false);
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-[850px] overflow-y-auto rounded-2xl bg-white shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
            <header className="flex items-start justify-between border-b border-[#ECECEC] px-6 py-5">
              <div>
                <h2 id="product-preview-title" className="text-[20px] font-semibold text-[#151515]">
                  {successMessage ? 'Product published' : 'Product preview'}
                </h2>
                <p className="mt-1 text-[13px] text-[#747474]">
                  {successMessage || 'Confirmation will save the draft and request direct publication.'}
                </p>
              </div>
              {!submitting && (
                <button
                  type="button"
                  aria-label="Close product preview"
                  onClick={() => (successMessage ? router.push('/admin/products') : setPreviewOpen(false))}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#626262] hover:bg-[#F4F4F4]"
                >
                  <X size={20} />
                </button>
              )}
            </header>

            {successMessage ? (
              <div className="flex flex-col items-center px-6 py-14 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ECF8EF] text-[#279443]">
                  <CheckCircle2 size={34} />
                </span>
                <p className="mt-4 text-[14px] text-[#444]">{successMessage}</p>
                <button
                  type="button"
                  onClick={() => router.push('/admin/products')}
                  className="mt-6 h-11 rounded-lg bg-[#F47C35] px-7 text-[14px] font-semibold text-white hover:bg-[#E96F29]"
                >
                  View products
                </button>
              </div>
            ) : (
              <div className="px-6 py-5">
                <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
                  <div className="grid grid-cols-2 content-start gap-2">
                    {images.slice(0, 4).map((img) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={img.key}
                        src={img.src}
                        alt={img.name}
                        className="aspect-square w-full rounded-lg border object-contain"
                      />
                    ))}
                    {images.length === 0 && (
                      <div className="col-span-2 flex aspect-square items-center justify-center rounded-lg border text-[12px] text-[#999]">
                        No image
                      </div>
                    )}
                  </div>
                  <dl className="grid grid-cols-[110px_1fr] gap-y-3 text-[13px]">
                    <dt className="text-[#777]">Product</dt>
                    <dd className="font-medium">{name.trim()}</dd>
                    <dt className="text-[#777]">Category</dt>
                    <dd>
                      {category?.name}
                      {subCategoryId ? ` / ${category?.subs.find((s) => s.id === subCategoryId)?.name}` : ''}
                    </dd>
                    <dt className="text-[#777]">Brand</dt>
                    <dd>{brandName}</dd>
                    <dt className="text-[#777]">SKU</dt>
                    <dd>{sku.trim()}</dd>
                    <dt className="text-[#777]">Price</dt>
                    <dd>{priceSummary}</dd>
                    <dt className="text-[#777]">Description</dt>
                    <dd className="whitespace-pre-line">{description.trim()}</dd>
                    <dt className="text-[#777]">Product details</dt>
                    <dd>
                      <ul className="list-disc pl-4">
                        {details.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    </dd>
                  </dl>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="mt-4 rounded-lg border border-[#F4B6A2] bg-[#FFF6F2] px-4 py-3 text-[13px] text-[#C23D22]"
                  >
                    {error}
                  </p>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setPreviewOpen(false);
                      setError('');
                    }}
                    className="h-11 min-w-[150px] rounded-lg border border-[#777] bg-white px-6 text-[14px] font-medium text-[#626262] disabled:opacity-60"
                  >
                    Back to edit
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void confirmPublish()}
                    className="flex h-11 min-w-[190px] items-center justify-center gap-2 rounded-lg bg-[#F47C35] px-7 text-[14px] font-semibold text-white hover:bg-[#E96F29] disabled:opacity-60"
                  >
                    {submitting && <Loader2 size={17} className="animate-spin" />}
                    {submitting ? 'Publishing...' : 'Confirm & Publish'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function AddProductPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#F47C35]" />
        </div>
      }
    >
      <AddProductContent />
    </Suspense>
  );
}
