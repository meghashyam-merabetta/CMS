'use client';

import type { ChangeEvent, InvalidEvent } from 'react';
import { PRODUCT_DETAIL_FIELDS, ProductDetailField, ProductDetailKey, ProductDetailValues } from '@/lib/productDetails';

export function ProductDetailSummary({ values }: { values: ProductDetailValues }) {
  const filled = PRODUCT_DETAIL_FIELDS.filter((field) => values[field.key]?.trim());
  if (!filled.length) return null;
  return <details className="rounded-lg border border-gray-200 p-4">
    <summary className="cursor-pointer text-sm font-semibold">Additional Product Details ({filled.length})</summary>
    <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
      {filled.map((field) => <div key={field.key}><dt className="text-gray-500">{field.label}</dt><dd className="whitespace-pre-wrap break-words">{values[field.key] === 'true' ? 'Yes' : values[field.key] === 'false' ? 'No' : values[field.key]}</dd></div>)}
    </dl>
  </details>;
}

const EXCLUDED_DETAIL_FIELDS = new Set<ProductDetailKey>([
  'reusable',
  'accessories',
  'product_length',
  'product_breadth',
  'product_height',
  'product_dimension_unit',
]);

export default function AdditionalProductDetails({ values, onChange }: {
  values: ProductDetailValues;
  onChange: (values: ProductDetailValues) => void;
}) {
  const groups = [...new Set(PRODUCT_DETAIL_FIELDS.map((field) => field.group))];
  const inputClass = 'mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#F47C35]';
  return <section className="mt-6 space-y-4 rounded-2xl bg-[#F7F7F7] p-5">
    <h3 className="text-lg font-semibold">Additional Product Details</h3>
    <p className="text-sm text-gray-600">Add product identity, specifications, sale dates and delivery details where applicable.</p>
    {groups.map((group) => <details key={group} className="rounded-xl border border-gray-200 bg-white p-4">
      <summary className="cursor-pointer font-semibold text-[#0D2B53]">{group}</summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {(PRODUCT_DETAIL_FIELDS as readonly (ProductDetailField & { key: ProductDetailKey })[]).filter((field) => field.group === group && !EXCLUDED_DETAIL_FIELDS.has(field.key)).map((field) => {
          const id = `detail-${field.key}`;
          const common = {
            id, value: values[field.key] ?? '',
            onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => onChange({ ...values, [field.key]: event.target.value }),
            onInvalid: (event: InvalidEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
              const section = event.currentTarget.closest('details');
              if (section) section.open = true;
            },
            className: inputClass,
          };
          return <label key={field.key} htmlFor={id} className="text-sm font-medium text-gray-700">
            {field.label}
            {field.type === 'select' ? <select {...common}>
              <option value="">Not specified</option>
              {field.options?.map((value) => <option key={value} value={value}>{value === 'true' ? 'Yes' : value === 'false' ? 'No' : value.charAt(0).toUpperCase() + value.slice(1)}</option>)}
            </select> : field.type === 'textarea' ? <textarea {...common} className={`${inputClass} min-h-24 py-2`} /> : <input {...common} type={field.type ?? 'text'} min={field.min} max={field.max} step={field.step} />}
          </label>;
        })}
      </div>
    </details>)}
  </section>;
}
