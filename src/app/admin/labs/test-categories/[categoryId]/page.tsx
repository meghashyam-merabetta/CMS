'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  Check,
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  FlaskConical,
  Package,
  TrendingUp,
  TrendingDown,
  Stethoscope,
  Thermometer,
  Heart,
  Pill,
  Droplets,
  Activity,
  ShieldPlus,
  Wind,
  Layers,
  Baby,
  Droplet,
  LucideIcon,
  IndianRupee,
} from 'lucide-react';
import {
  mockTestCategories,
  mockLabTests,
  mockLabPackages,
} from '@/data/mockData';
import { LabTestRecord, LabPackageRecord } from '@/types/dashboard';

type ActiveTab = 'tests' | 'packages';

const iconMap: Record<string, LucideIcon> = {
  Stethoscope, Thermometer, Heart, Pill, Droplets,
  Activity, FlaskConical, ShieldPlus, Wind, Layers, Baby, Droplet,
};

const fmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

// Inline margin % calculation
function marginPct(original: number, marginal: number): number {
  if (!original) return 0;
  return Math.round(((marginal - original) / original) * 100);
}

// ─── Margin Popup (fixed-positioned, escapes overflow clipping) ─────────────
type MarginPopupData = {
  id: string;
  name: string;
  originalPrice: number;
  marginalPrice: number;
  top: number;
  right: number;
  onApply: (newPrice: number) => void;
};

