'use client';

import { useEffect, useRef, useState } from 'react';
import { VariantImageEditor } from '@/lib/variantImageEditor';
import PendingVariantImages from './PendingVariantImages';

const NO_FILES: File[] = [];

interface Props {
  editor?: VariantImageEditor;
  enabled: boolean;
  label: string;
  disabled?: boolean;
  refreshVersion?: string;
  shareBlocked?: string;
  onShared: () => Promise<void>;
  onBusyChange: (busy: boolean) => void;
  pendingFiles?: File[];
  onPendingFilesChange?: (files: File[]) => void;
}

export default function VariantImageGallery({ editor, enabled, label, disabled = false, refreshVersion, shareBlocked, onShared, onBusyChange, pendingFiles = NO_FILES, onPendingFilesChange }: Props) {
  const [, render] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(editor?.lastError ? `${label}: ${editor.lastError}` : '');
  const [confirmShare, setConfirmShare] = useState(false);
  const replaceInput = useRef<HTMLInputElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const replacementId = useRef<string | null>(null);
  const mounted = useRef(true);
  const running = useRef(false);
  const callbacks = useRef({ onShared, onBusyChange });
  callbacks.current = { onShared, onBusyChange };

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function run(action: () => Promise<void>) {
    if (busy || running.current || disabled) return;
    running.current = true;
    setBusy(true); callbacks.current.onBusyChange(true); setError('');
    try { await action(); }
    catch (failure) {
      if (mounted.current) setError(`${label}: ${failure instanceof Error ? failure.message : 'Unable to save variant images.'}`);
    } finally {
      running.current = false;
      callbacks.current.onBusyChange(false);
      if (mounted.current) { setBusy(false); render(value => value + 1); }
    }
  }
  useEffect(() => {
    if (!enabled || !editor || editor.pending) return;
    let active = true;
    setBusy(true); callbacks.current.onBusyChange(true); setError('');
    editor.load().catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Unable to load variant images.'); })
      .finally(() => {
        callbacks.current.onBusyChange(false);
        if (active) { setBusy(false); render(value => value + 1); }
      });
    return () => { active = false; };
  }, [editor, enabled, refreshVersion]);

  const gallery = editor?.gallery;
  const locked = disabled || busy;
  const mutatingDisabled = locked || Boolean(editor?.pending) || !gallery || pendingFiles.length > 0;
  const refreshShared = () => callbacks.current.onShared();
  const prefix = `variant-gallery-${editor?.variantId ?? 'new'}`;

  return <section aria-label={`Images for ${label}`} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
    <h5 className="text-sm font-semibold">Images for {label}</h5>
    {editor && enabled && <p className="text-xs text-gray-500">Variant #{editor.variantId}</p>}
    {!enabled ? <p className="text-sm text-gray-600">Separate variant image editing is not available yet. Shared images are managed under Product Images.</p>
      : !editor ? <PendingVariantImages label={label} files={pendingFiles} onChange={onPendingFilesChange ?? (() => {})} disabled={locked || !onPendingFilesChange} />
      : <>
        {pendingFiles.length > 0 && onPendingFilesChange && <PendingVariantImages label={label} files={pendingFiles} onChange={onPendingFilesChange} disabled={locked || Boolean(editor.pending)} />}
        <p className="text-xs text-gray-500">Image changes save immediately. JPEG, PNG or WebP; up to 10 custom images, 5 MiB each. Files upload one at a time.</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={gallery?.use_product_images ?? false} disabled={mutatingDisabled}
            onChange={event => { const inherit = event.target.checked; void run(() => editor.mode(inherit, refreshShared)); }} />
          Use product images
        </label>
        {gallery && <>
          <p className="text-xs text-gray-500">{gallery.use_product_images ? 'Using the shared product gallery. Manage these pictures under Product Images.' : `${gallery.custom_images.length}/10 custom images. These pictures belong only to this variant.`}</p>
          {gallery.primary_image && <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gallery.primary_image.image_url} alt={`Main image for ${label}`} className="h-36 w-36 rounded-lg border object-contain" />
            <figcaption className="mt-1 text-xs text-gray-500">Main picture</figcaption>
          </figure>}
          {gallery.effective_images.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.effective_images.map((preview, index) => {
              // Inherited IDs are never used with variant edit/delete/primary routes.
              const custom = !gallery.use_product_images ? gallery.custom_images.find(image => image.id === preview.id) : undefined;
              return <div key={preview.id} className="rounded-lg border p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.image_url} alt={`${label} image ${index + 1}`} className="h-24 w-full object-contain" />
                {gallery.primary_image?.id === preview.id && <span className="text-xs font-semibold">Primary</span>}
                {custom && <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <button type="button" disabled={mutatingDisabled || gallery.primary_image?.id === custom.id} onClick={() => void run(() => editor.primary(custom.id, refreshShared))} className="underline disabled:opacity-40">Make primary</button>
                  <button type="button" disabled={mutatingDisabled} onClick={() => { replacementId.current = custom.id; replaceInput.current?.click(); }} className="underline disabled:opacity-40">Replace image {index + 1}</button>
                  <button type="button" disabled={mutatingDisabled} onClick={() => void run(() => editor.remove(custom.id, refreshShared))} className="text-red-600 underline disabled:opacity-40">Delete image {index + 1}</button>
                </div>}
              </div>;
            })}
          </div> : <p className="rounded border border-dashed p-3 text-sm text-gray-500">{gallery.use_product_images ? 'The product gallery is empty.' : 'No custom images. Product pictures are not used for this variant.'}</p>}
        </>}
        <label htmlFor={`${prefix}-upload`} className="block text-sm font-medium">Upload images for {label}</label>
        <button type="button" disabled={mutatingDisabled || (gallery?.custom_images.length ?? 0) >= 10} onClick={() => uploadInput.current?.click()}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[#F47C35] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#E96F29] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F47C35] disabled:cursor-not-allowed disabled:opacity-50">Choose files</button>
        <input ref={uploadInput} hidden id={`${prefix}-upload`} type="file" multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          disabled={mutatingDisabled || (gallery?.custom_images.length ?? 0) >= 10}
          onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ''; if (files.length) void run(() => editor.upload(files, refreshShared)); }} />
        <input ref={replaceInput} aria-label={`Replacement image for ${label}`} type="file" hidden accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" disabled={mutatingDisabled}
          onChange={event => { const file = event.target.files?.[0]; const imageId = replacementId.current; event.target.value = ''; replacementId.current = null; if (file && imageId) void run(() => editor.replace(imageId, file, refreshShared)); }} />
        <div>
          <button type="button" disabled={mutatingDisabled || !gallery?.effective_images.length || Boolean(shareBlocked)} onClick={() => setConfirmShare(true)} className="rounded border px-3 py-2 text-sm disabled:opacity-40">Use these images for all variants</button>
          {shareBlocked && <p className="mt-1 text-xs text-gray-500">{shareBlocked}</p>}
        </div>
        {confirmShare && <div role="alertdialog" aria-labelledby={`${prefix}-confirm`} className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <h6 id={`${prefix}-confirm`} className="font-semibold">Use these images for all variants?</h6>
          <p className="text-sm">This replaces the product default gallery and switches all variants to “Use product images”, including future variants. Their separate galleries are retained for later use.</p>
          <button type="button" disabled={locked} onClick={() => { setConfirmShare(false); void run(() => editor.share(refreshShared)); }} className="mr-3 rounded bg-orange-500 px-3 py-2 text-sm text-white">Confirm use for all variants</button>
          <button type="button" disabled={locked} onClick={() => setConfirmShare(false)} className="text-sm underline">Cancel</button>
        </div>}
        {busy && <p role="status" className="text-sm">Saving or refreshing images…</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {editor.pending ? <div className="space-x-3">
          <button type="button" disabled={locked} onClick={() => void run(() => editor.retry(refreshShared))} className="text-sm underline">Retry image operation</button>
          {editor.rejected && <button type="button" disabled={locked} onClick={() => { editor.discardRejected(); setError(''); render(value => value + 1); }} className="text-sm underline">Discard rejected operation</button>}
          <p className="mt-1 text-xs text-gray-500">Retry keeps the same action and files; confirmed uploads are not sent again.</p>
        </div> : error && <button type="button" disabled={locked} onClick={() => void run(() => editor.load())} className="text-sm underline">Reload gallery</button>}
      </>}
  </section>;
}
