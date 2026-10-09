'use client';

import React, { useState, useMemo } from 'react';
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
  FlaskConical,
  MapPin,
  Phone,
  Mail,
  BadgeCheck,
  Check,
} from 'lucide-react';
import { mockLabs } from '@/data/mockData';
import { LabRecord } from '@/types/dashboard';

const emptyForm = {
  name: '',
  city: '',
  address: '',
  contactPerson: '',
  phone: '',
  email: '',
  accreditation: 'NABL',
  statusCode: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
};

export default function LabsPage() {
  const [labs, setLabs] = useState<LabRecord[]>(mockLabs);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [pageSize, setPageSize] = useState(13);
  const [currentPage, setCurrentPage] = useState(0);

  // Modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<LabRecord | null>(null);
  const [labToDelete, setLabToDelete] = useState<LabRecord | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const openAdd = () => {
    setFormData(emptyForm);
    setEditingLab(null);
    setIsAddOpen(true);
  };

  const openEdit = (lab: LabRecord) => {
    setFormData({
      name: lab.name,
      city: lab.city,
      address: lab.address,
      contactPerson: lab.contactPerson,
      phone: lab.phone,
      email: lab.email,
      accreditation: lab.accreditation,
      statusCode: lab.statusCode,
    });
    setEditingLab(lab);
    setIsAddOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLab) {
      setLabs((prev) =>
        prev.map((l) => (l.id === editingLab.id ? { ...l, ...formData } : l))
      );
      showToast(`Lab "${formData.name}" updated successfully.`);
    } else {
      const newLab: LabRecord = {
        id: `lab-${Date.now()}`,
        labCode: `LAB${String(labs.length + 1).padStart(3, '0')}`,
        ...formData,
        createdAt: new Date().toISOString(),
      };
      setLabs((prev) => [newLab, ...prev]);
      showToast(`Lab "${formData.name}" added successfully.`);
    }
    setIsAddOpen(false);
  };

  const handleDelete = () => {
    if (!labToDelete) return;
    setLabs((prev) => prev.filter((l) => l.id !== labToDelete.id));
    showToast(`Lab "${labToDelete.name}" removed.`);
    setLabToDelete(null);
  };

  const filtered = useMemo(() => {
    return labs.filter((l) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.labCode.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.contactPerson.toLowerCase().includes(q);
      const matchesStatus = !selectedStatus || l.statusCode === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [labs, searchQuery, selectedStatus]);

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
          <h2 className="text-[16px] font-semibold text-black">Lab Management</h2>
          <p className="mt-1 text-[12px] font-normal text-[#626262]">
            Manage registered diagnostic labs, their details and status.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-[#E96F29] cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Lab</span>
        </button>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <label className="relative block w-full max-w-[340px]">
          <span className="sr-only">Search labs</span>
          <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#999]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }}
            placeholder="Search by name, code, city, contact"
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
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead className="bg-[#E4E4E4] text-[12px] font-medium text-[#292929]">
              <tr className="h-[46px]">
                <th className="w-[110px] border-r border-white px-3 py-3 font-medium">Lab Code</th>
                <th className="min-w-[200px] border-r border-white px-3 py-3 font-medium">Lab Name</th>
                <th className="w-[120px] border-r border-white px-3 py-3 font-medium">City</th>
                <th className="min-w-[160px] border-r border-white px-3 py-3 font-medium">Contact Person</th>
                <th className="w-[140px] border-r border-white px-3 py-3 font-medium">Phone</th>
                <th className="w-[110px] border-r border-white px-3 py-3 font-medium">Accreditation</th>
                <th className="w-[100px] border-r border-white px-3 py-3 font-medium">Status</th>
                <th className="w-[90px] px-3 py-3 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-[#505050]">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-[13px] text-[#777]">
                    <div className="flex flex-col items-center gap-3">
                      <FlaskConical size={36} className="text-[#D0D0D0]" />
                      <span>No labs found. Click <strong>Add Lab</strong> to get started.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((lab) => (
                  <tr
                    key={lab.id}
                    className="h-[50px] border-b border-[#ECECEC] last:border-b-0 hover:bg-[#FAFAFA] transition-colors"
                  >
                    <td className="px-3 font-mono font-medium text-slate-800">{lab.labCode}</td>
                    <td className="px-3">
                      <div className="font-medium text-slate-900">{lab.name}</div>
                      <div className="text-[10px] text-[#888] flex items-center gap-1 mt-0.5">
                        <Mail size={9} />
                        {lab.email}
                      </div>
                    </td>
                    <td className="px-3">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="text-[#F47C35] shrink-0" />
                        {lab.city}
                      </span>
                    </td>
                    <td className="px-3 text-slate-700">{lab.contactPerson}</td>
                    <td className="px-3">
                      <span className="flex items-center gap-1">
                        <Phone size={11} className="text-[#888] shrink-0" />
                        {lab.phone}
                      </span>
                    </td>
                    <td className="px-3">
                      <span className="flex items-center gap-1 font-medium text-[#265D9B]">
                        <BadgeCheck size={12} className="shrink-0" />
                        {lab.accreditation}
                      </span>
                    </td>
                    <td className="px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          lab.statusCode === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}
                      >
                        {lab.statusCode}
                      </span>
                    </td>
                    <td className="px-3 text-center">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(lab)}
                          title="Edit lab"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setLabToDelete(lab)}
                          title="Delete lab"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer"
                        >
                          <Trash2 size={13} />
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
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[15px] font-bold text-gray-900">
                  {editingLab ? 'Edit Lab' : 'Add New Lab'}
                </h3>
                <p className="text-[11px] text-[#777] mt-0.5">
                  {editingLab ? 'Update lab information below.' : 'Fill in the details to register a new diagnostic lab.'}
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
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Lab Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. LifeCare Diagnostics"
                  className="w-full h-10 px-3 rounded-lg border border-[#D6DCE5] text-[12px] outline-none focus:border-[#F47C35] transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Mumbai"
                    className="w-full h-10 px-3 rounded-lg border border-[#D6DCE5] text-[12px] outline-none focus:border-[#F47C35] transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Accreditation</label>
                  <input
                    type="text"
                    value={formData.accreditation}
                    onChange={(e) => setFormData({ ...formData, accreditation: e.target.value })}
                    placeholder="e.g. NABL, ISO"
                    className="w-full h-10 px-3 rounded-lg border border-[#D6DCE5] text-[12px] outline-none focus:border-[#F47C35] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full address"
                  className="w-full h-10 px-3 rounded-lg border border-[#D6DCE5] text-[12px] outline-none focus:border-[#F47C35] transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Contact Person *</label>
                <input
                  type="text"
                  required
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="e.g. Dr. Ramesh Agarwal"
                  className="w-full h-10 px-3 rounded-lg border border-[#D6DCE5] text-[12px] outline-none focus:border-[#F47C35] transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="10-digit mobile"
                    className="w-full h-10 px-3 rounded-lg border border-[#D6DCE5] text-[12px] outline-none focus:border-[#F47C35] transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="lab@email.com"
                    className="w-full h-10 px-3 rounded-lg border border-[#D6DCE5] text-[12px] outline-none focus:border-[#F47C35] transition"
                  />
                </div>
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
                  {editingLab ? 'Save Changes' : 'Add Lab'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {labToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertTriangle size={24} />
            </div>
            <h3 className="mt-4 text-[16px] font-bold text-gray-900">Remove Lab?</h3>
            <p className="mt-2 text-[13px] text-gray-600">
              Are you sure you want to remove{' '}
              <strong className="text-gray-900">{labToDelete.name}</strong> ({labToDelete.labCode})?
              This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setLabToDelete(null)}
                className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="h-10 rounded-lg bg-rose-600 px-4 text-[13px] font-semibold text-white hover:bg-rose-700 cursor-pointer"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
