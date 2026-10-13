import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { BackendAdmin, CreateAdminPayload, UpdateAdminPayload } from '@/types/api';

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'admins.json');

async function ensureStore(): Promise<BackendAdmin[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const content = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
  }
  return [];
}

async function saveStore(admins: BackendAdmin[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(admins, null, 2), 'utf8');
}

export async function listAdminsStore(params?: {
  limit?: number;
}): Promise<BackendAdmin[]> {
  const all = await ensureStore();
  const limit = params?.limit ?? 50;
  return all.slice(0, limit);
}

export async function getAdminByIdStore(id: string): Promise<BackendAdmin | null> {
  const all = await ensureStore();
  const found = all.find((a) => a.id === id);
  return found || null;
}

export async function createAdminStore(payload: CreateAdminPayload): Promise<BackendAdmin> {
  const all = await ensureStore();
  const newAdmin: BackendAdmin = {
    id: crypto.randomUUID(),
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    active: true,
    city: payload.city?.trim() || null,
    pincode: payload.pincode?.trim() || null,
    state: payload.state?.trim() || null,
    adminApproval: payload.adminApproval || { requireSuperAdminApproval: false },
    permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  all.unshift(newAdmin);
  await saveStore(all);
  return newAdmin;
}

export async function updateAdminStore(
  id: string,
  payload: UpdateAdminPayload
): Promise<BackendAdmin> {
  const all = await ensureStore();
  const index = all.findIndex((a) => a.id === id);

  if (index === -1) {
    // If admin is from remote backend, save an override in store
    const updated: BackendAdmin = {
      id,
      name: payload.name?.trim() || 'Admin',
      email: payload.email?.trim().toLowerCase() || '',
      active: payload.active !== undefined ? payload.active : true,
      city: payload.city !== undefined ? (payload.city ? payload.city.trim() : null) : null,
      pincode: payload.pincode !== undefined ? (payload.pincode ? payload.pincode.trim() : null) : null,
      state: payload.state !== undefined ? (payload.state ? payload.state.trim() : null) : null,
      adminApproval: payload.adminApproval,
      permissions: payload.permissions,
      updatedAt: new Date().toISOString(),
    };
    all.unshift(updated);
    await saveStore(all);
    return updated;
  }

  const existing = all[index];
  const updated: BackendAdmin = {
    ...existing,
    name: payload.name !== undefined ? payload.name.trim() : existing.name,
    email: payload.email !== undefined ? payload.email.trim().toLowerCase() : existing.email,
    active: payload.active !== undefined ? payload.active : existing.active,
    city: payload.city !== undefined ? (payload.city ? payload.city.trim() : null) : existing.city,
    pincode: payload.pincode !== undefined ? (payload.pincode ? payload.pincode.trim() : null) : existing.pincode,
    state: payload.state !== undefined ? (payload.state ? payload.state.trim() : null) : existing.state,
    adminApproval: payload.adminApproval !== undefined ? payload.adminApproval : existing.adminApproval,
    permissions: payload.permissions !== undefined ? payload.permissions : existing.permissions,
    updatedAt: new Date().toISOString(),
  };

  all[index] = updated;
  await saveStore(all);
  return updated;
}

export async function deleteAdminStore(id: string): Promise<void> {
  const all = await ensureStore();
  const remaining = all.filter((a) => a.id !== id);
  await saveStore(remaining);
}
