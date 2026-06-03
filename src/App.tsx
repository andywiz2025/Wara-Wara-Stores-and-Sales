import React, { useState, useEffect } from "react";
import { StoreProvider, useStore } from "./context/StoreContext";
import { CompanyLetterhead, COMPANY_SOFTWARE_FOOTER } from "./components/CompanyHeader";
import TopBar from "./components/TopBar";
import POSMain from "./components/POSMain";
import ProductCatalog from "./components/ProductCatalog";
import TBCBoard from "./components/TBCBoard";
import CreditBoard from "./components/CreditBoard";
import SalesLedgerView from "./components/SalesLedgerView";
import StaffManager from "./components/StaffManager";
import LoginScreen from "./components/LoginScreen";
import workflowsDiagram from "./assets/images/wara_wara_workflows_1780084713169.png";
import posCheckoutImg from "./assets/images/pos_checkout_1780085780866.png";
import tbcDispatchImg from "./assets/images/tbc_dispatch_1780085798607.png";
import expenditureImg from "./assets/images/expenditure_logging_1780085813916.png";
import bankDepositImg from "./assets/images/bank_deposit_1780085832282.png";
import staffEnrollmentImg from "./assets/images/staff_enrollment_1780085849054.png";
import {
  ShoppingCart,
  Package,
  FileText,
  BookOpen,
  Users,
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Check,
  LogIn,
  LogOut,
  Key,
  ShieldAlert,
  User,
  X
} from "lucide-react";

// Dashboard tasks summary component replicated on top and bottom
const TaskStatusGrid = ({ 
  lowStockCount, 
  pendingTbcCount, 
  totalSalesCount, 
  currentUser, 
  onNavigate 
}: {
  lowStockCount: number;
  pendingTbcCount: number;
  totalSalesCount: number;
  currentUser: any;
  onNavigate: (tab: "pos" | "catalog" | "tbc" | "credits" | "ledger" | "staff") => void;
}) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900 text-white p-3 rounded-xl border border-slate-800 shadow-sm text-xs font-mono">
    <div className="flex items-center justify-between bg-slate-850 p-2 rounded-lg border border-slate-805">
      <div className="flex items-center gap-1.5 truncate">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
        <span className="text-slate-400">Current Login:</span>
      </div>
      <span className="font-bold text-slate-200 truncate ml-1">{currentUser?.name || "Unassigned"}</span>
    </div>

    <button 
      onClick={() => onNavigate("catalog")}
      className="flex items-center justify-between bg-emerald-950/20 p-2 rounded-lg border border-emerald-900/40 transition hover:bg-emerald-950/40 text-left cursor-pointer"
    >
      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
        <span className="h-2 w-2 rounded-full bg-red-400 flex-shrink-0" />
        <span>Restocks Due:</span>
      </div>
      <span className={`font-bold font-mono px-2 py-0.5 rounded ${lowStockCount > 0 ? "bg-red-900 text-red-100" : "bg-emerald-900 text-emerald-100"}`}>
        {lowStockCount}
      </span>
    </button>

    <button 
      onClick={() => onNavigate("tbc")}
      className="flex items-center justify-between bg-indigo-950/20 p-2 rounded-lg border border-indigo-900/40 transition hover:bg-indigo-950/40 text-left cursor-pointer"
    >
      <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
        <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce flex-shrink-0" />
         <span>TBC Pending Collection:</span>
      </div>
      <span className="font-bold font-mono px-2 py-0.5 bg-indigo-900 text-indigo-100 rounded">
        {pendingTbcCount}
      </span>
    </button>

    <button 
      onClick={() => onNavigate("ledger")}
      className="flex items-center justify-between bg-slate-950/20 p-2 rounded-lg border border-slate-800 transition hover:bg-slate-900/40 text-left cursor-pointer"
    >
      <div className="flex items-center gap-1.5 text-slate-400">
        <span className="h-2 w-2 rounded-full bg-slate-500 flex-shrink-0" />
        <span>Today's Audits:</span>
      </div>
      <span className="font-bold font-mono text-slate-300">
        {totalSalesCount} ledger recs
      </span>
    </button>
  </div>
);

