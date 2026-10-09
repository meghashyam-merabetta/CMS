'use client';

import React, { useState } from 'react';
import {
  Search,
  Plus,
  Award,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  code: string;
  productCount: number;
  status: 'ACTIVE' | 'INACTIVE';
  establishedYear: number;
}

const initialBrandsData: Brand[] = [
  { id: 'b1', name: 'Merabetta Care', code: 'BRD-001', productCount: 42, status: 'ACTIVE', establishedYear: 2024 },
  { id: 'b2', name: 'Omron Healthcare', code: 'BRD-002', productCount: 18, status: 'ACTIVE', establishedYear: 1933 },
  { id: 'b3', name: 'Vissco Rehabilitation', code: 'BRD-003', productCount: 35, status: 'ACTIVE', establishedYear: 1963 },
  { id: 'b4', name: 'Karma Mobility', code: 'BRD-004', productCount: 14, status: 'ACTIVE', establishedYear: 1987 },
  { id: 'b5', name: 'Friends Adult Care', code: 'BRD-005', productCount: 22, status: 'ACTIVE', establishedYear: 2000 },
  { id: 'b6', name: 'Tynor Orthotics', code: 'BRD-006', productCount: 29, status: 'ACTIVE', establishedYear: 1993 },
  { id: 'b7', name: 'Dr. Morepen', code: 'BRD-007', productCount: 16, status: 'ACTIVE', establishedYear: 2001 },
];

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>(initialBrandsData);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);

  // Form State for Add
  const [newBrand, setNewBrand] = useState({
    name: '',
    code: '',
    establishedYear: new Date().getFullYear(),
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filtered = brands.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.code.toLowerCase().includes(search.toLowerCase())
  );

  // Handle Add
  const handleAddBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand.name.trim() || !newBrand.code.trim()) return;

    const brandItem: Brand = {
      id: `b-${Date.now()}`,
      name: newBrand.name,
      code: newBrand.code.toUpperCase(),
      productCount: 0,
      status: newBrand.status,
      establishedYear: Number(newBrand.establishedYear) || 2024,
    };

    setBrands([brandItem, ...brands]);
    setIsAddModalOpen(false);
    setNewBrand({
      name: '',
      code: '',
      establishedYear: new Date().getFullYear(),
      status: 'ACTIVE',
    });
    showToast(`Brand "${brandItem.name}" created successfully.`);
  };

  // Handle Edit Save
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand) return;

    setBrands((prev) =>
      prev.map((b) => (b.id === editingBrand.id ? editingBrand : b))
    );
    showToast(`Brand "${editingBrand.name}" updated successfully.`);
    setEditingBrand(null);
  };

  // Handle Delete Confirm
  const handleConfirmDelete = () => {
    if (!brandToDelete) return;
    setBrands((prev) => prev.filter((b) => b.id !== brandToDelete.id));
    showToast(`Brand "${brandToDelete.name}" removed successfully.`);
    setBrandToDelete(null);
  };

  return (
    <div className="space-y-4">
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-semibold text-black">Brand Management</h2>
            <p className="mt-1 text-[12px] font-normal text-[#626262]">
              Manage verified medical supply manufacturers and partner brand profiles.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-[#E96F29] cursor-pointer"
          >
            <Plus size={16} />
            <span>Add New Brand</span>
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <label className="relative block w-full max-w-[340px]">
            <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#999]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brands by name or code..."
              className="h-11 w-full rounded-lg border border-[#D6DCE5] pr-4 pl-10 text-[13px] outline-none transition focus:border-[#F47C35]"
            />
          </label>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-[#E5E5E5] shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left">
              <thead className="bg-[#E4E4E4] text-[12px] font-medium text-[#292929]">
                <tr className="h-[46px]">
                  <th className="w-[120px] border-r border-white px-4 font-medium">Brand Code</th>
                  <th className="min-w-[200px] border-r border-white px-4 font-medium">Brand Name</th>
                  <th className="w-[150px] border-r border-white px-4 font-medium">Active Products</th>
                  <th className="w-[140px] border-r border-white px-4 font-medium">Est. Year</th>
                  <th className="w-[120px] border-r border-white px-4 font-medium">Status</th>
                  <th className="w-[110px] px-4 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-[12px] text-[#505050]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No brands found matching your search.
                    </td>
                  </tr>
                ) : (
                  filtered.map((b) => (
                    <tr
                      key={b.id}
                      className="h-[52px] border-b border-[#ECECEC] last:border-b-0 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="px-4 font-mono font-medium text-slate-800">{b.code}</td>
                      <td className="px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Award size={16} className="text-[#F47C35] shrink-0" />
                          <span>{b.name}</span>
                        </div>
                      </td>
                      <td className="px-4 font-semibold text-slate-900">{b.productCount} items listed</td>
                      <td className="px-4 text-[#606060]">{b.establishedYear}</td>
                      <td className="px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold border ${
                            b.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingBrand({ ...b })}
                            title="Edit brand"
                            aria-label={`Edit ${b.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setBrandToDelete(b)}
                            title="Delete brand"
                            aria-label={`Delete ${b.name}`}
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
      </div>

      {/* Add Brand Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleAddBrand}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-[16px] font-bold text-gray-900">Add New Brand</h3>
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
                <label className="block font-medium text-gray-700">Brand Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Philips Healthcare"
                  value={newBrand.name}
                  onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Brand Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BRD-008"
                  value={newBrand.code}
                  onChange={(e) => setNewBrand({ ...newBrand, code: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Established Year</label>
                <input
                  type="number"
                  required
                  value={newBrand.establishedYear}
                  onChange={(e) => setNewBrand({ ...newBrand, establishedYear: Number(e.target.value) })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Status</label>
                <select
                  value={newBrand.status}
                  onChange={(e) => setNewBrand({ ...newBrand, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
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
                Create Brand
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Brand Modal */}
      {editingBrand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-[16px] font-bold text-gray-900">Edit Brand</h3>
                <span className="text-[12px] text-gray-500">{editingBrand.code}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingBrand(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-[13px]">
              <div>
                <label className="block font-medium text-gray-700">Brand Name</label>
                <input
                  type="text"
                  required
                  value={editingBrand.name}
                  onChange={(e) => setEditingBrand({ ...editingBrand, name: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Brand Code</label>
                <input
                  type="text"
                  required
                  value={editingBrand.code}
                  onChange={(e) => setEditingBrand({ ...editingBrand, code: e.target.value.toUpperCase() })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Established Year</label>
                <input
                  type="number"
                  required
                  value={editingBrand.establishedYear}
                  onChange={(e) => setEditingBrand({ ...editingBrand, establishedYear: Number(e.target.value) })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Status</label>
                <select
                  value={editingBrand.status}
                  onChange={(e) => setEditingBrand({ ...editingBrand, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setEditingBrand(null)}
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
      {brandToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertTriangle size={24} />
            </div>

            <h3 className="mt-4 text-[16px] font-bold text-gray-900">Delete Brand?</h3>
            <p className="mt-2 text-[13px] text-gray-600">
              Are you sure you want to delete <strong className="text-gray-900">{brandToDelete.name}</strong> ({brandToDelete.code})?
              This will un-link {brandToDelete.productCount} products associated with this brand.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setBrandToDelete(null)}
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
