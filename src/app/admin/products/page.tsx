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
  Package,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { mockProducts } from '@/data/mockData';
import { ProductRecord } from '@/types/dashboard';
import {
  getAdminProducts,
  getAdminProductById,
  updateAdminProduct,
  deleteAdminProduct,
} from '@/services/api/adminProductsApi';
import { getAdminCategories } from '@/services/api/adminCategoriesApi';
import { BackendProduct, BackendCategory } from '@/types/api';

function mapBackendProductToRecord(
  bp: BackendProduct,
  idx: number,
  cats: BackendCategory[] = []
): ProductRecord {
  const prodId = bp.product_id ?? bp.id ?? idx + 1;
  const name = bp.product_name || bp.name || 'Product';
  const price = bp.price ?? 999;
  const stock = bp.stock ?? 15;
  const catObj = bp.category_id != null ? cats.find((c) => (c.category_id ?? c.id) === bp.category_id) : null;
  const categoryName = catObj
    ? catObj.category_name
    : bp.category_id
    ? `Category #${bp.category_id}`
    : bp.prescription_required
    ? 'Rx Required'
    : 'General Healthcare';

  return {
    id: String(prodId),
    productCode: `PRD-${String(prodId).padStart(4, '0')}`,
    name,
    brand: bp.age_group ? `Age: ${bp.age_group}` : 'Merabetta',
    category: categoryName,
    categoryId: bp.category_id != null ? String(bp.category_id) : undefined,
    price,
    originalPrice: Math.round(price * 1.2),
    stock,
    statusCode: stock > 0 ? 'PUBLISHED' : 'DRAFT',
    createdAt: bp.created_at || new Date().toISOString(),
  };
}

