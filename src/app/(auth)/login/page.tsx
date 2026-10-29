"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { AuthService } from "@/lib/auth/service";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@storeos.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      await AuthService.login(email, password);
      router.push("/");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 select-none">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-6">
        {/* Brand Icon & Heading matching Design */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 mb-1">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">StoreOS</h1>
          <p className="text-xs font-semibold text-blue-600 tracking-wide uppercase">
            Smart Store Management
          </p>
          <p className="text-xs text-slate-400 max-w-xs mt-1">
            Manage your store, sales, inventory, and customers — all in one offline-first place.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium text-center">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Email or Staff ID</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@store.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Password / PIN</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600" />
              <span>Keep logged in offline</span>
            </label>
            <span className="text-blue-600 font-semibold cursor-pointer hover:underline">
              Forgot PIN?
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/25 transition-all text-xs flex items-center justify-center gap-2"
          >
            <span>{loading ? "Signing in..." : "Login"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Offline Badge */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Offline session caching active</span>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mt-6 font-medium">v1.0.0 — StoreOS Offline-First Retail</p>
    </div>
  );
}
