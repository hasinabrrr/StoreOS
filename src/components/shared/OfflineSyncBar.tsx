"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { SyncQueueManager } from "@/lib/sync/queue";

export function OfflineSyncBar() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Register service worker if supported
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const checkPending = async () => {
      const items = await SyncQueueManager.getPendingItems();
      setPendingCount(items.length);
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await SyncQueueManager.processQueue();
    const items = await SyncQueueManager.getPendingItems();
    setPendingCount(items.length);
    setIsSyncing(false);
  };

  return (
    <div className="flex items-center gap-3 text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
      <div className="flex items-center gap-1.5">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
          }`}
        />
        <span>{isOnline ? "Online" : "Offline"}</span>
        {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-amber-600" />}
      </div>

      {pendingCount > 0 && (
        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
          {pendingCount} pending
        </span>
      )}

      <button
        onClick={handleSyncNow}
        disabled={isSyncing}
        title="Sync Local DB with Cloud"
        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-blue-600" : ""}`} />
      </button>
    </div>
  );
}

