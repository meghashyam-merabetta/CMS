'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  House,
  ShieldUser,
  UsersRound,
  Box,
  PackageCheck,
  CreditCard,
  MapPinCheckInside,
  FilePenLine,
  BellDot,
  Tag,
  ScrollText,
  FolderPlus,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  LogOut,
  LucideIcon,
  FlaskConical,
  TestTube,
} from 'lucide-react';
import { sidebarNavItems } from '@/data/mockData';
import { NavItem } from '@/types/dashboard';
import { useAuth } from '@/contexts/AuthContext';
import LogoutModal from './LogoutModal';

// Map icon string names to actual Lucide component
const iconMap: Record<string, LucideIcon> = {
  House,
  ShieldUser,
  UsersRound,
  Box,
  PackageCheck,
  CreditCard,
  MapPinCheckInside,
  FilePenLine,
  BellDot,
  Tag,
  ScrollText,
  FolderPlus,
  MessageSquare,
  FlaskConical,
  TestTube,
};

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    ADMIN_MANAGEMENT: true,
    PRODUCT_MANAGEMENT: false,
    ORDER_MANAGEMENT: false,
    LAB_MANAGEMENT: false,
  });
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isRouteActive = (item: NavItem) => {
    if (item.activeRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
      return true;
    }
    if (item.children) {
      return item.children.some((child) =>
        child.activeRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
      );
    }
    return false;
  };

  // Auto-expand parent accordion when navigating to a child route
  useEffect(() => {
    setExpandedMenus((prev) => {
      const updated = { ...prev };
      sidebarNavItems.forEach((item) => {
        if (item.children && item.children.length > 0 && isRouteActive(item)) {
          updated[item.id] = true;
        }
      });
      return updated;
    });
  }, [pathname]);

  const toggleSubmenu = (id: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleParentClick = (item: NavItem) => {
    toggleSubmenu(item.id);
    if (!pathname.startsWith(item.href)) {
      router.push(item.href);
    }
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
    router.replace('/login');
  };

  const displayName = mounted && user?.name ? user.name : 'Super Admin';
  const displayEmail = mounted && user?.email ? user.email : 'superadmin@merabetta.com';
  const displayInitial = displayName.trim().charAt(0).toUpperCase() || 'S';
  const isSuperAdmin = mounted && user ? user.role === 'SUPER_ADMIN' : true;

  return (
    <>
      <div className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-[#FCF6FF] text-[#4A4A4A] border border-[#f0e2f5] shadow-xs select-none">
        {/* Top Header / Logo + Collapse Button */}
        <div
          className={`flex items-center pt-5 pb-4 ${
            collapsed ? 'justify-center px-2' : 'justify-between px-5'
          }`}
        >
          {!collapsed && (
            <Link href="/admin/dashboard" className="flex items-center">
              <Image
                src="/Images/logo.svg"
                alt="Merabetta"
                width={116}
                height={88}
                priority
                className="h-[46px] w-[78px] object-contain"
              />
            </Link>
          )}

          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex h-7 w-7 shrink-0 items-center justify-center text-[#F47C35] hover:bg-orange-50/60 rounded-md transition-all cursor-pointer p-0"
          >
            <div className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}>
              <Image
                src="/Images/panel.svg"
                alt="Toggle Sidebar"
                width={14}
                height={14}
              />
            </div>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav
          aria-label="Admin modules"
          className="flex-1 flex flex-col py-2 overflow-y-auto scrollbar-thin"
        >
          {sidebarNavItems.map((item) => {
            const Icon = iconMap[item.icon] || House;
            const active = isRouteActive(item);
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = !!expandedMenus[item.id];

            const itemClass = `flex min-h-[39px] w-full items-center gap-3 py-2 text-left text-[13px] font-normal transition-colors cursor-pointer ${
              active
                ? 'bg-[#DEC3EA] text-[#4A4A4A] font-medium'
                : 'hover:bg-white/45 text-[#4A4A4A]'
            } ${collapsed ? 'justify-center px-2' : 'px-5'}`;

            return (
              <div key={item.id} className="w-full">
                {hasChildren && !collapsed ? (
                  <button
                    type="button"
                    onClick={() => handleParentClick(item)}
                    aria-expanded={isExpanded}
                    className={itemClass}
                  >
                    <Icon size={16} strokeWidth={1.55} className="shrink-0 text-[#747474]" />
                    <span className="min-w-0 flex-1 truncate leading-tight text-left">
                      {item.title}
                    </span>
                    {isExpanded ? (
                      <ChevronDown size={13} strokeWidth={2.2} className="shrink-0 text-[#747474]" />
                    ) : (
                      <ChevronRight size={13} strokeWidth={2.2} className="shrink-0 text-[#747474]" />
                    )}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    title={collapsed ? item.title : undefined}
                    className={itemClass}
                  >
                    <Icon size={16} strokeWidth={1.55} className="shrink-0 text-[#747474]" />
                    {!collapsed && (
                      <span className="min-w-0 flex-1 truncate leading-tight">
                        {item.title}
                      </span>
                    )}
                  </Link>
                )}

                {/* Submenu Dropdown */}
                {!collapsed && hasChildren && isExpanded && (
                  <div className="py-1">
                    {item.children!.map((child) => {
                      const ChildIcon = iconMap[child.icon] || PackageCheck;
                      const childActive = pathname === child.href;

                      return (
                        <Link
                          key={child.id}
                          href={child.href}
                          className={`flex min-h-[34px] items-center gap-3 py-1.5 pr-4 pl-10 text-[12px] transition-colors cursor-pointer ${
                            childActive
                              ? 'bg-[#EADAF2] text-[#4A4A4A] font-medium'
                              : 'hover:bg-white/45 text-[#5A5A5A]'
                          }`}
                        >
                          <ChildIcon size={13} strokeWidth={1.5} className="shrink-0 text-[#858585]" />
                          <span className="min-w-0 flex-1 truncate">{child.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Profile & Logout at Bottom */}
        <div
          className={`flex items-center pt-4 pb-4 border-t border-[#f0e2f5]/80 ${
            collapsed ? 'justify-center px-2 flex-col gap-2' : 'justify-between px-5'
          }`}
        >
          <Link
            href="/admin/profile"
            title={collapsed ? displayName : undefined}
            className={`flex items-center gap-3 text-black transition-colors hover:opacity-85 ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white shadow-xs ${
                isSuperAdmin ? 'bg-purple-600' : 'bg-[#F47C35]'
              }`}
            >
              {displayInitial}
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-semibold text-[#1F2937] hover:underline">
                    {displayName}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                      isSuperAdmin
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-orange-100 text-[#F47C35] border border-orange-200'
                    }`}
                  >
                    {isSuperAdmin ? 'Super' : 'Admin'}
                  </span>
                </div>
                <span className="truncate text-[11px] text-[#747474]">
                  {displayEmail}
                </span>
              </div>
            )}
          </Link>

          {!collapsed && (
            <button
              type="button"
              title="Logout"
              onClick={() => setIsLogoutModalOpen(true)}
              aria-label="Logout"
              className="flex h-8 w-8 shrink-0 items-center justify-center text-[#F47C35] hover:bg-white/60 rounded-md transition-all cursor-pointer p-0"
            >
              <LogOut size={16} strokeWidth={1.6} className="text-[#747474] hover:text-[#F47C35]" />
            </button>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}