function MainAppContent() {
  const [activeTab, setActiveTab] = useState<"pos" | "catalog" | "tbc" | "credits" | "ledger" | "staff">("pos");
  const { 
    products, 
    tbcs, 
    sales, 
    notifications, 
    firebaseActive, 
    isDemoMode, 
    currentUser,
    soundEnabled,
    setSoundEnabled,
    nativePermissionStatus,
    requestNotificationPermission,
    playNotificationSound,
    activeToasts,
    dismissToast
  } = useStore();

  const [showAlerts, setShowAlerts] = useState(false);
  const [logFilter, setLogFilter] = useState<"all" | "auth" | "revenue" | "inventory" | "other">("all");
  const [showManual, setShowManual] = useState(true);
  const [dismissedPermissionPrompt, setDismissedPermissionPrompt] = useState(false);

  // Screen Wake Lock API to keep the dedicated host device awake during POS operation
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      if (!("wakeLock" in navigator)) return;
      try {
        wakeLock = await (navigator as any).wakeLock.request("screen");
        console.log("POS Screen Wake Lock active. Device will remain awake.");
      } catch (err) {
        console.warn("Screen Wake Lock request failed:", err);
      }
    };

    if (currentUser) {
      requestWakeLock();
    }

    const handleVisibilityChange = async () => {
      if (wakeLock !== null && document.visibilityState === "visible" && currentUser) {
        await requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().then(() => {
          wakeLock = null;
        });
      }
    };
  }, [currentUser]);

  if (!currentUser) {
    return <LoginScreen />;
  }

  const unreadAlertsCount = notifications.filter(n => !n.read).length;
  const lowStockCount = products.filter(p => p.current_stock < 40).length;
  const pendingTbcCount = tbcs.filter(t => t.status === "pending").length;
  const totalSalesCount = sales.length;

  const parsedExpiryDate = (t: any) => {
    if (!t.expiry_date) return new Date();
    if (t.expiry_date && typeof t.expiry_date === "object" && "seconds" in t.expiry_date) {
      return new Date(t.expiry_date.seconds * 1000);
    }
    return new Date(t.expiry_date);
  };

  const expiredTbcCount = tbcs.filter(
    t => t.status === "expired" || (t.status === "pending" && parsedExpiryDate(t) < new Date())
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans pb-16 md:pb-0">
      
      {/* Floating Dynamic in-App Toast Alerts Panel - Styled as Android WhatsApp Drop-downs */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 z-[100] flex flex-col gap-2.5 w-full max-w-[370px] pointer-events-none px-4 print:hidden">
        {activeToasts.map((t) => {
          const msg = t.message.toLowerCase();
          
          let styles = {
            bg: "bg-zinc-900/95 border-zinc-800/80 text-zinc-100 shadow-[0_12px_36px_rgba(0,0,0,0.6)] backdrop-blur-xl",
            accent: "border-l-indigo-500",
            icon: <Info className="h-5 w-5 text-indigo-400" />,
            avatarBg: "bg-indigo-950",
            tag: "SYSTEM ALERTS",
            sender: "Store Manager • now"
          };

          if (msg.includes("unsuccessful login") || msg.includes("validation failed")) {
            styles = {
              bg: "bg-zinc-900/95 border-l-4 border-rose-500 border-zinc-800/80 text-zinc-100 shadow-[0_12px_36px_rgba(244,63,94,0.25)] backdrop-blur-xl ring-1 ring-rose-500/30 animate-bounce",
              accent: "border-l-rose-500",
              icon: <ShieldAlert className="h-5 w-5 text-rose-500" />,
              avatarBg: "bg-red-950/80",
              tag: "🚨 SECURITY FAIL",
              sender: "System Guard • now"
            };
          } else if (msg.includes("successful login") || msg.includes("entered session safely")) {
            styles = {
              bg: "bg-zinc-900/95 border-l-4 border-emerald-500 border-zinc-800/80 text-zinc-100 shadow-[0_12px_36px_rgba(16,185,129,0.25)] backdrop-blur-xl",
              accent: "border-l-emerald-500",
              icon: <LogIn className="h-5 w-5 text-emerald-500" />,
              avatarBg: "bg-emerald-950/80",
              tag: "🔐 SECURITY SUCCESS",
              sender: "Access Control • now"
            };
          } else if (msg.includes("logged out securely") || msg.includes("logged out")) {
            styles = {
              bg: "bg-zinc-900/95 border-l-4 border-zinc-500 border-zinc-800/80 text-zinc-100 shadow-[0_12px_36px_rgba(0,0,0,0.4)] backdrop-blur-xl",
              accent: "border-l-zinc-550",
              icon: <LogOut className="h-5 w-5 text-zinc-400" />,
              avatarBg: "bg-zinc-800",
              tag: "🔒 SESSION SHUTDOWN",
              sender: "Access Control • now"
            };
          } else if (msg.includes("delete") || msg.includes("remove") || msg.includes("expired") || msg.includes("reset") || t.type === "warning") {
            styles = {
              bg: "bg-zinc-900/95 border-l-4 border-red-500 border-zinc-800/80 text-zinc-100 shadow-[0_12px_36px_rgba(239,68,68,0.25)] backdrop-blur-xl",
              accent: "border-l-red-500",
              icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
              avatarBg: "bg-red-950/80",
              tag: "⚠️ SYSTEM WARNING",
              sender: "Database Log • now"
            };
          } else if (msg.includes("sale") || msg.includes("invoice") || msg.includes("revenue") || msg.includes("paid")) {
            styles = {
              bg: "bg-zinc-900/95 border-l-4 border-emerald-500 border-zinc-800/80 text-zinc-100 shadow-[0_12px_36px_rgba(16,185,129,0.25)] backdrop-blur-xl",
              accent: "border-l-emerald-500",
              icon: <ShoppingCart className="h-5 w-5 text-emerald-400" />,
              avatarBg: "bg-emerald-950/80",
              tag: "💰 REVENUE ACQUIRED",
              sender: "Store Checkout • now"
            };
          } else if (msg.includes("bank") || msg.includes("deposit")) {
            styles = {
              bg: "bg-zinc-900/95 border-l-4 border-cyan-500 border-zinc-800/80 text-zinc-100 shadow-[0_12px_36px_rgba(6,182,212,0.25)] backdrop-blur-xl",
              accent: "border-l-cyan-500",
              icon: <ShieldCheck className="h-5 w-5 text-cyan-400" />,
              avatarBg: "bg-cyan-950/80",
              tag: "🏦 VAULT DEPOSIT",
              sender: "Auditor Desk • now"
            };
          } else if (msg.includes("expenditure") || msg.includes("spent") || msg.includes("expense")) {
            styles = {
              bg: "bg-zinc-900/95 border-l-4 border-amber-500 border-zinc-800/80 text-zinc-100 shadow-[0_12px_36px_rgba(245,158,11,0.25)] backdrop-blur-xl",
              accent: "border-l-amber-500",
              icon: <FileText className="h-5 w-5 text-amber-500" />,
              avatarBg: "bg-amber-950/80",
              tag: "💸 CASH OUTFLOW",
              sender: "Store Registrar • now"
            };
          } else if (msg.includes("collected") || msg.includes("gate") || msg.includes("cargo") || msg.includes("dispatch")) {
            styles = {
              bg: "bg-zinc-900/95 border-l-4 border-violet-500 border-zinc-800/80 text-zinc-100 shadow-[0_12px_36px_rgba(139,92,246,0.25)] backdrop-blur-xl",
              accent: "border-l-violet-500",
              icon: <Package className="h-5 w-5 text-violet-400" />,
              avatarBg: "bg-violet-950",
              tag: "📦 CARGO RELEASE",
              sender: "Gatekeeper • now"
            };
          } else if (msg.includes("restock") || msg.includes("pricing") || msg.includes("stock override") || msg.includes("adjust") || msg.includes("shelving")) {
            styles = {
              bg: "bg-zinc-900/95 border-l-4 border-teal-500 border-zinc-800/80 text-zinc-100 shadow-[0_12px_36px_rgba(20,184,166,0.25)] backdrop-blur-xl",
              accent: "border-l-teal-500",
              icon: <BookOpen className="h-5 w-5 text-teal-400" />,
              avatarBg: "bg-teal-950/80",
              tag: "⚙️ STOCK ADJUST",
              sender: "Warehouse • now"
            };
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto w-full border border-zinc-800/75 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl transition-all duration-300 transform scale-100 hover:scale-[1.02] flex flex-col p-3 pointer-events-auto relative z-55 animate-in slide-in-from-top-8 duration-300 ${styles.bg}`}
            >
              {/* Top Android Status Band */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2 font-sans pb-1.5 border-b border-zinc-800/50">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#25D366] text-xs font-bold">💬</span>
                  <span className="font-extrabold tracking-wider font-mono text-[9px] uppercase text-emerald-400">WhatsApp Notification</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-400 font-mono text-[9px] lowercase">{styles.sender}</span>
                </div>
                <button
                  onClick={() => dismissToast(t.id)}
                  className="text-zinc-500 hover:text-white transition p-1 hover:bg-zinc-800 rounded-full cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>

              {/* Toast Message Layout mimicking a heads-up message container */}
              <div className="flex items-start gap-3">
                {/* Simulated Contact Avatar */}
                <div className={`h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold relative shadow-inner ${styles.avatarBg}`}>
                  {styles.icon}
                  {/* Small WhatsApp badge accent on Avatar bottom-right */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-[#25D366] rounded-full border border-zinc-950 flex items-center justify-center text-[8px] text-zinc-950">
                    ✔
                  </span>
                </div>

                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between gap-2.5">
                    <span className="text-[11px] font-black text-white uppercase tracking-tight">
                      {styles.tag}
                    </span>
                  </div>
                  <p className="font-sans text-xs font-semibold leading-relaxed break-words text-zinc-300 mt-0.5">
                    {t.message}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
        
        {/* Android / WhatsApp Native Push Permission Prompt Banner */}
        {nativePermissionStatus === "default" && !dismissedPermissionPrompt && (
          <div className="bg-emerald-950/95 border-2 border-emerald-600 text-slate-100 rounded-2xl shadow-xl p-5 relative overflow-hidden animate-in fade-in slide-in-from-top-3 duration-250">
            {/* Visual Decorative Accent grids */}
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -left-6 -bottom-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-lg pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
              <div className="flex items-start gap-4">
                <div className="bg-[#25D366] text-black p-3 rounded-full shadow-md animate-bounce flex-shrink-0">
                  <Bell className="h-6 w-6 text-zinc-950" />
                </div>
                <div>
                  <h4 className="font-bold text-sm md:text-base text-emerald-300 flex items-center gap-2">
                    🔔 Connect Wara Wara WhatsApp & Push Alerts
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed font-sans">
                    Authorize this device to receive instant <strong className="text-emerald-400 font-extrabold font-mono">WhatsApp-style pull-down notifications</strong>. They run natively in your Android/iPhone notification drawer and PC system tray so you never miss real-time material dispatches, critical stock shortages, or security alerts, even when your phone is in your pocket.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
                <button
                  onClick={() => setDismissedPermissionPrompt(true)}
                  className="px-3.5 py-1.5 focus:outline-none hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition"
                >
                  Later
                </button>
                <button
                  onClick={async () => {
                    const result = await requestNotificationPermission();
                    if (result) {
                      setDismissedPermissionPrompt(true);
                    }
                  }}
                  className="bg-[#25D366] hover:bg-[#20ba56] text-slate-950 text-xs font-extrabold px-4.5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 tracking-wide cursor-pointer active:scale-95"
                >
                  <span>💬</span>
                  Connect Phone Alerts
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Interactive Step-by-Step User Manual */}
        <div className="bg-indigo-900 text-white rounded-2xl shadow-md border border-indigo-950 overflow-hidden">
          <div 
            onClick={() => setShowManual(!showManual)}
            className="p-4 bg-indigo-950 flex items-center justify-between cursor-pointer group hover:bg-slate-900 transition"
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="h-5 w-5 text-emerald-400 group-hover:rotate-12 transition-transform duration-250 animate-pulse" />
              <div>
                <h3 className="font-bold text-sm md:text-base flex items-center gap-2">
                  📖 Step-by-Step Store User Guide (Nabieu Conteh & Clerks)
                </h3>
                <p className="text-xs text-indigo-350 font-mono">Roles explanations, password locks, and administrative operations guide</p>
              </div>
            </div>
            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              {currentUser?.role === "admin" && (
                <button
                  onClick={() => {
                    const printContent = document.getElementById("wara-wara-user-manual")?.innerHTML;
                    if (!printContent) return;
                    const printWindow = window.open("", "_blank");
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>User Manual - Watasai Stone & Wara Wara Construction</title>
                            <style>
                              body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; }
                              h2 { color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; text-transform: uppercase; margin-top: 0; }
                              h4 { font-size: 15px; color: #1e3a8a; border-left: 4px solid #3b82f6; padding-left: 10px; margin-top: 25px; margin-bottom: 10px; font-weight: bold; }
                              p, li { font-size: 13px; color: #334155; }
                              strong { color: #0f172a; }
                              .badge { font-weight: bold; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 11px; }
                              .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin: 15px 0; }
                              .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc; }
                              .footer { margin-top: 50px; border-top: 1px solid #cbd5e1; padding-top: 20px; text-align: center; font-size: 11px; color: #64748b; }
                            </style>
                          </head>
                          <body>
                            <h2>📖 Wara Wara Stores & Sales App - Operational User Handbook</h2>
                            <p style="font-size: 13px; color: #1e293b; margin-top: -8px; font-weight: bold; font-family: monospace;">
                              Wara Wara Construction and general services , 8 Shekie Bockarie street Kabala . version 1.26
                            </p>
                            <p style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-top: 4px; font-weight: bold;">
                              Authoritative Systems Reference • Kabala Town, Koinadugu Zone, Sierra Leone
                            </p>
                            <div style="margin-top: 20px;">
                              ${printContent}
                            </div>
                            <div class="footer">
                              <p>All rights reserved this software is a property of Wara Wara Construction and General Services and Wata Sai Stone Investment .</p>
                              <p style="font-weight: bold; font-size: 11px;">Software built and managed by Andrew Tech Solutions (andrewdrive2025@gmail.com)</p>
                            </div>
                            <script>
                              window.onload = function() {
                                window.print();
                                setTimeout(function() { window.close(); }, 500);
                              };
                            </script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }
                  }}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm relative z-20"
                >
                  🖨️ Print Handbook
                </button>
              )}
              <div className="p-1 rounded-lg bg-indigo-805 text-white">
                {showManual ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </div>

          {showManual && (
            <div id="wara-wara-user-manual" className="p-6 space-y-6 text-sm divide-y divide-indigo-800/50 bg-[#1e1b4b]">
              
              {/* Official Manual Header Credit */}
              <div className="bg-slate-950/85 border border-indigo-500/30 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-lg">
                <div className="space-y-1">
                  <span className="text-[10px] bg-indigo-950 border border-indigo-800 text-indigo-300 font-mono px-2 py-0.5 rounded font-extrabold uppercase tracking-widest">
                    Authorized Store Handbook Registry
                  </span>
                  <p className="text-white text-xs font-mono font-semibold leading-relaxed tracking-wide">
                    Wara Wara Construction and general services , 8 Shekie Bockarie street Kabala . version 1.26
                  </p>
                </div>
                <div className="bg-emerald-950 text-emerald-400 font-mono text-[10px] font-extrabold px-3 py-1 rounded border border-emerald-800/60 uppercase shrink-0">
                  ACTIVE MANUAL
                </div>
              </div>

              {/* Visual Workflows Infographic Section */}
              <div className="space-y-4 pb-5">
                <h4 className="text-emerald-300 font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="bg-emerald-950 text-emerald-300 h-5 w-5 rounded-full flex items-center justify-center text-[10px]">📊</span>
                  Operations Workflow Infographic Map
                </h4>
                <p className="text-indigo-205 text-indigo-200 text-xs leading-relaxed">
                  Refer to this digital diagram during clerk onboarding and morning brief trainings to visualize the three pillars of Wara Wara Construction daily transactions:
                </p>
                <div className="p-4 bg-slate-900/50 rounded-xl border border-indigo-900 flex flex-col lg:flex-row gap-5 items-stretch">
                  
                  {/* Diagram Card with Header and Footer Credits */}
                  <div className="lg:col-span-4 bg-[#0f172a] rounded-xl border border-indigo-900 overflow-hidden flex flex-col justify-between w-full max-w-4xl mx-auto shadow-md">
                    <div className="bg-indigo-950 px-3 py-2 border-b border-indigo-900/60 text-left">
                      <span className="text-[10px] uppercase font-bold text-indigo-300 font-mono tracking-wider block leading-tight">Wara Wara Construction and general services , 8 Shekie Bockarie street Kabala . version 1.26</span>
                      <span className="text-[8px] text-slate-400 font-mono block leading-none mt-1">SYSTEMS PROTOCOLS WORKFLOW MAP</span>
                    </div>

                    <div className="p-4 bg-white flex-grow flex items-center justify-center">
                      <img
                        src={workflowsDiagram}
                        alt="Wara Wara Construction Systems Workflow Infographic Diagram"
                        referrerPolicy="no-referrer"
                        className="w-full h-auto object-contain select-none max-h-[500px] mx-auto opacity-100"
                      />
                    </div>

                    <div className="bg-indigo-950/80 px-3 py-2 border-t border-indigo-900/40 text-[9px] text-slate-400 font-mono text-center flex items-center justify-between gap-2">
                      <span>Document ID: WF-MAP-001</span>
                      <span className="font-bold text-emerald-400">APPROVED BY NABIEU CONTEH</span>
                      <span>SECURE LOGISTICS</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 gap-3 text-left text-[11px] leading-relaxed text-slate-350 justify-center">
                    <div className="p-3.5 bg-indigo-950/65 rounded-lg border border-indigo-900 space-y-1">
                      <strong className="text-emerald-400 block font-bold">🛒 1. Point of Sale Cash Checkout</strong>
                      <p className="text-slate-300 font-sans">
                        Add items from Catalog to checkout cart, enter reference data, select transaction mode, and print instant paper receipts. Shelf stocks are modified in real-time on finalizing standard payments.
                      </p>
                    </div>
                    <div className="p-3.5 bg-indigo-950/65 rounded-lg border border-indigo-900 space-y-1">
                      <strong className="text-amber-400 block font-bold">📦 2. Pre-Paid TBC Tickets & Cargo Pickup</strong>
                      <p className="text-slate-300 font-sans">
                        Register customer's prepayment. This records full sales revenue immediately, but warehouse stock is held untouched. Clerks hand over materials in multiple separate pickup sessions, logging exact quantities taken.
                      </p>
                    </div>
                    <div className="p-3.5 bg-indigo-950/65 rounded-lg border border-indigo-900 space-y-1">
                      <strong className="text-blue-400 block font-bold">🏦 3. Safe-to-Bank Deposit Transit</strong>
                      <p className="text-slate-300 font-sans">
                        When physical Cash-in-Vault reaches high volumes, store runner cashiers deposit it at commercial banks, subtracting vault levels, and logging official deposit slip serial numbers.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 1: Authentication, Passwords & Staff Enrollment */}
              <div className="space-y-4 pb-5 pt-5 border-t border-indigo-900/40">
                <h4 className="text-emerald-300 font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="bg-emerald-950 text-emerald-300 h-5 w-5 rounded-full flex items-center justify-center text-[10px]">1</span>
                  Login credentials, Staff Enrollment & Password Reset Keys
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  <div className="lg:col-span-8 bg-indigo-950/70 p-5 rounded-xl border border-indigo-805 space-y-3.5 text-indigo-200 text-xs font-sans">
                    <div className="space-y-1.5 text-slate-300">
                      <p className="font-bold text-indigo-200">👥 SYSTEM ACCESS DIRECTORY DETAILS:</p>
                      <ul className="list-disc pl-5 space-y-1 text-[11px]">
                        <li>👑 <strong>Nabieu Conteh</strong> (Store Administrator): Username <strong>Nabieu</strong> • Password <strong>12345</strong> (Full administrative control)</li>
                        <li>🧑 <strong>Amadu</strong> (Clerk - Stock & Sales access): Username <strong>amadu</strong> • Password <strong>123</strong></li>
                        <li>🧑 <strong>Kello</strong> (Clerk - Sales-only access): Username <strong>kello</strong> • Password <strong>123</strong></li>
                      </ul>
                    </div>

                    <div className="space-y-2 border-t border-indigo-900/50 pt-3">
                      <p className="font-bold text-indigo-200">🛠️ WORKFORCE ENROLLMENT & SYSTEM PRIVILEGES PROTOCOL:</p>
                      <ol className="list-decimal pl-5 space-y-1.5 text-slate-300 text-[11px]">
                        <li>
                          <strong>Navigate to Registry:</strong> Access the <strong className="text-white">Active Team Directory</strong> (Staff Security tab) from the workspace header.
                        </li>
                        <li>
                          <strong>Fill Enrolment Form:</strong> Input the employee's full legal name, assign an active login ID, and draft their initial temporary password.
                        </li>
                        <li>
                          <strong>Bind Action Permits:</strong> Map critical system capabilities by toggling individual switches (e.g. <em>Authorized to Process POS Cash Sales</em>, <em>Authorized to Offload Cargo Consignments</em>, or <em>Authorized to Register Expenditures</em>).
                        </li>
                        <li>
                          <strong>Save Workspace Profile:</strong> Click <strong className="text-white">Enrol Staff Profile</strong> to permanently save.
                        </li>
                        <li>
                          <strong>Reset Security Keys:</strong> If a clerk forgets their credentials, Nabieu Conteh can click the individual **Reset Key 🔑 Button** next to their directory row, type a new password, and verify changes instantly.
                        </li>
                        <li>
                          <strong>Access Termination:</strong> Erase or revoke access privileges entirely by clicking the administrative **Delete Trash Icon** on the respective row.
                        </li>
                      </ol>
                    </div>
                  </div>

                  {/* Figure Panel with elegant Header and Footer Credits */}
                  <div className="lg:col-span-4 bg-[#0f172a] rounded-xl border border-indigo-900 overflow-hidden flex flex-col justify-between text-center max-w-md mx-auto w-full shadow-md">
                    <div className="bg-indigo-950 px-2.5 py-1.5 border-b border-indigo-900/60 text-left">
                      <span className="text-[10px] uppercase font-bold text-indigo-300 font-mono tracking-wider block leading-tight">Wara Wara Construction and general services , 8 Shekie Bockarie street Kabala . version 1.26</span>
                      <span className="text-[7.5px] text-slate-400 font-mono block mt-1">STAFF REGISTRY CONTROL DESK</span>
                    </div>

                    <div className="p-3 bg-white/95 flex-grow flex items-center justify-center">
                      <div className="p-1.5 w-full max-w-xs mx-auto border border-violet-150 rounded bg-white">
                        <img
                          src={staffEnrollmentImg}
                          alt="Staff Enrollment and Permissions Illustration"
                          referrerPolicy="no-referrer"
                          className="w-full h-auto object-contain rounded select-none max-h-[280px] mx-auto"
                        />
                      </div>
                    </div>

                    <div className="bg-indigo-950/80 px-2.5 py-1.5 border-t border-indigo-900/40 text-[9px] text-slate-400 font-mono text-center flex justify-between">
                      <span>Figure 1: Workforce ID</span>
                      <span className="font-bold text-indigo-200">INTERNAL DIRECTORY</span>
                      <span>VERIFIED</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Admin Control Rules */}
              <div className="space-y-4 pt-5 pb-5 border-t border-indigo-900/40">
                <h4 className="text-indigo-200 font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="bg-indigo-800 text-indigo-200 h-5 w-5 rounded-full flex items-center justify-center text-[10px]">2</span>
                   Admin Panel Tasks & Training Resets (Nabieu Conteh Powers Only)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 bg-indigo-950/40 rounded-xl border border-indigo-900 space-y-2">
                    <p className="font-bold text-emerald-300 flex items-center gap-1">➕ Create / Add Items</p>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Select the <strong className="text-indigo-200">Inventory Stock Shelf</strong> tab. Click the green button <span className="bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">Add New Material SKU</span> in the header. Enter custom SKU ID, full material name, category selection, selling price, and initial shelved stock. Click Add.
                    </p>
                  </div>

                  <div className="p-3.5 bg-indigo-950/40 rounded-xl border border-indigo-900 space-y-2">
                    <p className="font-bold text-indigo-300 flex items-center gap-1">🔑 Customize Passwords</p>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Select <strong className="text-indigo-200">Staff Security Directory</strong> tab. Inside the active team grid, locate any profile including your own admin card. Click the <strong className="text-indigo-300">Key 🔑 Button</strong>, enter a strong new password, and click <strong className="text-white">Change Password</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 bg-indigo-950/40 rounded-xl border border-indigo-900 space-y-2">
                    <p className="font-bold text-indigo-200 flex items-center gap-1">👥 Manage Team Directory</p>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Select <strong className="text-indigo-200">Staff Security Directory</strong> tab. Add new staff names, assign roles, toggle checkboxes for stock offloading or sales processing, and click Enrol. To delete a clerk, click the trash icon next to their row.
                    </p>
                  </div>
                </div>

                <div className="bg-rose-950/35 border border-rose-900 p-4 rounded-xl text-xs space-y-2 leading-relaxed">
                  <p className="font-bold text-rose-350 flex items-center gap-2">
                    <span>♻️</span>
                    <span>TRAINING SESSIONS DATABASE WIPE & LEGER AMENDMENTS</span>
                  </p>
                  <p className="text-slate-300 text-[11px]">
                    To facilitate smooth employee onboarding and mock training scenarios, the root admin account <strong>Nabieu</strong> is empowered with custom database pruning actions:
                  </p>
                  <ul className="list-disc pl-5 text-[11px] text-slate-300 space-y-1">
                    <li>
                      <strong>One-Click Training Reset:</strong> On the <strong className="text-indigo-250">Staff Security Directory</strong> tab, clicking the pulsing red <span className="bg-rose-600 px-1.5 py-0.5 rounded font-black text-white text-[10px]">Training Reset</span> button deletes all mock Sales Invoices, TBC tickets, Site Expenditures, and Bank Deposits, while dropping all product stocks to 0 to trigger shortage warnings so that manual restocking can be simulated before continuing sales.
                    </li>
                    <li>
                      <strong>On-the-Fly Ledger Corrections:</strong> Nabieu can correct clerk errors directly in the <strong className="text-indigo-250">Sales Ledger & Registry Profiles</strong> by clicking the orange edit icon <span className="text-amber-500 font-bold">✏️</span> or deleting redundant transaction entries completely.
                    </li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono bg-indigo-950/50 p-3 h-auto rounded-xl border border-indigo-900">
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    ⚙️ <strong>Restock Cargo:</strong> Click the <strong className="text-indigo-200">Offload Stock</strong> button under any card on the Catalog, input the consignment volume, and confirm.
                  </p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    ⚙️ <strong>Change Unit Price:</strong> Click the blue edit pencil button <strong className="text-indigo-200">✏️</strong> on any product card, enter price in SLe, and confirm changes.
                  </p>
                </div>
              </div>

              {/* Step 3: Clerk and Sales Operations */}
              <div className="space-y-4 pt-5 pb-5 border-t border-indigo-900/40">
                <h4 className="text-indigo-200 font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="bg-indigo-800 text-indigo-200 h-5 w-5 rounded-full flex items-center justify-center text-[10px]">3</span>
                  Point-of-Sale (POS) Checkouts & Prepaid To-Be-Collected (TBC) Workflows
                </h4>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs text-indigo-200">
                  
                  {/* Left Section: Standard POS Checkout steps */}
                  <div className="lg:col-span-4 bg-indigo-950/55 p-4 rounded-xl border border-indigo-900 flex flex-col justify-between">
                    <div className="space-y-3">
                      <p className="font-bold text-white flex items-center gap-1 bg-indigo-905 p-1 rounded">
                        🛒 STANDARD POS CASH SALES (STEP-BY-STEP):
                      </p>
                      
                      {/* POS Diagram with Header and Footer Credits */}
                      <div className="bg-[#0f172a] rounded-xl border border-indigo-900 overflow-hidden flex flex-col justify-between text-center mx-auto w-full shadow-md max-w-md">
                        <div className="bg-indigo-950 px-3 py-1.5 border-b border-indigo-900/60 text-left">
                          <span className="text-[9px] uppercase font-bold text-indigo-300 font-mono tracking-wider block leading-tight">Wara Wara Construction and general services , 8 Shekie Bockarie street Kabala . version 1.26</span>
                          <span className="text-[7.5px] text-slate-400 font-mono block mt-1">CASHIER CONSOLE SCHEMATIC</span>
                        </div>
                        <div className="p-3 bg-white flex items-center justify-center">
                          <img
                            src={posCheckoutImg}
                            alt="Point of Sale checkout process diagram"
                            referrerPolicy="no-referrer"
                            className="w-full h-auto object-contain rounded select-none max-h-[250px] mx-auto"
                          />
                        </div>
                        <div className="bg-indigo-950/80 px-2 py-1 border-t border-indigo-900/40 text-[8px] text-slate-400 font-mono text-center">
                          Figure 2(a): Live POS Client Invoice Checkout Flow
                        </div>
                      </div>

                      <ol className="list-decimal pl-5 space-y-1 text-slate-300 text-[11px] leading-relaxed">
                        <li>Navigate to the <strong className="text-indigo-105">POS Cash Register</strong> workspace.</li>
                        <li>Verify that standard mode is selected in the toggle.</li>
                        <li>Click items in the Catalog card shelf to fill active cart slots.</li>
                        <li>Input checkout metadata identifiers (Customer billing Name, reference numbers).</li>
                        <li>Select payment method: **Cash**, **Bank Cheque**, or **Mobile Money Wallet**.</li>
                        <li>Input the exact paper cheque serial ID or network TXN reference hash if choosing bank/cheque/momo.</li>
                        <li>Click <strong className="text-white">Finalize Cash Checkout</strong>. Real-time product counts decrease instantly, sales ledger tracks the transaction, and an instant paper invoice receipt is printed.</li>
                      </ol>
                    </div>
                  </div>

                  {/* Right Section: Prepaid TBC Booking steps */}
                  <div className="lg:col-span-8 bg-indigo-950/55 p-4 rounded-xl border border-indigo-900 flex flex-col lg:flex-row gap-5 items-stretch">
                    
                    {/* TBC Texts guide */}
                    <div className="flex-1 space-y-3">
                      <p className="font-bold text-white flex items-center gap-1 bg-indigo-905 p-1 rounded">
                        📦 PRE-PAID TO-BE-COLLECTED (TBC) REGISTER & DOUBLE RECEIPTS:
                      </p>
                      <p className="text-[11px] text-slate-300 font-semibold italic">
                        * Essential for clients who pay today but collect cargo in separate split dispatches over multiple days.
                      </p>
                      
                      <ol className="list-decimal pl-5 space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                        <li>
                          <strong>Register Prepayment:</strong> On the POS register, toggle the checkout type to <strong className="text-yellow-400">Prepaid TBC Registry Ticket</strong>, add client items, input patient billing name, choose collection ticket limits (14, 30, or 60 days limit), and click <strong className="text-white bg-indigo-700 px-1 py-0.5 rounded text-[10px]">Dispatch TBC Registration</strong>. Revenue is recorded today, but stock shelf counts are held secure.
                        </li>
                        <li>
                          <strong>Customer Warehouse Pickup:</strong> When the client or standard runner arrives to collect materials physically at the yard, navigate to the <strong className="text-white">Pre-Paid TBC Registry</strong> ledger.
                        </li>
                        <li>
                          <strong>Material Handover Form:</strong> Click <strong className="text-white">Collect Shipment</strong> to open the cargo dispatch release gate.
                        </li>
                        <li>
                          <strong>Log Partial / Multi-session Quantities:</strong> Rather than forcing a full checkout, key-in the exact quantity of products physically being loaded on the truck in this session.
                        </li>
                        <li>
                          <strong>Mathematical Safeguard:</strong> The system enforces that physical collections cannot exceed the remaining balance of materials already prepaid under this ticket ID (Already Taken + Dispense Today must be less than or equal to Total Paid).
                        </li>
                        <li>
                          <strong>Print Separate Pickup Receipts:</strong> Input the pickup driver's legal name. Click <strong className="text-white bg-indigo-700 px-1 py-0.5 rounded text-[10px]">Release Cargo & Print Slip</strong>.
                        </li>
                        <li>
                          <strong>Separate Log Tracking:</strong> Product stock diminishes in real-time, the ticket balance recalculates (status shifts: Pending to Partial to Collected), and a standalone printable Handover Receipt document with official sign-off areas is logged.
                        </li>
                      </ol>
                    </div>

                    {/* TBC Diagram with Header and Footer Credits */}
                    <div className="lg:col-span-4 bg-[#0f172a] rounded-xl border border-indigo-900 overflow-hidden flex flex-col justify-between text-center max-w-md mx-auto w-full shadow-md shrink-0">
                      <div className="bg-indigo-950 px-2.5 py-1.5 border-b border-indigo-900/60 text-left">
                        <span className="text-[9px] uppercase font-bold text-indigo-300 font-mono tracking-wider block leading-tight">Wara Wara Construction and general services , 8 Shekie Bockarie street Kabala . version 1.26</span>
                        <span className="text-[7.5px] text-slate-400 font-mono block mt-1">CARGO YARD LOGISTICS</span>
                      </div>
                      <div className="p-4 bg-white flex-grow flex items-center justify-center">
                        <div className="p-1.5 border border-amber-200 rounded bg-white w-full max-w-[240px] mx-auto">
                          <img
                            src={tbcDispatchImg}
                            alt="TBC booking and cargo collection dispatch process"
                            referrerPolicy="no-referrer"
                            className="w-full h-auto object-contain rounded select-none max-h-[250px] mx-auto"
                          />
                        </div>
                      </div>
                      <div className="bg-indigo-950/80 px-2.5 py-1.5 border-t border-indigo-900/40 text-[8px] text-slate-400 font-mono text-center">
                        Figure 2(b): TBC Parcel Dispatch & Gatekeeper release
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Step 4: Operational Expenditures */}
              <div className="space-y-4 pt-5 pb-5 border-t border-indigo-900/40 text-xs text-indigo-205">
                <h4 className="text-indigo-300 font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="bg-indigo-800 text-indigo-200 h-5 w-5 rounded-full flex items-center justify-center text-[10px]">4</span>
                  Step-by-Step Logging of Operational Site Expenditures
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  <div className="lg:col-span-8 space-y-3 leading-relaxed text-slate-300 text-xs">
                    <p className="leading-relaxed font-sans font-sans">
                      To successfully log site expenditure and decrement central funds, go through these steps:
                    </p>
                    <ol className="list-decimal pl-5 space-y-1.5 text-[11px] text-slate-300 font-sans leading-relaxed">
                      <li>
                        <strong>Select Tab Ledger:</strong> Navigate to the <strong className="text-indigo-200">Locked Sales Ledger</strong> core screen and click onto the <strong className="text-indigo-200">Expenditure Ledger</strong> sub-tab.
                      </li>
                      <li>
                        <strong>Access Security Level:</strong> Ensure that you are an authorized personnel Clerk or Administrator Nabieu Conteh (both have active credentials to document day-to-day expenditures).
                      </li>
                      <li>
                        <strong>Choose Expense Category:</strong> Select the matching class of operational expenditure via the Category dropdown (e.g. ⛽ Fuel, 🚖 Staff Transport, 🛠️ Site Repairs, 🔋 Utility/Comm, 👮 Site Security).
                      </li>
                      <li>
                        <strong>Specify Amount (SLe):</strong> Input the precise expendable amount down to Leones in the Amount field.
                      </li>
                      <li>
                        <strong>Provide Narrative Description:</strong> State the explicit purpose and brief details of whom or what the expenditure purchase resolves.
                      </li>
                      <li>
                        <strong>Define Approving Authority:</strong> Clearly specify which managing staff officer sanctioned and cleared the disbursement of cash capital (e.g. <em>Authorized by Nabieu Conteh</em>).
                      </li>
                      <li>
                        <strong>Log Approved Expenditure:</strong> Click the green button. System capital reserves in the physical Safe Vault are instantly adjusted, and the transaction is committed to the chronicled logging.
                      </li>
                    </ol>
                  </div>

                  {/* Figure Panel with elegant Header and Footer Credits */}
                  <div className="lg:col-span-4 bg-[#0f172a] rounded-xl border border-indigo-900 overflow-hidden flex flex-col justify-between text-center max-w-md mx-auto w-full shadow-md">
                    <div className="bg-indigo-950 px-2.5 py-1.5 border-b border-indigo-900/60 text-left">
                      <span className="text-[10px] uppercase font-bold text-indigo-300 font-mono tracking-wider block leading-tight">Wara Wara Construction and general services , 8 Shekie Bockarie street Kabala . version 1.26</span>
                      <span className="text-[7.5px] text-slate-400 font-mono block mt-1">CASH BALANCES DISBURSEMENT VOUCHER</span>
                    </div>

                    <div className="p-4 bg-white flex-grow flex items-center justify-center">
                      <div className="p-1.5 w-full max-w-xs mx-auto border border-indigo-300 rounded bg-white">
                        <img
                          src={expenditureImg}
                          alt="Operational Expenditure Log Diagram"
                          referrerPolicy="no-referrer"
                          className="w-full h-auto object-contain rounded select-none max-h-[280px] mx-auto"
                        />
                      </div>
                    </div>

                    <div className="bg-indigo-950/80 px-2.5 py-1.5 border-t border-indigo-900/40 text-[9px] text-slate-400 font-mono text-center flex justify-between">
                      <span>Figure 3: Expense Log</span>
                      <span className="font-bold text-indigo-200">INTERNAL AUDIT BOOK</span>
                      <span>SECURE RECORD</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Step 5: Commercial Banking Deposits & Bank Cheques (Asset Reconciliation) */}
              <div className="space-y-4 pt-5 pb-5 border-t border-indigo-900/40 text-xs text-indigo-205">
                <h4 className="text-emerald-300 font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="bg-emerald-950 text-emerald-300 h-5 w-5 rounded-full flex items-center justify-center text-[10px]">5</span>
                  Commercial Banking Deposits & Bank Cheque Controls (Asset Reconciliation)
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  <div className="lg:col-span-8 bg-slate-900/60 p-5 rounded-xl border border-indigo-900 space-y-4 text-indigo-200 text-xs font-sans leading-relaxed">
                    
                    <div className="space-y-1">
                      <p className="font-extrabold text-white flex items-center gap-1">🏦 STEP-BY-STEP COMMERCIAL CHEQUE SETTLEMENTS:</p>
                      <ol className="list-decimal pl-5 space-y-1 text-slate-300 text-[11px]">
                        <li>Select **Bank Cheque** from the payment options drop-down list on checkout register cart.</li>
                        <li><strong>Enter Document Serial Key:</strong> Key in the official Bank Cheque Serial Slip paper ID inside the transaction invoice reference field. This binds physical paper documents directly to database invoicing logs.</li>
                        <li>Click POS payment. Proceeds are calculated separately under **🏦 BANK CHEQUES** aggregates, meaning cashier physical drawers do not inflate with uncleared cheque materials.</li>
                      </ol>
                    </div>

                    <div className="space-y-1 font-sans border-t border-indigo-950/60 pt-3">
                      <p className="font-extrabold text-white flex items-center gap-1">💸 STEP-BY-STEP SAFE VAULT TO COMMERCIAL BANK CASH DEPOSITS TRIPS:</p>
                      <ol className="list-decimal pl-5 space-y-1.5 text-slate-300 text-[11px]">
                        <li><strong>Verify Running Vault levels:</strong> Monitor the store central Vault reserves Cash-on-hand tracking level.</li>
                        <li><strong>Initiate Safe Transit:</strong> When drawer vaults reach threshold volumes, assign an official carrier runner cashier to carry the physical assets out to local commercial banks (e.g. Rokel Commercial Bank or SLCB).</li>
                        <li>Navigate to **Locked Sales Ledger**, switch to <strong className="text-slate-100 italic">Bank Deposits & Vault Cash</strong> desk.</li>
                        <li>Input the exact **Deposit Amount in SLe** which is physically exiting the building.</li>
                        <li>Store account parameters details inside **Deposited To (Bank Name & Account name)**.</li>
                        <li>Clearly specify the name of the staff carrier runner.</li>
                        <li>Enter the official paper bank **Deposit Slip Serial ID / Paper slip ID** for audit compliance matching.</li>
                        <li>Click **Record Banking Deposit**. This decreases physical store **Vault Cash reserves**, records transactions in the central history registry, and updates timestamps on ledger.</li>
                      </ol>
                    </div>
                  </div>

                  {/* Figure Panel with elegant Header and Footer Credits */}
                  <div className="lg:col-span-4 bg-[#0f172a] rounded-xl border border-indigo-900 overflow-hidden flex flex-col justify-between text-center max-w-md mx-auto w-full shadow-md">
                    <div className="bg-indigo-950 px-2.5 py-1.5 border-b border-indigo-900/60 text-left">
                      <span className="text-[10px] uppercase font-bold text-indigo-300 font-mono tracking-wider block leading-tight">Wara Wara Construction and general services , 8 Shekie Bockarie street Kabala . version 1.26</span>
                      <span className="text-[7.5px] text-slate-400 font-mono block mt-1">RESERVES DISBURSEMENT TRANSPORT DESK</span>
                    </div>

                    <div className="p-4 bg-white flex-grow flex items-center justify-center">
                      <div className="p-1.5 w-full max-w-xs mx-auto border border-emerald-350 rounded bg-white">
                        <img
                          src={bankDepositImg}
                          alt="Vault Cash to Commercial Bank Deposit Diagram"
                          referrerPolicy="no-referrer"
                          className="w-full h-auto object-contain rounded select-none max-h-[280px] mx-auto"
                        />
                      </div>
                    </div>

                    <div className="bg-indigo-950/80 px-2.5 py-1.5 border-t border-indigo-900/40 text-[9px] text-slate-400 font-mono text-center flex justify-between">
                      <span>Figure 4: Bank Slip</span>
                      <span className="font-bold text-emerald-400 font-mono">ROKEL & SLCB TRANSIT</span>
                      <span>CERTIFIED LOG</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Step 6: Company Header Letterhead and Contacts */}
              <div className="space-y-3 pt-5 text-xs text-indigo-205 border-t border-indigo-900/40">
                <h4 className="text-indigo-305 font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="bg-indigo-800 text-indigo-200 h-5 w-5 rounded-full flex items-center justify-center text-[10px]">6</span>
                  Company Branded Information & Printable Reports Header
                </h4>
                <div className="p-4 bg-slate-900/60 rounded-xl border border-indigo-900 space-y-2 text-indigo-100 text-xs">
                  <p className="font-extrabold text-white text-xs">🏛️ OFFICIAL REGISTERED TRADING OFFICE:</p>
                  <ul className="text-[11px] text-slate-300 space-y-1 font-mono">
                    <li>🏥 <strong>Physical Address:</strong> 8 Shekie Bockarie Street, Kabala Town, Sierra Leone</li>
                    <li>📞 <strong>Hotline 1 (Orange):</strong> 076667575</li>
                    <li>📞 <strong>Hotline 2 (Africell):</strong> 077263939</li>
                    <li>✉️ <strong>Corporate Email:</strong> warawaraconstructionkoinadugu@gmail.com</li>
                  </ul>
                  <p className="text-[11px] leading-relaxed text-slate-350 font-sans">
                    * The official company logo and address details have been embedded inside printable reports and invoices generated by this system to ensure accurate branding.
                  </p>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* TOP Duty Tasks Dashboard Bar (ontop) */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">● Live Store Dispatch & Task Operations (Ontop Dashboard)</p>
          <TaskStatusGrid 
            lowStockCount={lowStockCount} 
            pendingTbcCount={pendingTbcCount} 
            totalSalesCount={totalSalesCount}
            currentUser={currentUser}
            onNavigate={setActiveTab}
          />
        </div>

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
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-120">
            {/* Real-time Push & Playback Controller */}
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] md:text-[11px] font-mono tracking-wider font-extrabold text-slate-300">🔔 REAL-TIME SECURE LOG ALERTS</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Native Browser permissions Setup */}
                {nativePermissionStatus === "default" && (
                  <button
                    onClick={() => requestNotificationPermission()}
                    className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[10px] font-bold px-2.5 py-1 rounded-md transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    title="Allow notifications on PC & Mobile background tabs"
                  >
                    <Bell className="h-3 w-3" />
                    <span>Enable PC & Mobile Alerts</span>
                  </button>
                )}
                
                {nativePermissionStatus === "granted" && (
                  <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-900 text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    PC & MOBILE ALERTS ACTIVE
                  </span>
                )}

                {nativePermissionStatus === "denied" && (
                  <span className="bg-red-950/80 text-red-400 border border-red-900 text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono" title="Notifications are blocked in this browser. Please enable them in your browser/device settings.">
                    ⚠️ ALERTS BLOCKED (RESTORE IN SITE SETTINGS)
                  </span>
                )}

                {/* Sound System Chimes Toggle */}
                <div className="flex items-center gap-2 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold font-mono">CHIME SOUND</span>
                  <button
                    onClick={() => {
                      const mode = !soundEnabled;
                      setSoundEnabled(mode);
                      if (mode) {
                        setTimeout(() => playNotificationSound(), 50);
                      }
                    }}
                    className={`relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      soundEnabled ? "bg-indigo-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        soundEnabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Test Chime Trigger */}
                <button
                  onClick={() => playNotificationSound()}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:text-white text-[10px] font-bold px-2.5 py-1 rounded-md transition flex items-center gap-1 cursor-pointer"
                  title="Test Synthesizer Audio Notification Sound"
                >
                  <span>🔊 Test Sound</span>
                </button>
              </div>
            </div>

            {/* Filter buttons to inspect, categorize and isolate logs easily */}
            {(() => {
              const getNotificationCategory = (message: string, type: string) => {
                const msg = message.toLowerCase();
                if (msg.includes("login") || msg.includes("logout") || msg.includes("logged out") || msg.includes("validation failed") || msg.includes("credentials") || msg.includes("password")) {
                  return "auth";
                }
                if (msg.includes("sale") || msg.includes("invoice") || msg.includes("revenue") || msg.includes("paid")) {
                  return "revenue";
                }
                if (msg.includes("restock") || msg.includes("pricing") || msg.includes("stock override") || msg.includes("adjust") || msg.includes("shelving") || msg.includes("sku") || msg.includes("stock") || msg.includes("delete sku") || msg.includes("tbc") || msg.includes("dispatch") || msg.includes("collected") || msg.includes("cargo")) {
                  return "inventory";
                }
                return "other";
              };

              const authLogsCount = notifications.filter(n => getNotificationCategory(n.message, n.type || "info") === "auth").length;
              const revenueLogsCount = notifications.filter(n => getNotificationCategory(n.message, n.type || "info") === "revenue").length;
              const inventoryLogsCount = notifications.filter(n => getNotificationCategory(n.message, n.type || "info") === "inventory").length;
              const otherLogsCount = notifications.filter(n => getNotificationCategory(n.message, n.type || "info") === "other").length;

              const filteredNotifications = notifications.filter(n => {
                if (logFilter === "all") return true;
                return getNotificationCategory(n.message, n.type || "info") === logFilter;
              });

              return (
                <>
                  <div className="bg-slate-950 border-b border-slate-800 px-4 py-2 flex flex-wrap gap-2 text-xs">
                    <button
                      onClick={() => setLogFilter("all")}
                      className={`px-3 py-1.5 rounded-md font-sans text-xs transition duration-150 cursor-pointer flex items-center gap-1.5 font-bold ${
                        logFilter === "all"
                          ? "bg-indigo-600 text-white shadow-sm border border-indigo-500"
                          : "bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800"
                      }`}
                    >
                      <span>🌐 All Logs</span>
                      <span className="font-mono text-[10px] bg-slate-950/70 px-1.5 py-0.2 rounded text-slate-300 font-extrabold">{notifications.length}</span>
                    </button>

                    <button
                      onClick={() => setLogFilter("auth")}
                      className={`px-3 py-1.5 rounded-md font-sans text-xs transition duration-150 cursor-pointer flex items-center gap-1.5 font-bold ${
                        logFilter === "auth"
                          ? "bg-rose-600 text-white shadow-sm border border-rose-500"
                          : "bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800"
                      }`}
                      title="Inspect Staff Logins, Logouts, and Blocked Failures"
                    >
                      <span>🔐 Security, Logins & Auth</span>
                      {authLogsCount > 0 ? (
                        <span className="font-mono text-[10px] bg-rose-950 text-rose-200 px-1.5 py-0.2 rounded font-extrabold animate-pulse border border-rose-800">{authLogsCount}</span>
                      ) : (
                        <span className="font-mono text-[10px] bg-slate-950/70 px-1.5 py-0.2 rounded text-slate-450 font-extrabold">{authLogsCount}</span>
                      )}
                    </button>

                    <button
                      onClick={() => setLogFilter("revenue")}
                      className={`px-3 py-1.5 rounded-md font-sans text-xs transition duration-150 cursor-pointer flex items-center gap-1.5 font-bold ${
                        logFilter === "revenue"
                          ? "bg-emerald-600 text-white shadow-sm border border-emerald-555"
                          : "bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800"
                      }`}
                    >
                      <span>💰 Sales Ledger</span>
                      <span className="font-mono text-[10px] bg-slate-950/70 px-1.5 py-0.2 rounded text-slate-300 font-extrabold">{revenueLogsCount}</span>
                    </button>

                    <button
                      onClick={() => setLogFilter("inventory")}
                      className={`px-3 py-1.5 rounded-md font-sans text-xs transition duration-150 cursor-pointer flex items-center gap-1.5 font-bold ${
                        logFilter === "inventory"
                          ? "bg-teal-600 text-white shadow-sm border border-teal-500"
                          : "bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800"
                      }`}
                    >
                      <span>📦 Stock & Dispatches</span>
                      <span className="font-mono text-[10px] bg-slate-950/70 px-1.5 py-0.2 rounded text-slate-300 font-extrabold">{inventoryLogsCount}</span>
                    </button>

                    <button
                      onClick={() => setLogFilter("other")}
                      className={`px-3 py-1.5 rounded-md font-sans text-xs transition duration-150 cursor-pointer flex items-center gap-1.5 font-bold ${
                        logFilter === "other"
                          ? "bg-slate-800 text-white shadow-sm border border-slate-700"
                          : "bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800"
                      }`}
                    >
                      <span>⚙️ System</span>
                      <span className="font-mono text-[10px] bg-slate-950/70 px-1.5 py-0.2 rounded text-slate-300 font-extrabold">{otherLogsCount}</span>
                    </button>
                  </div>

                  {/* Notifications Scrollable Activity List */}
                  <div className="p-4 max-h-72 overflow-y-auto space-y-2.5 font-mono text-xs shadow-inner bg-slate-950 text-slate-200">
                    {filteredNotifications.map((n) => {
                      const msg = n.message.toLowerCase();
                      let styles = {
                        bg: "bg-indigo-500/10 border-indigo-500/30 text-indigo-200",
                        icon: <Info className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />,
                        tag: "SYSTEM"
                      };

                      if (msg.includes("unsuccessful login") || msg.includes("validation failed")) {
                        styles = {
                          bg: "bg-rose-500/20 border-rose-500/80 text-rose-100 border-[1.5px] shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse ring-1 ring-rose-500/30",
                          icon: <ShieldAlert className="h-4.5 w-4.5 text-rose-450 flex-shrink-0" />,
                          tag: "🚨 SECURITY: AUTH ATTEMPT BLOCKED"
                        };
                      } else if (msg.includes("successful login") || msg.includes("entered session safely")) {
                        styles = {
                          bg: "bg-emerald-500/15 border-emerald-500/70 text-emerald-100 border-[1.5px] border-l-[4px] shadow-[0_0_10px_rgba(16,185,129,0.15)]",
                          icon: <LogIn className="h-4 w-4 text-emerald-400 flex-shrink-0" />,
                          tag: "🔐 SECURITY: LOGIN SUCCESS"
                        };
                      } else if (msg.includes("logged out securely") || msg.includes("logged out")) {
                        styles = {
                          bg: "bg-slate-850 border-slate-600/80 text-slate-100 border-l-[4px] border-[1px]",
                          icon: <LogOut className="h-4 w-4 text-slate-400 flex-shrink-0" />,
                          tag: "🔒 SECURITY: STAFF LOGOUT"
                        };
                      } else if (msg.includes("delete") || msg.includes("remove") || msg.includes("expired") || msg.includes("reset") || n.type === "warning") {
                        styles = {
                          bg: "bg-rose-500/10 border-rose-500/40 text-rose-200 border-l-2",
                          icon: <AlertTriangle className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />,
                          tag: "SECURITY / DISCARD"
                        };
                      } else if (msg.includes("sale") || msg.includes("invoice") || msg.includes("revenue") || msg.includes("paid")) {
                        styles = {
                          bg: "bg-emerald-500/10 border-emerald-500/40 text-emerald-250 border-l-2",
                          icon: <ShoppingCart className="h-3.5 w-3.5 text-emerald-450 flex-shrink-0" />,
                          tag: "REVENUE SALE"
                        };
                      } else if (msg.includes("bank") || msg.includes("deposit")) {
                        styles = {
                          bg: "bg-cyan-500/10 border-cyan-500/40 text-cyan-205 border-l-2",
                          icon: <ShieldCheck className="h-3.5 w-3.5 text-cyan-450 flex-shrink-0" />,
                          tag: "BANK VAULT"
                        };
                      } else if (msg.includes("expenditure") || msg.includes("spent") || msg.includes("expense")) {
                        styles = {
                          bg: "bg-amber-500/10 border-amber-500/40 text-amber-205 border-l-2",
                          icon: <FileText className="h-3.5 w-3.5 text-amber-450 flex-shrink-0" />,
                          tag: "EXPENDITURE"
                        };
                      } else if (msg.includes("collected") || msg.includes("gate") || msg.includes("cargo") || msg.includes("dispatch")) {
                        styles = {
                          bg: "bg-violet-500/10 border-violet-500/40 text-violet-205 border-l-2",
                          icon: <Package className="h-3.5 w-3.5 text-violet-450 flex-shrink-0" />,
                          tag: "OUTFLOW CARGO"
                        };
                      } else if (msg.includes("restock") || msg.includes("pricing") || msg.includes("stock override") || msg.includes("adjust") || msg.includes("shelving")) {
                        styles = {
                          bg: "bg-teal-500/10 border-teal-500/40 text-teal-205 border-l-2",
                          icon: <BookOpen className="h-3.5 w-3.5 text-teal-450 flex-shrink-0" />,
                          tag: "STOCK UPDATE"
                        };
                      } else if (msg.includes("team") || msg.includes("credentials") || msg.includes("registered") || msg.includes("enrol") || msg.includes("user")) {
                        styles = {
                          bg: "bg-fuchsia-500/10 border-fuchsia-500/40 text-fuchsia-205 border-l-2",
                          icon: <Users className="h-3.5 w-3.5 text-fuchsia-450 flex-shrink-0" />,
                          tag: "ROSTER"
                        };
                      }

                      return (
                        <div
                          key={n.id}
                          className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition duration-150 hover:bg-slate-900/60 ${styles.bg}`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="mt-0.5">{styles.icon}</div>
                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                                  {styles.tag}
                                </span>
                              </div>
                              <p className="font-sans text-xs font-semibold leading-relaxed break-words text-slate-50">
                                {n.message}
                              </p>
                            </div>
                          </div>
                          
                          <span className="text-[10px] text-slate-350 font-mono whitespace-nowrap self-end sm:self-center bg-slate-900/90 py-0.5 px-2 rounded border border-slate-800">
                            {(() => {
                              const ts = n.timestamp;
                              if (!ts) return "N/A";
                              const parsed = ts && typeof ts === "object" && "seconds" in ts
                                ? new Date(ts.seconds * 1000)
                                : new Date(ts);
                              if (isNaN(parsed.getTime())) return "N/A";
                              const dateStr = parsed.toLocaleDateString([], { year: "numeric", month: "short", day: "2-digit" });
                              const timeStr = parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
                              return `${dateStr} | ${timeStr}`;
                            })()}
                          </span>
                        </div>
                      );
                    })}

                    {filteredNotifications.length === 0 && (
                      <div className="text-center py-8 text-slate-500 font-mono">
                        No activity logs recorded under this category matching the current session filter.
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Dashboard Navigation Tabs */}
        <div className="hidden md:flex bg-white p-1 rounded-xl border border-slate-150 shadow-sm overflow-x-auto scrollbar-none gap-1">
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
            <span>Inventory Stock Shelf</span>
            {lowStockCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[9px] font-extrabold font-mono bg-red-600 text-white rounded-full leading-none flex items-center justify-center min-w-[16px] h-[16px] shadow-sm animate-pulse">
                {lowStockCount}
              </span>
            )}
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
            <span>Pre-Paid TBC Registry</span>
            {expiredTbcCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[9px] font-extrabold font-mono bg-amber-500 text-white rounded-full leading-none flex items-center justify-center min-w-[16px] h-[16px] shadow-sm flex-row gap-0.5" title={`${expiredTbcCount} ticket(s) expired`}>
                ⚠️ {expiredTbcCount}
              </span>
            )}
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
            onClick={() => setActiveTab("credits")}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "credits"
                ? "bg-slate-800 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <User className="h-4 w-4" />
            <span>Debtors & Credit Registry</span>
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
          {activeTab === "credits" && <CreditBoard />}
          {activeTab === "ledger" && <SalesLedgerView />}
          {activeTab === "staff" && <StaffManager />}
        </div>

        {/* BOTTOM Duty Tasks Dashboard Bar (under) */}
        <div className="space-y-2 mt-2">
          <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">● Live Store Dispatch & Task Operations (Under Dashboard)</p>
          <TaskStatusGrid 
            lowStockCount={lowStockCount} 
            pendingTbcCount={pendingTbcCount} 
            totalSalesCount={totalSalesCount}
            currentUser={currentUser}
            onNavigate={setActiveTab}
          />
        </div>

      </div>

      {/* Decorative resilient footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-slate-300 text-xs font-mono px-4 mb-4 md:mb-0 space-y-2">
        <p className="font-semibold text-slate-300">
          All rights reserved this software is a property of Wara Wara Construction and General Services and Wata Sai Stone Investment .
        </p>
        <p className="text-emerald-400 font-extrabold text-[11px] uppercase tracking-wider">
          Software built and managed by Andrew Tech Solutions (andrewdrive2025@gmail.com)
        </p>
      </footer>

      {/* Mobile-friendly native Android Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#090d16] border-t border-slate-800/80 px-2 flex items-center justify-around z-45 shadow-lg select-none">
        {/* TAB 1: POS REGISTER */}
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
            setActiveTab("pos");
          }}
          className="flex-1 flex flex-col items-center justify-center h-full focus:outline-none relative cursor-pointer"
        >
          <div className={`p-1 px-4.5 rounded-full transition-all duration-150 ${
            activeTab === "pos" ? "bg-indigo-600/30 text-emerald-400" : "text-slate-400"
          }`}>
            <ShoppingCart className={`h-5 w-5 ${activeTab === "pos" ? "scale-110" : "scale-100"}`} />
          </div>
          <span className={`text-[9px] font-sans mt-0.5 leading-none transition-colors ${
            activeTab === "pos" ? "text-emerald-400 font-bold" : "text-slate-405"
          }`}>
            Register
          </span>
        </button>

        {/* TAB 2: INVENTORY */}
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
            setActiveTab("catalog");
          }}
          className="flex-1 flex flex-col items-center justify-center h-full focus:outline-none relative cursor-pointer"
        >
          <div className={`p-1 px-4.5 rounded-full transition-all duration-150 ${
            activeTab === "catalog" ? "bg-indigo-600/30 text-emerald-400" : "text-slate-400"
          }`}>
            <Package className={`h-5 w-5 ${activeTab === "catalog" ? "scale-110" : "scale-100"}`} />
          </div>
          <span className={`text-[9px] font-sans mt-0.5 leading-none transition-colors ${
            activeTab === "catalog" ? "text-emerald-400 font-bold" : "text-slate-405"
          }`}>
            Stock
          </span>
          {lowStockCount > 0 && (
            <span className="absolute top-1.5 right-4 bg-red-600 text-white font-mono text-[8px] font-extrabold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center shadow-sm animate-pulse">
              {lowStockCount}
            </span>
          )}
        </button>

        {/* TAB 3: TBC ORDERS */}
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
            setActiveTab("tbc");
          }}
          className="flex-1 flex flex-col items-center justify-center h-full focus:outline-none relative cursor-pointer"
        >
          <div className={`p-1 px-4.5 rounded-full transition-all duration-150 ${
            activeTab === "tbc" ? "bg-indigo-600/30 text-emerald-400" : "text-slate-400"
          }`}>
            <FileText className={`h-5 w-5 ${activeTab === "tbc" ? "scale-110" : "scale-100"}`} />
          </div>
          <span className={`text-[9px] font-sans mt-0.5 leading-none transition-colors ${
            activeTab === "tbc" ? "text-emerald-400 font-bold" : "text-slate-405"
          }`}>
            Pre-Paid TBC
          </span>
          {expiredTbcCount > 0 && (
            <span className="absolute top-1.5 right-4 bg-amber-500 text-slate-900 font-mono text-[8px] font-extrabold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center shadow-xs">
              ⚠️
            </span>
          )}
        </button>

        {/* TAB 4: CREDIT SALES */}
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
            setActiveTab("credits");
          }}
          className="flex-1 flex flex-col items-center justify-center h-full focus:outline-none relative cursor-pointer"
        >
          <div className={`p-1 px-3.5 rounded-full transition-all duration-150 ${
            activeTab === "credits" ? "bg-indigo-600/30 text-emerald-400" : "text-slate-400"
          }`}>
            <User className={`h-5 w-5 ${activeTab === "credits" ? "scale-110" : "scale-100"}`} />
          </div>
          <span className={`text-[9px] font-sans mt-0.5 leading-none transition-colors ${
            activeTab === "credits" ? "text-emerald-400 font-bold" : "text-slate-405"
          }`}>
            Credits
          </span>
        </button>

        {/* TAB 5: SALES AUDIT */}
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
            setActiveTab("ledger");
          }}
          className="flex-1 flex flex-col items-center justify-center h-full focus:outline-none relative cursor-pointer"
        >
          <div className={`p-1 px-3.5 rounded-full transition-all duration-150 ${
            activeTab === "ledger" ? "bg-indigo-600/30 text-emerald-400" : "text-slate-400"
          }`}>
            <BookOpen className={`h-5 w-5 ${activeTab === "ledger" ? "scale-110" : "scale-100"}`} />
          </div>
          <span className={`text-[9px] font-sans mt-0.5 leading-none transition-colors ${
            activeTab === "ledger" ? "text-emerald-400 font-bold" : "text-slate-405"
          }`}>
            Ledger
          </span>
        </button>

        {/* TAB 6: STAFF ROLES */}
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
            setActiveTab("staff");
          }}
          className="flex-1 flex flex-col items-center justify-center h-full focus:outline-none relative cursor-pointer"
        >
          <div className={`p-1 px-3.5 rounded-full transition-all duration-150 ${
            activeTab === "staff" ? "bg-indigo-600/30 text-emerald-400" : "text-slate-400"
          }`}>
            <Users className={`h-5 w-5 ${activeTab === "staff" ? "scale-110" : "scale-100"}`} />
          </div>
          <span className={`text-[9px] font-sans mt-0.5 leading-none transition-colors ${
            activeTab === "staff" ? "text-emerald-400 font-bold" : "text-slate-405"
          }`}>
            Staff
          </span>
        </button>
      </div>

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