function MarginPopup({
  data,
  onClose,
}: {
  data: MarginPopupData;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'increase' | 'decrease'>('increase');
  const [percent, setPercent] = useState<string>('10');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const numPercent = Math.abs(parseFloat(percent) || 0);
  const factor = mode === 'increase' ? (1 + numPercent / 100) : (1 - numPercent / 100);
  const newMarginal = Math.max(1, Math.round(data.marginalPrice * factor));
  const diff = newMarginal - data.marginalPrice;
  const currentMargin = marginPct(data.originalPrice, data.marginalPrice);
  const newMarginFromOriginal = marginPct(data.originalPrice, newMarginal);
  const isLoss = newMarginal < data.originalPrice;

  const presets = [5, 10, 15, 20, 25];

  const handleInputChange = (val: string) => {
    if (val.startsWith('-')) {
      setMode('decrease');
      setPercent(val.replace('-', ''));
    } else if (val.startsWith('+')) {
      setMode('increase');
      setPercent(val.replace('+', ''));
    } else {
      setPercent(val);
    }
  };

  const handleApply = () => {
    if (numPercent === 0) return;
    data.onApply(newMarginal);
  };

  return (
    <div
      className="fixed z-[300] w-[320px] rounded-2xl border border-gray-200 bg-white shadow-2xl"
      style={{ top: data.top, right: data.right }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-slate-50/80 rounded-t-2xl">
        <div className="min-w-0 pr-2">
          <p className="text-[12px] font-bold text-gray-900 flex items-center gap-1.5 truncate">
            <TrendingUp size={14} className="text-[#F47C35] shrink-0" />
            Adjust Marginal Price
          </p>
          <p className="text-[10px] text-gray-500 truncate mt-0.5">{data.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 cursor-pointer transition shrink-0"
        >
          <X size={13} />
        </button>
      </div>

      <div className="p-4 space-y-3.5">
        {/* Increase / Decrease Mode Selector */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('increase')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              mode === 'increase'
                ? 'bg-white text-[#F47C35] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp size={12} className="text-[#F47C35]" />
            Increase Margin
          </button>
          <button
            type="button"
            onClick={() => setMode('decrease')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              mode === 'decrease'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingDown size={12} className="text-rose-600" />
            Decrease Margin
          </button>
        </div>

        {/* Input & Presets */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-gray-700">
              {mode === 'increase' ? 'Increase by (%)' : 'Decrease by (%)'}
            </label>
            <span className="text-[10px] text-gray-400">Quick select</span>
          </div>

          <div className="relative">
            <input
              ref={inputRef}
              type="number"
              min="0"
              step="1"
              value={percent}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="e.g. 10"
              className="w-full h-9 pl-3 pr-8 rounded-xl border border-gray-300 text-[13px] font-semibold outline-none focus:border-[#F47C35] focus:ring-2 focus:ring-[#F47C35]/15 transition"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApply();
                if (e.key === 'Escape') onClose();
              }}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[12px]">
              %
            </span>
          </div>

          {/* Quick preset chips */}
          <div className="grid grid-cols-5 gap-1 mt-2">
            {presets.map((p) => {
              const active = numPercent === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPercent(String(p))}
                  className={`h-7 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                    active
                      ? mode === 'increase'
                        ? 'bg-[#F47C35] text-white border-[#F47C35]'
                        : 'bg-rose-500 text-white border-rose-500'
                      : mode === 'increase'
                      ? 'bg-orange-50/70 text-[#F47C35] border-orange-200 hover:bg-orange-100'
                      : 'bg-rose-50/70 text-rose-600 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  {mode === 'increase' ? '+' : '-'}{p}%
                </button>
              );
            })}
          </div>
        </div>

        {/* Calculation Preview Card */}
        <div className={`rounded-xl border p-3 text-[11px] space-y-2 ${
          mode === 'increase' ? 'bg-[#FFF9F5] border-[#FFE2CF]' : 'bg-rose-50/40 border-rose-200'
        }`}>
          <div className="flex justify-between items-center text-gray-500">
            <span>Original Price (Cost)</span>
            <span className="font-semibold text-gray-800">{fmt.format(data.originalPrice)}</span>
          </div>
          <div className="flex justify-between items-center text-gray-500">
            <span>Current Marginal</span>
            <span className="font-semibold text-gray-800">
              {fmt.format(data.marginalPrice)}{' '}
              <span className="text-[10px] font-medium text-gray-500">(+{currentMargin}%)</span>
            </span>
          </div>

          <div className="border-t border-dashed border-gray-200 my-1" />

          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-800">New Marginal Price</span>
            <div className="text-right">
              <span className={`text-[14px] font-black ${mode === 'increase' ? 'text-[#F47C35]' : 'text-rose-600'}`}>
                {fmt.format(newMarginal)}
              </span>
              <span className={`block text-[10px] font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {diff >= 0 ? `+${fmt.format(diff)}` : `-${fmt.format(Math.abs(diff))}`} ({diff >= 0 ? '+' : ''}{marginPct(data.marginalPrice, newMarginal)}%)
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-gray-100">
            <span className="text-[10px] text-gray-500">New Margin from Original</span>
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
              newMarginFromOriginal >= 20
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : newMarginFromOriginal >= 0
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-300'
            }`}>
              {newMarginFromOriginal >= 0 ? `+${newMarginFromOriginal}%` : `${newMarginFromOriginal}%`}
            </span>
          </div>

          {isLoss && (
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-100/70 text-rose-700 text-[10px] font-medium mt-1">
              <AlertTriangle size={12} className="shrink-0 text-rose-600" />
              <span>Warning: Selling below cost price (₹{data.originalPrice - newMarginal} loss)</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-9 rounded-xl border border-gray-200 text-[12px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={numPercent === 0}
            onClick={handleApply}
            className={`flex-1 h-9 rounded-xl text-[12px] font-bold text-white shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition ${
              mode === 'increase'
                ? 'bg-[#F47C35] hover:bg-[#E96F29]'
                : 'bg-rose-500 hover:bg-rose-600'
            }`}
          >
            Apply ({fmt.format(newMarginal)})
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
const emptyTestForm = {
  name: '',
  testCode: '',
  reportTimeHrs: 12,
  originalPrice: 0,
  marginalPrice: 0,
  description: '',
  statusCode: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
};

const emptyPackageForm = {
  name: '',
  packageCode: '',
  reportTimeHrs: 24,
  testsIncluded: 1,
  originalPrice: 0,
  marginalPrice: 0,
  description: '',
  statusCode: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
};

export default function CategoryDetailPage() {
  const params = useParams();
  const categoryId = params.categoryId as string;
  const category = mockTestCategories.find((c) => c.id === categoryId);

  const [activeTab, setActiveTab] = useState<ActiveTab>('tests');

  // --- Tests state ---
  const [tests, setTests] = useState<LabTestRecord[]>(
    mockLabTests.filter((t) => t.categoryId === categoryId)
  );
  const [testSearch, setTestSearch] = useState('');
  const [testStatusFilter, setTestStatusFilter] = useState('');
  const [testPage, setTestPage] = useState(0);
  const testPageSize = 10;
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTestRecord | null>(null);
  const [testToDelete, setTestToDelete] = useState<LabTestRecord | null>(null);
  const [testForm, setTestForm] = useState(emptyTestForm);
  // Unified margin popup state (fixed positioning)
  const [marginPopup, setMarginPopup] = useState<MarginPopupData | null>(null);

  // --- Packages state ---
  const [packages, setPackages] = useState<LabPackageRecord[]>(
    mockLabPackages.filter((p) => p.categoryId === categoryId)
  );
  const [pkgSearch, setPkgSearch] = useState('');
  const [pkgStatusFilter, setPkgStatusFilter] = useState('');
  const [pkgPage, setPkgPage] = useState(0);
  const pkgPageSize = 10;
  const [isPkgModalOpen, setIsPkgModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<LabPackageRecord | null>(null);
  const [pkgToDelete, setPkgToDelete] = useState<LabPackageRecord | null>(null);
  const [pkgForm, setPkgForm] = useState(emptyPackageForm);

  // Close margin popup on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-margin-popup]') && !target.closest('[data-margin-trigger]')) {
        setMarginPopup(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // --- Filtered tests ---
  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      const q = testSearch.trim().toLowerCase();
      const matchesSearch = !q || t.name.toLowerCase().includes(q) || t.testCode.toLowerCase().includes(q);
      const matchesStatus = !testStatusFilter || t.statusCode === testStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tests, testSearch, testStatusFilter]);

  const testTotalPages = Math.ceil(filteredTests.length / testPageSize) || 1;
  const paginatedTests = filteredTests.slice(testPage * testPageSize, (testPage + 1) * testPageSize);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper: open margin popup anchored to a button (fixed positioning)
  const openMarginPopup = (
    e: React.MouseEvent<HTMLButtonElement>,
    item: { id: string; name: string; originalPrice: number; marginalPrice: number },
    applyFn: (newPrice: number) => void,
  ) => {
    e.stopPropagation();
    if (marginPopup?.id === item.id) {
      setMarginPopup(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const popupWidth = 320;
    const popupHeight = 390;
    const rightEdge = window.innerWidth - rect.right;
    const right = Math.max(16, Math.min(rightEdge, window.innerWidth - popupWidth - 16));
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow < popupHeight && rect.top > spaceBelow
        ? Math.max(16, rect.top - popupHeight - 8)
        : Math.min(window.innerHeight - popupHeight - 16, rect.bottom + 8);

    setMarginPopup({
      id: item.id,
      name: item.name,
      originalPrice: item.originalPrice,
      marginalPrice: item.marginalPrice,
      top,
      right,
      onApply: applyFn,
    });
  };

  // --- Filtered packages ---
  const filteredPkgs = useMemo(() => {
    return packages.filter((p) => {
      const q = pkgSearch.trim().toLowerCase();
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.packageCode.toLowerCase().includes(q);
      const matchesStatus = !pkgStatusFilter || p.statusCode === pkgStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [packages, pkgSearch, pkgStatusFilter]);

  const pkgTotalPages = Math.ceil(filteredPkgs.length / pkgPageSize) || 1;
  const paginatedPkgs = filteredPkgs.slice(pkgPage * pkgPageSize, (pkgPage + 1) * pkgPageSize);

  // --- Test CRUD ---
  const openAddTest = () => { setTestForm(emptyTestForm); setEditingTest(null); setIsTestModalOpen(true); };
  const openEditTest = (t: LabTestRecord) => {
    setTestForm({ name: t.name, testCode: t.testCode, reportTimeHrs: t.reportTimeHrs, originalPrice: t.originalPrice, marginalPrice: t.marginalPrice, description: t.description, statusCode: t.statusCode });
    setEditingTest(t);
    setIsTestModalOpen(true);
  };
  const handleSaveTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTest) {
      setTests((prev) => prev.map((t) => t.id === editingTest.id ? { ...t, ...testForm } : t));
      showToast(`Test "${testForm.name}" updated.`);
    } else {
      setTests((prev) => [{ id: `tst-${Date.now()}`, categoryId, categoryName: category?.name ?? '', ...testForm }, ...prev]);
      showToast(`Test "${testForm.name}" added.`);
    }
    setIsTestModalOpen(false);
  };
  const handleDeleteTest = () => {
    if (!testToDelete) return;
    setTests((prev) => prev.filter((t) => t.id !== testToDelete.id));
    showToast(`Test "${testToDelete.name}" removed.`);
    setTestToDelete(null);
  };

  // --- Package CRUD ---
  const openAddPkg = () => { setPkgForm(emptyPackageForm); setEditingPkg(null); setIsPkgModalOpen(true); };
  const openEditPkg = (p: LabPackageRecord) => {
    setPkgForm({ name: p.name, packageCode: p.packageCode, reportTimeHrs: p.reportTimeHrs, testsIncluded: p.testsIncluded, originalPrice: p.originalPrice, marginalPrice: p.marginalPrice, description: p.description, statusCode: p.statusCode });
    setEditingPkg(p);
    setIsPkgModalOpen(true);
  };
  const handleSavePkg = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPkg) {
      setPackages((prev) => prev.map((p) => p.id === editingPkg.id ? { ...p, ...pkgForm } : p));
      showToast(`Package "${pkgForm.name}" updated.`);
    } else {
      setPackages((prev) => [{ id: `pkg-${Date.now()}`, categoryId, categoryName: category?.name ?? '', ...pkgForm }, ...prev]);
      showToast(`Package "${pkgForm.name}" added.`);
    }
    setIsPkgModalOpen(false);
  };
  const handleDeletePkg = () => {
    if (!pkgToDelete) return;
    setPackages((prev) => prev.filter((p) => p.id !== pkgToDelete.id));
    showToast(`Package "${pkgToDelete.name}" removed.`);
    setPkgToDelete(null);
  };

  if (!category) {
    return (
      <div className="rounded-2xl border border-[#DDE3EA] bg-white p-10 text-center shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
        <FlaskConical size={40} className="text-[#D0D0D0] mx-auto mb-4" />
        <p className="text-[14px] text-[#777]">Category not found.</p>
        <Link href="/admin/labs/test-categories" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#F47C35] hover:underline">
          <ArrowLeft size={13} /> Back to Test Categories
        </Link>
      </div>
    );
  }

  const CatIcon = iconMap[category.icon] ?? FlaskConical;

  return (
    <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 rounded-xl bg-emerald-600 px-4 py-3 text-[13px] font-medium text-white shadow-xl">
          <Check size={16} />
          {toastMessage}
        </div>
      )}

      {/* Page Header */}
      <div className="mb-5">
        <Link href="/admin/labs/test-categories" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#536A88] hover:text-[#F47C35] transition mb-3">
          <ArrowLeft size={13} />
          Back to Test Categories
        </Link>
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm"
            style={{ background: category.iconBg }}
          >
            <CatIcon size={22} style={{ color: category.iconColor }} strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-gray-900">{category.name}</h2>
            <p className="text-[12px] text-[#626262]">Manage tests and packages under this category.</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2">
            <FlaskConical size={14} className="text-blue-600" />
            <span className="text-[12px] font-semibold text-blue-700">{tests.length} Tests</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-purple-100 bg-purple-50 px-4 py-2">
            <Package size={14} className="text-purple-600" />
            <span className="text-[12px] font-semibold text-purple-700">{packages.length} Packages</span>
          </div>
          <span className={`flex items-center rounded-xl px-4 py-2 text-[11px] font-semibold ${category.statusCode === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
            {category.statusCode}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E5E5E5] mb-5">
        <div className="flex gap-0">
          {(['tests', 'packages'] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-5 py-3 text-[13px] font-semibold border-b-2 transition cursor-pointer capitalize ${activeTab === tab ? 'border-[#F47C35] text-[#F47C35]' : 'border-transparent text-[#777] hover:text-[#444]'}`}
            >
              {tab === 'tests' ? <FlaskConical size={14} /> : <Package size={14} />}
              {tab === 'tests' ? 'Tests' : 'Packages'}
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${activeTab === tab ? 'bg-[#F47C35] text-white' : 'bg-gray-100 text-gray-500'}`}>
                {tab === 'tests' ? tests.length : packages.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ==================== TESTS TAB ==================== */}
      {activeTab === 'tests' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap gap-3 flex-1">
              <label className="relative block w-full max-w-[280px]">
                <Search size={13} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#999]" />
                <input type="search" value={testSearch} onChange={(e) => { setTestSearch(e.target.value); setTestPage(0); }} placeholder="Search tests…" className="h-10 w-full rounded-lg border border-[#D6DCE5] pr-4 pl-9 text-[12px] outline-none focus:border-[#F47C35] transition" />
              </label>
              <div className="relative">
                <select value={testStatusFilter} onChange={(e) => { setTestStatusFilter(e.target.value); setTestPage(0); }} className="h-10 appearance-none rounded-lg border border-[#D6DCE5] bg-white pr-7 pl-3 text-[12px] text-[#505050] outline-none cursor-pointer focus:border-[#F47C35]">
                  <option value="">Status: All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#9AA7BA]" />
              </div>
            </div>
            <button type="button" onClick={openAddTest} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#F47C35] px-4 text-[12px] font-semibold text-white hover:bg-[#E96F29] transition cursor-pointer">
              <Plus size={14} /> Add Test
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-[#E5E5E5] shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead className="bg-[#E4E4E4] text-[12px] font-medium text-[#292929]">
                  <tr className="h-[44px]">
                    <th className="w-[110px] border-r border-white px-3 py-3 font-medium">Test Code</th>
                    <th className="min-w-[200px] border-r border-white px-3 py-3 font-medium">Test Name</th>
                    <th className="w-[110px] border-r border-white px-3 py-3 font-medium">Report Time</th>
                    <th className="w-[130px] border-r border-white px-3 py-3 font-medium">Original Price</th>
                    <th className="w-[170px] border-r border-white px-3 py-3 font-medium">
                      <span className="flex items-center gap-1">
                        Marginal Price
                        <span className="text-[9px] font-normal text-[#888]">(our selling)</span>
                      </span>
                    </th>
                    <th className="w-[90px] border-r border-white px-3 py-3 font-medium">Margin %</th>
                    <th className="w-[90px] border-r border-white px-3 py-3 font-medium">Status</th>
                    <th className="w-[80px] px-3 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] text-[#505050]">
                  {paginatedTests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-[13px] text-[#777]">
                        <div className="flex flex-col items-center gap-3">
                          <FlaskConical size={32} className="text-[#D0D0D0]" />
                          No tests found. Click <strong>Add Test</strong> to add one.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedTests.map((t) => {
                      const margin = marginPct(t.originalPrice, t.marginalPrice);
                      return (
                        <tr key={t.id} className="h-[54px] border-b border-[#ECECEC] last:border-b-0 hover:bg-[#FAFAFA] transition-colors">
                          <td className="px-3 font-mono font-medium text-slate-800">{t.testCode}</td>
                          <td className="px-3">
                            <div className="font-medium text-slate-900">{t.name}</div>
                            {t.description && <div className="text-[10px] text-[#888] mt-0.5 truncate max-w-[190px]">{t.description}</div>}
                          </td>
                          <td className="px-3">
                            <span className="flex items-center gap-1"><Clock size={11} className="text-[#888]" />{t.reportTimeHrs}h</span>
                          </td>
                          {/* Original Price */}
                          <td className="px-3 text-[#888]">
                            <span className="flex items-center gap-0.5 font-medium"><IndianRupee size={10} />{t.originalPrice.toLocaleString('en-IN')}</span>
                          </td>
                          {/* Marginal Price + adjust margin button */}
                          <td className="px-3">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-0.5 font-bold text-slate-900">
                                <IndianRupee size={10} />{t.marginalPrice.toLocaleString('en-IN')}
                              </span>
                              <button
                                type="button"
                                data-margin-trigger
                                onClick={(e) =>
                                  openMarginPopup(e, t, (newPrice) => {
                                    setTests((prev) => prev.map((x) => x.id === t.id ? { ...x, marginalPrice: newPrice } : x));
                                    showToast(`Marginal price for "${t.name}" updated to ${fmt.format(newPrice)}`);
                                    setMarginPopup(null);
                                  })
                                }
                                title="Adjust marginal price (increase or decrease margin)"
                                className="inline-flex items-center gap-1 h-6 rounded-md border border-[#F47C35]/50 bg-[#FFF4EC] hover:bg-[#FFE5D2] px-2 text-[10px] font-bold text-[#E56317] shadow-2xs transition-all cursor-pointer"
                              >
                                <TrendingUp size={11} className="text-[#F47C35]" />
                                <span>±%</span>
                              </button>
                            </div>
                          </td>
                          {/* Margin % */}
                          <td className="px-3">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold border ${margin >= 20 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                              +{margin}%
                            </span>
                          </td>
                          <td className="px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${t.statusCode === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                              {t.statusCode}
                            </span>
                          </td>
                          <td className="px-3 text-center">
                            <div className="inline-flex items-center justify-center gap-1.5">
                              <button type="button" onClick={() => openEditTest(t)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"><Edit2 size={12} /></button>
                              <button type="button" onClick={() => setTestToDelete(t)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer"><Trash2 size={12} /></button>
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

          {/* Tests Pagination */}
          <div className="mt-3 flex items-center justify-end gap-4 text-[#606060]">
            <span className="text-[11px] text-[#777]">{filteredTests.length} total</span>
            <button type="button" disabled={testPage === 0} onClick={() => setTestPage(0)} className="disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:text-[#F47C35] transition"><ChevronsLeft size={17} strokeWidth={1.8} /></button>
            <button type="button" disabled={testPage === 0} onClick={() => setTestPage((p) => Math.max(p - 1, 0))} className="disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:text-[#F47C35] transition"><ChevronLeft size={17} strokeWidth={1.8} /></button>
            <span className="text-[11px]">Page {testPage + 1} of {testTotalPages}</span>
            <button type="button" disabled={testPage + 1 >= testTotalPages} onClick={() => setTestPage((p) => Math.min(p + 1, testTotalPages - 1))} className="disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:text-[#F47C35] transition"><ChevronRight size={17} strokeWidth={1.8} /></button>
            <button type="button" disabled={testPage + 1 >= testTotalPages} onClick={() => setTestPage(testTotalPages - 1)} className="disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:text-[#F47C35] transition"><ChevronsRight size={17} strokeWidth={1.8} /></button>
          </div>
        </>
      )}

      {/* ==================== PACKAGES TAB ==================== */}
      {activeTab === 'packages' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap gap-3 flex-1">
              <label className="relative block w-full max-w-[280px]">
                <Search size={13} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#999]" />
                <input type="search" value={pkgSearch} onChange={(e) => { setPkgSearch(e.target.value); setPkgPage(0); }} placeholder="Search packages…" className="h-10 w-full rounded-lg border border-[#D6DCE5] pr-4 pl-9 text-[12px] outline-none focus:border-[#F47C35] transition" />
              </label>
              <div className="relative">
                <select value={pkgStatusFilter} onChange={(e) => { setPkgStatusFilter(e.target.value); setPkgPage(0); }} className="h-10 appearance-none rounded-lg border border-[#D6DCE5] bg-white pr-7 pl-3 text-[12px] text-[#505050] outline-none cursor-pointer focus:border-[#F47C35]">
                  <option value="">Status: All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#9AA7BA]" />
              </div>
            </div>
            <button type="button" onClick={openAddPkg} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#F47C35] px-4 text-[12px] font-semibold text-white hover:bg-[#E96F29] transition cursor-pointer">
              <Plus size={14} /> Add Package
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-[#E5E5E5] shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-left">
                <thead className="bg-[#E4E4E4] text-[12px] font-medium text-[#292929]">
                  <tr className="h-[44px]">
                    <th className="w-[110px] border-r border-white px-3 py-3 font-medium">Pkg Code</th>
                    <th className="min-w-[200px] border-r border-white px-3 py-3 font-medium">Package Name</th>
                    <th className="w-[110px] border-r border-white px-3 py-3 font-medium">Report Time</th>
                    <th className="w-[80px] border-r border-white px-3 py-3 font-medium text-center">Tests</th>
                    <th className="w-[130px] border-r border-white px-3 py-3 font-medium">Original Price</th>
                    <th className="w-[170px] border-r border-white px-3 py-3 font-medium">
                      <span className="flex items-center gap-1">
                        Marginal Price
                        <span className="text-[9px] font-normal text-[#888]">(our selling)</span>
                      </span>
                    </th>
                    <th className="w-[90px] border-r border-white px-3 py-3 font-medium">Margin %</th>
                    <th className="w-[90px] border-r border-white px-3 py-3 font-medium">Status</th>
                    <th className="w-[80px] px-3 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] text-[#505050]">
                  {paginatedPkgs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-[13px] text-[#777]">
                        <div className="flex flex-col items-center gap-3">
                          <Package size={32} className="text-[#D0D0D0]" />
                          No packages found. Click <strong>Add Package</strong> to add one.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedPkgs.map((p) => {
                      const margin = marginPct(p.originalPrice, p.marginalPrice);
                      return (
                        <tr key={p.id} className="h-[54px] border-b border-[#ECECEC] last:border-b-0 hover:bg-[#FAFAFA] transition-colors">
                          <td className="px-3 font-mono font-medium text-slate-800">{p.packageCode}</td>
                          <td className="px-3">
                            <div className="font-medium text-slate-900">{p.name}</div>
                            {p.description && <div className="text-[10px] text-[#888] mt-0.5 truncate max-w-[190px]">{p.description}</div>}
                          </td>
                          <td className="px-3">
                            <span className="flex items-center gap-1"><Clock size={11} className="text-[#888]" />{p.reportTimeHrs}h</span>
                          </td>
                          <td className="px-3 text-center">
                            <span className="inline-block rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{p.testsIncluded}</span>
                          </td>
                          {/* Original Price */}
                          <td className="px-3 text-[#888]">
                            <span className="flex items-center gap-0.5 font-medium"><IndianRupee size={10} />{p.originalPrice.toLocaleString('en-IN')}</span>
                          </td>
                          {/* Marginal Price + adjust margin button */}
                          <td className="px-3">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-0.5 font-bold text-slate-900">
                                <IndianRupee size={10} />{p.marginalPrice.toLocaleString('en-IN')}
                              </span>
                              <button
                                type="button"
                                data-margin-trigger
                                onClick={(e) =>
                                  openMarginPopup(e, p, (newPrice) => {
                                    setPackages((prev) => prev.map((x) => x.id === p.id ? { ...x, marginalPrice: newPrice } : x));
                                    showToast(`Marginal price for "${p.name}" updated to ${fmt.format(newPrice)}`);
                                    setMarginPopup(null);
                                  })
                                }
                                title="Adjust marginal price (increase or decrease margin)"
                                className="inline-flex items-center gap-1 h-6 rounded-md border border-[#F47C35]/50 bg-[#FFF4EC] hover:bg-[#FFE5D2] px-2 text-[10px] font-bold text-[#E56317] shadow-2xs transition-all cursor-pointer"
                              >
                                <TrendingUp size={11} className="text-[#F47C35]" />
                                <span>±%</span>
                              </button>
                            </div>
                          </td>
                          {/* Margin % */}
                          <td className="px-3">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold border ${margin >= 20 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                              +{margin}%
                            </span>
                          </td>
                          <td className="px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${p.statusCode === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                              {p.statusCode}
                            </span>
                          </td>
                          <td className="px-3 text-center">
                            <div className="inline-flex items-center justify-center gap-1.5">
                              <button type="button" onClick={() => openEditPkg(p)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"><Edit2 size={12} /></button>
                              <button type="button" onClick={() => setPkgToDelete(p)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer"><Trash2 size={12} /></button>
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

          {/* Packages Pagination */}
          <div className="mt-3 flex items-center justify-end gap-4 text-[#606060]">
            <span className="text-[11px] text-[#777]">{filteredPkgs.length} total</span>
            <button type="button" disabled={pkgPage === 0} onClick={() => setPkgPage(0)} className="disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:text-[#F47C35] transition"><ChevronsLeft size={17} strokeWidth={1.8} /></button>
            <button type="button" disabled={pkgPage === 0} onClick={() => setPkgPage((p) => Math.max(p - 1, 0))} className="disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:text-[#F47C35] transition"><ChevronLeft size={17} strokeWidth={1.8} /></button>
            <span className="text-[11px]">Page {pkgPage + 1} of {pkgTotalPages}</span>
            <button type="button" disabled={pkgPage + 1 >= pkgTotalPages} onClick={() => setPkgPage((p) => Math.min(p + 1, pkgTotalPages - 1))} className="disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:text-[#F47C35] transition"><ChevronRight size={17} strokeWidth={1.8} /></button>
            <button type="button" disabled={pkgPage + 1 >= pkgTotalPages} onClick={() => setPkgPage(pkgTotalPages - 1)} className="disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:text-[#F47C35] transition"><ChevronsRight size={17} strokeWidth={1.8} /></button>
          </div>
        </>
      )}

      {/* ===== ADD / EDIT TEST MODAL ===== */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[15px] font-bold text-gray-900">{editingTest ? 'Edit Test' : 'Add New Test'}</h3>
                <p className="text-[11px] text-[#777] mt-0.5">Category: <strong>{category.name}</strong></p>
              </div>
              <button type="button" onClick={() => setIsTestModalOpen(false)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 cursor-pointer transition"><X size={15} /></button>
            </div>
            <form onSubmit={handleSaveTest} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Test Name *</label>
                <input type="text" required value={testForm.name} onChange={(e) => setTestForm({ ...testForm, name: e.target.value })} placeholder="e.g. Vitamin D Test (25-Hydroxy)" className="w-full h-10 px-3 rounded-lg border border-[#D6DCE5] text-[12px] outline-none focus:border-[#F47C35] transition" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Test Code *</label>
                  <input type="text" required value={testForm.testCode} onChange={(e) => setTestForm({ ...testForm, testCode: e.target.value.toUpperCase() })} placeholder="e.g. TST011" className="w-full h-10 px-3 rounded-lg border border-[#D6DCE5] text-[12px] uppercase outline-none focus:border-[#F47C35] transition" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Report Time (hrs)</label>
                  <input type="number" min={1} value={testForm.reportTimeHrs} onChange={(e) => setTestForm({ ...testForm, reportTimeHrs: Number(e.target.value) })} className="w-full h-10 px-3 rounded-lg border border-[#D6DCE5] text-[12px] outline-none focus:border-[#F47C35] transition" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Original Price (₹) *</label>
                  <input type="number" required min={0} value={testForm.originalPrice} onChange={(e) => setTestForm({ ...testForm, originalPrice: Number(e.target.value) })} placeholder="Lab cost" className="w-full h-10 px-3 rounded-lg border border-[#D6DCE5] text-[12px] outline-none focus:border-[#F47C35] transition" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Marginal Price (₹) *</label>
                  <input type="number" required min={0} value={testForm.marginalPrice} onChange={(e) => setTestForm({ ...testForm, marginalPrice: Number(e.target.value) })} placeholder="Our selling price" className="w-full h-10 px-3 rounded-lg border border-[#D6DCE5] text-[12px] outline-none focus:border-[#F47C35] transition" />
                </div>
              </div>
              {testForm.originalPrice > 0 && testForm.marginalPrice > 0 && (
                <p className="text-[11px] text-emerald-600 font-semibold">
                  Margin: +{marginPct(testForm.originalPrice, testForm.marginalPrice)}% on original price
                </p>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea value={testForm.description} onChange={(e) => setTestForm({ ...testForm, description: e.target.value })} rows={2} placeholder="Brief description…" className="w-full px-3 py-2 rounded-lg border border-[#D6DCE5] text-[12px] outline-none focus:border-[#F47C35] transition resize-none" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Status</label>
                <div className="relative">
                  <select value={testForm.statusCode} onChange={(e) => setTestForm({ ...testForm, statusCode: e.target.value as 'ACTIVE' | 'INACTIVE' })} className="w-full h-10 appearance-none rounded-lg border border-[#D6DCE5] bg-white px-3 pr-8 text-[12px] outline-none cursor-pointer focus:border-[#F47C35] transition">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#9AA7BA]" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsTestModalOpen(false)} className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[12px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">Cancel</button>
                <button type="submit" className="h-10 rounded-lg bg-[#F47C35] px-5 text-[12px] font-semibold text-white hover:bg-[#E96F29] cursor-pointer transition">{editingTest ? 'Save Changes' : 'Add Test'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== ADD / EDIT PACKAGE MODAL ===== */}
      {isPkgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[15px] font-bold text-gray-900">{editingPkg ? 'Edit Package' : 'Add New Package'}</h3>
                <p className="text-[11px] text-[#777] mt-0.5">Category: <strong>{category.name}</strong></p>
              </div>
              <button type="button" onClick={() => setIsPkgModalOpen(false)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 cursor-pointer transition"><X size={15} /></button>
            </div>
            <form onSubmit={handleSavePkg} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Package Name *</label>
                <input type="text" required value={pkgForm.name} onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })} placeholder="e.g. PCOS Panel - Essential" className="w-full h-10 px-3 rounded-lg border border-[#D6DCE5] text-[12px] outline-none focus:border-[#F47C35] transition" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Package Code *</label>
                  <input type="text" required value={pkgForm.packageCode} onChange={(e) => setPkgForm({ ...pkgForm, packageCode: e.target.value.toUpperCase() })} placeholder="PKG011" className="w-full h-10 px-3 rounded-lg border border-[#D6DCE5] text-[12px] uppercase outline-none focus:border-[#F47C35] transition" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Report Time (hrs)</label>
                  <input type="number" min={1} value={pkgForm.reportTimeHrs} onChange={(e) => setPkgForm({ ...pkgForm, reportTimeHrs: Number(e.target.value) })} className="w-full h-10 px-3 rounded-lg border border-[#D6DCE5] text-[12px] outline-none focus:border-[#F47C35] transition" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Tests Included</label>
                  <input type="number" min={1} value={pkgForm.testsIncluded} onChange={(e) => setPkgForm({ ...pkgForm, testsIncluded: Number(e.target.value) })} className="w-full h-10 px-3 rounded-lg border border-[#D6DCE5] text-[12px] outline-none focus:border-[#F47C35] transition" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Original Price (₹) *</label>
                  <input type="number" required min={0} value={pkgForm.originalPrice} onChange={(e) => setPkgForm({ ...pkgForm, originalPrice: Number(e.target.value) })} placeholder="Lab cost" className="w-full h-10 px-3 rounded-lg border border-[#D6DCE5] text-[12px] outline-none focus:border-[#F47C35] transition" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Marginal Price (₹) *</label>
                  <input type="number" required min={0} value={pkgForm.marginalPrice} onChange={(e) => setPkgForm({ ...pkgForm, marginalPrice: Number(e.target.value) })} placeholder="Our selling price" className="w-full h-10 px-3 rounded-lg border border-[#D6DCE5] text-[12px] outline-none focus:border-[#F47C35] transition" />
                </div>
              </div>
              {pkgForm.originalPrice > 0 && pkgForm.marginalPrice > 0 && (
                <p className="text-[11px] text-emerald-600 font-semibold">
                  Margin: +{marginPct(pkgForm.originalPrice, pkgForm.marginalPrice)}% on original price
                </p>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea value={pkgForm.description} onChange={(e) => setPkgForm({ ...pkgForm, description: e.target.value })} rows={2} placeholder="Brief description…" className="w-full px-3 py-2 rounded-lg border border-[#D6DCE5] text-[12px] outline-none focus:border-[#F47C35] transition resize-none" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Status</label>
                <div className="relative">
                  <select value={pkgForm.statusCode} onChange={(e) => setPkgForm({ ...pkgForm, statusCode: e.target.value as 'ACTIVE' | 'INACTIVE' })} className="w-full h-10 appearance-none rounded-lg border border-[#D6DCE5] bg-white px-3 pr-8 text-[12px] outline-none cursor-pointer focus:border-[#F47C35] transition">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#9AA7BA]" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsPkgModalOpen(false)} className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[12px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">Cancel</button>
                <button type="submit" className="h-10 rounded-lg bg-[#F47C35] px-5 text-[12px] font-semibold text-white hover:bg-[#E96F29] cursor-pointer transition">{editingPkg ? 'Save Changes' : 'Add Package'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Test Confirm */}
      {testToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600"><AlertTriangle size={24} /></div>
            <h3 className="mt-4 text-[16px] font-bold text-gray-900">Delete Test?</h3>
            <p className="mt-2 text-[13px] text-gray-600">Delete <strong className="text-gray-900">{testToDelete.name}</strong>? This cannot be undone.</p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setTestToDelete(null)} className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">Cancel</button>
              <button type="button" onClick={handleDeleteTest} className="h-10 rounded-lg bg-rose-600 px-4 text-[13px] font-semibold text-white hover:bg-rose-700 cursor-pointer">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Package Confirm */}
      {pkgToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600"><AlertTriangle size={24} /></div>
            <h3 className="mt-4 text-[16px] font-bold text-gray-900">Delete Package?</h3>
            <p className="mt-2 text-[13px] text-gray-600">Delete <strong className="text-gray-900">{pkgToDelete.name}</strong>? This cannot be undone.</p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setPkgToDelete(null)} className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">Cancel</button>
              <button type="button" onClick={handleDeletePkg} className="h-10 rounded-lg bg-rose-600 px-4 text-[13px] font-semibold text-white hover:bg-rose-700 cursor-pointer">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
      {/* Margin Adjustment Popup (fixed positioning escaping all containers) */}
      {marginPopup && (
        <div data-margin-popup>
          <div
            className="fixed inset-0 z-[299] bg-black/10 backdrop-blur-[0.5px]"
            onClick={() => setMarginPopup(null)}
          />
          <MarginPopup data={marginPopup} onClose={() => setMarginPopup(null)} />
        </div>
      )}
    </div>
  );
}
