'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  TestTube,
  Check,
  Stethoscope,
  Thermometer,
  Heart,
  Pill,
  Droplets,
  Activity,
  FlaskConical,
  ShieldPlus,
  Wind,
  Layers,
  Baby,
  Droplet,
  LucideIcon,
} from 'lucide-react';
import { mockTestCategories } from '@/data/mockData';
import { TestCategoryRecord } from '@/types/dashboard';

// Map icon name → Lucide component
const iconMap: Record<string, LucideIcon> = {
  Stethoscope, Thermometer, Heart, Pill, Droplets,
  Activity, FlaskConical, ShieldPlus, Wind, Layers, Baby, Droplet,
};

const emptyForm = {
  name: '',
  categoryCode: '',
  slug: '',
  icon: 'FlaskConical',
  iconBg: '#F0FDF4',
  iconColor: '#16A34A',
  statusCode: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
};

// Preset icon palette for Add/Edit modal
const iconPresets = [
  { icon: 'Stethoscope', iconBg: '#EFF6FF', iconColor: '#3B82F6', label: 'Full Body' },
  { icon: 'Thermometer',  iconBg: '#FEF2F2', iconColor: '#EF4444', label: 'Fever' },
  { icon: 'Heart',        iconBg: '#FFF1F2', iconColor: '#F43F5E', label: 'Heart' },
  { icon: 'Pill',         iconBg: '#FFFBEB', iconColor: '#F59E0B', label: 'Vitamin' },
  { icon: 'Droplets',     iconBg: '#EFF6FF', iconColor: '#2563EB', label: 'Diabetes' },
  { icon: 'Activity',     iconBg: '#F5F3FF', iconColor: '#7C3AED', label: 'Thyroid' },
  { icon: 'FlaskConical', iconBg: '#F0FDF4', iconColor: '#16A34A', label: 'Hormones' },
  { icon: 'ShieldPlus',   iconBg: '#F8FAFC', iconColor: '#475569', label: 'Cancer' },
  { icon: 'Wind',         iconBg: '#ECFDF5', iconColor: '#059669', label: 'Allergy' },
  { icon: 'Layers',       iconBg: '#F0F9FF', iconColor: '#0284C7', label: 'Combo' },
  { icon: 'Baby',         iconBg: '#FDF2F8', iconColor: '#DB2777', label: 'Pregnancy' },
  { icon: 'Droplet',      iconBg: '#FFF1F2', iconColor: '#E11D48', label: 'Anemia' },
];

