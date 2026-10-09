'use client';

import React, { useState } from 'react';
import {
  Search,
  Filter,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X
} from 'lucide-react';

interface CancellationItem {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  reason: string;
  paymentMode: 'PREPAID' | 'COD';
  refundStatus: 'PENDING' | 'REFUNDED' | 'REJECTED' | 'NOT_APPLICABLE';
  requestedAt: string;
  notes?: string;
}

const mockCancellations: CancellationItem[] = [
  {
    id: 'CNCL-8491',
    orderId: 'ORD-98214',
    customerName: 'Rahul Verma',
    customerPhone: '+91 98234 51234',
    customerEmail: 'rahul.verma@example.com',
    productName: 'Merabetta Adult Diapers - XL (Pack of 30)',
    quantity: 2,
    totalAmount: 1850,
    reason: 'Ordered wrong size by mistake',
    paymentMode: 'PREPAID',
    refundStatus: 'PENDING',
    requestedAt: '2026-03-30 14:22',
    notes: 'Customer contacted support asking for size L instead.',
  },
  {
    id: 'CNCL-8488',
    orderId: 'ORD-98192',
    customerName: 'Priya Sharma',
    customerPhone: '+91 94123 78901',
    customerEmail: 'priya.sharma@example.com',
    productName: 'Omron Digital Blood Pressure Monitor HEM-7120',
    quantity: 1,
    totalAmount: 2240,
    reason: 'Found lower price elsewhere',
    paymentMode: 'PREPAID',
    refundStatus: 'REFUNDED',
    requestedAt: '2026-03-29 11:15',
    notes: 'Refund processed to Razorpay gateway source.',
  },
  {
    id: 'CNCL-8472',
    orderId: 'ORD-98150',
    customerName: 'Amitabh Sengupta',
    customerPhone: '+91 97321 44556',
    customerEmail: 'amitabh.s@example.com',
    productName: 'Vissco Walking Stick with Quad Tripod Base',
    quantity: 1,
    totalAmount: 890,
    reason: 'Delivery delayed beyond expected date',
    paymentMode: 'COD',
    refundStatus: 'NOT_APPLICABLE',
    requestedAt: '2026-03-28 17:40',
    notes: 'COD order cancelled before shipment dispatch.',
  },
  {
    id: 'CNCL-8461',
    orderId: 'ORD-98105',
    customerName: 'Sunita Patil',
    customerPhone: '+91 98901 23456',
    customerEmail: 'sunita.patil@example.com',
    productName: 'Friends Ultra Adult Diapers (Large, 10 count)',
    quantity: 3,
    totalAmount: 1420,
    reason: 'Duplicate order placed unintentionally',
    paymentMode: 'PREPAID',
    refundStatus: 'REFUNDED',
    requestedAt: '2026-03-28 09:30',
    notes: 'Customer placed two back-to-back identical orders.',
  },
  {
    id: 'CNCL-8449',
    orderId: 'ORD-98072',
    customerName: 'Vikramaditya Rao',
    customerPhone: '+91 91234 56780',
    customerEmail: 'vikram.rao@example.com',
    productName: 'Karma Foldable Manual Wheelchair Fighter C',
    quantity: 1,
    totalAmount: 6499,
    reason: 'Item no longer needed / patient recovered',
    paymentMode: 'PREPAID',
    refundStatus: 'PENDING',
    requestedAt: '2026-03-27 16:45',
    notes: 'Order was packed at Bhiwandi hub. Needs recall before courier pickup.',
  },
  {
    id: 'CNCL-8430',
    orderId: 'ORD-97998',
    customerName: 'Meenakshi Iyer',
    customerPhone: '+91 98765 43210',
    customerEmail: 'meenakshi.iyer@example.com',
    productName: 'Dr. Morepen Glucometer with 50 Test Strips',
    quantity: 1,
    totalAmount: 1199,
    reason: 'Order placed by unauthorized family member',
    paymentMode: 'PREPAID',
    refundStatus: 'REJECTED',
    requestedAt: '2026-03-26 12:10',
    notes: 'Order already delivered and unsealed before request raised.',
  },
  {
    id: 'CNCL-8415',
    orderId: 'ORD-97940',
    customerName: 'Karthik Narayanan',
    customerPhone: '+91 99401 22334',
    customerEmail: 'karthik.n@example.com',
    productName: 'Tynor Lumbo Sacral Belt Support - Large',
    quantity: 1,
    totalAmount: 980,
    reason: 'Wrong delivery address specified',
    paymentMode: 'COD',
    refundStatus: 'NOT_APPLICABLE',
    requestedAt: '2026-03-25 15:05',
    notes: 'Cancelled before verification OTP confirmed.',
  },
];

