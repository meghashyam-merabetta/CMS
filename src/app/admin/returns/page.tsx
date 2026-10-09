'use client';

import React, { useState } from 'react';
import { Search, ChevronRight, RotateCcw } from 'lucide-react';

const mockReturns = [
  { id: 'ret_1', returnCode: 'RET-401', orderNumber: 'ORD-98205', customer: 'Pooja Verma', reason: 'Incorrect size ordered', date: '2025-09-27', status: 'PENDING_APPROVAL', amount: 1499 },
  { id: 'ret_2', returnCode: 'RET-402', orderNumber: 'ORD-98188', customer: 'Sanjay Joshi', reason: 'Item no longer needed', date: '2025-09-25', status: 'REFUNDED', amount: 2490 },
  { id: 'ret_3', returnCode: 'RET-403', orderNumber: 'ORD-98170', customer: 'Tarun Shah', reason: 'Defective packaging', date: '2025-09-24', status: 'INSPECTION', amount: 4200 },
];

export default function ReturnsManagementPage() {
  const [search, setSearch] = useState('');

  const filtered = mockReturns.filter(
    (r) =>
      r.returnCode.toLowerCase().includes(search.toLowerCase()) ||
      r.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.customer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-semibold text-black">Return Management</h2>
          <p className="mt-1 text-[12px] font-normal text-[#626262]">
            Process customer product returns, pickup logistics, and refund releases.
          </p>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <label className="relative block w-full max-w-[340px]">
          <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#999]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Return ID, Order ID, customer..."
            className="h-11 w-full rounded-lg border border-[#D6DCE5] pr-4 pl-10 text-[13px] outline-none transition focus:border-[#F47C35]"
          />
        </label>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-[#E5E5E5] shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead className="bg-[#E4E4E4] text-[12px] font-medium text-[#292929]">
              <tr className="h-[46px]">
                <th className="w-[120px] border-r border-white px-4 font-medium">Return ID</th>
                <th className="w-[130px] border-r border-white px-4 font-medium">Order Number</th>
                <th className="min-w-[160px] border-r border-white px-4 font-medium">Customer</th>
                <th className="min-w-[200px] border-r border-white px-4 font-medium">Reason</th>
                <th className="w-[110px] border-r border-white px-4 font-medium">Amount</th>
                <th className="w-[130px] border-r border-white px-4 font-medium">Status</th>
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
                    <RotateCcw size={14} className="text-[#F47C35]" />
                    <span>{r.returnCode}</span>
                  </td>
                  <td className="px-4 font-mono text-slate-700">{r.orderNumber}</td>
                  <td className="px-4 font-medium text-slate-900">{r.customer}</td>
                  <td className="px-4 text-[#606060]">{r.reason}</td>
                  <td className="px-4 font-semibold text-slate-900">₹{r.amount}</td>
                  <td className="px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        r.status === 'REFUNDED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : r.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 text-center">
                    <button
                      type="button"
                      onClick={() => alert(`Review return: ${r.returnCode}`)}
                      aria-label={`View ${r.returnCode}`}
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
