"use client";

import { useEffect, useState, useTransition } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { TopHeader } from "@/components/shared/TopHeader";
import {
  GitBranch,
  Plus,
  MapPin,
  Phone,
  CheckCircle2,
  Building,
  X,
} from "lucide-react";
import { db } from "@/lib/db/dexie/schema";
import { v4 as uuidv4 } from "uuid";
import { SyncQueueManager } from "@/lib/sync/queue";
import type { BranchRecord } from "@/lib/db/types";

export default function BranchesPage() {
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [currentBranchName, setCurrentBranchName] = useState("Main Branch");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [newBranch, setNewBranch] = useState({
    name: "",
    address: "",
    phone: "",
  });

  const loadBranches = async () => {
    const list = await db.branches.toArray();
    const meta = await db.meta.get("branchName");
    if (meta?.value) {
      setCurrentBranchName(meta.value);
    }
    setBranches(list);
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleSwitchBranch = async (branch: BranchRecord) => {
    await db.meta.bulkPut([
      { key: "branchId", value: branch.localId },
      { key: "branchName", value: branch.name },
      { key: "branchAddress", value: branch.address },
    ]);
    setCurrentBranchName(branch.name);
    // Reload page or update state
    window.location.reload();
  };

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const now = new Date().toISOString();
        const localId = uuidv4();

        const record: BranchRecord = {
          localId,
          businessId: "demo-business-001",
          name: newBranch.name,
          address: newBranch.address,
          phone: newBranch.phone,
          isMain: false,
          isActive: true,
          syncStatus: "pending",
          createdAt: now,
          updatedAt: now,
        };

        await db.transaction("rw", [db.branches, db.syncQueue], async () => {
          await db.branches.add(record);
          await SyncQueueManager.enqueue("branch", localId, "insert", record);
        });

        setIsAddModalOpen(false);
        setNewBranch({ name: "", address: "", phone: "" });
        await loadBranches();
      } catch (err: any) {
        alert(err?.message || "Failed to add branch");
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
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Branches & Outlets</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Manage retail chains, POS outlet isolation, and switch your active store terminal.
              </p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Branch</span>
            </button>
          </div>

          {/* Active Terminal Notice */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                <GitBranch className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Active Terminal: {currentBranchName}</p>
                <p className="text-blue-700 text-[11px] mt-0.5">
                  All POS sales, invoices, and stock movements are currently assigned to this outlet.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-600 text-white rounded-full font-bold text-[10px] uppercase tracking-wider">
              Connected
            </span>
          </div>

          {/* Branches Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {branches.map((b) => {
              const isActiveHere = currentBranchName === b.name;

              return (
                <div
                  key={b.localId}
                  className={`p-5 rounded-2xl border transition-all bg-white shadow-xs flex flex-col justify-between ${
                    isActiveHere
                      ? "border-blue-600 ring-2 ring-blue-500/20 shadow-md"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                          <Building className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-none">{b.name}</h3>
                          {b.isMain && (
                            <span className="text-[10px] text-blue-600 font-semibold uppercase mt-1 inline-block">
                              Headquarters / Main
                            </span>
                          )}
                        </div>
                      </div>
                      {isActiveHere && (
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      )}
                    </div>

                    <div className="text-xs text-slate-500 space-y-1.5 pt-2 border-t border-slate-100">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{b.address}</span>
                      </div>
                      {b.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono">{b.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Status: <span className="font-semibold text-emerald-600">Operational</span>
                    </span>
                    {!isActiveHere ? (
                      <button
                        onClick={() => handleSwitchBranch(b)}
                        className="px-3 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                      >
                        Switch to this Branch
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-blue-600">Active Terminal</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* Add Branch Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Add New Branch Outlet</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBranch} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Branch Name *</label>
                <input
                  required
                  type="text"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                  placeholder="e.g. Sylhet Zindabazar Outlet"
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Full Address *</label>
                <input
                  required
                  type="text"
                  value={newBranch.address}
                  onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                  placeholder="Plot / Road, Area, City"
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Contact Number</label>
                <input
                  type="text"
                  value={newBranch.phone}
                  onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                  placeholder="+880 1..."
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg"
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
                  {isPending ? "Adding..." : "Add Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