export default function CancellationsPage() {
  const [cancellations, setCancellations] = useState<CancellationItem[]>(mockCancellations);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'REFUNDED' | 'REJECTED' | 'NOT_APPLICABLE'>('ALL');
  const [selectedItem, setSelectedItem] = useState<CancellationItem | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const pendingCount = cancellations.filter((c) => c.refundStatus === 'PENDING').length;
  const refundedCount = cancellations.filter((c) => c.refundStatus === 'REFUNDED').length;
  const rejectedCount = cancellations.filter((c) => c.refundStatus === 'REJECTED').length;
  const totalAmountRefunded = cancellations
    .filter((c) => c.refundStatus === 'REFUNDED')
    .reduce((sum, item) => sum + item.totalAmount, 0);

  const filtered = cancellations.filter((c) => {
    const matchesSearch =
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.orderId.toLowerCase().includes(search.toLowerCase()) ||
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.productName.toLowerCase().includes(search.toLowerCase()) ||
      c.reason.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || c.refundStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = (id: string, newStatus: 'REFUNDED' | 'REJECTED') => {
    setCancellations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, refundStatus: newStatus } : item))
    );
    if (selectedItem && selectedItem.id === id) {
      setSelectedItem((prev) => (prev ? { ...prev, refundStatus: newStatus } : null));
    }
    setActionSuccess(
      newStatus === 'REFUNDED'
        ? `Refund of ₹${selectedItem?.totalAmount || 'amount'} approved successfully for ${id}.`
        : `Cancellation request ${id} rejected.`
    );
    setTimeout(() => setActionSuccess(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#DDE3EA] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#626262]">Total Cancellations</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-[#F47C35]">
              <AlertCircle size={18} />
            </span>
          </div>
          <p className="mt-3 text-[22px] font-bold text-gray-900">{cancellations.length}</p>
          <span className="text-[11px] text-[#626262]">Across all payment channels</span>
        </div>

        <div className="rounded-xl border border-[#DDE3EA] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#626262]">Pending Approvals</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock size={18} />
            </span>
          </div>
          <p className="mt-3 text-[22px] font-bold text-amber-600">{pendingCount}</p>
          <span className="text-[11px] text-amber-700">Requires finance review</span>
        </div>

        <div className="rounded-xl border border-[#DDE3EA] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#626262]">Refunds Disbursed</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={18} />
            </span>
          </div>
          <p className="mt-3 text-[22px] font-bold text-emerald-600">₹{totalAmountRefunded.toLocaleString('en-IN')}</p>
          <span className="text-[11px] text-[#626262]">{refundedCount} transactions completed</span>
        </div>

        <div className="rounded-xl border border-[#DDE3EA] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#626262]">Rejected Claims</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <XCircle size={18} />
            </span>
          </div>
          <p className="mt-3 text-[22px] font-bold text-gray-900">{rejectedCount}</p>
          <span className="text-[11px] text-[#626262]">Policy breaches / late claims</span>
        </div>
      </div>

      {actionSuccess && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-[#E8F8EE] px-4 py-3 text-[13px] font-medium text-[#1E7F3D]">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Table Container */}
      <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-semibold text-black">Cancellation Management</h2>
            <p className="mt-1 text-[12px] font-normal text-[#626262]">
              Track customer order cancellations, audit reason codes, and authorize refunds.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => alert('Exporting cancellations CSV...')}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#D6DCE5] bg-white px-4 text-[13px] font-medium text-[#333] transition hover:bg-slate-50 cursor-pointer"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(['ALL', 'PENDING', 'REFUNDED', 'REJECTED', 'NOT_APPLICABLE'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`h-9 rounded-lg px-3.5 text-[12px] font-medium transition cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-[#F47C35] text-white shadow-xs'
                    : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]'
                }`}
              >
                {tab === 'ALL'
                  ? 'All Requests'
                  : tab === 'PENDING'
                  ? 'Pending Review'
                  : tab === 'REFUNDED'
                  ? 'Refunded'
                  : tab === 'REJECTED'
                  ? 'Rejected'
                  : 'COD (No Refund)'}
              </button>
            ))}
          </div>

          <label className="relative block w-full max-w-[320px]">
            <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#999]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, Order, Customer, Reason..."
              className="h-10 w-full rounded-lg border border-[#D6DCE5] pr-4 pl-9 text-[12px] outline-none transition focus:border-[#F47C35]"
            />
          </label>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-lg border border-[#E5E5E5] shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left">
              <thead className="bg-[#E4E4E4] text-[12px] font-medium text-[#292929]">
                <tr className="h-[46px]">
                  <th className="min-w-[130px] border-r border-white px-4 font-medium">Cancellation ID</th>
                  <th className="min-w-[120px] border-r border-white px-4 font-medium">Order ID</th>
                  <th className="min-w-[180px] border-r border-white px-4 font-medium">Customer Details</th>
                  <th className="min-w-[220px] border-r border-white px-4 font-medium">Product & Amount</th>
                  <th className="min-w-[200px] border-r border-white px-4 font-medium">Reason</th>
                  <th className="min-w-[100px] border-r border-white px-4 font-medium">Payment</th>
                  <th className="min-w-[130px] border-r border-white px-4 font-medium">Refund Status</th>
                  <th className="min-w-[120px] px-4 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5] bg-white text-[13px] text-[#292929]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-[#777]">
                      No cancellation requests found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-black">{item.id}</span>
                        <div className="text-[11px] text-[#626262]">{item.requestedAt}</div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-[#F47C35]">
                        {item.orderId}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-gray-900">{item.customerName}</div>
                        <div className="text-[11px] text-[#626262]">{item.customerPhone}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium line-clamp-1">{item.productName}</div>
                        <div className="text-[11px] text-[#626262]">
                          Qty: {item.quantity} • <span className="font-semibold text-black">₹{item.totalAmount.toLocaleString('en-IN')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="line-clamp-2 text-[12px] text-[#444]">{item.reason}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            item.paymentMode === 'PREPAID'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {item.paymentMode}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            item.refundStatus === 'REFUNDED'
                              ? 'bg-[#E8F8EE] text-[#1E7F3D]'
                              : item.refundStatus === 'PENDING'
                              ? 'bg-[#FFF6E9] text-[#B76E00]'
                              : item.refundStatus === 'REJECTED'
                              ? 'bg-[#FEECEC] text-[#D32F2F]'
                              : 'bg-[#F1F3F5] text-[#555]'
                          }`}
                        >
                          {item.refundStatus === 'NOT_APPLICABLE' ? 'N/A (COD)' : item.refundStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="inline-flex items-center gap-1 rounded-md border border-[#DDE3EA] bg-white px-2.5 py-1 text-[12px] font-medium text-gray-700 hover:bg-slate-100 cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="flex items-center justify-between border-t border-[#E5E5E5] bg-white px-4 py-3 text-[12px] text-[#626262]">
            <span>Showing 1 to {filtered.length} of {cancellations.length} cancellations</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled
                className="flex h-8 w-8 items-center justify-center rounded border border-[#E5E5E5] text-[#999] opacity-50 cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded bg-[#F47C35] font-semibold text-white"
              >
                1
              </button>
              <button
                type="button"
                disabled
                className="flex h-8 w-8 items-center justify-center rounded border border-[#E5E5E5] text-[#999] opacity-50 cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail / Action Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-[16px] font-bold text-gray-900">
                  Cancellation Details - {selectedItem.id}
                </h3>
                <span className="text-[12px] text-[#626262]">
                  Order #{selectedItem.orderId} • Requested on {selectedItem.requestedAt}
                </span>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-[13px]">
              <div className="rounded-lg bg-slate-50 p-3.5 space-y-1.5">
                <div className="text-[11px] font-semibold uppercase text-gray-500">Customer Info</div>
                <div className="font-semibold text-gray-900">{selectedItem.customerName}</div>
                <div className="text-[12px] text-[#555]">{selectedItem.customerPhone} • {selectedItem.customerEmail}</div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3.5 space-y-1.5">
                <div className="text-[11px] font-semibold uppercase text-gray-500">Item Cancelled</div>
                <div className="font-semibold text-gray-900">{selectedItem.productName}</div>
                <div className="flex items-center justify-between text-[12px] text-[#555]">
                  <span>Quantity: {selectedItem.quantity}</span>
                  <span className="font-bold text-[#F47C35] text-[14px]">
                    Refund Value: ₹{selectedItem.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-amber-50/60 border border-amber-200/60 p-3.5">
                <div className="text-[11px] font-semibold uppercase text-amber-800">Reason for Cancellation</div>
                <div className="mt-1 text-[13px] font-medium text-amber-950">{selectedItem.reason}</div>
                {selectedItem.notes && (
                  <div className="mt-2 text-[11px] text-amber-900/80 italic">
                    Support Note: {selectedItem.notes}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-[12px] text-gray-500">Current Status:</span>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    selectedItem.refundStatus === 'REFUNDED'
                      ? 'bg-[#E8F8EE] text-[#1E7F3D]'
                      : selectedItem.refundStatus === 'PENDING'
                      ? 'bg-[#FFF6E9] text-[#B76E00]'
                      : selectedItem.refundStatus === 'REJECTED'
                      ? 'bg-[#FEECEC] text-[#D32F2F]'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {selectedItem.refundStatus}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Close
              </button>
              {selectedItem.refundStatus === 'PENDING' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedItem.id, 'REJECTED')}
                    className="h-10 rounded-lg border border-rose-300 bg-rose-50 px-4 text-[13px] font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
                  >
                    Reject Request
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedItem.id, 'REFUNDED')}
                    className="h-10 rounded-lg bg-[#1E7F3D] px-5 text-[13px] font-semibold text-white hover:bg-[#186832] cursor-pointer"
                  >
                    Authorize Refund (₹{selectedItem.totalAmount})
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
