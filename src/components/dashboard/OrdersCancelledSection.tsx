'use client';

import React from 'react';
import { PackageCheck, XCircle } from 'lucide-react';
import { OrdersAndCancelledData } from '@/types/dashboard';
import DateRangePicker from './DateRangePicker';
import MetricComparisonCard from './MetricComparisonCard';
import BarChartComponent from './BarChartComponent';

interface OrdersCancelledSectionProps {
  data: OrdersAndCancelledData;
  fromDate: string;
  toDate: string;
  onApplyDates: (from: string, to: string) => void;
  loading?: boolean;
}

export default function OrdersCancelledSection({
  data,
  fromDate,
  toDate,
  onApplyDates,
  loading = false,
}: OrdersCancelledSectionProps) {
  return (
    <section className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      {/* Header with Title and DateRangePicker */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-semibold text-black">
            Total Orders & Cancelled
          </h2>
          <p className="mt-1 text-[14px] font-medium text-[#536A88]">
            Overview of total orders and cancelled orders over time.
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
          title="Total Orders"
          metric={data.totalOrders}
          icon={PackageCheck}
        />
        <MetricComparisonCard
          title="Cancelled Orders"
          metric={data.cancelledOrders}
          icon={XCircle}
        />
      </div>

      {/* Monthly Bar Chart */}
      <div
        className="relative mt-6"
        aria-label="Monthly orders and cancelled orders chart"
      >
        <BarChartComponent
          data={data.monthlyData}
          series1={{
            key: 'orders',
            label: 'Orders',
            color: '#7267B3',
          }}
          series2={{
            key: 'cancelledOrders',
            label: 'Cancelled',
            color: '#E3C9F0',
          }}
        />
      </div>
    </section>
  );
}
