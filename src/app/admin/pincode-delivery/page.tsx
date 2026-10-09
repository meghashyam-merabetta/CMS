'use client';

import React, { useState } from 'react';
import {
  Search,
  Plus,
  MapPin,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  X,
  AlertTriangle
} from 'lucide-react';

interface PincodeRule {
  id: string;
  pincode: string;
  city: string;
  state: string;
  sla: string;
  courier: string;
  codEnabled: boolean;
  status: 'ACTIVE' | 'DISABLED';
}

const initialPincodes: PincodeRule[] = [
  { id: 'pin_1', pincode: '400001', city: 'Mumbai (Fort)', state: 'Maharashtra', sla: 'Same Day / 24h', courier: 'Blue Dart Express', codEnabled: true, status: 'ACTIVE' },
  { id: 'pin_2', pincode: '110001', city: 'New Delhi (Connaught Place)', state: 'Delhi', sla: '24-48 Hours', courier: 'Delhivery Surface', codEnabled: true, status: 'ACTIVE' },
  { id: 'pin_3', pincode: '560001', city: 'Bengaluru (M.G. Road)', state: 'Karnataka', sla: '24-48 Hours', courier: 'Blue Dart Air', codEnabled: true, status: 'ACTIVE' },
  { id: 'pin_4', pincode: '411001', city: 'Pune (Camp)', state: 'Maharashtra', sla: '24-48 Hours', courier: 'Shadowfax Health', codEnabled: true, status: 'ACTIVE' },
  { id: 'pin_5', pincode: '500001', city: 'Hyderabad (Abids)', state: 'Telangana', sla: '2-3 Days', courier: 'Delhivery Surface', codEnabled: true, status: 'ACTIVE' },
  { id: 'pin_6', pincode: '600001', city: 'Chennai (George Town)', state: 'Tamil Nadu', sla: '2-3 Days', courier: 'Blue Dart Air', codEnabled: false, status: 'ACTIVE' },
];

