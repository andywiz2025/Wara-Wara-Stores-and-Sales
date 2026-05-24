import React, { useState } from "react";
import { StoreProvider, useStore } from "./context/StoreContext";
import TopBar from "./components/TopBar";
import POSMain from "./components/POSMain";
import ProductCatalog from "./components/ProductCatalog";
import TBCBoard from "./components/TBCBoard";
import SalesLedgerView from "./components/SalesLedgerView";
import StaffManager from "./components/StaffManager";
import {
  ShoppingCart,
  Package,
  FileText,
  BookOpen,
  Users,
  Bell,
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react";

function MainAppContent() {
  const [activeTab, setActiveTab] = useState<"pos" | "catalog" | "tbc" | "ledger" | "staff">("pos");
  const { notifications, firebaseActive, isDemoMode } = useStore();

  const [showAlerts, setShowAlerts] = useState(false);
  const unreadAlertsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Top Banner indicating offline status or Firebase terms setup required */}
      {isDemoMode && !firebaseActive && (
        <div className="bg-amber-500 text-amber-950 font-mono text-xs py-1.5 px-4 text-center border-b border-amber-600 font-bold flex items-center justify-center gap-2">
          <span>⚠️ OFFLINE DEMO MODE ACTIVE</span>
          <span className="font-normal text-[10px] hidden md:inline">• Please remember to deploy Firebase Rules & accept terms in the AI Studio Setup Workspace to hook live Firestore cloud replication!</span>
        </div>
      )}

      {/* Main Top Header Navigation */}
      <TopBar />

      <div className="max-w-7xl w-full mx-auto p-4 md:p-6 flex-grow flex flex-col gap-6">
        
        {/* Alerts & Notifications Floating Anchor */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-2">
            <Bell className={`h-5 w-5 ${unreadAlertsCount > 0 ? "text-amber-500 animate-bounce" : "text-slate-400"}`} />
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Wara Wara Activity Logs</h3>
              <p className="text-xs text-slate-400">Inventory dispatches, TBC expirations, and ledger changes</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {unreadAlertsCount > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full animate-pulse">
                {unreadAlertsCount} active alert{unreadAlertsCount > 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
            >
              {showAlerts ? "Hide Panel" : "Expand Logs"}
            </button>
          </div>
        </div>

        {/* Actionable Alerts Panel */}
        {showAlerts && (
          <div className="bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800 max-h-48 overflow-y-auto space-y-2 font-mono text-xs shadow-inner animate-in slide-in-from-top-2 duration-100">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`py-1.5 px-3 rounded flex items-center justify-between gap-3 ${
                  n.type === "warning" ? "bg-red-950/30 text-red-350 border-l-2 border-red-500" : "bg-slate-800/40 text-slate-305 border-l-2 border-indigo-400"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {n.type === "warning" ? <AlertTriangle className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
                  {n.message}
                </span>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                  {new Date(n.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}

            {notifications.length === 0 && (
              <div className="text-center py-6 text-slate-500">
                No new store activity notifications logged.
              </div>
            )}
          </div>
        )}

        {/* Dashboard Navigation Tabs */}
        <div className="flex bg-white p-1 rounded-xl border border-slate-150 shadow-sm overflow-x-auto scrollbar-none gap-1">
          <button
            onClick={() => setActiveTab("pos")}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "pos"
                ? "bg-slate-800 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            POS Cash Register
          </button>

          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "catalog"
                ? "bg-slate-800 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Package className="h-4 w-4" />
            Inventory Stock Shelf
          </button>

          <button
            onClick={() => setActiveTab("tbc")}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "tbc"
                ? "bg-slate-800 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FileText className="h-4 w-4" />
            Pre-Paid TBC Registry
          </button>

          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "ledger"
                ? "bg-slate-800 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Locked Sales Ledger
          </button>

          <button
            onClick={() => setActiveTab("staff")}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "staff"
                ? "bg-slate-800 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Users className="h-4 w-4" />
            Staff Security Directory
          </button>
        </div>

        {/* Tab Visual viewport routing panels */}
        <div className="flex-grow flex flex-col">
          {activeTab === "pos" && <POSMain />}
          {activeTab === "catalog" && <ProductCatalog />}
          {activeTab === "tbc" && <TBCBoard />}
          {activeTab === "ledger" && <SalesLedgerView />}
          {activeTab === "staff" && <StaffManager />}
        </div>

      </div>

      {/* Decorative resilient footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-slate-500 text-xs font-mono">
        <p>© 2026 Wara Wara Stores Ltd • All rights reserved</p>
        <p className="text-[10px] text-slate-600 mt-1">
          Designed for maximum offline durability. Transaction records are reconciled incrementally on synchronization queues.
        </p>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <MainAppContent />
    </StoreProvider>
  );
}
