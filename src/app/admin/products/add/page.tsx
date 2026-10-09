'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Upload, Package } from 'lucide-react';

export default function AddProductPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Merabetta Care');
  const [category, setCategory] = useState('Mobility Aids');
  const [price, setPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [stock, setStock] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (status: 'PUBLISHED' | 'DRAFT') => {
    setIsSuccess(true);
    setTimeout(() => {
      router.push('/admin/products');
    }, 1200);
  };

  return (
    <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 sm:p-8 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#536A88] hover:text-[#F47C35] transition mb-3"
        >
          <ArrowLeft size={14} />
          <span>Back to Products</span>
        </Link>
        <h2 className="text-xl font-bold text-gray-900">Add New Product</h2>
        <p className="mt-1 text-xs text-[#626262]">
          Fill in catalog information to create a new health store item.
        </p>
      </div>

      {isSuccess && (
        <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 text-emerald-800 text-xs font-medium">
          <Check size={18} className="text-emerald-600" />
          <span>Product created successfully! Redirecting to catalog...</span>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit('PUBLISHED');
        }}
        className="space-y-6 max-w-3xl"
      >
        {/* Basic Details */}
        <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            1. General Information
          </h3>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Product Title *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ergonomic Walking Quad Cane with Soft Grip"
              className="w-full h-11 px-3.5 rounded-lg border border-[#D6DCE5] text-xs outline-none focus:border-[#F47C35] bg-white transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Brand *
              </label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-[#D6DCE5] text-xs outline-none focus:border-[#F47C35] bg-white cursor-pointer"
              >
                <option value="Merabetta Care">Merabetta Care</option>
                <option value="Omron">Omron</option>
                <option value="Vissco">Vissco</option>
                <option value="Karma Health">Karma Health</option>
                <option value="Friends Premium">Friends Premium</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-[#D6DCE5] text-xs outline-none focus:border-[#F47C35] bg-white cursor-pointer"
              >
                <option value="Mobility Aids">Mobility Aids</option>
                <option value="Health Monitoring">Health Monitoring</option>
                <option value="Bathroom Safety">Bathroom Safety</option>
                <option value="Patient Care & Bedding">Patient Care & Bedding</option>
                <option value="Personal Hygiene">Personal Hygiene</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                SKU / Item Code
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. MB-MOB-098"
                className="w-full h-11 px-3.5 rounded-lg border border-[#D6DCE5] text-xs outline-none focus:border-[#F47C35] bg-white transition"
              />
            </div>
          </div>
        </div>

        {/* Pricing & Inventory */}
        <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            2. Pricing & Stock
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 1499"
                className="w-full h-11 px-3.5 rounded-lg border border-[#D6DCE5] text-xs outline-none focus:border-[#F47C35] bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                MRP / List Price (₹)
              </label>
              <input
                type="number"
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                placeholder="e.g. 1999"
                className="w-full h-11 px-3.5 rounded-lg border border-[#D6DCE5] text-xs outline-none focus:border-[#F47C35] bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Stock Quantity *
              </label>
              <input
                type="number"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="e.g. 50"
                className="w-full h-11 px-3.5 rounded-lg border border-[#D6DCE5] text-xs outline-none focus:border-[#F47C35] bg-white transition"
              />
            </div>
          </div>
        </div>

        {/* Media Placeholder */}
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center bg-slate-50/30">
          <Upload size={24} className="mx-auto text-slate-400 mb-2" />
          <p className="text-xs font-semibold text-slate-700">
            Click to upload product photos
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            PNG, JPG or WebP up to 5MB (Min 800x800px recommended)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Link
            href="/admin/products"
            className="px-5 py-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => handleSubmit('DRAFT')}
            className="px-5 py-2.5 rounded-lg border border-[#F47C35] text-[#F47C35] text-xs font-semibold hover:bg-orange-50/50 transition cursor-pointer"
          >
            Save as Draft
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg bg-[#F47C35] text-xs font-semibold text-white shadow-xs hover:bg-[#E96F29] transition cursor-pointer"
          >
            Publish Product
          </button>
        </div>
      </form>
    </div>
  );
}
