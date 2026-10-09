'use client';

import React from 'react';
import { DashboardSummary } from '@/types/dashboard';

interface SummaryCardsProps {
  summary: DashboardSummary | null;
  loading?: boolean;
}

const summaryConfig: Array<{
  key: keyof DashboardSummary;
  title: string;
  currency?: boolean;
}> = [
  { key: 'totalUsers', title: 'Total Users' },
  { key: 'totalProducts', title: 'Total Products' },
  { key: 'totalCancelProducts', title: 'Total Cancel Products' },
  { key: 'totalReturnProducts', title: 'Total Return Products' },
  { key: 'totalEarning', title: 'Total Earning', currency: true },
  { key: 'totalEvent', title: 'Total Event' },
  { key: 'totalReplacement', title: 'Total Replacement' },
  { key: 'totalInquiry', title: 'Total Inquiry' },
];

const numberFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export default function SummaryCards({ summary, loading = false }: SummaryCardsProps) {
  if (loading && !summary) {
    return (
      <section
        className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-4"
        aria-busy="true"
        aria-label="Dashboard summary loading"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="min-h-[104px] animate-pulse rounded-2xl border border-[#E6E9EE] bg-white px-7 py-5"
          >
            <div className="h-4 w-28 rounded bg-[#E8ECF1]" />
            <div className="mt-5 h-7 w-20 rounded bg-[#E8ECF1]" />
          </div>
        ))}
      </section>
    );
  }

  return (
    <section
      className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Dashboard summary"
    >
      {summaryConfig.map((item) => {
        const rawValue = summary?.[item.key]?.value ?? 0;
        const displayValue = item.currency
          ? currencyFormatter.format(rawValue)
          : numberFormatter.format(rawValue);

        return (
          <article
            key={item.key}
            className="min-h-[104px] rounded-2xl border border-[#DDE3EA] bg-white px-7 py-5 shadow-[0_2px_5px_rgba(15,23,42,0.04)] transition hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[14px] font-medium text-[#536A88]">
                {item.title}
              </p>
            </div>
            <p className="mt-4 text-[24px] leading-none font-semibold text-[#0D2B53]">
              {displayValue}
            </p>
          </article>
        );
      })}
    </section>
  );
}
