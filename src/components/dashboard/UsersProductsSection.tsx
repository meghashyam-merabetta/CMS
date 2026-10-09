'use client';

import React from 'react';
import { UsersRound, Box } from 'lucide-react';
import { UsersAndProductsData } from '@/types/dashboard';
import DateRangePicker from './DateRangePicker';
import MetricComparisonCard from './MetricComparisonCard';
import BarChartComponent from './BarChartComponent';

interface UsersProductsSectionProps {
  data: UsersAndProductsData;
  fromDate: string;
  toDate: string;
  onApplyDates: (from: string, to: string) => void;
  loading?: boolean;
}

export default function UsersProductsSection({
  data,
  fromDate,
  toDate,
  onApplyDates,
  loading = false,
}: UsersProductsSectionProps) {
  return (
    <section className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      {/* Header with Title and DateRangePicker */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-semibold text-black">
            Total Users & Products
          </h2>
          <p className="mt-1 text-[14px] font-medium text-[#536A88]">
            Overview of total users and products added over time.
          </p>
        </div>

        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          disabled={loading}
          onApply={onApplyDates}
        />
      </div>

      {/* Two Metric Comparison Sub-Cards */}
      <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">
        <MetricComparisonCard
          title="Total Users"
          metric={data.totalUsers}
          icon={UsersRound}
        />
        <MetricComparisonCard
          title="Total Products"
          metric={data.totalProducts}
          icon={Box}
        />
      </div>

      {/* Monthly Bar Chart */}
      <div
        className="relative mt-6"
        aria-label="Monthly users and products chart"
      >
        <BarChartComponent
          data={data.monthlyData}
          series1={{
            key: 'users',
            label: 'Users',
            color: '#7267B3',
          }}
          series2={{
            key: 'products',
            label: 'Products',
            color: '#E3C9F0',
          }}
        />
      </div>
    </section>
  );
}
