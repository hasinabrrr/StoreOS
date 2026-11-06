"use client";

import { useEffect, useState, useTransition } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { TopHeader } from "@/components/shared/TopHeader";
import {
  Truck,
  Plus,
  CheckCircle2,
  Clock,
  Package,
  Calendar,
  X,
  ArrowDownLeft,
} from "lucide-react";
import { db } from "@/lib/db/dexie/schema";
import { v4 as uuidv4 } from "uuid";
import { SyncQueueManager } from "@/lib/sync/queue";
import { formatBDT, toMinorUnits } from "@/lib/domain/money";
import type { PurchaseOrder, Supplier, Product, StockMovement } from "@/lib/db/types";

export default function PurchasesPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [orderQty, setOrderQty] = useState("10");
  const [unitCost, setUnitCost] = useState("");

  const loadData = async () => {
    const ords = await db.purchaseOrders.orderBy("createdAt").reverse().toArray();
    const sups = await db.suppliers.toArray();
    const prods = await db.products.toArray();
    setOrders(ords);
    setSuppliers(sups);
    setProducts(prods);

    if (sups.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(sups[0].localId);
    }
    if (prods.length > 0 && !selectedProductId) {
      setSelectedProductId(prods[0].localId);
      setUnitCost((prods[0].purchasePriceMinor / 100).toString());
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const supplier = suppliers.find((s) => s.localId === selectedSupplierId);
    const product = products.find((p) => p.localId === selectedProductId);
    if (!supplier || !product) return;

    startTransition(async () => {
      try {
        const now = new Date().toISOString();
        const orderId = uuidv4();
        const qtyNum = parseFloat(orderQty) || 1;
        const costNum = parseFloat(unitCost) || product.purchasePriceMinor / 100;
        const totalMinor = toMinorUnits(qtyNum * costNum);
        const orderNo = `#PO-${Date.now().toString().slice(-6)}`;

        const newOrder: PurchaseOrder = {
          localId: orderId,
          businessId: "demo-business-001",
          branchId: "demo-branch-001",
          orderNo,
          supplierLocalId: supplier.localId,
          supplierName: supplier.name,
          status: "ordered",
          totalMinor,
          items: [
            {
              localId: uuidv4(),
              orderLocalId: orderId,
              productId: product.localId,
              productName: product.name,
              qty: qtyNum,
              unitCostMinor: toMinorUnits(costNum),
              totalMinor,
            },
          ],
          syncStatus: "pending",
          createdAt: now,
          updatedAt: now,
        };

        await db.transaction("rw", [db.purchaseOrders, db.syncQueue], async () => {
          await db.purchaseOrders.add(newOrder);
          await SyncQueueManager.enqueue("purchaseOrder", orderId, "insert", newOrder);
        });

        setIsAddModalOpen(false);
        await loadData();
      } catch (err: any) {
        alert(err?.message || "Failed to create purchase order");
      }
    });
  };

  // Receive stock and automatically generate additive stock movement
  const handleReceiveStock = (order: PurchaseOrder) => {
    startTransition(async () => {
      try {
        const now = new Date().toISOString();

        await db.transaction(
          "rw",
          [db.purchaseOrders, db.products, db.stockMovements, db.syncQueue],
          async () => {
            // 1. Update purchase order status
            await db.purchaseOrders.update(order.localId, {
              status: "received",
              receivedAt: now,
              updatedAt: now,
            });

            // 2. Generate stock movement and increment product stock
            for (const item of order.items) {
              const prod = await db.products.get(item.productId);
              if (prod) {
                const newStock = Number((prod.currentStock + item.qty).toFixed(3));
                await db.products.update(item.productId, {
                  currentStock: newStock,
                  updatedAt: now,
                });

                const movement: StockMovement = {
                  localId: uuidv4(),
                  businessId: order.businessId,
                  branchId: order.branchId,
                  productId: item.productId,
                  type: "purchase",
                  qtyDelta: item.qty,
                  refType: "purchase_order",
                  refId: order.localId,
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

            await SyncQueueManager.enqueue("purchaseOrder", order.localId, "update", {
              ...order,
              status: "received",
              receivedAt: now,
            });
          }
        );

        await loadData();
      } catch (err: any) {
        alert(err?.message || "Failed to receive stock");
      }
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopHeader />
        <main className="p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Purchase Orders</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Manage vendor restocking, shipments, and inventory receipt.
              </p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Purchase Order</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <th className="py-3 px-4">Order No</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Ordered Items</th>
                    <th className="py-3 px-4">Total Cost</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No purchase orders recorded yet. Click &quot;Create Purchase Order&quot; to order stock.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.localId} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{order.orderNo}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{order.supplierName}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {order.items.map((it) => `${it.productName} (x${it.qty})`).join(", ")}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{formatBDT(order.totalMinor)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 w-fit ${
                              order.status === "received"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {order.status === "received" ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            <span className="capitalize">{order.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {order.status === "ordered" && (
                            <button
                              onClick={() => handleReceiveStock(order)}
                              disabled={isPending}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs shadow-xs"
                            >
                              Receive Stock
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

      {/* Add PO Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">New Purchase Order</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Select Supplier</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  {suppliers.map((s) => (
                    <option key={s.localId} value={s.localId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Select Product to Restock</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const p = products.find((x) => x.localId === e.target.value);
                    if (p) setUnitCost((p.purchasePriceMinor / 100).toString());
                  }}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  {products.map((p) => (
                    <option key={p.localId} value={p.localId}>
                      {p.name} (Current: {p.currentStock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={orderQty}
                    onChange={(e) => setOrderQty(e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Unit Cost (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
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
                  {isPending ? "Placing..." : "Place Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

