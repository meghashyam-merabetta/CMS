'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Edit2, FlaskConical, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { AdminLab, AdminLabEditableFields, CreateAdminLabPayload, createAdminLab, deleteAdminLab, getAdminLabs, updateAdminLab, uploadAdminLabImage } from '@/services/api/adminLabsApi';
import { CATALOG_IMAGE_ACCEPT, validateCatalogImage } from '@/lib/catalogImages';

type LabForm = CreateAdminLabPayload;
const emptyForm: LabForm = { id: '', name: '', description: '', rating: 0, image: '', color: '#e26570', bg: '#fff0f1', city: '', homeCollection: true, active: true };
const fields = (lab: AdminLab): AdminLabEditableFields => ({ name: lab.name, description: lab.description, rating: lab.rating, image: lab.image, color: lab.color, bg: lab.bg, city: lab.city, homeCollection: lab.homeCollection, active: lab.active });

export default function LabsPage() {
  const [labs, setLabs] = useState<AdminLab[]>([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0, hasMore: false });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminLab | null>(null);
  const [form, setForm] = useState<LabForm>(emptyForm);
  const [logo, setLogo] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<AdminLab | null>(null);
  const [deleteConflict, setDeleteConflict] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const requestRef = useRef(0);
  const notify = (value: string) => { setToast(value); window.setTimeout(() => setToast(null), 3500); };
  const errorMessage = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback;

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true); setError(null);
    try {
      const response = await getAdminLabs({ limit, offset, search: search || undefined, active: activeFilter === '' ? undefined : activeFilter === 'true', sort_by: 'createdAt', sort_order: 'desc' });
      if (request === requestRef.current) { setLabs(response.data); setPagination(response.pagination); }
    } catch (cause) {
      if (request === requestRef.current) { setLabs([]); setError(errorMessage(cause, 'Unable to load labs.')); }
    } finally { if (request === requestRef.current) setLoading(false); }
  }, [limit, offset, search, activeFilter]);

  useEffect(() => { void load(); }, [load]);
  const openAdd = () => { setEditing(null); setForm(emptyForm); setLogo(null); setFormError(null); setModalOpen(true); };
  const openEdit = (lab: AdminLab) => { setEditing(lab); setForm({ id: lab.id, ...fields(lab) }); setLogo(null); setFormError(null); setModalOpen(true); };
  const setField = <K extends keyof LabForm>(key: K, value: LabForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const validate = () => {
    if (!editing && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.id)) return 'Lab ID must be a lowercase slug using letters, numbers, and hyphens.';
    if (!form.name.trim() || form.name.trim().length > 200) return 'Name is required and must be at most 200 characters.';
    if (!form.description.trim()) return 'Description is required.';
    if (!Number.isFinite(form.rating) || form.rating < 0 || form.rating > 5 || Math.round(form.rating * 10) !== form.rating * 10) return 'Rating must be from 0 to 5 with at most one decimal place.';
    if (!editing && !logo) return 'Choose a lab logo.';
    if (!/^#[0-9a-fA-F]{6}$/.test(form.color) || !/^#[0-9a-fA-F]{6}$/.test(form.bg)) return 'Colors must use six-digit hex values.';
    if (!form.city.trim() || form.city.trim().length > 100) return 'City is required and must be at most 100 characters.';
    return null;
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const invalid = validate(); if (invalid) { setFormError(invalid); return; }
    setSaving(true); setFormError(null);
    try {
      if (editing) {
        const original = fields(editing);
        const patch: Partial<AdminLabEditableFields> = {};
        (Object.keys(original) as (keyof AdminLabEditableFields)[]).forEach((key) => { if (original[key] !== form[key]) (patch as Record<string, unknown>)[key] = form[key]; });
        delete patch.image;
        if (Object.keys(patch).length) await updateAdminLab(editing.id, patch);
        if (logo) await uploadAdminLabImage(editing.id, logo);
        notify(`Lab “${form.name}” updated.`);
      } else {
        const created = await createAdminLab({ ...form, id: form.id.trim(), name: form.name.trim(), description: form.description.trim(), image: 'lab.png', city: form.city.trim() });
        // Preserve the created row if the second-stage upload fails, so Save retries only the logo.
        setEditing(created);
        setForm({ id: created.id, ...fields(created) });
        await uploadAdminLabImage(created.id, logo!);
        notify(`Lab “${form.name}” added.`);
      }
      setModalOpen(false); await load();
    } catch (cause) {
      setFormError(cause instanceof ApiError && cause.status === 409 ? 'That Lab ID already exists. Choose a different ID.' : errorMessage(cause, 'Unable to save this lab.'));
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!deleting) return;
    setSaving(true); setDeleteConflict(null);
    try { await deleteAdminLab(deleting.id); notify(`Lab “${deleting.name}” removed.`); setDeleting(null); await load(); }
    catch (cause) { setDeleteConflict(cause instanceof ApiError && cause.status === 409 ? cause.message || 'This lab is in use and cannot be deleted.' : errorMessage(cause, 'Unable to delete this lab.')); }
    finally { setSaving(false); }
  };

  const deactivate = async () => {
    if (!deleting) return;
    setSaving(true);
    try { await updateAdminLab(deleting.id, { active: false }); notify(`Lab “${deleting.name}” deactivated.`); setDeleting(null); await load(); }
    catch (cause) { setDeleteConflict(errorMessage(cause, 'Unable to deactivate this lab.')); }
    finally { setSaving(false); }
  };

  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(pagination.total / limit));

  return <div className="rounded-2xl border border-[#DDE3EA] bg-white p-4 shadow-[0_2px_5px_rgba(15,23,42,0.05)] sm:p-6">
    {toast && <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-medium text-white shadow-xl"><Check size={16}/>{toast}</div>}
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-[18px] font-semibold">Lab Management</h1><p className="mt-1 text-xs text-[#626262]">Manage provider records shown in the phone app. New providers remain unavailable for booking until app and provider integrations support them.</p></div><button onClick={openAdd} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#F47C35] px-4 text-xs font-semibold text-white"><Plus size={15}/>Add Lab</button></div>
    {error && <div className="mt-4 flex justify-between rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><span>{error}</span><button onClick={() => void load()} className="font-bold underline">Retry</button></div>}
    <form onSubmit={(event) => { event.preventDefault(); setOffset(0); setSearch(searchInput.trim()); }} className="mt-5 flex flex-wrap justify-end gap-2"><label className="relative w-full max-w-sm"><Search size={14} className="absolute left-3 top-3 text-slate-400"/><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search ID, name or city" className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-xs"/></label><select value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value); setOffset(0); }} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs"><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select><button className="h-10 rounded-lg border border-slate-300 px-4 text-xs font-semibold">Search</button></form>
    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200"><div className="overflow-x-auto"><table className="min-w-[1000px] w-full text-left text-xs"><thead className="bg-[#E4E4E4]"><tr>{['Lab ID','Name','City','Rating','Home Collection','App Availability','Presentation','Actions'].map((heading) => <th key={heading} className="border-r border-white px-3 py-3 font-semibold last:border-0">{heading}</th>)}</tr></thead><tbody>
      {loading ? <tr><td colSpan={8} className="py-16 text-center"><Loader2 size={28} className="mx-auto animate-spin text-[#F47C35]"/></td></tr> : labs.length === 0 ? <tr><td colSpan={8} className="py-16 text-center text-slate-500"><FlaskConical size={34} className="mx-auto mb-2 text-slate-300"/>No labs found.</td></tr> : labs.map((lab) => <tr key={lab.id} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-3 py-3 font-mono font-semibold">{lab.id}</td><td className="px-3"><div className="font-semibold text-slate-900">{lab.name}</div><div className="max-w-[260px] truncate text-[10px] text-slate-500" title={lab.description}>{lab.description}</div></td><td className="px-3">{lab.city}</td><td className="px-3">{Number(lab.rating).toFixed(1)}</td><td className="px-3">{lab.homeCollection ? 'Yes' : 'No'}</td><td className="px-3"><span className={`rounded border px-2 py-1 text-[10px] font-semibold ${lab.active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>{lab.active ? 'ACTIVE' : 'INACTIVE'}</span>{lab.id !== 'redcliffe' && <div className="mt-1 text-[9px] text-amber-700">Not currently bookable</div>}</td><td className="px-3"><span className="inline-block h-5 w-5 rounded border" style={{ backgroundColor: lab.color }}/><span className="ml-1 inline-block h-5 w-5 rounded border" style={{ backgroundColor: lab.bg }}/></td><td className="px-3"><div className="flex gap-2"><button onClick={() => openEdit(lab)} aria-label={`Edit ${lab.name}`} className="rounded border p-2 text-blue-600"><Edit2 size={13}/></button><button onClick={() => { setDeleting(lab); setDeleteConflict(null); }} aria-label={`Delete ${lab.name}`} className="rounded border p-2 text-rose-600"><Trash2 size={13}/></button></div></td></tr>)}
    </tbody></table></div><div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-slate-600"><div>Show <select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setOffset(0); }} className="ml-2 rounded border px-2 py-1">{[10,20,50,100].map((size) => <option key={size}>{size}</option>)}</select><span className="ml-3">{pagination.total} total</span></div><div className="flex items-center gap-2"><button disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - limit))} className="rounded border p-1.5 disabled:opacity-40"><ChevronLeft size={14}/></button><span>Page {page} of {totalPages}</span><button disabled={!pagination.hasMore || loading} onClick={() => setOffset(offset + limit)} className="rounded border p-1.5 disabled:opacity-40"><ChevronRight size={14}/></button></div></div></div>

    {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-xs"><div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"><div className="flex justify-between"><div><h2 className="font-bold">{editing ? 'Edit Lab' : 'Add Lab'}</h2><p className="mt-1 text-[11px] text-slate-500">Provider records do not activate unsupported booking integrations.</p></div><button onClick={() => setModalOpen(false)}><X size={17}/></button></div>{formError && <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{formError}</div>}<form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
      <Input label="Lab ID" disabled={!!editing} required value={form.id} maxLength={100} onChange={(value) => setField('id', value.toLowerCase())}/><Input label="Name" required value={form.name} maxLength={200} onChange={(value) => setField('name', value)}/>
      <label className="sm:col-span-2 text-[11px] font-semibold">Description *<textarea required value={form.description} onChange={(e) => setField('description', e.target.value)} rows={3} className="mt-1 w-full rounded-lg border px-3 py-2 text-xs"/></label>
      <label className="text-[11px] font-semibold">Rating *<input type="number" required min="0" max="5" step="0.1" value={form.rating} onChange={(e) => setField('rating', Number(e.target.value))} className="mt-1 h-10 w-full rounded-lg border px-3 text-xs"/></label><Input label="City" required value={form.city} maxLength={100} onChange={(value) => setField('city', value)}/>
      <div className="sm:col-span-2"><LogoInput currentUrl={editing?.image} file={logo} required={!editing} onChange={(file, issue) => { setLogo(file); setFormError(issue); }}/></div>
      <ColorInput label="Primary color" value={form.color} onChange={(value) => setField('color', value)}/><ColorInput label="Background color" value={form.bg} onChange={(value) => setField('bg', value)}/>
      <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={form.homeCollection} onChange={(e) => setField('homeCollection', e.target.checked)}/>Home collection</label><label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={form.active} onChange={(e) => setField('active', e.target.checked)}/>Active</label>
      <div className="sm:col-span-2 flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setModalOpen(false)} className="h-10 rounded-lg border px-4 text-xs font-semibold">Cancel</button><button disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#F47C35] px-5 text-xs font-semibold text-white disabled:opacity-50">{saving && <Loader2 size={14} className="animate-spin"/>}{editing ? 'Save Changes' : 'Add Lab'}</button></div>
    </form></div></div>}
    {deleting && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><AlertTriangle size={28} className="text-rose-600"/><h2 className="mt-3 font-bold">Delete {deleting.name}?</h2><p className="mt-2 text-xs text-slate-600">Labs referenced by bookings, packages, sync, or service areas cannot be deleted.</p>{deleteConflict && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{deleteConflict}</div>}<div className="mt-5 flex flex-wrap justify-end gap-2"><button onClick={() => setDeleting(null)} className="h-10 rounded-lg border px-4 text-xs font-semibold">Cancel</button>{deleteConflict && deleting.active && <button disabled={saving} onClick={() => void deactivate()} className="h-10 rounded-lg bg-amber-600 px-4 text-xs font-semibold text-white">Deactivate lab</button>}<button disabled={saving || !!deleteConflict} onClick={() => void remove()} className="h-10 rounded-lg bg-rose-600 px-4 text-xs font-semibold text-white disabled:opacity-50">Delete</button></div></div></div>}
  </div>;
}

function Input({ label, onChange, ...props }: { label: string; onChange: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  return <label className="block text-[11px] font-semibold">{label} *<input {...props} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-lg border px-3 text-xs disabled:bg-slate-100"/></label>;
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-[11px] font-semibold">{label} *<div className="mt-1 flex gap-2"><input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 rounded border"/><input required pattern="#[0-9A-Fa-f]{6}" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border px-3 text-xs"/></div></label>;
}

function LogoInput({ currentUrl, file, required, onChange }: { currentUrl?: string; file: File | null; required: boolean; onChange: (file: File | null, error: string | null) => void }) {
  const [preview, setPreview] = useState('');
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const choose = (selected?: File) => {
    if (!selected) return;
    const issue = validateCatalogImage(selected);
    onChange(issue ? null : selected, issue || null);
  };
  return <label className="block text-[11px] font-semibold">Lab logo {required ? '*' : '(optional replacement)'}<div className="mt-1 flex items-center gap-3 rounded-lg border border-dashed p-3"><div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border bg-slate-50">{(preview || currentUrl) ? <img src={preview || currentUrl} alt="Lab logo preview" className="h-full w-full object-contain"/> : <FlaskConical size={22} className="text-slate-300"/>}</div><div><input type="file" accept={CATALOG_IMAGE_ACCEPT} onChange={(event) => { choose(event.target.files?.[0]); event.target.value = ''; }} className="block max-w-full text-xs"/><p className="mt-1 text-[10px] font-normal text-slate-500">JPEG, PNG or WebP · maximum 5 MiB</p>{file && <p className="mt-1 text-[10px] font-normal text-slate-700">Selected: {file.name}</p>}</div></div></label>;
}
