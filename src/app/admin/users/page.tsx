'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
} from 'lucide-react';
import { CustomerUserRecord } from '@/types/dashboard';
import { getAdminUsers } from '@/services/api/adminUsersApi';
import { BackendUser } from '@/types/api';

function mapBackendUserToRecord(bu: BackendUser, idx: number): CustomerUserRecord {
  return {
    id: bu.id,
    customerCode: `CUST-${(8901 + idx).toString()}`,
    displayName: bu.name,
    email: bu.email,
    mobile: '+91 98765 43210',
    city: 'Mumbai',
    createdAt: new Date().toISOString(),
    statusCode: bu.active ? 'ACTIVE' : 'BLOCKED',
    totalOrders: 0,
  };
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<CustomerUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(0);

  const loadUsers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAdminUsers();
      if (Array.isArray(data)) {
        setUsers(data.map(mapBackendUserToRecord));
        setIsLive(true);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.warn('Backend users error:', err);
      setUsers([]);
      setIsLive(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        u.customerCode.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.mobile.toLowerCase().includes(q);

      const matchesStatus =
        !selectedStatus || u.statusCode.toLowerCase() === selectedStatus.toLowerCase();

      const matchesCity =
        !selectedCity || u.city.toLowerCase() === selectedCity.toLowerCase();

      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [users, searchQuery, selectedStatus, selectedCity]);

  // Paginated users
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = filteredUsers.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  return (
    <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-black">Users List</h2>
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live API
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#626262]">Control users accounts here</p>
        </div>

        <button
          type="button"
          onClick={loadUsers}
          disabled={isLoading}
          title="Reload from API"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters & Search Row */}
      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        {/* Search Input */}
        <label className="relative block w-full max-w-[365px]">
          <span className="sr-only">Search users</span>
          <Search
            size={14}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-[#999]"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(0);
            }}
            placeholder="Search by ID, name, email, phone"
            className="h-11 w-full rounded-lg border border-[#D6DCE5] pr-4 pl-10 text-[13px] outline-none transition focus:border-[#F47C35]"
          />
        </label>

        {/* Status Dropdown */}
        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(0);
            }}
            className="h-11 appearance-none rounded-lg border border-[#D6DCE5] bg-white pr-8 pl-3 text-[13px] font-normal text-[#505050] outline-none cursor-pointer focus:border-[#F47C35]"
          >
            <option value="">Status: All</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="BLOCKED">Blocked</option>
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#9AA7BA]"
          />
        </div>

        {/* City Dropdown */}
        <div className="relative">
          <select
            value={selectedCity}
            onChange={(e) => {
              setSelectedCity(e.target.value);
              setCurrentPage(0);
            }}
            className="h-11 appearance-none rounded-lg border border-[#D6DCE5] bg-white pr-8 pl-3 text-[13px] font-normal text-[#505050] outline-none cursor-pointer focus:border-[#F47C35]"
          >
            <option value="">City: All</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Delhi">Delhi</option>
            <option value="Pune">Pune</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="Hyderabad">Hyderabad</option>
            <option value="Chennai">Chennai</option>
            <option value="Kolkata">Kolkata</option>
            <option value="Chandigarh">Chandigarh</option>
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#9AA7BA]"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="mt-4 overflow-hidden rounded-lg border border-[#E5E5E5] shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="bg-[#E4E4E4] text-[12px] font-medium text-[#111111]">
              <tr className="h-[46px]">
                <th className="w-[110px] border-r border-white px-3 font-medium">ID</th>
                <th className="w-[150px] border-r border-white px-3 font-medium">Name</th>
                <th className="w-[200px] border-r border-white px-3 font-medium">Email</th>
                <th className="w-[150px] border-r border-white px-3 font-medium">Phone Number</th>
                <th className="w-[140px] border-r border-white px-3 font-medium">Registration Date</th>
                <th className="w-[110px] border-r border-white px-3 font-medium">Status</th>
                <th className="w-[75px] px-3 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-[#505050]">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[13px] text-[#777]">
                    No user accounts found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const regDate = new Date(u.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <tr
                      key={u.id}
                      className="h-[46px] border-b border-[#ECECEC] last:border-b-0 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="px-3 font-mono font-medium text-slate-800">
                        {u.customerCode}
                      </td>
                      <td className="px-3 font-medium text-slate-900">
                        {u.displayName}
                      </td>
                      <td className="px-3 text-[#606060]">{u.email}</td>
                      <td className="px-3 text-[#606060]">{u.mobile}</td>
                      <td className="px-3 text-[#606060]">{regDate}</td>
                      <td className="px-3">
                        <span
                          className={`font-semibold ${
                            u.statusCode === 'ACTIVE'
                              ? 'text-[#129122]'
                              : u.statusCode === 'BLOCKED'
                              ? 'text-[#F02B2B]'
                              : 'text-[#B46A08]'
                          }`}
                        >
                          {u.statusCode === 'ACTIVE'
                            ? 'Active'
                            : u.statusCode === 'BLOCKED'
                            ? 'Blocked'
                            : 'Pending'}
                        </span>
                      </td>
                      <td className="px-3 text-center">
                        <button
                          type="button"
                          onClick={() => alert(`Customer Details: ${u.displayName}\nCity: ${u.city}\nTotal Orders: ${u.totalOrders}`)}
                          aria-label={`View ${u.displayName}`}
                          className="inline-flex h-6 w-6 items-center justify-center text-[#555] transition hover:text-[#F47C35] cursor-pointer"
                        >
                          <ChevronRight size={17} strokeWidth={1.8} />
                        </button>
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
              <option value="10">10</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#9AA0A6]"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[11px] text-[#777]">
            {filteredUsers.length} total
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
    </div>
  );
}
