'use client';

import { FormEvent, Fragment, useCallback, useEffect, useState } from 'react';
import { Edit2, ImagePlus, Loader2, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { AdminBanner, BannerStatus, createAdminBannerBatch, deleteAdminBanner, getAdminBanners, updateAdminBanner, uploadBannerImage } from '@/services/api/adminBannersApi';

const LIMIT = 20;
const MAX_FILE = 5 * 1024 * 1024;
const MAX_TOTAL = 10 * 1024 * 1024;
const PLACEMENTS = [
  { value: 'home-family', label: 'Home — Family Care', pageName: 'Home' },
  { value: 'home-essentials', label: 'Home — Everyday Essentials', pageName: 'Home' },
  { value: 'home-labs', label: 'Home — Labs', pageName: 'Home' },
  { value: 'categories', label: 'Categories Page', pageName: 'Categories' },
  { value: 'products-list', label: 'Products Listing', pageName: 'Products' },
  { value: 'labs-list', label: 'Labs Listing', pageName: 'Labs' },
  { value: 'lab-details', label: 'Lab Details', pageName: 'Lab Tests' },
  { value: 'booked-together', label: 'Frequently Booked Together', pageName: 'Frequently Booked Together' },
] as const;

type Dimensions = { width_px: number; height_px: number };
function validateFiles(files: File[]) {
  if (!files.length || files.length > 10) return 'Choose between 1 and 10 banner images.';
  if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) return 'Use genuine JPEG, PNG or WebP images.';
  if (files.some((file) => file.size === 0 || file.size > MAX_FILE)) return 'Each image must be non-empty and no more than 5 MiB.';
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL) return 'Combined banner images must be no more than 10 MiB.';
  return '';
}
async function dimensions(file: File): Promise<Dimensions> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => image.naturalWidth && image.naturalHeight ? resolve({ width_px: image.naturalWidth, height_px: image.naturalHeight }) : reject(new Error(`${file.name}: invalid image.`));
      image.onerror = () => reject(new Error(`${file.name}: file content is not a readable image.`));
      image.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
}

function placementKey(key: string) {
  return key.replace(/-\d{2}$/, '');
}

function variantNumber(key: string) {
  const match = key.match(/-(\d{2})$/);
  return match ? Number(match[1]) : 1;
}

