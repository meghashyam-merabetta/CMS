'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  Plus,
  FolderTree,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { mockCategories } from '@/data/mockData';
import { CategoryRecord } from '@/types/dashboard';

export default function CategoryManagementPage() {
  const [categories, setCategories] = useState<CategoryRecord[]>(mockCategories);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryRecord | null>(null);

  // Add form state
  const [newCat, setNewCat] = useState({
    name: '',
    categoryCode: '',
    slug: '',
    statusCode: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.categoryCode.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q);

      const matchesStatus =
        !selectedStatus || c.statusCode.toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [categories, searchQuery, selectedStatus]);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.name.trim() || !newCat.categoryCode.trim()) return;

    const newRecord: CategoryRecord = {
      id: `cat-${Date.now()}`,
      categoryCode: newCat.categoryCode.toUpperCase(),
      name: newCat.name,
      slug: newCat.slug || newCat.name.toLowerCase().replace(/\s+/g, '-'),
      subcategoriesCount: 0,
      productsCount: 0,
      statusCode: newCat.statusCode,
    };

    setCategories([newRecord, ...categories]);
    setIsAddModalOpen(false);
    setNewCat({ name: '', categoryCode: '', slug: '', statusCode: 'ACTIVE' });
    showToast(`Category "${newRecord.name}" created successfully.`);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    setCategories((prev) =>
      prev.map((c) => (c.id === editingCategory.id ? editingCategory : c))
    );
    showToast(`Category "${editingCategory.name}" updated successfully.`);
    setEditingCategory(null);
  };

  const handleConfirmDelete = () => {
    if (!categoryToDelete) return;
    setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id));
    showToast(`Category "${categoryToDelete.name}" removed successfully.`);
    setCategoryToDelete(null);
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
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-semibold text-black">Category Management</h2>
            <p className="mt-1 text-[12px] font-normal text-[#626262]">
              Organize products into hierarchical health categories and collections.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-[#E96F29] cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Category</span>
          </button>
        </div>

        {/* Filters & Search */}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <label className="relative block w-full max-w-[340px]">
            <span className="sr-only">Search categories</span>
            <Search
              size={14}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-[#999]"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories..."
              className="h-11 w-full rounded-lg border border-[#D6DCE5] pr-4 pl-10 text-[13px] outline-none transition focus:border-[#F47C35]"
            />
          </label>

          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-11 appearance-none rounded-lg border border-[#D6DCE5] bg-white pr-8 pl-3 text-[13px] font-normal text-[#505050] outline-none cursor-pointer focus:border-[#F47C35]"
            >
              <option value="">Status: All</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#9AA7BA]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-lg border border-[#E5E5E5] shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead className="bg-[#E4E4E4] text-[12px] font-medium text-[#292929]">
                <tr className="h-[46px]">
                  <th className="w-[120px] border-r border-white px-4 font-medium">Code</th>
                  <th className="min-w-[200px] border-r border-white px-4 font-medium">Category Name</th>
                  <th className="min-w-[160px] border-r border-white px-4 font-medium">Slug</th>
                  <th className="w-[140px] border-r border-white px-4 font-medium">Subcategories</th>
                  <th className="w-[140px] border-r border-white px-4 font-medium">Products</th>
                  <th className="w-[110px] border-r border-white px-4 font-medium">Status</th>
                  <th className="w-[110px] px-4 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-[12px] text-[#505050]">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No categories found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((c) => (
                    <tr
                      key={c.id}
                      className="h-[52px] border-b border-[#ECECEC] last:border-b-0 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="px-4 font-mono font-medium text-slate-800">
                        {c.categoryCode}
                      </td>
                      <td className="px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <FolderTree size={16} className="text-[#F47C35] shrink-0" />
                          <span>{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 text-[#606060] font-mono text-[11px]">
                        /{c.slug}
                      </td>
                      <td className="px-4 text-slate-700">
                        {c.subcategoriesCount} sub-groups
                      </td>
                      <td className="px-4 font-semibold text-slate-900">
                        {c.productsCount} items
                      </td>
                      <td className="px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold border ${
                            c.statusCode === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {c.statusCode}
                        </span>
                      </td>
                      <td className="px-4 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingCategory({ ...c })}
                            title="Edit category"
                            aria-label={`Edit ${c.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCategoryToDelete(c)}
                            title="Delete category"
                            aria-label={`Delete ${c.name}`}
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

      {/* Add Category Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleAddCategory}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-[16px] font-bold text-gray-900">Add New Category</h3>
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
                <label className="block font-medium text-gray-700">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Respiratory Care"
                  value={newCat.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewCat({
                      ...newCat,
                      name,
                      slug: name.toLowerCase().replace(/\s+/g, '-'),
                    });
                  }}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Category Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CAT-008"
                  value={newCat.categoryCode}
                  onChange={(e) => setNewCat({ ...newCat, categoryCode: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">URL Slug</label>
                <input
                  type="text"
                  required
                  value={newCat.slug}
                  onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Status</label>
                <select
                  value={newCat.statusCode}
                  onChange={(e) => setNewCat({ ...newCat, statusCode: e.target.value as 'ACTIVE' | 'INACTIVE' })}
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
                Create Category
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-[16px] font-bold text-gray-900">Edit Category</h3>
                <span className="text-[12px] text-gray-500">{editingCategory.categoryCode}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-[13px]">
              <div>
                <label className="block font-medium text-gray-700">Category Name</label>
                <input
                  type="text"
                  required
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">URL Slug</label>
                <input
                  type="text"
                  required
                  value={editingCategory.slug}
                  onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Status</label>
                <select
                  value={editingCategory.statusCode}
                  onChange={(e) => setEditingCategory({ ...editingCategory, statusCode: e.target.value as 'ACTIVE' | 'INACTIVE' })}
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
                onClick={() => setEditingCategory(null)}
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
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertTriangle size={24} />
            </div>

            <h3 className="mt-4 text-[16px] font-bold text-gray-900">Delete Category?</h3>
            <p className="mt-2 text-[13px] text-gray-600">
              Are you sure you want to delete <strong className="text-gray-900">{categoryToDelete.name}</strong>?
              This category currently contains {categoryToDelete.productsCount} catalog items.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
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
