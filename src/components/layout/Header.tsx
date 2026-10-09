'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileOutput, Bell } from 'lucide-react';

interface HeaderProps {
  collapsed: boolean;
}

const routeTitles: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/admin/admins': 'Admin Management',
  '/admin/admins/createAdmin': 'Admin Management',
  '/admin/users': 'User Management',
  '/admin/products': 'Product Management',
  '/admin/products/add': 'Product Management',
  '/admin/categories': 'Category Management',
  '/admin/brands': 'Brand Management',
  '/admin/product-variants': 'Product Variants',
  '/admin/warehouses': 'Warehouse Management',
  '/admin/orders': 'Order Management',
  '/admin/returns': 'Return Management',
  '/admin/replacements': 'Replacement Management',
  '/admin/cancellations': 'Cancellation Management',
  '/admin/payments': 'Payment Management',
  '/admin/pincode-delivery': 'Pincode & Delivery Configuration',
  '/admin/cms': 'Content Management',
  '/admin/notifications': 'Notification Management',
  '/admin/coupons': 'Coupon Management',
  '/admin/reports': 'System Reports',
  '/admin/profile': 'Profile Settings',
};

export default function Header({ collapsed }: HeaderProps) {
  const pathname = usePathname();

  const title = routeTitles[pathname] || 'Admin Portal';
  const subtitle = pathname.replace(/^\//, '').replace(/\//g, ' / ');

  return (
    <header
      className={`fixed top-0 right-0 z-30 flex h-[66px] items-center justify-between border-b border-[#ECECEC] bg-white px-6 shadow-[0_2px_6px_rgba(15,23,42,0.04)] transition-[left] duration-300 ${
        collapsed ? 'left-[86px]' : 'left-[278px]'
      }`}
    >
      <div>
        <h1 className="leading-tight font-semibold text-black text-[20px]">
          {title}
        </h1>
        <p className="mt-0.5 text-[11px] font-normal text-[#747474]">
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* System Reports button */}
        <Link
          href="/admin/reports"
          className="flex h-11 items-center gap-2 rounded-lg bg-[#F47C35] px-4 text-[14px] font-semibold text-white shadow-xs transition hover:bg-[#E96F29]"
        >
          <FileOutput size={18} strokeWidth={1.8} />
          <span>System Reports</span>
        </Link>

        {/* Notifications button */}
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#D8DEE7] text-[#0B294E] shadow-[0_3px_7px_rgba(15,23,42,0.10)] transition hover:bg-gray-50 cursor-pointer"
        >
          <Bell size={19} strokeWidth={1.7} />
        </button>
      </div>
    </header>
  );
}
