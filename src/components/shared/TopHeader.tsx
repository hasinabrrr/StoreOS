"use client";

import { Search, Bell, Globe } from "lucide-react";
import { OfflineSyncBar } from "./OfflineSyncBar";

export function TopHeader() {
  return (
    <header className="h-16 border-b border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between px-6 shrink-0">
      {/* Search Bar */}
      <div className="relative w-96">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search product, barcode, customer... (Ctrl + K)"
          className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Offline / Online Sync Indicator */}
        <OfflineSyncBar />

        {/* Notifications */}
        <button className="relative p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>
        </button>

        {/* Language Switcher */}
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span>বাংলা</span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center font-semibold text-xs">
            JD
          </div>
          <div className="text-left text-xs">
            <p className="font-semibold text-slate-900 dark:text-white leading-none">John Doe</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Owner</p>
          </div>
        </div>
      </div>
    </header>
  );
}

