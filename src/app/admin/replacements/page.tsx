'use client';

import React, { useState } from 'react';
import { Search, ChevronRight, RefreshCw, Truck } from 'lucide-react';

const mockReplacements = [
  { id: 'rep_1', replacementCode: 'RPL-501', orderNumber: 'ORD-98192', customer: 'Deepak Saxena', product: 'Digital BP Monitor', reason: 'Display LED malfunction', status: 'DISPATCHED', date: '2025-09-28' },
  { id: 'rep_2', replacementCode: 'RPL-502', orderNumber: 'ORD-98175', customer: 'Nalini Nair', product: 'Anti-Bedsore Air Pump', reason: 'Motor pressure issue', status: 'APPROVED', date: '2025-09-26' },
  { id: 'rep_3', replacementCode: 'RPL-503', orderNumber: 'ORD-98140', customer: 'Arun Bhatia', product: 'Aluminum Quad Cane', reason: 'Rubber ferrule damaged', status: 'DELIVERED', date: '2025-09-22' },
];

export default function ReplacementManagementPage() {
  const [search, setSearch] = useState('');

  const filtered = mockReplacements.filter(
    (r) =>
      r.replacementCode.toLowerCase().includes(search.toLowerCase()) ||
      r.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.customer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)] font-poppins text-[#252525]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[19px] font-semibold text-black">Replacement Management</h2>
          <p className="mt-1 text-[13px] text-[#626262]">
            Review warranty claims, diagnostic replacement authorizations, and reshipments.
          </p>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <label className="relative w-full max-w-sm">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A0A8B4]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Replacement ID or Order ID..."
            className="h-11 w-full rounded-xl border border-[#D7DEE8] pl-11 pr-4 text-[13px] outline-none transition focus:border-[#F47C35]"
          />
        </label>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-[#E5E5E5] shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead className="bg-[#E4E4E4] text-[12px] font-medium text-[#292929]">
              <tr className="h-[46px]">
                <th className="w-[140px] border-r border-white px-4 font-medium">Replacement ID</th>
                <th className="w-[130px] border-r border-white px-4 font-medium">Order Number</th>
                <th className="min-w-[160px] border-r border-white px-4 font-medium">Customer</th>
                <th className="min-w-[180px] border-r border-white px-4 font-medium">Product Item</th>
                <th className="min-w-[180px] border-r border-white px-4 font-medium">Defect Summary</th>
                <th className="w-[120px] border-r border-white px-4 font-medium">Status</th>
                <th className="w-[70px] px-4 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-[#505050]">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="h-[48px] border-b border-[#ECECEC] last:border-b-0 hover:bg-[#FAFAFA] transition-colors"
                >
                  <td className="px-4 font-mono font-medium text-slate-800 flex items-center gap-1.5 mt-3">
                    <RefreshCw size={14} className="text-[#F47C35]" />
                    <span>{r.replacementCode}</span>
                  </td>
                  <td className="px-4 font-mono text-slate-700">{r.orderNumber}</td>
                  <td className="px-4 font-medium text-slate-900">{r.customer}</td>
                  <td className="px-4 font-semibold text-slate-800">{r.product}</td>
                  <td className="px-4 text-[#606060]">{r.reason}</td>
                  <td className="px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        r.status === 'DELIVERED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : r.status === 'DISPATCHED'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 text-center">
                    <button
                      type="button"
                      onClick={() => alert(`Review replacement: ${r.replacementCode}`)}
                      aria-label={`View ${r.replacementCode}`}
                      className="inline-flex h-6 w-6 items-center justify-center text-[#555] transition hover:text-[#F47C35] cursor-pointer"
                    >
                      <ChevronRight size={17} strokeWidth={1.8} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
