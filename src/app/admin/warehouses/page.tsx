'use client';

import React, { useState } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  Warehouse as WarehouseIcon,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface Warehouse {
  id: string;
  warehouseName: string;
  formattedAddress: string;
  contactName: string;
  contactPhone: string;
  active: boolean;
  carrierReady: boolean;
  updatedAt: string;
}

const mockWarehouses: Warehouse[] = [
  {
    id: 'wh_1',
    warehouseName: 'Bhiwandi Central Fulfillment Hub',
    formattedAddress: 'Plot 42, Logistics Park, Mankoli, Bhiwandi, Thane, Maharashtra 421302',
    contactName: 'Sanjay Patwardhan',
    contactPhone: '+91 98201 11223',
    active: true,
    carrierReady: true,
    updatedAt: '2025-09-28 10:15',
  },
  {
    id: 'wh_2',
    warehouseName: 'Okhla Industrial Logistics Depot',
    formattedAddress: 'Phase III, Okhla Industrial Area, New Delhi, Delhi 110020',
    contactName: 'Rajesh Mehra',
    contactPhone: '+91 98110 44556',
    active: true,
    carrierReady: true,
    updatedAt: '2025-09-25 14:30',
  },
  {
    id: 'wh_3',
    warehouseName: 'Electronic City South Distribution Hub',
    formattedAddress: 'Hosur Main Road, Electronic City Phase 1, Bengaluru, Karnataka 560100',
    contactName: 'Venkatesh Murthy',
    contactPhone: '+91 97400 77889',
    active: true,
    carrierReady: true,
    updatedAt: '2025-09-22 16:45',
  },
  {
    id: 'wh_4',
    warehouseName: 'Sanath Nagar Medical Depot',
    formattedAddress: 'Industrial Estate, Sanath Nagar, Hyderabad, Telangana 500018',
    contactName: 'K. Prabhakar Rao',
    contactPhone: '+91 99891 22334',
    active: true,
    carrierReady: false,
    updatedAt: '2025-09-18 11:20',
  },
  {
    id: 'wh_5',
    warehouseName: 'Ambattur Stockyard & Fulfillment',
    formattedAddress: 'SIDCO Industrial Estate, Ambattur, Chennai, Tamil Nadu 600058',
    contactName: 'Senthil Kumar',
    contactPhone: '+91 94441 55667',
    active: false,
    carrierReady: false,
    updatedAt: '2025-09-10 09:00',
  },
];

