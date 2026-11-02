'use client';

import { useEffect, useRef, useState } from 'react';
import { validateVariantImages } from '@/services/api/adminVariantImagesApi';

export default function PendingVariantImages({ label, files, onChange, disabled }: {
  label: string; files: File[]; onChange: (files: File[]) => void; disabled: boolean;
}) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files]);
  return <div className="space-y-3">
    <p className="text-xs text-gray-500">Choose images now. They upload automatically when you save the product. No need to reopen it. JPEG, PNG or WebP; up to 10 images, 5 MiB each.</p>
    <p className="text-sm font-medium">Choose images for {label}</p>
    <button type="button" disabled={disabled || files.length >= 10} onClick={() => fileInput.current?.click()}
      className="inline-flex h-10 items-center justify-center rounded-lg bg-[#F47C35] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#E96F29] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F47C35] disabled:cursor-not-allowed disabled:opacity-50">Choose files</button>
      <input ref={fileInput} aria-label={`Choose images for ${label}`} hidden type="file" multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" disabled={disabled || files.length >= 10}
        onChange={event => {
          const added = Array.from(event.target.files ?? []); event.target.value = '';
          if (!added.length) return;
          try { validateVariantImages(added, files.length); onChange([...files, ...added]); setError(''); }
          catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to select images.'); }
        }} />
    <p className="text-xs text-gray-500">{files.length}/10 images selected · {files.length ? 'Waiting for you to save the product' : 'Product images will be used unless you choose separate images.'}</p>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{files.map((file, index) => <figure key={index} className="rounded-lg border p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {previews[index] && <img src={previews[index]} alt={`${label} selected image ${index + 1}`} className="h-24 w-full object-contain" />}
      <figcaption className="break-all text-xs">{file.name}</figcaption>
      <button type="button" disabled={disabled} onClick={() => { onChange(files.filter((_, position) => position !== index)); setError(''); }} className="mt-2 text-xs text-red-600 underline">Remove selected image {index + 1}</button>
    </figure>)}</div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