export default function ProductManagementPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [categories, setCategories] = useState<BackendCategory[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Modals state
  const [editingProduct, setEditingProduct] = useState<{
    id: string;
    product_name: string;
    prescription_required: boolean;
    age_group: string;
    description: string;
    category_id: string;
  } | null>(null);
  const [productToDelete, setProductToDelete] = useState<ProductRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load categories for dropdown and mapping
  React.useEffect(() => {
    async function loadCats() {
      try {
        const res = await getAdminCategories();
        const catList = Array.isArray(res) ? res : (res?.data ?? []);
        if (Array.isArray(catList)) {
          setCategories(catList);
        }
      } catch (e) {
        console.warn('Categories API note:', e);
      }
    }
    loadCats();
  }, []);

  const loadProducts = React.useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const BATCH_SIZE = 100;
      const res = await getAdminProducts({ limit: BATCH_SIZE, offset: 0 });
      if (Array.isArray(res.data)) {
        let allBackendProducts: BackendProduct[] = [...res.data];
        const total = res.pagination?.total ?? res.data.length;

        let nextOffset = res.data.length;
        while (nextOffset < total && res.data.length > 0) {
          const nextRes = await getAdminProducts({
            limit: BATCH_SIZE,
            offset: nextOffset,
          });
          if (!Array.isArray(nextRes.data) || nextRes.data.length === 0) {
            break;
          }
          allBackendProducts = [...allBackendProducts, ...nextRes.data];
          nextOffset += nextRes.data.length;
          if (nextRes.pagination && !nextRes.pagination.hasMore) {
            break;
          }
        }

        setProducts(
          allBackendProducts.map((bp, idx) =>
            mapBackendProductToRecord(bp, idx, categories)
          )
        );
        setTotalCount(Math.max(total, allBackendProducts.length));
        setIsLive(true);
      }
    } catch (err: any) {
      console.warn('Backend products error:', err.message);
      setFetchError(err.message || 'Unable to connect to live backend');
      setIsLive(false);
    } finally {
      setIsLoading(false);
    }
  }, [categories]);

  React.useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleEditClick = async (product: ProductRecord) => {
    setEditingProduct({
      id: product.id,
      product_name: product.name,
      prescription_required: false,
      age_group: '',
      description: '',
      category_id: '',
    });
    setIsLoadingDetails(true);
    try {
      const details = await getAdminProductById(product.id);
      if (details) {
        setEditingProduct({
          id: String(details.product_id ?? details.id ?? product.id),
          product_name: details.product_name || details.name || product.name,
          prescription_required: Boolean(details.prescription_required),
          age_group: details.age_group || '',
          description: details.description || '',
          category_id: details.category_id != null ? String(details.category_id) : '',
        });
      }
    } catch (err: any) {
      console.warn('Product fetch by ID note:', err.message);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleUpdateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setIsSubmitting(true);
    try {
      await updateAdminProduct(editingProduct.id, {
        product_name: editingProduct.product_name.trim(),
        prescription_required: editingProduct.prescription_required,
        age_group: editingProduct.age_group.trim() || null,
        description: editingProduct.description.trim() || null,
        category_id: editingProduct.category_id ? Number(editingProduct.category_id) : null,
      });
      showToast(`Product "${editingProduct.product_name}" updated successfully.`);
      setEditingProduct(null);
      await loadProducts();
    } catch (err: any) {
      showToast(err.message || 'Failed to update product on server.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProductConfirm = async () => {
    if (!productToDelete) return;

    setIsSubmitting(true);
    try {
      await deleteAdminProduct(productToDelete.id);
      showToast(`Product "${productToDelete.name}" removed successfully.`);
      setProductToDelete(null);
      await loadProducts();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete product on server.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        !selectedCategory ||
        p.categoryId === selectedCategory ||
        p.category.toLowerCase().includes(selectedCategory.toLowerCase());

      const matchesBrand =
        !selectedBrand || p.brand.toLowerCase() === selectedBrand.toLowerCase();

      const matchesStatus =
        !selectedStatus || p.statusCode.toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesCat && matchesBrand && matchesStatus;
    });
  }, [products, searchQuery, selectedCategory, selectedBrand, selectedStatus]);

  // Paginated products
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages - 1);
  const paginatedProducts = filteredProducts.slice(
    safeCurrentPage * pageSize,
    (safeCurrentPage + 1) * pageSize
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
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Connection Status & Refresh Banner */}
      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
            <span>Backend API message: {fetchError}</span>
          </div>
          <button
            type="button"
            onClick={loadProducts}
            className="inline-flex items-center gap-1 font-semibold text-amber-900 underline hover:text-black cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-semibold text-black">Product Management</h2>
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live API
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] font-normal text-[#626262]">
            Manage your catalog, stock and product listings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadProducts}
            disabled={isLoading}
            title="Reload from API"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
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
            {categories.map((c) => (
              <option key={c.category_id ?? c.id} value={String(c.category_id ?? c.id)}>
                {c.category_name}
              </option>
            ))}
            {categories.length === 0 && (
              <>
                <option value="Mobility Aids">Mobility Aids</option>
                <option value="Health Monitoring">Health Monitoring</option>
                <option value="Patient Care">Patient Care</option>
                <option value="Daily Living Aids">Daily Living Aids</option>
                <option value="Personal Hygiene">Personal Hygiene</option>
                <option value="Sensory & Hearing">Sensory & Hearing</option>
              </>
            )}
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
                            onClick={() => handleEditClick(p)}
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
              <option value="10">10</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#9AA0A6]"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[11px] text-[#777]">
            {searchQuery.trim() || selectedCategory || selectedBrand || selectedStatus
              ? `${filteredProducts.length} of ${totalCount || products.length} total`
              : `${totalCount || filteredProducts.length} total`}
          </span>
          <button
            type="button"
            aria-label="First page"
            disabled={safeCurrentPage === 0}
            onClick={() => setCurrentPage(0)}
            className="disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:text-[#F47C35] transition"
          >
            <ChevronsLeft size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            aria-label="Previous page"
            disabled={safeCurrentPage === 0}
            onClick={() => setCurrentPage(Math.max(safeCurrentPage - 1, 0))}
            className="disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:text-[#F47C35] transition"
          >
            <ChevronLeft size={18} strokeWidth={1.8} />
          </button>
          <span className="text-[11px] font-normal">
            Page {safeCurrentPage + 1} of {totalPages}
          </span>
          <button
            type="button"
            aria-label="Next page"
            disabled={safeCurrentPage + 1 >= totalPages}
            onClick={() => setCurrentPage(Math.min(safeCurrentPage + 1, totalPages - 1))}
            className="disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:text-[#F47C35] transition"
          >
            <ChevronRight size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            aria-label="Last page"
            disabled={safeCurrentPage + 1 >= totalPages}
            onClick={() => setCurrentPage(totalPages - 1)}
            className="disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:text-[#F47C35] transition"
          >
            <ChevronsRight size={18} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleUpdateProductSubmit}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-[16px] font-bold text-gray-900">Edit Product</h3>
                <span className="text-[12px] text-gray-500 font-mono">ID: {editingProduct.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {isLoadingDetails && (
              <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                <Loader2 size={13} className="animate-spin text-amber-600" />
                <span>Loading latest details from backend...</span>
              </div>
            )}

            <div className="mt-4 space-y-4 text-[13px]">
              <div>
                <label className="block font-medium text-gray-700">Product Name *</label>
                <input
                  type="text"
                  required
                  maxLength={255}
                  value={editingProduct.product_name}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, product_name: e.target.value })
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700">Prescription Required</label>
                  <select
                    value={editingProduct.prescription_required ? 'yes' : 'no'}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        prescription_required: e.target.value === 'yes',
                      })
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-gray-700">Age Group</label>
                  <input
                    type="text"
                    maxLength={100}
                    value={editingProduct.age_group}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, age_group: e.target.value })
                    }
                    placeholder="e.g. Adults, Seniors"
                    className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700">Category</label>
                <select
                  value={editingProduct.category_id}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, category_id: e.target.value })
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                >
                  <option value="">None / Unassigned</option>
                  {categories.map((c) => (
                    <option key={c.category_id ?? c.id} value={String(c.category_id ?? c.id)}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-gray-700">Description</label>
                <textarea
                  rows={3}
                  value={editingProduct.description}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
                  placeholder="Product description and details"
                  className="mt-1 w-full rounded-lg border border-[#D6DCE5] p-2.5 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const id = editingProduct.id;
                    setEditingProduct(null);
                    router.push(`/admin/products/add?id=${id}`);
                  }}
                  className="text-xs font-semibold text-[#F47C35] hover:text-[#E96F29] underline cursor-pointer"
                >
                  Open in Full Product Editor &rarr;
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                disabled={isSubmitting}
                className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 h-10 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white hover:bg-[#E96F29] cursor-pointer disabled:opacity-50"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

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
                disabled={isSubmitting}
                className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProductConfirm}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 h-10 rounded-lg bg-rose-600 px-4 text-[13px] font-semibold text-white hover:bg-rose-700 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                <span>{isSubmitting ? 'Deleting...' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
