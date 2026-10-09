'use client';

import React, { useState, useMemo } from 'react';
import SummaryCards from '@/components/dashboard/SummaryCards';
import UsersProductsSection from '@/components/dashboard/UsersProductsSection';
import OrdersCancelledSection from '@/components/dashboard/OrdersCancelledSection';
import ErrorAlert from '@/components/dashboard/ErrorAlert';
import {
  initialDashboardSummary,
  initialUsersAndProductsData,
  initialOrdersAndCancelledData,
} from '@/data/mockData';
import {
  DashboardSummary,
  UsersAndProductsData,
  OrdersAndCancelledData,
} from '@/types/dashboard';

export default function AdminDashboardPage() {
  const currentYear = new Date().getFullYear();
  const defaultDateRange = useMemo(
    () => ({
      fromDate: `${currentYear}-01-01`,
      toDate: `${currentYear}-12-31`,
    }),
    [currentYear]
  );

  const [summary] = useState<DashboardSummary>(initialDashboardSummary);
  const [usersProductsData, setUsersProductsData] =
    useState<UsersAndProductsData>(initialUsersAndProductsData);
  const [ordersCancelledData, setOrdersCancelledData] =
    useState<OrdersAndCancelledData>(initialOrdersAndCancelledData);

  const [usersDateRange, setUsersDateRange] = useState(defaultDateRange);
  const [ordersDateRange, setOrdersDateRange] = useState(defaultDateRange);

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Handle date range change for Users & Products
  const handleApplyUsersDates = (from: string, to: string) => {
    setLoadingUsers(true);
    setUsersDateRange({ fromDate: from, toDate: to });

    setTimeout(() => {
      // Simulate dynamic data recalculation based on date range
      const factor = from === to ? 0.2 : 0.8 + Math.random() * 0.4;
      setUsersProductsData((prev) => ({
        ...prev,
        totalUsers: {
          ...prev.totalUsers,
          value: Math.round(initialUsersAndProductsData.totalUsers.value * factor),
        },
        totalProducts: {
          ...prev.totalProducts,
          value: Math.round(initialUsersAndProductsData.totalProducts.value * factor),
        },
        monthlyData: initialUsersAndProductsData.monthlyData.map((d) => ({
          ...d,
          users: Math.round(d.users * factor),
          products: Math.round(d.products * factor),
        })),
      }));
      setLoadingUsers(false);
    }, 400);
  };

  // Handle date range change for Orders & Cancelled
  const handleApplyOrdersDates = (from: string, to: string) => {
    setLoadingOrders(true);
    setOrdersDateRange({ fromDate: from, toDate: to });

    setTimeout(() => {
      // Simulate dynamic data recalculation based on date range
      const factor = from === to ? 0.2 : 0.8 + Math.random() * 0.4;
      setOrdersCancelledData((prev) => ({
        ...prev,
        totalOrders: {
          ...prev.totalOrders,
          value: Math.round(initialOrdersAndCancelledData.totalOrders.value * factor),
        },
        cancelledOrders: {
          ...prev.cancelledOrders,
          value: Math.round(initialOrdersAndCancelledData.cancelledOrders.value * factor),
        },
        monthlyData: initialOrdersAndCancelledData.monthlyData.map((d) => ({
          ...d,
          orders: Math.round(d.orders * factor),
          cancelledOrders: Math.round(d.cancelledOrders * factor),
        })),
      }));
      setLoadingOrders(false);
    }, 400);
  };

  return (
    <div className="space-y-7">
      {/* Optional Error Alert */}
      {errorMessage && (
        <ErrorAlert
          message={errorMessage}
          onRetry={() => {
            setErrorMessage('');
            setLoadingUsers(false);
            setLoadingOrders(false);
          }}
        />
      )}

      {/* 8 Metric KPI Summary Cards */}
      <SummaryCards summary={summary} loading={false} />

      {/* Total Users & Products Section */}
      <UsersProductsSection
        data={usersProductsData}
        fromDate={usersDateRange.fromDate}
        toDate={usersDateRange.toDate}
        onApplyDates={handleApplyUsersDates}
        loading={loadingUsers}
      />

      {/* Total Orders & Cancelled Section */}
      <OrdersCancelledSection
        data={ordersCancelledData}
        fromDate={ordersDateRange.fromDate}
        toDate={ordersDateRange.toDate}
        onApplyDates={handleApplyOrdersDates}
        loading={loadingOrders}
      />
    </div>
  );
}
