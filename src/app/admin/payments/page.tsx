'use client';

import React, { useState } from 'react';
import { Search, CreditCard, ChevronRight, Download, IndianRupee } from 'lucide-react';

const mockPayments = [
  { id: 'pay_1', txnId: 'TXN-982101', orderNumber: 'ORD-98210', method: 'PREPAID - RAZORPAY', amount: 3989, status: 'CAPTURED', date: '2025-09-28 14:32' },
  { id: 'pay_2', txnId: 'TXN-982112', orderNumber: 'ORD-98211', method: 'PREPAID - UPI', amount: 8990, status: 'CAPTURED', date: '2025-09-29 11:15' },
  { id: 'pay_3', txnId: 'TXN-982123', orderNumber: 'ORD-98212', method: 'COD - PENDING COLLECTION', amount: 5350, status: 'PENDING_DELIVERY', date: '2025-09-30 09:40' },
  { id: 'pay_4', txnId: 'TXN-982134', orderNumber: 'ORD-98213', method: 'PREPAID - GPAY', amount: 1499, status: 'CAPTURED', date: '2025-09-30 16:20' },
  { id: 'pay_5', txnId: 'TXN-982145', orderNumber: 'ORD-98214', method: 'COD - REMITTED', amount: 2300, status: 'REMITTED', date: '2025-10-01 08:10' },
];

export default function PaymentManagementPage() {
  const [search, setSearch] = useState('');

  const filtered = mockPayments.filter(
    (p) =>
      p.txnId.toLowerCase().includes(search.toLowerCase()) ||
      p.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.method.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-semibold text-black">Payment Management</h2>
          <p className="mt-1 text-[12px] font-normal text-[#626262]">
            Monitor gateway transactions, COD collections, settlements, and remittances.
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert('Exporting payout statement...')}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <Download size={16} className="text-[#F47C35]" />
          <span>Export Payouts</span>
        </button>
      </div>

      <div className="mt-5 flex justify-end">
        <label className="relative block w-full max-w-[340px]">
          <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#999]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Transaction ID or Order ID..."
            className="h-11 w-full rounded-lg border border-[#D6DCE5] pr-4 pl-10 text-[13px] outline-none transition focus:border-[#F47C35]"
          />
        </label>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-[#E5E5E5] shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead className="bg-[#E4E4E4] text-[12px] font-medium text-[#292929]">
              <tr className="h-[46px]">
                <th className="w-[140px] border-r border-white px-4 font-medium">Txn ID</th>
                <th className="w-[130px] border-r border-white px-4 font-medium">Order Number</th>
                <th className="min-w-[200px] border-r border-white px-4 font-medium">Payment Channel</th>
                <th className="w-[120px] border-r border-white px-4 font-medium">Amount</th>
                <th className="w-[150px] border-r border-white px-4 font-medium">Timestamp</th>
                <th className="w-[140px] border-r border-white px-4 font-medium">Status</th>
                <th className="w-[70px] px-4 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-[#505050]">
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="h-[48px] border-b border-[#ECECEC] last:border-b-0 hover:bg-[#FAFAFA] transition-colors"
                >
                  <td className="px-4 font-mono font-medium text-slate-800 flex items-center gap-1.5 mt-3">
                    <CreditCard size={14} className="text-[#F47C35]" />
                    <span>{p.txnId}</span>
                  </td>
                  <td className="px-4 font-mono text-slate-700">{p.orderNumber}</td>
                  <td className="px-4 font-medium text-slate-900">{p.method}</td>
                  <td className="px-4 font-semibold text-slate-900">₹{p.amount.toLocaleString('en-IN')}</td>
                  <td className="px-4 text-[#606060]">{p.date}</td>
                  <td className="px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        p.status === 'CAPTURED' || p.status === 'REMITTED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {p.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 text-center">
                    <button
                      type="button"
                      onClick={() => alert(`View receipt for ${p.txnId}`)}
                      aria-label={`View ${p.txnId}`}
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