export default function PincodeDeliveryPage() {
  const [search, setSearch] = useState('');
  const [pincodes, setPincodes] = useState<PincodeRule[]>(initialPincodes);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPincode, setEditingPincode] = useState<PincodeRule | null>(null);
  const [pincodeToDelete, setPincodeToDelete] = useState<PincodeRule | null>(null);

  // Add form
  const [newRule, setNewRule] = useState({
    pincode: '',
    city: '',
    state: '',
    sla: '24-48 Hours',
    courier: 'Blue Dart Express',
    codEnabled: true,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filtered = pincodes.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.pincode.includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.state.toLowerCase().includes(q) ||
      p.courier.toLowerCase().includes(q)
    );
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.pincode.trim() || !newRule.city.trim()) return;

    const item: PincodeRule = {
      id: `pin_${Date.now()}`,
      pincode: newRule.pincode,
      city: newRule.city,
      state: newRule.state || 'India',
      sla: newRule.sla,
      courier: newRule.courier,
      codEnabled: newRule.codEnabled,
      status: 'ACTIVE',
    };

    setPincodes([item, ...pincodes]);
    setIsAddModalOpen(false);
    setNewRule({
      pincode: '',
      city: '',
      state: '',
      sla: '24-48 Hours',
      courier: 'Blue Dart Express',
      codEnabled: true,
    });
    showToast(`Pincode ${item.pincode} (${item.city}) configured successfully.`);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPincode) return;

    setPincodes((prev) =>
      prev.map((p) => (p.id === editingPincode.id ? editingPincode : p))
    );
    showToast(`Pincode rule for ${editingPincode.pincode} updated.`);
    setEditingPincode(null);
  };

  const handleConfirmDelete = () => {
    if (!pincodeToDelete) return;
    setPincodes((prev) => prev.filter((p) => p.id !== pincodeToDelete.id));
    showToast(`Pincode ${pincodeToDelete.pincode} removed from serviceable zones.`);
    setPincodeToDelete(null);
  };

  return (
    <div className="space-y-4 font-poppins text-[#252525]">
      {toastMessage && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-[#E8F8EE] px-4 py-3 text-[13px] font-medium text-[#1E7F3D]">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[19px] font-semibold text-black">Pincode & Delivery Configuration</h2>
            <p className="mt-1 text-[13px] text-[#626262]">
              Configure serviceable regional zones, courier partners, and COD cash-on-delivery availability.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex h-11 items-center gap-2 rounded-xl bg-[#F47C35] px-5 text-[13px] font-semibold text-white shadow-xs hover:bg-[#E96F29] transition cursor-pointer"
          >
            <Plus size={17} />
            <span>Add Pincode</span>
          </button>
        </div>

        {/* Search */}
        <div className="mt-5 flex justify-end">
          <label className="relative w-full max-w-sm">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A0A8B4]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by pincode, city, or courier..."
              className="h-11 w-full rounded-xl border border-[#D7DEE8] pl-11 pr-4 text-[13px] outline-none transition focus:border-[#F47C35]"
            />
          </label>
        </div>

        {/* Table */}
        <div className="mt-5 overflow-x-auto rounded-xl border border-[#E0E0E0] bg-white shadow-xs">
          <table className="w-full min-w-[900px] text-left text-[13px]">
            <thead className="bg-[#E4E4E4] text-[#111111]">
              <tr>
                {['Pincode', 'City & Hub', 'State', 'Delivery SLA', 'Primary Logistics Partner', 'COD Available', 'Status', 'Action'].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3.5 font-medium border-r border-white last:border-r-0 ${
                      h === 'Action' ? 'text-center w-[110px]' : ''
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E4] text-[12px] text-[#505050]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    No pincode rules found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-4 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-[#F47C35]" />
                        <span>{p.pincode}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-900">{p.city}</td>
                    <td className="px-4 py-4 text-slate-600">{p.state}</td>
                    <td className="px-4 py-4 font-semibold text-slate-700">{p.sla}</td>
                    <td className="px-4 py-4 text-slate-800">{p.courier}</td>
                    <td className="px-4 py-4">
                      {p.codEnabled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 size={14} />
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                          <XCircle size={14} />
                          Prepaid only
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold border-[#A9DBB2] bg-[#EAF8ED] text-[#168A2E]">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingPincode({ ...p })}
                          title="Edit pincode rule"
                          aria-label={`Edit ${p.pincode}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPincodeToDelete(p)}
                          title="Delete pincode rule"
                          aria-label={`Delete ${p.pincode}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Pincode Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleAdd}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-[16px] font-bold text-gray-900">Add Serviceable Pincode</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-[13px]">
              <div>
                <label className="block font-medium text-gray-700">6-Digit Pincode</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="e.g. 400050"
                  value={newRule.pincode}
                  onChange={(e) => setNewRule({ ...newRule, pincode: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 font-mono text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">City & Hub Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bandra West, Mumbai"
                  value={newRule.city}
                  onChange={(e) => setNewRule({ ...newRule, city: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700">State</label>
                  <input
                    type="text"
                    placeholder="Maharashtra"
                    value={newRule.state}
                    onChange={(e) => setNewRule({ ...newRule, state: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700">Delivery SLA</label>
                  <select
                    value={newRule.sla}
                    onChange={(e) => setNewRule({ ...newRule, sla: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                  >
                    <option value="Same Day / 24h">Same Day / 24h</option>
                    <option value="24-48 Hours">24-48 Hours</option>
                    <option value="2-3 Days">2-3 Days</option>
                    <option value="3-5 Days">3-5 Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700">Primary Logistics Partner</label>
                <select
                  value={newRule.courier}
                  onChange={(e) => setNewRule({ ...newRule, courier: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                >
                  <option value="Blue Dart Express">Blue Dart Express</option>
                  <option value="Delhivery Surface">Delhivery Surface</option>
                  <option value="Blue Dart Air">Blue Dart Air</option>
                  <option value="Shadowfax Health">Shadowfax Health</option>
                </select>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRule.codEnabled}
                    onChange={(e) => setNewRule({ ...newRule, codEnabled: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#F47C35]"
                  />
                  <span>Cash on Delivery (COD) Enabled</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white hover:bg-[#E96F29] cursor-pointer"
              >
                Save Pincode
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Pincode Modal */}
      {editingPincode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-[16px] font-bold text-gray-900">Edit Pincode {editingPincode.pincode}</h3>
              <button
                type="button"
                onClick={() => setEditingPincode(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-[13px]">
              <div>
                <label className="block font-medium text-gray-700">City & Hub Name</label>
                <input
                  type="text"
                  required
                  value={editingPincode.city}
                  onChange={(e) => setEditingPincode({ ...editingPincode, city: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700">State</label>
                  <input
                    type="text"
                    value={editingPincode.state}
                    onChange={(e) => setEditingPincode({ ...editingPincode, state: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700">Delivery SLA</label>
                  <select
                    value={editingPincode.sla}
                    onChange={(e) => setEditingPincode({ ...editingPincode, sla: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                  >
                    <option value="Same Day / 24h">Same Day / 24h</option>
                    <option value="24-48 Hours">24-48 Hours</option>
                    <option value="2-3 Days">2-3 Days</option>
                    <option value="3-5 Days">3-5 Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700">Primary Logistics Partner</label>
                <select
                  value={editingPincode.courier}
                  onChange={(e) => setEditingPincode({ ...editingPincode, courier: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                >
                  <option value="Blue Dart Express">Blue Dart Express</option>
                  <option value="Delhivery Surface">Delhivery Surface</option>
                  <option value="Blue Dart Air">Blue Dart Air</option>
                  <option value="Shadowfax Health">Shadowfax Health</option>
                </select>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPincode.codEnabled}
                    onChange={(e) => setEditingPincode({ ...editingPincode, codEnabled: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#F47C35]"
                  />
                  <span>Cash on Delivery (COD) Enabled</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setEditingPincode(null)}
                className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white hover:bg-[#E96F29] cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {pincodeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertTriangle size={24} />
            </div>

            <h3 className="mt-4 text-[16px] font-bold text-gray-900">Remove Pincode?</h3>
            <p className="mt-2 text-[13px] text-gray-600">
              Are you sure you want to remove <strong className="text-gray-900">{pincodeToDelete.pincode}</strong> ({pincodeToDelete.city}) from serviceable delivery destinations?
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPincodeToDelete(null)}
                className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="h-10 rounded-lg bg-rose-600 px-4 text-[13px] font-semibold text-white hover:bg-rose-700 cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
