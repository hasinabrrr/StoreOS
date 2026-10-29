"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { TopHeader } from "@/components/shared/TopHeader";
import {
  FileBarChart,
  Calendar,
  Download,
  TrendingUp,
  CreditCard,
  DollarSign,
  Package,
} from "lucide-react";
import { db } from "@/lib/db/dexie/schema";
import { formatBDT } from "@/lib/domain/money";
import type { SalesInvoice, Product } from "@/lib/db/types";

export default function ReportsPage() {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedTab, setSelectedTab] = useState<"sales" | "profit" | "inventory" | "customers">(
    "sales"
  );

  useEffect(() => {
    async function loadData() {
      const inv = await db.salesInvoices.toArray();
      const p = await db.products.toArray();
      setInvoices(inv);
      setProducts(p);
    }
    loadData();
  }, []);

  const totalSalesMinor = invoices.reduce((sum, inv) => sum + inv.totalMinor, 0);
  const totalPaidMinor = invoices.reduce((sum, inv) => sum + inv.paidMinor, 0);
  const totalDueMinor = invoices.reduce((sum, inv) => sum + inv.dueMinor, 0);

  const exportCSV = () => {
    const headers = ["Invoice No", "Customer", "Total (BDT)", "Paid", "Due", "Status", "Date"];
    const rows = invoices.map((inv) => [
      inv.invoiceNo,
      inv.customerName || "Walk-in",
      (inv.totalMinor / 100).toFixed(2),
      (inv.paidMinor / 100).toFixed(2),
      (inv.dueMinor / 100).toFixed(2),
      inv.status,
      new Date(inv.createdAt).toLocaleDateString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `StoreOS_Sales_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopHeader />

        <main className="p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Financial performance, revenue, dues, and exportable statements.
              </p>
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Navigation Filter Tabs (Matching Mockup) */}
          <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-semibold w-fit">
            {(["sales", "profit", "inventory", "customers"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-4 py-1.5 rounded-lg capitalize transition-all ${
                  selectedTab === tab
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Gross Sales</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatBDT(totalSalesMinor)}</p>
              <p className="text-[11px] text-emerald-600 mt-2 font-medium">↑ 12% vs last week</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Total Collections</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{formatBDT(totalPaidMinor)}</p>
              <p className="text-[11px] text-slate-400 mt-2">Cash & Digital Payments</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Pending Dues</span>
              <p className="text-2xl font-bold text-rose-600 mt-1">{formatBDT(totalDueMinor)}</p>
              <p className="text-[11px] text-slate-400 mt-2">Outstanding from sales</p>
            </div>
          </div>

          {/* Historical Invoices Ledger */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Sales Transaction Ledger</h3>
              <span className="text-xs text-slate-400">{invoices.length} invoices recorded</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Invoice No</th>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Paid</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.localId} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNo}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(inv.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{inv.customerName}</td>
                      <td className="py-3 px-4 uppercase text-slate-500 font-medium">
                        {inv.paymentMethod}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatBDT(inv.totalMinor)}
                      </td>
                      <td className="py-3 px-4 text-emerald-600 font-medium">
                        {formatBDT(inv.paidMinor)}
                      </td>
                      <td className="py-3 px-4 text-right">
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
        </main>
      </div>
    </div>
  );
}

