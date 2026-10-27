'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Layers,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  getAdminVariantAttributes,
  createAdminVariantAttribute,
  updateAdminVariantAttribute,
  deleteAdminVariantAttribute,
} from '@/services/api/adminVariantAttributesApi';
import { BackendVariantAttribute } from '@/types/api';

export default function ProductVariantsPage() {
  const [variants, setVariants] = useState<BackendVariantAttribute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const [activeOptionByVariant, setActiveOptionByVariant] = useState<
    Record<string, string>
  >({});

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] =
    useState<BackendVariantAttribute | null>(null);
  const [variantToDelete, setVariantToDelete] =
    useState<BackendVariantAttribute | null>(null);

  // Add form state (separate tabs instead of comma separation)
  const [newName, setNewName] = useState('');
  const [newOptionsList, setNewOptionsList] = useState<string[]>(['']);
  const [activeAddTabIdx, setActiveAddTabIdx] = useState(0);

  // Edit form state (separate tabs instead of comma separation)
  const [editOptionsList, setEditOptionsList] = useState<string[]>(['']);
  const [activeEditTabIdx, setActiveEditTabIdx] = useState(0);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadVariantAttributes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAdminVariantAttributes({ limit: 100, offset: 0 });
      setVariants(res.data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load variant attributes', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVariantAttributes();
  }, [loadVariantAttributes]);

  const filtered = variants.filter((v) =>
    (v.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || isSubmitting) return;

    const parsedValues = newOptionsList.map((s) => s.trim()).filter(Boolean);
    if (parsedValues.length === 0) return;

    setIsSubmitting(true);
    try {
      const created = await createAdminVariantAttribute({
        name: newName.trim(),
        values: parsedValues,
      });

      setIsAddModalOpen(false);
      setNewName('');
      setNewOptionsList(['']);
      setActiveAddTabIdx(0);
      showToast(`Variant "${created.name}" created successfully.`);
      await loadVariantAttributes();
    } catch (err: any) {
      showToast(err.message || 'Failed to create variant attribute', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (v: BackendVariantAttribute) => {
    setEditingVariant({ ...v });
    setEditOptionsList(
      Array.isArray(v.values) && v.values.length > 0 ? [...v.values] : ['']
    );
    setActiveEditTabIdx(0);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVariant || isSubmitting) return;

    const parsedValues = editOptionsList.map((s) => s.trim()).filter(Boolean);
    if (parsedValues.length === 0) return;

    setIsSubmitting(true);
    try {
      const updated = await updateAdminVariantAttribute(editingVariant.id, {
        name: editingVariant.name.trim(),
        values: parsedValues,
      });

      showToast(`Variant "${updated.name}" updated successfully.`);
      setEditingVariant(null);
      await loadVariantAttributes();
    } catch (err: any) {
      showToast(err.message || 'Failed to update variant attribute', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!variantToDelete || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await deleteAdminVariantAttribute(variantToDelete.id);
      showToast(`Variant "${variantToDelete.name}" removed successfully.`);
      setVariantToDelete(null);
      await loadVariantAttributes();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete variant attribute', 'error');
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
            <h2 className="text-[16px] font-semibold text-black">
              Variant Attribute Definitions
            </h2>
            <p className="mt-1 text-[12px] font-normal text-[#626262]">
              Configure variant attributes and allowable options (e.g. Size, Pack, Color).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadVariantAttributes}
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
              <span>Add Variant</span>
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
              placeholder="Search variant attributes..."
              className="h-11 w-full rounded-lg border border-[#D6DCE5] pr-4 pl-10 text-[13px] outline-none transition focus:border-[#F47C35]"
            />
          </label>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-[#E5E5E5] shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] border-collapse text-left">
              <thead className="bg-[#E4E4E4] text-[12px] font-medium text-[#292929]">
                <tr className="h-[46px]">
                  <th className="w-[80px] border-r border-white px-4 font-medium">ID</th>
                  <th className="min-w-[180px] border-r border-white px-4 font-medium">Attribute Name</th>
                  <th className="min-w-[360px] border-r border-white px-4 font-medium">Available Options</th>
                  <th className="w-[110px] px-4 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-[12px] text-[#505050]">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-gray-500">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 size={18} className="animate-spin text-[#F47C35]" />
                        <span>Loading variant attributes...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      No variant configurations found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((v) => {
                    const keyId = String(v.id);
                    const values = Array.isArray(v.values) ? v.values : [];
                    const activeOpt = activeOptionByVariant[keyId] ?? values[0] ?? '';
                    return (
                      <tr
                        key={keyId}
                        className="h-[52px] border-b border-[#ECECEC] last:border-b-0 hover:bg-[#FAFAFA] transition-colors"
                      >
                        <td className="px-4 font-mono font-medium text-slate-800">#{v.id}</td>
                        <td className="px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <Layers size={16} className="text-[#F47C35] shrink-0" />
                            <span>{v.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1.5">
                            {values.map((val) => {
                              const isSelected = activeOpt === val;
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() =>
                                    setActiveOptionByVariant((prev) => ({
                                      ...prev,
                                      [keyId]: val,
                                    }))
                                  }
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#FFF4EE] text-[#F47C35] border-[#F47C35]'
                                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70'
                                  }`}
                                >
                                  {val}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-4 text-center">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(v)}
                              title="Edit variant"
                              aria-label={`Edit ${v.name}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setVariantToDelete(v)}
                              title="Delete variant"
                              aria-label={`Delete ${v.name}`}
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

      {/* Add Variant Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleAdd}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-[16px] font-bold text-gray-900">Add Variant Attribute</h3>
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
                <label className="block font-medium text-gray-700">Attribute Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Size, Color, Pack"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block font-medium text-gray-700">Option Tabs *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...newOptionsList, ''];
                      setNewOptionsList(next);
                      setActiveAddTabIdx(next.length - 1);
                    }}
                    className="inline-flex items-center gap-1 rounded-md bg-[#FFF4EE] px-2.5 py-1 text-[11px] font-semibold text-[#F47C35] border border-[#F47C35]/30 hover:bg-[#FFE8DB] cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Add Option Tab</span>
                  </button>
                </div>

                {/* Separate Tabs Bar */}
                <div className="mt-2 flex flex-wrap gap-1.5 border-b border-gray-200 pb-2">
                  {newOptionsList.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveAddTabIdx(idx)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[11px] font-semibold transition cursor-pointer ${
                        activeAddTabIdx === idx
                          ? 'border-[#F47C35] bg-[#FFF4EE] text-[#F47C35]'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span>{opt.trim() || `Tab #${idx + 1}`}</span>
                    </button>
                  ))}
                </div>

                {/* Active Option Tab Input */}
                {newOptionsList[activeAddTabIdx] !== undefined && (
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-gray-600">
                        Option Tab #{activeAddTabIdx + 1} Value (no commas)
                      </span>
                      {newOptionsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = newOptionsList.filter(
                              (_, i) => i !== activeAddTabIdx
                            );
                            setNewOptionsList(next);
                            setActiveAddTabIdx(Math.max(0, activeAddTabIdx - 1));
                          }}
                          className="text-[11px] font-medium text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove Tab
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      placeholder={`e.g. ${
                        activeAddTabIdx === 0
                          ? 'M'
                          : activeAddTabIdx === 1
                          ? 'L'
                          : 'XL'
                      }`}
                      value={newOptionsList[activeAddTabIdx]}
                      onChange={(e) => {
                        const next = [...newOptionsList];
                        next[activeAddTabIdx] = e.target.value;
                        setNewOptionsList(next);
                      }}
                      className="h-10 w-full rounded-lg border border-[#D6DCE5] bg-white px-3 text-[13px] outline-none focus:border-[#F47C35]"
                    />
                  </div>
                )}
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
                {isSubmitting ? 'Creating...' : 'Create Variant'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Variant Modal */}
      {editingVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-[16px] font-bold text-gray-900">Edit Variant Attribute</h3>
              <button
                type="button"
                onClick={() => setEditingVariant(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-[13px]">
              <div>
                <label className="block font-medium text-gray-700">Attribute Name *</label>
                <input
                  type="text"
                  required
                  value={editingVariant.name}
                  onChange={(e) =>
                    setEditingVariant({ ...editingVariant, name: e.target.value })
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block font-medium text-gray-700">Option Tabs *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...editOptionsList, ''];
                      setEditOptionsList(next);
                      setActiveEditTabIdx(next.length - 1);
                    }}
                    className="inline-flex items-center gap-1 rounded-md bg-[#FFF4EE] px-2.5 py-1 text-[11px] font-semibold text-[#F47C35] border border-[#F47C35]/30 hover:bg-[#FFE8DB] cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Add Option Tab</span>
                  </button>
                </div>

                {/* Separate Tabs Bar */}
                <div className="mt-2 flex flex-wrap gap-1.5 border-b border-gray-200 pb-2">
                  {editOptionsList.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveEditTabIdx(idx)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[11px] font-semibold transition cursor-pointer ${
                        activeEditTabIdx === idx
                          ? 'border-[#F47C35] bg-[#FFF4EE] text-[#F47C35]'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span>{opt.trim() || `Tab #${idx + 1}`}</span>
                    </button>
                  ))}
                </div>

                {/* Active Option Tab Input */}
                {editOptionsList[activeEditTabIdx] !== undefined && (
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-gray-600">
                        Option Tab #{activeEditTabIdx + 1} Value (no commas)
                      </span>
                      {editOptionsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = editOptionsList.filter(
                              (_, i) => i !== activeEditTabIdx
                            );
                            setEditOptionsList(next);
                            setActiveEditTabIdx(Math.max(0, activeEditTabIdx - 1));
                          }}
                          className="text-[11px] font-medium text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove Tab
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={editOptionsList[activeEditTabIdx]}
                      onChange={(e) => {
                        const next = [...editOptionsList];
                        next[activeEditTabIdx] = e.target.value;
                        setEditOptionsList(next);
                      }}
                      className="h-10 w-full rounded-lg border border-[#D6DCE5] bg-white px-3 text-[13px] outline-none focus:border-[#F47C35]"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setEditingVariant(null)}
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
      {variantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertTriangle size={24} />
            </div>

            <h3 className="mt-4 text-[16px] font-bold text-gray-900">Delete Variant?</h3>
            <p className="mt-2 text-[13px] text-gray-600">
              Are you sure you want to delete{' '}
              <strong className="text-gray-900">{variantToDelete.name}</strong>?
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setVariantToDelete(null)}
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
