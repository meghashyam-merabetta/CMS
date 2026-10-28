'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
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
  Package,
} from 'lucide-react';
import {
  getAdminCategories,
  getAllAdminCategories,
  getAdminCategoryById,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  resolveCategoryImageUrl,
  generateCategorySlug,
} from '@/services/api/adminCategoriesApi';
import { getAdminProducts, resolvePrimaryProductImage } from '@/services/api/adminProductsApi';
import { BackendCategory, BackendProduct } from '@/types/api';
import EntityImageInput from '@/components/ui/EntityImageInput';
import type { CatalogImageSelection } from '@/lib/catalogImages';
import { saveEntityWithImage, EntityImageSaveState } from '@/services/api/adminEntityImagesApi';

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
      const catId = Number(cat.category_id ?? cat.id);
      const parentId = cat.parent_category_id != null ? Number(cat.parent_category_id) : null;
      if (parentId === currentId && catId && !descendants.has(catId)) {
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
  const [parentFilter, setParentFilter] = useState<string>(''); // '' = all roots, or specific root categoryId
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Hierarchical branching state:
  // Sub-categories and items are only visible after selecting/expanding a root category.
  const [expandedRootIds, setExpandedRootIds] = useState<Set<number>>(new Set());
  const [subCategoriesMap, setSubCategoriesMap] = useState<Record<number, BackendCategory[]>>({});
  const [loadingSubRootIds, setLoadingSubRootIds] = useState<Set<number>>(new Set());

  // Category items (products) state when a category or sub-category is selected to view items
  const [activeItemsCategoryId, setActiveItemsCategoryId] = useState<number | null>(null);
  const [categoryItemsMap, setCategoryItemsMap] = useState<Record<number, BackendProduct[]>>({});
  const [categoryItemsTotalMap, setCategoryItemsTotalMap] = useState<Record<number, number>>({});
  const [loadingItemsCategoryId, setLoadingItemsCategoryId] = useState<number | null>(null);

  // Notification state
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<BackendCategory | null>(null);

  // Add category form state
  const [addForm, setAddForm] = useState({
    category_name: '',
    slug: '',
    slugTouched: false,
    parent_category_id: '',
    category_image: '',
    description: '',
    sort_order: 0,
    is_active: true,
  });
  const [addFormErrors, setAddFormErrors] = useState<Record<string, string>>({});
  const [addImage, setAddImage] = useState<CatalogImageSelection>({ file: null, remove: false });
  const [editImage, setEditImage] = useState<CatalogImageSelection>({ file: null, remove: false });
  const addImageSave = useRef<EntityImageSaveState<BackendCategory>>({});
  const editImageSave = useRef<EntityImageSaveState<BackendCategory>>({});

  // Edit category form state
  const [editForm, setEditForm] = useState({
    category_name: '',
    slug: '',
    parent_category_id: '',
    category_image: '',
    description: '',
    sort_order: 0,
    is_active: true,
  });
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  /**
   * Fetches sub-categories for a specific root category using backend query ?parent_category_id=<rootId>
   */
  const fetchSubCategoriesForRoot = useCallback(async (rootId: number) => {
    setLoadingSubRootIds((prev) => new Set(prev).add(rootId));
    try {
      const res = await getAdminCategories({ parent_category_id: rootId, limit: 100 });
      if (Array.isArray(res.data)) {
        setSubCategoriesMap((prev) => ({
          ...prev,
          [rootId]: res.data,
        }));
      }
    } catch (err) {
      console.warn(`Failed to load sub-categories for root #${rootId}:`, err);
    } finally {
      setLoadingSubRootIds((prev) => {
        const next = new Set(prev);
        next.delete(rootId);
        return next;
      });
    }
  }, []);

  /**
   * Fetches items (products) belonging to a category using backend query ?category_id=<catId>
   */
  const fetchItemsForCategory = useCallback(async (catId: number) => {
    setLoadingItemsCategoryId(catId);
    try {
      const res = await getAdminProducts({ category_id: catId, limit: 20, offset: 0 });
      setCategoryItemsMap((prev) => ({
        ...prev,
        [catId]: Array.isArray(res.data) ? res.data : [],
      }));
      setCategoryItemsTotalMap((prev) => ({
        ...prev,
        [catId]: res.pagination?.total ?? (Array.isArray(res.data) ? res.data.length : 0),
      }));
    } catch (err) {
      console.warn(`Failed to load items for category #${catId}:`, err);
      setCategoryItemsMap((prev) => ({ ...prev, [catId]: [] }));
    } finally {
      setLoadingItemsCategoryId((prev) => (prev === catId ? null : prev));
    }
  }, []);

  /**
   * Toggles a root category expansion: only after selecting a root category
   * do its sub-categories and items become visible.
   */
  const handleToggleRootCategory = useCallback(
    (rootId: number) => {
      setExpandedRootIds((prev) => {
        const next = new Set(prev);
        if (next.has(rootId)) {
          next.delete(rootId);
          setActiveItemsCategoryId((curr) => (curr === rootId ? null : curr));
        } else {
          next.add(rootId);
          void fetchSubCategoriesForRoot(rootId);
          setActiveItemsCategoryId(rootId);
          void fetchItemsForCategory(rootId);
        }
        return next;
      });
    },
    [fetchSubCategoriesForRoot, fetchItemsForCategory]
  );

  /**
   * Toggles viewing items for a specific category or sub-category.
   */
  const handleToggleCategoryItems = useCallback(
    (catId: number) => {
      setActiveItemsCategoryId((prev) => {
        if (prev === catId) return null;
        void fetchItemsForCategory(catId);
        return catId;
      });
    },
    [fetchItemsForCategory]
  );

  /**
   * Refreshes the full category list used for root heads, parent selectors, and lookup.
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
   * Loads root categories from GET /api/admin/categories?roots_only=true
   */
  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const [rootsRes, allList] = await Promise.all([
        getAdminCategories({ roots_only: true, limit: 100, offset: 0 }),
        getAllAdminCategories(),
      ]);
      const fetchedRoots = Array.isArray(rootsRes.data) ? rootsRes.data : [];

      setCategories(fetchedRoots);
      setAllCategories(allList.length > 0 ? allList : fetchedRoots);
      setTotalCount(allList.length || rootsRes.pagination?.total || fetchedRoots.length);
      setHasMore(rootsRes.pagination?.hasMore ?? false);
      setIsLive(true);

      // If a specific root category filter is selected, auto-expand that root category
      if (parentFilter && parentFilter !== 'root') {
        const numId = Number(parentFilter);
        if (!isNaN(numId) && numId > 0) {
          setExpandedRootIds(new Set([numId]));
          void fetchSubCategoriesForRoot(numId);
          setActiveItemsCategoryId(numId);
          void fetchItemsForCategory(numId);
        }
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to load categories from backend API.';
      setFetchError(msg);
      setCategories([]);
      setIsLive(false);
    } finally {
      setIsLoading(false);
    }
  }, [parentFilter, fetchSubCategoriesForRoot, fetchItemsForCategory]);

  // Initial load
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Group into Root Heads and Sub-categories map
  const rootCategories = useMemo(() => {
    const roots = allCategories.filter((c) => c.parent_category_id == null);
    return roots.length > 0 ? roots : categories;
  }, [allCategories, categories]);

  const getSubCategoriesForRoot = useCallback(
    (rootId: number): BackendCategory[] => {
      const fromApi = subCategoriesMap[rootId] || [];
      const fromAll = allCategories.filter(
        (c) => c.parent_category_id != null && Number(c.parent_category_id) === rootId
      );
      const directMerged = new Map<number, BackendCategory>();
      for (const item of fromAll) {
        const id = Number(item.category_id ?? item.id);
        if (id) directMerged.set(id, item);
      }
      for (const item of fromApi) {
        const id = Number(item.category_id ?? item.id);
        if (id) directMerged.set(id, item);
      }

      // Also include any nested child categories created under these sub-categories
      // (e.g. a category whose parent is #47 Gauge Pads Plain under #41 Healthcare Products)
      const result: BackendCategory[] = [];
      const visited = new Set<number>();
      const appendWithChildren = (cat: BackendCategory) => {
        const catId = Number(cat.category_id ?? cat.id);
        if (!catId || visited.has(catId)) return;
        visited.add(catId);
        result.push(cat);

        const nestedChildren = allCategories.filter(
          (c) => c.parent_category_id != null && Number(c.parent_category_id) === catId
        );
        for (const child of nestedChildren) {
          appendWithChildren(child);
        }
      };

      for (const sub of directMerged.values()) {
        appendWithChildren(sub);
      }
      return result;
    },
    [subCategoriesMap, allCategories]
  );

  // Filter root heads (and auto-include roots whose sub-category matches search)
  const filteredRootCategories = useMemo(() => {
    let baseRoots = rootCategories;
    if (parentFilter && parentFilter !== 'root') {
      baseRoots = baseRoots.filter(
        (r) => String(r.category_id ?? r.id) === String(parentFilter)
      );
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return baseRoots;

    return baseRoots.filter((r) => {
      const rId = Number(r.category_id ?? r.id);
      const idStr = String(rId || '');
      const name = (r.category_name || '').toLowerCase();
      const desc = (r.description || '').toLowerCase();
      const rootMatches = idStr.includes(q) || name.includes(q) || desc.includes(q);
      if (rootMatches) return true;
      const subs = getSubCategoriesForRoot(rId);
      return subs.some((s) => {
        const sId = String(s.category_id ?? s.id ?? '');
        const sName = (s.category_name || '').toLowerCase();
        const sDesc = (s.description || '').toLowerCase();
        return sId.includes(q) || sName.includes(q) || sDesc.includes(q);
      });
    });
  }, [rootCategories, parentFilter, searchQuery, getSubCategoriesForRoot]);

  // Paginate root categories
  const totalPages = Math.ceil(filteredRootCategories.length / pageSize) || 1;
  const paginatedRootCategories = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredRootCategories.slice(start, start + pageSize);
  }, [filteredRootCategories, currentPage, pageSize]);

  // Keep filteredCategories alias for empty check
  const filteredCategories = paginatedRootCategories;

  // Resolves parent category display name from cached records
  const getParentName = (parentId?: number | string | null): string => {
    if (parentId == null) return 'None (Root)';
    const parent = allCategories.find(
      (c) => String(c.category_id ?? c.id) === String(parentId)
    );
    return parent ? parent.category_name : `#${parentId}`;
  };

  /* ------------------------------------------------------------------ */
  /* Add Category Handlers                                              */
  /* ------------------------------------------------------------------ */
  const handleOpenAddModal = (defaultParentId = '') => {
    addImageSave.current = {};
    setAddImage({ file: null, remove: false });
    setAddForm({
      category_name: '',
      slug: '',
      slugTouched: false,
      parent_category_id: defaultParentId,
      category_image: '',
      description: '',
      sort_order: 0,
      is_active: true,
    });
    setAddFormErrors({});
    setIsAddModalOpen(true);
    refreshAllCategories();
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.category_name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setAddFormErrors({});
    try {
      const payload = {
        category_name: addForm.category_name.trim(),
        slug: generateCategorySlug(addForm.slug.trim() || addForm.category_name),
        parent_category_id: addForm.parent_category_id ? Number(addForm.parent_category_id) : null,
        description: addForm.description.trim() || null,
        sort_order: Number(addForm.sort_order) || 0,
        is_active: addForm.is_active,
      };

      const created = await saveEntityWithImage({
        resource: 'categories', state: addImageSave.current, metadata: payload, selection: addImage,
        saveMetadata: (id) => id ? updateAdminCategory(id, payload) : createAdminCategory(payload),
        getId: (category) => category.category_id ?? category.id,
        onImageSaved: (url) => { setAddForm((previous) => ({ ...previous, category_image: url || '' })); setAddImage({ file: null, remove: false }); },
      });
      showToast(`Category "${created.category_name}" created successfully.`);
      setIsAddModalOpen(false);
      await Promise.all([loadCategories(), refreshAllCategories()]);
      if (payload.parent_category_id) {
        setExpandedRootIds((prev) => new Set(prev).add(payload.parent_category_id!));
        await fetchSubCategoriesForRoot(payload.parent_category_id);
      }
    } catch (err: any) {
      setAddFormErrors({ submit: err.message || 'Failed to save category.' });
      showToast(err.message || 'Failed to create category on backend.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Edit Category Handlers                                             */
  /* ------------------------------------------------------------------ */
  const handleOpenEditModal = async (cat: BackendCategory) => {
    const catId = Number(cat.category_id ?? cat.id);
    if (!catId) return;

    editImageSave.current = { id: String(catId) };
    setEditImage({ file: null, remove: false });

    setEditingCategoryId(catId);
    setEditForm({
      category_name: cat.category_name || '',
      slug: cat.slug || generateCategorySlug(cat.category_name || ''),
      parent_category_id: cat.parent_category_id != null ? String(cat.parent_category_id) : '',
      category_image: resolveCategoryImageUrl(cat) || cat.category_image || '',
      description: cat.description || '',
      sort_order: cat.sort_order ?? 0,
      is_active: cat.is_active !== false,
    });
    setEditFormErrors({});
    setIsLoadingDetails(true);

    try {
      const fresh = await getAdminCategoryById(catId);
      if (fresh) {
        setEditForm({
          category_name: fresh.category_name || '',
          slug: fresh.slug || generateCategorySlug(fresh.category_name || ''),
          parent_category_id: fresh.parent_category_id != null ? String(fresh.parent_category_id) : '',
          category_image: resolveCategoryImageUrl(fresh) || fresh.category_image || '',
          description: fresh.description || '',
          sort_order: fresh.sort_order ?? 0,
          is_active: fresh.is_active !== false,
        });
      }
    } catch (err: any) {
      console.warn('Could not fetch fresh category detail by ID:', err.message);
    } finally {
      setIsLoadingDetails(false);
      refreshAllCategories();
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategoryId || !editForm.category_name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setEditFormErrors({});
    try {
      const payload = {
        category_name: editForm.category_name.trim(),
        slug: generateCategorySlug(editForm.slug.trim() || editForm.category_name),
        parent_category_id: editForm.parent_category_id ? Number(editForm.parent_category_id) : null,
        description: editForm.description.trim() || null,
        sort_order: Number(editForm.sort_order) || 0,
        is_active: editForm.is_active,
      };

      const updated = await saveEntityWithImage({
        resource: 'categories', state: editImageSave.current, metadata: payload, selection: editImage,
        saveMetadata: (id) => updateAdminCategory(id ?? editingCategoryId, payload),
        getId: (category) => category.category_id ?? category.id,
        onImageSaved: (url) => { setEditForm((previous) => ({ ...previous, category_image: url || '' })); setEditImage({ file: null, remove: false }); },
      });
      showToast(`Category "${updated.category_name}" updated successfully.`);
      setEditingCategoryId(null);
      await Promise.all([loadCategories(), refreshAllCategories()]);
      if (payload.parent_category_id) {
        setExpandedRootIds((prev) => new Set(prev).add(payload.parent_category_id!));
        await fetchSubCategoriesForRoot(payload.parent_category_id);
      }
    } catch (err: any) {
      setEditFormErrors({ submit: err.message || 'Failed to save category.' });
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
      const parentIdToRefresh =
        categoryToDelete.parent_category_id != null
          ? Number(categoryToDelete.parent_category_id)
          : null;
      await deleteAdminCategory(catId);
      showToast(`Category "${categoryToDelete.category_name}" deleted successfully.`);
      setCategoryToDelete(null);
      await Promise.all([loadCategories(), refreshAllCategories()]);
      if (parentIdToRefresh) {
        await fetchSubCategoriesForRoot(parentIdToRefresh);
      }
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
              onClick={() => handleOpenAddModal('')}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-[#E96F29] cursor-pointer"
            >
              <Plus size={16} />
              <span>Add Category</span>
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <div className="flex flex-wrap items-center gap-3 text-[12px] text-gray-500">
            <span>
              Root Heads:{' '}
              <span className="font-semibold text-gray-900">{filteredRootCategories.length}</span>
            </span>
            <span className="text-gray-300">|</span>
            <span>
              Total Categories:{' '}
              <span className="font-semibold text-gray-900">{totalCount || allCategories.length}</span>
            </span>
            <span className="hidden sm:inline text-[11px] text-[#F47C35] bg-orange-50 border border-orange-200 rounded-md px-2 py-0.5 font-medium">
              Select a root category to branch out its sub-categories &amp; items
            </span>
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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(0);
                }}
                placeholder="Search root or sub-category..."
                className="h-10 w-full rounded-lg border border-[#D6DCE5] pr-4 pl-9 text-[13px] outline-none transition focus:border-[#F47C35]"
              />
            </label>

            {/* Root Category Selector */}
            <div className="relative">
              <select
                value={parentFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setParentFilter(val);
                  setCurrentPage(0);
                  if (!val || val === 'root') {
                    setExpandedRootIds(new Set());
                    setActiveItemsCategoryId(null);
                  } else {
                    const numId = Number(val);
                    if (!isNaN(numId) && numId > 0) {
                      setExpandedRootIds(new Set([numId]));
                      void fetchSubCategoriesForRoot(numId);
                      setActiveItemsCategoryId(numId);
                      void fetchItemsForCategory(numId);
                    }
                  }
                }}
                className="h-10 appearance-none rounded-lg border border-[#D6DCE5] bg-white pr-8 pl-3 text-[13px] font-normal text-[#505050] outline-none cursor-pointer focus:border-[#F47C35]"
              >
                <option value="">Root Directory: All Heads</option>
                <optgroup label="Select Root Directory to View Sub-categories & Items">
                  {rootCategories.map((p) => {
                    const pId = p.category_id ?? p.id;
                    return (
                      <option key={String(pId)} value={String(pId)}>
                        {p.category_name} (#{pId})
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

            {expandedRootIds.size > 0 && (
              <button
                type="button"
                onClick={() => {
                  setExpandedRootIds(new Set());
                  setActiveItemsCategoryId(null);
                  if (parentFilter) setParentFilter('');
                }}
                className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-[12px] font-medium text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                Collapse All
              </button>
            )}
          </div>
        </div>

        {/* Hierarchical Table (Root Heads -> Branched Sub-categories -> Items) */}
        <div className="mt-4 overflow-hidden rounded-lg border border-[#E5E5E5] shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead className="bg-[#E4E4E4] text-[12px] font-medium text-[#292929]">
                <tr className="h-[46px]">
                  <th className="w-[80px] border-r border-white px-4 font-medium text-center">Image</th>
                  <th className="w-[90px] border-r border-white px-4 font-medium">ID</th>
                  <th className="min-w-[260px] border-r border-white px-4 font-medium">Category Hierarchy</th>
                  <th className="min-w-[160px] border-r border-white px-4 font-medium">Level / Branch</th>
                  <th className="min-w-[200px] border-r border-white px-4 font-medium">Description</th>
                  <th className="w-[125px] border-r border-white px-4 font-medium">Created Date</th>
                  <th className="w-[180px] px-4 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-[12px] text-[#505050]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 size={24} className="animate-spin text-[#F47C35]" />
                        <span>Loading category hierarchy...</span>
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
                            : 'Get started by creating your first root category.'}
                        </p>
                        {!searchQuery && !parentFilter && (
                          <button
                            type="button"
                            onClick={() => handleOpenAddModal('')}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#F47C35] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#E96F29] cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>Add Root Category</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((rootCat) => {
                    const rootId = Number(
                      rootCat.category_id ??
                        (typeof rootCat.id === 'number' ? rootCat.id : Number(rootCat.id))
                    );
                    const isSearching = Boolean(searchQuery.trim());
                    const isExpanded = expandedRootIds.has(rootId);
                    const isLoadingSubs = loadingSubRootIds.has(rootId);
                    const allSubs = getSubCategoriesForRoot(rootId);
                    const q = searchQuery.trim().toLowerCase();
                    const visibleSubs = isSearching
                      ? allSubs.filter((s) => {
                          const sId = String(s.category_id ?? s.id ?? '');
                          const sName = (s.category_name || '').toLowerCase();
                          const sDesc = (s.description || '').toLowerCase();
                          const rName = (rootCat.category_name || '').toLowerCase();
                          return (
                            rName.includes(q) ||
                            sId.includes(q) ||
                            sName.includes(q) ||
                            sDesc.includes(q)
                          );
                        })
                      : allSubs;

                    const isShowingRootItems = activeItemsCategoryId === rootId;
                    const rootItems = categoryItemsMap[rootId] || [];
                    const rootItemsTotal = categoryItemsTotalMap[rootId] ?? rootItems.length;

                    const renderItemsDrawerRow = (
                      targetCatId: number,
                      targetCatName: string,
                      items: BackendProduct[],
                      itemsTotal: number
                    ) => (
                      <tr
                        key={`items-drawer-${targetCatId}`}
                        className="bg-orange-50/40 border-b border-orange-200/70"
                      >
                        <td colSpan={7} className="px-6 py-3.5">
                          <div className="rounded-xl border border-orange-200/80 bg-white p-4 shadow-2xs">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                              <div className="flex items-center gap-2">
                                <Package size={15} className="text-[#F47C35]" />
                                <span className="text-[12px] font-bold text-slate-900">
                                  Items in &ldquo;{targetCatName}&rdquo;
                                </span>
                                <span className="rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[10px] font-semibold text-[#F47C35]">
                                  {itemsTotal} {itemsTotal === 1 ? 'item' : 'items'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <Link
                                  href={`/admin/products?category_id=${targetCatId}`}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F47C35] hover:underline"
                                >
                                  <span>Open in Products</span>
                                  <ExternalLink size={12} />
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => setActiveItemsCategoryId(null)}
                                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                                  title="Hide items"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>

                            {loadingItemsCategoryId === targetCatId ? (
                              <div className="flex items-center justify-center gap-2 py-6 text-gray-500 text-[12px]">
                                <Loader2 size={16} className="animate-spin text-[#F47C35]" />
                                <span>Loading items in {targetCatName}...</span>
                              </div>
                            ) : items.length === 0 ? (
                              <div className="py-5 text-center text-[12px] text-gray-400">
                                No items/products assigned to this category yet.
                              </div>
                            ) : (
                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {items.map((item) => {
                                  const pId = item.product_id ?? item.id;
                                  const pName = item.product_name || item.name || `Product #${pId}`;
                                  const pImg = resolvePrimaryProductImage(item);
                                  const pStatus = (item.product_status || 'active').toLowerCase();
                                  return (
                                    <div
                                      key={String(pId)}
                                      className="flex items-center justify-between gap-2.5 rounded-lg border border-gray-200 bg-gray-50/70 p-2 hover:border-[#F47C35]/50 hover:bg-white transition"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white">
                                          <Package size={15} className="text-gray-400" />
                                          {pImg && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                              src={pImg}
                                              alt={pName}
                                              className="absolute inset-0 h-full w-full object-cover bg-white"
                                              onError={(e) => {
                                                (e.currentTarget as HTMLElement).style.display =
                                                  'none';
                                              }}
                                            />
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="truncate text-[12px] font-semibold text-slate-900">
                                            {pName}
                                          </p>
                                          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                            <span className="font-mono">PRD-{pId}</span>
                                            <span>•</span>
                                            <span
                                              className={`capitalize font-semibold ${
                                                pStatus === 'active'
                                                  ? 'text-emerald-600'
                                                  : pStatus === 'draft'
                                                  ? 'text-amber-600'
                                                  : 'text-gray-500'
                                              }`}
                                            >
                                              {pStatus}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <Link
                                        href={`/admin/products/edit?id=${pId}`}
                                        className="shrink-0 rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:border-[#F47C35] hover:text-[#F47C35] transition"
                                      >
                                        Edit
                                      </Link>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );

                    return (
                      <React.Fragment key={`root-group-${rootId}`}>
                        {/* Root Category Head Row */}
                        <tr
                          onClick={() => handleToggleRootCategory(rootId)}
                          className={`h-[58px] border-b border-[#ECECEC] transition-colors cursor-pointer ${
                            isExpanded
                              ? 'bg-[#FFF8F3] hover:bg-[#FFF3EB]'
                              : 'hover:bg-[#FAFAFA]'
                          }`}
                        >
                          {/* Image Thumbnail */}
                          <td className="px-4 text-center">
                            <div className="relative mx-auto flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                              <FolderTree size={18} className="text-[#F47C35]" />
                              {resolveCategoryImageUrl(rootCat) && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={resolveCategoryImageUrl(rootCat)}
                                  alt={rootCat.category_name}
                                  className="absolute inset-0 h-full w-full object-cover bg-white"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              )}
                            </div>
                          </td>

                          {/* ID */}
                          <td className="px-4 font-mono font-semibold text-slate-800">
                            #{rootId}
                          </td>

                          {/* Category Hierarchy Name */}
                          <td className="px-4 font-medium text-slate-900">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleRootCategory(rootId);
                                }}
                                aria-label={
                                  isExpanded
                                    ? `Collapse ${rootCat.category_name}`
                                    : `Expand ${rootCat.category_name}`
                                }
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:border-[#F47C35] hover:text-[#F47C35] transition cursor-pointer"
                              >
                                {isExpanded ? (
                                  <ChevronDown size={14} className="text-[#F47C35]" />
                                ) : (
                                  <ChevronRight size={14} />
                                )}
                              </button>
                              <FolderTree size={16} className="text-[#F47C35] shrink-0" />
                              <span className="font-bold text-[13px] text-slate-900">
                                {rootCat.category_name}
                              </span>
                            </div>
                          </td>

                          {/* Level / Branch */}
                          <td className="px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                Root Head
                              </span>
                              <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                {allSubs.length} {allSubs.length === 1 ? 'sub-category' : 'sub-categories'}
                              </span>
                            </div>
                          </td>

                          {/* Description */}
                          <td
                            className="px-4 text-[#606060] max-w-[260px] truncate"
                            title={rootCat.description || ''}
                          >
                            {rootCat.description || (
                              <span className="text-gray-300 italic">No description</span>
                            )}
                          </td>

                          {/* Created Date */}
                          <td className="px-4 text-gray-500">
                            {rootCat.created_at
                              ? new Date(rootCat.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : '—'}
                          </td>

                          {/* Actions */}
                          <td
                            className="px-4 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenAddModal(String(rootId))}
                                title={`Add sub-category under ${rootCat.category_name}`}
                                className="inline-flex h-8 items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 text-[11px] font-semibold text-[#F47C35] hover:bg-[#F47C35] hover:text-white transition cursor-pointer"
                              >
                                <Plus size={12} />
                                <span>Sub</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => { setExpandedRootIds((prev) => new Set(prev).add(rootId)); handleToggleCategoryItems(rootId); }}
                                title={`View items in ${rootCat.category_name}`}
                                className={`inline-flex h-8 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold transition cursor-pointer ${
                                  isShowingRootItems
                                    ? 'border-[#F47C35] bg-[#F47C35] text-white'
                                    : 'border-gray-200 bg-white text-slate-700 hover:border-[#F47C35] hover:text-[#F47C35]'
                                }`}
                              >
                                <Package size={12} />
                                <span>Items</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(rootCat)}
                                title="Edit root category"
                                aria-label={`Edit ${rootCat.category_name}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setCategoryToDelete(rootCat)}
                                title="Delete root category"
                                aria-label={`Delete ${rootCat.category_name}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Root Category Items Drawer (visible when root category is selected) */}
                        {isExpanded &&
                          isShowingRootItems &&
                          renderItemsDrawerRow(
                            rootId,
                            rootCat.category_name,
                            rootItems,
                            rootItemsTotal
                          )}

                        {/* Branched Sub-categories (ONLY visible after root category is selected/expanded) */}
                        {isExpanded && (
                          <>
                            {isLoadingSubs && visibleSubs.length === 0 ? (
                              <tr className="bg-slate-50/70 border-b border-[#ECECEC]">
                                <td colSpan={7} className="py-3 pl-16 text-[12px] text-gray-500">
                                  <div className="flex items-center gap-2">
                                    <Loader2 size={14} className="animate-spin text-[#F47C35]" />
                                    <span>
                                      Loading sub-categories under {rootCat.category_name}...
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ) : visibleSubs.length === 0 ? (
                              <tr className="bg-slate-50/50 border-b border-[#ECECEC]">
                                <td colSpan={7} className="py-2.5 pl-16 pr-4">
                                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                                    <span>
                                      ↳ No sub-categories under{' '}
                                      <strong className="text-gray-600">
                                        {rootCat.category_name}
                                      </strong>{' '}
                                      yet.
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAddModal(String(rootId))}
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F47C35] hover:underline cursor-pointer"
                                    >
                                      <Plus size={12} />
                                      <span>Add Sub-category</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              visibleSubs.map((subCat, subIdx) => {
                                const subId = Number(
                                  subCat.category_id ??
                                    (typeof subCat.id === 'number'
                                      ? subCat.id
                                      : Number(subCat.id))
                                );
                                const isLastSub = subIdx === visibleSubs.length - 1;
                                const isShowingSubItems = activeItemsCategoryId === subId;
                                const subItems = categoryItemsMap[subId] || [];
                                const subItemsTotal =
                                  categoryItemsTotalMap[subId] ?? subItems.length;

                                return (
                                  <React.Fragment key={`sub-row-${subId}`}>
                                    <tr
                                      onClick={() => handleToggleCategoryItems(subId)}
                                      className={`h-[52px] border-b border-[#ECECEC] bg-slate-50/70 hover:bg-blue-50/40 transition-colors cursor-pointer ${
                                        isShowingSubItems ? 'bg-blue-50/60' : ''
                                      }`}
                                    >
                                      {/* Image Thumbnail */}
                                      <td className="px-4 text-center">
                                        <div className="relative mx-auto flex h-8 w-8 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white">
                                          <FolderTree size={14} className="text-blue-500" />
                                          {resolveCategoryImageUrl(subCat) && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                              src={resolveCategoryImageUrl(subCat)}
                                              alt={subCat.category_name}
                                              className="absolute inset-0 h-full w-full object-cover bg-white"
                                              onError={(e) => {
                                                (e.currentTarget as HTMLElement).style.display =
                                                  'none';
                                              }}
                                            />
                                          )}
                                        </div>
                                      </td>

                                      {/* ID */}
                                      <td className="px-4 font-mono text-[11px] font-medium text-slate-600">
                                        #{subId}
                                      </td>

                                      {/* Branched Sub-category Name */}
                                      <td className="px-4 font-medium text-slate-800">
                                        <div
                                          className={`flex items-center gap-2 ${
                                            Number(subCat.parent_category_id) !== rootId
                                              ? 'pl-11'
                                              : 'pl-6'
                                          }`}
                                        >
                                          <span
                                            aria-hidden="true"
                                            className="font-mono text-[14px] font-bold text-[#F47C35]"
                                          >
                                            {isLastSub ? '└─' : '├─'}
                                          </span>
                                          <FolderTree
                                            size={15}
                                            className="text-blue-500 shrink-0"
                                          />
                                          <span className="font-semibold text-[12px] text-slate-800">
                                            {subCat.category_name}
                                          </span>
                                        </div>
                                      </td>

                                      {/* Parent Branch Info */}
                                      <td className="px-4">
                                        <div className="flex flex-col">
                                          <span className="inline-flex w-fit items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                                            ↳ Sub-category of{' '}
                                            {Number(subCat.parent_category_id) !== rootId
                                              ? getParentName(subCat.parent_category_id)
                                              : rootCat.category_name}
                                          </span>
                                        </div>
                                      </td>

                                      {/* Description */}
                                      <td
                                        className="px-4 text-[#606060] max-w-[260px] truncate"
                                        title={subCat.description || ''}
                                      >
                                        {subCat.description || (
                                          <span className="text-gray-300 italic">
                                            No description
                                          </span>
                                        )}
                                      </td>

                                      {/* Created Date */}
                                      <td className="px-4 text-gray-500">
                                        {subCat.created_at
                                          ? new Date(subCat.created_at).toLocaleDateString(
                                              'en-US',
                                              {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                              }
                                            )
                                          : '—'}
                                      </td>

                                      {/* Actions */}
                                      <td
                                        className="px-4 text-center"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="inline-flex items-center justify-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => handleToggleCategoryItems(subId)}
                                            title={`View items in ${subCat.category_name}`}
                                            className={`inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-[11px] font-semibold transition cursor-pointer ${
                                              isShowingSubItems
                                                ? 'border-[#F47C35] bg-[#F47C35] text-white'
                                                : 'border-gray-200 bg-white text-slate-700 hover:border-[#F47C35] hover:text-[#F47C35]'
                                            }`}
                                          >
                                            <Package size={12} />
                                            <span>Items</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditModal(subCat)}
                                            title="Edit sub-category"
                                            aria-label={`Edit ${subCat.category_name}`}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"
                                          >
                                            <Edit2 size={14} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setCategoryToDelete(subCat)}
                                            title="Delete sub-category"
                                            aria-label={`Delete ${subCat.category_name}`}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>

                                    {/* Sub-category Items Drawer */}
                                    {isShowingSubItems &&
                                      renderItemsDrawerRow(
                                        subId,
                                        subCat.category_name,
                                        subItems,
                                        subItemsTotal
                                      )}
                                  </React.Fragment>
                                );
                              })
                            )}
                          </>
                        )}
                      </React.Fragment>
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
            <span>Root heads per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(0);
              }}
              className="h-8 rounded-md border border-gray-300 bg-white px-2 text-[12px] font-medium outline-none cursor-pointer"
            >
              <option value="10">10</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span className="ml-2 text-gray-500">
              Showing {filteredCategories.length > 0 ? currentPage * pageSize + 1 : 0} to{' '}
              {Math.min((currentPage + 1) * pageSize, filteredRootCategories.length)} of{' '}
              {filteredRootCategories.length} root categories
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
            className="max-h-[90dvh] overflow-y-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
          >
            <fieldset disabled={isSubmitting} className="contents">
            {addFormErrors.submit && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{addFormErrors.submit}</p>}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-[16px] font-bold text-gray-900">Add New Category</h2>
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
                  maxLength={150}
                  placeholder="e.g. Health Monitors, Respiratory Care"
                  value={addForm.category_name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAddForm({
                      ...addForm,
                      category_name: val,
                      slug: addForm.slugTouched ? addForm.slug : generateCategorySlug(val),
                    });
                  }}
                  className={`mt-1 h-10 w-full rounded-lg border px-3 text-[13px] outline-none transition focus:border-[#F47C35] ${
                    addFormErrors.category_name ? 'border-rose-400 bg-rose-50/30' : 'border-[#D6DCE5]'
                  }`}
                />
                {addFormErrors.category_name && (
                  <p className="mt-1 text-[11px] text-rose-600">{addFormErrors.category_name}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block font-medium text-gray-700">Status</label>
                <select
                  value={addForm.is_active ? 'true' : 'false'}
                  onChange={(e) =>
                    setAddForm({ ...addForm, is_active: e.target.value === 'true' })
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] bg-white px-3 text-[13px] outline-none focus:border-[#F47C35]"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
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
                    <option value="">None (Root Category)</option>
                    {rootCategories.map((cat) => {
                      const id = cat.category_id ?? cat.id;
                      return (
                        <option key={String(id)} value={String(id)}>
                          {cat.category_name}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#9AA7BA]"
                  />
                </div>
              </div>

              {/* Category Image & Sort Order */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2"><EntityImageInput label="Category Image" currentUrl={addForm.category_image} value={addImage} onChange={setAddImage} disabled={isSubmitting} /></div>
                <div>
                  <label className="block font-medium text-gray-700">Sort Order</label>
                  <input
                    type="number"
                    min="0"
                    value={addForm.sort_order}
                    onChange={(e) =>
                      setAddForm({ ...addForm, sort_order: Number(e.target.value) || 0 })
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                  />
                </div>
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
                  <span>{addImageSave.current.id ? 'Retry Save' : 'Create Category'}</span>
                )}
              </button>
            </div>
          </fieldset>
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
            className="max-h-[90dvh] overflow-y-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
          >
            <fieldset disabled={isSubmitting} className="contents">
            {editFormErrors.submit && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{editFormErrors.submit}</p>}
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
                    maxLength={150}
                    value={editForm.category_name}
                    onChange={(e) => setEditForm({ ...editForm, category_name: e.target.value })}
                    className={`mt-1 h-10 w-full rounded-lg border px-3 text-[13px] outline-none transition focus:border-[#F47C35] ${
                      editFormErrors.category_name ? 'border-rose-400 bg-rose-50/30' : 'border-[#D6DCE5]'
                    }`}
                  />
                  {editFormErrors.category_name && (
                    <p className="mt-1 text-[11px] text-rose-600">{editFormErrors.category_name}</p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block font-medium text-gray-700">Status</label>
                  <select
                    value={editForm.is_active ? 'true' : 'false'}
                    onChange={(e) =>
                      setEditForm({ ...editForm, is_active: e.target.value === 'true' })
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] bg-white px-3 text-[13px] outline-none focus:border-[#F47C35]"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
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
                      <option value="">None (Root Category)</option>
                      {rootCategories
                        .filter((cat) => !disabledParentIdsForEdit.has(Number(cat.category_id ?? cat.id)))
                        .map((cat) => {
                          const id = Number(cat.category_id ?? cat.id);
                          return (
                            <option key={String(id)} value={String(id)}>
                              {cat.category_name}
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
                </div>

                {/* Category Image & Sort Order */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2"><EntityImageInput label="Category Image" currentUrl={editForm.category_image} value={editImage} onChange={setEditImage} disabled={isSubmitting} /></div>
                  <div>
                    <label className="block font-medium text-gray-700">Sort Order</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.sort_order}
                      onChange={(e) =>
                        setEditForm({ ...editForm, sort_order: Number(e.target.value) || 0 })
                      }
                      className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                    />
                  </div>
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
          </fieldset>
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
              Are you sure you want to delete{' '}
              <strong className="text-gray-900">{categoryToDelete.category_name}</strong>?
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
