'use client';

import React from 'react';
import { LogOut } from 'lucide-react';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-[#F47C35] mx-auto mb-4">
          <LogOut size={22} />
        </div>

        <h3 className="text-center text-lg font-bold text-gray-900">
          Sign out of admin?
        </h3>
        <p className="mt-1 text-center text-xs text-gray-500">
          Are you sure you want to end your current session? You will need to sign in again to access the admin portal.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-[#F47C35] py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#E06D28] transition cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
