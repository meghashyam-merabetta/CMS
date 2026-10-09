'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Fixed Collapsible Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 p-1.5 transition-[width] duration-300 ${
          collapsed ? 'w-[86px]' : 'w-[278px]'
        }`}
      >
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
        />
      </aside>

      {/* Main Content Area */}
      <main
        className={`overflow-x-hidden transition-[margin] duration-300 min-h-screen px-6 pt-[90px] pb-8 ${
          collapsed ? 'ml-[86px]' : 'ml-[278px]'
        }`}
      >
        {/* Fixed Top Header */}
        <Header collapsed={collapsed} />

        {/* Page Children */}
        <div className="max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
