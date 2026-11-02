import {
  VariantGallery, getVariantGallery, validateVariantImages, writeVariantImage,
  setVariantImageMode, deleteVariantImage, setVariantPrimaryImage, shareVariantImages,
} from '@/services/api/adminVariantImagesApi';

type ImageAction =
  | { kind: 'upload'; files: { file: File; key: string }[] }
  | { kind: 'replace'; imageId: string; file: File; key: string }
  | { kind: 'delete' | 'primary'; imageId: string }
  | { kind: 'mode'; inherit: boolean }
  | { kind: 'share'; key: string };
type PendingAction = ImageAction & { committed?: boolean };
const newKey = () => globalThis.crypto.randomUUID();

/** Retains action keys and completed uploads across failures and Terms tab changes. */
export class VariantImageEditor {
  gallery: VariantGallery | null = null;
  pending: PendingAction | null = null;
  rejected = false;
  lastError = '';
  constructor(readonly productId: string | number, readonly variantId: string | number) {}
  private loading: Promise<void> | null = null;
  async load(): Promise<void> {
    if (!this.loading) this.loading = getVariantGallery(this.productId, this.variantId).then(gallery => { this.gallery = gallery; }).finally(() => { this.loading = null; });
    return this.loading;
  }
  private custom(imageId: string): void {
    if (!this.gallery?.custom_images.some(image => image.id === imageId)) throw new Error('Select an image from this variant’s custom gallery. Inherited images are managed under Product Images.');
  }
  async upload(files: File[], refreshShared: () => Promise<void>): Promise<void> {
    validateVariantImages(files, this.gallery?.custom_images.length ?? 0);
    if (files.length) await this.start({ kind: 'upload', files: files.map(file => ({ file, key: newKey() })) }, refreshShared);
  }
  async replace(imageId: string, file: File, refreshShared: () => Promise<void>): Promise<void> {
    this.custom(imageId); validateVariantImages([file], 0, true);
    await this.start({ kind: 'replace', imageId, file, key: newKey() }, refreshShared);
  }
  async remove(imageId: string, refreshShared: () => Promise<void>): Promise<void> {
    this.custom(imageId); await this.start({ kind: 'delete', imageId }, refreshShared);
  }
  async primary(imageId: string, refreshShared: () => Promise<void>): Promise<void> {
    this.custom(imageId); await this.start({ kind: 'primary', imageId }, refreshShared);
  }
  async mode(inherit: boolean, refreshShared: () => Promise<void>): Promise<void> {
    await this.start({ kind: 'mode', inherit }, refreshShared);
  }
  async share(refreshShared: () => Promise<void>): Promise<void> {
    await this.start({ kind: 'share', key: newKey() }, refreshShared);
  }
  private async start(action: ImageAction, refreshShared: () => Promise<void>): Promise<void> {
    if (this.pending) throw new Error('Retry the unfinished image operation before starting another.');
    if (!this.gallery) throw new Error('Load this variant’s gallery before changing images.');
    this.pending = action; this.rejected = false;
    await this.retry(refreshShared);
  }
  discardRejected(): void {
    if (!this.rejected) throw new Error('Retry this operation to verify whether the server saved it.');
    this.pending = null; this.rejected = false; this.lastError = '';
  }
  async retry(refreshShared: () => Promise<void>): Promise<void> {
    const action = this.pending;
    if (!action) return;
    try {
      if (!action.committed) {
        switch (action.kind) {
          case 'upload':
            while (action.files.length) {
              const item = action.files[0];
              this.gallery = await writeVariantImage(this.productId, this.variantId, item.file, item.key);
              action.files.shift(); // Never resend a confirmed successful file.
            }
            break;
          case 'replace': this.gallery = await writeVariantImage(this.productId, this.variantId, action.file, action.key, action.imageId); break;
          case 'mode': this.gallery = await setVariantImageMode(this.productId, this.variantId, action.inherit); break;
          case 'primary': this.gallery = await setVariantPrimaryImage(this.productId, this.variantId, action.imageId); break;
          case 'share': this.gallery = await shareVariantImages(this.productId, this.variantId, action.key); break;
          case 'delete':
            try { await deleteVariantImage(this.productId, this.variantId, action.imageId); }
            catch (error) {
              // A lost DELETE response may mean deletion already committed.
              const fresh = await getVariantGallery(this.productId, this.variantId).catch(() => null);
              if (!fresh || fresh.custom_images.some(image => image.id === action.imageId)) throw error;
              this.gallery = fresh;
            }
            break;
        }
        action.committed = true;
      }
      // A failed refresh retries only reads, not a successful mutation.
      if (action.kind === 'share') await refreshShared();
      await this.load();
      this.pending = null; this.rejected = false; this.lastError = '';
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Unable to save variant images.';
      const status = error instanceof Error && 'status' in error ? Number(error.status) : 0;
      this.rejected = !action.committed && status >= 400 && status < 500 && ![408, 409].includes(status);
      throw error;
    }
  }
}
