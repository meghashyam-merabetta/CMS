export const MAX_CATALOG_IMAGE_BYTES = 5 * 1024 * 1024;
export const CATALOG_IMAGE_FIELD_NAME = 'uploadimage';
export const CATALOG_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

export interface CatalogImageSelection {
  file: File | null;
  remove: boolean;
}

export function validateCatalogImage(file: File): string {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Choose a JPG, PNG or WebP image.';
  if (file.size === 0) return 'The selected image is empty. Choose another image.';
  if (file.size > MAX_CATALOG_IMAGE_BYTES) return 'The image must be no more than 5 MiB.';
  return '';
}
