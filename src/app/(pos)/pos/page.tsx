"use client";

import { useEffect, useState, useTransition } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { TopHeader } from "@/components/shared/TopHeader";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  CreditCard,
  Printer,
  X,
  UserCheck,
} from "lucide-react";
import { db } from "@/lib/db/dexie/schema";
import { formatBDT, toMinorUnits, toMajorUnits } from "@/lib/domain/money";
import { POSService, type CartItem } from "@/lib/domain/pos/service";
import type { Product, Customer, SalesInvoice } from "@/lib/db/types";

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bkash" | "nagad" | "card">("cash");
  const [discountValue, setDiscountValue] = useState("");
  const [paidAmountInput, setPaidAmountInput] = useState("");
  const [completedInvoice, setCompletedInvoice] = useState<SalesInvoice | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    const p = await db.products.filter((prod) => Boolean(prod.isActive)).toArray();
    const c = await db.customers.toArray();
    setProducts(p);
    setCustomers(c);
  };

  useEffect(() => {
    loadData();
  }, []);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.localId);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.localId ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.localId,
          productName: product.name,
          qty: 1,
          unitPriceMinor: product.sellPriceMinor,
          discountMinor: 0,
          unit: product.unit,
        },
      ];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Calculations
  const subtotalMinor = cart.reduce((acc, item) => acc + item.qty * item.unitPriceMinor, 0);
  const discountMinor = toMinorUnits(parseFloat(discountValue) || 0);
  const netTotalMinor = Math.max(0, subtotalMinor - discountMinor);
  const defaultPaidMinor = netTotalMinor;
  const effectivePaidMinor = paidAmountInput === "" ? defaultPaidMinor : toMinorUnits(parseFloat(paidAmountInput) || 0);
  const dueMinor = Math.max(0, netTotalMinor - effectivePaidMinor);

  const handleCheckout = () => {
    if (cart.length === 0) return;

    startTransition(async () => {
      try {
        const inv = await POSService.checkout({
          cart,
          customerId: selectedCustomer?.localId,
          customerName: selectedCustomer ? selectedCustomer.name : "Walk-in Customer",
          discountMinor,
          taxMinor: 0,
          paidMinor: effectivePaidMinor,
          paymentMethod,
        });

        setCompletedInvoice(inv);
        setCart([]);
        setDiscountValue("");
        setPaidAmountInput("");
        setSelectedCustomer(null);
        await loadData();
      } catch (err: any) {
        alert(err.message || "Checkout failed");
      }
    });
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery));
    return matchesSearch;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopHeader />

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Side: Product Selector Catalog */}
          <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-4">
            {/* Search & Categories */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Scan barcode or type to search..."
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                {["all", "Food", "Beverages", "Electronics", "Clothing"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Cards Grid (Matching Mobile / Desktop UI) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredProducts.map((p) => (
                <div
                  key={p.localId}
                  onClick={() => addToCart(p)}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-500 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="w-full h-24 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 mb-2.5 font-medium text-xs group-hover:bg-blue-50/50 transition-colors">
                      🛒 {p.unit}
                    </div>
                    <p className="font-semibold text-slate-900 text-xs line-clamp-1">{p.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{p.sku}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="font-bold text-slate-900 text-xs">
                      {formatBDT(p.sellPriceMinor)}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        p.currentStock <= p.lowStockThreshold
                          ? "bg-rose-50 text-rose-600"
                          : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      {p.currentStock} left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Active Cart & Checkout Panel */}
          <div className="w-full lg:w-96 bg-white border-l border-slate-200 flex flex-col h-full shadow-sm">
            {/* Cart Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Cart ({cart.reduce((sum, item) => sum + item.qty, 0)})
                </h3>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-rose-500 hover:underline"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Customer Selector */}
            <div className="p-3 bg-slate-50 border-b border-slate-100">
              <select
                value={selectedCustomer?.localId || ""}
                onChange={(e) => {
                  const c = customers.find((cust) => cust.localId === e.target.value);
                  setSelectedCustomer(c || null);
                }}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c.localId} value={c.localId}>
                    {c.name} ({c.phone}) - Due: {formatBDT(c.totalDueMinor)}
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center p-6">
                  <ShoppingCart className="w-8 h-8 mb-2 opacity-30" />
                  Cart is empty. Click any product on the left to start billing.
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between p-2.5 bg-slate-50/70 rounded-lg border border-slate-100"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 text-xs truncate">
                        {item.productName}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {formatBDT(item.unitPriceMinor)} × {item.qty}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-200 rounded-md bg-white">
                        <button
                          onClick={() => updateQty(item.productId, -1)}
                          className="p-1 hover:bg-slate-100 text-slate-600 rounded-l"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-semibold">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.productId, 1)}
                          className="p-1 hover:bg-slate-100 text-slate-600 rounded-r"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="p-1 text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Method Selector & Totals */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/40 space-y-3 text-xs">
              {/* Payment Methods Pill Buttons (Matching Design Mockup) */}
              <div>
                <p className="font-semibold text-slate-700 mb-1.5">Payment Method</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["cash", "bkash", "nagad", "card"] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`py-1.5 rounded-lg font-bold capitalize transition-all border ${
                        paymentMethod === method
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subtotal, Discount & Total */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-800">{formatBDT(subtotalMinor)}</span>
                </div>

                <div className="flex items-center justify-between text-slate-500">
                  <span>Discount (৳)</span>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="0"
                    className="w-20 px-2 py-0.5 bg-white border border-slate-200 rounded text-right text-xs"
                  />
                </div>

                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Amount</span>
                  <span className="text-blue-600">{formatBDT(netTotalMinor)}</span>
                </div>

                {/* Paid Input / Dues */}
                <div className="flex items-center justify-between text-slate-600 pt-1">
                  <span>Paid Amount (৳)</span>
                  <input
                    type="number"
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    placeholder={toMajorUnits(netTotalMinor).toString()}
                    className="w-24 px-2 py-0.5 bg-white border border-slate-200 rounded text-right text-xs font-semibold"
                  />
                </div>

                {dueMinor > 0 && (
                  <div className="flex justify-between text-amber-600 font-semibold pt-0.5">
                    <span>Due Remaining</span>
                    <span>{formatBDT(dueMinor)}</span>
                  </div>
                )}
              </div>

              {/* Complete Sale Action Button */}
              <button
                disabled={cart.length === 0 || isPending}
                onClick={handleCheckout}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 transition-all text-xs"
              >
                {isPending ? "Processing..." : "Complete Sale"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Completed Invoice Modal / Print Preview */}
      {completedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Sale Completed!</span>
              </div>
              <button
                onClick={() => setCompletedInvoice(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Bill Slip Representation */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono space-y-2">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <p className="font-bold text-sm text-slate-900">StoreOS Retail</p>
                <p className="text-[10px] text-slate-500">Shop No. 12, Green Road</p>
                <p className="text-[10px] text-slate-500">{completedInvoice.invoiceNo}</p>
              </div>

              <div className="space-y-1 py-1">
                {completedInvoice.items.map((item) => (
                  <div key={item.localId} className="flex justify-between">
                    <span>
                      {item.productName} × {item.qty}
                    </span>
                    <span>{formatBDT(item.totalMinor)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-dashed border-slate-300 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatBDT(completedInvoice.totalMinor)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Paid ({completedInvoice.paymentMethod})</span>
                  <span>{formatBDT(completedInvoice.paidMinor)}</span>
                </div>
                {completedInvoice.dueMinor > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Due</span>
                    <span>{formatBDT(completedInvoice.dueMinor)}</span>
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
                onClick={() => setCompletedInvoice(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

