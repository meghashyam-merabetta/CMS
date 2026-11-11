'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Edit2, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { AdminBanner, BannerStatus, BannerWritePayload, createAdminBanner, deleteAdminBanner, getAdminBanners, updateAdminBanner, uploadBannerImage } from '@/services/api/adminBannersApi';

const LIMIT = 20;
const BANNER_PLACEMENTS = [
  { value: 'home-family', label: 'Home — Family Care', pageName: 'Home' },
  { value: 'home-essentials', label: 'Home — Everyday Essentials', pageName: 'Home' },
  { value: 'home-labs', label: 'Home — Labs', pageName: 'Home' },
  { value: 'categories', label: 'Categories Page', pageName: 'Categories' },
  { value: 'products-list', label: 'Products Listing', pageName: 'Products' },
  { value: 'labs-list', label: 'Labs Listing', pageName: 'Labs' },
  { value: 'lab-details', label: 'Lab Details', pageName: 'Lab Tests' },
  { value: 'booked-together', label: 'Frequently Booked Together', pageName: 'Frequently Booked Together' },
] as const;
const blank = (): BannerWritePayload => ({ banner_key:'', page_name:'', banner_name:'', image_path:'', width_px:1200, height_px:400, is_active:true, banner_type:'WEBSITE', banner_description:'', cta_text:'', link_url:'', mobile_image_path:null, status:'DRAFT', display_order:0, is_published:false, publish_start_at:null, publish_end_at:null });
function checkImage(file: File | null) { if (!file) return; if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error(`${file.name}: use JPEG, PNG or WebP.`); if (file.size > 5*1024*1024) throw new Error(`${file.name}: maximum size is 5 MiB.`); }
async function readImageDimensions(file: File) {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error(`${file.name}: could not read image dimensions.`));
      image.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
}