export default function WarehousesPage() {
  const [search, setSearch] = useState('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>(mockWarehouses);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);

  // Add form
  const [newWh, setNewWh] = useState({
    warehouseName: '',
    formattedAddress: '',
    contactName: '',
    contactPhone: '',
    active: true,
    carrierReady: true,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filtered = warehouses.filter(
    (w) =>
      w.warehouseName.toLowerCase().includes(search.toLowerCase()) ||
      w.formattedAddress.toLowerCase().includes(search.toLowerCase()) ||
      w.contactName.toLowerCase().includes(search.toLowerCase())
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Warehouse statuses synchronized with carrier APIs.');
    }, 500);
  };

  const handleCreateWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWh.warehouseName.trim() || !newWh.formattedAddress.trim()) return;

    const item: Warehouse = {
      id: `wh_${Date.now()}`,
      warehouseName: newWh.warehouseName,
      formattedAddress: newWh.formattedAddress,
      contactName: newWh.contactName,
      contactPhone: newWh.contactPhone,
      active: newWh.active,
      carrierReady: newWh.carrierReady,
      updatedAt: 'Just now',
    };

    setWarehouses([item, ...warehouses]);
    setIsAddModalOpen(false);
    setNewWh({
      warehouseName: '',
      formattedAddress: '',
      contactName: '',
      contactPhone: '',
      active: true,
      carrierReady: true,
    });
    showToast(`Warehouse "${item.warehouseName}" registered successfully.`);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouse) return;

    setWarehouses((prev) =>
      prev.map((w) =>
        w.id === editingWarehouse.id
          ? { ...editingWarehouse, updatedAt: 'Just now' }
          : w
      )
    );
    showToast(`Warehouse "${editingWarehouse.warehouseName}" updated successfully.`);
    setEditingWarehouse(null);
  };

  const handleConfirmDelete = () => {
    if (!warehouseToDelete) return;
    setWarehouses((prev) => prev.filter((w) => w.id !== warehouseToDelete.id));
    showToast(`Warehouse "${warehouseToDelete.warehouseName}" removed.`);
    setWarehouseToDelete(null);
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
            <h2 className="text-[19px] font-semibold text-black">Warehouses</h2>
            <p className="mt-1 text-[13px] text-[#626262]">
              Manage delivery-provider pickup origins and carrier readiness.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="flex h-11 items-center gap-2 rounded-xl border border-[#D7DEE8] bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-[#F47C35]' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex h-11 items-center gap-2 rounded-xl bg-[#F47C35] px-5 text-[13px] font-semibold text-white shadow-xs hover:bg-[#E96F29] transition cursor-pointer"
            >
              <Plus size={17} />
              <span>Create warehouse</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-5 flex justify-end">
          <label className="relative w-full max-w-sm">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A0A8B4]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search warehouses"
              className="h-11 w-full rounded-xl border border-[#D7DEE8] pl-11 pr-4 text-[13px] outline-none transition focus:border-[#F47C35]"
            />
          </label>
        </div>

        {/* Table */}
        <div className="mt-5 overflow-x-auto rounded-xl border border-[#E0E0E0] bg-white shadow-xs">
          <table className="w-full min-w-[950px] text-left text-[13px]">
            <thead className="bg-[#E4E4E4] text-[#111111]">
              <tr>
                {['Warehouse', 'Address', 'Contact', 'Active', 'Carrier ready', 'Updated', 'Action'].map((h) => (
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
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No warehouses found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-4 font-semibold text-[#173153]">
                      <div className="flex items-center gap-2">
                        <WarehouseIcon size={16} className="text-[#F47C35] shrink-0" />
                        <span>{w.warehouseName}</span>
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-4 text-[#555]">{w.formattedAddress}</td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-slate-900">{w.contactName}</span>
                      <span className="block text-[11px] text-[#777] mt-0.5">{w.contactPhone}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          w.active
                            ? 'border-[#A9DBB2] bg-[#EAF8ED] text-[#168A2E]'
                            : 'border-[#D7DEE8] bg-[#F5F5F5] text-[#667085]'
                        }`}
                      >
                        {w.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`font-semibold ${
                          w.carrierReady ? 'text-[#168A2E]' : 'text-slate-500'
                        }`}
                      >
                        {w.carrierReady ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#777]">{w.updatedAt}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingWarehouse({ ...w })}
                          title="Edit warehouse"
                          aria-label={`Edit ${w.warehouseName}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setWarehouseToDelete(w)}
                          title="Delete warehouse"
                          aria-label={`Delete ${w.warehouseName}`}
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

      {/* Create Warehouse Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleCreateWarehouse}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-[16px] font-bold text-gray-900">Register Warehouse Origin</h3>
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
                <label className="block font-medium text-gray-700">Warehouse Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pune Central Depot"
                  value={newWh.warehouseName}
                  onChange={(e) => setNewWh({ ...newWh, warehouseName: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Complete Address</label>
                <input
                  type="text"
                  required
                  placeholder="Street, Industrial Area, City, State, PIN"
                  value={newWh.formattedAddress}
                  onChange={(e) => setNewWh({ ...newWh, formattedAddress: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700">Contact Person</label>
                  <input
                    type="text"
                    placeholder="Name"
                    value={newWh.contactName}
                    onChange={(e) => setNewWh({ ...newWh, contactName: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 Phone"
                    value={newWh.contactPhone}
                    onChange={(e) => setNewWh({ ...newWh, contactPhone: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newWh.active}
                    onChange={(e) => setNewWh({ ...newWh, active: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#F47C35]"
                  />
                  <span>Warehouse Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newWh.carrierReady}
                    onChange={(e) => setNewWh({ ...newWh, carrierReady: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#F47C35]"
                  />
                  <span>Carrier Pickup Ready</span>
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
                Save Warehouse
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Warehouse Modal */}
      {editingWarehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-[16px] font-bold text-gray-900">Edit Warehouse Details</h3>
              <button
                type="button"
                onClick={() => setEditingWarehouse(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-[13px]">
              <div>
                <label className="block font-medium text-gray-700">Warehouse Name</label>
                <input
                  type="text"
                  required
                  value={editingWarehouse.warehouseName}
                  onChange={(e) =>
                    setEditingWarehouse({ ...editingWarehouse, warehouseName: e.target.value })
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Complete Address</label>
                <input
                  type="text"
                  required
                  value={editingWarehouse.formattedAddress}
                  onChange={(e) =>
                    setEditingWarehouse({ ...editingWarehouse, formattedAddress: e.target.value })
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700">Contact Person</label>
                  <input
                    type="text"
                    value={editingWarehouse.contactName}
                    onChange={(e) =>
                      setEditingWarehouse({ ...editingWarehouse, contactName: e.target.value })
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700">Contact Phone</label>
                  <input
                    type="text"
                    value={editingWarehouse.contactPhone}
                    onChange={(e) =>
                      setEditingWarehouse({ ...editingWarehouse, contactPhone: e.target.value })
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingWarehouse.active}
                    onChange={(e) =>
                      setEditingWarehouse({ ...editingWarehouse, active: e.target.checked })
                    }
                    className="h-4 w-4 rounded accent-[#F47C35]"
                  />
                  <span>Warehouse Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingWarehouse.carrierReady}
                    onChange={(e) =>
                      setEditingWarehouse({ ...editingWarehouse, carrierReady: e.target.checked })
                    }
                    className="h-4 w-4 rounded accent-[#F47C35]"
                  />
                  <span>Carrier Pickup Ready</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setEditingWarehouse(null)}
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
      {warehouseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertTriangle size={24} />
            </div>

            <h3 className="mt-4 text-[16px] font-bold text-gray-900">Delete Warehouse?</h3>
            <p className="mt-2 text-[13px] text-gray-600">
              Are you sure you want to delete <strong className="text-gray-900">{warehouseToDelete.warehouseName}</strong>?
              Carrier dispatches will no longer route pickup to this address.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setWarehouseToDelete(null)}
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
