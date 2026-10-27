'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Award,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  getAllAdminBrands,
  createAdminBrand,
  updateAdminBrand,
  deleteAdminBrand,
  generateBrandSlug,
} from '@/services/api/adminBrandsApi';
import { BackendBrand } from '@/types/api';

export default function BrandsPage() {
  const [brands, setBrands] = useState<BackendBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BackendBrand | null>(null);
  const [brandToDelete, setBrandToDelete] = useState<BackendBrand | null>(null);

  // Form State for Add
  const [newBrand, setNewBrand] = useState({
    brand_name: '',
    slug: '',
    description: '',
    image_url: '',
    is_active: true,
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadBrands = useCallback(async () => {
    setIsLoading(true);
    try {
      setBrands(await getAllAdminBrands());
    } catch (err: any) {
      showToast(err.message || 'Failed to load brands', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  const filtered = brands.filter(
    (b) =>
      (b.brand_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.slug || '').toLowerCase().includes(search.toLowerCase())
  );

  // Handle Add
  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand.brand_name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const created = await createAdminBrand({
        brand_name: newBrand.brand_name.trim(),
        slug: generateBrandSlug(newBrand.slug.trim() || newBrand.brand_name),
        description: newBrand.description.trim() || null,
        image_url: newBrand.image_url.trim() || null,
        is_active: newBrand.is_active,
      });

      setIsAddModalOpen(false);
      setNewBrand({
        brand_name: '',
        slug: '',
        description: '',
        image_url: '',
        is_active: true,
      });
      showToast(`Brand "${created.brand_name}" created successfully.`);
      await loadBrands();
    } catch (err: any) {
      showToast(err.message || 'Failed to create brand', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Save (PATCH only supported fields)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand || isSubmitting) return;

    const brandId = editingBrand.brand_id ?? editingBrand.id;
    if (!brandId) return;

    setIsSubmitting(true);
    try {
      const updated = await updateAdminBrand(brandId, {
        brand_name: editingBrand.brand_name.trim(),
        slug: generateBrandSlug(editingBrand.slug || editingBrand.brand_name),
        description: editingBrand.description?.trim() || null,
        image_url: editingBrand.image_url?.trim() || null,
        is_active: editingBrand.is_active !== false,
      });
      showToast(`Brand "${updated.brand_name}" updated successfully.`);
      setEditingBrand(null);
      await loadBrands();
    } catch (err: any) {
      showToast(err.message || 'Failed to update brand', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Confirm
  const handleConfirmDelete = async () => {
    if (!brandToDelete || isSubmitting) return;
    const brandId = brandToDelete.brand_id ?? brandToDelete.id;
    if (!brandId) return;

    setIsSubmitting(true);
    try {
      await deleteAdminBrand(brandId);
      showToast(`Brand "${brandToDelete.brand_name}" removed successfully.`);
      setBrandToDelete(null);
      await loadBrands();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete brand', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {toastMessage && (
        <div
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-[13px] font-medium ${
            toastMessage.type === 'success'
              ? 'border-emerald-200 bg-[#E8F8EE] text-[#1E7F3D]'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="cursor-pointer opacity-75 hover:opacity-100"
          >
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

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadBrands}
              disabled={isLoading}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-[#E96F29] cursor-pointer"
            >
              <Plus size={16} />
              <span>Add New Brand</span>
            </button>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <label className="relative block w-full max-w-[340px]">
            <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#999]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brands by name or slug..."
              className="h-11 w-full rounded-lg border border-[#D6DCE5] pr-4 pl-10 text-[13px] outline-none transition focus:border-[#F47C35]"
            />
          </label>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-[#E5E5E5] shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left">
              <thead className="bg-[#E4E4E4] text-[12px] font-medium text-[#292929]">
                <tr className="h-[46px]">
                  <th className="w-[80px] border-r border-white px-4 font-medium">ID</th>
                  <th className="min-w-[200px] border-r border-white px-4 font-medium">Brand Name</th>
                  <th className="min-w-[160px] border-r border-white px-4 font-medium">Slug</th>
                  <th className="min-w-[220px] border-r border-white px-4 font-medium">Description</th>
                  <th className="w-[120px] border-r border-white px-4 font-medium">Status</th>
                  <th className="w-[110px] px-4 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-[12px] text-[#505050]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-500">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 size={18} className="animate-spin text-[#F47C35]" />
                        <span>Loading brands...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No brands found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((b) => {
                    const id = b.brand_id ?? b.id;
                    const isActive = b.is_active !== false;
                    return (
                      <tr
                        key={String(id)}
                        className="h-[52px] border-b border-[#ECECEC] last:border-b-0 hover:bg-[#FAFAFA] transition-colors"
                      >
                        <td className="px-4 font-mono font-medium text-slate-800">#{id}</td>
                        <td className="px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            {b.image_url ? (
                              <img
                                src={b.image_url}
                                alt={b.brand_name}
                                className="h-6 w-6 rounded object-contain border border-gray-200"
                              />
                            ) : (
                              <Award size={16} className="text-[#F47C35] shrink-0" />
                            )}
                            <span>{b.brand_name}</span>
                          </div>
                        </td>
                        <td className="px-4 font-mono text-slate-600">{b.slug}</td>
                        <td className="px-4 text-[#606060] truncate max-w-[260px]">
                          {b.description || '—'}
                        </td>
                        <td className="px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold border ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            {isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="px-4 text-center">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingBrand({ ...b })}
                              title="Edit brand"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setBrandToDelete(b)}
                              title="Delete brand"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
                <label className="block font-medium text-gray-700">Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Joylife"
                  value={newBrand.brand_name}
                  onChange={(e) =>
                    setNewBrand({
                      ...newBrand,
                      brand_name: e.target.value,
                      slug: generateBrandSlug(e.target.value),
                    })
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Slug *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. joylife"
                  value={newBrand.slug}
                  onChange={(e) => setNewBrand({ ...newBrand, slug: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Logo Image URL</label>
                <input
                  type="url"
                  placeholder="https://cdn.example.com/joylife.png"
                  value={newBrand.image_url}
                  onChange={(e) => setNewBrand({ ...newBrand, image_url: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional brand description..."
                  value={newBrand.description}
                  onChange={(e) => setNewBrand({ ...newBrand, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#D6DCE5] p-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Status</label>
                <select
                  value={newBrand.is_active ? 'true' : 'false'}
                  onChange={(e) =>
                    setNewBrand({ ...newBrand, is_active: e.target.value === 'true' })
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                >
                  <option value="true">ACTIVE</option>
                  <option value="false">INACTIVE</option>
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
                disabled={isSubmitting}
                className="h-10 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white hover:bg-[#E96F29] cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Brand'}
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
                <span className="text-[12px] text-gray-500">
                  #{editingBrand.brand_id ?? editingBrand.id}
                </span>
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
                <label className="block font-medium text-gray-700">Brand Name *</label>
                <input
                  type="text"
                  required
                  value={editingBrand.brand_name}
                  onChange={(e) =>
                    setEditingBrand({ ...editingBrand, brand_name: e.target.value })
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Slug *</label>
                <input
                  type="text"
                  required
                  value={editingBrand.slug}
                  onChange={(e) => setEditingBrand({ ...editingBrand, slug: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Logo Image URL</label>
                <input
                  type="url"
                  value={editingBrand.image_url || ''}
                  onChange={(e) =>
                    setEditingBrand({ ...editingBrand, image_url: e.target.value })
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Description</label>
                <textarea
                  rows={2}
                  value={editingBrand.description || ''}
                  onChange={(e) =>
                    setEditingBrand({ ...editingBrand, description: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-[#D6DCE5] p-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Status</label>
                <select
                  value={editingBrand.is_active !== false ? 'true' : 'false'}
                  onChange={(e) =>
                    setEditingBrand({
                      ...editingBrand,
                      is_active: e.target.value === 'true',
                    })
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                >
                  <option value="true">ACTIVE</option>
                  <option value="false">INACTIVE</option>
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
                disabled={isSubmitting}
                className="h-10 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white hover:bg-[#E96F29] cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
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
              Are you sure you want to delete{' '}
              <strong className="text-gray-900">{brandToDelete.brand_name}</strong>?
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
                disabled={isSubmitting}
                onClick={handleConfirmDelete}
                className="h-10 rounded-lg bg-rose-600 px-4 text-[13px] font-semibold text-white hover:bg-rose-700 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
