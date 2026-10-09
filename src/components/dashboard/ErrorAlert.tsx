'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
  onRetry: () => void;
}

export default function ErrorAlert({ message, onRetry }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F1C8BE] bg-[#FFF7F4] px-4 py-3 text-[13px] text-[#B43D25]"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D5482C] px-3 font-semibold hover:bg-orange-100/50 transition cursor-pointer"
      >
        <RefreshCw aria-hidden="true" size={14} />
        <span>Retry</span>
      </button>
    </div>
  );
}
