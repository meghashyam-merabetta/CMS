'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Download,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  X,
  Package,
  FlaskConical,
  Calendar,
  User,
  MapPin,
  Tag,
  Eye,
  Info,
} from 'lucide-react';
import {
  getAdminProductOrders,
  getAdminLabBookings,
  getAdminProductOrderById,
  getAdminLabBookingById,
  exportAdminProductOrders,
  exportAdminLabBookings,
} from '@/services/api/adminOrderApi';
import {
  OrderingRecord,
  AdminOrderingDetailRecord,
  ProductOrderListParams,
  LabBookingListParams,
} from '@/types/api';

export type OrderType = 'products' | 'labs';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export default function OrderManagementPage() {
  // Primary selection: Product Orders vs Lab Bookings
  const [orderType, setOrderType] = useState<OrderType>('products');

  // List data and server pagination
  const [records, setRecords] = useState<OrderingRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [appliedSearch, setAppliedSearch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>(''); // For products: online | cod
  const [labIdFilter, setLabIdFilter] = useState<string>(''); // For labs: redcliffe
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Status and feedback
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Detail modal state
  const [selectedDetail, setSelectedDetail] = useState<AdminOrderingDetailRecord | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Ref to track the latest request ID and prevent race conditions/stale responses
  const activeRequestIdRef = useRef<number>(0);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  /**
   * Load orders based on current orderType and active filters
   */
  const loadOrders = useCallback(async () => {
    const requestId = ++activeRequestIdRef.current;
    setIsLoading(true);
    setFetchError(null);

    try {
      if (orderType === 'products') {
        const params: ProductOrderListParams = {
          page: currentPage,
          limit: pageSize,
        };
        if (appliedSearch.trim()) params.orderId = appliedSearch.trim();
        if (selectedStatus.trim()) params.status = selectedStatus.trim();
        if (paymentMethodFilter.trim()) params.paymentMethod = paymentMethodFilter.trim();
        if (fromDate.trim()) params.from = fromDate.trim();
        if (toDate.trim()) params.to = toDate.trim();

        const res = await getAdminProductOrders(params);
        if (activeRequestIdRef.current === requestId) {
          setRecords(res.data);
          setTotalRecords(res.pagination.total);
          setTotalPages(Math.max(res.pagination.totalPages, 1));
          setIsLive(true);
        }
      } else {
        const params: LabBookingListParams = {
          page: currentPage,
          limit: pageSize,
        };
        if (appliedSearch.trim()) params.bookingId = appliedSearch.trim();
        if (selectedStatus.trim()) params.status = selectedStatus.trim();
        if (labIdFilter.trim()) params.labId = labIdFilter.trim();
        if (fromDate.trim()) params.from = fromDate.trim();
        if (toDate.trim()) params.to = toDate.trim();

        const res = await getAdminLabBookings(params);
        if (activeRequestIdRef.current === requestId) {
          setRecords(res.data);
          setTotalRecords(res.pagination.total);
          setTotalPages(Math.max(res.pagination.totalPages, 1));
          setIsLive(true);
        }
      }
    } catch (err: any) {
      if (activeRequestIdRef.current === requestId) {
        console.warn('Orders API note:', err.message);
        setFetchError(err.message || 'Unable to connect to order management backend');
        setRecords([]);
        setTotalRecords(0);
        setTotalPages(1);
        setIsLive(false);
      }
    } finally {
      if (activeRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [
    orderType,
    currentPage,
    pageSize,
    appliedSearch,
    selectedStatus,
    paymentMethodFilter,
    labIdFilter,
    fromDate,
    toDate,
  ]);

  // Initial and reactive fetch
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  /**
   * Handle switching between Product Orders and Lab Bookings
   */
  const handleTypeChange = (newType: OrderType) => {
    if (newType === orderType) return;
    setOrderType(newType);
    setCurrentPage(1);
    setSearchQuery('');
    setAppliedSearch('');
    setSelectedStatus('');
    setPaymentMethodFilter('');
    setLabIdFilter('');
    setFromDate('');
    setToDate('');
    setRecords([]);
    setTotalRecords(0);
  };

  /**
   * Search submission handler (exact match lookup)
   */
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setAppliedSearch(searchQuery.trim());
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setAppliedSearch('');
    setCurrentPage(1);
  };

  /**
   * CSV Export Handler
   */
  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (orderType === 'products') {
        await exportAdminProductOrders({
          orderId: appliedSearch.trim() || undefined,
          status: selectedStatus.trim() || undefined,
          paymentMethod: paymentMethodFilter.trim() || undefined,
          from: fromDate.trim() || undefined,
          to: toDate.trim() || undefined,
        });
        showToast('Product orders exported successfully.');
      } else {
        await exportAdminLabBookings({
          bookingId: appliedSearch.trim() || undefined,
          status: selectedStatus.trim() || undefined,
          labId: labIdFilter.trim() || undefined,
          from: fromDate.trim() || undefined,
          to: toDate.trim() || undefined,
        });
        showToast('Lab bookings exported successfully.');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to export CSV. Please narrow your filters.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * View Record Detail Handler
   */
  const handleOpenDetail = async (record: OrderingRecord) => {
    setSelectedDetail(record);
    setIsLoadingDetail(true);
    setDetailError(null);

    const lookupId = record.bookingNumber || record.id;
    try {
      if (orderType === 'products') {
        const full = await getAdminProductOrderById(lookupId);
        if (full) setSelectedDetail(full);
      } else {
        const full = await getAdminLabBookingById(lookupId);
        if (full) setSelectedDetail(full);
      }
    } catch (err: any) {
      console.warn('Could not fetch fresh detail from server:', err.message);
      setDetailError(err.message || 'Could not fetch full record details.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const formatDateTime = (isoDate?: string | null) => {
    if (!isoDate) return '—';
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return isoDate;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoDate;
    }
  };

  const getStatusBadgeClass = (statusStr: string) => {
    const s = statusStr.toLowerCase();
    if (s.includes('deliver') || s.includes('generat') || s.includes('complete')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (s.includes('ship') || s.includes('collect') || s.includes('sample')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (s.includes('confirm') || s.includes('process')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (s.includes('cancel') || s.includes('fail') || s.includes('reject')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 text-xs font-medium shadow-lg transition-all ${
            toastMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600" />
          ) : (
            <AlertTriangle size={16} className="text-rose-600" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-semibold text-black">Order Management</h2>
            {isLive ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live Ordering API
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                Connecting...
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] font-normal text-[#626262]">
            Monitor customer product orders and diagnostic lab bookings via live backend ordering APIs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadOrders}
            disabled={isLoading}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            title="Refresh order records"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-[#F47C35]' : 'text-[#F47C35]'} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 size={16} className="animate-spin text-[#F47C35]" />
            ) : (
              <Download size={16} className="text-[#F47C35]" />
            )}
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Fetch Error Banner */}
      {fetchError && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={loadOrders}
            className="rounded bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Type Selector, Search & Filters Bar */}
      <div className="mt-5 space-y-3">
        {/* Type Toggle Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleTypeChange('products')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition cursor-pointer ${
                orderType === 'products'
                  ? 'bg-[#F47C35] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Package size={15} />
              <span>Product Orders</span>
              {orderType === 'products' && (
                <span className="rounded-full bg-white/20 px-2 py-0.2 text-[11px]">
                  {totalRecords}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('labs')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition cursor-pointer ${
                orderType === 'labs'
                  ? 'bg-[#F47C35] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FlaskConical size={15} />
              <span>Lab Bookings</span>
              {orderType === 'labs' && (
                <span className="rounded-full bg-white/20 px-2 py-0.2 text-[11px]">
                  {totalRecords}
                </span>
              )}
            </button>
          </div>

          <div className="text-[12px] text-slate-500">
            Viewing {orderType === 'products' ? 'Product Orders' : 'Lab Bookings'}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search by exact Order Number / Booking ID */}
          <form onSubmit={handleSearchSubmit} className="relative block w-full max-w-[340px]">
            <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#999]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                orderType === 'products'
                  ? 'Exact Order Number (e.g. MB261023...)'
                  : 'Exact Redcliffe Booking ID (e.g. 1234567)'
              }
              className="h-10 w-full rounded-lg border border-[#D6DCE5] pr-16 pl-9 text-[12px] outline-none transition focus:border-[#F47C35]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute top-1/2 right-10 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
            <button
              type="submit"
              className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-200"
            >
              Find
            </button>
          </form>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 appearance-none rounded-lg border border-[#D6DCE5] bg-white pr-8 pl-3 text-[12px] font-normal text-[#505050] outline-none cursor-pointer focus:border-[#F47C35]"
              >
                <option value="">Status: All</option>
                {orderType === 'products' ? (
                  <>
                    <option value="Processing">Processing</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </>
                ) : (
                  <>
                    <option value="Booking pending">Booking pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Sample collected">Sample collected</option>
                    <option value="Report generated">Report generated</option>
                    <option value="Cancelled">Cancelled</option>
                  </>
                )}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#9AA7BA]"
              />
            </div>

            {/* Product-Specific: Payment Method Filter */}
            {orderType === 'products' && (
              <div className="relative">
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => {
                    setPaymentMethodFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 appearance-none rounded-lg border border-[#D6DCE5] bg-white pr-8 pl-3 text-[12px] font-normal text-[#505050] outline-none cursor-pointer focus:border-[#F47C35]"
                >
                  <option value="">Payment: All</option>
                  <option value="online">Online</option>
                  <option value="cod">Cash on Delivery (COD)</option>
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#9AA7BA]"
                />
              </div>
            )}

            {/* Lab-Specific: Provider Filter */}
            {orderType === 'labs' && (
              <div className="relative">
                <select
                  value={labIdFilter}
                  onChange={(e) => {
                    setLabIdFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 appearance-none rounded-lg border border-[#D6DCE5] bg-white pr-8 pl-3 text-[12px] font-normal text-[#505050] outline-none cursor-pointer focus:border-[#F47C35]"
                >
                  <option value="">Provider: All</option>
                  <option value="redcliffe">Redcliffe Labs</option>
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#9AA7BA]"
                />
              </div>
            )}

            {/* Date Range: From */}
            <div className="flex items-center gap-1.5 rounded-lg border border-[#D6DCE5] bg-white px-2.5 py-1 text-[12px]">
              <span className="text-slate-400 text-[11px]">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-[12px] text-slate-700 outline-none bg-transparent cursor-pointer"
              />
            </div>

            {/* Date Range: To */}
            <div className="flex items-center gap-1.5 rounded-lg border border-[#D6DCE5] bg-white px-2.5 py-1 text-[12px]">
              <span className="text-slate-400 text-[11px]">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-[12px] text-slate-700 outline-none bg-transparent cursor-pointer"
              />
            </div>

            {/* Clear All Filters */}
            {(appliedSearch || selectedStatus || paymentMethodFilter || labIdFilter || fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setAppliedSearch('');
                  setSelectedStatus('');
                  setPaymentMethodFilter('');
                  setLabIdFilter('');
                  setFromDate('');
                  setToDate('');
                  setCurrentPage(1);
                }}
                className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
              >
                <X size={12} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="mt-4 overflow-hidden rounded-lg border border-[#E5E5E5] shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] border-collapse text-left">
            <thead className="bg-[#E4E4E4] text-[12px] font-medium text-[#292929]">
              <tr className="h-[46px]">
                <th className="w-[140px] border-r border-white px-4 font-medium">
                  {orderType === 'products' ? 'Order Number' : 'Booking ID'}
                </th>
                <th className="min-w-[170px] border-r border-white px-4 font-medium">Customer Details</th>
                <th className="min-w-[190px] border-r border-white px-4 font-medium">
                  {orderType === 'products' ? 'Items / Summary' : 'Tests / Patient'}
                </th>
                <th className="w-[120px] border-r border-white px-4 font-medium">Final Amount</th>
                <th className="w-[130px] border-r border-white px-4 font-medium">
                  {orderType === 'products' ? 'Payment' : 'Lab / Integration'}
                </th>
                <th className="w-[130px] border-r border-white px-4 font-medium">Created Date</th>
                <th className="w-[120px] border-r border-white px-4 font-medium">Status</th>
                <th className="w-[80px] px-4 font-medium text-center">Action</th>
              </tr>
            </thead>

            <tbody className="text-[11px] text-[#505050]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 size={28} className="animate-spin text-[#F47C35]" />
                      <p className="text-xs text-slate-500 font-medium">
                        Loading {orderType === 'products' ? 'product orders' : 'lab bookings'} from backend...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      {orderType === 'products' ? (
                        <Package size={36} className="text-slate-300 stroke-[1.5]" />
                      ) : (
                        <FlaskConical size={36} className="text-slate-300 stroke-[1.5]" />
                      )}
                      <p className="text-sm font-semibold text-slate-700">
                        No {orderType === 'products' ? 'product orders' : 'lab bookings'} found
                      </p>
                      <p className="text-xs text-slate-400">
                        {appliedSearch || selectedStatus || fromDate || toDate
                          ? 'Try adjusting your filters or date range.'
                          : 'No records exist in the backend database for this selection.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const displayId = r.bookingNumber || r.id;
                  const finalAmt = r.finalAmount ?? r.total ?? 0;

                  return (
                    <tr
                      key={r.id}
                      className="h-[52px] border-b border-[#ECECEC] last:border-b-0 hover:bg-[#FAFAFA] transition-colors"
                    >
                      {/* Order/Booking ID */}
                      <td className="px-4 font-mono font-medium text-slate-800">
                        <span className="font-semibold text-slate-900">{displayId}</span>
                        {r.bookingNumber && r.id !== r.bookingNumber && (
                          <span className="block text-[9px] text-slate-400 font-mono">
                            Ref: {r.id.slice(0, 8)}...
                          </span>
                        )}
                      </td>

                      {/* Customer Details */}
                      <td className="px-4">
                        <div className="font-medium text-slate-900">{r.customerName || 'Anonymous Customer'}</div>
                        <div className="text-[#606060] text-[10px]">
                          {r.phone || r.email || <span className="italic text-slate-400">No contact snapshot</span>}
                        </div>
                      </td>

                      {/* Items / Summary */}
                      <td className="px-4">
                        <div className="font-medium text-slate-800 max-w-[240px] truncate" title={r.itemNames}>
                          {r.itemNames || '—'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {r.itemCount || 0} line{r.itemCount === 1 ? '' : 's'}
                          {r.totalQuantity != null && ` • ${r.totalQuantity} total qty`}
                          {orderType === 'labs' && r.items?.[0]?.patientName && (
                            <span className="text-[#F47C35] font-medium">
                              {' '}
                              • Patient: {r.items[0].patientName}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="px-4 font-semibold text-slate-900">
                        <div>{currencyFormatter.format(finalAmt)}</div>
                        {r.couponDiscount > 0 && (
                          <div className="text-[10px] font-normal text-emerald-600">
                            -₹{r.couponDiscount} coupon
                          </div>
                        )}
                      </td>

                      {/* Payment (Products) or Provider (Labs) */}
                      <td className="px-4">
                        {orderType === 'products' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 text-[10px] uppercase">
                              <CreditCard size={11} className="text-[#F47C35]" />
                              {r.paymentMethod || 'Online'}
                            </span>
                            {r.paymentStatus && (
                              <span className="block text-[9px] text-slate-500 font-medium">
                                Status: {r.paymentStatus}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 text-[10px] capitalize">
                              <FlaskConical size={11} className="text-[#F47C35]" />
                              {r.labId || 'Diagnostic'}
                            </span>
                            {r.integrationStatus && (
                              <span className="block text-[9px] text-slate-500">
                                Integration: {r.integrationStatus}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="px-4 text-[#606060] text-[10px] whitespace-nowrap">
                        {formatDateTime(r.createdAt)}
                      </td>

                      {/* Status */}
                      <td className="px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadgeClass(
                            r.status || 'Pending'
                          )}`}
                        >
                          {r.status || 'Pending'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(r)}
                          aria-label={`View details for ${displayId}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-[#F47C35] hover:text-[#F47C35] hover:bg-orange-50 cursor-pointer"
                          title="View complete order snapshot"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server Pagination Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#ECECEC] bg-white px-4 py-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded border border-slate-300 px-2 py-1 text-xs outline-none focus:border-[#F47C35] cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-slate-400">|</span>
            <span>
              Showing {totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1} –{' '}
              {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} records
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1 || isLoading}
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              title="First Page"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage <= 1 || isLoading}
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="px-3 text-xs font-semibold text-slate-800">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages || isLoading}
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages || isLoading}
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              title="Last Page"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Details Slide-Over / Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-[#F47C35]">
                  {orderType === 'products' ? <Package size={20} /> : <FlaskConical size={20} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {orderType === 'products' ? 'Product Order' : 'Lab Booking'} Details
                    </h3>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeClass(
                        selectedDetail.status || 'Pending'
                      )}`}
                    >
                      {selectedDetail.status}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-500">
                    ID: {selectedDetail.bookingNumber || selectedDetail.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-xs text-slate-700">
              {isLoadingDetail && (
                <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 p-2.5 text-orange-800">
                  <Loader2 size={14} className="animate-spin text-[#F47C35]" />
                  <span>Loading full snapshot details from server...</span>
                </div>
              )}

              {detailError && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-amber-800">
                  <span>Note: {detailError} (Displaying cached snapshot).</span>
                </div>
              )}

              {/* Order Meta Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Customer */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    <User size={13} className="text-[#F47C35]" />
                    <span>Customer</span>
                  </div>
                  <div className="font-semibold text-slate-900 text-xs">
                    {selectedDetail.customerName || 'Anonymous Customer'}
                  </div>
                  <div className="text-slate-600 mt-0.5">{selectedDetail.email || 'No email provided'}</div>
                  <div className="text-slate-600">{selectedDetail.phone || 'No phone provided'}</div>
                  {selectedDetail.customerId && (
                    <div className="text-[10px] font-mono text-slate-400 mt-1 truncate">
                      CID: {selectedDetail.customerId}
                    </div>
                  )}
                </div>

                {/* Timing & Payment */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    <Calendar size={13} className="text-[#F47C35]" />
                    <span>Order Timing & Payment</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Created:</span>{' '}
                    <span className="font-medium text-slate-800">{formatDateTime(selectedDetail.createdAt)}</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-slate-500">Payment:</span>{' '}
                    <span className="font-semibold text-slate-900 uppercase">
                      {selectedDetail.paymentMethod || 'Online'}
                    </span>
                    {selectedDetail.paymentStatus && (
                      <span className="text-slate-600"> ({selectedDetail.paymentStatus})</span>
                    )}
                  </div>
                  {selectedDetail.details?.slot && (
                    <div className="mt-1 text-slate-600">
                      <span className="text-slate-500">Appointment Slot:</span> {selectedDetail.details.slot}
                    </div>
                  )}
                </div>

                {/* Integration / Lab Provider info */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    <Info size={13} className="text-[#F47C35]" />
                    <span>{orderType === 'products' ? 'Fulfillment' : 'Diagnostic Provider'}</span>
                  </div>
                  {orderType === 'labs' ? (
                    <>
                      <div>
                        <span className="text-slate-500">Lab:</span>{' '}
                        <span className="font-bold text-slate-800 capitalize">
                          {selectedDetail.labId || 'Diagnostic Lab'}
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-slate-500">Integration:</span>{' '}
                        <span className="font-medium text-slate-700">
                          {selectedDetail.integrationStatus || 'N/A'}
                        </span>
                      </div>
                      {selectedDetail.providerBookingId && (
                        <div className="mt-1 font-mono text-[10px] text-slate-600">
                          Provider ID: {selectedDetail.providerBookingId}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-slate-500">Delivery Status:</span>{' '}
                        <span className="font-semibold text-slate-800">{selectedDetail.status}</span>
                      </div>
                      {selectedDetail.details?.deliveryNotes && (
                        <div className="mt-1 text-slate-600 italic">
                          Notes: {selectedDetail.details.deliveryNotes}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Address Snapshot if present */}
              {(selectedDetail.details?.address || selectedDetail.details?.addressSnapshot) && (
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 mb-1">
                    <MapPin size={13} className="text-[#F47C35]" />
                    <span>Saved Delivery / Appointment Address</span>
                  </div>
                  <p className="text-slate-700">
                    {selectedDetail.details?.address ||
                      [
                        selectedDetail.details?.addressSnapshot?.line1,
                        selectedDetail.details?.addressSnapshot?.line2,
                        selectedDetail.details?.addressSnapshot?.city,
                        selectedDetail.details?.addressSnapshot?.state,
                        selectedDetail.details?.addressSnapshot?.postalCode,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                  </p>
                </div>
              )}

              {/* Items Table */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-2">
                  Itemized Order Lines ({selectedDetail.items?.length || 0})
                </h4>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-slate-100 text-[11px] font-semibold text-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Item / Test</th>
                        {orderType === 'labs' && <th className="py-2.5 px-3">Patient Name</th>}
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit MRP</th>
                        <th className="py-2.5 px-3 text-right">Offer Price</th>
                        <th className="py-2.5 px-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {(selectedDetail.items || []).map((it, idx) => (
                        <tr key={it.id || idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-medium text-slate-900">
                            {it.name || 'Item'}
                            <span className="block font-mono text-[9px] text-slate-400">ID: {it.id}</span>
                          </td>
                          {orderType === 'labs' && (
                            <td className="py-2 px-3 text-slate-700">
                              {it.patientName || <span className="text-slate-400 italic">Primary Customer</span>}
                            </td>
                          )}
                          <td className="py-2 px-3 text-center font-medium">{it.quantity}</td>
                          <td className="py-2 px-3 text-right text-slate-500">₹{it.unitMrp}</td>
                          <td className="py-2 px-3 text-right font-medium text-slate-800">₹{it.unitPrice}</td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-900">₹{it.linePrice}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Snapshot Breakdown */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 mb-2">
                  <Tag size={13} className="text-[#F47C35]" />
                  <span>Authoritative Pricing Breakdown</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  {selectedDetail.totalMrp != null && (
                    <div className="flex justify-between text-slate-600">
                      <span>Total MRP:</span>
                      <span>₹{selectedDetail.totalMrp}</span>
                    </div>
                  )}
                  {selectedDetail.offerDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Catalogue / Offer Discount:</span>
                      <span>-₹{selectedDetail.offerDiscount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-700 font-medium">
                    <span>Subtotal:</span>
                    <span>₹{selectedDetail.subtotal}</span>
                  </div>
                  {selectedDetail.couponDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>
                        Coupon Discount {selectedDetail.couponCode ? `(${selectedDetail.couponCode})` : ''}:
                      </span>
                      <span>-₹{selectedDetail.couponDiscount}</span>
                    </div>
                  )}
                  {selectedDetail.deliveryCharges > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Delivery Charges:</span>
                      <span>+₹{selectedDetail.deliveryCharges}</span>
                    </div>
                  )}
                  {selectedDetail.collectionCharges > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Sample Collection Charges:</span>
                      <span>+₹{selectedDetail.collectionCharges}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
                    <span>Final Amount:</span>
                    <span className="text-[#F47C35]">
                      {currencyFormatter.format(selectedDetail.finalAmount ?? selectedDetail.total ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="rounded-lg bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
