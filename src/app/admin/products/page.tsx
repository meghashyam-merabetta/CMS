'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Star,
} from 'lucide-react';
import { ProductRecord } from '@/types/dashboard';
import {
  getAdminProducts,
  getAdminProductById,
  updateAdminProduct,
  deleteAdminProduct,
  resolvePrimaryProductImage,
  generateProductSlug,
  getAdminProductImages,
  getAllAdminProductVariants,
  deleteAdminProductImage,
  setPrimaryProductImage,
  uploadAdminProductImages,
  replaceAdminProductImage,
  validateProductImages,
  BackendProductImageRecord,
} from '@/services/api/adminProductsApi';
import { getAdminCategories, getAllAdminCategories } from '@/services/api/adminCategoriesApi';
import { compareProductRecords, summarizeProductVariants } from '@/lib/productCatalog';
import { collectAllPages } from '@/lib/pagination';
import { getAllAdminBrands } from '@/services/api/adminBrandsApi';
import { BackendProduct, BackendCategory, BackendBrand, ProductStatus } from '@/types/api';

function mapBackendProductToRecord(
  bp: BackendProduct,
  idx: number,
  cats: BackendCategory[] = [],
  brands: BackendBrand[] = []
): ProductRecord {
  const prodId = bp.product_id ?? bp.id ?? idx + 1;
  const name = bp.product_name || bp.name || 'Product';
  const rawPrice =
    bp.effective_price ??
    bp.sale_price ??
    bp.offer_price ??
    bp.regular_price ??
    bp.mrp ??
    bp.price ??
    0;
  const price = Number(rawPrice) || 0;
  const regularPrice = Number(bp.regular_price ?? bp.mrp ?? price) || price;
  const stock = Number(bp.stock_quantity ?? bp.stock ?? 0) || 0;

  const prodCats = Array.isArray(bp.categories) ? bp.categories : [];
  const primaryCat =
    prodCats.find((c) => c.ProductCategory?.is_primary) || prodCats[0] || null;
  const primaryCatId = primaryCat
    ? String(primaryCat.category_id ?? primaryCat.id ?? '')
    : bp.primary_category_id != null
    ? String(bp.primary_category_id)
    : undefined;

  const matchedCatFromList =
    primaryCatId != null
      ? cats.find((c) => String(c.category_id ?? c.id) === primaryCatId)
      : null;

  const categoryName =
    prodCats.length > 0
      ? prodCats.map((c) => c.category_name || c.name).filter(Boolean).join(', ')
      : matchedCatFromList?.category_name || 'Uncategorized';

  const brandIdStr = bp.brand_id != null ? String(bp.brand_id) : '';
  const matchedBrand = brandIdStr
    ? brands.find((b) => String(b.brand_id ?? b.id) === brandIdStr)
    : null;
  const brandLabel =
    bp.brand?.brand_name ||
    matchedBrand?.brand_name ||
    (brandIdStr ? `Brand #${brandIdStr}` : 'Unbranded');

  const rawStatus = (bp.product_status || 'active').toLowerCase();
  const statusCode: ProductRecord['statusCode'] =
    rawStatus === 'active'
      ? 'PUBLISHED'
      : rawStatus === 'draft'
      ? 'DRAFT'
      : rawStatus === 'inactive'
      ? 'INACTIVE'
      : 'ARCHIVED';

  return {
    id: String(prodId),
    productCode: `PRD-${String(prodId).padStart(4, '0')}`,
    catalogCode: bp.product_code || undefined,
    variantSummary: summarizeProductVariants(bp.variants || []),
    name,
    brand: brandLabel,
    category: categoryName,
    categoryId: primaryCatId,
    price,
    originalPrice: regularPrice,
    stock,
    statusCode,
    image: resolvePrimaryProductImage(bp),
    createdAt: bp.created_at || new Date().toISOString(),
  };
}

