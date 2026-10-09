'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  FileSpreadsheet,
  Package,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
} from 'lucide-react';
import { mockProducts } from '@/data/mockData';
import { ProductRecord } from '@/types/dashboard';

export default function ProductManagementPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductRecord[]>(mockProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number>(13);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [showBulkBanner, setShowBulkBanner] = useState<boolean>(true);
  const [productToDelete, setProductToDelete] = useState<ProductRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.productCode.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q);

      const matchesCat =
        !selectedCategory || p.category.toLowerCase().includes(selectedCategory.toLowerCase());

      const matchesBrand =
        !selectedBrand || p.brand.toLowerCase() === selectedBrand.toLowerCase();

      const matchesStatus =
        !selectedStatus || p.statusCode.toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesCat && matchesBrand && matchesStatus;
    });
  }, [products, searchQuery, selectedCategory, selectedBrand, selectedStatus]);

  // Paginated products
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = filteredProducts.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const isAllSelected =
    paginatedProducts.length > 0 &&
    paginatedProducts.every((p) => selectedIds.includes(p.id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !paginatedProducts.some((p) => p.id === id))
      );
    } else {
      setSelectedIds((prev) => [
        ...new Set([...prev, ...paginatedProducts.map((p) => p.id)]),
      ]);
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

  return (
    <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-semibold text-black">Product Management</h2>
          <p className="mt-1 text-[12px] font-normal text-[#626262]">
            Manage your catalog, stock and product listings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => alert('Download template or open bulk import modal')}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <FileSpreadsheet size={16} className="text-[#265D9B]" />
            <span>Bulk Upload</span>
          </button>

          <Link
            href="/admin/products/add"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-[#E96F29]"
          >
            <Plus size={16} />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* Bulk Import Notification Banner */}
      {showBulkBanner && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-5 rounded-xl border border-[#B9D2F3] bg-[#F4F8FF] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DFEBFC] text-[#265D9B]">
              <FileSpreadsheet size={20} />
            </span>
            <div>
              <p className="text-[14px] font-semibold text-[#173F70]">
                1 bulk import batch needs your review
              </p>
              <p className="mt-0.5 text-[11px] text-[#52749C]">
                24 linked products. Approve the complete batch at once or review individual items.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setShowBulkBanner(false)}
              className="h-9 rounded-lg border border-[#8FB4E2] bg-white px-3.5 text-[12px] font-semibold text-[#265D9B] hover:bg-blue-50/50 transition cursor-pointer"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => alert('Reviewing batch: MeraBetta_Sep_Catalog_Import_V2.xlsx')}
              className="h-9 rounded-lg bg-[#265D9B] px-4 text-[12px] font-semibold text-white shadow-xs hover:bg-[#1f4e85] transition cursor-pointer"
            >
              Review next batch
            </button>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        {/* Search */}
        <label className="relative block w-full max-w-[340px]">
          <span className="sr-only">Search products</span>
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
            placeholder="Search by ID, name, brand"
            className="h-11 w-full rounded-lg border border-[#D6DCE5] pr-4 pl-10 text-[13px] outline-none transition focus:border-[#F47C35]"
          />
        </label>

        {/* Category Filter */}
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(0);
            }}
            className="h-11 appearance-none rounded-lg border border-[#D6DCE5] bg-white pr-8 pl-3 text-[13px] font-normal text-[#505050] outline-none cursor-pointer focus:border-[#F47C35]"
          >
            <option value="">Category: All</option>
            <option value="Mobility Aids">Mobility Aids</option>
            <option value="Health Monitoring">Health Monitoring</option>
            <option value="Patient Care">Patient Care</option>
            <option value="Daily Living Aids">Daily Living Aids</option>
            <option value="Personal Hygiene">Personal Hygiene</option>
            <option value="Sensory & Hearing">Sensory & Hearing</option>
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#9AA7BA]"
          />
        </div>

        {/* Status Filter */}
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
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
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
          <table className="w-full min-w-[1050px] border-collapse text-left">
            <thead className="bg-[#E4E4E4] text-[12px] font-medium text-[#292929]">
              <tr className="h-[46px]">
                <th className="w-[50px] border-r border-white px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    aria-label="Select all products"
                    className="h-4 w-4 rounded border-gray-300 accent-[#F47C35] cursor-pointer"
                  />
                </th>
                <th className="w-[120px] border-r border-white px-3 py-3 font-medium">ID</th>
                <th className="w-[60px] border-r border-white px-3 py-3 text-center font-medium">Image</th>
                <th className="min-w-[220px] border-r border-white px-3 py-3 font-medium">Product Name</th>
                <th className="min-w-[180px] border-r border-white px-3 py-3 font-medium">Category</th>
                <th className="w-[130px] border-r border-white px-3 py-3 font-medium">Brand</th>
                <th className="w-[110px] border-r border-white px-3 py-3 font-medium">Stock</th>
                <th className="w-[100px] border-r border-white px-3 py-3 font-medium">Price</th>
                <th className="w-[110px] border-r border-white px-3 py-3 font-medium">Status</th>
                <th className="w-[105px] px-3 py-3 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-[#505050]">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-[13px] text-[#777]">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const isSelected = selectedIds.includes(p.id);

                  return (
                    <tr
                      key={p.id}
                      className="h-[50px] border-b border-[#ECECEC] last:border-b-0 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(p.id)}
                          aria-label={`Select ${p.name}`}
                          className="h-4 w-4 rounded border-gray-300 accent-[#F47C35] cursor-pointer"
                        />
                      </td>
                      <td className="px-3 font-mono font-medium text-slate-800">
                        {p.productCode}
                      </td>
                      <td className="px-3 text-center">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-500 mx-auto">
                          <Package size={18} />
                        </div>
                      </td>
                      <td className="px-3 font-medium text-slate-900">
                        {p.name}
                      </td>
                      <td className="px-3 text-[#606060]">{p.category}</td>
                      <td className="px-3 font-medium text-slate-800">{p.brand}</td>
                      <td className="px-3">
                        <span
                          className={`font-semibold ${
                            p.stock > 10
                              ? 'text-emerald-700'
                              : p.stock > 0
                              ? 'text-amber-700'
                              : 'text-rose-600'
                          }`}
                        >
                          {p.stock > 0 ? `${p.stock} units` : 'Out of stock'}
                        </span>
                      </td>
                      <td className="px-3 font-semibold text-slate-900">
                        {currencyFormatter.format(p.price)}
                      </td>
                      <td className="px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.statusCode === 'PUBLISHED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.statusCode === 'DRAFT'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          {p.statusCode}
                        </span>
                      </td>
                      <td className="px-3 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => router.push(`/admin/products/add?id=${p.id}`)}
                            title="Edit product"
                            aria-label={`Edit ${p.name}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setProductToDelete(p)}
                            title="Delete product"
                            aria-label={`Delete ${p.name}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
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
              <option value="13">13</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#9AA0A6]"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[11px] text-[#777]">
            {filteredProducts.length} total
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

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertTriangle size={24} />
            </div>

            <h3 className="mt-4 text-[16px] font-bold text-gray-900">Delete Product?</h3>
            <p className="mt-2 text-[13px] text-gray-600">
              Are you sure you want to delete <strong className="text-gray-900">{productToDelete.name}</strong> ({productToDelete.productCode})?
              This will remove the product from customer catalog listings.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
                  setToastMessage(`Product "${productToDelete.name}" removed successfully.`);
                  setProductToDelete(null);
                  setTimeout(() => setToastMessage(null), 3500);
                }}
                className="h-10 rounded-lg bg-rose-600 px-4 text-[13px] font-semibold text-white hover:bg-rose-700 cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
