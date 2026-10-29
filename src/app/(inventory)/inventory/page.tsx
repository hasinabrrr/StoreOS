"use client";

import { useEffect, useState, useTransition } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { TopHeader } from "@/components/shared/TopHeader";
import {
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Search,
  AlertTriangle,
  History,
  X,
} from "lucide-react";
import { db } from "@/lib/db/dexie/schema";
import { InventoryService } from "@/lib/domain/inventory/service";
import type { Product, StockMovement } from "@/lib/db/types";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "movements">("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<StockMovement["type"]>("adjustment");
  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    const p = await db.products.toArray();
    const m = await db.stockMovements.orderBy("createdAt").reverse().limit(50).toArray();
    setProducts(p);
    setMovements(m);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    startTransition(async () => {
      try {
        const delta = parseFloat(adjustmentQty);
        await InventoryService.recordStockMovement(
          selectedProduct.localId,
          delta,
          adjustmentType,
          selectedProduct.businessId,
          "demo-branch-001",
          "manual_adjustment"
        );
        setIsAdjustModalOpen(false);
        setSelectedProduct(null);
        setAdjustmentQty("");
        await loadData();
      } catch (err: any) {
        alert(err.message || "Failed to adjust stock");
      }
    });
  };

  const totalProducts = products.length;
  const lowStockCount = products.filter((p) => p.currentStock <= p.lowStockThreshold).length;
  const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopHeader />

        <main className="p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Track stock on hand, record adjustments, and review movement audits.
              </p>
            </div>
            {/* Tabs */}
            <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-1.5 rounded-lg transition-all ${
                  activeTab === "overview"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Stock Overview
              </button>
              <button
                onClick={() => setActiveTab("movements")}
                className={`px-4 py-1.5 rounded-lg transition-all ${
                  activeTab === "movements"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Stock Movements
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Products</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{totalProducts}</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Low Stock</p>
                <p className="text-xl font-bold text-amber-600 mt-1">{lowStockCount}</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Out of Stock</p>
                <p className="text-xl font-bold text-rose-600 mt-1">{outOfStockCount}</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Tab 1: Stock Overview */}
          {activeTab === "overview" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Item Name</th>
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4">Current Stock</th>
                      <th className="py-3 px-4">Threshold</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Adjustment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((prod) => {
                      const isLow = prod.currentStock <= prod.lowStockThreshold;
                      const isOut = prod.currentStock <= 0;

                      return (
                        <tr key={prod.localId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">{prod.name}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">{prod.sku}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`font-bold ${
                                isOut ? "text-rose-600" : isLow ? "text-amber-600" : "text-emerald-700"
                              }`}
                            >
                              {prod.currentStock} {prod.unit}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">{prod.lowStockThreshold} {prod.unit}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                isOut
                                  ? "bg-rose-50 text-rose-700"
                                  : isLow
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedProduct(prod);
                                setIsAdjustModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-lg font-medium text-xs transition-colors"
                            >
                              Adjust Stock
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Stock Movements Audit Log */}
          {activeTab === "movements" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Quantity Delta</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4 text-right">Sync Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No stock movements recorded yet.
                        </td>
                      </tr>
                    ) : (
                      movements.map((m) => (
                        <tr key={m.localId} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {new Date(m.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 capitalize font-medium text-slate-800">
                            {m.type}
                          </td>
                          <td className="py-3 px-4 font-bold">
                            <span
                              className={`flex items-center gap-1 ${
                                m.qtyDelta > 0 ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {m.qtyDelta > 0 ? (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowDownRight className="w-3.5 h-3.5" />
                              )}
                              {m.qtyDelta > 0 ? `+${m.qtyDelta}` : m.qtyDelta}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{m.refType || "Direct"}</td>
                          <td className="py-3 px-4 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-medium">
                              {m.syncStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Adjust Stock Quantity</h3>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-slate-800">{selectedProduct.name}</p>
              <p className="text-slate-500">
                Current Stock: <span className="font-bold text-slate-700">{selectedProduct.currentStock} {selectedProduct.unit}</span>
              </p>
            </div>

            <form onSubmit={handleStockAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Movement Reason</label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as any)}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="adjustment">Stock Adjustment / Count Correction</option>
                  <option value="purchase">Restock / Purchase</option>
                  <option value="return">Customer Return</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Quantity Delta (+ or -) *</label>
                <input
                  required
                  type="number"
                  step="any"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  placeholder="e.g. +10 or -3"
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Use negative values (e.g. -5) for wastage or shrinkage.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                >
                  {isPending ? "Applying..." : "Apply Delta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

