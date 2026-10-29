"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { TopHeader } from "@/components/shared/TopHeader";
import {
  Settings,
  Store,
  User,
  Shield,
  Smartphone,
  Database,
  Trash2,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { db } from "@/lib/db/dexie/schema";
import { SyncQueueManager } from "@/lib/sync/queue";

export default function SettingsPage() {
  const [storeName, setStoreName] = useState("StoreOS Main Store");
  const [branchName, setBranchName] = useState("Shop No. 12, Green Road");
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function checkState() {
      const pending = await SyncQueueManager.getPendingItems();
      setPendingSyncCount(pending.length);
    }
    checkState();
  }, []);

  const handleBackupExport = async () => {
    setIsExporting(true);
    const backupData = {
      products: await db.products.toArray(),
      customers: await db.customers.toArray(),
      salesInvoices: await db.salesInvoices.toArray(),
      stockMovements: await db.stockMovements.toArray(),
      meta: await db.meta.toArray(),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `StoreOS_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopHeader />

        <main className="p-8 space-y-6 max-w-4xl">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Configure store profiles, offline storage, backup, and sync preferences.
            </p>
          </div>

          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Settings updated successfully!
            </div>
          )}

          {/* Business Info Section */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-sm font-bold text-slate-900">
              <Store className="w-4 h-4 text-blue-600" />
              <span>Business Profile</span>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700">Store Name</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Branch Name</label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Currency & Minor Unit</label>
                <div className="mt-1 p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-mono">
                  BDT (৳) - 1 BDT = 100 Poisha (Integer minor-unit precision enabled)
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
              >
                Save Changes
              </button>
            </form>
          </div>

          {/* Storage & Local-First Sync Section */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-sm font-bold text-slate-900">
              <Database className="w-4 h-4 text-purple-600" />
              <span>Offline Database & Sync Engine</span>
            </div>

            <div className="text-xs space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="font-semibold text-slate-900">Pending Sync Queue</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    {pendingSyncCount} operations waiting to sync with cloud
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await SyncQueueManager.processQueue();
                    const pending = await SyncQueueManager.getPendingItems();
                    setPendingSyncCount(pending.length);
                  }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Now</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="font-semibold text-slate-900">Export Offline JSON Backup</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Download complete snapshot of local IndexedDB tables
                  </p>
                </div>
                <button
                  onClick={handleBackupExport}
                  disabled={isExporting}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  {isExporting ? "Exporting..." : "Download Backup"}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

