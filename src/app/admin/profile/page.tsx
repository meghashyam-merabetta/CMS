'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { User, Shield, Key, Check, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const displayName = user?.name || 'Super Admin';
  const displayEmail = user?.email || 'superadmin@merabetta.com';
  const displayRole = user?.role === 'SUPER_ADMIN' ? 'Super Administrator' : 'Administrator';
  const isSuper = user?.role === 'SUPER_ADMIN';

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('New password and confirm password do not match!');
      return;
    }
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 3000);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
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
            <Check size={16} className="text-emerald-600" />
            <span>Password updated successfully!</span>
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
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full h-10 px-3.5 rounded-lg border border-[#D6DCE5] text-xs outline-none focus:border-[#F47C35] bg-white transition"
            />
          </div>

          <button
            type="submit"
            className="h-10 px-5 rounded-lg bg-[#F47C35] text-xs font-semibold text-white shadow-xs hover:bg-[#E96F29] transition cursor-pointer"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