export default function TestCategoriesPage() {
  const [categories, setCategories] = useState<TestCategoryRecord[]>(mockTestCategories);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [pageSize, setPageSize] = useState(13);
  const [currentPage, setCurrentPage] = useState(0);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<TestCategoryRecord | null>(null);
  const [catToDelete, setCatToDelete] = useState<TestCategoryRecord | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const openAdd = () => {
    setFormData(emptyForm);
    setEditingCat(null);
    setIsAddOpen(true);
  };

  const openEdit = (cat: TestCategoryRecord) => {
    setFormData({
      name: cat.name,
      categoryCode: cat.categoryCode,
      slug: cat.slug,
      icon: cat.icon,
      iconBg: cat.iconBg,
      iconColor: cat.iconColor,
      statusCode: cat.statusCode,
    });
    setEditingCat(cat);
    setIsAddOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCat) {
      setCategories((prev) =>
        prev.map((c) => (c.id === editingCat.id ? { ...c, ...formData } : c))
      );
      showToast(`Category "${formData.name}" updated successfully.`);
    } else {
      const newCat: TestCategoryRecord = {
        id: `cat-${Date.now()}`,
        ...formData,
        testsCount: 0,
        packagesCount: 0,
      };
      setCategories((prev) => [newCat, ...prev]);
      showToast(`Category "${formData.name}" added successfully.`);
    }
    setIsAddOpen(false);
  };

  const handleDelete = () => {
    if (!catToDelete) return;
    setCategories((prev) => prev.filter((c) => c.id !== catToDelete.id));
    showToast(`Category "${catToDelete.name}" removed.`);
    setCatToDelete(null);
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    }));
  };

  const filtered = useMemo(() => {
    return categories.filter((c) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.categoryCode.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q);
      const matchesStatus = !selectedStatus || c.statusCode === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [categories, searchQuery, selectedStatus]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  return (
    <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 rounded-xl bg-emerald-600 px-4 py-3 text-[13px] font-medium text-white shadow-xl">
          <Check size={16} />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-semibold text-black">Test Categories</h2>
          <p className="mt-1 text-[12px] font-normal text-[#626262]">
            Manage test categories. Click a category to manage its Tests &amp; Packages.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-[#E96F29] cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Category</span>
        </button>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <label className="relative block w-full max-w-[340px]">
          <span className="sr-only">Search categories</span>
          <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#999]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }}
            placeholder="Search by name, code, slug"
            className="h-11 w-full rounded-lg border border-[#D6DCE5] pr-4 pl-10 text-[13px] outline-none transition focus:border-[#F47C35]"
          />
        </label>
        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(0); }}
            className="h-11 appearance-none rounded-lg border border-[#D6DCE5] bg-white pr-8 pl-3 text-[13px] text-[#505050] outline-none cursor-pointer focus:border-[#F47C35]"
          >
            <option value="">Status: All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#9AA7BA]" />
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-lg border border-[#E5E5E5] shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead className="bg-[#E4E4E4] text-[12px] font-medium text-[#292929]">
              <tr className="h-[46px]">
                <th className="w-[64px] border-r border-white px-3 py-3 font-medium text-center">Icon</th>
                <th className="w-[120px] border-r border-white px-3 py-3 font-medium">Code</th>
                <th className="min-w-[180px] border-r border-white px-3 py-3 font-medium">Category Name</th>
                <th className="min-w-[150px] border-r border-white px-3 py-3 font-medium">Slug</th>
                <th className="w-[100px] border-r border-white px-3 py-3 font-medium text-center">Tests</th>
                <th className="w-[110px] border-r border-white px-3 py-3 font-medium text-center">Packages</th>
                <th className="w-[100px] border-r border-white px-3 py-3 font-medium">Status</th>
                <th className="w-[110px] px-3 py-3 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-[#505050]">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-[13px] text-[#777]">
                    <div className="flex flex-col items-center gap-3">
                      <TestTube size={36} className="text-[#D0D0D0]" />
                      <span>No categories found. Click <strong>Add Category</strong> to get started.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((cat) => {
                  const Icon = iconMap[cat.icon] ?? FlaskConical;
                  return (
                    <tr
                      key={cat.id}
                      className="h-[54px] border-b border-[#ECECEC] last:border-b-0 hover:bg-[#FAFAFA] transition-colors"
                    >
                      {/* Icon tile */}
                      <td className="px-3 text-center">
                        <div
                          className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl shadow-sm"
                          style={{ background: cat.iconBg }}
                        >
                          <Icon size={17} style={{ color: cat.iconColor }} strokeWidth={1.8} />
                        </div>
                      </td>
                      <td className="px-3 font-mono font-medium text-slate-800">{cat.categoryCode}</td>
                      <td className="px-3">
                        <Link
                          href={`/admin/labs/test-categories/${cat.id}`}
                          className="font-semibold text-slate-900 hover:text-[#F47C35] transition inline-flex items-center gap-1 group"
                        >
                          {cat.name}
                          <ChevronRight size={12} className="text-[#F47C35] opacity-0 group-hover:opacity-100 transition" />
                        </Link>
                      </td>
                      <td className="px-3 font-mono text-[10px] text-[#888]">{cat.slug}</td>
                      <td className="px-3 text-center">
                        <span className="inline-block rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                          {cat.testsCount}
                        </span>
                      </td>
                      <td className="px-3 text-center">
                        <span className="inline-block rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700">
                          {cat.packagesCount}
                        </span>
                      </td>
                      <td className="px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            cat.statusCode === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}
                        >
                          {cat.statusCode}
                        </span>
                      </td>
                      <td className="px-3 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <Link
                            href={`/admin/labs/test-categories/${cat.id}`}
                            title="Manage tests & packages"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-[#F47C35] hover:bg-orange-50 hover:border-orange-300 transition"
                          >
                            <TestTube size={13} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEdit(cat)}
                            title="Edit category"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCatToDelete(cat)}
                            title="Delete category"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer"
                          >
                            <Trash2 size={13} />
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

      {/* Pagination */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 text-[#606060]">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-normal text-[#17375F]">Show</span>
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(0); }}
              className="h-[32px] min-w-[64px] appearance-none rounded-md border border-[#DDE1E7] bg-white px-3 pr-8 text-[11px] text-[#17375F] outline-none cursor-pointer"
            >
              <option value="13">13</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#9AA0A6]" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-[#777]">{filtered.length} total</span>
          <button type="button" disabled={currentPage === 0} onClick={() => setCurrentPage(0)} className="disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:text-[#F47C35] transition"><ChevronsLeft size={18} strokeWidth={1.8} /></button>
          <button type="button" disabled={currentPage === 0} onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))} className="disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:text-[#F47C35] transition"><ChevronLeft size={18} strokeWidth={1.8} /></button>
          <span className="text-[11px]">Page {currentPage + 1} of {totalPages}</span>
          <button type="button" disabled={currentPage + 1 >= totalPages} onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages - 1))} className="disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:text-[#F47C35] transition"><ChevronRight size={18} strokeWidth={1.8} /></button>
          <button type="button" disabled={currentPage + 1 >= totalPages} onClick={() => setCurrentPage(totalPages - 1)} className="disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:text-[#F47C35] transition"><ChevronsRight size={18} strokeWidth={1.8} /></button>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[15px] font-bold text-gray-900">
                  {editingCat ? 'Edit Category' : 'Add Test Category'}
                </h3>
                <p className="text-[11px] text-[#777] mt-0.5">
                  {editingCat ? 'Update category details.' : 'Create a new test category for the app.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 cursor-pointer transition"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Icon picker */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-2">Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {iconPresets.map((preset) => {
                    const PIcon = iconMap[preset.icon] ?? FlaskConical;
                    const isSelected = formData.icon === preset.icon;
                    return (
                      <button
                        key={preset.icon}
                        type="button"
                        title={preset.label}
                        onClick={() => setFormData({ ...formData, icon: preset.icon, iconBg: preset.iconBg, iconColor: preset.iconColor })}
                        className={`flex h-10 w-full items-center justify-center rounded-xl border-2 transition cursor-pointer ${
                          isSelected ? 'border-[#F47C35] shadow-sm' : 'border-transparent'
                        }`}
                        style={{ background: preset.iconBg }}
                      >
                        <PIcon size={17} style={{ color: preset.iconColor }} strokeWidth={1.8} />
                      </button>
                    );
                  })}
                </div>
                {/* Preview */}
                <div className="mt-2 flex items-center gap-2 text-[11px] text-[#888]">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: formData.iconBg }}
                  >
                    {(() => { const PI = iconMap[formData.icon] ?? FlaskConical; return <PI size={15} style={{ color: formData.iconColor }} strokeWidth={1.8} />; })()}
                  </div>
                  <span>Selected: <strong className="text-gray-700">{formData.icon}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Hormones"
                    className="w-full h-10 px-3 rounded-lg border border-[#D6DCE5] text-[12px] outline-none focus:border-[#F47C35] transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Category Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.categoryCode}
                    onChange={(e) => setFormData({ ...formData, categoryCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. HORMONES"
                    className="w-full h-10 px-3 rounded-lg border border-[#D6DCE5] text-[12px] uppercase outline-none focus:border-[#F47C35] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Slug (auto-generated)</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[#D6DCE5] text-[12px] text-[#888] outline-none focus:border-[#F47C35] transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Status</label>
                <div className="relative">
                  <select
                    value={formData.statusCode}
                    onChange={(e) => setFormData({ ...formData, statusCode: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                    className="w-full h-10 appearance-none rounded-lg border border-[#D6DCE5] bg-white px-3 pr-8 text-[12px] outline-none cursor-pointer focus:border-[#F47C35] transition"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#9AA7BA]" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[12px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-lg bg-[#F47C35] px-5 text-[12px] font-semibold text-white hover:bg-[#E96F29] cursor-pointer transition"
                >
                  {editingCat ? 'Save Changes' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {catToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertTriangle size={24} />
            </div>
            <h3 className="mt-4 text-[16px] font-bold text-gray-900">Delete Category?</h3>
            <p className="mt-2 text-[13px] text-gray-600">
              Are you sure you want to delete{' '}
              <strong className="text-gray-900">{catToDelete.name}</strong>? All tests and packages under it will be unlinked.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setCatToDelete(null)} className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">Cancel</button>
              <button type="button" onClick={handleDelete} className="h-10 rounded-lg bg-rose-600 px-4 text-[13px] font-semibold text-white hover:bg-rose-700 cursor-pointer">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
