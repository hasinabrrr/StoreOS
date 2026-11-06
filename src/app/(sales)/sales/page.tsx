"use client";

import { useEffect, useState, useTransition } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { TopHeader } from "@/components/shared/TopHeader";
import {
  TrendingUp,
  Search,
  Eye,
  RotateCcw,
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { db } from "@/lib/db/dexie/schema";
import { v4 as uuidv4 } from "uuid";
import { SyncQueueManager } from "@/lib/sync/queue";
import { formatBDT, toMinorUnits } from "@/lib/domain/money";
import type { SalesInvoice, SalesReturn, StockMovement, Product } from "@/lib/db/types";

export default function SalesPage() {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [returnInvoice, setReturnInvoice] = useState<SalesInvoice | null>(null);
  const [returnReason, setReturnReason] = useState("Customer changed mind");
  const [refundAmount, setRefundAmount] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadInvoices = async () => {
    const data = await db.salesInvoices.orderBy("createdAt").reverse().toArray();
    setInvoices(data);
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleProcessReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnInvoice) return;

    startTransition(async () => {
      try {
        const now = new Date().toISOString();
        const returnId = uuidv4();
        const refundMinor = toMinorUnits(parseFloat(refundAmount) || returnInvoice.paidMinor / 100);

        await db.transaction(
          "rw",
          [db.salesInvoices, db.salesReturns, db.products, db.stockMovements, db.syncQueue],
          async () => {
            // 1. Record return entry
            const returnRecord: SalesReturn = {
              localId: returnId,
              businessId: returnInvoice.businessId,
              branchId: returnInvoice.branchId,
              invoiceLocalId: returnInvoice.localId,
              invoiceNo: returnInvoice.invoiceNo,
              customerName: returnInvoice.customerName,
              refundMinor,
              reason: returnReason,
              items: returnInvoice.items.map((it) => ({
                productId: it.productId,
                productName: it.productName,
                qty: it.qty,
                unitPriceMinor: it.unitPriceMinor,
                refundMinor: it.totalMinor,
              })),
              syncStatus: "pending",
              createdAt: now,
              updatedAt: now,
            };
            await db.salesReturns.add(returnRecord);

            // 2. Reverse stock via additive movement log
            for (const item of returnInvoice.items) {
              const product = await db.products.get(item.productId);
              if (product) {
                const newStock = Number((product.currentStock + item.qty).toFixed(3));
                await db.products.update(item.productId, {
                  currentStock: newStock,
                  updatedAt: now,
                });

                const movement: StockMovement = {
                  localId: uuidv4(),
                  businessId: returnInvoice.businessId,
                  branchId: returnInvoice.branchId,
                  productId: item.productId,
                  type: "return",
                  qtyDelta: item.qty, // positive delta restores inventory
                  refType: "sales_return",
                  refId: returnId,
                  createdBy: "current-user",
                  clientGeneratedId: uuidv4(),
                  syncStatus: "pending",
                  createdAt: now,
                  updatedAt: now,
                };
                await db.stockMovements.add(movement);
                await SyncQueueManager.enqueue("stockMovement", movement.localId, "insert", movement);
              }
            }

            // 3. Mark invoice as void/returned
            await db.salesInvoices.update(returnInvoice.localId, {
              status: "void",
              updatedAt: now,
            });

            await SyncQueueManager.enqueue("salesReturn", returnId, "insert", returnRecord);
          }
        );

        setReturnInvoice(null);
        await loadInvoices();
      } catch (err: any) {
        alert(err?.message || "Failed to process return");
      }
    });
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopHeader />
        <main className="p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Invoices & Returns</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Browse sales history, reprint receipts, and process customer product returns.
              </p>
            </div>
            <a
              href="/pos"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              + Create New Sale
            </a>
          </div>

          {/* Search Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by invoice number or customer name..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <th className="py-3 px-4">Invoice No</th>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Paid</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No sales found.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.localId} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNo}</td>
                        <td className="py-3 px-4 text-slate-500">{new Date(inv.createdAt).toLocaleString()}</td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{inv.customerName || "Walk-in"}</td>
                        <td className="py-3 px-4 uppercase text-slate-500 font-medium">{inv.paymentMethod}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{formatBDT(inv.totalMinor)}</td>
                        <td className="py-3 px-4 text-emerald-600 font-medium">{formatBDT(inv.paidMinor)}</td>
                        <td className="py-3 px-4">
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
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            title="View / Print Receipt"
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {inv.status !== "void" && (
                            <button
                              onClick={() => {
                                setReturnInvoice(inv);
                                setRefundAmount((inv.paidMinor / 100).toString());
                              }}
                              title="Process Return"
                              className="p-1 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
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

      {/* Invoice Details / Print Receipt Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Receipt #{selectedInvoice.invoiceNo}</h3>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono space-y-2">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <p className="font-bold text-sm text-slate-900">StoreOS Retail</p>
                <p className="text-[10px] text-slate-500">{new Date(selectedInvoice.createdAt).toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">Customer: {selectedInvoice.customerName}</p>
              </div>

              <div className="space-y-1 py-1">
                {selectedInvoice.items?.map((it) => (
                  <div key={it.localId} className="flex justify-between">
                    <span>{it.productName} (x{it.qty})</span>
                    <span>{formatBDT(it.totalMinor)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-dashed border-slate-300 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Total Amount</span>
                  <span>{formatBDT(selectedInvoice.totalMinor)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Paid ({selectedInvoice.paymentMethod})</span>
                  <span>{formatBDT(selectedInvoice.paidMinor)}</span>
                </div>
                {selectedInvoice.dueMinor > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Due Remaining</span>
                    <span>{formatBDT(selectedInvoice.dueMinor)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <RotateCcw className="w-4 h-4" />
                <span>Process Return / Refund</span>
              </div>
              <button
                onClick={() => setReturnInvoice(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-slate-800">{returnInvoice.invoiceNo}</p>
              <p className="text-slate-500">Customer: {returnInvoice.customerName}</p>
              <p className="text-slate-500">
                Items will be returned to stock inventory and recorded in audit log.
              </p>
            </div>

            <form onSubmit={handleProcessReturn} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Reason for Return</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="Customer changed mind">Customer changed mind</option>
                  <option value="Defective / Damaged item">Defective / Damaged item</option>
                  <option value="Wrong size / variant">Wrong size / variant</option>
                  <option value="Expired product">Expired product</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Refund Amount (৳)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReturnInvoice(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  {isPending ? "Refunding..." : "Confirm Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
