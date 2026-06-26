import React, { useState } from "react";
import { useStore } from "../context/StoreContext";
import { CreditRegistry, CreditRepayment } from "../types";
import {
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  Search,
  PlusCircle,
  TrendingDown,
  DollarSign,
  Phone,
  Calendar,
  Layers,
  Edit,
  Trash2,
  X,
  History,
  FileSpreadsheet,
  PhoneCall,
  MessageSquare,
  Bell,
  Check,
  BookOpen
} from "lucide-react";

export default function CreditBoard() {
  const {
    credits,
    currentUser,
    executeCreditRepayment,
    executeLogCreditFollowUp,
    adminEditCredit,
    adminDeleteCredit
  } = useStore();

  const [filter, setFilter] = useState<"all" | "unpaid" | "partial" | "paid">("all");
  const [search, setSearch] = useState("");

  // Control Modals
  const [repayingCredit, setRepayingCredit] = useState<CreditRegistry | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState<number>(0);
  const [repaymentMethod, setRepaymentMethod] = useState<"cash" | "cheque" | "mobile_money">("cash");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  // History state
  const [viewingHistory, setViewingHistory] = useState<CreditRegistry | null>(null);

  // Follow Up & Warnings logging state
  const [loggingFollowUpCredit, setLoggingFollowUpCredit] = useState<CreditRegistry | null>(null);
  const [followUpOutcome, setFollowUpOutcome] = useState<"promised_payment" | "no_answer" | "disputed" | "refused" | "general_reminder">("general_reminder");
  const [followUpNote, setFollowUpNote] = useState("");
  const [activeReminderSuccessMsg, setActiveReminderSuccessMsg] = useState<string | null>(null);
  const [showFollowUpHistoryCredit, setShowFollowUpHistoryCredit] = useState<CreditRegistry | null>(null);

  // Admin Override state
  const [editingCredit, setEditingCredit] = useState<CreditRegistry | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editRemainingBalance, setEditRemainingBalance] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<"unpaid" | "partial" | "paid">("unpaid");

  // Calculations for KPI Cards
  const totalOutstanding = credits
    .filter((c) => c.status !== "paid")
    .reduce((sum, c) => sum + c.remaining_balance, 0);

  const activeDebtorsCount = credits.filter((c) => c.status !== "paid").length;

  const overdueAccounts = credits.filter((c) => {
    if (c.status === "paid") return false;
    const isOverdue = new Date() > new Date(c.due_date);
    return isOverdue;
  });

  const totalOverdueAmount = overdueAccounts.reduce((sum, c) => sum + c.remaining_balance, 0);

  const filteredCredits = credits.filter((c) => {
    const matchesSearch =
      c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      c.credit_id.toLowerCase().includes(search.toLowerCase()) ||
      (c.customer_phone && c.customer_phone.includes(search));

    const matchesFilter = filter === "all" || c.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleOpenRepayModal = (credit: CreditRegistry) => {
    setRepayingCredit(credit);
    setRepaymentAmount(credit.remaining_balance);
    setRepaymentMethod("cash");
    setErrorText("");
  };

  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayingCredit || repaymentAmount <= 0) return;

    if (repaymentAmount > repayingCredit.remaining_balance) {
      setErrorText("Repayment amount cannot exceed Outstanding Debt Balance.");
      return;
    }

    setLoading(true);
    setErrorText("");

    try {
      await executeCreditRepayment(repayingCredit.credit_id, repaymentAmount, repaymentMethod);
      setRepayingCredit(null);
    } catch (err: any) {
      setErrorText(err.message || "Failed to log repayment.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (credit: CreditRegistry) => {
    setEditingCredit(credit);
    setEditCustomerName(credit.customer_name);
    setEditCustomerPhone(credit.customer_phone || "");
    setEditRemainingBalance(credit.remaining_balance);
    setEditStatus(credit.status);
    setErrorText("");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCredit) return;

    setLoading(true);
    setErrorText("");

    try {
      const isPaid = editRemainingBalance <= 0;
      await adminEditCredit(editingCredit.credit_id, {
        customer_name: editCustomerName.trim(),
        customer_phone: editCustomerPhone.trim(),
        remaining_balance: editRemainingBalance,
        status: isPaid ? "paid" : editStatus
      });
      setEditingCredit(null);
    } catch (err: any) {
      setErrorText(err.message || "Failed to update Credit account.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCredit = async (creditId: string) => {
    if (!window.confirm("WARNING: Are you sure you want to delete this credit account permanently? Historical records will be wiped!")) {
      return;
    }
    try {
      await adminDeleteCredit(creditId);
    } catch (err: any) {
      alert(err.message || "Deletion failed.");
    }
  };

  const exportToCSV = () => {
    const headers = ["Credit ID", "Customer Name", "Customer Phone", "Total Amount (SLe)", "Amount Paid (SLe)", "Remaining Balance (SLe)", "Due Date", "Status", "Recorded By"];
    const rows = credits.map((c) => [
      c.credit_id,
      c.customer_name,
      c.customer_phone || "N/A",
      c.total_amount,
      c.amount_paid,
      c.remaining_balance,
      new Date(c.due_date).toLocaleDateString("en-GB"),
      c.status.toUpperCase(),
      c.recorded_by
    ]);

    let csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `WWS_Credits_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header section with CSV Download */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Debtors & Credit Ledger</h1>
          <p className="text-sm text-slate-500">Track raw credit sales, outstanding customer debt lists, and settlement repayment histories</p>
        </div>
        {credits.length > 0 && (
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Download Credit Ledger (CSV)
          </button>
        )}
      </div>

      {/* KPI Cards section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Outstanding Debt</span>
            <span className="text-2xl font-black text-slate-800 font-mono block mt-1">SLe {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
            <span className="text-xs text-red-500 font-bold block mt-1">⚠️ Active collectable credit sales asset</span>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <TrendingDown className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Overdue Outstanding</span>
            <span className="text-2xl font-black text-red-600 font-mono block mt-1">SLe {totalOverdueAmount.toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
            <span className="text-xs text-slate-500 font-semibold block mt-1">{overdueAccounts.length} Credit records exceeded expiry term</span>
          </div>
          <div className="p-3 bg-red-100 text-red-700 rounded-xl animate-pulse">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Active Debtors</span>
            <span className="text-2xl font-black text-slate-800 font-mono block mt-1">{activeDebtorsCount} Accounts</span>
            <span className="text-xs text-emerald-500 font-bold block mt-1">✓ Complete stock offloads mapped</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <User className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Actionable Debtor Warning Center */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-500/20 text-red-400 rounded-xl animate-pulse">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold font-sans text-white uppercase tracking-wider flex items-center gap-2">
                Actionable Debtor Warning Center
                {overdueAccounts.length > 0 && (
                  <span className="bg-red-650 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-full animate-bounce">
                    {overdueAccounts.length} OVERDUE
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-450">Escalate notifications, copy WhatsApp templates, and log administrative follow-up call notes</p>
            </div>
          </div>

          {activeReminderSuccessMsg && (
            <div className="px-3 py-1.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold rounded-lg flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              {activeReminderSuccessMsg}
            </div>
          )}
        </div>

        {overdueAccounts.length === 0 ? (
          <div className="py-2 flex items-center justify-center text-center">
            <p className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-505" /> No overdue accounts in the registry database. All credit sales are within agreed payment term terms.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {overdueAccounts.map((c) => {
              const daysPastDue = Math.max(1, Math.floor((new Date().getTime() - new Date(c.due_date).getTime()) / (1000 * 60 * 60 * 24)));
              return (
                <div key={c.credit_id} className="bg-slate-950/60 rounded-xl border border-slate-800 p-4 space-y-3 hover:border-red-900/30 transition duration-150 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 border-b border-slate-900 pb-2">
                      <div>
                        <span className="font-extrabold text-white text-xs capitalize flex items-center gap-1.5 flex-wrap">
                          {c.customer_name}
                          {c.customer_phone && (
                            <span className="text-[10px] text-slate-550 font-mono font-semibold flex items-center gap-0.5">
                              <Phone className="h-3 w-3" /> {c.customer_phone}
                            </span>
                          )}
                        </span>
                        <span className="text-[9px] font-mono text-indigo-400 mt-0.5 block font-bold">Ticket: {c.credit_id}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-red-500 font-black font-mono text-xs block">SLe {c.remaining_balance.toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
                        <span className="text-[9px] font-extrabold text-red-400/80 uppercase block tracking-wider">{daysPastDue} Days Overdue</span>
                      </div>
                    </div>

                    <div className="py-2.5 space-y-1 text-[10px] text-slate-400">
                      <div className="flex justify-between">
                        <span>Original Term Due Date:</span>
                        <span className="font-bold text-slate-200">{new Date(c.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Follow-up Reminders logged:</span>
                        <button 
                          onClick={() => c.follow_ups && c.follow_ups.length > 0 && setShowFollowUpHistoryCredit(c)}
                          className={`font-semibold underline ${c.follow_ups && c.follow_ups.length > 0 ? "text-indigo-400 hover:text-indigo-300 pointer-events-auto cursor-pointer" : "text-slate-500 cursor-default"}`}
                        >
                          {c.follow_ups?.length || 0} recorded reminder logs
                        </button>
                      </div>
                      {c.follow_ups && c.follow_ups.length > 0 && (
                        <div className="mt-1.5 p-1.5 bg-slate-900/50 rounded border border-slate-800/80 text-[9px] text-slate-300 italic">
                          Latest Note ({new Date(c.follow_ups[c.follow_ups.length - 1].timestamp).toLocaleDateString("en-GB")}): "{c.follow_ups[c.follow_ups.length - 1].note}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center mt-2 pt-2 border-t border-slate-900/30 gap-1.5 justify-end">
                    {c.customer_phone && (
                      <a 
                        href={`tel:${c.customer_phone}`}
                        className="p-1 px-2.5 bg-indigo-650/30 hover:bg-indigo-650/50 border border-indigo-900 text-indigo-200 hover:text-indigo-100 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Dial number"
                      >
                        <PhoneCall className="h-3 w-3" />
                        <span>Dial</span>
                      </a>
                    )}
                    <button
                      onClick={() => {
                        const text = `Wara Wara Construction Reminder - Dear ${c.customer_name}, you have an outstanding balance of SLe ${c.remaining_balance.toLocaleString()} on Credit Ticket #${c.credit_id} which was due on ${new Date(c.due_date).toLocaleDateString("en-GB")}. Please contact office on 076667575 / 077263939 to settle. Thank you.`;
                        navigator.clipboard.writeText(text);
                        setActiveReminderSuccessMsg(`WhatsApp reminder for ${c.customer_name} copied!`);
                        setTimeout(() => setActiveReminderSuccessMsg(null), 4000);
                      }}
                      className="p-1 px-2.5 bg-emerald-650/20 hover:bg-emerald-650/40 border border-emerald-900/40 text-emerald-300 hover:text-emerald-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Copy WhatsApp invitation text"
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span>WhatsApp Prompt</span>
                    </button>
                    <button
                      onClick={() => {
                        const text = `Wara Wara Debt: Repay SLe ${c.remaining_balance.toLocaleString()} for ticket #${c.credit_id.slice(-6).toUpperCase()} due since ${new Date(c.due_date).toLocaleDateString("en-GB")}. Contact 076667575 / 077263939. Thank you.`;
                        navigator.clipboard.writeText(text);
                        setActiveReminderSuccessMsg(`SMS alert text for ${c.customer_name} copied!`);
                        setTimeout(() => setActiveReminderSuccessMsg(null), 4000);
                      }}
                      className="p-1 px-2.5 bg-pink-950/20 hover:bg-pink-950/30 border border-pink-900/30 text-pink-300 hover:text-pink-250 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Copy SMS alert"
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span>SMS Alert</span>
                    </button>
                    <button
                      onClick={() => {
                        setLoggingFollowUpCredit(c);
                        setFollowUpNote("");
                        setFollowUpOutcome("promised_payment");
                      }}
                      className="p-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Log Call</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Registry Ledger Grid */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
        
        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b border-slate-100 pb-5">
          <div className="flex bg-slate-100 p-1 rounded-xl self-start flex-wrap gap-1">
            {(["all", "unpaid", "partial", "paid"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                  filter === t
                    ? "bg-slate-800 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                {t} {t === "partial" ? "Paid" : ""}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 w-full md:max-w-xs focus-within:ring-1 focus-within:ring-indigo-500">
            <Search className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search debtor name or Ticket ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-0 text-xs text-slate-800 placeholder-slate-400 outline-none w-full font-medium"
            />
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                <th className="py-3 px-4">Debtor Profile / ID</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4 text-right">Total Order</th>
                <th className="py-3 px-4 text-right text-emerald-600 font-semibold">Repaid Sum</th>
                <th className="py-3 px-4 text-right text-red-500 font-semibold">Outstanding Balance</th>
                <th className="py-3 px-4">DueDate Expiration</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {filteredCredits.map((c) => {
                const isOverdue = c.status !== "paid" && new Date() > new Date(c.due_date);
                return (
                  <tr key={c.credit_id} className="hover:bg-slate-50/50 transition duration-150">
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-800 capitalize flex items-center gap-1.5 flex-wrap">
                          {c.customer_name}
                          {c.follow_ups && c.follow_ups.length > 0 && (
                            <button
                              onClick={() => setShowFollowUpHistoryCredit(c)}
                              className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-[9px] text-indigo-700 rounded border border-indigo-150 flex items-center gap-0.5 font-bold cursor-pointer transition animate-pulse"
                              title="Inspect reminder actions outcome logs"
                            >
                              <Bell className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                              <span>{c.follow_ups.length} rem</span>
                            </button>
                          )}
                        </span>
                        <span className="text-[10px] font-mono text-indigo-600 tracking-tight mt-0.5 font-bold">
                          {c.credit_id}
                        </span>
                        {c.physical_receipt_no && (
                          <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-120 font-extrabold w-fit mt-1 self-start select-all" title="Physical Receipt Book Reference">
                            📖 Book No: {c.physical_receipt_no}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-500">
                      {c.customer_phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {c.customer_phone}
                        </span>
                      ) : "N/A"}
                    </td>
                    <td className="py-4 px-4 text-right font-bold font-mono text-slate-800">
                      SLe {c.total_amount.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                    </td>
                    <td className="py-4 px-4 text-right font-bold font-mono text-emerald-600">
                      SLe {c.amount_paid.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                    </td>
                    <td className="py-4 px-4 text-right font-black font-mono text-red-500">
                      SLe {c.remaining_balance.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">
                          {new Date(c.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                        {isOverdue && (
                          <span className="text-[9px] font-extrabold text-red-500 flex items-center gap-0.5 uppercase mt-0.5 animate-pulse">
                            <AlertTriangle className="h-2.5 w-2.5" /> Overdue Debt limit
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        c.status === "paid"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : c.status === "partial"
                          ? "bg-amber-50 text-amber-600 border border-amber-100"
                          : "bg-red-50 text-red-500 border border-red-100"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.status !== "paid" && (
                          <button
                            onClick={() => handleOpenRepayModal(c)}
                            title="Register Repayment"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition cursor-pointer"
                          >
                            <PlusCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setViewingHistory(c)}
                          title="Payment History Logs"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        
                        {/* Admin Action commands */}
                        {(currentUser?.role === "admin" || currentUser?.username?.toLowerCase() === "nabieu") && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(c)}
                              title="Override Edit Account"
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition cursor-pointer"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCredit(c.credit_id)}
                              title="Delete Permanently"
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCredits.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                    No matching debtor account maps found in registry database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: REGISTER REPAYMENT */}
      {repayingCredit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <TrendingDown className="h-4.5 w-4.5 text-emerald-600" /> Log Repayment Receipt
              </h3>
              <button
                onClick={() => setRepayingCredit(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRepaySubmit} className="space-y-4">
              {errorText && (
                <div className="p-2.5 bg-red-50 border border-red-150 text-red-700 text-xs rounded-lg font-bold">
                  ⚠️ {errorText}
                </div>
              )}

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block pb-0.5">Customer / Debtor</span>
                <p className="font-extrabold text-slate-800 text-sm capitalize">{repayingCredit.customer_name}</p>
                <p className="text-xs text-indigo-600 font-mono font-semibold">{repayingCredit.credit_id}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-150 text-xs font-bold leading-normal">
                <div>
                  <span className="text-slate-450 text-[10px] block font-medium">Gross Debt</span>
                  <p className="text-slate-800 font-mono text-sm leading-tight mt-0.5">SLe {repayingCredit.total_amount}</p>
                </div>
                <div>
                  <span className="text-slate-455 text-[10px] block font-medium text-red-500">Outstanding Debt</span>
                  <p className="text-red-500 font-mono text-sm leading-tight mt-0.5">SLe {repayingCredit.remaining_balance}</p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold text-slate-400 mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {["cash", "cheque", "mobile_money"].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setRepaymentMethod(method as any)}
                      className={`py-1.5 text-[9px] font-black uppercase rounded-lg border text-center transition cursor-pointer ${
                        repaymentMethod === method
                          ? "bg-slate-800 border-slate-800 text-white"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {method.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold text-slate-400 mb-1">Repayment Sum SLe *</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.01"
                  required
                  max={repayingCredit.remaining_balance}
                  value={repaymentAmount || ""}
                  onChange={(e) => setRepaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono font-extrabold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-emerald-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRepayingCredit(null)}
                  className="flex-1 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {loading ? "Processing..." : "Commit Repayment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VIEW PAYMENT HISTORY LOGS */}
      {viewingHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-850 flex items-center gap-1.5">
                <History className="h-4.5 w-4.5 text-indigo-500" /> Settled Payments Ledger ({viewingHistory.repayments?.length || 0})
              </h3>
              <button
                onClick={() => setViewingHistory(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Account Client</span>
                <p className="font-black text-slate-850 text-sm capitalize">{viewingHistory.customer_name}</p>
                <p className="text-[10px] text-indigo-600 font-mono font-bold mt-0.5">{viewingHistory.credit_id}</p>
              </div>

              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <div className="bg-slate-50 p-2 text-[10px] font-bold text-slate-400 uppercase grid grid-cols-4 border-b border-slate-100">
                  <span>Repay ID</span>
                  <span>Timestamp</span>
                  <span>Method</span>
                  <span className="text-right">Settled (SLe)</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {viewingHistory.repayments && viewingHistory.repayments.length > 0 ? (
                    [...viewingHistory.repayments]
                      .sort((a, b) => {
                        const aTime = new Date(a.timestamp).getTime() || 0;
                        const bTime = new Date(b.timestamp).getTime() || 0;
                        return bTime - aTime;
                      })
                      .map((rep) => (
                      <div key={rep.repayment_id} className="p-2.5 text-xs grid grid-cols-4 items-center">
                        <span className="font-mono text-[9px] text-slate-500 truncate">{rep.repayment_id}</span>
                        <span className="text-slate-600">{new Date(rep.timestamp).toLocaleDateString("en-GB")}</span>
                        <span className="uppercase text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded self-start w-fit font-bold">{rep.payment_method}</span>
                        <span className="text-right font-bold text-emerald-600 font-mono">SLe {rep.amount}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-405 font-bold text-xs">
                      No customer deposit history recorded yet. Account holds 100% outstanding liability.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl font-bold font-mono text-xs border border-slate-100">
                <span className="font-sans text-slate-500 font-semibold text-[11px]">Consolidated Settlers:</span>
                <span className="text-slate-800">
                  Paid SLe {viewingHistory.amount_paid} out of SLe {viewingHistory.total_amount} (Remaining: <span className="text-red-500 font-black">SLe {viewingHistory.remaining_balance}</span>)
                </span>
              </div>

              <button
                type="button"
                onClick={() => setViewingHistory(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ROOT ADMIN OVERRIDE EDIT */}
      {editingCredit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                <Edit className="h-4.5 w-4.5" /> Root Admin Credit Override (Nabieu Only)
              </h3>
              <button
                onClick={() => setEditingCredit(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {errorText && (
                <div className="p-2.5 bg-red-50 border border-red-150 text-red-700 text-xs rounded-lg font-bold">
                  ⚠️ {errorText}
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Debtor Customer Name</label>
                <input
                  type="text"
                  required
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Customer Phone Number</label>
                <input
                  type="text"
                  value={editCustomerPhone}
                  onChange={(e) => setEditCustomerPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Outstanding Debt SLe</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={editRemainingBalance || ""}
                  onChange={(e) => setEditRemainingBalance(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Account Override Status</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["unpaid", "partial", "paid"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditStatus(st)}
                      className={`py-1.5 text-[10px] font-extrabold uppercase rounded-lg border transition text-center ${
                        editStatus === st
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCredit(null)}
                  className="flex-1 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
                >
                  {loading ? "Saving..." : "Commit Overrides"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: LOG DEBTOR WARNING / CALL FOLLOW-UP NOTES */}
      {loggingFollowUpCredit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <PhoneCall className="h-4.5 w-4.5 text-indigo-600" /> Log Debtor Follow-up & Warnings
              </h3>
              <button
                type="button"
                onClick={() => setLoggingFollowUpCredit(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!loggingFollowUpCredit || !followUpNote.trim()) return;
                setLoading(true);
                try {
                  await executeLogCreditFollowUp(loggingFollowUpCredit.credit_id, followUpOutcome, followUpNote);
                  setLoggingFollowUpCredit(null);
                  setFollowUpNote("");
                } catch (err: any) {
                  alert(err.message || "Failed to save call trace notes.");
                } finally {
                  setLoading(false);
                }
              }} 
              className="space-y-4 text-xs"
            >
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-450 block pb-0.5">Debtor Details</span>
                <p className="font-extrabold text-slate-800 text-sm capitalize">{loggingFollowUpCredit.customer_name}</p>
                <p className="text-xs text-indigo-650 font-mono font-bold">{loggingFollowUpCredit.credit_id}</p>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Contact Outcome / Case State *</label>
                <select
                  value={followUpOutcome}
                  onChange={(e) => setFollowUpOutcome(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium cursor-pointer"
                >
                  <option value="promised_payment">💵 Promised payment timeline</option>
                  <option value="general_reminder">🔔 Sent generic warning/invoice reminder</option>
                  <option value="no_answer">🔇 No answer / Mobile unreachable</option>
                  <option value="disputed">⚖️ Dispute on items or pricing terms</option>
                  <option value="refused">🚫 Defiant / Refused to complete settlement</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Log Conversation Comments & Notes *</label>
                <textarea
                  required
                  rows={3}
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="e.g. Spoke to customer's brother. He promises they will bring cash SLe 5000 by this Friday morning..."
                  className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLoggingFollowUpCredit(null)}
                  className="flex-1 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {loading ? "Recording..." : "Save Log Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: VIEW HISTORICAL REMINDER LOGS */}
      {showFollowUpHistoryCredit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-sans">
                <BookOpen className="h-4.5 w-4.5 text-indigo-650" /> Historical Warning Logs
              </h3>
              <button
                type="button"
                onClick={() => setShowFollowUpHistoryCredit(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-450 block pb-0.5">Debtor Details</span>
                <p className="font-extrabold text-slate-805 text-sm capitalize">{showFollowUpHistoryCredit.customer_name}</p>
                <p className="text-xs text-indigo-655 font-mono font-bold">{showFollowUpHistoryCredit.credit_id}</p>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {showFollowUpHistoryCredit.follow_ups && showFollowUpHistoryCredit.follow_ups.length > 0 ? (
                  [...showFollowUpHistoryCredit.follow_ups]
                    .sort((a, b) => {
                      const aTime = new Date(a.timestamp).getTime() || 0;
                      const bTime = new Date(b.timestamp).getTime() || 0;
                      return bTime - aTime;
                    })
                    .map((fu, idx) => {
                    const outcomeLabels: Record<string, string> = {
                      promised_payment: "💵 Promised Payment",
                      no_answer: "🔇 No Answer",
                      disputed: "⚖️ Dispute Raised",
                      refused: "🚫 Refused Settlement",
                      general_reminder: "🔔 General Warning"
                    };
                    return (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1 text-xs">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                          <span>{new Date(fu.timestamp).toLocaleString("en-GB")}</span>
                          <span className="text-indigo-650 font-mono">By {fu.recorded_by}</span>
                        </div>
                        <p className="font-extrabold text-slate-700 text-[9px] uppercase">{outcomeLabels[fu.contact_outcome] || fu.contact_outcome}</p>
                        <p className="text-slate-600 text-xs mt-1 leading-normal italic">"{fu.note}"</p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-6 font-semibold">No call trace reminders logged yet for this account.</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowFollowUpHistoryCredit(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
