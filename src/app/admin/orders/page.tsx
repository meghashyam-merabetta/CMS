'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Download,
  CreditCard,
  Truck,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { mockOrders } from '@/data/mockData';
import { OrderRecord } from '@/types/dashboard';

export default function OrderManagementPage() {
  const [orders, setOrders] = useState<OrderRecord[]>(mockOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q);

      const matchesStatus =
        !selectedStatus || o.orderStatus.toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, selectedStatus]);

  const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

  return (
    <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-semibold text-black">Order Management</h2>
          <p className="mt-1 text-[12px] font-normal text-[#626262]">
            Monitor customer orders, delivery fulfillment, and order lifecycles.
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert('Exporting orders to Excel...')}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <Download size={16} className="text-[#F47C35]" />
          <span>Export Orders</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <label className="relative block w-full max-w-[340px]">
          <span className="sr-only">Search orders</span>
          <Search
            size={14}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-[#999]"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID, customer, phone"
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
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
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
          <table className="w-full min-w-[950px] border-collapse text-left">
            <thead className="bg-[#E4E4E4] text-[12px] font-medium text-[#292929]">
              <tr className="h-[46px]">
                <th className="w-[130px] border-r border-white px-4 font-medium">Order ID</th>
                <th className="min-w-[170px] border-r border-white px-4 font-medium">Customer Name</th>
                <th className="w-[140px] border-r border-white px-4 font-medium">Contact</th>
                <th className="w-[90px] border-r border-white px-4 font-medium">Items</th>
                <th className="w-[120px] border-r border-white px-4 font-medium">Total Amount</th>
                <th className="w-[110px] border-r border-white px-4 font-medium">Payment</th>
                <th className="w-[120px] border-r border-white px-4 font-medium">Order Date</th>
                <th className="w-[110px] border-r border-white px-4 font-medium">Status</th>
                <th className="w-[70px] px-4 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-[#505050]">
              {filteredOrders.map((o) => {
                const dateStr = new Date(o.orderDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <tr
                    key={o.id}
                    className="h-[48px] border-b border-[#ECECEC] last:border-b-0 hover:bg-[#FAFAFA] transition-colors"
                  >
                    <td className="px-4 font-mono font-medium text-slate-800">
                      {o.orderNumber}
                    </td>
                    <td className="px-4 font-medium text-slate-900">
                      {o.customerName}
                    </td>
                    <td className="px-4 text-[#606060]">{o.customerPhone}</td>
                    <td className="px-4 text-slate-700">{o.itemsCount} items</td>
                    <td className="px-4 font-semibold text-slate-900">
                      {currencyFormatter.format(o.totalAmount)}
                    </td>
                    <td className="px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700 text-[10px]">
                        <CreditCard size={12} className="text-[#F47C35]" />
                        {o.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 text-[#606060]">{dateStr}</td>
                    <td className="px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          o.orderStatus === 'DELIVERED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : o.orderStatus === 'SHIPPED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : o.orderStatus === 'CONFIRMED'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : o.orderStatus === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {o.orderStatus}
                      </span>
                    </td>
                    <td className="px-4 text-center">
                      <button
                        type="button"
                        onClick={() => alert(`Order details for ${o.orderNumber}`)}
                        aria-label={`View ${o.orderNumber}`}
                        className="inline-flex h-6 w-6 items-center justify-center text-[#555] transition hover:text-[#F47C35] cursor-pointer"
                      >
                        <ChevronRight size={17} strokeWidth={1.8} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
