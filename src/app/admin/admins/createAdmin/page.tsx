'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { createAdmin } from '@/lib/api';

export default function CreateAdminPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [state, setState] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [status, setStatus] = useState<'ACTIVE' | 'BLOCKED'>('ACTIVE');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 12) {
      setErrorMessage('Password must be at least 12 characters as required by the backend API.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createAdmin({
        name,
        email,
        password,
        city: city.trim() || 'Mumbai',
        pincode: pincode.trim() || '400001',
        state: state.trim() || 'Maharashtra',
      });
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/admin/admins');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create admin on server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 sm:p-8 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/admins"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#536A88] hover:text-[#F47C35] transition mb-3"
        >
          <ArrowLeft size={14} />
          <span>Back to Admin List</span>
        </Link>
        <h2 className="text-xl font-bold text-gray-900">Create Admin Account</h2>
        <p className="mt-1 text-xs text-[#626262]">
          Assign access permissions and credentials for a new admin user.
        </p>
      </div>

      {isSuccess && (
        <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 text-emerald-800 text-xs font-medium">
          <Check size={18} className="text-emerald-600" />
          <span>Admin account created successfully in the backend! Redirecting to list...</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 rounded-lg bg-rose-50 border border-rose-200 p-4 flex items-center gap-3 text-rose-800 text-xs font-medium">
          <AlertTriangle size={18} className="text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kulkarni"
              className="w-full h-11 px-3.5 rounded-lg border border-[#D6DCE5] text-xs outline-none focus:border-[#F47C35] bg-slate-50/50 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Work Email ID *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. ramesh@merabetta.com"
              className="w-full h-11 px-3.5 rounded-lg border border-[#D6DCE5] text-xs outline-none focus:border-[#F47C35] bg-slate-50/50 focus:bg-white transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Initial Password * (Min 12 characters)
            </label>
            <input
              type="password"
              required
              minLength={12}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 12 characters"
              className="w-full h-11 px-3.5 rounded-lg border border-[#D6DCE5] text-xs outline-none focus:border-[#F47C35] bg-slate-50/50 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Role Classification *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-[#D6DCE5] text-xs outline-none focus:border-[#F47C35] bg-white cursor-pointer"
            >
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="CATALOG_MANAGER">Catalog Manager</option>
              <option value="ORDER_OPERATIONS">Order Operations</option>
              <option value="SUPPORT_STAFF">Support Staff</option>
            </select>
          </div>
        </div>

        {/* Location Details (Required by Backend API) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              City *
            </label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Mumbai"
              className="w-full h-11 px-3.5 rounded-lg border border-[#D6DCE5] text-xs outline-none focus:border-[#F47C35] bg-slate-50/50 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Pincode *
            </label>
            <input
              type="text"
              required
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="e.g. 400001"
              className="w-full h-11 px-3.5 rounded-lg border border-[#D6DCE5] text-xs outline-none focus:border-[#F47C35] bg-slate-50/50 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              State *
            </label>
            <input
              type="text"
              required
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. Maharashtra"
              className="w-full h-11 px-3.5 rounded-lg border border-[#D6DCE5] text-xs outline-none focus:border-[#F47C35] bg-slate-50/50 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Permissions preview */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
            <ShieldCheck size={16} className="text-[#F47C35]" />
            <span>Assigned Module Permissions</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-600">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="accent-[#F47C35]" />
              <span>Dashboard View</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="accent-[#F47C35]" />
              <span>Catalog & Products</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="accent-[#F47C35]" />
              <span>Order Fulfillment</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="accent-[#F47C35]" />
              <span>Customer Inquiries</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked={role === 'SUPER_ADMIN'} className="accent-[#F47C35]" />
              <span>Admin Management</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="accent-[#F47C35]" />
              <span>Reports Export</span>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-3">
          <Link
            href="/admin/admins"
            className="px-5 py-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-[#F47C35] text-xs font-semibold text-white shadow-xs hover:bg-[#E96F29] transition cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            <span>{isSubmitting ? 'Creating...' : 'Save & Create Admin'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
