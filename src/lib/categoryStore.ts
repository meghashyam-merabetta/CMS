import fs from 'fs/promises';
import path from 'path';
import { BackendCategory } from '@/types/api';

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'categories.json');

const INITIAL_CATEGORIES: BackendCategory[] = [
  {
    category_id: 1,
    category_name: 'Mobility Aids',
    parent_category_id: null,
    category_image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=300&q=80',
    description: 'Wheelchairs, walking sticks, rollators and motorized mobility aids for seniors and patients.',
    created_at: '2026-03-15T08:30:00.000Z',
    updated_at: '2026-03-15T08:30:00.000Z',
  },
  {
    category_id: 2,
    category_name: 'Health Monitoring Devices',
    parent_category_id: null,
    category_image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&q=80',
    description: 'Digital BP monitors, pulse oximeters, glucometers, ECG monitors and digital thermometers.',
    created_at: '2026-03-18T10:15:00.000Z',
    updated_at: '2026-03-18T10:15:00.000Z',
  },
  {
    category_id: 3,
    category_name: 'Wheelchairs & Power Chairs',
    parent_category_id: 1,
    category_image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=300&q=80',
    description: 'Manual folding wheelchairs, reclining commode wheelchairs, and electric power chairs.',
    created_at: '2026-03-20T11:45:00.000Z',
    updated_at: '2026-03-20T11:45:00.000Z',
  },
  {
    category_id: 4,
    category_name: 'Blood Pressure Monitors',
    parent_category_id: 2,
    category_image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=300&q=80',
    description: 'Automatic upper-arm and wrist blood pressure monitoring devices.',
    created_at: '2026-03-22T09:20:00.000Z',
    updated_at: '2026-03-22T09:20:00.000Z',
  },
  {
    category_id: 5,
    category_name: 'Orthopedic Supports & Braces',
    parent_category_id: null,
    category_image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&q=80',
    description: 'Knee braces, lumbar belts, cervical collars, wrist splints and ankle binders.',
    created_at: '2026-03-25T14:10:00.000Z',
    updated_at: '2026-03-25T14:10:00.000Z',
  },
  {
    category_id: 6,
    category_name: 'Patient Care & Bedding',
    parent_category_id: null,
    category_image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=300&q=80',
    description: 'Hospital beds, anti-bedsore air mattresses, overbed tables and patient lifting hoists.',
    created_at: '2026-04-01T16:00:00.000Z',
    updated_at: '2026-04-01T16:00:00.000Z',
  },
];

async function ensureDataFile(): Promise<BackendCategory[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const content = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(content);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(INITIAL_CATEGORIES, null, 2), 'utf8');
    return INITIAL_CATEGORIES;
  }
}

async function saveCategories(categories: BackendCategory[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(categories, null, 2), 'utf8');
}

export async function listCategoriesStore(options: {
  limit?: number;
  offset?: number;
  parent_category_id?: number;
}): Promise<{
  data: BackendCategory[];
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
}> {
  const all = await ensureDataFile();
  const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 100);
  const offset = Math.max(Number(options.offset) || 0, 0);

  let filtered = all;
  if (options.parent_category_id !== undefined && options.parent_category_id !== null) {
    const parentId = Number(options.parent_category_id);
    filtered = all.filter((c) => c.parent_category_id === parentId);
  }

  const sorted = [...filtered].sort((a, b) => (a.category_id || 0) - (b.category_id || 0));
  const rows = sorted.slice(offset, offset + limit);
  const total = filtered.length;

  return {
    data: rows,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    },
  };
}

export async function getCategoryByIdStore(categoryId: number): Promise<BackendCategory | null> {
  const all = await ensureDataFile();
  return all.find((c) => c.category_id === categoryId) || null;
}

export async function createCategoryStore(payload: {
  category_name: string;
  parent_category_id?: number | null;
  category_image?: string | null;
  description?: string | null;
}): Promise<BackendCategory> {
  const all = await ensureDataFile();

  if (payload.parent_category_id != null) {
    const parent = all.find((c) => c.category_id === payload.parent_category_id);
    if (!parent) {
      throw new Error('Parent category not found');
    }
  }

  const nextId = all.reduce((max, c) => Math.max(max, c.category_id || 0), 0) + 1;
  const now = new Date().toISOString();

  const newCategory: BackendCategory = {
    category_id: nextId,
    category_name: payload.category_name.trim(),
    parent_category_id: payload.parent_category_id != null ? Number(payload.parent_category_id) : null,
    category_image: payload.category_image?.trim() || null,
    description: payload.description?.trim() || null,
    created_at: now,
    updated_at: now,
  };

  all.push(newCategory);
  await saveCategories(all);
  return newCategory;
}

export async function updateCategoryStore(
  categoryId: number,
  payload: {
    category_name?: string;
    parent_category_id?: number | null;
    category_image?: string | null;
    description?: string | null;
  }
): Promise<BackendCategory> {
  const all = await ensureDataFile();
  const index = all.findIndex((c) => c.category_id === categoryId);

  if (index === -1) {
    throw new Error('Category not found');
  }

  const target = all[index];

  if (payload.parent_category_id !== undefined) {
    if (payload.parent_category_id === categoryId) {
      throw new Error('A category cannot be its own parent');
    }

    if (payload.parent_category_id != null) {
      const parent = all.find((c) => c.category_id === payload.parent_category_id);
      if (!parent) {
        throw new Error('Parent category not found');
      }

      // Cycle detection: walk ancestors from parent
      let ancestor: BackendCategory | undefined = parent;
      const visited = new Set<number>();
      while (ancestor) {
        const aId = ancestor.category_id!;
        if (aId === categoryId) {
          throw new Error('Category hierarchy cannot contain a cycle');
        }
        if (visited.has(aId)) {
          throw new Error('Existing category hierarchy contains a cycle');
        }
        visited.add(aId);
        if (ancestor.parent_category_id == null) break;
        ancestor = all.find((c) => c.category_id === ancestor!.parent_category_id);
      }
    }
  }

  if (payload.category_name !== undefined) target.category_name = payload.category_name.trim();
  if (payload.category_image !== undefined) target.category_image = payload.category_image ? payload.category_image.trim() : null;
  if (payload.parent_category_id !== undefined) target.parent_category_id = payload.parent_category_id != null ? Number(payload.parent_category_id) : null;
  if (payload.description !== undefined) target.description = payload.description ? payload.description.trim() : null;
  target.updated_at = new Date().toISOString();

  all[index] = target;
  await saveCategories(all);
  return target;
}

export async function deleteCategoryStore(categoryId: number): Promise<void> {
  const all = await ensureDataFile();
  const index = all.findIndex((c) => c.category_id === categoryId);

  if (index === -1) {
    throw new Error('Category not found');
  }

  // Reject if child categories exist (matches Sequelize controller check)
  const hasChildren = all.some((c) => c.parent_category_id === categoryId);
  if (hasChildren) {
    const error: any = new Error('Cannot delete a category that has subcategories');
    error.status = 409;
    throw error;
  }

  all.splice(index, 1);
  await saveCategories(all);
}
