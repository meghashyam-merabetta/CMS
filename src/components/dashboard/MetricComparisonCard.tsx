'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, LucideIcon } from 'lucide-react';
import { MetricValue } from '@/types/dashboard';

interface MetricComparisonCardProps {
  title: string;
  metric: MetricValue;
  icon: LucideIcon;
}

const numberFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export default function MetricComparisonCard({
  title,
  metric,
  icon: Icon,
}: MetricComparisonCardProps) {
  const isUp = metric.trend === 'UP';
  const isDown = metric.trend === 'DOWN';

  const TrendIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  const trendColor = isUp
    ? 'text-[#25964B]'
    : isDown
    ? 'text-[#E04C2D]'
    : 'text-[#768399]';

  return (
    <div className="flex min-h-[118px] items-center justify-between rounded-xl border border-[#E9E2ED] bg-[#FCF8FD] px-6 py-5 sm:px-8">
      <div className="flex items-center gap-5 sm:gap-7">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#D7DEE7] bg-white text-[#0E2C52] shadow-2xs">
          <Icon aria-hidden="true" size={27} strokeWidth={1.7} />
        </div>
        <div>
          <p className="text-[14px] font-medium text-[#536A88]">{title}</p>
          <p className="mt-1 text-[24px] leading-none font-semibold text-[#0D2B53]">
            {numberFormatter.format(metric.value)}
          </p>
          <p className="mt-2 text-[12px] font-medium text-[#536A88]">
            {metric.comparison}
          </p>
        </div>
      </div>

      <span className={`inline-flex items-center gap-1 text-[12px] font-semibold ${trendColor}`}>
        <TrendIcon aria-hidden="true" size={14} />
        <span>{numberFormatter.format(Math.abs(metric.percentageChange))}%</span>
      </span>
    </div>
  );
}
