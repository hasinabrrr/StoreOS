"use client";

import { useEffect, useState, useTransition } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { TopHeader } from "@/components/shared/TopHeader";
import {
  UserCheck,
  Plus,
  Phone,
  DollarSign,
  Shield,
  X,
  Users,
} from "lucide-react";
import { db } from "@/lib/db/dexie/schema";
import { v4 as uuidv4 } from "uuid";
import { SyncQueueManager } from "@/lib/sync/queue";
import { formatBDT, toMinorUnits } from "@/lib/domain/money";
import type { EmployeeRecord } from "@/lib/db/types";

const ROLES: EmployeeRecord["role"][] = [
  "Manager",
  "Cashier",
  "Stock Keeper",
  "Sales Associate",
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [newEmp, setNewEmp] = useState({
    name: "",
    role: ROLES[1],
    phone: "",
    salary: "",
  });

  const loadEmployees = async () => {
    const list = await db.employees.toArray();
    setEmployees(list);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const now = new Date().toISOString();
        const localId = uuidv4();
        const salaryMinor = toMinorUnits(parseFloat(newEmp.salary) || 0);

        const record: EmployeeRecord = {
          localId,
          businessId: "demo-business-001",
          branchId: "demo-branch-001",
          name: newEmp.name,
          role: newEmp.role,
          phone: newEmp.phone,
          salaryMinor,
          status: "active",
          syncStatus: "pending",
          createdAt: now,
          updatedAt: now,
        };

        await db.transaction("rw", [db.employees, db.syncQueue], async () => {
          await db.employees.add(record);
          await SyncQueueManager.enqueue("employee", localId, "insert", record);
        });

        setIsAddModalOpen(false);
        setNewEmp({ name: "", role: ROLES[1], phone: "", salary: "" });
        await loadEmployees();
      } catch (err: any) {
        alert(err?.message || "Failed to add employee");
      }
    });
  };

  const totalPayrollMinor = employees.reduce((sum, e) => sum + e.salaryMinor, 0);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopHeader />
        <main className="p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Employees & Staff</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Staff access, cashier assignments, and monthly payroll tracking.
              </p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          </div>

          {/* KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Staff</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{employees.length} Members</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Monthly Payroll Budget</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">{formatBDT(totalPayrollMinor)}</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Shift Status</p>
                <p className="text-sm font-bold text-slate-900 mt-1">All On Duty (Morning)</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Employees Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Phone Number</th>
                    <th className="py-3 px-4">Monthly Salary</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => (
                    <tr key={emp.localId} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
                            {emp.name.slice(0, 2)}
                          </div>
                          <span>{emp.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                          {emp.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{emp.phone}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatBDT(emp.salaryMinor)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 capitalize">
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Add Staff Member</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Full Name *</label>
                <input
                  required
                  type="text"
                  value={newEmp.name}
                  onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                  placeholder="e.g. Asaduzzaman Nur"
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Role & Access</label>
                <select
                  value={newEmp.role}
                  onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value as any })}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Phone Number *</label>
                <input
                  required
                  type="text"
                  value={newEmp.phone}
                  onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                  placeholder="+880 1..."
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Monthly Salary (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newEmp.salary}
                  onChange={(e) => setNewEmp({ ...newEmp, salary: e.target.value })}
                  placeholder="e.g. 20000"
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
                  {isPending ? "Adding..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
