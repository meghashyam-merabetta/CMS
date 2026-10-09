'use client';

import React, { useState } from 'react';
import {
  Search,
  Plus,
  Tag,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  title: string;
  type: 'GLOBAL' | 'SPECIFIC';
  discountText: string;
  minOrder: number;
  expiryDate: string;
  usedCount: number;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
}

const initialCoupons: Coupon[] = [
  {
    id: 'c1',
    code: 'SENIORCARE10',
    title: 'Senior Citizen Health Discount',
    type: 'GLOBAL',
    discountText: '10% OFF (Up to ₹500)',
    minOrder: 1500,
    expiryDate: '2026-12-31',
    usedCount: 420,
    status: 'ACTIVE',
  },
  {
    id: 'c2',
    code: 'FREESHIP',
    title: 'Free Shipping on Medical Devices',
    type: 'GLOBAL',
    discountText: 'Free Delivery (₹150 off)',
    minOrder: 999,
    expiryDate: '2026-11-30',
    usedCount: 890,
    status: 'ACTIVE',
  },
  {
    id: 'c3',
    code: 'MOBILITY500',
    title: 'Wheelchair & Walker Special',
    type: 'SPECIFIC',
    discountText: 'Flat ₹500 OFF',
    minOrder: 5000,
    expiryDate: '2026-10-31',
    usedCount: 75,
    status: 'ACTIVE',
  },
  {
    id: 'c4',
    code: 'DIAPERFEST',
    title: 'Adult Diapers Bulk Bundle',
    type: 'SPECIFIC',
    discountText: '15% OFF Bulk Packs',
    minOrder: 2000,
    expiryDate: '2025-09-30',
    usedCount: 230,
    status: 'EXPIRED',
  },
];

