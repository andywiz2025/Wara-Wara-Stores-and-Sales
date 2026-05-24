import React, { useState } from "react";
import { useStore } from "../context/StoreContext";
import { Users, Shield, ShieldCheck, Key, UserPlus, Lock } from "lucide-react";

export default function StaffManager() {
  const { staffProfiles, currentUser, registerNewStaffProfile } = useStore();

  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [canUpdateStock, setCanUpdateStock] = useState(true);
  const [canProcessSales, setCanProcessSales] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  const isAdmin = currentUser?.role === "admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setErrorText("");
    setSuccessText("");

    try {
      await registerNewStaffProfile(name, role, {
        can_update_stock: canUpdateStock,
        can_process_sales: canProcessSales
      });
      setSuccessText(`Staff member ${name} enrolled successfully!`);
      setName("");
      setRole("staff");
      setCanUpdateStock(true);
      setCanProcessSales(true);
    } catch (err: any) {
      setErrorText(err.message || "Failed to register personnel.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full flex-grow">
      
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 mb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-500" />
          Staff Directory & Roles
        </h2>
        <p className="text-xs text-slate-500">Configure clerk permissions and verify attribute access tokens</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-grow">
        
        {/* Left Side: Create Staff Member (Only for Admin) */}
        <div className="lg:col-span-5 bg-slate-50/70 p-4 rounded-xl border border-slate-100 h-full">
          <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider mb-2">
            <UserPlus className="h-4 w-4 text-indigo-500" />
            Enrol Staff Member
          </h3>

          {!isAdmin ? (
            <div className="p-4 bg-slate-100 border border-slate-200/80 rounded-xl text-slate-500 text-xs flex flex-col items-center justify-center text-center space-y-2 h-44">
              <Lock className="h-6 w-6 text-slate-400" />
              <p className="font-semibold">Creation Panel Offline</p>
              <p className="text-[11px] leading-relaxed text-slate-450">
                Personnel enrollment is restricted to Store Administrators. Use the identity toggler at the top to assume Admin powers.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorText && (
                <div className="p-2.5 bg-red-50 border border-red-150 text-red-700 text-[11px] rounded font-medium">
                  ⚠️ {errorText}
                </div>
              )}
              {successText && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-150 text-emerald-700 text-[11px] rounded font-medium">
                  🎉 {successText}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-slate-550 mb-1">
                  Full Employee name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Brima Koroma"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-550 mb-1">
                  System Clearance role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
                >
                  <option value="staff">Staff Clerk</option>
                  <option value="admin">Store Admin</option>
                </select>
              </div>

              <div className="space-y-2 pt-1">
                <span className="block text-[11px] font-medium text-slate-550">
                  Granular Privileges
                </span>

                <label className="flex items-center gap-2 text-xs text-slate-650 font-medium">
                  <input
                    type="checkbox"
                    checked={canUpdateStock}
                    onChange={(e) => setCanUpdateStock(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300"
                  />
                  Allow Stock Offloads (`can_update_stock`)
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-650 font-medium">
                  <input
                    type="checkbox"
                    checked={canProcessSales}
                    onChange={(e) => setCanProcessSales(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300"
                  />
                  Allow Sales Execution (`can_process_sales`)
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 rounded-lg shadow-sm transition-colors mt-2"
              >
                {loading ? "Registering..." : "Add Personnel to Database"}
              </button>
            </form>
          )}
        </div>

        {/* Right Side: Active Team profiles Grid list */}
        <div className="lg:col-span-7 flex flex-col h-full max-h-[420px]">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Active Team Profiles ({staffProfiles.length} Members)
          </h3>

          <div className="space-y-2.5 overflow-y-auto pr-1 flex-grow">
            {staffProfiles.map((member) => (
              <div
                key={member.uid}
                className="p-3.5 rounded-xl border border-slate-100 bg-white flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-800">{member.name}</span>
                    <span className={`text-[9px] font-black uppercase font-mono px-2 py-0.2 rounded ${
                      member.role === "admin" ? "bg-red-50 text-red-600 border border-red-105" : "bg-indigo-50 text-indigo-600 border border-indigo-105"
                    }`}>
                      {member.role === "admin" ? "ADMIN" : "STAFF"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">UID: {member.uid}</p>
                </div>

                <div className="flex gap-1">
                  {/* Stock offload badge */}
                  <span
                    className={`text-[9px] font-bold uppercase rounded px-1.5 py-0.5 border ${
                      member.permissions?.can_update_stock
                        ? "bg-emerald-50 text-emerald-700 border-emerald-150"
                        : "bg-slate-50 text-slate-400 border-slate-150"
                    }`}
                    title="Stock offloads allowed"
                  >
                    STOCK
                  </span>

                  {/* Process Sales badge */}
                  <span
                    className={`text-[9px] font-bold uppercase rounded px-1.5 py-0.5 border ${
                      member.permissions?.can_process_sales
                        ? "bg-indigo-50 text-indigo-700 border-indigo-150"
                        : "bg-slate-50 text-slate-400 border-slate-150"
                    }`}
                    title="Process sales allowed"
                  >
                    SALES
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
