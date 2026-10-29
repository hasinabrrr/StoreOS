"use client";

import { useEffect, useState } from "react";
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
import type { Product, SalesInvoice } from "@/lib/db/types";

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [customerCount, setCustomerCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      await seedInitialDemoData();
      const p = await db.products.toArray();
      const inv = await db.salesInvoices.toArray();
      const c = await db.customers.count();
      setProducts(p);
      setInvoices(inv);
      setCustomerCount(c);
    }
    loadData();
  }, []);

  const lowStockItems = products.filter((p) => p.currentStock <= p.lowStockThreshold);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopHeader />

        <main className="p-8 space-y-6">
          {/* Welcome Banner */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Welcome back, John! Here&apos;s what&apos;s happening with your store today.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 shadow-sm">
              <span>📅</span>
              <span>Today (Apr 26, 2025)</span>
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
                <span className="text-2xl font-bold text-slate-900">৳ 24,850</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>12%</span>
                <span className="text-slate-400 font-normal">vs yesterday (৳ 22,130)</span>
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
                <span className="text-2xl font-bold text-slate-900">{products.length || 156}</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Low Stock: {lowStockItems.length || 6}</span>
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
                <span className="text-2xl font-bold text-slate-900">{customerCount || 48}</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>5%</span>
                <span className="text-slate-400 font-normal">New Today: 3</span>
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
                <span className="text-2xl font-bold text-slate-900">৳ 8,750</span>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                From <span className="font-medium text-slate-700">7 customers</span>
              </div>
            </div>
          </div>

          {/* Grid: Sales Analytics + Today's Summary & Low Stock */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Chart Container */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Sales Overview</h3>
                  <p className="text-xs text-slate-500">Apr 20 - Apr 26, 2025</p>
                </div>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                  <button className="px-3 py-1 bg-blue-600 text-white rounded font-medium shadow-xs">
                    Sales
                  </button>
                  <button className="px-3 py-1 text-slate-600 hover:text-slate-900 rounded font-medium">
                    Profit
                  </button>
                </div>
              </div>

              {/* Simplified Visual Trend Graph */}
              <div className="h-56 w-full flex items-end gap-3 pt-6 pb-2 border-b border-slate-100 px-2">
                {[
                  { day: "Apr 20", val: 30 },
                  { day: "Apr 21", val: 42 },
                  { day: "Apr 22", val: 55 },
                  { day: "Apr 23", val: 48 },
                  { day: "Apr 24", val: 65 },
                  { day: "Apr 25", val: 58 },
                  { day: "Apr 26", val: 82 },
                ].map((item) => (
                  <div key={item.day} className="flex-1 flex flex-col items-center gap-2 group">
                    <div
                      style={{ height: `${item.val * 2}px` }}
                      className="w-full bg-blue-500/20 group-hover:bg-blue-600 transition-all rounded-t-md relative flex items-start justify-center"
                    >
                      <span className="opacity-0 group-hover:opacity-100 text-[10px] bg-slate-900 text-white px-1.5 py-0.5 rounded -top-6 absolute transition-all">
                        {item.val * 350}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Summary + Quick Actions */}
            <div className="space-y-6">
              {/* Today's Summary Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Today&apos;s Summary</h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Sales</span>
                    <span className="font-semibold text-slate-900">৳ 24,850</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Profit</span>
                    <span className="font-semibold text-emerald-600">৳ 12,430</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Expenses</span>
                    <span className="font-semibold text-rose-500">৳ 3,200</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 font-bold text-slate-900">
                    <span>Net Profit</span>
                    <span>৳ 9,230</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
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
            {/* Recent Sales Table */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Recent Sales</h3>
                <button className="text-xs text-blue-600 font-medium hover:underline">View All →</button>
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
                    {invoices.map((inv) => (
                      <tr key={inv.localId} className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-medium text-slate-900">{inv.invoiceNo}</td>
                        <td className="py-2.5 text-slate-600">{inv.customerName || "walk-in"}</td>
                        <td className="py-2.5 font-medium text-slate-900">{formatBDT(inv.totalMinor)}</td>
                        <td className="py-2.5 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              inv.status === "paid"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Low Stock Alerts */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Low Stock Products</h3>
                <button className="text-xs text-blue-600 font-medium hover:underline">View All →</button>
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
                    {lowStockItems.map((prod) => (
                      <tr key={prod.localId} className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-medium text-slate-900">{prod.name}</td>
                        <td className="py-2.5 text-rose-600 font-semibold">{prod.currentStock} {prod.unit}</td>
                        <td className="py-2.5 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700">
                            Low
                          </span>
                        </td>
                      </tr>
                    ))}
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
