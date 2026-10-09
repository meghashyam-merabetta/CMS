'use client';

import React, { useState } from 'react';
import {
  Search,
  Plus,
  Layers,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface VariantType {
  id: string;
  name: string;
  values: string[];
  linkedProducts: number;
}

const initialVariants: VariantType[] = [
  { id: 'v1', name: 'Size', values: ['S', 'M', 'L', 'XL', 'Universal'], linkedProducts: 34 },
  { id: 'v2', name: 'Seat Width', values: ['16 inch', '18 inch', '20 inch'], linkedProducts: 12 },
  { id: 'v3', name: 'Height Adjustment', values: ['70-85cm', '85-100cm', '100-115cm'], linkedProducts: 18 },
  { id: 'v4', name: 'Pack Quantity', values: ['10 Pcs', '30 Pcs', '60 Pcs'], linkedProducts: 25 },
  { id: 'v5', name: 'Power / Battery Type', values: ['Rechargeable Li-ion', 'AAA Battery'], linkedProducts: 8 },
];

export default function ProductVariantsPage() {
  const [variants, setVariants] = useState<VariantType[]>(initialVariants);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<VariantType | null>(null);
  const [variantToDelete, setVariantToDelete] = useState<VariantType | null>(null);

  // Add form state
  const [newName, setNewName] = useState('');
  const [newOptionsText, setNewOptionsText] = useState('');

  // Edit form state
  const [editOptionsText, setEditOptionsText] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filtered = variants.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const parsedValues = newOptionsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const newV: VariantType = {
      id: `v-${Date.now()}`,
      name: newName.trim(),
      values: parsedValues.length > 0 ? parsedValues : ['Standard'],
      linkedProducts: 0,
    };

    setVariants([newV, ...variants]);
    setIsAddModalOpen(false);
    setNewName('');
    setNewOptionsText('');
    showToast(`Variant "${newV.name}" created successfully.`);
  };

  const handleStartEdit = (v: VariantType) => {
    setEditingVariant({ ...v });
    setEditOptionsText(v.values.join(', '));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVariant) return;

    const parsedValues = editOptionsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const updated = {
      ...editingVariant,
      values: parsedValues.length > 0 ? parsedValues : editingVariant.values,
    };

    setVariants((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    showToast(`Variant "${updated.name}" updated successfully.`);
    setEditingVariant(null);
  };

  const handleConfirmDelete = () => {
    if (!variantToDelete) return;
    setVariants((prev) => prev.filter((v) => v.id !== variantToDelete.id));
    showToast(`Variant "${variantToDelete.name}" removed successfully.`);
    setVariantToDelete(null);
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
            <h2 className="text-[16px] font-semibold text-black">Product Variants</h2>
            <p className="mt-1 text-[12px] font-normal text-[#626262]">
              Configure variant attributes, dimensions, and specifications.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-[#E96F29] cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Variant</span>
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <label className="relative block w-full max-w-[340px]">
            <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#999]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search variant types..."
              className="h-11 w-full rounded-lg border border-[#D6DCE5] pr-4 pl-10 text-[13px] outline-none transition focus:border-[#F47C35]"
            />
          </label>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-[#E5E5E5] shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] border-collapse text-left">
              <thead className="bg-[#E4E4E4] text-[12px] font-medium text-[#292929]">
                <tr className="h-[46px]">
                  <th className="min-w-[180px] border-r border-white px-4 font-medium">Variant Name</th>
                  <th className="min-w-[300px] border-r border-white px-4 font-medium">Available Options</th>
                  <th className="w-[160px] border-r border-white px-4 font-medium">Linked Products</th>
                  <th className="w-[110px] px-4 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-[12px] text-[#505050]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      No variant configurations found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((v) => (
                    <tr
                      key={v.id}
                      className="h-[52px] border-b border-[#ECECEC] last:border-b-0 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Layers size={16} className="text-[#F47C35] shrink-0" />
                          <span>{v.name}</span>
                        </div>
                      </td>
                      <td className="px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {v.values.map((val) => (
                            <span
                              key={val}
                              className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200"
                            >
                              {val}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 font-semibold text-slate-900">{v.linkedProducts} products</td>
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
                  ))
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
                <label className="block font-medium text-gray-700">Variant Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Color, Size, Capacity"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Available Options (comma separated)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Small, Medium, Large, XL"
                  value={newOptionsText}
                  onChange={(e) => setNewOptionsText(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
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
                Create Variant
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
                <label className="block font-medium text-gray-700">Variant Name</label>
                <input
                  type="text"
                  required
                  value={editingVariant.name}
                  onChange={(e) => setEditingVariant({ ...editingVariant, name: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Available Options (comma separated)</label>
                <input
                  type="text"
                  required
                  value={editOptionsText}
                  onChange={(e) => setEditOptionsText(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
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
                className="h-10 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white hover:bg-[#E96F29] cursor-pointer"
              >
                Save Changes
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
              Are you sure you want to delete <strong className="text-gray-900">{variantToDelete.name}</strong>?
              This variant attribute is linked to {variantToDelete.linkedProducts} catalog items.
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
