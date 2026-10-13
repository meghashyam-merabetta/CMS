import fs from 'fs/promises';
import path from 'path';
import { BackendProduct, CreateProductPayload, UpdateProductPayload } from '@/types/api';
import { mockProducts } from '@/data/mockData';

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'products.json');

function mapMockToBackend(mp: any, index: number): BackendProduct {
  const numId = index + 1;
  return {
    id: numId,
    product_id: numId,
    name: mp.name,
    product_name: mp.name,
    price: mp.price || 999,
    stock: mp.stock || 20,
    prescription_required: false,
    age_group: mp.brand?.startsWith('Age:') ? mp.brand.replace('Age:', '').trim() : 'Adults',
    description: `${mp.name} - high-quality healthcare and wellness product.`,
    category_id: null,
    created_at: mp.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function ensureStore(): Promise<BackendProduct[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const content = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // If file doesn't exist, initialize from mockProducts
  }

  const initialProducts: BackendProduct[] = mockProducts.map(mapMockToBackend);
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(initialProducts, null, 2), 'utf8');
  } catch {
    // Write best-effort
  }
  return initialProducts;
}

async function saveStore(products: BackendProduct[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(products, null, 2), 'utf8');
}

export async function listProductsStore(params?: {
  limit?: number;
  offset?: number;
  category_id?: number;
  search?: string;
}): Promise<{
  data: BackendProduct[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}> {
  const all = await ensureStore();
  const limit = params?.limit ?? 20;
  const offset = params?.offset ?? 0;
  const search = params?.search?.trim().toLowerCase();
  const catId = params?.category_id;

  let filtered = all;

  if (catId !== undefined && catId !== null) {
    filtered = filtered.filter((p) => p.category_id === Number(catId));
  }

  if (search) {
    filtered = filtered.filter((p) => {
      const name = (p.product_name || p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return name.includes(search) || desc.includes(search);
    });
  }

  const total = filtered.length;
  const pageSlice = filtered.slice(offset, offset + limit);

  return {
    data: pageSlice,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + pageSlice.length < total,
    },
  };
}

export async function getProductByIdStore(id: number | string): Promise<BackendProduct | null> {
  const all = await ensureStore();
  const targetId = String(id);
  const found = all.find(
    (p) => String(p.product_id) === targetId || String(p.id) === targetId
  );
  return found || null;
}

export async function createProductStore(payload: CreateProductPayload): Promise<BackendProduct> {
  const all = await ensureStore();
  const maxId = all.reduce((max, p) => Math.max(max, Number(p.product_id ?? p.id ?? 0)), 100);
  const nextId = maxId + 1;

  const newProduct: BackendProduct = {
    id: nextId,
    product_id: nextId,
    name: payload.product_name.trim(),
    product_name: payload.product_name.trim(),
    prescription_required: Boolean(payload.prescription_required),
    age_group: payload.age_group ? payload.age_group.trim() : null,
    description: payload.description ? payload.description.trim() : null,
    category_id: payload.category_id != null ? Number(payload.category_id) : null,
    price: 999,
    stock: 25,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  all.unshift(newProduct);
  await saveStore(all);
  return newProduct;
}

export async function updateProductStore(
  id: number | string,
  payload: UpdateProductPayload
): Promise<BackendProduct> {
  const all = await ensureStore();
  const targetId = String(id);
  const index = all.findIndex(
    (p) => String(p.product_id) === targetId || String(p.id) === targetId
  );

  if (index === -1) {
    throw new Error('Product not found');
  }

  const existing = all[index];
  const updated: BackendProduct = {
    ...existing,
    product_name: payload.product_name !== undefined ? payload.product_name.trim() : existing.product_name,
    name: payload.product_name !== undefined ? payload.product_name.trim() : existing.name,
    prescription_required:
      payload.prescription_required !== undefined
        ? Boolean(payload.prescription_required)
        : existing.prescription_required,
    age_group: payload.age_group !== undefined ? (payload.age_group ? payload.age_group.trim() : null) : existing.age_group,
    description:
      payload.description !== undefined ? (payload.description ? payload.description.trim() : null) : existing.description,
    category_id:
      payload.category_id !== undefined
        ? payload.category_id != null
          ? Number(payload.category_id)
          : null
        : existing.category_id,
    updated_at: new Date().toISOString(),
  };

  all[index] = updated;
  await saveStore(all);
  return updated;
}

export async function deleteProductStore(id: number | string): Promise<void> {
  const all = await ensureStore();
  const targetId = String(id);
  const remaining = all.filter(
    (p) => String(p.product_id) !== targetId && String(p.id) !== targetId
  );
  await saveStore(remaining);
}
