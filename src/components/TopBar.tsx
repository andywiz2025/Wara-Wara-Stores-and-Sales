import React, { useState, useEffect } from "react";
import { useStore } from "../context/StoreContext";
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
  LayoutDashboard
} from "lucide-react";

export default function TopBar() {
  const {
    isOnline,
    firebaseActive,
    isDemoMode,
    setDemoMode,
    currentUser,
    setCurrentUserRole
  } = useStore();

  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-[#0f172a] text-white py-3 px-6 shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Title Brand Section */}
        <div className="flex items-center gap-3">
          <div className="bg-[#1e293b] p-2 rounded-lg border border-slate-700 shadow-inner">
            <Building className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Wara Wara Stores & Sales App</h1>
            <p className="text-xs text-slate-400 font-mono">Retail resilience platform • Koinadugu, SL</p>
          </div>
        </div>

        {/* Live Connectivity System Logs */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          {/* Hardware Network Status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
            isOnline ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-red-950 text-red-400 border border-red-800"
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
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
            isDemoMode ? "bg-amber-950 text-amber-400 border border-amber-800" : "bg-teal-950 text-teal-400 border border-teal-850"
          }`}>
            <Database className="h-3 w-3" />
            <span>{isDemoMode ? "OFFLINE RESILIENT CACHE" : "FIRESTORE CLOUD LIVE"}</span>
          </div>

          {/* Setup Indicator */}
          {!firebaseActive && (
            <div className="text-[10px] text-amber-300 bg-amber-950/40 px-2 py-1 rounded border border-amber-800/40 hidden lg:block">
              ℹ️ Awaiting Firebase configuration
            </div>
          )}

          {/* Interactive Clock */}
          <div className="bg-slate-800 px-3 py-1 rounded text-slate-300 flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>{time}</span>
          </div>
        </div>

        {/* Identity Selector */}
        <div className="flex items-center gap-2">
          {/* Role Switching */}
          <div className="bg-slate-800 p-1 rounded-lg flex border border-slate-700">
            <button
              onClick={() => setCurrentUserRole("admin")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                currentUser?.role === "admin"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              👑 Admin Context
            </button>
            <button
              onClick={() => setCurrentUserRole("staff")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                currentUser?.role === "staff"
                  ? "bg-slate-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🧑 Staff Context
            </button>
          </div>

          {/* User badge */}
          <div className="bg-[#1e293b] px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <div className="text-left">
              <div className="text-xs font-semibold leading-3 text-slate-200">{currentUser?.name}</div>
              <span className="text-[9px] font-mono leading-none text-slate-400">
                {currentUser?.role === "admin" ? "ADMINISTRATOR" : "STORE CLERK"}
              </span>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
