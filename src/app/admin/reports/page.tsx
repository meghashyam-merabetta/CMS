'use client';

import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Calendar, TrendingUp, DollarSign } from 'lucide-react';

const availableReports = [
  { id: 'rep_1', title: 'Monthly Sales & Revenue Report', desc: 'Aggregated gross sales, tax calculations, discounts, and net profits.', format: 'XLSX', size: '2.4 MB' },
  { id: 'rep_2', title: 'Product Catalog & Inventory Valuation', desc: 'Detailed SKU-level stock on hand, reorder thresholds, and warehouse allocation.', format: 'CSV', size: '1.1 MB' },
  { id: 'rep_3', title: 'Customer Registration & Order Cohorts', desc: 'Customer retention, active buyers, repeat rate, and geographic distribution.', format: 'XLSX', size: '3.8 MB' },
  { id: 'rep_4', title: 'Returns, Cancellations & Replacement Analysis', desc: 'Return reasons, defective item rates, and vendor claim settlements.', format: 'PDF', size: '890 KB' },
  { id: 'rep_5', title: 'COD Collection & Courier Remittance Reconciliation', desc: 'Cash collected by delivery partners vs bank remittances.', format: 'XLSX', size: '1.7 MB' },
];

export default function SystemReportsPage() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = (id: string, title: string) => {
    setDownloadingId(id);
    setTimeout(() => {
      setDownloadingId(null);
      alert(`Downloading ${title}...`);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[18px] font-bold text-black">System Reports & Data Exports</h2>
            <p className="mt-1 text-[13px] font-normal text-[#626262]">
              Generate, schedule, and export business intelligence reports across Merabetta CRM.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <Calendar size={14} className="text-[#F47C35]" />
              <span>Current Cycle: Oct 2026</span>
            </span>
          </div>
        </div>

        {/* Quick Report Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-orange-100 text-[#F47C35] flex items-center justify-center shrink-0">
              <TrendingUp size={22} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Gross YTD Sales</p>
              <h4 className="text-xl font-bold text-slate-900 mt-0.5">₹2,48,56,000</h4>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fulfilled Orders</p>
              <h4 className="text-xl font-bold text-slate-900 mt-0.5">6,510 units</h4>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <DollarSign size={22} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">COD Collected</p>
              <h4 className="text-xl font-bold text-slate-900 mt-0.5">₹84,20,500</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Available Downloads List */}
      <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Exportable Datasets</h3>

        <div className="divide-y divide-slate-100">
          {availableReports.map((r) => (
            <div key={r.id} className="py-4 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900">{r.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{r.desc}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-medium">
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono">{r.format}</span>
                    <span>•</span>
                    <span>{r.size}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={downloadingId === r.id}
                onClick={() => handleDownload(r.id, r.title)}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#F47C35] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#E96F29] disabled:opacity-60 transition cursor-pointer"
              >
                <Download size={14} className={downloadingId === r.id ? 'animate-bounce' : ''} />
                <span>{downloadingId === r.id ? 'Exporting...' : 'Export'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
