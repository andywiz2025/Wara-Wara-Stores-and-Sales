import React, { useState } from "react";
import { useStore } from "../context/StoreContext";
import { Sale } from "../types";
import {
  FileText,
  DollarSign,
  User,
  Calendar,
  Lock,
  Search,
  BookOpen,
  Eye,
  X
} from "lucide-react";

export default function SalesLedgerView() {
  const { sales } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSale, setActiveSale] = useState<Sale | null>(null);

  const filteredSales = sales.filter((s) => {
    return (
      s.sale_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.payment_method.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.staff_id && s.staff_id.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const formatDate = (dateValue: any) => {
    if (!dateValue) return "N/A";
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

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "cash":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "cheque":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "mobile_money":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full flex-grow">
      
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            Locked Sales Ledger
          </h2>
          <p className="text-xs text-slate-500">Unmodifiable historic log of all processed retail transactions</p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-mono">
          <Lock className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
          <span>LEDGER IMMUTABLE</span>
        </div>
      </div>

      {/* Quick Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter ledger by invoice ID, operator, or payment mode..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Ledger Log entries */}
      <div className="space-y-2.5 overflow-y-auto max-h-[460px] pr-1 flex-grow">
        {filteredSales.map((s) => {
          return (
            <div
              key={s.sale_id}
              className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-slate-800 transition"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-slate-200 text-slate-700 font-mono font-bold px-1.5 py-0.5 rounded">
                    INV#{s.sale_id.slice(-6).toUpperCase()}
                  </span>
                  <span className={`text-[10px] font-bold uppercase border px-2 py-0.5 rounded-full ${getMethodBadge(s.payment_method)}`}>
                    {s.payment_method.replace("_", " ")}
                  </span>
                  {s.reference_details && (
                    <span className="text-[10px] text-slate-450 font-mono italic">
                      ({s.reference_details})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3.5 text-[11px] text-slate-550 pt-0.5">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Operator: <strong className="text-slate-700 font-medium">{s.staff_id}</strong>
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="h-3 w-3" />
                    {formatDate(s.timestamp)} • {formatTime(s.timestamp)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                <div className="text-left md:text-right">
                  <span className="text-[10px] text-slate-450 uppercase block">invoice amount</span>
                  <strong className="text-sm font-extrabold text-slate-800 font-mono">
                    SLe {s.total_amount.toFixed(2)}
                  </strong>
                </div>

                <button
                  onClick={() => setActiveSale(s)}
                  className="bg-white border border-slate-200 hover:border-indigo-300 text-slate-500 hover:text-indigo-600 p-2 rounded-lg transition-colors cursor-pointer"
                  title="Review transaction breakdown details"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredSales.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-slate-450 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <BookOpen className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-xs font-semibold">Sales ledger is completely clean</p>
            <p className="text-[11px] text-slate-400">Recorded checkout entries will populate this panel</p>
          </div>
        )}
      </div>

      {/* Review details popup modal */}
      {activeSale && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-sm p-5 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Invoice Ticket #{(activeSale.sale_id || "").slice(-8).toUpperCase()}
                </h3>
                <p className="text-[10px] text-slate-450 font-mono mt-0.5">
                  Record Date: {formatDate(activeSale.timestamp)} {formatTime(activeSale.timestamp)}
                </p>
              </div>
              <button
                onClick={() => setActiveSale(null)}
                className="p-1 hover:bg-slate-100 text-slate-450 hover:text-slate-700 rounded-lg transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Recipient user metadata info */}
            <div className="py-3 space-y-3 font-mono text-xs">
              <div className="bg-slate-50 p-2 rounded border border-slate-100 space-y-1">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Ledger Operators</p>
                <p className="text-slate-700">Staff Key: <strong className="text-slate-800">{activeSale.staff_id}</strong></p>
                <p className="text-slate-700">Method: <strong className="text-slate-800 uppercase">{activeSale.payment_method}</strong></p>
                {activeSale.reference_details && (
                  <p className="text-slate-705">Ref Details: <strong className="text-slate-800">{activeSale.reference_details}</strong></p>
                )}
              </div>

              {/* Items detail list */}
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Stock Items List</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {activeSale.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-slate-650 bg-slate-50/50 p-2 rounded border border-slate-100/50">
                      <span>{it.name} <span className="font-bold text-indigo-500 font-sans">x{it.quantity}</span></span>
                      <span className="font-bold">SLe {(it.unit_cost * it.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gross total invoice */}
              <div className="border-t border-slate-150 pt-2 flex justify-between font-bold">
                <span>Gross Recieved:</span>
                <span className="text-base text-slate-900 font-extrabold">SLe {activeSale.total_amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Close */}
            <button
              onClick={() => setActiveSale(null)}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs py-2 rounded-lg transition"
            >
              Verify & Dismiss
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
