'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  FolderTree,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import {
  getAdminCategories,
  getAllAdminCategories,
  getAdminCategoryById,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
} from '@/services/api/adminCategoriesApi';
import { BackendCategory } from '@/types/api';

/**
 * Traverses category hierarchy to identify all descendant IDs of a given category.
 * Prevents circular parent-child assignment in the edit form.
 */
function getDescendantIds(targetId: number, categories: BackendCategory[]): Set<number> {
  const descendants = new Set<number>();
  const queue = [targetId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    for (const cat of categories) {
      const catId = cat.category_id ?? (typeof cat.id === 'number' ? cat.id : Number(cat.id));
      if (cat.parent_category_id === currentId && catId && !descendants.has(catId)) {
        descendants.add(catId);
        queue.push(catId);
      }
    }
  }

  return descendants;
}

export default function CategoryManagementPage() {
  // Data state
  const [categories, setCategories] = useState<BackendCategory[]>([]);
  const [allCategories, setAllCategories] = useState<BackendCategory[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Status & loading state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  // Filter & Pagination state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [parentFilter, setParentFilter] = useState<string>(''); // '' = all, 'root' = root only, or categoryId
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Notification state
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<BackendCategory | null>(null);

  // Add category form state
  const [addForm, setAddForm] = useState({
    category_name: '',
    parent_category_id: '',
    category_image: '',
    description: '',
  });
  const [addFormErrors, setAddFormErrors] = useState<Record<string, string>>({});

  // Edit category form state
  const [editForm, setEditForm] = useState({
    category_name: '',
    parent_category_id: '',
    category_image: '',
    description: '',
  });
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  /**
   * Refreshes the broader category list used for parent selectors and parent name lookup.
   */
  const refreshAllCategories = useCallback(async () => {
    try {
      const list = await getAllAdminCategories();
      if (Array.isArray(list)) {
        setAllCategories(list);
      }
    } catch {
      // Backend lookup logged via loadCategories
    }
  }, []);

  /**
   * Loads paginated categories from the real backend endpoint GET /api/admin/categories.
   */
  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const params: { limit: number; offset: number; parent_category_id?: number } = {
        limit: pageSize,
        offset: currentPage * pageSize,
      };

      if (parentFilter && parentFilter !== 'root') {
        const numId = Number(parentFilter);
        if (!isNaN(numId)) {
          params.parent_category_id = numId;
        }
      }

      const res = await getAdminCategories(params);

      let fetchedData = res.data;

      // If filtering specifically for root categories (parent_category_id is null)
      if (parentFilter === 'root') {
        fetchedData = fetchedData.filter((c) => c.parent_category_id == null);
      }

      setCategories(fetchedData);
      setTotalCount(res.pagination?.total ?? fetchedData.length);
      setHasMore(res.pagination?.hasMore ?? false);
      setIsLive(true);
    } catch (err: any) {
      const msg = err.message || 'Failed to load categories from backend API.';
      setFetchError(msg);
      setCategories([]);
      setIsLive(false);
    } finally {
      setIsLoading(false);
    }
  }, [pageSize, currentPage, parentFilter]);

  // Initial load
  useEffect(() => {
    refreshAllCategories();
  }, [refreshAllCategories]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Client-side search on the fetched records
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;

    return categories.filter((c) => {
      const id = String(c.category_id ?? c.id ?? '');
      const name = (c.category_name || '').toLowerCase();
      const desc = (c.description || '').toLowerCase();
      return id.includes(q) || name.includes(q) || desc.includes(q);
    });
  }, [categories, searchQuery]);

  // Compute pagination counts
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Resolves parent category display name from cached records
  const getParentName = (parentId?: number | null): string => {
    if (parentId == null) return 'None (Root)';
    const parent = allCategories.find((c) => (c.category_id ?? c.id) === parentId);
    return parent ? parent.category_name : `#${parentId}`;
  };

  /* ------------------------------------------------------------------ */
  /* Add Category Handlers                                              */
  /* ------------------------------------------------------------------ */
  const handleOpenAddModal = () => {
    setAddForm({
      category_name: '',
      parent_category_id: '',
      category_image: '',
      description: '',
    });
    setAddFormErrors({});
    setIsAddModalOpen(true);
    refreshAllCategories();
  };

  const validateAddForm = (): boolean => {
    const errors: Record<string, string> = {};
    const name = addForm.category_name.trim();

    if (!name) {
      errors.category_name = 'Category name is required';
    } else if (name.length > 255) {
      errors.category_name = 'Category name cannot exceed 255 characters';
    }

    if (addForm.category_image.trim().length > 2048) {
      errors.category_image = 'Image URL cannot exceed 2048 characters';
    }

    setAddFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAddForm() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload = {
        category_name: addForm.category_name.trim(),
        parent_category_id: addForm.parent_category_id ? Number(addForm.parent_category_id) : null,
        category_image: addForm.category_image.trim() || null,
        description: addForm.description.trim() || null,
      };

      const created = await createAdminCategory(payload);
      showToast(`Category "${created.category_name}" created successfully.`);
      setIsAddModalOpen(false);
      await Promise.all([loadCategories(), refreshAllCategories()]);
    } catch (err: any) {
      showToast(err.message || 'Failed to create category on backend.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Edit Category Handlers                                             */
  /* ------------------------------------------------------------------ */
  const handleOpenEditModal = async (cat: BackendCategory) => {
    const catId = cat.category_id ?? (typeof cat.id === 'number' ? cat.id : Number(cat.id));
    if (!catId) return;

    setEditingCategoryId(catId);
    setEditForm({
      category_name: cat.category_name || '',
      parent_category_id: cat.parent_category_id != null ? String(cat.parent_category_id) : '',
      category_image: cat.category_image || '',
      description: cat.description || '',
    });
    setEditFormErrors({});
    setIsLoadingDetails(true);

    try {
      const fresh = await getAdminCategoryById(catId);
      if (fresh) {
        setEditForm({
          category_name: fresh.category_name || '',
          parent_category_id: fresh.parent_category_id != null ? String(fresh.parent_category_id) : '',
          category_image: fresh.category_image || '',
          description: fresh.description || '',
        });
      }
    } catch (err: any) {
      console.warn('Could not fetch fresh category detail by ID:', err.message);
    } finally {
      setIsLoadingDetails(false);
      refreshAllCategories();
    }
  };

  const validateEditForm = (): boolean => {
    const errors: Record<string, string> = {};
    const name = editForm.category_name.trim();

    if (!name) {
      errors.category_name = 'Category name is required';
    } else if (name.length > 255) {
      errors.category_name = 'Category name cannot exceed 255 characters';
    }

    if (editForm.category_image.trim().length > 2048) {
      errors.category_image = 'Image URL cannot exceed 2048 characters';
    }

    if (editingCategoryId && editForm.parent_category_id === String(editingCategoryId)) {
      errors.parent_category_id = 'A category cannot be its own parent';
    }

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategoryId || !validateEditForm() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload = {
        category_name: editForm.category_name.trim(),
        parent_category_id: editForm.parent_category_id ? Number(editForm.parent_category_id) : null,
        category_image: editForm.category_image.trim() || null,
        description: editForm.description.trim() || null,
      };

      const updated = await updateAdminCategory(editingCategoryId, payload);
      showToast(`Category "${updated.category_name}" updated successfully.`);
      setEditingCategoryId(null);
      await Promise.all([loadCategories(), refreshAllCategories()]);
    } catch (err: any) {
      showToast(err.message || 'Failed to update category on backend.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Delete Category Handlers                                           */
  /* ------------------------------------------------------------------ */
  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    const catId = categoryToDelete.category_id ?? (typeof categoryToDelete.id === 'number' ? categoryToDelete.id : Number(categoryToDelete.id));
    if (!catId) return;

    setIsSubmitting(true);
    try {
      await deleteAdminCategory(catId);
      showToast(`Category "${categoryToDelete.category_name}" deleted successfully.`);
      setCategoryToDelete(null);
      await Promise.all([loadCategories(), refreshAllCategories()]);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete category.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine descendants to prevent circular hierarchy assignment
  const disabledParentIdsForEdit = useMemo(() => {
    if (!editingCategoryId) return new Set<number>();
    const descendants = getDescendantIds(editingCategoryId, allCategories);
    descendants.add(editingCategoryId);
    return descendants;
  }, [editingCategoryId, allCategories]);

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
            toastMessage.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Connection & Error Banner */}
      {fetchError && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-amber-950">Backend API Notice</p>
              <p className="text-[12px] text-amber-800">{fetchError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadCategories}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-xs hover:bg-amber-100 cursor-pointer transition"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Main Content Card */}
      <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[18px] font-bold text-gray-900">Categories</h1>
              {isLive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live API
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 border border-gray-200">
                  Offline / Pending
                </span>
              )}
            </div>
            <p className="mt-1 text-[12px] font-normal text-[#626262]">
              Organize products into hierarchical health categories and collections.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadCategories}
              disabled={isLoading}
              title="Refresh categories"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-[#E96F29] cursor-pointer"
            >
              <Plus size={16} />
              <span>Add Category</span>
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <div className="text-[12px] text-gray-500">
            Total records:{' '}
            <span className="font-semibold text-gray-900">{totalCount}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <label className="relative block w-full sm:w-[260px]">
              <span className="sr-only">Search categories</span>
              <Search
                size={14}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-[#999]"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search category name or ID..."
                className="h-10 w-full rounded-lg border border-[#D6DCE5] pr-4 pl-9 text-[13px] outline-none transition focus:border-[#F47C35]"
              />
            </label>

            {/* Parent Category Filter */}
            <div className="relative">
              <select
                value={parentFilter}
                onChange={(e) => {
                  setParentFilter(e.target.value);
                  setCurrentPage(0);
                }}
                className="h-10 appearance-none rounded-lg border border-[#D6DCE5] bg-white pr-8 pl-3 text-[13px] font-normal text-[#505050] outline-none cursor-pointer focus:border-[#F47C35]"
              >
                <option value="">Filter: All Categories</option>
                <option value="root">Root Categories Only</option>
                <optgroup label="Filter by Parent Category">
                  {allCategories
                    .filter((c) => c.parent_category_id == null)
                    .map((p) => {
                      const pId = p.category_id ?? p.id;
                      return (
                        <option key={String(pId)} value={String(pId)}>
                          Parent: {p.category_name} (#{pId})
                        </option>
                      );
                    })}
                </optgroup>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#9AA7BA]"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-lg border border-[#E5E5E5] shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead className="bg-[#E4E4E4] text-[12px] font-medium text-[#292929]">
                <tr className="h-[46px]">
                  <th className="w-[80px] border-r border-white px-4 font-medium text-center">Image</th>
                  <th className="w-[90px] border-r border-white px-4 font-medium">ID</th>
                  <th className="min-w-[220px] border-r border-white px-4 font-medium">Category Name</th>
                  <th className="min-w-[160px] border-r border-white px-4 font-medium">Parent Category</th>
                  <th className="min-w-[200px] border-r border-white px-4 font-medium">Description</th>
                  <th className="w-[130px] border-r border-white px-4 font-medium">Created Date</th>
                  <th className="w-[110px] px-4 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-[12px] text-[#505050]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 size={24} className="animate-spin text-[#F47C35]" />
                        <span>Loading category records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                        <FolderTree size={36} className="text-gray-300" />
                        <p className="font-medium text-gray-700">No categories found</p>
                        <p className="text-[12px] text-gray-400">
                          {searchQuery || parentFilter
                            ? 'No categories match the active filter criteria.'
                            : 'Get started by creating your first catalog category.'}
                        </p>
                        {!searchQuery && !parentFilter && (
                          <button
                            type="button"
                            onClick={handleOpenAddModal}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#F47C35] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#E96F29] cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>Add Category</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((c) => {
                    const catId = c.category_id ?? (typeof c.id === 'number' ? c.id : Number(c.id));
                    const isRoot = c.parent_category_id == null;

                    return (
                      <tr
                        key={String(catId ?? Math.random())}
                        className="h-[56px] border-b border-[#ECECEC] last:border-b-0 hover:bg-[#FAFAFA] transition-colors"
                      >
                        {/* Image Thumbnail */}
                        <td className="px-4 text-center">
                          <div className="mx-auto flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                            {c.category_image ? (
                              <img
                                src={c.category_image}
                                alt={c.category_name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  // Fallback to placeholder on broken link
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <FolderTree size={18} className="text-gray-400" />
                            )}
                          </div>
                        </td>

                        {/* ID */}
                        <td className="px-4 font-mono font-semibold text-slate-800">
                          #{catId}
                        </td>

                        {/* Category Name */}
                        <td className="px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <FolderTree
                              size={16}
                              className={isRoot ? 'text-[#F47C35] shrink-0' : 'text-blue-500 shrink-0'}
                            />
                            <span className="font-semibold">{c.category_name}</span>
                          </div>
                        </td>

                        {/* Parent Category */}
                        <td className="px-4">
                          {isRoot ? (
                            <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              Root Category
                            </span>
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-800">
                                {getParentName(c.parent_category_id)}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                Subcategory of #{c.parent_category_id}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Description */}
                        <td className="px-4 text-[#606060] max-w-[280px] truncate" title={c.description || ''}>
                          {c.description || <span className="text-gray-300 italic">No description</span>}
                        </td>

                        {/* Created Date */}
                        <td className="px-4 text-gray-500">
                          {c.created_at ? (
                            new Date(c.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 text-center">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(c)}
                              title="Edit category"
                              aria-label={`Edit ${c.category_name}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCategoryToDelete(c)}
                              title="Delete category"
                              aria-label={`Delete ${c.category_name}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer"
                            >
                              <Trash2 size={14} />
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

        {/* Pagination Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 text-[12px] text-gray-600">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(0);
              }}
              className="h-8 rounded-md border border-gray-300 bg-white px-2 text-[12px] font-medium outline-none cursor-pointer"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
            <span className="ml-2 text-gray-500">
              Showing {categories.length > 0 ? currentPage * pageSize + 1 : 0} to{' '}
              {Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(0)}
              disabled={currentPage === 0 || isLoading}
              title="First page"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0 || isLoading}
              title="Previous page"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="px-3 text-xs font-semibold text-gray-700">
              Page {currentPage + 1} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage + 1 >= totalPages && !hasMore}
              title="Next page"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages - 1)}
              disabled={currentPage + 1 >= totalPages || isLoading}
              title="Last page"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* Add Category Modal                                             */}
      {/* ============================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleAddSubmit}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-[16px] font-bold text-gray-900">Add New Category</h2>
                <p className="text-[12px] text-gray-500">
                  Create a new root or subcategory in the PostgreSQL database.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-[13px]">
              {/* Category Name */}
              <div>
                <label className="block font-medium text-gray-700">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={255}
                  placeholder="e.g. Health Monitors, Respiratory Care"
                  value={addForm.category_name}
                  onChange={(e) => setAddForm({ ...addForm, category_name: e.target.value })}
                  className={`mt-1 h-10 w-full rounded-lg border px-3 text-[13px] outline-none transition focus:border-[#F47C35] ${
                    addFormErrors.category_name ? 'border-rose-400 bg-rose-50/30' : 'border-[#D6DCE5]'
                  }`}
                />
                {addFormErrors.category_name && (
                  <p className="mt-1 text-[11px] text-rose-600">{addFormErrors.category_name}</p>
                )}
                <div className="mt-1 flex justify-between text-[11px] text-gray-400">
                  <span>Required. Maximum 255 characters.</span>
                  <span>{addForm.category_name.length}/255</span>
                </div>
              </div>

              {/* Parent Category */}
              <div>
                <label className="block font-medium text-gray-700">Parent Category</label>
                <div className="relative mt-1">
                  <select
                    value={addForm.parent_category_id}
                    onChange={(e) => setAddForm({ ...addForm, parent_category_id: e.target.value })}
                    className="h-10 w-full appearance-none rounded-lg border border-[#D6DCE5] bg-white pr-8 pl-3 text-[13px] outline-none focus:border-[#F47C35] cursor-pointer"
                  >
                    <option value="">None / Root Category (Top-level)</option>
                    {allCategories.map((cat) => {
                      const id = cat.category_id ?? cat.id;
                      return (
                        <option key={String(id)} value={String(id)}>
                          {cat.category_name} (ID: #{id})
                          {cat.parent_category_id ? ` [Child of #${cat.parent_category_id}]` : ' [Root]'}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#9AA7BA]"
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  Leave empty for a primary category, or select an existing parent category.
                </p>
              </div>

              {/* Category Image URL */}
              <div>
                <label className="block font-medium text-gray-700">Category Image URL</label>
                <input
                  type="url"
                  maxLength={2048}
                  placeholder="https://example.com/images/category.png"
                  value={addForm.category_image}
                  onChange={(e) => setAddForm({ ...addForm, category_image: e.target.value })}
                  className={`mt-1 h-10 w-full rounded-lg border px-3 text-[13px] outline-none transition focus:border-[#F47C35] ${
                    addFormErrors.category_image ? 'border-rose-400 bg-rose-50/30' : 'border-[#D6DCE5]'
                  }`}
                />
                {addFormErrors.category_image && (
                  <p className="mt-1 text-[11px] text-rose-600">{addFormErrors.category_image}</p>
                )}
                {addForm.category_image && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
                    <img
                      src={addForm.category_image}
                      alt="Preview"
                      className="h-10 w-10 rounded-md object-cover border border-gray-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="text-[11px] text-gray-500 overflow-hidden text-ellipsis">
                      <span>Image Preview</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block font-medium text-gray-700">Description</label>
                <textarea
                  rows={3}
                  placeholder="Optional description of items and healthcare topics grouped under this category..."
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#D6DCE5] p-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmitting}
                className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white hover:bg-[#E96F29] cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Create Category</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* Edit Category Modal                                            */}
      {/* ============================================================== */}
      {editingCategoryId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleEditSubmit}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-[16px] font-bold text-gray-900">Edit Category</h2>
                <span className="text-[12px] text-gray-500 font-mono">Category ID: #{editingCategoryId}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategoryId(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {isLoadingDetails ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-500">
                <Loader2 size={24} className="animate-spin text-[#F47C35]" />
                <span className="text-xs">Fetching current category details...</span>
              </div>
            ) : (
              <div className="mt-4 space-y-4 text-[13px]">
                {/* Category Name */}
                <div>
                  <label className="block font-medium text-gray-700">
                    Category Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={255}
                    value={editForm.category_name}
                    onChange={(e) => setEditForm({ ...editForm, category_name: e.target.value })}
                    className={`mt-1 h-10 w-full rounded-lg border px-3 text-[13px] outline-none transition focus:border-[#F47C35] ${
                      editFormErrors.category_name ? 'border-rose-400 bg-rose-50/30' : 'border-[#D6DCE5]'
                    }`}
                  />
                  {editFormErrors.category_name && (
                    <p className="mt-1 text-[11px] text-rose-600">{editFormErrors.category_name}</p>
                  )}
                  <div className="mt-1 flex justify-between text-[11px] text-gray-400">
                    <span>Required. Maximum 255 characters.</span>
                    <span>{editForm.category_name.length}/255</span>
                  </div>
                </div>

                {/* Parent Category */}
                <div>
                  <label className="block font-medium text-gray-700">Parent Category</label>
                  <div className="relative mt-1">
                    <select
                      value={editForm.parent_category_id}
                      onChange={(e) => setEditForm({ ...editForm, parent_category_id: e.target.value })}
                      className={`h-10 w-full appearance-none rounded-lg border bg-white pr-8 pl-3 text-[13px] outline-none focus:border-[#F47C35] cursor-pointer ${
                        editFormErrors.parent_category_id ? 'border-rose-400 bg-rose-50/30' : 'border-[#D6DCE5]'
                      }`}
                    >
                      <option value="">None / Root Category (Top-level)</option>
                      {allCategories.map((cat) => {
                        const id = cat.category_id ?? (typeof cat.id === 'number' ? cat.id : Number(cat.id));
                        const isDisabled = disabledParentIdsForEdit.has(id);

                        return (
                          <option
                            key={String(id)}
                            value={String(id)}
                            disabled={isDisabled}
                          >
                            {cat.category_name} (ID: #{id})
                            {id === editingCategoryId
                              ? ' (Self — Cannot assign)'
                              : isDisabled
                              ? ' (Descendant — Avoids cycle)'
                              : cat.parent_category_id
                              ? ` [Child of #${cat.parent_category_id}]`
                              : ' [Root]'}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#9AA7BA]"
                    />
                  </div>
                  {editFormErrors.parent_category_id && (
                    <p className="mt-1 text-[11px] text-rose-600">{editFormErrors.parent_category_id}</p>
                  )}
                  <p className="mt-1 text-[11px] text-gray-400">
                    Self and descendants are disabled to prevent circular hierarchy loops.
                  </p>
                </div>

                {/* Category Image URL */}
                <div>
                  <label className="block font-medium text-gray-700">Category Image URL</label>
                  <input
                    type="url"
                    maxLength={2048}
                    placeholder="https://example.com/images/category.png"
                    value={editForm.category_image}
                    onChange={(e) => setEditForm({ ...editForm, category_image: e.target.value })}
                    className={`mt-1 h-10 w-full rounded-lg border px-3 text-[13px] outline-none transition focus:border-[#F47C35] ${
                      editFormErrors.category_image ? 'border-rose-400 bg-rose-50/30' : 'border-[#D6DCE5]'
                    }`}
                  />
                  {editFormErrors.category_image && (
                    <p className="mt-1 text-[11px] text-rose-600">{editFormErrors.category_image}</p>
                  )}
                  {editForm.category_image && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
                      <img
                        src={editForm.category_image}
                        alt="Preview"
                        className="h-10 w-10 rounded-md object-cover border border-gray-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="text-[11px] text-gray-500 overflow-hidden text-ellipsis">
                        <span>Current Image Preview</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block font-medium text-gray-700">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Optional description of items and healthcare topics grouped under this category..."
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-[#D6DCE5] p-3 text-[13px] outline-none focus:border-[#F47C35]"
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setEditingCategoryId(null)}
                disabled={isSubmitting}
                className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isLoadingDetails}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white hover:bg-[#E96F29] cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* Delete Confirmation Modal                                      */}
      {/* ============================================================== */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertTriangle size={24} />
            </div>

            <h2 className="mt-4 text-[16px] font-bold text-gray-900">Delete Category?</h2>
            <p className="mt-2 text-[13px] text-gray-600 leading-relaxed">
              Are you sure you want to delete category{' '}
              <strong className="text-gray-900">{categoryToDelete.category_name}</strong> (ID: #{categoryToDelete.category_id ?? categoryToDelete.id})?
            </p>
            <p className="mt-2 text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
              Note: The database protects categories from deletion if active catalog products or subcategories depend on them.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                disabled={isSubmitting}
                className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-rose-600 px-4 text-[13px] font-semibold text-white hover:bg-rose-700 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
