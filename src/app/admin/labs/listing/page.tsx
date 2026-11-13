'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, ChevronLeft, ChevronRight, Download, Eye, FlaskConical,
  Loader2, RefreshCw, Search, X,
} from 'lucide-react';
import { ApiError } from '@/lib/api';
import {
  exportAdminLabBookings,
  getAdminLabBookingById,
  getAdminLabBookings,
} from '@/services/api/adminOrderApi';
import type { AdminOrderingDetailRecord, LabBookingListParams, OrderingRecord } from '@/types/api';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const unavailable = 'Not available';

function dateTime(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata',
      }).format(parsed);
}

function amount(value?: number | null) {
  return value == null ? '—' : money.format(value);
}

function statusClass(value?: string | null) {
  const status = (value || '').toLowerCase();
  if (/cancel|fail|reject/.test(status)) return 'border-rose-200 bg-rose-50 text-rose-700';
  if (/complete|report|deliver/.test(status)) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (/confirm|collect|sample/.test(status)) return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function Field({ label, value }: { label: string; value: unknown }) {
  const display = value === null || value === undefined || value === '' ? unavailable : String(value);
  return <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-words text-xs font-medium text-slate-800">{display}</dd></div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 p-4"><h4 className="mb-3 text-sm font-bold text-slate-900">{title}</h4>{children}</section>;
}

export default function LabBookingListingPage() {
  const router = useRouter();
  const [records, setRecords] = useState<OrderingRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [bookingInput, setBookingInput] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [labId, setLabId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminOrderingDetailRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const filters = useCallback((): LabBookingListParams => ({
    bookingId: bookingId || undefined, from: from || undefined, to: to || undefined,
    status: status || undefined, labId: labId || undefined, page, limit,
  }), [bookingId, from, to, status, labId, page, limit]);

  const handleError = useCallback((cause: unknown, fallback: string) => {
    if (cause instanceof ApiError && cause.status === 401) {
      router.replace('/login?expired=1');
      return 'Your admin session has expired. Redirecting to sign in…';
    }
    if (cause instanceof ApiError && cause.status === 404) return 'This booking could not be found.';
    if (cause instanceof ApiError && cause.status === 422) return cause.message || 'Invalid filters. Check the entered values.';
    return cause instanceof Error ? cause.message : fallback;
  }, [router]);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true); setError(null);
    try {
      const response = await getAdminLabBookings(filters());
      if (request === requestRef.current) { setRecords(response.data); setPagination(response.pagination); }
    } catch (cause) {
      if (request === requestRef.current) { setRecords([]); setError(handleError(cause, 'Unable to load lab bookings.')); }
    } finally { if (request === requestRef.current) setLoading(false); }
  }, [filters, handleError]);

  useEffect(() => { void load(); }, [load]);

  const search = (event: FormEvent) => {
    event.preventDefault();
    const value = bookingInput.trim();
    if (value && !/^\d+$/.test(value)) { setError('Booking ID must be an exact numeric Redcliffe booking ID.'); return; }
    setError(null); setPage(1); setBookingId(value);
  };

  const reset = () => {
    setBookingInput(''); setBookingId(''); setFrom(''); setTo(''); setStatus(''); setLabId(''); setPage(1);
  };

  const exportCsv = async () => {
    setExporting(true); setExportError(null);
    try {
      const { page: _page, limit: _limit, ...exportFilters } = filters();
      await exportAdminLabBookings(exportFilters);
    } catch (cause) { setExportError(handleError(cause, 'Unable to export lab bookings.')); }
    finally { setExporting(false); }
  };

  const openDetail = async (record: OrderingRecord) => {
    if (!record.bookingNumber) { setDetail(record); setDetailError('Details are unavailable until the provider assigns a booking ID.'); return; }
    setDetail(record); setDetailLoading(true); setDetailError(null);
    try { setDetail(await getAdminLabBookingById(record.bookingNumber)); }
    catch (cause) { setDetailError(handleError(cause, 'Unable to load booking details.')); }
    finally { setDetailLoading(false); }
  };

  const details = detail?.details;
  const address = details?.address || [details?.addressSnapshot?.line1, details?.addressSnapshot?.line2, details?.addressSnapshot?.city, details?.addressSnapshot?.state, details?.addressSnapshot?.postalCode].filter(Boolean).join(', ');
  const primaryPatient = detail?.items?.find((item) => item.patientName)?.patientName;

  return <div className="rounded-2xl border border-[#DDE3EA] bg-white p-3.5 shadow-[0_2px_5px_rgba(15,23,42,0.05)] sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-[18px] font-semibold text-black">Lab Booking Management</h1><p className="mt-1 text-[12px] text-[#626262]">View and manage lab booking records, customer information, payment details and booking history.</p></div>
      <div className="flex gap-2"><button onClick={() => void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>Refresh</button><button onClick={() => void exportCsv()} disabled={exporting} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#F47C35] px-4 text-xs font-semibold text-white disabled:opacity-50">{exporting ? <Loader2 size={15} className="animate-spin"/> : <Download size={15}/>}Export CSV</button></div>
    </div>

    {(error || exportError) && <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><span className="flex items-center gap-2"><AlertTriangle size={15}/>{exportError || error}</span>{error && <button onClick={() => void load()} className="font-bold underline">Retry</button>}</div>}

    <div className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-2 xl:grid-cols-6">
      <form onSubmit={search} className="relative sm:col-span-2"><Search size={14} className="absolute left-3 top-3 text-slate-400"/><input value={bookingInput} onChange={(e) => setBookingInput(e.target.value)} inputMode="numeric" placeholder="Exact numeric Booking ID" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-16 text-xs outline-none focus:border-[#F47C35]"/><button className="absolute right-1.5 top-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-[10px] font-bold">Search</button></form>
      <input type="date" aria-label="Start date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs"/>
      <input type="date" aria-label="End date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs"/>
      <input value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder="Exact booking status" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs"/>
      <input value={labId} onChange={(e) => { setLabId(e.target.value); setPage(1); }} placeholder="Lab provider ID" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs"/>
      <button onClick={reset} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 xl:col-start-6">Reset Filters</button>
    </div>

    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200"><div className="overflow-x-auto"><table className="min-w-[1500px] w-full border-collapse text-left"><thead className="bg-[#E4E4E4] text-[11px] text-[#292929]"><tr>{['Booking ID','Customer Name','Customer Email','Contact Number','Lab Provider','Tests','Items','Booking Date','Booking Status','Payment Status','Final Amount','Action'].map((heading) => <th key={heading} className="border-r border-white px-3 py-3 font-semibold last:border-0">{heading}</th>)}</tr></thead><tbody className="text-[11px] text-slate-600">
      {loading ? Array.from({ length: 6 }).map((_, index) => <tr key={index} className="border-b border-slate-100">{Array.from({ length: 12 }).map((__, cell) => <td key={cell} className="px-3 py-3"><div className="h-3 animate-pulse rounded bg-slate-200"/></td>)}</tr>) : records.length === 0 ? <tr><td colSpan={12} className="py-16 text-center"><FlaskConical size={34} className="mx-auto mb-2 text-slate-300"/><p className="font-semibold text-slate-700">No lab bookings found</p><p className="mt-1 text-slate-400">Try adjusting the applied filters.</p></td></tr> : records.map((record) => <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="px-3 py-3 font-mono font-semibold text-slate-900">{record.bookingNumber || '—'}</td><td className="px-3">{record.customerName || '—'}</td><td className="px-3">{record.email || '—'}</td><td className="px-3">{record.phone || '—'}</td><td className="px-3 capitalize">{record.labId || '—'}</td><td className="max-w-[240px] px-3"><span title={record.itemNames} className="block truncate">{record.itemNames || '—'}</span></td><td className="px-3">{record.itemCount ?? '—'}</td><td className="whitespace-nowrap px-3">{dateTime(record.createdAt)}</td><td className="px-3"><span className={`inline-flex rounded border px-2 py-1 font-semibold ${statusClass(record.status)}`}>{record.status || '—'}</span></td><td className="px-3">{record.paymentStatus || '—'}</td><td className="px-3 font-semibold text-slate-900">{amount(record.finalAmount)}</td><td className="px-3"><button onClick={() => void openDetail(record)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 font-semibold hover:border-[#F47C35] hover:text-[#F47C35]"><Eye size={12}/>View Details</button></td></tr>)}
    </tbody></table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-600"><div className="flex items-center gap-2">Rows per page <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="rounded border border-slate-300 px-2 py-1">{[10,20,50,100].map((size) => <option key={size}>{size}</option>)}</select><span>• {pagination.total} matching bookings</span></div><div className="flex items-center gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded border p-1.5 disabled:opacity-40"><ChevronLeft size={14}/></button><span>Page {page} of {Math.max(pagination.totalPages, 1)}</span><button disabled={!pagination.hasNext || loading} onClick={() => setPage((value) => value + 1)} className="rounded border p-1.5 disabled:opacity-40"><ChevronRight size={14}/></button></div></div>
    </div>

    {detail && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs"><div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b bg-slate-50 px-5 py-4"><div><h3 className="font-bold text-slate-900">Lab Booking Details</h3><p className="text-xs font-mono text-slate-500">{detail.bookingNumber || 'Provider booking ID pending'}</p></div><button onClick={() => setDetail(null)} className="rounded-lg p-2 hover:bg-slate-200"><X size={18}/></button></div><div className="space-y-4 overflow-y-auto p-5">
      {detailLoading && <div className="flex items-center gap-2 rounded-lg bg-orange-50 p-3 text-xs text-orange-800"><Loader2 size={14} className="animate-spin"/>Loading complete booking snapshot…</div>}{detailError && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{detailError}</div>}
      <Section title="Booking Information"><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Booking Number" value={detail.bookingNumber}/><Field label="Internal Booking Reference" value={detail.id}/><Field label="Created Date" value={dateTime(detail.createdAt)}/><Field label="Updated Date" value={dateTime(detail.updatedAt)}/><Field label="Booking Status" value={detail.status}/><Field label="Lab Provider" value={detail.labId}/><Field label="Provider Booking ID" value={detail.providerBookingId}/><Field label="Integration Status" value={detail.integrationStatus}/></dl></Section>
      <Section title="Customer Information"><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Customer ID" value={detail.customerId}/><Field label="Customer Name" value={detail.customerName}/><Field label="Email Address" value={detail.email}/><Field label="Phone Number" value={detail.phone}/></dl></Section>
      <Section title="Patient Information"><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Patient Name" value={primaryPatient || details?.recipient?.name}/><Field label="Recipient Information" value={details?.recipient ? [details.recipient.name, details.recipient.email, details.recipient.phone].filter(Boolean).join(' · ') : null}/><Field label="Additional Patients" value={details?.additionalMembers?.length ? details.additionalMembers.map((member: Record<string, unknown>) => member.name || member.patientName || JSON.stringify(member)).join(', ') : null}/><Field label="Collection Address" value={address}/><Field label="Collection Date" value={details?.collectionDate}/><Field label="Collection Slot" value={details?.slot}/></dl></Section>
      <Section title="Ordered Tests"><div className="overflow-x-auto"><table className="min-w-[850px] w-full text-left text-xs"><thead className="bg-slate-100"><tr>{['Test Name','Test ID','Patient Name','Quantity','Unit MRP','Unit Offer Price','Line MRP','Line Price','Offer Discount'].map((item) => <th key={item} className="px-3 py-2">{item}</th>)}</tr></thead><tbody>{detail.items?.map((item, index) => <tr key={`${item.id}-${index}`} className="border-t"><td className="px-3 py-2 font-medium">{item.name || '—'}</td><td className="px-3 font-mono">{item.id || '—'}</td><td className="px-3">{item.patientName || '—'}</td><td className="px-3">{item.quantity ?? '—'}</td><td className="px-3">{amount(item.unitMrp)}</td><td className="px-3">{amount(item.unitPrice)}</td><td className="px-3">{amount(item.lineMrp)}</td><td className="px-3">{amount(item.linePrice)}</td><td className="px-3">{amount(item.offerDiscount)}</td></tr>)}</tbody></table></div></Section>
      <Section title="Price Breakdown"><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Total MRP" value={amount(detail.totalMrp)}/><Field label="Offer Discount" value={amount(detail.offerDiscount)}/><Field label="Subtotal" value={amount(detail.subtotal)}/><Field label="Coupon Code" value={detail.couponCode}/><Field label="Coupon Percentage" value={detail.couponPercent == null ? null : `${detail.couponPercent}%`}/><Field label="Maximum Coupon Discount" value={amount(detail.couponMaxDiscount)}/><Field label="Actual Coupon Discount" value={amount(detail.couponDiscount)}/><Field label="Price After Coupon" value={amount(detail.priceAfterCoupon)}/><Field label="Collection Charges" value={amount(detail.collectionCharges)}/><Field label="Final Amount" value={amount(detail.finalAmount)}/></dl></Section>
      <Section title="Payment and Reports"><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Payment Status" value={detail.paymentStatus}/><Field label="Payment Method" value={detail.paymentMethod}/><Field label="Provider Integration Status" value={detail.integrationStatus}/><Field label="Saved Reports" value={details?.reports?.length ? details.reports.map((report: unknown) => typeof report === 'string' ? report : JSON.stringify(report)).join(', ') : null}/></dl></Section>
    </div></div></div>}
  </div>;
}
