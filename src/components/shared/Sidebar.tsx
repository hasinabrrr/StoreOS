"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Layers,
  Users,
  TrendingUp,
  Truck,
  Building2,
  Receipt,
  FileBarChart,
  UserCheck,
  GitBranch,
  Settings,
  RefreshCw,
} from "lucide-react";

const navigationItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "POS", href: "/pos", icon: ShoppingCart },
  { name: "Products", href: "/products", icon: Package },
  { name: "Inventory", href: "/inventory", icon: Layers },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Sales", href: "/sales", icon: TrendingUp },
  { name: "Purchases", href: "/purchases", icon: Truck },
  { name: "Suppliers", href: "/suppliers", icon: Building2 },
  { name: "Expenses", href: "/expenses", icon: Receipt },
  { name: "Reports", href: "/reports", icon: FileBarChart },
  { name: "Employees", href: "/employees", icon: UserCheck },
  { name: "Branches", href: "/branches", icon: GitBranch },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#0B1527] text-slate-300 flex flex-col h-screen select-none shrink-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 flex items-center gap-3 border-b border-slate-800/80">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
          <ShoppingCart className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight leading-none">StoreOS</h1>
          <p className="text-[11px] text-slate-400 mt-1">Store Management System</p>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Branch & Sync Status Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-[#091120]">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-white">Main Branch</span>
          </div>
          <span className="text-[10px] text-slate-400">▼</span>
        </div>
        <p className="text-[11px] text-slate-400 truncate">Shop No. 12, Green Road</p>

        <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <RefreshCw className="w-3 h-3 text-slate-500" />
            Last Sync
          </span>
          <span className="text-slate-300 font-medium">Just now</span>
        </div>
      </div>
    </aside>
  );
}