export default function ProductManagementPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [categories, setCategories] = useState<BackendCategory[]>([]);
  const [brands, setBrands] = useState<BackendBrand[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRootCategory, setSelectedRootCategory] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const selectedCategory = selectedSubCategory || selectedRootCategory;
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<'product_id' | 'product_name' | 'product_code'>('product_id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Modals state
  const [editingProduct, setEditingProduct] = useState<{
    id: string;
    product_name: string;
    slug: string;
    brand_id: string;
    product_status: ProductStatus;
    short_description: string;
    description: string;
    category_ids: number[];
    primary_category_id: string;
    imageUrl?: string;
  } | null>(null);
  const [productToDelete, setProductToDelete] = useState<ProductRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Gallery Modal State
  const [galleryProduct, setGalleryProduct] = useState<ProductRecord | null>(null);
  const [galleryImages, setGalleryImages] = useState<BackendProductImageRecord[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);
  const [replacingImageId, setReplacingImageId] = useState<string | null>(null);
  const [imageToDelete, setImageToDelete] = useState<{ id: string; url: string } | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const galleryReplaceInputRef = useRef<HTMLInputElement>(null);

  const handleOpenGallery = async (p: ProductRecord) => {
    setGalleryProduct(p);
    setGalleryImages([]);
    setGalleryError(null);
    setSelectedPreviewImage(p.image || null);
    setIsLoadingGallery(true);
    try {
      const imgs = await getAdminProductImages(p.id);
      setGalleryImages(imgs);
      if (imgs.length > 0) {
        const primaryUrl = imgs.find((i) => i.is_primary)?.image_url || imgs[0].image_url;
        setSelectedPreviewImage(primaryUrl);
        setProducts((prev) =>
          prev.map((item) => (item.id === p.id ? { ...item, image: primaryUrl } : item))
        );
      }
    } catch (err: any) {
      setGalleryError(err?.message || 'Failed to load images from backend');
    } finally {
      setIsLoadingGallery(false);
    }
  };

  const handleDeleteGalleryImage = async (imageId: string) => {
    if (!galleryProduct) return;
    setDeletingImageId(imageId);
    setGalleryError(null);
    try {
      try {
        await deleteAdminProductImage(galleryProduct.id, imageId);
      } catch (apiErr: any) {
        console.warn('Backend image delete returned status:', apiErr?.message);
        // Verify the current database list after an error; do not assume a
        // particular storage/database operation committed.
      }

      // Re-fetch fresh images from backend database
      const fresh = await getAdminProductImages(galleryProduct.id);
      const stillExists = fresh.some((img) => String(img.id) === String(imageId));

      if (stillExists) {
        throw new Error('Image could not be deleted from the server.');
      }

      setGalleryImages(fresh);
      const nextPrimary = fresh.find((i) => i.is_primary)?.image_url || fresh[0]?.image_url || null;
      if (selectedPreviewImage && !fresh.some((img) => img.image_url === selectedPreviewImage)) {
        setSelectedPreviewImage(nextPrimary);
      }
      setProducts((prev) =>
        prev.map((item) =>
          item.id === galleryProduct.id ? { ...item, image: nextPrimary || undefined } : item
        )
      );
      showToast('Image deleted successfully');
    } catch (err: any) {
      setGalleryError(err?.message || 'Failed to delete image');
    } finally {
      setDeletingImageId(null);
    }
  };

  const handleSetPrimaryGalleryImage = async (imageId: string) => {
    if (!galleryProduct) return;
    setSettingPrimaryId(imageId);
    setGalleryError(null);
    try {
      await setPrimaryProductImage(galleryProduct.id, imageId);
      const fresh = await getAdminProductImages(galleryProduct.id);
      setGalleryImages(fresh);
      const primaryImg = fresh.find((i) => i.is_primary)?.image_url || fresh[0]?.image_url;
      if (primaryImg) {
        setSelectedPreviewImage(primaryImg);
        setProducts((prev) =>
          prev.map((item) => (item.id === galleryProduct.id ? { ...item, image: primaryImg } : item))
        );
      }
      showToast('Primary image set successfully');
    } catch (err: any) {
      setGalleryError(err?.message || 'Failed to set primary image');
    } finally {
      setSettingPrimaryId(null);
    }
  };

  const handleUploadGalleryImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length || !galleryProduct) return;

    setIsUploadingImage(true);
    setGalleryError(null);
    try {
      const validationError = validateProductImages(files, galleryImages.length);
      if (validationError) throw new Error(validationError);
      await uploadAdminProductImages(galleryProduct.id, files);
      const fresh = await getAdminProductImages(galleryProduct.id);
      setGalleryImages(fresh);
      if (fresh.length > 0) {
        const newest = fresh[fresh.length - 1].image_url;
        setSelectedPreviewImage(newest);
        setProducts((prev) =>
          prev.map((item) => (item.id === galleryProduct.id ? { ...item, image: fresh[0]?.image_url } : item))
        );
      }
      showToast('Image(s) uploaded successfully');
    } catch (err: any) {
      setGalleryError(err?.message || 'Failed to upload images');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleReplaceGalleryImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const targetImgId = replacingImageId;
    if (!file || !galleryProduct || !targetImgId) {
      setReplacingImageId(null);
      return;
    }

    setGalleryError(null);
    try {
      await replaceAdminProductImage(galleryProduct.id, targetImgId, file);
      const fresh = await getAdminProductImages(galleryProduct.id);
      setGalleryImages(fresh);
      const replaced = fresh.find((i) => String(i.id) === String(targetImgId));
      const primaryImg = fresh.find((i) => i.is_primary)?.image_url || fresh[0]?.image_url;
      if (replaced?.image_url) {
        setSelectedPreviewImage(replaced.image_url);
      }
      if (primaryImg) {
        setProducts((prev) =>
          prev.map((item) => (item.id === galleryProduct.id ? { ...item, image: primaryImg } : item))
        );
      }
      showToast('Image replaced successfully');
    } catch (err: any) {
      setGalleryError(err?.message || 'Failed to replace image');
    } finally {
      setReplacingImageId(null);
    }
  };

  const [subCategoriesByRoot, setSubCategoriesByRoot] = useState<Record<string, BackendCategory[]>>({});

  // Load categories for dropdown and mapping + read optional ?category_id= from URL
  React.useEffect(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlCatId = params?.get('category_id') || '';

    async function loadCatsAndBrands() {
      try {
        const [res, brandsList] = await Promise.all([
          getAllAdminCategories(),
          getAllAdminBrands().catch(() => []),
        ]);
        if (Array.isArray(brandsList)) {
          setBrands(brandsList);
        }
        const catList = res;
        if (Array.isArray(catList)) {
          setCategories(catList);
          if (urlCatId) {
            const matched = catList.find((c) => String(c.category_id ?? c.id) === urlCatId);
            if (matched && matched.parent_category_id != null) {
              setSelectedRootCategory(String(matched.parent_category_id));
              setSelectedSubCategory(urlCatId);
            } else {
              setSelectedRootCategory(urlCatId);
              setSelectedSubCategory('');
            }
          }
        }
      } catch (e) {
        console.warn('Categories API note:', e);
      }
    }
    loadCatsAndBrands();
  }, []);

  // Fetch sub-categories via backend parent_category_id query whenever a Root Category is selected
  React.useEffect(() => {
    if (!selectedRootCategory) return;
    const rootNum = Number(selectedRootCategory);
    if (isNaN(rootNum) || rootNum <= 0) return;

    getAdminCategories({ parent_category_id: rootNum, limit: 100 })
      .then((res) => {
        const children = Array.isArray(res?.data) ? res.data : [];
        setSubCategoriesByRoot((prev) => ({
          ...prev,
          [selectedRootCategory]: children,
        }));
      })
      .catch(() => {});
  }, [selectedRootCategory]);

  const rootCategories = useMemo(
    () => categories.filter((c) => c.parent_category_id == null),
    [categories]
  );

  const activeSubCategories = useMemo(() => {
    if (!selectedRootCategory) return [];
    const fromApi = subCategoriesByRoot[selectedRootCategory] || [];
    const fromAll = categories.filter(
      (c) => String(c.parent_category_id ?? '') === selectedRootCategory
    );
    const seen = new Set<string>();
    const merged: BackendCategory[] = [];
    for (const c of [...fromApi, ...fromAll]) {
      const id = String(c.category_id ?? c.id ?? '');
      if (id && !seen.has(id)) {
        seen.add(id);
        merged.push(c);
      }
    }
    return merged;
  }, [selectedRootCategory, subCategoriesByRoot, categories]);

  // Keep latest categories and brands in refs so loading them does NOT trigger a products re-fetch.
  const categoriesRef = useRef<BackendCategory[]>([]);
  const brandsRef = useRef<BackendBrand[]>([]);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);
  useEffect(() => {
    brandsRef.current = brands;
  }, [brands]);

  // Debounced search so typing doesn't fire a request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Guards against out-of-order responses.
  const requestIdRef = useRef(0);

  // Server-side pagination + full ID/Name/Brand/Category search support
  async function enrichVisibleProducts(records: ProductRecord[], backendItems: BackendProduct[]) {
    return Promise.all(records.map(async (record) => {
      const backend = backendItems.find((item) => String(item.product_id ?? item.id) === record.id);
      const result = { ...record };
      const warnings: string[] = [];
      await Promise.all([
        !result.image ? getAdminProductImages(record.id).then((images) => {
          result.image = images.find((image) => image.is_primary)?.image_url || images[0]?.image_url;
        }).catch(() => warnings.push('Images could not be loaded')) : Promise.resolve(),
        backend?.variants === undefined && backend?.product_type !== 'simple'
          ? getAllAdminProductVariants(record.id).then((variants) => {
            result.variantSummary = summarizeProductVariants(variants);
          }).catch(() => warnings.push('Variants could not be loaded')) : Promise.resolve(),
      ]);
      result.catalogWarning = warnings.join('. ');
      return result;
    }));
  }

  const loadProducts = React.useCallback(
    async (_forceRecount = false) => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setFetchError(null);
      try {
        const catNum = selectedCategory ? Number(selectedCategory) : NaN;
        const brandNum = selectedBrand ? Number(selectedBrand) : NaN;
        const filterParams = {
          category_id: !isNaN(catNum) && catNum > 0 ? catNum : undefined,
          brand_id: !isNaN(brandNum) && brandNum > 0 ? brandNum : undefined,
          product_status:
            selectedStatus === 'PUBLISHED'
              ? ('active' as const)
              : selectedStatus === 'DRAFT'
              ? ('draft' as const)
              : selectedStatus === 'INACTIVE'
              ? ('inactive' as const)
              : selectedStatus === 'ARCHIVED'
              ? ('archived' as const)
              : undefined,
        };

        // 1. Standard paginated fetch when search bar is empty
        if (!debouncedSearch) {
          const res = await getAdminProducts({
            ...filterParams,
            limit: pageSize,
            offset: currentPage * pageSize,
            sort_by: sortBy,
            sort_order: sortOrder,
          });
          if (requestId !== requestIdRef.current) return;

          const items = Array.isArray(res.data) ? res.data : [];
          const total = res.pagination?.total ?? items.length;
          const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);
          if (currentPage > lastPage) {
            setCurrentPage(lastPage);
            return;
          }

          const initialMapped = items
            .map((bp, idx) =>
              mapBackendProductToRecord(bp, idx, categoriesRef.current, brandsRef.current)
            )
            .sort((a, b) => compareProductRecords(a, b, sortBy, sortOrder));
          const enriched = await enrichVisibleProducts(initialMapped, items);
          if (requestId !== requestIdRef.current) return;
          setProducts(enriched);
          setTotalCount(total);
          setIsLive(true);
          return;
        }

        // 2. When searching: backend ?search= only matches text columns (name/code/sku),
        // NOT numeric product_id (e.g. "685683" or "PRD-685683") or brand/category names.
        // We fetch the catalog batches + direct ID lookup (if numeric) so searching by ID, Name, or Brand always works.
        const rawQ = debouncedSearch.trim();
        const qLower = rawQ.toLowerCase();
        const cleanIdStr = rawQ.replace(/^(?:prd[-_\s]*|#)/i, '').trim();
        const cleanIdLower = cleanIdStr.toLowerCase();
        const isNumericId = /^\d+$/.test(cleanIdStr);

        const [catalog, directById] = await Promise.all([
          collectAllPages((offset, limit) => getAdminProducts({
            ...filterParams,
            limit,
            offset,
            sort_by: sortBy,
            sort_order: sortOrder,
          }), (product) => product.product_id ?? product.id!),
          isNumericId ? getAdminProductById(cleanIdStr).catch(() => null) : Promise.resolve(null),
        ]);
        if (requestId !== requestIdRef.current) return;

        const allBackendItems = [...catalog];

        if (directById && (directById.product_id ?? directById.id) != null) {
          const directIdStr = String(directById.product_id ?? directById.id);
          if (!allBackendItems.some((x) => String(x.product_id ?? x.id) === directIdStr)) {
            allBackendItems.unshift(directById);
          }
        }

        const matchedMapped = allBackendItems
          .map((bp, idx) => ({
            bp,
            record: mapBackendProductToRecord(bp, idx, categoriesRef.current, brandsRef.current),
          }))
          .filter(({ bp, record }) => {
            const idMatch =
              record.id.toLowerCase().includes(qLower) ||
              (cleanIdLower.length > 0 && record.id.toLowerCase().includes(cleanIdLower));
            const prdCodeDisplayMatch = record.productCode.toLowerCase().includes(qLower);
            const rawCodeMatch = (bp.product_code || '').toLowerCase().includes(qLower);
            const skuMatch = (bp.sku || '').toLowerCase().includes(qLower);
            const nameMatch = record.name.toLowerCase().includes(qLower);
            const brandMatch = record.brand.toLowerCase().includes(qLower);
            const catMatch = record.category.toLowerCase().includes(qLower);
            return (
              idMatch ||
              prdCodeDisplayMatch ||
              rawCodeMatch ||
              skuMatch ||
              nameMatch ||
              brandMatch ||
              catMatch
            );
          })
          .map(({ record }) => record)
          .sort((a, b) => compareProductRecords(a, b, sortBy, sortOrder));

        const startIdx = currentPage * pageSize;
        const enriched = await enrichVisibleProducts(matchedMapped.slice(startIdx, startIdx + pageSize), allBackendItems);
        if (requestId !== requestIdRef.current) return;
        setProducts(enriched);
        setTotalCount(matchedMapped.length);
        setIsLive(true);
      } catch (err: any) {
        if (requestId !== requestIdRef.current) return;
        console.warn('Backend products error:', err.message);
        setFetchError(err.message || 'Unable to connect to live backend');
        setIsLive(false);
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    },
    [pageSize, currentPage, debouncedSearch, selectedCategory, selectedBrand, selectedStatus, sortBy, sortOrder]
  );

  React.useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleEditClick = async (product: ProductRecord) => {
    const initialCatId = product.categoryId ? Number(product.categoryId) : null;
    setEditingProduct({
      id: product.id,
      product_name: product.name,
      slug: generateProductSlug(product.productCode || product.name),
      brand_id: '',
      product_status:
        product.statusCode === 'PUBLISHED'
          ? 'active'
          : product.statusCode === 'DRAFT'
          ? 'draft'
          : product.statusCode === 'INACTIVE'
          ? 'inactive'
          : 'archived',
      short_description: '',
      description: '',
      category_ids: initialCatId && !isNaN(initialCatId) ? [initialCatId] : [],
      primary_category_id: product.categoryId || '',
      imageUrl: product.image,
    });
    setIsLoadingDetails(true);
    try {
      const details = await getAdminProductById(product.id);
      if (details) {
        const prodCats = Array.isArray(details.categories) ? details.categories : [];
        const catIds = prodCats
          .map((c) => Number(c.category_id ?? c.id))
          .filter((n) => !isNaN(n) && n > 0);
        const primaryCat =
          prodCats.find((c) => c.ProductCategory?.is_primary) || prodCats[0] || null;
        const primaryIdStr = primaryCat
          ? String(primaryCat.category_id ?? primaryCat.id ?? '')
          : product.categoryId || '';

        const imgUrl = resolvePrimaryProductImage(details) || product.image;

        setEditingProduct({
          id: String(details.product_id ?? details.id ?? product.id),
          product_name: details.product_name || details.name || product.name,
          slug:
            details.slug ||
            generateProductSlug(details.product_name || details.name || product.name),
          brand_id: details.brand_id != null ? String(details.brand_id) : '',
          product_status: details.product_status || 'active',
          short_description: details.short_description || '',
          description: details.description || '',
          category_ids: catIds,
          primary_category_id: primaryIdStr,
          imageUrl: imgUrl,
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
      const primaryNum = editingProduct.primary_category_id
        ? Number(editingProduct.primary_category_id)
        : null;
      const mergedCatIds = Array.from(
        new Set([
          ...editingProduct.category_ids,
          ...(primaryNum && !isNaN(primaryNum) && primaryNum > 0 ? [primaryNum] : []),
        ])
      );

      await updateAdminProduct(editingProduct.id, {
        product_name: editingProduct.product_name.trim(),
        slug: generateProductSlug(editingProduct.slug.trim() || editingProduct.product_name),
        brand_id: editingProduct.brand_id ? Number(editingProduct.brand_id) : null,
        product_status: editingProduct.product_status,
        short_description: editingProduct.short_description.trim() || null,
        description: editingProduct.description.trim() || null,
        category_ids: mergedCatIds,
        primary_category_id:
          primaryNum && !isNaN(primaryNum) && primaryNum > 0 ? primaryNum : null,
      });
      showToast(`Product "${editingProduct.product_name}" updated successfully.`);
      setEditingProduct(null);
      await loadProducts(true);
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
      if (products.length === 1 && currentPage > 0) {
        setCurrentPage((prev) => Math.max(0, prev - 1));
      } else {
        await loadProducts(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete product on server.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filters are applied server-side via GET /api/admin/products query params.
  const filteredProducts = products;

  // Pagination is server-side: `products` already holds just the current page.
  const totalPages = Math.max(Math.ceil((totalCount || products.length) / pageSize), 1);
  const safeCurrentPage = Math.min(currentPage, totalPages - 1);
  const paginatedProducts = filteredProducts;

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
            onClick={() => loadProducts(true)}
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
            onClick={() => loadProducts(true)}
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
        <label className="text-xs text-gray-600">Sort by
          <select aria-label="Sort products by" value={sortBy} onChange={(event) => { setSortBy(event.target.value as typeof sortBy); setCurrentPage(0); }} className="ml-2 h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm">
            <option value="product_id">Product ID</option><option value="product_name">Product Name</option><option value="product_code">Product Code</option>
          </select>
        </label>
        <select aria-label="Sort direction" value={sortOrder} onChange={(event) => { setSortOrder(event.target.value as typeof sortOrder); setCurrentPage(0); }} className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm">
          <option value="asc">Ascending</option><option value="desc">Descending</option>
        </select>
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

        {/* Root Category Filter */}
        <div className="relative">
          <select
            value={selectedRootCategory}
            onChange={(e) => {
              setSelectedRootCategory(e.target.value);
              setSelectedSubCategory('');
              setCurrentPage(0);
            }}
            className="h-11 appearance-none rounded-lg border border-[#D6DCE5] bg-white pr-8 pl-3 text-[13px] font-normal text-[#505050] outline-none cursor-pointer focus:border-[#F47C35]"
          >
            <option value="">Root Category: All</option>
            {rootCategories.map((c) => (
              <option key={c.category_id ?? c.id} value={String(c.category_id ?? c.id)}>
                {c.category_name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#9AA7BA]"
          />
        </div>

        {/* Sub-category Filter — only visible after a Root Category is selected */}
        {selectedRootCategory && (
          <div className="relative">
            <select
              value={selectedSubCategory}
              onChange={(e) => {
                setSelectedSubCategory(e.target.value);
                setCurrentPage(0);
              }}
              className="h-11 appearance-none rounded-lg border border-[#F47C35]/50 bg-[#FFF7F2] pr-8 pl-3 text-[13px] font-medium text-[#111] outline-none cursor-pointer focus:border-[#F47C35]"
            >
              <option value="">Sub-category: All under Root</option>
              {activeSubCategories.map((sub) => (
                <option key={sub.category_id ?? sub.id} value={String(sub.category_id ?? sub.id)}>
                  ↳ {sub.category_name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#F47C35]"
            />
          </div>
        )}

        {/* Company / Brand Filter */}
        <div className="relative">
          <select
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              setCurrentPage(0);
            }}
            className="h-11 appearance-none rounded-lg border border-[#D6DCE5] bg-white pr-8 pl-3 text-[13px] font-normal text-[#505050] outline-none cursor-pointer focus:border-[#F47C35]"
          >
            <option value="">Brand: All Brands</option>
            {brands.map((b) => {
              const bId = String(b.brand_id ?? b.id);
              return (
                <option key={bId} value={bId}>
                  {b.brand_name}
                </option>
              );
            })}
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
            <option value="INACTIVE">Inactive</option>
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
                  <td colSpan={9} className="px-4 py-12 text-center text-[13px] text-[#777]">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  return (
                    <tr
                      key={p.id}
                      className="h-[50px] border-b border-[#ECECEC] last:border-b-0 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="px-3 font-mono font-medium text-slate-800">
                        {p.productCode}
                      </td>
                      <td className="px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenGallery(p)}
                          title="Click to view & manage product images"
                          className="group relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-100 text-slate-500 mx-auto hover:border-[#F47C35] hover:bg-orange-50 hover:text-[#F47C35] transition-all cursor-pointer shadow-2xs"
                        >
                          <Package size={18} className="group-hover:scale-110 transition-transform" />
                          {p.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.image}
                              alt={p.name}
                              loading="lazy"
                              className="absolute inset-0 h-full w-full object-cover bg-white"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          )}
                        </button>
                      </td>
                      <td className="px-3 font-medium text-slate-900">
                        {p.name}
                        {p.catalogCode && <div className="mt-1 text-[11px] font-normal text-gray-500">Code: {p.catalogCode}</div>}
                        {p.catalogWarning && <div role="status" className="mt-1 text-[11px] font-normal text-amber-700">{p.catalogWarning}. Refresh to retry.</div>}
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
                              : p.statusCode === 'INACTIVE'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
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
            {`${totalCount || filteredProducts.length} total`}
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
                    setEditingProduct({
                      ...editingProduct,
                      product_name: e.target.value,
                    })
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Product Status</label>
                <select
                  value={editingProduct.product_status}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      product_status: e.target.value as ProductStatus,
                    })
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                >
                  <option value="active">Active (Published)</option>
                  <option value="draft">Draft</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700">Primary Category</label>
                  <select
                    value={editingProduct.primary_category_id}
                    onChange={(e) => {
                      const val = e.target.value;
                      const numId = val ? Number(val) : null;
                      setEditingProduct({
                        ...editingProduct,
                        primary_category_id: val,
                        category_ids:
                          numId && !isNaN(numId)
                            ? Array.from(new Set([numId, ...editingProduct.category_ids]))
                            : editingProduct.category_ids,
                      });
                    }}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                  >
                    <option value="">None / Unassigned</option>
                    {rootCategories.map((root) => {
                      const rootId = String(root.category_id ?? root.id);
                      const children = categories.filter(
                        (c) => String(c.parent_category_id ?? '') === rootId
                      );
                      return (
                        <React.Fragment key={rootId}>
                          <option value={rootId}>{root.category_name}</option>
                          {children.map((sub) => {
                            const subId = String(sub.category_id ?? sub.id);
                            return (
                              <option key={subId} value={subId}>
                                {'\u00A0\u00A0'}↳ {sub.category_name}
                              </option>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-gray-700">Brand</label>
                  <select
                    value={editingProduct.brand_id}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, brand_id: e.target.value })
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                  >
                    <option value="">None / Unbranded</option>
                    {brands.map((b) => {
                      const bId = String(b.brand_id ?? b.id);
                      return (
                        <option key={bId} value={bId}>
                          {b.brand_name} (#{bId})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700">Short Description</label>
                <input
                  type="text"
                  maxLength={500}
                  value={editingProduct.short_description}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      short_description: e.target.value,
                    })
                  }
                  placeholder="Brief summary of the product"
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
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
                    router.push(`/admin/products/edit?id=${id}`);
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

      {/* Image Delete Confirmation Modal */}
      {imageToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertTriangle size={24} />
            </div>

            <h3 className="mt-4 text-[16px] font-bold text-gray-900">Delete Image?</h3>
            <p className="mt-2 text-[13px] text-gray-600">
              Are you sure you want to delete this image? It will be removed from this product.
            </p>

            <div className="mt-4 flex items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 h-24 w-24 mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageToDelete.url} alt="Image preview" className="h-full w-full object-cover" />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setImageToDelete(null)}
                disabled={Boolean(deletingImageId)}
                className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetId = imageToDelete.id;
                  setImageToDelete(null);
                  await handleDeleteGalleryImage(targetId);
                }}
                disabled={Boolean(deletingImageId)}
                className="inline-flex items-center gap-1.5 h-10 rounded-lg bg-rose-600 px-4 text-[13px] font-semibold text-white hover:bg-rose-700 cursor-pointer disabled:opacity-50"
              >
                {deletingImageId && <Loader2 size={14} className="animate-spin" />}
                <span>{deletingImageId ? 'Deleting...' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Image Gallery Modal */}
      {galleryProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl animate-in fade-in flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[17px] font-bold text-gray-900">{galleryProduct.name}</h3>
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                    {galleryProduct.productCode}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-gray-500">Manage S3 gallery images for this product</p>
              </div>
              <button
                type="button"
                onClick={() => setGalleryProduct(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {galleryError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-700 flex items-center justify-between">
                  <span>{galleryError}</span>
                  <button type="button" onClick={() => setGalleryError(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                    <X size={16} />
                  </button>
                </div>
              )}

              {isLoadingGallery ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Loader2 size={32} className="animate-spin text-[#F47C35] mb-3" />
                  <p className="text-[14px]">Loading images from S3...</p>
                </div>
              ) : galleryImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-gray-200 bg-slate-50/50 p-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-[#F47C35] mb-3">
                    <Package size={28} />
                  </div>
                  <h4 className="text-[15px] font-semibold text-gray-800">No images uploaded yet</h4>
                  <p className="mt-1 text-[13px] text-gray-500 max-w-sm">
                    Upload product photos to store them in AWS S3 and display them on product listings.
                  </p>
                  <button
                    type="button"
                    disabled={isUploadingImage}
                    onClick={() => galleryFileInputRef.current?.click()}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#F47C35] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#E96F29] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingImage ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    <span>{isUploadingImage ? 'Uploading...' : 'Upload Images'}</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Large Preview */}
                  {selectedPreviewImage && (
                    <div className="relative flex items-center justify-center rounded-xl border border-gray-200 bg-slate-50 p-3 max-h-[300px] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedPreviewImage}
                        alt="Preview"
                        className="max-h-[280px] w-auto max-w-full object-contain rounded-lg shadow-xs"
                      />
                    </div>
                  )}

                  {/* Gallery Thumbnails Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-medium text-gray-700">
                        {galleryImages.length} {galleryImages.length === 1 ? 'Image' : 'Images'} Available
                      </span>
                      <button
                        type="button"
                        disabled={isUploadingImage}
                        onClick={() => galleryFileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#F47C35] px-3 py-1.5 text-[12px] font-semibold text-[#F47C35] hover:bg-orange-50 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isUploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        <span>{isUploadingImage ? 'Uploading...' : 'Add More'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {galleryImages.map((img) => {
                        const isSelected = selectedPreviewImage === img.image_url;
                        const isDeleting = deletingImageId === String(img.id);
                        return (
                          <div
                            key={img.id}
                            className={`group relative aspect-square rounded-lg border overflow-hidden transition-all bg-slate-50 cursor-pointer ${
                              isSelected
                                ? 'border-[#F47C35] ring-2 ring-[#F47C35]/30'
                                : 'border-gray-200 hover:border-gray-400'
                            }`}
                            onClick={() => setSelectedPreviewImage(img.image_url)}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.image_url}
                              alt="Thumbnail"
                              className="h-full w-full object-cover"
                            />

                            {/* Primary Badge */}
                            {img.is_primary ? (
                              <span className="absolute bottom-1 left-1 rounded bg-[#F47C35] px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs flex items-center gap-0.5">
                                <Star size={9} className="fill-white" /> Primary
                              </span>
                            ) : (
                              <button
                                type="button"
                                title="Set as primary image"
                                disabled={settingPrimaryId === String(img.id)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleSetPrimaryGalleryImage(String(img.id));
                                }}
                                className="absolute top-1 left-1 flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-gray-500 hover:bg-[#F47C35] hover:text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {settingPrimaryId === String(img.id) ? (
                                  <Loader2 size={12} className="animate-spin text-[#F47C35]" />
                                ) : (
                                  <Star size={12} />
                                )}
                              </button>
                            )}

                            {/* Replace & Delete Buttons */}
                            <div className="absolute top-1 right-1 flex items-center gap-1">
                              <button
                                type="button"
                                title="Replace image"
                                disabled={replacingImageId === String(img.id)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReplacingImageId(String(img.id));
                                  galleryReplaceInputRef.current?.click();
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-gray-600 hover:bg-[#0D2B53] hover:text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {replacingImageId === String(img.id) ? (
                                  <Loader2 size={12} className="animate-spin text-[#F47C35]" />
                                ) : (
                                  <RefreshCw size={11} />
                                )}
                              </button>
                              <button
                                type="button"
                                title="Delete image"
                                disabled={isDeleting}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setImageToDelete({ id: String(img.id), url: img.image_url });
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-gray-500 hover:bg-rose-600 hover:text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {isDeleting ? (
                                  <Loader2 size={12} className="animate-spin text-rose-600" />
                                ) : (
                                  <Trash2 size={12} />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Hidden file input for uploading */}
              <input
                ref={galleryFileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleUploadGalleryImages}
              />
              {/* Hidden file input for single-file replacement */}
              <input
                ref={galleryReplaceInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleReplaceGalleryImage}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-gray-100 bg-gray-50/50 px-6 py-3">
              <button
                type="button"
                onClick={() => setGalleryProduct(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
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
