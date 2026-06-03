import React, { useState, useEffect } from "react";
import { useStore } from "../context/StoreContext";
import { CompanyLogo } from "./CompanyHeader";
import {
  Wifi,
  WifiOff,
  User,
  ShieldAlert,
  Database,
  Lock,
  Unlock,
  Building,
  Clock,
  LayoutDashboard,
  RefreshCw,
  CloudLightning,
  Trash2
} from "lucide-react";

export default function TopBar() {
  const {
    isOnline,
    firebaseActive,
    isDemoMode,
    setDemoMode,
    currentUser,
    logout,
    pendingSyncCount,
    isSyncing,
    lastSyncedTime,
    syncOfflineData,
    clearPendingSyncQueue
  } = useStore();

  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#0c1322] text-white py-2.5 px-4 md:px-6 shadow-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        
        {/* Title Brand Section */}
        <div className="flex items-center gap-2.5">
          <div className="bg-[#111c30] p-1.5 rounded-lg border border-slate-700/50 shadow-inner flex-shrink-0 flex items-center justify-center">
            <CompanyLogo className="h-8 md:h-10 w-auto" />
          </div>
          <div className="truncate">
            <h1 className="text-xs md:text-sm font-black tracking-tight text-white leading-none uppercase font-sans">
              Wara Wara
            </h1>
            <p className="text-[8px] md:text-[9px] text-amber-500 font-black uppercase tracking-wider leading-none mt-1">
              Construction & Supply
            </p>
          </div>
        </div>

        {/* Live Connectivity System Logs (Hidden on mobile or replaced with a streamlined live group) */}
        <div className="hidden md:flex flex-wrap items-center gap-2.5 font-mono text-xs">
          {/* Hardware Network Status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${
            isOnline ? "bg-emerald-950 text-emerald-400 border border-emerald-900/40" : "bg-red-950 text-red-400 border border-red-900/40"
          }`}>
            {isOnline ? (
              <>
                <Wifi className="h-3 w-3 animate-pulse" />
                <span>ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                <span>OFFLINE WORKING</span>
              </>
            )}
          </div>

          {/* Database System Mode */}
          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${
            isDemoMode ? "bg-amber-950 text-amber-400 border border-amber-900/40" : "bg-teal-950 text-teal-400 border border-teal-850"
          }`}>
            <Database className="h-3 w-3" />
            <span>{isDemoMode ? "REGIONAL CACHE" : "FIRESTORE CLOUD LIVE"}</span>
          </div>

          {/* Cloud Sync Controller / Status Panel */}
          {(!isDemoMode || pendingSyncCount > 0) && (
            <div className="flex items-center gap-2 bg-slate-900/90 text-[11px] px-2 py-1 rounded border border-slate-700/60 shadow-sm">
              <span className="text-slate-400 font-medium">
                Sync Queue:{" "}
                <span className={`font-bold ${pendingSyncCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                  {pendingSyncCount}
                </span>
              </span>
              <button
                onClick={() => syncOfflineData()}
                disabled={isSyncing || !isOnline || pendingSyncCount === 0}
                title={
                  !isOnline
                    ? "Connect to the internet to sync pending tasks."
                    : pendingSyncCount === 0
                    ? "Your database is fully synced."
                    : "Push locally registered entries to Firestore"
                }
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                  isSyncing
                    ? "bg-slate-800 text-emerald-400 animate-pulse"
                    : !isOnline || pendingSyncCount === 0
                    ? "bg-slate-800 text-slate-500 opacity-60 cursor-not-allowed"
                    : "bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-600/40 cursor-pointer"
                }`}
              >
                <RefreshCw className={`h-2.5 w-2.5 ${isSyncing ? "animate-spin text-emerald-400" : ""}`} />
                <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
              </button>
              {pendingSyncCount > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to discard your unsaved offline changes? This cannot be undone.")) {
                      clearPendingSyncQueue();
                    }
                  }}
                  title="Discard pending changes"
                  className="text-slate-500 hover:text-red-400 p-0.5 cursor-pointer rounded"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* Interactive Clock */}
          <div className="bg-slate-800/80 px-2.5 py-0.5 rounded text-slate-300 flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-slate-400" />
            <span>{time}</span>
          </div>
        </div>

        {/* Compact Status indicators on Mobile to save valuable space */}
        <div className="flex md:hidden items-center gap-2">
          {pendingSyncCount > 0 && (
            <button
              onClick={() => syncOfflineData()}
              disabled={isSyncing || !isOnline}
              title="Locally pending synchronizations"
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold font-mono transition ${
                isSyncing
                  ? "bg-emerald-955 text-emerald-400 animate-pulse border border-emerald-900"
                  : !isOnline
                  ? "bg-slate-900 text-slate-500 opacity-60 border border-slate-800"
                  : "bg-amber-500 text-slate-1000 animate-pulse border border-amber-400"
              }`}
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{pendingSyncCount}</span>
            </button>
          )}
          <span 
            className={`w-2.5 h-2.5 rounded-full border border-white/10 ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`} 
            title={isOnline ? "Network Connection: Live Online" : "Network connection: Offline working"} 
          />
          <span 
            className={`w-2.5 h-2.5 rounded-full border border-white/10 ${isDemoMode ? "bg-amber-400" : "bg-teal-400"}`} 
            title={isDemoMode ? "Local persistent sandbox cache" : "Cloud replicated live database connected"}
          />
        </div>

        {/* User Identity Details & Logout */}
        {currentUser && (
          <div className="flex items-center gap-2 animate-fadeIn flex-shrink-0">
            <div className="bg-[#1a2333] px-2.5 py-1 rounded-lg border border-slate-700/60 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <div className="text-left hidden xs:block">
                <div className="text-[11px] font-semibold leading-none text-slate-200 truncate max-w-[80px]">
                  {currentUser.name.split(" ")[0]}
                </div>
                <span className="text-[8px] font-extrabold tracking-tight uppercase text-emerald-400 block mt-0.5 font-sans">
                  {currentUser.role === "admin" ? "ADMIN" : "CLERK"}
                </span>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="px-2 py-1 md:px-3 md:py-1.5 bg-red-950/20 hover:bg-red-900 border border-red-900/40 text-red-300 hover:text-white transition duration-200 text-[10px] md:text-xs font-bold rounded-lg cursor-pointer flex items-center shadow-xs"
              title="Secure Logout"
            >
              Sign Out
            </button>
          </div>
        )}

      </div>
    </header>
  );
}
