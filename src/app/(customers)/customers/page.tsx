"use client";

import { useEffect, useState, useTransition } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { TopHeader } from "@/components/shared/TopHeader";
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  CreditCard,
  DollarSign,
  X,
  History,
} from "lucide-react";
import { db } from "@/lib/db/dexie/schema";
import { CustomerService } from "@/lib/domain/customers/service";
import { formatBDT, toMinorUnits } from "@/lib/domain/money";
import type { Customer, SalesInvoice } from "@/lib/db/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectMethod, setCollectMethod] = useState<"cash" | "bkash" | "nagad">("cash");

  // New Customer Form State
  const [newCust, setNewCust] = useState({
    name: "",
    phone: "",
    address: "",
    openingDue: "0",
  });

  const [isPending, startTransition] = useTransition();

  const loadCustomers = async () => {
    const list = await db.customers.toArray();
    setCustomers(list);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await CustomerService.createCustomer(
          newCust.name,
          newCust.phone,
          newCust.address,
          toMinorUnits(parseFloat(newCust.openingDue) || 0)
        );
        setIsAddModalOpen(false);
        setNewCust({ name: "", phone: "", address: "", openingDue: "0" });
        await loadCustomers();
      } catch (err: any) {
        alert(err.message || "Failed to add customer");
      }
    });
  };

  const handleCollectDue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    startTransition(async () => {
      try {
        await CustomerService.collectDuePayment(
          selectedCustomer.localId,
          toMinorUnits(parseFloat(collectAmount) || 0),
          collectMethod
        );
        setIsCollectModalOpen(false);
        setSelectedCustomer(null);
        setCollectAmount("");
        await loadCustomers();
      } catch (err: any) {
        alert(err.message || "Failed to collect payment");
      }
    });
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const totalDueAcrossAll = customers.reduce((sum, c) => sum + c.totalDueMinor, 0);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopHeader />

        <main className="p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Customers</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Manage accounts, purchase history, and collect dues.
              </p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          </div>

          {/* KPI Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Customers</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{customers.length}</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Customers with Due</p>
                <p className="text-xl font-bold text-amber-600 mt-1">
                  {customers.filter((c) => c.totalDueMinor > 0).length}
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Outstanding Due</p>
                <p className="text-xl font-bold text-rose-600 mt-1">{formatBDT(totalDueAcrossAll)}</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers by name or mobile number..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Customers Table matching Mockup */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-4">Phone Number</th>
                    <th className="py-3 px-4">Address</th>
                    <th className="py-3 px-4">Total Due</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No customers found.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => (
                      <tr key={c.localId} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase">
                              {c.name.slice(0, 2)}
                            </div>
                            <span>{c.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-mono">{c.phone}</td>
                        <td className="py-3.5 px-4 text-slate-500">{c.address || "—"}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-bold ${
                              c.totalDueMinor > 0 ? "text-rose-600" : "text-emerald-600"
                            }`}
                          >
                            {formatBDT(c.totalDueMinor)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {c.totalDueMinor > 0 && (
                            <button
                              onClick={() => {
                                setSelectedCustomer(c);
                                setIsCollectModalOpen(true);
                              }}
                              className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold text-xs transition-colors"
                            >
                              Collect Due
                            </button>
                          )}
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

      {/* Collect Due Modal */}
      {isCollectModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Collect Due Payment</h3>
              <button
                onClick={() => setIsCollectModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-slate-800">{selectedCustomer.name}</p>
              <p className="text-slate-500">
                Outstanding Due:{" "}
                <span className="font-bold text-rose-600">
                  {formatBDT(selectedCustomer.totalDueMinor)}
                </span>
              </p>
            </div>

            <form onSubmit={handleCollectDue} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Payment Method</label>
                <select
                  value={collectMethod}
                  onChange={(e) => setCollectMethod(e.target.value as any)}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="cash">Cash</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Amount Received (৳) *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCollectModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  {isPending ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Add New Customer</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Full Name *</label>
                <input
                  required
                  type="text"
                  value={newCust.name}
                  onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                  placeholder="e.g. Rahim Ahmed"
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Phone Number *</label>
                <input
                  required
                  type="text"
                  value={newCust.phone}
                  onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                  placeholder="+880 17..."
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Address</label>
                <input
                  type="text"
                  value={newCust.address}
                  onChange={(e) => setNewCust({ ...newCust, address: e.target.value })}
                  placeholder="Area / City"
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Opening Due Balance (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newCust.openingDue}
                  onChange={(e) => setNewCust({ ...newCust, openingDue: e.target.value })}
                  placeholder="0.00"
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
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                >
                  {isPending ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

