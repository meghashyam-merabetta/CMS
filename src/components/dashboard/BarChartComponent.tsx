'use client';

import React, { useState } from 'react';
import { MonthlyDataPoint } from '@/types/dashboard';

interface BarChartComponentProps {
  data: MonthlyDataPoint[];
  series1: {
    key: 'users' | 'orders';
    label: string;
    color: string; // #7267B3
  };
  series2: {
    key: 'products' | 'cancelledOrders';
    label: string;
    color: string; // #E3C9F0
  };
}

const compactFormatter = new Intl.NumberFormat('en-IN', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const standardFormatter = new Intl.NumberFormat('en-IN');

export default function BarChartComponent({
  data,
  series1,
  series2,
}: BarChartComponentProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Calculate highest value for Y-Axis scale
  const allValues = data.flatMap((d) => [
    Number(d[series1.key] || 0),
    Number(d[series2.key] || 0),
  ]);
  const rawMax = Math.max(...allValues, 10);
  // Round up to clean multiple (e.g. 500, 1000, 2500)
  const magnitude = 10 ** Math.floor(Math.log10(rawMax));
  const maxVal = Math.max(10, Math.ceil(rawMax / magnitude) * magnitude);

  // Y-axis 5 ticks (0, 25%, 50%, 75%, 100%)
  const yTicks = [
    maxVal,
    Math.round(maxVal * 0.75),
    Math.round(maxVal * 0.5),
    Math.round(maxVal * 0.25),
    0,
  ];

  const chartHeight = 240;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 35;
  const usableHeight = chartHeight - paddingTop - paddingBottom;

  return (
    <div className="relative w-full pt-4">
      {/* SVG Chart */}
      <div className="w-full overflow-x-auto overflow-y-hidden">
        <svg
          viewBox={`0 0 950 ${chartHeight}`}
          className="w-full min-w-[700px] h-[260px] select-none"
        >
          {/* Grid lines (horizontal only, #EDF0F4) */}
          {yTicks.map((tick, i) => {
            const y = paddingTop + (i / (yTicks.length - 1)) * usableHeight;
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={950 - paddingRight}
                  y2={y}
                  stroke="#EDF0F4"
                  strokeWidth="1"
                />
                {/* Y-axis tick label */}
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#536A88"
                  fontSize="12"
                  fontWeight="400"
                >
                  {compactFormatter.format(tick)}
                </text>
              </g>
            );
          })}

          {/* Monthly Bars */}
          {data.map((item, idx) => {
            const totalWidth = 950 - paddingLeft - paddingRight;
            const slotWidth = totalWidth / data.length;
            const slotX = paddingLeft + idx * slotWidth;

            const val1 = Number(item[series1.key] || 0);
            const val2 = Number(item[series2.key] || 0);

            const bar1Height = (val1 / maxVal) * usableHeight;
            const bar2Height = (val2 / maxVal) * usableHeight;

            const barWidth = 14;
            const barGap = 4;
            const groupWidth = barWidth * 2 + barGap;
            const groupX = slotX + (slotWidth - groupWidth) / 2;

            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={item.month}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                {/* Hover Background Column */}
                {isHovered && (
                  <rect
                    x={slotX + 4}
                    y={paddingTop}
                    width={slotWidth - 8}
                    height={usableHeight}
                    fill="#F8F5FA"
                    rx="4"
                  />
                )}

                {/* Series 1 Bar */}
                <rect
                  x={groupX}
                  y={paddingTop + usableHeight - bar1Height}
                  width={barWidth}
                  height={Math.max(bar1Height, 2)}
                  fill={series1.color}
                  rx="2"
                  ry="2"
                  className="transition-all duration-200"
                />

                {/* Series 2 Bar */}
                <rect
                  x={groupX + barWidth + barGap}
                  y={paddingTop + usableHeight - bar2Height}
                  width={barWidth}
                  height={Math.max(bar2Height, 2)}
                  fill={series2.color}
                  rx="2"
                  ry="2"
                  className="transition-all duration-200"
                />

                {/* Month Label (X-Axis) */}
                <text
                  x={slotX + slotWidth / 2}
                  y={paddingTop + usableHeight + 22}
                  textAnchor="middle"
                  fill={isHovered ? '#0D2B53' : '#20252D'}
                  fontSize="12.5"
                  fontWeight={isHovered ? '600' : '400'}
                >
                  {item.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Floating Tooltip */}
      {hoveredIndex !== null && data[hoveredIndex] && (
        <div
          className="absolute z-20 pointer-events-none rounded-xl border border-[#E9E2ED] bg-white/95 backdrop-blur-xs p-3 shadow-lg text-xs"
          style={{
            top: '20px',
            left: `${Math.min(
              85,
              Math.max(10, ((hoveredIndex + 0.5) / data.length) * 100)
            )}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <p className="font-bold text-[#0D2B53] pb-1.5 border-b border-gray-100">
            {data[hoveredIndex].month}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="w-2.5 h-2.5 rounded-xs shrink-0"
              style={{ backgroundColor: series1.color }}
            />
            <span className="text-gray-600">{series1.label}:</span>
            <span className="font-semibold text-gray-900 ml-auto">
              {standardFormatter.format(Number(data[hoveredIndex][series1.key]))}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="w-2.5 h-2.5 rounded-xs shrink-0"
              style={{ backgroundColor: series2.color }}
            />
            <span className="text-gray-600">{series2.label}:</span>
            <span className="font-semibold text-gray-900 ml-auto">
              {standardFormatter.format(Number(data[hoveredIndex][series2.key]))}
            </span>
          </div>
        </div>
      )}

      {/* Chart Legend */}
      <div className="flex items-center justify-center gap-6 pt-3 text-[13px] font-medium text-[#536A88]">
        <div className="flex items-center gap-2">
          <span
            className="w-3.5 h-3.5 rounded-xs"
            style={{ backgroundColor: series1.color }}
          />
          <span>{series1.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-3.5 h-3.5 rounded-xs"
            style={{ backgroundColor: series2.color }}
          />
          <span>{series2.label}</span>
        </div>
      </div>
    </div>
  );
}
