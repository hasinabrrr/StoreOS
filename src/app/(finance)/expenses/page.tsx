"use client";

import { useEffect, useState, useTransition } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { TopHeader } from "@/components/shared/TopHeader";
import {
  Receipt,
  Plus,
  DollarSign,
  TrendingDown,
  Calendar,
  X,
  PieChart,
} from "lucide-react";
import { db } from "@/lib/db/dexie/schema";
import { v4 as uuidv4 } from "uuid";
import { SyncQueueManager } from "@/lib/sync/queue";
import { formatBDT, toMinorUnits } from "@/lib/domain/money";
import type { ExpenseRecord } from "@/lib/db/types";

const EXPENSE_CATEGORIES = [
  "Shop Rent",
  "Electricity & Utilities",
  "Packaging & Bags",
  "Staff Food & Tea",
  "Maintenance & Repairs",
  "Transportation / Freight",
  "Miscellaneous",
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [newExpense, setNewExpense] = useState({
    category: EXPENSE_CATEGORIES[0],
    amount: "",
    note: "",
  });

  const loadExpenses = async () => {
    const list = await db.expenses.orderBy("createdAt").reverse().toArray();
    setExpenses(list);
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const now = new Date().toISOString();
        const localId = uuidv4();
        const amountMinor = toMinorUnits(parseFloat(newExpense.amount) || 0);

        const record: ExpenseRecord = {
          localId,
          businessId: "demo-business-001",
          branchId: "demo-branch-001",
          category: newExpense.category,
          amountMinor,
          note: newExpense.note,
          syncStatus: "pending",
          createdAt: now,
          updatedAt: now,
        };

        await db.transaction("rw", [db.expenses, db.syncQueue], async () => {
          await db.expenses.add(record);
          await SyncQueueManager.enqueue("expense", localId, "insert", record);
        });

        setIsAddModalOpen(false);
        setNewExpense({ category: EXPENSE_CATEGORIES[0], amount: "", note: "" });
        await loadExpenses();
      } catch (err: any) {
        alert(err?.message || "Failed to record expense");
      }
    });
  };

  const filteredExpenses =
    selectedCategory === "all"
      ? expenses
      : expenses.filter((e) => e.category === selectedCategory);

  const totalExpenseMinor = expenses.reduce((sum, e) => sum + e.amountMinor, 0);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopHeader />
        <main className="p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Expenses</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Record store operating overheads, bills, and miscellaneous cash outflows.
              </p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>
          </div>

          {/* KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Outflows</p>
                <p className="text-2xl font-bold text-rose-600 mt-1">{formatBDT(totalExpenseMinor)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Recorded Expenses</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{expenses.length} entries</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Top Category</p>
                <p className="text-sm font-bold text-slate-900 mt-1">Shop Space Rent</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <PieChart className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Categories
            </button>
            {EXPENSE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description / Note</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No expenses found for this category.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.localId} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 text-slate-500 font-mono">
                          {new Date(exp.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 bg-slate-100 rounded-md font-semibold text-slate-800">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{exp.note || "—"}</td>
                        <td className="py-3.5 px-4 font-bold text-rose-600 text-sm">
                          {formatBDT(exp.amountMinor)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-medium capitalize">
                            {exp.syncStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Record New Expense</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Category *</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Amount (৳) *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Description / Receipt Note</label>
                <input
                  type="text"
                  value={newExpense.note}
                  onChange={(e) => setNewExpense({ ...newExpense, note: e.target.value })}
                  placeholder="e.g. Electricity bill / Carry bags"
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {isPending ? "Saving..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

