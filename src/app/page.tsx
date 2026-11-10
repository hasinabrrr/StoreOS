"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/shared/Sidebar";
import { TopHeader } from "@/components/shared/TopHeader";
import {
  TrendingUp,
  Package,
  Users,
  CreditCard,
  ArrowUpRight,
  Plus,
  ShoppingCart,
  UserPlus,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { seedInitialDemoData } from "@/lib/db/dexie/seed";
import { db } from "@/lib/db/dexie/schema";
import { formatBDT } from "@/lib/domain/money";
import { getBusinessId, getUserName } from "@/lib/auth/context";
import type { Product, SalesInvoice, Customer } from "@/lib/db/types";

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const businessId = getBusinessId();
  const ownerName = getUserName();

  const loadData = useCallback(async () => {
    await seedInitialDemoData();

    const p = await db.products.filter((prod) => prod.businessId === businessId).toArray();
    const inv = await db.salesInvoices.filter((i) => i.businessId === businessId).toArray();
    const c = await db.customers.filter((cust) => cust.businessId === businessId).toArray();

    setProducts(p);
    setInvoices(inv);
    setAllCustomers(c);
    setIsLoading(false);
  }, [businessId]);

  useEffect(() => {
    loadData();

    // Listen for Dexie changes to auto-refresh dashboard
    const onCreating = () => {
      setTimeout(loadData, 200);
    };
    db.salesInvoices.hook("creating", onCreating);

    return () => {
      db.salesInvoices.hook("creating").unsubscribe(onCreating);
    };
  }, [loadData]);

  // Date and Time-sensitive KPIs stored in state to satisfy Next.js client prerender rules
  const [todayDate, setTodayDate] = useState("");
  const [todaysSalesMinor, setTodaysSalesMinor] = useState(0);
  const [todaysInvoicesCount, setTodaysInvoicesCount] = useState(0);
  const [todaysExpensesMinor, setTodaysExpensesMinor] = useState(0);
  const [salesByDay, setSalesByDay] = useState<{ day: string; totalMinor: number }[]>([]);

  useEffect(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    setTodayDate(now.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }));

    const todayInvs = invoices.filter((i) => i.createdAt.slice(0, 10) === todayStr);
    setTodaysSalesMinor(todayInvs.reduce((sum, i) => sum + i.totalMinor, 0));
    setTodaysInvoicesCount(todayInvs.length);

    // 7-day chart series
    const chartDays: { day: string; totalMinor: number }[] = [];
    for (let d = 6; d >= 0; d--) {
      const dObj = new Date(now);
      dObj.setDate(dObj.getDate() - d);
      const dStr = dObj.toISOString().slice(0, 10);
      const label = dObj.toLocaleDateString("en", { month: "short", day: "numeric" });
      const total = invoices
        .filter((i) => i.createdAt.slice(0, 10) === dStr)
        .reduce((sum, i) => sum + i.totalMinor, 0);
      chartDays.push({ day: label, totalMinor: total });
    }
    setSalesByDay(chartDays);

    async function loadExpenses() {
      const expenses = await db.expenses
        .filter((e) => e.businessId === businessId && e.createdAt.slice(0, 10) === todayStr)
        .toArray();
      setTodaysExpensesMinor(expenses.reduce((sum, e) => sum + e.amountMinor, 0));
    }
    loadExpenses();
  }, [invoices, businessId]);

  // Computed KPIs
  const lowStockItems = products.filter((p) => p.currentStock <= p.lowStockThreshold);
  const totalDueMinor = allCustomers.reduce((sum, c) => sum + c.totalDueMinor, 0);
  const customersWithDue = allCustomers.filter((c) => c.totalDueMinor > 0).length;
  const maxDaySales = Math.max(...salesByDay.map((d) => d.totalMinor), 1);
  const todaysProfitMinor = todaysSalesMinor - todaysExpensesMinor;
  const recentInvoices = [...invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopHeader />

        <main className="p-8 space-y-6">
          {/* Welcome Banner */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Welcome back, {ownerName.split(" ")[0]}! Here&apos;s what&apos;s happening with your store today.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 shadow-sm">
              <span>📅</span>
              <span>Today ({todayDate})</span>
            </div>
          </div>

          {/* Top 4 KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Today's Sales */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Today&apos;s Sales</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{formatBDT(todaysSalesMinor)}</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>{todaysInvoicesCount} invoice{todaysInvoicesCount !== 1 ? "s" : ""} today</span>
              </div>
            </div>

            {/* Total Products */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Products</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{products.length}</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Low Stock: {lowStockItems.length}</span>
              </div>
            </div>

            {/* Total Customers */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Customers</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{allCustomers.length}</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>{customersWithDue} with outstanding dues</span>
              </div>
            </div>

            {/* Total Due */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Due</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{formatBDT(totalDueMinor)}</span>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                From <span className="font-medium text-slate-700">{customersWithDue} customer{customersWithDue !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>

          {/* Grid: Sales Analytics + Today's Summary & Low Stock */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Sales Overview</h3>
                  <p className="text-xs text-slate-500">Last 7 days</p>
                </div>
              </div>

              <div className="h-56 w-full flex items-end gap-3 pt-6 pb-2 border-b border-slate-100 px-2">
                {salesByDay.map((item) => (
                  <div key={item.day} className="flex-1 flex flex-col items-center gap-2 group">
                    <div
                      style={{ height: `${Math.max(4, (item.totalMinor / maxDaySales) * 160)}px` }}
                      className="w-full bg-blue-500/20 group-hover:bg-blue-600 transition-all rounded-t-md relative flex items-start justify-center"
                    >
                      <span className="opacity-0 group-hover:opacity-100 text-[10px] bg-slate-900 text-white px-1.5 py-0.5 rounded -top-6 absolute transition-all">
                        {formatBDT(item.totalMinor)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Summary + Quick Actions */}
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Today&apos;s Summary</h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Sales</span>
                    <span className="font-semibold text-slate-900">{formatBDT(todaysSalesMinor)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Expenses</span>
                    <span className="font-semibold text-rose-500">{formatBDT(todaysExpensesMinor)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 font-bold text-slate-900">
                    <span>Net Profit</span>
                    <span className={todaysProfitMinor >= 0 ? "text-emerald-600" : "text-rose-600"}>
                      {formatBDT(todaysProfitMinor)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/pos"
                    className="flex items-center justify-center gap-2 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors text-center"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>New Sale (POS)</span>
                  </Link>
                  <Link
                    href="/products"
                    className="flex items-center justify-center gap-2 p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors text-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Product</span>
                  </Link>
                  <Link
                    href="/customers"
                    className="flex items-center justify-center gap-2 p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors text-center"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Customer</span>
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center justify-center gap-2 p-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors text-center"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Settings</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Lower Section: Recent Sales + Low Stock Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Recent Sales</h3>
                <Link href="/sales" className="text-xs text-blue-600 font-medium hover:underline">View All →</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-medium">
                      <th className="pb-2">Invoice</th>
                      <th className="pb-2">Customer</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">No sales yet. Start selling from POS!</td>
                      </tr>
                    ) : (
                      recentInvoices.map((inv) => (
                        <tr key={inv.localId} className="hover:bg-slate-50/50">
                          <td className="py-2.5 font-medium text-slate-900">{inv.invoiceNo}</td>
                          <td className="py-2.5 text-slate-600">{inv.customerName || "walk-in"}</td>
                          <td className="py-2.5 font-medium text-slate-900">{formatBDT(inv.totalMinor)}</td>
                          <td className="py-2.5 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                inv.status === "paid"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : inv.status === "void"
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Low Stock Products</h3>
                <Link href="/inventory" className="text-xs text-blue-600 font-medium hover:underline">View All →</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-medium">
                      <th className="pb-2">Product</th>
                      <th className="pb-2">Stock</th>
                      <th className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lowStockItems.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-slate-400">All products are well-stocked!</td>
                      </tr>
                    ) : (
                      lowStockItems.map((prod) => (
                        <tr key={prod.localId} className="hover:bg-slate-50/50">
                          <td className="py-2.5 font-medium text-slate-900">{prod.name}</td>
                          <td className="py-2.5 text-rose-600 font-semibold">{prod.currentStock} {prod.unit}</td>
                          <td className="py-2.5 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700">
                              Low
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
