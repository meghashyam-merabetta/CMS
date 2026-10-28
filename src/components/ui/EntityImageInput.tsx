'use client';

import { useEffect, useId, useState } from 'react';
import { ImagePlus, Upload } from 'lucide-react';
import { CATALOG_IMAGE_ACCEPT, CatalogImageSelection, validateCatalogImage } from '@/lib/catalogImages';

export default function EntityImageInput({ label, currentUrl, value, onChange, disabled = false }: {
  label: string;
  currentUrl?: string | null;
  value: CatalogImageSelection;
  onChange: (selection: CatalogImageSelection) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!value.file) { setPreviewUrl(''); return; }
    const url = URL.createObjectURL(value.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value.file]);

  function choose(files: FileList | null) {
    if (disabled || !files?.length) return;
    if (files.length !== 1) { setError('Choose one image at a time.'); return; }
    const validation = validateCatalogImage(files[0]);
    setError(validation);
    if (!validation) onChange({ file: files[0], remove: false });
  }
  const src = value.file ? previewUrl : value.remove ? '' : currentUrl;
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-[13px] font-medium text-gray-700">{label}</label>
    <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); choose(event.dataTransfer.files); }} className="flex items-center gap-4 rounded-xl border border-dashed border-gray-300 bg-slate-50 p-3">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white">
        {src ? <img src={src} alt={`${label} preview`} className="h-full w-full object-contain" /> : <ImagePlus size={26} className="text-slate-400" />}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <input id={id} type="file" accept={CATALOG_IMAGE_ACCEPT} disabled={disabled} className="sr-only" onChange={(event) => { choose(event.target.files); event.target.value = ''; }} aria-describedby={`${id}-help`} />
        <label htmlFor={id} className={`inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-[#D46222] ${disabled ? 'opacity-50' : 'cursor-pointer hover:bg-orange-50'}`}>
          <Upload size={14} />{src ? 'Replace image' : 'Choose image'}
        </label>
        <p id={`${id}-help`} className="text-[11px] text-gray-500">Choose a file or drag it here. JPG, PNG or WebP · Max 5 MiB.</p>
        {value.file && <p className="truncate text-xs text-gray-600" title={value.file.name}>{value.file.name}</p>}
        {src && <button type="button" disabled={disabled} onClick={() => { setError(''); onChange({ file: null, remove: Boolean(currentUrl) }); }} className="block text-xs font-medium text-red-600 hover:underline disabled:opacity-50">Remove image</button>}
        {value.remove && currentUrl && <button type="button" disabled={disabled} onClick={() => { setError(''); onChange({ file: null, remove: false }); }} className="block text-xs text-slate-600 underline">Keep current image</button>}
      </div>
    </div>
    {value.remove && <p className="text-xs text-gray-600">The image will be removed when you save.</p>}
    {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
  </div>;
}