export default function BannerManagementPage() {
  const [rows, setRows] = useState<AdminBanner[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [current, setCurrent] = useState<AdminBanner | null>(null);
  const [placement, setPlacement] = useState('');
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await getAdminBanners({ limit: LIMIT, offset, search: search || undefined, status: (status || undefined) as BannerStatus | undefined, sort_by: 'display_order', sort_order: 'asc' });
      setRows(response.data); setTotal(response.pagination.total);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load banners.'); }
    finally { setLoading(false); }
  }, [offset, search, status]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timer); }, [load]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);
  const openAdd = () => { setCurrent(null); setPlacement(''); setName(''); setActive(true); setFiles([]); setSelectedImage(0); setError(''); setModal(true); };
  const openEdit = (banner: AdminBanner) => { setCurrent(banner); setPlacement(banner.banner_key); setName(banner.banner_name); setActive(banner.is_active); setFiles([]); setSelectedImage(0); setError(''); setModal(true); };
  const chooseFiles = (selected: File[]) => {
    if (current && selected.length > 1) { setError('Choose only one replacement image while editing.'); return; }
    if (!current && files.length + selected.length > 10) { setError('A maximum of 10 banner images can be uploaded together.'); return; }
    const next = current ? selected : [...files, ...selected];
    const issue = validateFiles(next); setError(issue);
    if (!issue) { setFiles(next); setSelectedImage(current ? 0 : Math.max(0, files.length)); }
  };
  const removeFile = (index: number) => {
    const next = files.filter((_, fileIndex) => fileIndex !== index);
    setFiles(next); setSelectedImage((value) => Math.min(value, Math.max(0, next.length - 1))); setError('');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      if (current) {
        if (files.length > 1) throw new Error('Choose only one replacement image while editing.');
        await updateAdminBanner(current.banner_key, { banner_name: name.trim(), is_active: active });
        if (files[0]) { await dimensions(files[0]); await uploadBannerImage(current.banner_key, files[0]); }
      } else {
        const selectedPlacement = PLACEMENTS.find((item) => item.value === placement);
        if (!selectedPlacement) throw new Error('Choose a banner placement.');
        const issue = validateFiles(files); if (issue) throw new Error(issue);
        const imageDimensions = await Promise.all(files.map(dimensions));
        await createAdminBannerBatch({ banner_key: selectedPlacement.value, page_name: selectedPlacement.pageName, banner_name: name.trim(), is_active: active, images: imageDimensions }, files);
      }
      setModal(false); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Banner save failed.'); }
    finally { setSaving(false); }
  };
  const remove = async (banner: AdminBanner) => {
    if (!window.confirm(`Delete banner “${banner.banner_name}”?`)) return;
    try { await deleteAdminBanner(banner.banner_key); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Delete failed.'); }
  };
  const groupedRows = Array.from(
    rows.reduce((groups, banner) => {
      const key = placementKey(banner.banner_key);
      const existing = groups.get(key) || [];
      existing.push(banner); groups.set(key, existing);
      return groups;
    }, new Map<string, AdminBanner[]>())
  ).map(([key, banners]) => ({ key, banners: banners.sort((a, b) => variantNumber(a.banner_key) - variantNumber(b.banner_key)) }));

  return <div className="space-y-4 font-poppins text-[#252525]">
    {error && !modal && <div className="flex justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button onClick={() => setError('')}><X size={16}/></button></div>}
    <section className="rounded-2xl border border-[#DDE3EA] bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-xl font-semibold">Banner Management</h1><p className="mt-1 text-sm text-gray-500">Manage phone-app banner placements. Suffixed banners are not shown by the current phone build.</p></div><div className="flex gap-2"><button onClick={() => void load()} className="flex h-11 items-center gap-2 rounded-xl border px-4"><RefreshCw size={16}/>Refresh</button><button onClick={openAdd} className="flex h-11 items-center gap-2 rounded-xl bg-[#F47C35] px-5 font-semibold text-white"><Plus size={17}/>Add Banner</button></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_220px]"><input value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} placeholder="Search key or banner name" className="h-11 rounded-xl border px-4"/><select value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }} className="h-11 rounded-xl border bg-white px-4"><option value="">All statuses</option><option>DRAFT</option><option>ACTIVE</option><option>INACTIVE</option></select></div>
      <div className="mt-5 overflow-x-auto rounded-xl border"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-[#E4E4E4]"><tr>{['Banner','Page','Dimensions','Order','Status','Published','Action'].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={7} className="p-8 text-center">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-gray-500">No banners found.</td></tr> : groupedRows.map((group) => <Fragment key={group.key}><tr className="border-t-2 border-slate-300 bg-orange-50/70"><td colSpan={7} className="px-4 py-2"><span className="font-semibold text-slate-800">{group.key}</span><span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">{group.banners.length} banner{group.banners.length === 1 ? '' : 's'}</span></td></tr>{group.banners.map((banner, index) => <tr key={banner.banner_key} className="border-t border-slate-200 hover:bg-slate-50"><td className="px-4 py-3 pl-7"><div className="flex items-center gap-2"><span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-1 text-[10px] font-bold text-slate-600">{index + 1}</span><div><div className="font-semibold">{banner.banner_name}</div><div className="text-xs text-gray-500">{banner.banner_key}</div></div></div></td><td className="px-4 py-3">{banner.page_name}</td><td className="px-4 py-3">{banner.width_px} × {banner.height_px}</td><td className="px-4 py-3">{banner.display_order}</td><td className="px-4 py-3">{banner.status}<div className="text-xs text-gray-500">{banner.is_active ? 'Active' : 'Inactive'}</div></td><td className="px-4 py-3">{banner.is_published ? 'Yes' : 'No'}</td><td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => openEdit(banner)} className="rounded-lg border p-2 text-blue-600"><Edit2 size={15}/></button><button onClick={() => void remove(banner)} className="rounded-lg border p-2 text-red-600"><Trash2 size={15}/></button></div></td></tr>)}</Fragment>)}</tbody></table></div>
      <div className="mt-4 flex justify-between text-sm"><span>{total} total</span><div className="flex gap-2"><button disabled={!offset} onClick={() => setOffset(Math.max(0, offset - LIMIT))} className="rounded border px-3 py-1 disabled:opacity-40">Previous</button><button disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button></div></div>
    </section>
    {modal && <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/45 p-3"><form onSubmit={save} className="my-4 max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="sticky top-0 z-10 flex justify-between border-b bg-white px-5 py-4 sm:px-7"><div><h2 className="text-xl font-semibold">{current ? 'Edit Banner' : 'Add Banners'}</h2><p className="mt-1 text-xs text-gray-500">{current ? 'Update this banner or replace its image.' : 'Add up to 10 banners for one placement in a single upload.'}</p></div><button type="button" onClick={() => setModal(false)}><X/></button></div><div className="p-5 sm:p-7">{error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}<div className="grid gap-4">
      <label className="text-sm">Banner placement *<select required disabled={!!current} value={placement} onChange={(e) => setPlacement(e.target.value)} className="input bg-white disabled:bg-gray-100"><option value="">Select placement</option>{current && !PLACEMENTS.some((item) => item.value === current.banner_key) && <option value={current.banner_key}>{current.banner_key}</option>}{PLACEMENTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label className="text-sm">Banner name *<input required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} className="input"/></label>
      <div className="text-sm">Banner images {current ? '(optional replacement)' : '*'}<input id="banner-files" multiple={!current} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { chooseFiles(Array.from(e.target.files || [])); e.target.value = ''; }} className="sr-only"/>
        <div className="mt-2 overflow-hidden rounded-2xl border bg-slate-50">
          <div className="flex min-h-[280px] items-center justify-center p-5 sm:min-h-[360px]">
            {(previews[selectedImage] || (current && current.image_path)) ? <img src={previews[selectedImage] || current!.image_path} alt="Selected banner preview" className="max-h-[330px] max-w-full rounded-xl bg-white object-contain shadow-sm"/> : <label htmlFor="banner-files" className="flex cursor-pointer flex-col items-center gap-3 text-slate-400"><span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm"><ImagePlus size={28}/></span><span className="font-medium">Choose banner images</span></label>}
          </div>
          <div className="border-t bg-white p-4"><div className="mb-3 flex items-center justify-between"><span className="font-medium text-slate-700">{files.length} image{files.length === 1 ? '' : 's'} selected</span><label htmlFor="banner-files" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#F47C35] px-4 py-2 font-semibold text-[#F47C35]"><Plus size={15}/>{current ? 'Choose Replacement' : 'Add More'}</label></div>
            {files.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">{files.map((file, index) => <div key={`${file.name}-${file.lastModified}-${index}`} className={`relative overflow-hidden rounded-xl border-2 bg-slate-50 ${selectedImage === index ? 'border-[#F47C35]' : 'border-slate-200'}`}><button type="button" onClick={() => setSelectedImage(index)} className="block h-28 w-full p-2"><img src={previews[index]} alt={`Banner ${index + 1}`} className="h-full w-full object-contain"/></button><button type="button" onClick={() => removeFile(index)} aria-label={`Remove ${file.name}`} className="absolute right-1.5 top-1.5 rounded-md bg-white/95 p-1.5 text-rose-600 shadow"><Trash2 size={13}/></button><div className="truncate border-t bg-white px-2 py-1.5 text-[10px]" title={file.name}>{file.name}</div></div>)}</div>}
          </div>
        </div><span className="mt-2 block text-xs text-gray-500">{current ? 'One replacement image.' : '1–10 images.'} JPEG, PNG or WebP · 5 MiB each · 10 MiB combined.</span>
      </div>
      <label className="text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="mr-2"/>Active</label>
    </div><div className="mt-6 flex justify-end gap-3 border-t pt-5"><button type="button" onClick={() => setModal(false)} className="rounded-xl border px-5 py-3">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#F47C35] px-6 py-3 font-semibold text-white disabled:opacity-50">{saving && <Loader2 size={16} className="animate-spin"/>}{saving ? 'Saving…' : current ? 'Save Banner' : `Add ${files.length || ''} Banner${files.length === 1 ? '' : 's'}`}</button></div></div></form></div>}
    <style jsx>{`.input{margin-top:.25rem;height:2.75rem;width:100%;border:1px solid #d7dee8;border-radius:.5rem;padding:0 .75rem}`}</style>
  </div>;
}
