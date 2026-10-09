'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';

interface DateRangePickerProps {
  fromDate: string;
  toDate: string;
  disabled?: boolean;
  onApply: (from: string, to: string) => void;
}

function formatDateString(str: string): string {
  if (!str) return '';
  const parts = str.split('-');
  if (parts.length !== 3) return str;
  const [year, month, day] = parts;
  const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
  const monthName = dateObj.toLocaleString('en-GB', { month: 'short' });
  return `${day} ${monthName} ${year}`;
}

export default function DateRangePicker({
  fromDate,
  toDate,
  disabled = false,
  onApply,
}: DateRangePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState(fromDate);
  const [tempTo, setTempTo] = useState(toDate);

  const isInvalid = !!(tempFrom && tempTo && tempFrom > tempTo);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleOpen = () => {
    setTempFrom(fromDate);
    setTempTo(toDate);
    setIsOpen((prev) => !prev);
  };

  const handleApply = () => {
    if (tempFrom && tempTo && !isInvalid) {
      onApply(tempFrom, tempTo);
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={handleOpen}
        className="flex h-11 items-center gap-3 rounded-lg border border-[#D7DEE7] bg-white px-3.5 text-[13px] font-medium text-[#20252D] shadow-2xs hover:bg-slate-50 disabled:opacity-60 transition cursor-pointer"
      >
        <CalendarDays aria-hidden="true" size={18} className="text-[#536A88]" />
        <span>
          {formatDateString(fromDate)} - {formatDateString(toDate)}
        </span>
        <ChevronDown
          aria-hidden="true"
          size={15}
          className={`transition-transform duration-200 text-[#536A88] ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Dashboard date range"
          className="absolute top-13 right-0 z-30 w-[min(340px,calc(100vw-3rem))] rounded-xl border border-[#DDE3EA] bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.16)] animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="grid gap-3">
            <label className="text-[12px] font-medium text-[#536A88]">
              From date
              <input
                type="date"
                value={tempFrom}
                onChange={(e) => setTempFrom(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-lg border border-[#D7DEE7] bg-white px-3 text-[13px] text-[#20252D] focus:outline-none focus:ring-2 focus:ring-[#F47C35]/20 focus:border-[#F47C35]"
              />
            </label>

            <label className="text-[12px] font-medium text-[#536A88]">
              To date
              <input
                type="date"
                value={tempTo}
                onChange={(e) => setTempTo(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-lg border border-[#D7DEE7] bg-white px-3 text-[13px] text-[#20252D] focus:outline-none focus:ring-2 focus:ring-[#F47C35]/20 focus:border-[#F47C35]"
              />
            </label>
          </div>

          {isInvalid && (
            <p role="alert" className="mt-2 text-[11px] text-[#D5482C]">
              From date cannot be after To date.
            </p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-9 rounded-lg border border-[#D7DEE7] px-4 text-[12px] font-semibold text-[#536A88] hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!tempFrom || !tempTo || isInvalid}
              onClick={handleApply}
              className="h-9 rounded-lg bg-[#F47C35] px-4 text-[12px] font-semibold text-white shadow-xs hover:bg-[#E06D28] disabled:opacity-50 transition cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