export default function BannerManagementPage() {
  const [rows,setRows]=useState<AdminBanner[]>([]), [total,setTotal]=useState(0), [offset,setOffset]=useState(0);
  const [search,setSearch]=useState(''), [status,setStatus]=useState(''), [error,setError]=useState(''), [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false), [current,setCurrent]=useState<AdminBanner|null>(null), [form,setForm]=useState<BannerWritePayload>(blank());
  const [primaryImage,setPrimaryImage]=useState<File|null>(null), [saving,setSaving]=useState(false);
  const load=useCallback(async()=>{ setLoading(true);setError('');try{const r=await getAdminBanners({limit:LIMIT,offset,search:search||undefined,status:(status||undefined) as BannerStatus|undefined,sort_by:'display_order',sort_order:'asc'});setRows(r.data);setTotal(r.pagination.total);}catch(e){setError(e instanceof Error?e.message:'Could not load banners.');}finally{setLoading(false);}},[offset,search,status]);
  useEffect(()=>{const id=setTimeout(load,250);return()=>clearTimeout(id);},[load]);
  const open=(b?:AdminBanner)=>{setCurrent(b||null);setForm(b?{...b}:blank());setPrimaryImage(null);setError('');setModal(true);};
  const set=<K extends keyof BannerWritePayload>(k:K,v:BannerWritePayload[K])=>setForm(f=>({...f,[k]:v}));
  const save=async(e:FormEvent)=>{e.preventDefault();setSaving(true);setError('');try{checkImage(primaryImage);if(!current&&rows.some(row=>row.banner_key===form.banner_key))throw new Error('A banner already exists for this placement. Choose another placement.');if(!current&&!primaryImage)throw new Error('Choose the banner image used by the phone app.');const placement=BANNER_PLACEMENTS.find(item=>item.value===form.banner_key);if(!placement)throw new Error('Choose a valid banner placement.');const fields={page_name:placement.pageName,banner_name:form.banner_name.trim(),width_px:Number(form.width_px),height_px:Number(form.height_px),is_active:Boolean(form.is_active),banner_type:'WEBSITE' as const,status:form.is_active?('ACTIVE' as const):('INACTIVE' as const)};let saved=current?await updateAdminBanner(current.banner_key,fields):await createAdminBanner({banner_key:form.banner_key,image_path:`pending-upload://${form.banner_key}/primary`,...fields});if(!current)setCurrent(saved);if(primaryImage)saved=await uploadBannerImage(saved.banner_key,primaryImage);setModal(false);await load();}catch(e){setError(e instanceof Error?e.message:'Banner save failed.');}finally{setSaving(false);}};
  const remove=async(b:AdminBanner)=>{if(!confirm(`Delete banner “${b.banner_name}”?`))return;try{await deleteAdminBanner(b.banner_key);await load();}catch(e){setError(e instanceof Error?e.message:'Delete failed.');}};
  return <div className="space-y-4 font-poppins text-[#252525]">{error&&<div className="flex justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button onClick={()=>setError('')}><X size={16}/></button></div>}
    <section className="rounded-2xl border border-[#DDE3EA] bg-white p-4 sm:p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-xl font-semibold">Banner Management</h1><p className="mt-1 text-sm text-gray-500">Manage promotional banners, publication windows and responsive images.</p></div><div className="flex gap-2"><button onClick={load} className="flex h-11 items-center gap-2 rounded-xl border px-4"><RefreshCw size={16}/>Refresh</button><button onClick={()=>open()} className="flex h-11 items-center gap-2 rounded-xl bg-[#F47C35] px-5 font-semibold text-white"><Plus size={17}/>Add Banner</button></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_220px]"><input value={search} onChange={e=>{setSearch(e.target.value);setOffset(0)}} placeholder="Search key or banner name" className="h-11 rounded-xl border px-4"/><select value={status} onChange={e=>{setStatus(e.target.value);setOffset(0)}} className="h-11 rounded-xl border bg-white px-4"><option value="">All statuses</option><option>DRAFT</option><option>ACTIVE</option><option>INACTIVE</option></select></div>
      <div className="mt-5 overflow-x-auto rounded-xl border"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-[#E4E4E4]"><tr>{['Banner','Page','Dimensions','Order','Status','Published','Action'].map(h=><th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y">{loading?<tr><td colSpan={7} className="p-8 text-center">Loading…</td></tr>:rows.length===0?<tr><td colSpan={7} className="p-8 text-center text-gray-500">No banners found.</td></tr>:rows.map(b=><tr key={b.banner_key}><td className="px-4 py-3"><div className="font-semibold">{b.banner_name}</div><div className="text-xs text-gray-500">{b.banner_key}</div></td><td className="px-4 py-3">{b.page_name}</td><td className="px-4 py-3">{b.width_px} × {b.height_px}</td><td className="px-4 py-3">{b.display_order}</td><td className="px-4 py-3">{b.status}<div className="text-xs text-gray-500">{b.is_active?'Active':'Inactive'}</div></td><td className="px-4 py-3">{b.is_published?'Yes':'No'}</td><td className="px-4 py-3"><div className="flex gap-2"><button onClick={()=>open(b)} className="rounded-lg border p-2 text-blue-600"><Edit2 size={15}/></button><button onClick={()=>remove(b)} className="rounded-lg border p-2 text-red-600"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>
      <div className="mt-4 flex justify-between text-sm"><span>{total} total</span><div className="flex gap-2"><button disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-LIMIT))} className="rounded border px-3 py-1 disabled:opacity-40">Previous</button><button disabled={offset+LIMIT>=total} onClick={()=>setOffset(offset+LIMIT)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button></div></div></section>
    {modal&&<div className="fixed inset-0 z-[70] grid place-items-center bg-black/45 p-3"><form onSubmit={save} className="w-full max-w-xl rounded-2xl bg-white p-5 sm:p-7"><div className="flex justify-between"><h2 className="text-xl font-semibold">{current?'Edit Banner':'Add Banner'}</h2><button type="button" onClick={()=>setModal(false)}><X/></button></div>
      {error&&<div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="mt-5 grid gap-4">
        <Field label="Banner placement *"><select required disabled={!!current} value={form.banner_key} onChange={e=>{const key=e.target.value;const placement=BANNER_PLACEMENTS.find(item=>item.value===key);setForm(value=>({...value,banner_key:key,page_name:placement?.pageName||''}))}} className="input bg-white disabled:bg-gray-100"><option value="">Select placement</option>{current&&!BANNER_PLACEMENTS.some(item=>item.value===current.banner_key)&&<option value={current.banner_key}>{current.banner_key}</option>}{BANNER_PLACEMENTS.map(item=><option key={item.value} value={item.value} disabled={!current&&rows.some(row=>row.banner_key===item.value)}>{item.label}{!current&&rows.some(row=>row.banner_key===item.value)?' — already used':''}</option>)}</select></Field>
        <Field label="Banner name *"><input required value={form.banner_name} onChange={e=>set('banner_name',e.target.value)} className="input"/></Field>
        <Field label={`Banner image ${current?'(optional replacement)':'*'}`}><input required={!current} type="file" accept="image/jpeg,image/png,image/webp" onChange={async e=>{const file=e.target.files?.[0]||null;setError('');try{checkImage(file);setPrimaryImage(file);if(file){const dimensions=await readImageDimensions(file);setForm(value=>({...value,width_px:dimensions.width,height_px:dimensions.height}))}}catch(error){setPrimaryImage(null);e.target.value='';setError(error instanceof Error?error.message:'Invalid image.')}}} className="mt-1 block w-full rounded-lg border p-2"/>{primaryImage&&<span className="mt-1 block text-xs text-gray-500">{primaryImage.name} · {form.width_px} × {form.height_px}px</span>}</Field>
        <label className="text-sm"><input type="checkbox" checked={form.is_active} onChange={e=>set('is_active',e.target.checked)} className="mr-2"/>Active</label>
      </div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={()=>setModal(false)} className="rounded-xl border px-5 py-3">Cancel</button><button disabled={saving} className="rounded-xl bg-[#F47C35] px-6 py-3 font-semibold text-white disabled:opacity-50">{saving?'Saving…':'Save Banner'}</button></div></form></div>}
    <style jsx>{`.input{margin-top:.25rem;height:2.75rem;width:100%;border:1px solid #d7dee8;border-radius:.5rem;padding:0 .75rem}`}</style></div>;
}
function Field({label,wide,children}:{label:string;wide?:boolean;children:React.ReactNode}){return <label className={`text-sm ${wide?'sm:col-span-2':''}`}>{label}{children}</label>}
