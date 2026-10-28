import { apiFetch } from '@/lib/api';
import { CATALOG_IMAGE_FIELD_NAME, CatalogImageSelection, validateCatalogImage } from '@/lib/catalogImages';

export type ImageResource = 'categories' | 'brands';

function imageEndpoint(resource: ImageResource, id: string | number): string {
  const value = String(id);
  if (!/^[1-9]\d*$/.test(value)) throw new Error('A valid category or brand ID is required to save its image.');
  return `/api/admin/${resource}/${encodeURIComponent(value)}/image`;
}

export async function getAdminEntityImage(resource: ImageResource, id: string | number): Promise<string | null> {
  const response = await apiFetch<{ data: { image_url: string | null } }>(imageEndpoint(resource, id), { cache: 'no-store' });
  if (!response?.data || !(response.data.image_url === null || typeof response.data.image_url === 'string')) {
    throw new Error('The saved image could not be read. Please refresh and try again.');
  }
  return response.data.image_url;
}

export async function uploadAdminEntityImage(resource: ImageResource, id: string | number, file: File): Promise<string> {
  const error = validateCatalogImage(file);
  if (error) throw new Error(error);
  const body = new FormData();
  body.append(CATALOG_IMAGE_FIELD_NAME, file);
  const response = await apiFetch<{ data: { image_url: string } }>(imageEndpoint(resource, id), { method: 'PUT', body });
  if (!response?.data?.image_url || typeof response.data.image_url !== 'string') {
    throw new Error('The server did not return the saved image URL. Retry saving the image.');
  }
  return response.data.image_url;
}

export async function deleteAdminEntityImage(resource: ImageResource, id: string | number): Promise<void> {
  await apiFetch(imageEndpoint(resource, id), { method: 'DELETE', body: JSON.stringify({}) });
}

export interface EntityImageSaveState<T> {
  id?: string;
  metadataKey?: string;
  entity?: T;
  saving?: boolean;
}

/** Retain the created ID and metadata result if the following image request fails. */
export async function saveEntityWithImage<T>(options: {
  resource: ImageResource;
  state: EntityImageSaveState<T>;
  metadata: unknown;
  selection: CatalogImageSelection;
  saveMetadata: (id?: string) => Promise<T>;
  getId: (entity: T) => string | number | undefined;
  onImageSaved: (url: string | null) => void;
}): Promise<T> {
  const { resource, state, selection } = options;
  if (state.saving) throw new Error('A save is already in progress.');
  const validation = selection.file && validateCatalogImage(selection.file);
  if (validation) throw new Error(validation);
  state.saving = true;
  try {
    const key = JSON.stringify(options.metadata);
    if (!state.id || state.metadataKey !== key || !state.entity) {
      const saved = await options.saveMetadata(state.id);
      const id = state.id ?? options.getId(saved);
      if (id == null) throw new Error('The server did not return the saved record ID. Refresh the list before retrying.');
      state.id = String(id);
      state.entity = saved;
      state.metadataKey = key;
    }
    try {
      if (selection.file) options.onImageSaved(await uploadAdminEntityImage(resource, state.id, selection.file));
      else if (selection.remove) {
        await deleteAdminEntityImage(resource, state.id);
        options.onImageSaved(null);
      }
    } catch (error) {
      const label = resource === 'brands' ? 'Brand' : 'Category';
      const reason = error instanceof Error ? error.message : 'Image operation failed.';
      throw new Error(`${label} #${state.id} was saved, but its image could not be saved: ${reason} Retry Save to finish the image operation.`);
    }
    return state.entity!;
  } finally {
    state.saving = false;
  }
}
