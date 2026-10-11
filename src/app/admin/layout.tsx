'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile sidebar automatically whenever navigating to a new route
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-xs transition-opacity lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Drawer on mobile, Collapsible on desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 p-1.5 transition-all duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'lg:w-[86px]' : 'lg:w-[278px]'} w-[278px] max-w-[85vw]`}
      >
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
        />
      </aside>

      {/* Main Content Area */}
      <main
        className={`overflow-x-hidden transition-[margin] duration-300 min-h-screen px-3 sm:px-6 pt-[82px] pb-8 ml-0 ${
          collapsed ? 'lg:ml-[86px]' : 'lg:ml-[278px]'
        }`}
      >
        {/* Fixed Top Header */}
        <Header
          collapsed={collapsed}
          onToggleMobile={() => setMobileOpen((prev) => !prev)}
        />

        {/* Page Children */}
        <div className="max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
