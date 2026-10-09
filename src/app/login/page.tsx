'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth, PRESET_USERS } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepMeSignedIn, setKeepMeSignedIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await login(email, password, keepMeSignedIn);
      if (result.success) {
        router.replace('/admin/dashboard');
      } else {
        setErrorMessage(result.error || 'Unable to log in. Please try again.');
      }
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick 1-click credentials filler for testing convenience
  const fillCredentials = (type: 'admin' | 'superadmin') => {
    setErrorMessage(null);
    if (type === 'admin') {
      setEmail(PRESET_USERS.admin.email);
      setPassword(PRESET_USERS.admin.passwords[0]);
    } else {
      setEmail(PRESET_USERS.superadmin.email);
      setPassword(PRESET_USERS.superadmin.passwords[0]);
    }
  };

  return (
    <main className="h-dvh w-screen overflow-hidden bg-white">
      <div className="grid h-full w-full lg:grid-cols-2">
        {/* Left Column: Visual Banner */}
        <div className="relative hidden lg:block">
          <Image
            src="/Images/Banner.png"
            alt="Trusted Care Banner"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            className="object-cover"
          />
          {/* Subtle dark overlay */}
          <div className="absolute inset-0 bg-black/20" />

          {/* Hero Headline & Subtitle */}
          <div className="absolute bottom-12 left-12 right-12 text-white z-10">
            <h1 className="text-6xl font-bold leading-tight drop-shadow-md">
              Trusted Care,
              <br />
              Delivered
            </h1>
            <p className="mt-4 text-xl font-normal drop-shadow-sm text-white/95">
              Your Trusted Health Store, Built For Seniors.
            </p>
          </div>
        </div>

        {/* Right Column: Login Form */}
        <div className="flex h-full items-center justify-center overflow-y-auto bg-white px-6 sm:px-12 py-8">
          <div className="w-full max-w-md">
            {/* Merabetta Brand Logo */}
            <div className="mb-6 flex justify-start">
              <Image
                src="/Images/logo.svg"
                alt="Merabetta"
                width={116}
                height={88}
                priority
                className="h-16 w-auto object-contain"
              />
            </div>

            {/* Title & Subtitle */}
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Welcome to Merabetta
            </h2>
            <p className="mb-8 mt-2 text-sm sm:text-base text-gray-500">
              Login to your account to continue
            </p>

            {/* Error Message Alert */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 animate-in fade-in"
              >
                {errorMessage}
              </div>
            )}

            {/* Form */}
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Email Input */}
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-2 block text-sm font-medium text-gray-900"
                >
                  Email ID
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your work email"
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 outline-none transition focus:border-[#F47C35] focus:bg-white focus:ring-2 focus:ring-[#F47C35]/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor="login-password"
                  className="mb-2 block text-sm font-medium text-gray-900"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    disabled={isSubmitting}
                    className="h-12 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 pr-11 text-sm text-gray-900 outline-none transition focus:border-[#F47C35] focus:bg-white focus:ring-2 focus:ring-[#F47C35]/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={isSubmitting}
                    className="absolute right-3.5 top-3.5 cursor-pointer text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Keep me signed in & Forgot Password */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={keepMeSignedIn}
                    onChange={(e) => setKeepMeSignedIn(e.target.checked)}
                    disabled={isSubmitting}
                    className="h-4 w-4 rounded border-gray-300 text-[#F47C35] accent-[#F47C35] cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span>Keep me signed in</span>
                </label>
                <button
                  type="button"
                  onClick={() => alert('Please contact system administrator to reset password.')}
                  disabled={isSubmitting}
                  className="text-sm font-medium text-[#6C63FF] hover:underline cursor-pointer disabled:opacity-60"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full rounded-lg bg-[#F47C35] font-semibold text-white shadow-xs transition hover:bg-[#eb6e24] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Signing you in...</span>
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </form>

            {/* Quick Credentials Info Card */}
            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-600 space-y-3">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                <KeyRound size={14} className="text-[#F47C35]" />
                <span>Demo Credentials (Click to fill)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Admin button */}
                <button
                  type="button"
                  onClick={() => fillCredentials('admin')}
                  className="text-left p-2.5 bg-white rounded-lg border border-slate-200 hover:border-[#F47C35] hover:bg-orange-50/40 transition cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 group-hover:text-[#F47C35]">
                    <ShieldCheck size={14} />
                    <span>Admin</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 font-mono">
                    admin@merabetta.com
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Admin@123
                  </p>
                </button>

                {/* Super Admin button */}
                <button
                  type="button"
                  onClick={() => fillCredentials('superadmin')}
                  className="text-left p-2.5 bg-white rounded-lg border border-slate-200 hover:border-[#F47C35] hover:bg-orange-50/40 transition cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 group-hover:text-[#F47C35]">
                    <ShieldCheck size={14} className="text-purple-600" />
                    <span>Super Admin</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 font-mono">
                    superadmin@merabetta.com
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    SuperAdmin@123
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
