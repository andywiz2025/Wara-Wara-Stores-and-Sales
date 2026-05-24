import React, { useState } from "react";
import { useStore } from "../context/StoreContext";
import { TBCRegistry } from "../types";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  Calendar,
  Layers,
  Search,
  PackageCheck
} from "lucide-react";

export default function TBCBoard() {
  const { tbcs, currentUser, executeTBCCollection, executeTBCExpiration } = useStore();
  const [filter, setFilter] = useState<"all" | "pending" | "collected" | "expired">("all");
  const [search, setSearch] = useState("");

  // Complete collection modal fields
  const [collectingTBC, setCollectingTBC] = useState<TBCRegistry | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const filteredTbc = tbcs.filter((t) => {
    const matchesSearch =
      t.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      t.tbc_id.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || t.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectingTBC || !recipientName.trim()) return;

    setLoading(true);
    setErrorText("");
    try {
      await executeTBCCollection(collectingTBC.tbc_id, recipientName);
      setCollectingTBC(null);
      setRecipientName("");
    } catch (err: any) {
      setErrorText(err.message || "Failed to process TBC collection dispatch.");
    } finally {
      setLoading(false);
    }
  };

  const handleExpireClick = async (tbc: TBCRegistry) => {
    if (window.confirm(`Are you certain you wish to flag TBC ticket #${tbc.tbc_id.slice(-6)} for ${tbc.customer_name} as expired?`)) {
      try {
        await executeTBCExpiration(tbc.tbc_id);
      } catch (err: any) {
        alert(err.message || "Failed to expire ticket.");
      }
    }
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return "N/A";
    // Check if it is a Firestore timestamp (seconds, nanoseconds)
    if (dateValue && typeof dateValue === "object" && "seconds" in dateValue) {
      return new Date(dateValue.seconds * 1000).toLocaleDateString();
    }
    return new Date(dateValue).toLocaleDateString();
  };

  const formatTime = (dateValue: any) => {
    if (!dateValue) return "";
    if (dateValue && typeof dateValue === "object" && "seconds" in dateValue) {
      return new Date(dateValue.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return new Date(dateValue).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full flex-grow">
      
      {/* Board Header */}
      <div className="border-b border-slate-100 pb-4 mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            TBC Registry Ledger
          </h2>
          <p className="text-xs text-slate-500">Track and dispatch prepaid customer materials waiting for cargo pickup</p>
        </div>

        {/* Filters */}
        <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-250">
          {(["all", "pending", "collected", "expired"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase rounded-md transition whitespace-nowrap cursor-pointer ${
                filter === opt
                  ? "bg-white text-slate-800 shadow"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div className="mb-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets by ID or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Grid List */}
      <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1 flex-grow">
        {filteredTbc.map((t) => {
          const isPending = t.status === "pending";
          const isCollected = t.status === "collected";
          const isExpired = t.status === "expired";

          return (
            <div
              key={t.tbc_id}
              className={`p-4 rounded-xl border transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                isCollected
                  ? "bg-slate-50/50 border-slate-200/80 text-slate-500"
                  : isExpired
                  ? "bg-red-50/30 border-red-150 text-slate-600"
                  : "bg-white border-slate-100 shadow-xs text-slate-850 hover:border-slate-200"
              }`}
            >
              {/* TBC Details info */}
              <div className="space-y-1.5 flex-1 max-w-lg">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    Ticket ID: {t.tbc_id.slice(-8)}
                  </span>

                  {isPending ? (
                    <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5 animate-pulse" /> PENDING DISPATCH
                    </span>
                  ) : isCollected ? (
                    <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="h-2.5 w-2.5" /> COLLECTED
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold bg-red-55 text-red-700 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="h-2.5 w-2.5" /> EXPIRED RESET
                    </span>
                  )}
                </div>

                <p className="text-sm font-bold text-slate-800">
                  Customer: {t.customer_name}
                </p>

                {/* Goods list details */}
                <div className="border border-slate-105/60 bg-slate-50/40 rounded-lg p-2 max-w-md">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Invoice Goods scheduled
                  </p>
                  <ul className="text-[11px] space-y-1 font-mono">
                    {t.items.map((it, idx) => (
                      <li key={idx} className="flex justify-between">
                        <span>• {it.name} <span className="font-bold text-indigo-500">x{it.quantity}</span></span>
                        <span>SLe {it.total.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-slate-200 mt-1.5 pt-1 flex justify-between text-[11px] font-bold font-mono">
                    <span>Total paid invoice value:</span>
                    <span className="text-slate-800">SLe {t.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex flex-col items-start md:items-end gap-2.5 min-w-[200px] text-left md:text-right">
                
                {/* Expire and Timeline labels */}
                {isPending && (
                  <div className="text-[11px] text-slate-400 space-y-1">
                    <p className="flex items-center md:justify-end gap-1">
                      <Calendar className="h-3 w-3" />
                      Expiry deadline: <strong className="text-slate-700">{formatDate(t.expiry_date)}</strong>
                    </p>
                  </div>
                )}

                {isCollected && (
                  <div className="text-[11px] text-slate-500 space-y-0.5 md:text-right font-mono">
                    <p className="flex items-center md:justify-end gap-1 font-bold text-slate-700 leading-none">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                      Received by: {t.collected_by}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Dispatched on {formatDate(t.collected_at)} {formatTime(t.collected_at)}
                    </p>
                  </div>
                )}

                {isExpired && (
                  <p className="text-[11px] text-red-500 leading-tight md:text-right max-w-xs italic bg-red-50/50 p-2 rounded border border-red-100/60 font-mono">
                    Valid collection window passed on {formatDate(t.expiry_date)}. Stock restored to sales ledger.
                  </p>
                )}

                {/* Operations buttons */}
                {isPending && (
                  <div className="flex gap-2 w-full md:w-auto">
                    <button
                      onClick={() => setCollectingTBC(t)}
                      className="flex-1 text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <PackageCheck className="h-4 w-4" />
                      Collect Shipment
                    </button>
                    <button
                      onClick={() => handleExpireClick(t)}
                      className="text-center bg-white border border-red-200 hover:bg-red-50 text-red-650 hover:text-red-700 font-bold text-xs p-2 rounded-lg transition"
                      title="Invalidate ticket as Expired"
                    >
                      Mark Expired
                    </button>
                  </div>
                )}

              </div>
            </div>
          );
        })}

        {filteredTbc.length === 0 && (
          <div className="py-16 flex flex-col items-center justify-center text-slate-450 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Layers className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-xs font-semibold">No TBC tickets found under this category</p>
            <p className="text-[11px] text-slate-400">Add prepaid materials on the sales register</p>
          </div>
        )}
      </div>

      {/* Execute Collection Prompt Modal */}
      {collectingTBC && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-sm p-5 animate-in fade-in zoom-in-95 duration-100">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-indigo-500" />
              Material Handover Authorization
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Verify receipt payment before dispatch. Record name of courier picking up cargo:
            </p>

            <form onSubmit={handleCollectSubmit} className="mt-4 space-y-4">
              {errorText && (
                <div className="p-2 bg-red-50 border border-red-150 text-red-700 text-[11px] rounded font-medium">
                  ⚠️ {errorText}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Recipient Collector's Full Name / Driver Signature
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lamin Sesay (Driver)"
                  required
                  autoFocus
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Display items list breakdown for checklist verification */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 max-h-36 overflow-y-auto">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Dispatch Checklist</span>
                <ul className="text-xs font-mono mt-1 space-y-0.5">
                  {collectingTBC.items.map((item, id) => (
                    <li key={id} className="text-slate-600">
                      ✓ {item.name} <span className="font-bold text-slate-900">x{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setCollectingTBC(null);
                    setRecipientName("");
                    setErrorText("");
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium py-2 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-2 rounded-lg shadow-sm transition disabled:opacity-55"
                >
                  {loading ? "Saving dispatch..." : "Confirm Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
