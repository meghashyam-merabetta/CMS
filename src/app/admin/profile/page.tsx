'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { User, Shield, Key, Check, LogOut, Loader2, AlertTriangle } from 'lucide-react';

import { changeAdminPassword } from '@/services/api/adminManagementApi';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displayName = user?.name || 'Super Admin';
  const displayEmail = user?.email || 'superadmin@merabetta.com';
  const displayRole = user?.role === 'SUPER_ADMIN' ? 'Super Administrator' : 'Administrator';
  const isSuper = user?.role === 'SUPER_ADMIN';

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirm password do not match!');
      return;
    }
    if (newPassword.length < 12) {
      setErrorMessage('New password must be at least 12 characters.');
      return;
    }
    if (!user?.id) {
      setErrorMessage('Active session not found. Please log in again.');
      return;
    }

    setIsSubmitting(true);
    try {
      await changeAdminPassword(user.id, {
        currentPassword,
        newPassword,
      });
      setIsSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setIsSuccess(false), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Profile Header Card */}
      <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center gap-5">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white shadow-md ${
              isSuper ? 'bg-purple-600' : 'bg-[#F47C35]'
            }`}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  isSuper
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-orange-100 text-[#F47C35] border border-orange-200'
                }`}
              >
                {displayRole}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{displayEmail}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Active Session • Merabetta Enterprise Portal
            </p>
          </div>
        </div>
      </div>

      {/* Security: Change Password */}
      <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-2 font-bold text-gray-900 text-sm mb-4">
          <Key size={16} className="text-[#F47C35]" />
          <span>Security & Password</span>
        </div>

        {isSuccess && (
          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-emerald-800 text-xs font-medium">
            <Check size={16} className="text-emerald-600 shrink-0" />
            <span>Password updated successfully!</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-center gap-2 text-rose-800 text-xs font-medium">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full h-10 px-3.5 rounded-lg border border-[#D6DCE5] text-xs outline-none focus:border-[#F47C35] bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              New Password (Min 12 characters)
            </label>
            <input
              type="password"
              required
              minLength={12}
              maxLength={72}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 12 characters"
              className="w-full h-10 px-3.5 rounded-lg border border-[#D6DCE5] text-xs outline-none focus:border-[#F47C35] bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={12}
              maxLength={72}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full h-10 px-3.5 rounded-lg border border-[#D6DCE5] text-xs outline-none focus:border-[#F47C35] bg-white transition"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-[#F47C35] text-xs font-semibold text-white shadow-xs hover:bg-[#E96F29] transition cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            <span>{isSubmitting ? 'Updating...' : 'Update Password'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
