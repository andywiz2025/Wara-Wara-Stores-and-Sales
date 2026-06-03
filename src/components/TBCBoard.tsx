import React, { useState } from "react";
import { useStore } from "../context/StoreContext";
import { TBCRegistry, TBCItem, TBCCollectionRecord } from "../types";
import { exportTBCRegistryToExcel } from "../utils/excelExport";
import { CompanyLetterhead, COMPANY_SOFTWARE_FOOTER } from "./CompanyHeader";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  Calendar,
  Layers,
  Search,
  PackageCheck,
  Edit,
  Trash2,
  X
} from "lucide-react";

export default function TBCBoard() {
  const { 
    tbcs, 
    currentUser, 
    executeTBCCollection, 
    executeTBCExpiration,
    adminEditTbc,
    adminDeleteTbc 
  } = useStore();
  const [filter, setFilter] = useState<"all" | "pending" | "collected" | "expired">("all");
  const [search, setSearch] = useState("");

  // Complete collection modal fields
  const [collectingTBC, setCollectingTBC] = useState<TBCRegistry | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [quantitiesToCollect, setQuantitiesToCollect] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  // Print voucher receipt state
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<{
    tbcId: string;
    customerName: string;
    collection: TBCCollectionRecord;
  } | null>(null);

  // Root Nabieu TBC Overrides States
  const [editingTBC, setEditingTBC] = useState<TBCRegistry | null>(null);
  const [editTbcCustomerName, setEditTbcCustomerName] = useState("");
  const [editTbcTotalAmount, setEditTbcTotalAmount] = useState(0);
  const [editTbcStatus, setEditTbcStatus] = useState<"pending" | "partial" | "collected" | "expired">("pending");

  const filteredTbc = tbcs.filter((t) => {
    const matchesSearch =
      t.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      t.tbc_id.toLowerCase().includes(search.toLowerCase());
    
    // Support filtering "partial" status inside "pending" filter state
    const matchesFilter =
      filter === "all" ||
      (filter === "pending" && (t.status === "pending" || t.status === "partial")) ||
      t.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleOpenCollectModal = (tbc: TBCRegistry) => {
    setCollectingTBC(tbc);
    setRecipientName("");
    setErrorText("");
    // Pre-fill quantities to collect with remaining balance of each item
    const initialQtys: Record<string, number> = {};
    tbc.items.forEach((item) => {
      const remaining = item.quantity - (item.collected_quantity || 0);
      initialQtys[item.product_id] = remaining > 0 ? remaining : 0;
    });
    setQuantitiesToCollect(initialQtys);
  };

  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectingTBC || !recipientName.trim()) return;

    setLoading(true);
    setErrorText("");

    try {
      // Formulate list of items being collected today
      const itemsToCollect = collectingTBC.items.map((item) => ({
        product_id: item.product_id,
        quantity: quantitiesToCollect[item.product_id] || 0
      }));

      // Validate at least one item has positive collection quantity
      const totalSelected = itemsToCollect.reduce((sum, item) => sum + item.quantity, 0);
      if (totalSelected <= 0) {
        throw new Error("Please specify a quantity greater than 0 for at least one material.");
      }

      await executeTBCCollection(collectingTBC.tbc_id, recipientName, itemsToCollect);
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
              {opt === "pending" ? "Pending/Partial" : opt}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets by ID or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        {currentUser?.role === "admin" && (
          <button
            type="button"
            onClick={() => exportTBCRegistryToExcel(filteredTbc)}
            className="px-3.5 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 shadow-sm whitespace-nowrap"
            title="Export filtered TBC ticket registers to Excel spreadsheet"
          >
            <span>📗</span> Export TBC to Excel
          </button>
        )}
      </div>

      {/* Grid List */}
      <div className="space-y-3 overflow-y-auto max-h-[520px] pr-1 flex-grow">
        {filteredTbc.map((t) => {
          const isPending = t.status === "pending";
          const isPartial = t.status === "partial";
          const isCollected = t.status === "collected";
          const isExpired = t.status === "expired";

          return (
            <div
              key={t.tbc_id}
              className={`p-4 rounded-xl border transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                isCollected
                  ? "bg-slate-50/50 border-slate-200/85 text-slate-500"
                  : isExpired
                  ? "bg-red-50/30 border-red-150 text-slate-600"
                  : isPartial
                  ? "bg-indigo-50/10 border-indigo-200 shadow-xs"
                  : "bg-white border-slate-100 shadow-xs text-slate-850 hover:border-slate-200"
              }`}
            >
              {/* TBC Details info */}
              <div className="space-y-1.5 flex-grow max-w-lg">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    Ticket ID: {t.tbc_id.slice(-8)}
                  </span>

                  {isPending && (
                    <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5 animate-pulse" /> PENDING DISPATCH
                    </span>
                  )}
                  {isPartial && (
                    <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-205 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Layers className="h-2.5 w-2.5 animate-pulse-slow text-indigo-500" /> PARTIAL DISPATCH
                    </span>
                  )}
                  {isCollected && (
                    <span className="text-[9px] font-bold bg-emerald-50 text-emerald-750 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="h-2.5 w-2.5" /> FULLY DISPATCHED
                    </span>
                  )}
                  {isExpired && (
                    <span className="text-[9px] font-bold bg-red-55 text-red-700 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="h-2.5 w-2.5" /> EXPIRED RESET
                    </span>
                  )}
                </div>

                <p className="text-sm font-bold text-slate-800">
                  Customer: {t.customer_name}
                </p>

                {/* Goods list details - with dynamic collection balances */}
                <div className="border border-slate-200 bg-slate-50/60 rounded-lg p-2.5 max-w-md">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Prepaid Materials Reconciliation
                  </p>
                  <ul className="text-[11px] space-y-1.5 font-mono">
                    {t.items.map((it, idx) => {
                      const collectedCount = it.collected_quantity || 0;
                      const remainder = it.quantity - collectedCount;
                      const isQtyDone = remainder === 0;

                      return (
                        <li key={idx} className="flex justify-between border-b border-dashed border-slate-200/60 pb-1 last:border-none last:pb-0">
                          <span className="text-slate-755 font-medium">
                            • {it.name}{" "}
                            <span className="font-extrabold text-slate-900 bg-slate-200/50 rounded px-1 text-[10px]">
                              x{it.quantity} paid
                            </span>
                          </span>
                          <div className="text-right flex items-center gap-2">
                            {collectedCount > 0 && (
                              <span className="text-emerald-700 bg-emerald-50 text-[9px] font-bold rounded px-1">
                                {collectedCount} taken
                              </span>
                            )}
                            {isQtyDone ? (
                              <span className="text-emerald-600 font-bold text-[9px]">✓ ALL TAKEN</span>
                            ) : (
                              <span className="text-amber-700 bg-amber-50 text-[9px] font-bold rounded px-1 border border-amber-100">
                                {remainder} remaining
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="border-t border-slate-200 mt-2.5 pt-1.5 flex justify-between text-[11px] font-bold font-mono">
                    <span>Invoice Original Capital:</span>
                    <span className="text-slate-800">SLe {t.total_amount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Separate Pickup Receipts list inside the card */}
                {t.collections && t.collections.length > 0 && (
                  <div className="mt-3 bg-indigo-50/10 p-2.5 rounded-lg border border-indigo-100/60 max-w-md">
                    <p className="text-[9.5px] font-bold text-indigo-750 uppercase tracking-wider mb-2 flex items-center gap-1 font-sans">
                      <span>📋</span> Individual Cargo Pickup Receipts ({t.collections.length})
                    </p>
                    <ul className="space-y-1.5">
                      {t.collections.map((col, cId) => (
                        <li key={cId} className="bg-white p-2 rounded-lg border border-slate-201/80 text-[11px] flex justify-between items-center gap-2 shadow-2xs font-sans">
                          <div className="flex-1 space-y-0.5 text-left leading-tight">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-slate-800 text-[10px] bg-slate-100 px-1 rounded">{col.collection_id}</span>
                              <span className="text-[9px] text-slate-400 font-mono">{formatDate(col.collected_at)}</span>
                            </div>
                            <p className="text-slate-500 text-[10px] font-medium font-sans">
                              Picked up by: <strong className="text-slate-700">{col.collected_by}</strong> (Secured: {col.staff_id})
                            </p>
                            <p className="text-[10px] text-indigo-650 font-mono italic leading-none truncate max-w-[280px]">
                              {col.items.map((i) => `${i.name} (x${i.quantity})`).join(", ")}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedReceiptForPrint({
                              tbcId: t.tbc_id,
                              customerName: t.customer_name,
                              collection: col
                            })}
                            className="px-2 py-1 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-[10px] rounded transition shadow-2xs cursor-pointer flex items-center gap-0.5 whitespace-nowrap"
                            title="View / Print separate slip receipt voucher"
                          >
                            <span>🖨️</span> Print Voucher
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>

              {/* Status and Action Buttons */}
              <div className="flex flex-col items-start md:items-end gap-2.5 min-w-[200px] text-left md:text-right">
                
                {/* Expire and Timeline labels */}
                {(isPending || isPartial) && (
                  <div className="text-[11px] text-slate-400 space-y-1">
                    <p className="flex items-center md:justify-end gap-1">
                      <Calendar className="h-3 w-3" />
                      Expiry deadline: <strong className="text-slate-700">{formatDate(t.expiry_date)}</strong>
                    </p>
                  </div>
                )}

                {isCollected && (
                  <div className="text-[11px] text-slate-500 space-y-0.5 md:text-right font-mono">
                    <p className="flex items-center md:justify-end gap-1 font-bold text-emerald-600 leading-none">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                      Fully retrieved
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Last dispatch on {formatDate(t.collected_at)} {formatTime(t.collected_at)}
                    </p>
                  </div>
                )}

                {isExpired && (
                  <p className="text-[11px] text-red-500 leading-tight md:text-right max-w-xs italic bg-red-50/50 p-2 rounded border border-red-100/60 font-mono">
                    Valid collection window passed on {formatDate(t.expiry_date)}. Stock restored to sales ledger.
                  </p>
                )}

                {/* Operations buttons */}
                 {(isPending || isPartial) && (
                  <div className="flex gap-2 w-full md:w-auto">
                    <button
                      onClick={() => handleOpenCollectModal(t)}
                      className="flex-grow text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <PackageCheck className="h-4 w-4" />
                      Collect Shipment
                    </button>
                    {isPending && (
                      <button
                        onClick={() => handleExpireClick(t)}
                        className="text-center bg-white border border-red-200 hover:bg-red-50 text-red-650 hover:text-red-700 font-bold text-xs p-2 rounded-lg transition"
                        title="Invalidate ticket as Expired"
                      >
                        Mark Expired
                      </button>
                    )}
                  </div>
                )}

                {currentUser?.username?.toLowerCase() === "nabieu" && (
                  <div className="flex gap-1.5 mt-1 justify-end w-full md:w-auto">
                    <button
                      onClick={() => {
                        setEditingTBC(t);
                        setEditTbcCustomerName(t.customer_name);
                        setEditTbcTotalAmount(t.total_amount);
                        setEditTbcStatus(t.status);
                      }}
                      className="bg-amber-50 hover:bg-amber-100 border border-amber-200 hover:border-amber-300 text-amber-600 p-1.5 rounded-lg transition text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      title="Edit TBC Ticket"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={async () => {
                        const confirmDelete = window.confirm(`⚠️ Permanently delete TBC Ticket #${t.tbc_id.slice(-6).toUpperCase()}? This will discard the collection record in live logs!`);
                        if (!confirmDelete) return;
                        try {
                          await adminDeleteTbc(t.tbc_id);
                        } catch (err: any) {
                          alert(err.message || "Failed to delete TBC Ticket.");
                        }
                      }}
                      className="bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-500 p-1.5 rounded-lg transition text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      title="Delete TBC Ticket permanently"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
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

      {/* Execute Collection Prompt Modal (With Specific Item Quantities inputs) */}
      {collectingTBC && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-md p-5 animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start border-b border-slate-100 pb-2">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-indigo-500" />
                  Material Handover Dispatch
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Prepaid Release ticket ID: <strong>#{collectingTBC.tbc_id.slice(-8).toUpperCase()}</strong>
                </p>
              </div>
              <button
                onClick={() => {
                  setCollectingTBC(null);
                  setErrorText("");
                }}
                className="p-1 hover:bg-slate-100 rounded text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCollectSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-grow">
              {errorText && (
                <div className="p-2.5 bg-red-50 border border-red-150 text-red-700 text-[11px] rounded font-medium font-sans">
                  ⚠️ {errorText}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Recipient Courier Name / Driver License ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lamin Sesay (Coupling Driver)"
                  required
                  autoFocus
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                />
              </div>

              {/* Items handover list with interactive quantity controls */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Goods Released in this Handover Session
                </label>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-201 space-y-2 max-h-52 overflow-y-auto">
                  {collectingTBC.items.map((item, id) => {
                    const collectedQty = item.collected_quantity || 0;
                    const remaining = item.quantity - collectedQty;
                    const val = quantitiesToCollect[item.product_id] || 0;

                    return (
                      <div key={id} className="p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs flex flex-col gap-1.5">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-slate-800 text-xs truncate max-w-[200px]">{item.name}</span>
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                            {collectedQty}/{item.quantity} taken
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t border-slate-100/50 pt-1.5">
                          <span className="text-[10px] text-slate-500">
                            Available now: <strong className="text-indigo-650 font-extrabold">{remaining}</strong> units
                          </span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max={remaining}
                              disabled={remaining === 0}
                              value={val}
                              onChange={(e) => {
                                const inputVal = Math.max(0, Math.min(remaining, Number(e.target.value)));
                                setQuantitiesToCollect((prev) => ({
                                  ...prev,
                                  [item.product_id]: inputVal,
                                }));
                              }}
                              className="w-16 px-1.5 py-0.5 text-xs text-center border font-bold border-slate-300 rounded font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-150 disabled:text-slate-400"
                            />
                            {remaining > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setQuantitiesToCollect((prev) => ({
                                    ...prev,
                                    [item.product_id]: remaining,
                                  }));
                                }}
                                className="text-[9px] bg-slate-100 hover:bg-slate-200 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded transition uppercase"
                              >
                                MAX
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-1 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCollectingTBC(null);
                    setRecipientName("");
                    setErrorText("");
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-750 text-xs font-semibold py-2.5 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 rounded-lg shadow transition disabled:opacity-55"
                >
                  {loading ? "Recording handover..." : "Release Cargo & Print Slip"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Separate Printable Collection Receipt Overlay Modal */}
      {selectedReceiptForPrint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto print:p-0 print:bg-white animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 animate-in zoom-in-95 duration-150 print:shadow-none print:border-none print:p-0">
            
            {/* Print Header controls (Hidden during print) */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4 print:hidden">
              <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <span className="text-emerald-500 font-bold">●</span> Cargo Handover Receipt Generator
              </span>
              <button
                onClick={() => setSelectedReceiptForPrint(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold transition px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded cursor-pointer"
              >
                ✕ Close Ticket
              </button>
            </div>

            {/* Receipt Core Document */}
            <div id="wara-wara-invoice-ticket" className="bg-slate-50 p-5 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 space-y-4 print:bg-white print:border-none print:p-0">
              
              {/* Store Identity */}
              <div className="pb-1">
                <CompanyLetterhead darkTheme={false} centered={true} />
                <div className="border-b border-dashed border-slate-300 my-3"></div>
              </div>

              {/* Receipt info */}
              <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                <div>
                  <span className="text-slate-400 font-sans block text-[10px] tracking-tight">TICKET TYPE</span>
                  <p className="font-bold text-slate-900 uppercase">Handover Cargo Dispatch Slip</p>
                </div>
                <div>
                  <span className="text-slate-400 font-sans block text-[10px] tracking-tight">RELEASE SLIP NO.</span>
                  <p className="font-extrabold text-indigo-700 font-mono tracking-wider">
                    #{selectedReceiptForPrint.collection.collection_id.slice(-8).toUpperCase()}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-sans block text-[10px] tracking-tight">DATE & LIVE TIME</span>
                  <p className="font-semibold text-slate-900">
                    {formatDate(selectedReceiptForPrint.collection.collected_at)} {formatTime(selectedReceiptForPrint.collection.collected_at)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-sans block text-[10px] tracking-tight">CUSTOMER NAME</span>
                  <p className="font-bold text-slate-900 capitalize">
                    {selectedReceiptForPrint.customerName}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-sans block text-[10px] tracking-tight font-semibold">TBC TICKET ID</span>
                  <p className="font-semibold text-slate-900 font-mono text-left">
                    #{selectedReceiptForPrint.tbcId.toUpperCase()}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-sans block text-[10px] tracking-tight">DISPATCH STAFF SIGN</span>
                  <p className="font-semibold text-slate-800">
                    {selectedReceiptForPrint.collection.staff_id}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-sans block text-[10px] tracking-tight">RECEIVED BY (COURIER/DRIVER)</span>
                  <p className="font-extrabold text-slate-950 uppercase">
                    {selectedReceiptForPrint.collection.collected_by}
                  </p>
                </div>
              </div>

              <div className="border-b border-dashed border-slate-300"></div>

              {/* Dispatched Materials checklist */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-12 gap-1 text-[10px] text-slate-400 font-bold uppercase pb-1 border-b border-slate-150">
                  <span className="col-span-5 text-left">Material Description</span>
                  <span className="col-span-2 text-center">Released</span>
                  <span className="col-span-2 text-center">Ordered</span>
                  <span className="col-span-3 text-right text-amber-600">Outstanding</span>
                </div>
                
                {(() => {
                  const matchedTbc = tbcs.find(t => t.tbc_id === selectedReceiptForPrint.tbcId);
                  return selectedReceiptForPrint.collection.items.map((item: any, idx: number) => {
                    const tbcItem = matchedTbc?.items.find(i => i.product_id === item.product_id);
                    const originalQty = tbcItem ? tbcItem.quantity : item.quantity;
                    const outstanding = tbcItem ? (tbcItem.quantity - (tbcItem.collected_quantity || 0)) : 0;
                    return (
                      <div key={idx} className="grid grid-cols-12 gap-1 text-[11px] py-1 border-b border-slate-100 last:border-0 font-sans text-slate-705">
                        <span className="col-span-5 truncate font-medium">
                          {item.name}
                        </span>
                        <span className="col-span-2 text-center font-bold text-slate-900 font-mono">
                          {item.quantity}
                        </span>
                        <span className="col-span-2 text-center text-slate-500 font-mono">
                          {originalQty}
                        </span>
                        <span className="col-span-3 text-right font-black text-amber-600 font-mono">
                          {outstanding} units
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="border-b border-dashed border-slate-300"></div>

              {/* Signature lines */}
              <div className="grid grid-cols-2 gap-6 pt-3 text-[10px] font-bold text-slate-500 font-sans">
                <div className="text-center space-y-7">
                  <div className="h-3"></div>
                  <span className="border-t border-slate-350 block pt-1 uppercase tracking-tight text-[9px]">Authorised Storekeeper Sign</span>
                </div>
                <div className="text-center space-y-7">
                  <div className="h-3"></div>
                  <span className="border-t border-slate-350 block pt-1 uppercase tracking-tight text-[9px]">Driver / Receiver Sign-off</span>
                </div>
              </div>

              <div className="border-b border-dashed border-slate-300"></div>

              {/* Mandatory Official Footer */}
              <div className="text-[10px] text-slate-500 text-center space-y-1.5 pt-1.5 leading-relaxed font-sans">
                <p className="font-semibold text-slate-700">
                  All rights reserved this software is a property of Wara Wara Construction and General Services and Wata Sai Stone Investment .
                </p>
                <p className="text-emerald-600 text-[9px] uppercase tracking-wider font-extrabold font-mono">
                  Software built and managed by Andrew Tech Solutions (andrewdrive2025@gmail.com)
                </p>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 mt-5 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedReceiptForPrint(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-xl transition cursor-pointer text-center"
              >
                Close Receipt
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex-1 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-extrabold py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <span>🖨️</span> Print Official Receipt
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Root Nabieu Overrides Edit TBC Ticket Modal */}
      {editingTBC && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-sm p-5 animate-in zoom-in-95 duration-100">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-850 text-sm flex items-center gap-1.5 text-amber-700">
                  <Edit className="h-4 w-4" />
                  Override TBC Ticket #{editingTBC.tbc_id.slice(-8).toUpperCase()}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Root user administrative ticket amendment
                </p>
              </div>
              <button
                onClick={() => setEditingTBC(null)}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await adminEditTbc(editingTBC.tbc_id, {
                    customer_name: editTbcCustomerName,
                    total_amount: Number(editTbcTotalAmount),
                    status: editTbcStatus,
                  });
                  setEditingTBC(null);
                } catch (err: any) {
                  alert(err.message || "Failed to update TBC Ticket.");
                }
              }}
              className="mt-4 space-y-4 text-xs font-sans"
            >
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Customer / Buyer Name
                </label>
                <input
                  type="text"
                  required
                  value={editTbcCustomerName}
                  onChange={(e) => setEditTbcCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Adjust Total Amount (SLe)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editTbcTotalAmount}
                  onChange={(e) => setEditTbcTotalAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Change Ticket Status
                </label>
                <select
                  value={editTbcStatus}
                  onChange={(e) => setEditTbcStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="pending">Pending Collection</option>
                  <option value="partial">Partially Collected</option>
                  <option value="collected">Successfully Collected</option>
                  <option value="expired">Expired / Restored</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTBC(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2 rounded-lg shadow-sm transition cursor-pointer"
                >
                  Save Amendments
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
