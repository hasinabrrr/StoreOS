"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Package,
  Users,
  Receipt,
  LogOut,
  Settings,
  GitBranch,
  X,
  ChevronDown,
} from "lucide-react";
import { OfflineSyncBar } from "./OfflineSyncBar";
import { db } from "@/lib/db/dexie/schema";
import { AuthService } from "@/lib/auth/service";
import { formatBDT } from "@/lib/domain/money";
import type { Product, Customer, SalesInvoice } from "@/lib/db/types";

export function TopHeader() {
  const router = useRouter();

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    products: Product[];
    customers: Customer[];
    invoices: SalesInvoice[];
  }>({ products: [], customers: [], invoices: [] });

  // Notifications State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    { id: string; title: string; time: string; type: "alert" | "sale" | "sync" }[]
  >([]);

  // Profile Menu State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentBranch, setCurrentBranch] = useState("Main Branch");
  const [currentUser, setCurrentUser] = useState({
    fullName: "John Doe",
    email: "owner@storeos.com",
    role: "Owner",
  });

  // Language State
  const [language, setLanguage] = useState<"en" | "bn">("bn");

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Load notifications & branch on mount
  useEffect(() => {
    async function loadHeaderData() {
      // Branch
      const bMeta = await db.meta.get("branchName");
      if (bMeta?.value) setCurrentBranch(bMeta.value);

      // Notifications
      const lowProds = await db.products
        .filter((p) => p.currentStock <= p.lowStockThreshold)
        .toArray();
      const recentInv = await db.salesInvoices.orderBy("createdAt").reverse().limit(3).toArray();

      const notifs: typeof notifications = [];
      lowProds.slice(0, 3).forEach((p) => {
        notifs.push({
          id: p.localId,
          title: `Low stock alert: ${p.name} (${p.currentStock} ${p.unit} remaining)`,
          time: "Just now",
          type: "alert",
        });
      });

      recentInv.forEach((inv) => {
        notifs.push({
          id: inv.localId,
          title: `New sale: ${inv.invoiceNo} — ${formatBDT(inv.totalMinor)} (${inv.customerName || "Walk-in"})`,
          time: new Date(inv.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          type: "sale",
        });
      });

      setNotifications(notifs);

      // Saved language
      const savedLang = localStorage.getItem("storeos_lang") as "en" | "bn";
      if (savedLang) setLanguage(savedLang);

      // Authenticated User
      const session = AuthService.getCachedSession();
      if (session?.user) {
        setCurrentUser({
          fullName: session.user.fullName || "Store User",
          email: session.user.email || "user@storeos.com",
          role: session.user.role ? (session.user.role.charAt(0).toUpperCase() + session.user.role.slice(1)) : "Owner",
        });
      }
    }

    loadHeaderData();
  }, []);

  // Keyboard shortcut Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live search handler
  const handleSearchChange = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults({ products: [], customers: [], invoices: [] });
      setIsSearchOpen(false);
      return;
    }

    setIsSearchOpen(true);
    const q = val.toLowerCase();

    const prods = await db.products
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .limit(4)
      .toArray();

    const custs = await db.customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      .limit(3)
      .toArray();

    const invs = await db.salesInvoices
      .filter((i) =>
        Boolean(
          i.invoiceNo.toLowerCase().includes(q) ||
            (i.customerName && i.customerName.toLowerCase().includes(q))
        )
      )
      .limit(3)
      .toArray();

    setSearchResults({ products: prods, customers: custs, invoices: invs });
  };

  const toggleLanguage = () => {
    const next = language === "bn" ? "en" : "bn";
    setLanguage(next);
    localStorage.setItem("storeos_lang", next);
  };

  const handleLogout = () => {
    AuthService.clearSession();
    router.push("/login");
  };

  const totalResults =
    searchResults.products.length + searchResults.customers.length + searchResults.invoices.length;

  return (
    <header className="h-16 border-b border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 relative z-30">
      {/* Global Live Search Bar */}
      <div ref={searchRef} className="relative w-72 sm:w-96">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => {
            if (searchQuery.trim()) setIsSearchOpen(true);
          }}
          placeholder="Search product, barcode, customer... (Ctrl + K)"
          className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => handleSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Live Search Results Dropdown */}
        {isSearchOpen && searchQuery.trim() && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 max-h-96 overflow-y-auto p-2 space-y-3 z-50 text-xs">
            {totalResults === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                No products, customers, or invoices match &quot;{searchQuery}&quot;
              </div>
            ) : (
              <>
                {searchResults.products.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 flex items-center gap-1.5">
                      <Package className="w-3 h-3" /> Products
                    </p>
                    <div className="space-y-1">
                      {searchResults.products.map((p) => (
                        <Link
                          key={p.localId}
                          href="/pos"
                          onClick={() => setIsSearchOpen(false)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <div>
                            <p className="font-semibold text-slate-800">{p.name}</p>
                            <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-blue-600">{formatBDT(p.sellPriceMinor)}</span>
                            <span className="block text-[10px] text-slate-400">{p.currentStock} {p.unit}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.customers.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 flex items-center gap-1.5 border-t border-slate-100 pt-2">
                      <Users className="w-3 h-3" /> Customers
                    </p>
                    <div className="space-y-1">
                      {searchResults.customers.map((c) => (
                        <Link
                          key={c.localId}
                          href="/customers"
                          onClick={() => setIsSearchOpen(false)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <div>
                            <p className="font-semibold text-slate-800">{c.name}</p>
                            <span className="text-[10px] text-slate-400 font-mono">{c.phone}</span>
                          </div>
                          <span className={`font-semibold ${c.totalDueMinor > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                            Due: {formatBDT(c.totalDueMinor)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.invoices.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 flex items-center gap-1.5 border-t border-slate-100 pt-2">
                      <Receipt className="w-3 h-3" /> Sales Invoices
                    </p>
                    <div className="space-y-1">
                      {searchResults.invoices.map((inv) => (
                        <Link
                          key={inv.localId}
                          href="/sales"
                          onClick={() => setIsSearchOpen(false)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <div>
                            <p className="font-mono font-bold text-slate-800">{inv.invoiceNo}</p>
                            <span className="text-[10px] text-slate-400">{inv.customerName || "Walk-in"}</span>
                          </div>
                          <span className="font-bold text-slate-900">{formatBDT(inv.totalMinor)}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Offline / Online Sync Indicator */}
        <OfflineSyncBar />

        {/* Notifications Popover */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            title="Notifications & Alerts"
            className="relative p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white"></span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 space-y-2 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-900">Notifications ({notifications.length})</span>
                <span className="text-[10px] text-blue-600 cursor-pointer font-semibold" onClick={() => setNotifications([])}>
                  Clear all
                </span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-center py-6 text-slate-400 text-xs">No new notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5"
                    >
                      {n.type === "alert" ? (
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 font-medium leading-snug">{n.title}</p>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">{n.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          title="Toggle Language / ভাষা পরিবর্তন করুন"
          className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
        >
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span>{language === "bn" ? "বাংলা" : "English"}</span>
        </button>

        {/* User Profile Dropdown Menu */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {currentUser.fullName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "SO"}
            </div>
            <div className="text-left text-xs hidden sm:block">
              <p className="font-semibold text-slate-900 dark:text-white leading-none">{currentUser.fullName}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{currentUser.role}</p>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 space-y-1 z-50 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl mb-1">
                <p className="font-bold text-slate-900">{currentUser.fullName}</p>
                <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                <div className="mt-1.5 pt-1.5 border-t border-slate-200/80 flex items-center gap-1 text-[10px] text-blue-600 font-semibold">
                  <GitBranch className="w-3 h-3" />
                  <span>{currentBranch}</span>
                </div>
              </div>

              <Link
                href="/branches"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors"
              >
                <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                <span>Switch Branch</span>
              </Link>

              <Link
                href="/settings"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>Store Settings</span>
              </Link>

              <Link
                href="/login"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>Switch User Account</span>
              </Link>

              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