export default function CouponManagementPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);

  // Add form state
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    title: '',
    type: 'GLOBAL' as 'GLOBAL' | 'SPECIFIC',
    discountText: '',
    minOrder: 1000,
    expiryDate: '2026-12-31',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'EXPIRED',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filtered = coupons.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q);
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code.trim() || !newCoupon.title.trim()) return;

    const item: Coupon = {
      id: `c_${Date.now()}`,
      code: newCoupon.code.toUpperCase(),
      title: newCoupon.title,
      type: newCoupon.type,
      discountText: newCoupon.discountText || '10% OFF',
      minOrder: Number(newCoupon.minOrder) || 0,
      expiryDate: newCoupon.expiryDate,
      usedCount: 0,
      status: newCoupon.status,
    };

    setCoupons([item, ...coupons]);
    setIsAddModalOpen(false);
    setNewCoupon({
      code: '',
      title: '',
      type: 'GLOBAL',
      discountText: '',
      minOrder: 1000,
      expiryDate: '2026-12-31',
      status: 'ACTIVE',
    });
    showToast(`Coupon "${item.code}" created successfully.`);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon) return;

    setCoupons((prev) =>
      prev.map((c) => (c.id === editingCoupon.id ? editingCoupon : c))
    );
    showToast(`Coupon "${editingCoupon.code}" updated successfully.`);
    setEditingCoupon(null);
  };

  const handleConfirmDelete = () => {
    if (!couponToDelete) return;
    setCoupons((prev) => prev.filter((c) => c.id !== couponToDelete.id));
    showToast(`Coupon "${couponToDelete.code}" removed.`);
    setCouponToDelete(null);
  };

  return (
    <div className="space-y-4 font-poppins text-[#252525]">
      {toastMessage && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-[#E8F8EE] px-4 py-3 text-[13px] font-medium text-[#1E7F3D]">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[19px] font-semibold text-black">Coupon Management</h2>
            <p className="mt-1 text-[13px] text-[#626262]">
              Create discount promo codes, voucher campaigns, and cashback offers.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex h-11 items-center gap-2 rounded-xl bg-[#F47C35] px-5 text-[13px] font-semibold text-white shadow-xs hover:bg-[#E96F29] transition cursor-pointer"
          >
            <Plus size={17} />
            <span>Create Coupon</span>
          </button>
        </div>

        {/* Filters */}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <label className="relative w-full max-w-sm">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A0A8B4]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by coupon code or name"
              className="h-11 w-full rounded-xl border border-[#D7DEE8] pl-11 pr-4 text-[13px] outline-none transition focus:border-[#F47C35]"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 rounded-xl border border-[#D7DEE8] bg-white px-4 text-[13px] outline-none cursor-pointer focus:border-[#F47C35]"
          >
            <option value="">Status: All</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {/* Table */}
        <div className="mt-5 overflow-x-auto rounded-xl border border-[#E0E0E0] bg-white shadow-xs">
          <table className="w-full min-w-[900px] text-left text-[13px]">
            <thead className="bg-[#E4E4E4] text-[#111111]">
              <tr>
                {['Coupon Code', 'Campaign Title', 'Scope', 'Discount Benefit', 'Min Order', 'Expires On', 'Redemptions', 'Status', 'Action'].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3.5 font-medium border-r border-white last:border-r-0 ${
                      h === 'Action' ? 'text-center w-[110px]' : ''
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E4] text-[12px] text-[#505050]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    No coupons found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-4 font-mono font-bold text-[#F47C35]">
                      <div className="flex items-center gap-1.5">
                        <Tag size={14} />
                        <span>{c.code}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-900">{c.title}</td>
                    <td className="px-4 py-4">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {c.type}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-800">{c.discountText}</td>
                    <td className="px-4 py-4 text-slate-600">₹{c.minOrder}</td>
                    <td className="px-4 py-4 text-slate-600">{c.expiryDate}</td>
                    <td className="px-4 py-4 font-semibold text-slate-900">{c.usedCount} times</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          c.status === 'ACTIVE'
                            ? 'border-[#A9DBB2] bg-[#EAF8ED] text-[#168A2E]'
                            : 'border-[#F1C8BE] bg-[#FFF7F4] text-[#B43D25]'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingCoupon({ ...c })}
                          title="Edit coupon"
                          aria-label={`Edit ${c.code}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCouponToDelete(c)}
                          title="Delete coupon"
                          aria-label={`Delete ${c.code}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Coupon Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleAddCoupon}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-[16px] font-bold text-gray-900">Create Discount Coupon</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-[13px]">
              <div>
                <label className="block font-medium text-gray-700">Coupon Promo Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WELCOME200"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 font-mono text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Campaign Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. First Order Health Discount"
                  value={newCoupon.title}
                  onChange={(e) => setNewCoupon({ ...newCoupon, title: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Discount Benefit Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flat ₹200 OFF on orders above ₹1,000"
                  value={newCoupon.discountText}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discountText: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700">Min Order (₹)</label>
                  <input
                    type="number"
                    value={newCoupon.minOrder}
                    onChange={(e) => setNewCoupon({ ...newCoupon, minOrder: Number(e.target.value) })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700">Expiry Date</label>
                  <input
                    type="date"
                    value={newCoupon.expiryDate}
                    onChange={(e) => setNewCoupon({ ...newCoupon, expiryDate: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white hover:bg-[#E96F29] cursor-pointer"
              >
                Create Coupon
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Coupon Modal */}
      {editingCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-[16px] font-bold text-gray-900">Edit Coupon: {editingCoupon.code}</h3>
              <button
                type="button"
                onClick={() => setEditingCoupon(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-[13px]">
              <div>
                <label className="block font-medium text-gray-700">Campaign Title</label>
                <input
                  type="text"
                  required
                  value={editingCoupon.title}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, title: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Discount Benefit Description</label>
                <input
                  type="text"
                  required
                  value={editingCoupon.discountText}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, discountText: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700">Min Order (₹)</label>
                  <input
                    type="number"
                    value={editingCoupon.minOrder}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, minOrder: Number(e.target.value) })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700">Expiry Date</label>
                  <input
                    type="date"
                    value={editingCoupon.expiryDate}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, expiryDate: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700">Status</label>
                <select
                  value={editingCoupon.status}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, status: e.target.value as any })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="EXPIRED">EXPIRED</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setEditingCoupon(null)}
                className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white hover:bg-[#E96F29] cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {couponToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertTriangle size={24} />
            </div>

            <h3 className="mt-4 text-[16px] font-bold text-gray-900">Delete Coupon?</h3>
            <p className="mt-2 text-[13px] text-gray-600">
              Are you sure you want to delete promo code <strong className="text-gray-900">{couponToDelete.code}</strong>?
              Customers will no longer be able to apply this discount at checkout.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCouponToDelete(null)}
                className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="h-10 rounded-lg bg-rose-600 px-4 text-[13px] font-semibold text-white hover:bg-rose-700 cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
