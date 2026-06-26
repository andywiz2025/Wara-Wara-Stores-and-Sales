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
import posCheckoutImg from "./assets/images/pos_checkout_materials_1781520052748.jpg";
import tbcDispatchImg from "./assets/images/tbc_materials_dispatch_1781520070813.jpg";
import expenditureImg from "./assets/images/site_operational_expenditure_1781520088585.jpg";
import bankDepositImg from "./assets/images/bank_deposit_controls_1781520105126.jpg";
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
      } catch (err: any) {
        // Quietly handle or downgrade the warning in development/preview iFrames where security policy disallows it
        const isPolicyBlocked = err?.message?.includes("permissions policy") || err?.name === "NotAllowedError";
        if (isPolicyBlocked) {
          console.debug("Screen Wake Lock restricted by sandboxed workspace iframe permissions policy. (Expected preview sandbox behavior)");
        } else {
          console.warn("Screen Wake Lock request failed:", err);
        }
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
                            <title>Operational User Handbook - Watasai Stone & Wara Wara Construction</title>
                            <style>
                              /* CSS Reset & Variable overrides to force strict black-on-white text for readings */
                              * {
                                background-color: transparent !important;
                                background-image: none !important;
                                box-shadow: none !important;
                                text-shadow: none !important;
                              }
                              body {
                                font-family: "Times New Roman", Times, Georgia, serif !important;
                                font-size: 13pt !important;
                                line-height: 1.5 !important;
                                color: #000000 !important;
                                padding: 1.5cm !important;
                                background-color: #ffffff !important;
                                background: #ffffff !important;
                              }
                              h1, h2, h3, h4, h5, h6 {
                                font-family: "Times New Roman", Times, Georgia, serif !important;
                                font-weight: bold !important;
                                color: #000000 !important;
                                margin-top: 20px !important;
                                margin-bottom: 10px !important;
                                page-break-after: avoid !important;
                              }
                              h2 {
                                font-size: 19pt !important;
                                text-align: center !important;
                                text-transform: uppercase !important;
                                border-bottom: 2px solid #000000 !important;
                                padding-bottom: 8px !important;
                                margin-top: 0 !important;
                                margin-bottom: 5px !important;
                              }
                              h3 {
                                font-size: 16pt !important;
                                border-bottom: 1px solid #000000 !important;
                                padding-bottom: 4px !important;
                                margin-top: 30px !important;
                              }
                              h4 {
                                font-size: 14pt !important;
                                border-left: 3px solid #000000 !important;
                                padding-left: 10px !important;
                                margin-top: 25px !important;
                              }
                              p, li, span, td, th {
                                font-family: "Times New Roman", Times, Georgia, serif !important;
                                font-size: 13pt !important;
                                line-height: 1.5 !important;
                                color: #000000 !important;
                              }
                              strong {
                                font-weight: bold !important;
                                color: #000000 !important;
                              }
                              ol, ul {
                                margin-left: 20pt !important;
                                margin-bottom: 15px !important;
                              }
                              li {
                                margin-bottom: 6px !important;
                                page-break-inside: avoid !important;
                              }
                              img {
                                max-width: 90% !important;
                                height: auto !important;
                                display: block !important;
                                margin: 20px auto !important;
                                page-break-inside: avoid !important;
                                border: 1px solid #cbd5e1 !important;
                                padding: 4px !important;
                              }
                              div, section {
                                background: transparent !important;
                                background-color: transparent !important;
                              }
                              /* Map responsive grids and cards to simple blocks or printable sections */
                              div[class*="grid"], div[class*="col"], div[class*="card"], div[class*="bg-"] {
                                display: block !important;
                                width: 100% !important;
                                float: none !important;
                                margin-bottom: 20px !important;
                                padding: 15px !important;
                                border: 1px solid #000000 !important;
                                border-radius: 4px !important;
                                page-break-inside: avoid !important;
                              }
                              .badge {
                                font-family: "Courier New", Courier, monospace !important;
                                font-weight: bold !important;
                                font-size: 11pt !important;
                                border: 1px solid #000000 !important;
                                padding: 2px 4px !important;
                                background: transparent !important;
                              }
                              .footer {
                                margin-top: 50px !important;
                                border-top: 1px solid #000000 !important;
                                padding-top: 15px !important;
                                text-align: center !important;
                                font-size: 10pt !important;
                                page-break-inside: avoid !important;
                              }
                              .no-print, button, .shrink-0, svg:not(.print-logo) {
                                display: none !important;
                              }

                              /* Cover page styling designed specifically for portrait A4 printing */
                              .cover-page {
                                height: 26.7cm; /* Ensure standard A4 portrait boundary size */
                                border: 3px double #000000;
                                padding: 1.5cm;
                                display: flex;
                                flex-direction: column;
                                justify-content: space-between;
                                align-items: center;
                                text-align: center;
                                box-sizing: border-box;
                                page-break-after: always !important;
                                margin-bottom: 30px;
                              }
                              .cover-logo-wrapper {
                                width: 100%;
                                max-width: 750px;
                                margin-top: 1cm;
                              }
                              .cover-titles {
                                flex-grow: 1;
                                display: flex;
                                flex-direction: column;
                                justify-content: center;
                                align-items: center;
                                margin-top: 1.5cm;
                              }
                              .cover-main-title {
                                font-size: 26pt !important;
                                font-weight: 900 !important;
                                margin: 0 0 10px 0 !important;
                                text-align: center !important;
                                letter-spacing: 1px !important;
                                line-height: 1.2 !important;
                                font-family: "Times New Roman", Times, Georgia, serif !important;
                              }
                              .cover-subtitle {
                                font-size: 18pt !important;
                                font-weight: bold !important;
                                letter-spacing: 3px !important;
                                border-bottom: none !important;
                                padding-bottom: 0 !important;
                                margin-top: 10px !important;
                                margin-bottom: 10px !important;
                              }
                              .cover-edition {
                                font-size: 13pt !important;
                                font-style: italic !important;
                                font-weight: normal !important;
                                margin-bottom: 10px !important;
                              }
                              .cover-divider {
                                width: 150px;
                                height: 2px;
                                background-color: #000000 !important;
                                margin: 20px auto !important;
                              }
                              .cover-version {
                                font-family: "Courier New", Courier, monospace !important;
                                font-weight: bold !important;
                                font-size: 12pt !important;
                                margin-top: 5px !important;
                              }
                              .cover-author-block {
                                border: 1px solid #000000;
                                padding: 20px;
                                width: 85%;
                                margin-top: 1.5cm;
                                margin-bottom: 1.5cm;
                                box-sizing: border-box;
                              }
                              .author-label {
                                font-size: 10pt !important;
                                font-weight: bold !important;
                                text-transform: uppercase !important;
                                letter-spacing: 1px !important;
                                margin-bottom: 8px !important;
                              }
                              .author-name {
                                font-size: 16pt !important;
                                font-weight: bold !important;
                                margin: 4px 0 !important;
                              }
                              .author-title {
                                font-size: 12pt !important;
                                font-style: italic !important;
                                margin-bottom: 5px !important;
                              }
                              .author-email {
                                font-size: 11pt !important;
                                font-family: "Courier New", Courier, monospace !important;
                              }
                              .cover-footer-info {
                                border-top: 1px solid #000000;
                                padding-top: 15px;
                                width: 100%;
                              }
                              .cover-footer-info p {
                                font-size: 10.5pt !important;
                                margin: 4px 0 !important;
                              }
                            </style>
                          </head>
                          <body>
                            <!-- PORTRAIT COVER PAGE SECTION -->
                            <div class="cover-page">
                              <!-- Branding Vector Logo -->
                              <div class="cover-logo-wrapper">
                                <svg
                                  viewBox="0 0 1000 240"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  class="print-logo"
                                  style="width: 100%; max-height: 140px;"
                                >
                                  <g id="artwork">
                                    {/* Mountain Peaks (Koinadugu Range) - Green layers */}
                                    <polygon points="260,110 390,30 500,90 590,40 700,110" fill="#15803d" opacity="0.85" />
                                    <polygon points="340,110 440,50 540,110" fill="#166534" />
                                    <polygon points="460,110 560,35 660,110" fill="#14532d" opacity="0.9" />
                                    {/* Snowy/Light Highlights on peaks */}
                                    <polygon points="390,30 375,45 400,48" fill="#a7f3d0" />
                                    <polygon points="590,40 575,55 600,58" fill="#a7f3d0" />
                                    <polygon points="560,35 545,48 570,52" fill="#86efac" />
                            
                                    {/* Orange Excavator - Left Side */}
                                    <g id="excavator" transform="translate(40, -10)">
                                      {/* Tracks Base */}
                                      <rect x="110" y="100" width="100" height="15" rx="7" fill="#1e293b" />
                                      <line x1="120" y1="108" x2="200" y2="108" stroke="#ffffff" stroke-width="2" stroke-dasharray="4 3" />
                                      {/* Main Cabin Body */}
                                      <path d="M125,75 L165,75 L175,100 L120,100 Z" fill="#ea580c" />
                                      <path d="M135,55 L155,55 L165,75 L130,75 Z" fill="#1e293b" /> {/* Drivers window */}
                                      <rect x="138" y="59" width="12" height="11" fill="#bae6fd" />
                                      {/* Hydraulic Arm */}
                                      <path d="M165,80 L210,35 L200,30 L160,75 Z" fill="#ea580c" />
                                      <path d="M205,33 L230,65 L245,60 L210,25 Z" fill="#ea580c" />
                                      {/* Shovel Bucket */}
                                      <path d="M230,65 C230,75 210,88 195,80 C190,75 195,68 210,68 C215,68 225,62 230,65 Z" fill="#1e293b" />
                                      {/* Details */}
                                      <circle cx="150" cy="108" r="5" fill="#475569" />
                                      <circle cx="175" cy="108" r="5" fill="#475569" />
                                    </g>
                            
                                    {/* High-Rise Buildings & Tower Crane - Right Side */}
                                    <g id="crane-and-city" transform="translate(560, -5)">
                                      {/* Skyline */}
                                      <rect x="50" y="55" width="40" height="60" fill="#475569" />
                                      <rect x="95" y="30" width="50" height="85" fill="#334155" />
                                      <rect x="150" y="45" width="45" height="70" fill="#1e293b" />
                                      <rect x="200" y="65" width="35" height="50" fill="#475569" />
                                      {/* Windows on building */}
                                      <rect x="105" y="40" width="8" height="10" fill="#cbd5e1" />
                                      <rect x="120" y="40" width="8" height="10" fill="#cbd5e1" />
                                      <rect x="135" y="40" width="8" height="10" fill="#cbd5e1" />
                                      <rect x="105" y="60" width="8" height="10" fill="#cbd5e1" />
                                      <rect x="120" y="60" width="8" height="10" fill="#cbd5e1" />
                                      <rect x="135" y="60" width="8" height="10" fill="#cbd5e1" />
                                      <rect x="105" y="80" width="8" height="10" fill="#cbd5e1" />
                                      <rect x="120" y="80" width="8" height="10" fill="#cbd5e1" />
                                      <rect x="135" y="80" width="8" height="10" fill="#cbd5e1" />
                                      
                                      <rect x="160" y="55" width="8" height="8" fill="#f1f5f9" />
                                      <rect x="175" y="55" width="8" height="8" fill="#f1f5f9" />
                                      <rect x="160" y="75" width="8" height="8" fill="#f1f5f9" />
                                      <rect x="175" y="75" width="8" height="8" fill="#f1f5f9" />
                            
                                      {/* Construction Tower Crane */}
                                      <line x1="185" y1="115" x2="185" y2="10" stroke="#0f172a" stroke-width="4" />
                                      <line x1="100" y1="20" x2="250" y2="20" stroke="#0f172a" stroke-width="3" />
                                      <line x1="250" y1="20" x2="185" y2="10" stroke="#ea580c" stroke-width="1.5" />
                                      <line x1="100" y1="20" x2="185" y2="10" stroke="#ea580c" stroke-width="1.5" />
                                      <line x1="185" y1="10" x2="185" y2="20" stroke="#ea580c" stroke-width="3" />
                                      {/* Crane Hook */}
                                      <line x1="230" y1="20" x2="230" y2="55" stroke="#334155" stroke-width="1.5" />
                                      <path d="M227,55 C227,59 233,59 233,55" stroke="#1e293b" stroke-width="2" fill="none" />
                                      {/* Counterweight */}
                                      <rect x="120" y="15" width="20" height="10" fill="#ea580c" />
                                    </g>
                            
                                    {/* Thick elegant ground base support line */}
                                    <path d="M10,114 L990,114" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />
                                    <path d="M40,117 L960,117" stroke="#ea580c" stroke-width="3" stroke-linecap="round" />
                                  </g>
                            
                                  {/* Corporate Bold Text Typography Section */}
                                  <g id="typography">
                                    <text
                                      x="500"
                                      y="178"
                                      text-anchor="middle"
                                      fill="#0c1d3a"
                                      font-size="64"
                                      font-weight="900"
                                      font-style="oblique"
                                      font-family="system-ui, -apple-system, sans-serif"
                                      letter-spacing="4"
                                    >
                                      WARA WARA
                                    </text>
                            
                                    <text
                                      x="500"
                                      y="218"
                                      text-anchor="middle"
                                      fill="#ea580c"
                                      font-size="22"
                                      font-weight="800"
                                      font-family="system-ui, -apple-system, sans-serif"
                                      letter-spacing="5"
                                    >
                                      CONSTRUCTION & GENERAL SERVICES
                                    </text>
                                  </g>
                                </svg>
                              </div>

                              <div class="cover-titles">
                                <h1 class="cover-main-title">Wara Wara Stores & Sales App</h1>
                                <h2 class="cover-subtitle">Operational User Handbook</h2>
                                <p class="cover-edition">Enterprise Resource Planning (ERP) Systems Reference Manual & Auditing Protocol</p>
                                <div class="cover-divider"></div>
                                <p class="cover-version">Authoritative Systems Version 1.26</p>
                              </div>

                              <!-- Author & Developer Information Block -->
                              <div class="cover-author-block">
                                <p class="author-label">Handbook Produced & Application Developed By</p>
                                <p class="author-name">Andrew Yandi Yembeh Mansaray</p>
                                <p class="author-title">Lead Software Developer</p>
                                <p class="author-email">andrewdrive2025@gmail.com</p>
                              </div>

                              <div class="cover-footer-info font-serif">
                                <p style="font-weight: bold; font-family: 'Times New Roman', serif;">Wara Wara Construction and General Services • Watasai Stone Investment</p>
                                <p>Headquarters: 8 Shekie Bockarie Street, Kabala Town, Koinadugu District, Sierra Leone</p>
                                <p style="font-size: 9.5pt !important; color: #444444 !important; font-family: 'Times New Roman', serif; margin-top: 6px;">
                                  Confidential and proprietary. Approved for the exclusive operational training and audit workflows of manager Nabieu Conteh and accounting clerks.
                                </p>
                              </div>
                            </div>

                            <!-- MAIN MANUAL CONTENT (PAGE BREAK HANDLED BY THE NO-PRINT OVERRIDES AND PAGE WRAPPERS) -->
                            <div style="margin-top: 20px;">
                              ${printContent}
                            </div>
                            
                            <div class="footer">
                              <p>All rights reserved. This software is the sole property of Wara Wara Construction and General Services and Wata Sai Stone Investment.</p>
                              <p style="font-weight: bold; font-size: 11pt;">Handbook produced and application developed by Andrew Yandi Yembeh Mansaray, Software Developer (andrewdrive2025@gmail.com)</p>
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
                  <p className="text-emerald-400 text-[11px] font-mono font-bold">
                    Handbook Produced by Andrew Yandi Yembeh Mansaray, Software Developer
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
                <h4 className="text-indigo-250 font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="bg-indigo-950 text-indigo-300 h-5 w-5 rounded-full flex items-center justify-center text-[10px]">3</span>
                  Point-of-Sale (POS) Checkouts & Prepaid To-Be-Collected (TBC) Workflows
                </h4>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs text-indigo-205">
                  
                  {/* Left Section: Standard POS Checkout steps */}
                  <div className="lg:col-span-4 bg-indigo-950/55 p-4 rounded-xl border border-indigo-900 flex flex-col justify-between">
                    <div className="space-y-3">
                      <p className="font-bold text-white flex items-center gap-1 bg-indigo-905 p-1 rounded">
                        🛒 STANDARD POS CASH SALES (STEP-BY-STEP):
                      </p>
                      
                      {/* POS Diagram with Header and Footer Credits */}
                      <div className="bg-[#0f172a] rounded-xl border border-indigo-900 overflow-hidden flex flex-col justify-between text-center mx-auto w-full shadow-md max-w-md animate-in fade-in duration-200">
                        <div className="bg-indigo-950 px-3 py-1.5 border-b border-indigo-900/60 text-left">
                          <span className="text-[9px] uppercase font-bold text-indigo-300 font-mono tracking-wider block leading-tight">Wara Wara Construction and general services , 8 Shekie Bockarie street Kabala . version 1.26</span>
                          <span className="text-[7.5px] text-slate-400 font-mono block mt-1">CASHIER CONSOLE SCHEMATIC</span>
                        </div>
                        <div className="p-3 bg-white flex items-center justify-center">
                          <img
                            src={posCheckoutImg}
                            alt="Point of Sale checkout process diagram"
                            referrerPolicy="no-referrer"
                            className="w-full h-auto object-contain rounded select-none max-h-[250px] mx-auto transition-transform hover:scale-105 duration-200"
                          />
                        </div>
                        <div className="bg-indigo-950/80 px-2 py-1 border-t border-indigo-900/40 text-[8px] text-slate-400 font-mono text-center">
                          Figure 2(a): Live POS Client Invoice Checkout Flow
                        </div>
                      </div>

                      <ol className="list-decimal pl-5 space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                        <li>Navigate to the <strong className="text-indigo-105">POS Cash Register</strong> workspace.</li>
                        <li>Verify that standard mode is selected in the toggle.</li>
                        <li>Click items in the Catalog card shelf to fill active cart slots.</li>
                        <li>Input checkout metadata identifiers (Customer billing Name, reference numbers).</li>
                        <li>
                          <strong>Physical Receipt Book Cross-Ref:</strong> Inside the special field marked <em>📖 Book Receipt No.</em>, key in the actual serial number printed on your paper, carbonized invoice book. This step is highly recommended for manual-to-digital audit reconciliations.
                        </li>
                        <li>Select payment method: **Cash**, **Bank Cheque**, or **Mobile Money Wallet**.</li>
                        <li>Input the exact paper cheque serial ID or network TXN reference hash if choosing bank/cheque/mobile money.</li>
                        <li>Click <strong className="text-white">Finalize Cash Checkout</strong>. Real-time product counts decrease instantly, sales ledger tracks the transaction, and an instant paper invoice receipt is printed containing the verified Book Reference.</li>
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
                          <strong>Register Prepayment:</strong> On the POS register, toggle the checkout type to <strong className="text-yellow-400">Prepaid TBC Registry Ticket</strong>, add client items, input patient billing name, enter the matching carbon paper slip serial in the **Book Receipt No.** field, choose collection ticket limits (14, 30, or 60 days limit), and click <strong className="text-white bg-indigo-700 px-1 py-0.5 rounded text-[10px]">Dispatch TBC Registration</strong>. Revenue is recorded today, but stock shelf counts are held secure.
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

              {/* Step 4: Physical Receipt Cross-Reference Core System */}
              <div className="space-y-4 pt-5 pb-5 border-t border-indigo-900/40 text-xs text-indigo-200">
                <h4 className="text-emerald-300 font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="bg-emerald-950 text-emerald-300 h-5 w-5 rounded-full flex items-center justify-center text-[10px]">4</span>
                  Physical Carbon Receipt Book Cross-Reference Core System (Audit Trail Protocol)
                </h4>
                <div className="p-5 bg-indigo-950/60 rounded-xl border border-indigo-900 space-y-3.5 leading-relaxed text-slate-300">
                  <p className="font-extrabold text-white text-[12px] bg-indigo-900 px-2 py-1 rounded w-fit uppercase">
                    📖 Dual-Record Verification Safeguard: Paper Carbon Book vs. Digital Database
                  </p>
                  <p className="text-[11.5px] leading-relaxed text-slate-250">
                    To maintain absolute compliance, absolute transparency, and prevent manual inventory leakage or financial discrepancies, Watasai Stone & Wara Wara Construction enforces a <strong>dual-record cross-reference policy</strong>. Every transaction originating from a physical carbon paper voucher or paper receipt book must be mapped directly into the digital database system using the <strong>Book Receipt No.</strong> field.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] pt-1">
                    <div className="p-3 bg-indigo-950/80 rounded-lg border border-indigo-900 space-y-1.5 animate-in fade-in duration-200">
                      <strong className="text-emerald-300 block">🛍️ A. At POS Checkout (Standard Sales)</strong>
                      <p>
                        Before finalizing any cash or Mobile Money sale on the cash register, write the manual invoice in the carbon book, tear out the slip for the client, and immediately key that same book invoice serial ID (e.g. <em>WR-9852</em>) into the <strong>Book Receipt No.</strong> field in the active checkout drawer.
                      </p>
                    </div>
                    <div className="p-3 bg-indigo-950/80 rounded-lg border border-indigo-900 space-y-1.5 animate-in fade-in duration-200">
                      <strong className="text-yellow-400 block">📦 B. Inside TBC Registry (Prepaid Bookings)</strong>
                      <p>
                        When registering to-be-collected prepaid orders, the matching carbon paper voucher number must be entered in the Book Receipt field. When the client returns for split dispatches at the yard gate, the gatekeeper cross-references the digital remaining balance alongside physical paper voucher signatures.
                      </p>
                    </div>
                    <div className="p-3 bg-indigo-950/80 rounded-lg border border-indigo-905 space-y-1.5 animate-in fade-in duration-200">
                      <strong className="text-blue-300 block">💳 C. On the Credit Board (Debt Ledger)</strong>
                      <p>
                        For corporate or community credits, the carbonized credit security note's page serial number underpins the legal contract file. Recording this <strong>Book Receipt No.</strong> allows management to query and inspect signed physical contracts in file cabinets when reviewing credit repays.
                      </p>
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-905/30 rounded-lg border border-indigo-900 text-[11px] space-y-2 text-slate-300">
                    <p className="font-bold text-white flex items-center gap-1.5 text-xs text-indigo-300">
                      <span>📌</span> AUDITING INSTRUCTIONS FOR NABIEU CONTEH & ACCOUNTING CLERKS:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-200">
                      <li>Whenever auditing database journals, check for the green <strong>📖 Book Ref</strong> badges. Any invoice lacking a Book Receipt identifier is non-compliant and must be immediately reconciled with the physical counter sheets.</li>
                      <li>In both the <strong>Credit Board Directory</strong> and the <strong>Pre-Paid TBC Registry</strong>, the paper book serial identifier is displayed prominently at the header of each file card for quick manual-to-digital validations.</li>
                      <li>Any discrepancies between physical inventory stocks remaining in the compound yard and digital metrics can be resolved by counting the physical carbon copies corresponding to the flagged material SKU range.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step 5: Debtor and Credit Management */}
              <div className="space-y-4 pt-5 pb-5 border-t border-indigo-900/40 text-xs text-indigo-200">
                <h4 className="text-indigo-300 font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="bg-indigo-950 text-indigo-300 h-5 w-5 rounded-full flex items-center justify-center text-[10px]">5</span>
                  Credit Registry Board, Repayment Ledgers & Debt Collection Call Logs
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-indigo-950/50 rounded-xl border border-indigo-900 space-y-3 leading-relaxed">
                    <p className="font-bold text-white bg-indigo-900 p-1.5 rounded uppercase">💳 Registering Credit Sales & Upfront Downpayments</p>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      When customers take goods on credit, select the Checkout Toggle and shift to <strong className="text-yellow-400">Register Credit</strong>. Add the materials to Cart.
                    </p>
                    <ol className="list-decimal pl-5 space-y-1 text-slate-300 text-[11px] leading-relaxed">
                      <li>Enter customer full legal name and key-in an active, reachable <strong>Primary phone number</strong>.</li>
                      <li>In the optional physical book receipt book number field, input the carbonized paper voucher ID.</li>
                      <li>Specify the upfront <strong>Downpayment Amount Paid Today</strong> (SLe). The remaining liability is automatically calculated (Remaining = Total Cart Cost - Paid).</li>
                      <li>Specify the <strong>Due Date Days</strong> limit (e.g. 15, 30 days deadline).</li>
                      <li>Click <strong className="text-white font-bold bg-indigo-700 px-1 py-0.5 rounded text-[9px]">Finalize Credit Registration</strong>. This immediately decrements yard stock (since the customer leaves with products), logs a sales record for the paid downpayment in the central ledger, and populates a new debtor card in the Credit Board.</li>
                    </ol>
                  </div>

                  <div className="p-4 bg-indigo-950/50 rounded-xl border border-indigo-900 space-y-3 leading-relaxed">
                    <p className="font-bold text-white bg-indigo-900 p-1.5 rounded uppercase">📞 Tracking Repayments & Follow-Up Phone Logs</p>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Management can monitor active debts, sort profiles by financial health indicators, and log contact engagements:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                      <li>
                        <strong>Recording Installments:</strong> Click the card's repayment options under Credit Board and select <strong className="text-white">Collect Repayment</strong>. Key-in the exact paid cash amount. The remaining running liability updates instantly. Every installment logs the date, amount, and active cashier operator.
                      </li>
                      <li>
                        <strong>Logging Dial Contacts:</strong> Click the blue follow-up dial button. Select the explicit phone call outcome from the checklist:
                        <div className="my-1 pl-4 font-mono text-[9px] text-amber-300 bg-slate-950/40 p-1 rounded space-y-0.5">
                          <p>📱 Promised Payment (Committed date details)</p>
                          <p>📱 No Answer (Did not respond to call lines)</p>
                          <p>📱 Line Switched Off (Network unreachable)</p>
                          <p>📱 Refused to Pay (Hostile communication)</p>
                          <p>📱 Contacted Guarantor (Called legal cosigner)</p>
                        </div>
                        Type detailed notes of the contact summary and click Enrol. A sequential thread of contact engagement is logged to guard against debtor disputes.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step 6: Operational Expenditures */}
              <div className="space-y-4 pt-5 pb-5 border-t border-indigo-900/40 text-xs text-indigo-205">
                <h4 className="text-indigo-300 font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="bg-indigo-950 text-indigo-300 h-5 w-5 rounded-full flex items-center justify-center text-[10px]">6</span>
                  Step-by-Step Logging of Operational Site Expenditures
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  <div className="lg:col-span-8 space-y-3 leading-relaxed text-slate-300 text-xs">
                    <p className="leading-relaxed font-sans">
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
                        <strong>Choose Expense Category:</strong> Select the matching class of operational expenditure via the Category dropdown (e.g. ⛽ Fuel/Lubricants, 🚖 Staff Transport, 🛠️ Site Repairs, 🔋 Utility/Comm, 👮 Site Security, or 📦 General Miscellany).
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

              {/* Step 7: Commercial Banking Deposits & Bank Cheques (Asset Reconciliation) */}
              <div className="space-y-4 pt-5 pb-5 border-t border-indigo-900/40 text-xs text-indigo-205">
                <h4 className="text-emerald-300 font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="bg-emerald-950 text-emerald-300 h-5 w-5 rounded-full flex items-center justify-center text-[10px]">7</span>
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

              {/* Step 8: Company Header Letterhead and Contacts */}
              <div className="space-y-3 pt-5 text-xs text-indigo-205 border-t border-indigo-900/40">
                <h4 className="text-indigo-305 font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="bg-indigo-800 text-indigo-200 h-5 w-5 rounded-full flex items-center justify-center text-[10px]">8</span>
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
