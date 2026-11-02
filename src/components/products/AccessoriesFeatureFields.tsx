'use client';

import { useId, useState } from 'react';
import { PRODUCT_DETAIL_FIELDS, ProductDetailField, ProductDetailKey, ProductDetailValues } from '@/lib/productDetails';

const fields = PRODUCT_DETAIL_FIELDS.filter(field => field.group === 'Accessories & features' && field.key !== 'accessories') as readonly (ProductDetailField & { key: ProductDetailKey })[];

export default function AccessoriesFeatureFields({ values, onChange }: {
  values: ProductDetailValues;
  onChange: (values: ProductDetailValues) => void;
}) {
  const pickerId = useId();
  const [selected, setSelected] = useState<ProductDetailKey[]>([]);
  const [choice, setChoice] = useState('');
  // Saved values appear immediately, including false, even after an async load.
  const visible = fields.filter(field => selected.includes(field.key) || Boolean(values[field.key]?.trim()));
  const available = fields.filter(field => !visible.includes(field));
  function add() {
    const field = available.find(field => field.key === choice);
    if (!field) return;
    setSelected(previous => [...previous, field.key]);
    setChoice('');
  }
  function update(key: ProductDetailKey, value: string) {
    setSelected(previous => previous.includes(key) ? previous : [...previous, key]);
    onChange({ ...values, [key]: value });
  }
  return <div className="mt-4 space-y-4">
    <p className="text-sm text-gray-600">Choose the fields that apply to this product, then enter their details. You can remove fields you do not need.</p>
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-56 flex-1">
        <label htmlFor={pickerId} className="text-sm font-medium text-gray-700">Add an accessory or feature field</label>
        <select id={pickerId} value={choice} onChange={event => setChoice(event.target.value)} disabled={!available.length}
          className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#F47C35] disabled:opacity-50">
          <option value="">{available.length ? 'Select a field' : 'All available fields added'}</option>
          {available.map(field => <option key={field.key} value={field.key}>{field.label}</option>)}
        </select>
      </div>
      <button type="button" onClick={add} disabled={!choice} className="h-11 rounded-lg bg-[#F47C35] px-4 text-sm font-semibold text-white hover:bg-[#E96F29] disabled:cursor-not-allowed disabled:opacity-50">+ Add field</button>
    </div>
    {!visible.length && <p className="rounded-lg border border-dashed p-4 text-sm text-gray-500">No accessory or feature fields added.</p>}
    <div className="grid gap-4 sm:grid-cols-2">{visible.map(field => {
      const id = `detail-${field.key}`;
      return <div key={field.key} className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={id} className="text-sm font-medium text-gray-700">{field.label}</label>
          <button type="button" aria-label={`Remove ${field.label}`} onClick={() => {
            setSelected(previous => previous.filter(key => key !== field.key));
            onChange({ ...values, [field.key]: '' });
          }} className="text-xs text-red-600 underline">Remove</button>
        </div>
        {field.type === 'select' ? <select id={id} value={values[field.key] ?? ''} onChange={event => update(field.key, event.target.value)}
          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#F47C35]">
          <option value="">Not specified</option>
          {field.options?.map(option => <option key={option} value={option}>{option === 'true' ? 'Yes' : option === 'false' ? 'No' : option}</option>)}
        </select> : field.type === 'textarea' ? <textarea id={id} value={values[field.key] ?? ''} onChange={event => update(field.key, event.target.value)}
          className="min-h-24 w-full rounded-lg border border-gray-300 bg-white p-3 text-sm outline-none focus:border-[#F47C35]" />
          : <input id={id} value={values[field.key] ?? ''} onChange={event => update(field.key, event.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#F47C35]" />}
      </div>;
    })}</div>
  </div>;
}
