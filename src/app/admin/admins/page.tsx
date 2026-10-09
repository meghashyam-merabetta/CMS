'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
} from 'lucide-react';
import { mockAdmins } from '@/data/mockData';
import { AdminRecord } from '@/types/dashboard';

export default function AdminListPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminRecord[]>(mockAdmins);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number>(13);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [editingAdmin, setEditingAdmin] = useState<AdminRecord | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<AdminRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filtered admins
  const filteredAdmins = useMemo(() => {
    return admins.filter((admin) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        admin.adminCode.toLowerCase().includes(q) ||
        admin.name.toLowerCase().includes(q) ||
        admin.email.toLowerCase().includes(q);

      const matchesStatus =
        !selectedStatus || admin.statusCode.toLowerCase() === selectedStatus.toLowerCase();

      const matchesRole =
        !selectedRole ||
        admin.roles.some((r) => r.toLowerCase().includes(selectedRole.toLowerCase()));

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [admins, searchQuery, selectedStatus, selectedRole]);

  // Paginated admins
  const totalPages = Math.ceil(filteredAdmins.length / pageSize) || 1;
  const paginatedAdmins = filteredAdmins.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  // Select all visible
  const isAllSelected =
    paginatedAdmins.length > 0 &&
    paginatedAdmins.every((a) => selectedIds.includes(a.id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !paginatedAdmins.some((a) => a.id === id))
      );
    } else {
      setSelectedIds((prev) => [
        ...new Set([...prev, ...paginatedAdmins.map((a) => a.id)]),
      ]);
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      {/* Header with Title and Create Admin Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-semibold text-black">Admin List</h2>
          <p className="mt-1 text-[12px] font-normal text-[#626262]">
            Control admin accounts and their access.
          </p>
        </div>

        <Link
          href="/admin/admins/createAdmin"
          className="inline-flex h-[37px] items-center gap-1.5 rounded-md bg-[#F47C35] px-5 text-[12px] font-semibold text-white shadow-xs transition hover:bg-[#E96F29]"
        >
          <Plus size={15} />
          <span>Create Admin</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        {/* Search Input */}
        <label className="relative block w-full max-w-[313px]">
          <span className="sr-only">Search admins</span>
          <Search
            size={14}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-[#A0A8B4]"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(0);
            }}
            placeholder="Search by ID, name, email"
            className="h-[31px] w-full rounded-md border border-[#D6DCE5] bg-white pr-3 pl-9 text-[11px] font-normal outline-none placeholder:text-[#A3A3AD] focus:border-[#F47C35]"
          />
        </label>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(0);
            }}
            aria-label="Filter by Status"
            className="h-[31px] appearance-none rounded-md border border-[#D6DCE5] bg-white pr-7 pl-3 text-[11px] font-normal text-[#505050] outline-none cursor-pointer focus:border-[#F47C35]"
          >
            <option value="">Status: All</option>
            <option value="ACTIVE">Active</option>
            <option value="BLOCKED">Blocked</option>
          </select>
          <ChevronDown
            size={13}
            className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#9AA7BA]"
          />
        </div>

        {/* Role Filter */}
        <div className="relative">
          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setCurrentPage(0);
            }}
            aria-label="Filter by Role"
            className="h-[31px] appearance-none rounded-md border border-[#D6DCE5] bg-white pr-7 pl-3 text-[11px] font-normal text-[#505050] outline-none cursor-pointer focus:border-[#F47C35]"
          >
            <option value="">Role: All</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="CATALOG_MANAGER">Catalog Manager</option>
            <option value="ORDER_OPERATIONS">Order Operations</option>
            <option value="SUPPORT_STAFF">Support Staff</option>
          </select>
          <ChevronDown
            size={13}
            className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#9AA7BA]"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="mt-3 overflow-hidden rounded-lg border border-[#E5E5E5] shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead className="bg-[#E4E4E4] text-[12px] font-medium text-[#111111]">
              <tr>
                <th className="w-[40px] border-r border-white px-3 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    aria-label="Select all admins"
                    className="h-4 w-4 rounded border-gray-300 accent-[#F47C35] cursor-pointer"
                  />
                </th>
                <th className="border-r border-white px-4 py-2.5 font-medium">ID</th>
                <th className="border-r border-white px-4 py-2.5 font-medium">Name</th>
                <th className="border-r border-white px-4 py-2.5 font-medium">Email</th>
                <th className="border-r border-white px-4 py-2.5 font-medium">Permission</th>
                <th className="border-r border-white px-4 py-2.5 font-medium">Role</th>
                <th className="border-r border-white px-4 py-2.5 font-medium">Status</th>
                <th className="w-[105px] border-l border-white px-4 py-2.5 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-normal text-[#505050]">
              {paginatedAdmins.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[13px] text-[#777]">
                    No admin accounts found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedAdmins.map((admin) => {
                  const isSelected = selectedIds.includes(admin.id);
                  const isSuper = admin.roles.includes('SUPER_ADMIN');

                  return (
                    <tr
                      key={admin.id}
                      className="h-[39px] border-b border-[#E5E5E5] last:border-b-0 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(admin.id)}
                          aria-label={`Select ${admin.name}`}
                          className="h-4 w-4 rounded border-gray-300 accent-[#F47C35] cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-2 font-mono font-medium text-slate-800">
                        {admin.adminCode}
                      </td>
                      <td className="px-4 py-2 font-medium text-slate-900">
                        {admin.name}
                      </td>
                      <td className="px-4 py-2 text-[#606060]">{admin.email}</td>
                      <td className="px-4 py-2">
                        {admin.permissionCount} permissions
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isSuper
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-orange-50 text-[#F47C35] border border-orange-200'
                          }`}
                        >
                          {admin.roles.map((r) => r.replace(/_/g, ' ')).join(', ')}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`font-semibold ${
                            admin.statusCode === 'ACTIVE'
                              ? 'text-[#129122]'
                              : 'text-[#F02B2B]'
                          }`}
                        >
                          {admin.statusCode === 'ACTIVE' ? 'Active' : 'Blocked'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingAdmin({ ...admin })}
                            title="Edit admin"
                            aria-label={`Edit ${admin.name}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdminToDelete(admin)}
                            title="Delete admin"
                            aria-label={`Delete ${admin.name}`}
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

      {/* Pagination Footer */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 text-[#606060]">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-normal text-[#17375F]">Show</span>
          <div className="relative">
            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(0);
              }}
              className="h-[32px] min-w-[64px] appearance-none rounded-md border border-[#DDE1E7] bg-white px-3 pr-8 text-[11px] font-normal text-[#17375F] outline-none cursor-pointer"
            >
              <option value="13">13</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#9AA0A6]"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[11px] text-[#777]">
            {filteredAdmins.length} total
          </span>
          <button
            type="button"
            aria-label="First page"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(0)}
            className="disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:text-[#F47C35] transition"
          >
            <ChevronsLeft size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            aria-label="Previous page"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
            className="disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:text-[#F47C35] transition"
          >
            <ChevronLeft size={18} strokeWidth={1.8} />
          </button>
          <span className="text-[11px] font-normal">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            type="button"
            aria-label="Next page"
            disabled={currentPage + 1 >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages - 1))}
            className="disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:text-[#F47C35] transition"
          >
            <ChevronRight size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            aria-label="Last page"
            disabled={currentPage + 1 >= totalPages}
            onClick={() => setCurrentPage(totalPages - 1)}
            className="disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:text-[#F47C35] transition"
          >
            <ChevronsRight size={18} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Edit Admin Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAdmins((prev) =>
                prev.map((a) => (a.id === editingAdmin.id ? editingAdmin : a))
              );
              setToastMessage(`Admin "${editingAdmin.name}" profile updated.`);
              setEditingAdmin(null);
              setTimeout(() => setToastMessage(null), 3500);
            }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-[16px] font-bold text-gray-900">Edit Admin Profile</h3>
                <span className="text-[12px] text-gray-500">{editingAdmin.adminCode}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-[13px]">
              <div>
                <label className="block font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingAdmin.name}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, name: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={editingAdmin.email}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, email: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Status</label>
                <select
                  value={editingAdmin.statusCode}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, statusCode: e.target.value as any })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="BLOCKED">BLOCKED</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
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

      {/* Delete Admin Modal */}
      {adminToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertTriangle size={24} />
            </div>

            <h3 className="mt-4 text-[16px] font-bold text-gray-900">Remove Admin Account?</h3>
            <p className="mt-2 text-[13px] text-gray-600">
              Are you sure you want to revoke and delete <strong className="text-gray-900">{adminToDelete.name}</strong> ({adminToDelete.email})?
              They will instantly lose access to the Merabetta CRM backend.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdminToDelete(null)}
                className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdmins((prev) => prev.filter((a) => a.id !== adminToDelete.id));
                  setToastMessage(`Admin account for "${adminToDelete.name}" removed.`);
                  setAdminToDelete(null);
                  setTimeout(() => setToastMessage(null), 3500);
                }}
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
