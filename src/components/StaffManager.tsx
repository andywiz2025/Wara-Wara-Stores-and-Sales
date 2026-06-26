import React, { useState } from "react";
import { useStore } from "../context/StoreContext";
import { Users, Shield, ShieldCheck, Key, UserPlus, Lock, Trash2, Download, Database } from "lucide-react";

export default function StaffManager() {
  const { 
    staffProfiles, 
    currentUser, 
    registerNewStaffProfile, 
    executeDeleteStaffProfile, 
    adminChangePassword,
    products,
    sales,
    tbcs,
    notifications,
    adminResetAllData
  } = useStore();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [canUpdateStock, setCanUpdateStock] = useState(true);
  const [canProcessSales, setCanProcessSales] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  // Inline password reset states
  const [activeResetUid, setActiveResetUid] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const isAdmin = currentUser?.role === "admin";
  const isNabieu = currentUser?.username?.toLowerCase() === "nabieu";

  if (!isAdmin) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-150 flex flex-col items-center justify-center text-center space-y-4 h-[440px] flex-grow">
        <div className="bg-red-50 p-4 rounded-full border border-red-100">
          <Lock className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Administrative Gaskets Closed</h2>
          <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed mx-auto">
            You are currently operating the application under standard <strong>Staff Mode</strong>. The Staff Security Directory and team credentials are strictly locked down.
          </p>
        </div>
        <p className="text-[10px] font-mono uppercase bg-slate-100 text-slate-500 border border-slate-200 px-3 py-1 rounded font-semibold">
          Security Level Required: [ADMINISTRATOR]
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password) return;

    setLoading(true);
    setErrorText("");
    setSuccessText("");

    try {
      await registerNewStaffProfile(name, username.trim(), password, role, {
        can_update_stock: canUpdateStock,
        can_process_sales: canProcessSales
      });
      setSuccessText(`Staff member ${name} enrolled successfully!`);
      setName("");
      setUsername("");
      setPassword("");
      setRole("staff");
      setCanUpdateStock(true);
      setCanProcessSales(true);
    } catch (err: any) {
      setErrorText(err.message || "Failed to register personnel.");
    } finally {
      setLoading(false);
    }
  };

  const handleDatabaseBackup = () => {
    try {
      const backupData = {
        backup_metadata: {
          timestamp: new Date().toISOString(),
          formatted_date: new Date().toLocaleString("en-GB"),
          app_id: "Wara-Wara-Stores-Ledger-System",
          creator_role: currentUser?.role || "admin",
          creator_name: currentUser?.name || "System Admin",
          record_counts: {
            products: products.length,
            sales: sales.length,
            tbcs: tbcs.length,
            staff_profiles: staffProfiles.length,
            notifications: notifications.length,
          }
        },
        collections: {
          products: products.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            current_stock: p.current_stock,
            total_offloaded: p.total_offloaded || 0,
            unit_price: p.unit_price,
            image_url: p.image_url || ""
          })),
          sales_ledger: sales.map(s => {
            let tsStr = s.timestamp;
            if (s.timestamp && typeof s.timestamp === "object" && s.timestamp.seconds) {
              tsStr = new Date(s.timestamp.seconds * 1000).toISOString();
            }
            return {
              sale_id: s.sale_id,
              staff_id: s.staff_id,
              customer_name: s.customer_name || "Walk-In Customer",
              payment_method: s.payment_method,
              reference_details: s.reference_details || "",
              total_amount: s.total_amount,
              timestamp: tsStr,
              items: s.items || []
            };
          }),
          tbc_registry: tbcs.map(t => {
            let expStr = t.expiry_date;
            if (t.expiry_date && typeof t.expiry_date === "object" && t.expiry_date.seconds) {
              expStr = new Date(t.expiry_date.seconds * 1000).toISOString();
            }
            let collStr = t.collected_at;
            if (t.collected_at && typeof t.collected_at === "object" && t.collected_at.seconds) {
              collStr = new Date(t.collected_at.seconds * 1000).toISOString();
            }
            return {
              tbc_id: t.tbc_id,
              customer_name: t.customer_name,
              total_amount: t.total_amount,
              status: t.status,
              expiry_date: expStr,
              collected_by: t.collected_by || null,
              collected_at: collStr || null,
              items: t.items || []
            };
          }),
          staff_profiles: staffProfiles.map(sp => ({
            uid: sp.uid,
            name: sp.name,
            username: sp.username,
            role: sp.role,
            permissions: sp.permissions
          })),
          notifications: notifications.map(n => ({
            id: n.id,
            message: n.message,
            timestamp: n.timestamp,
            type: n.type,
            read: n.read
          }))
        }
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `Wara_Wara_Stores_Backup_${new Date().toISOString().split("T")[0]}_${Math.floor(Date.now() / 1000)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
    } catch (err) {
      console.error("Backup trigger failed:", err);
      alert("Error generating manual backup archive: " + String(err));
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full flex-grow">
      
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-500" />
            Staff Security & Administrative Center
          </h2>
          <p className="text-xs text-slate-500">Configure clerk permissions, manage member profiles, or run full catalog archival backups</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDatabaseBackup}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl transition border border-indigo-500 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-center"
            title="Download single independent JSON package of products catalog, sales ledger, TBC registry, and employee roles"
          >
            <Database className="h-4 w-4" />
            <span>💾 One-Click Database Backup (JSON)</span>
          </button>

          {isNabieu && (
            <button
              type="button"
              onClick={async () => {
                const conf1 = window.confirm(
                  "⚠️ WARNING: You are attempting a FULL operational data reset.\n\n" +
                  "This will permanently delete all Sales Invoices, Credit Accounts, TBC Tickets, logged Expenditures, Bank Deposits, and Vault logs.\n\n" +
                  "🔴 ALL STORE PRODUCT STOCKS WILL BE SET TO ZERO (0) to force-activate low stock and out-of-stock alarms.\n\n" +
                  "IMPORTANT: Live update/restocking to stores MUST be performed before normal transaction operations can continue.\n\n" +
                  "Are you sure you want to proceed?"
                );
                if (!conf1) return;
                const conf2 = window.confirm(
                  "🔴 CRITICAL CONFIRMATION: This action is irreversible! All operational history, credits, TBCs, expenditures, bank deposits, and vault logs will be cleared and product counts will drop to zero.\n\n" +
                  "Are you absolutely 100% sure you want to proceed and require manual restocking?"
                );
                if (!conf2) return;
                
                try {
                  await adminResetAllData();
                  setSuccessText("All operational data, credits, TBCs, expenditures, bank deposits, and vault logs successfully wiped. Product stocks have been set to exactly 0 units. Please restock items in the Store Catalog before initiating new transaction operations!");
                } catch (err: any) {
                  setErrorText(err.message || "Failed to execute database wipe.");
                }
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl transition border border-rose-500 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/50 animate-pulse text-center"
              title="Only accessible to Root Administrator Nabieu. Safely wipe all current records to clean-slate the system after training sessions."
            >
              <span>♻️</span>
              <span>Training Reset (Clear Data)</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-grow">
        
        {/* Left Side: Create Staff Member (Only for Admin) */}
        <div className="lg:col-span-5 bg-slate-50/70 p-4 rounded-xl border border-slate-100 h-full">
          <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider mb-2">
            <UserPlus className="h-4 w-4 text-indigo-500" />
            Enrol Staff Member
          </h3>

          {!isNabieu ? (
            <div className="p-4 bg-slate-100 border border-slate-200/80 rounded-xl text-slate-550 text-xs flex flex-col items-center justify-center text-center space-y-2 h-44">
              <Lock className="h-6 w-6 text-amber-500" />
              <p className="font-extrabold text-slate-800">Enrollment Restrictive Mode</p>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Personnel enrollment or master security modification is restricted strictly to Nabieu Conteh's root authorized administrator credentials.
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
                  Username (Credential for Login)
                </label>
                <input
                  type="text"
                  placeholder="e.g. brima"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-550 mb-1">
                  Private Account Password
                </label>
                <input
                  type="password"
                  placeholder="e.g. secret123"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 font-mono"
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
                className="p-3.5 rounded-xl border border-slate-100 bg-white flex flex-col gap-2 shadow-xs"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-800">{member.name}</span>
                      <span className={`text-[9px] font-black uppercase font-mono px-2 py-0.2 rounded ${
                        member.role === "admin" ? "bg-red-50 text-red-600 border border-red-105" : "bg-indigo-50 text-indigo-600 border border-indigo-105"
                      }`}>
                        {member.role === "admin" ? "ADMIN" : "STAFF"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-450 font-mono">
                      <span className="font-semibold text-slate-600">Username:</span> {member.username || "unset"} | <span className="font-semibold text-slate-400">UID:</span> {member.uid}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
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

                    {/* Password reset button */}
                    {isNabieu && (
                      <button
                        onClick={() => {
                          if (activeResetUid === member.uid) {
                            setActiveResetUid(null);
                          } else {
                            setActiveResetUid(member.uid);
                            setNewPasswordInput("");
                            setErrorText("");
                            setSuccessText("");
                          }
                        }}
                        className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition cursor-pointer"
                        title="Reset or Change Password"
                      >
                        <Key className="h-3 w-3" />
                      </button>
                    )}

                    {/* ADMIN DELETE BUTTON */}
                    {isNabieu && member.uid !== "SYSTEM_ROOT_ADMIN" && (
                      <button
                        onClick={async () => {
                          const confirmDelete = window.confirm(`Are you certain you wish to revoke permissions and delete Team Member ${member.name} permanently?`);
                          if (!confirmDelete) return;
                          try {
                            await executeDeleteStaffProfile(member.uid);
                            setSuccessText(`Employee ${member.name} has been removed from directory.`);
                          } catch (err: any) {
                            setErrorText(err.message || "Failed to delete personnel profile.");
                          }
                        }}
                        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 transition cursor-pointer"
                        title="Delete staff profile"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Password Reset Panel */}
                {activeResetUid === member.uid && (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 flex items-center gap-2 mt-1 animate-fadeIn">
                    <input
                      type="text"
                      placeholder="Enter new password"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      className="flex-grow px-2 py-1 text-[11px] bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800"
                    />
                    <button
                      onClick={async () => {
                        if (!newPasswordInput.trim()) return;
                        setResetLoading(true);
                        try {
                          await adminChangePassword(member.uid, newPasswordInput.trim());
                          setSuccessText(`Password for ${member.name} successfully updated to "${newPasswordInput.trim()}".`);
                          setActiveResetUid(null);
                        } catch (err: any) {
                          setErrorText(err.message || "Failed to update password.");
                        } finally {
                          setResetLoading(false);
                        }
                      }}
                      disabled={resetLoading}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] rounded cursor-pointer transition animate-pulse"
                    >
                      {resetLoading ? "Saving..." : "Change Password"}
                    </button>
                    <button
                      onClick={() => setActiveResetUid(null)}
                      className="px-2 py-1 border border-slate-300 text-slate-500 hover:bg-slate-100 font-semibold text-[10px] rounded cursor-pointer"
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
