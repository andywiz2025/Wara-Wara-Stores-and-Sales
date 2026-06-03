import React, { useState } from "react";
import { useStore } from "../context/StoreContext";
import { CompanyLogo } from "./CompanyHeader";
import { Lock, User, Building, ShieldAlert, CheckCircle, HelpCircle } from "lucide-react";

export default function LoginScreen() {
  const { login } = useStore();
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [showHelper, setShowHelper] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput.trim()) return;

    setLoading(true);
    setErrorText("");

    try {
      const success = await login(usernameInput.trim(), passwordInput.trim());
      if (!success) {
        setErrorText("Invalid employee username or secret password. Please double check credentials or query store manager Nabieu.");
      }
    } catch (err: any) {
      setErrorText(err.message || "An unexpected error occurred during database security clearance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none font-sans">
      
      {/* Decorative ambient background lights */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md bg-slate-900/85 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl p-8 relative z-10 space-y-6">
        
        {/* Branding header with company logo */}
        <div className="text-center space-y-3">
          <div className="mx-auto max-w-[280px] p-2 bg-slate-950/40 rounded-xl border border-slate-800 flex items-center justify-center shadow-md">
            <CompanyLogo className="w-full h-auto" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-widest text-emerald-400 uppercase font-mono">ERP LEDGER SECURE LOGIN</h2>
            <p className="text-[10px] text-slate-500 font-mono uppercase">Wara Wara Construction & General Services</p>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorText && (
            <div className="p-3 bg-red-950/50 border border-red-900 text-red-200 text-xs rounded-xl flex items-start gap-2.5 animate-fadeIn">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <p className="leading-relaxed">{errorText}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-350 tracking-wider uppercase font-sans">
              Employee Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="e.g. Nabieu"
                required
                disabled={loading}
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#1e293b]/60 border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white placeholder-slate-500 text-sm font-sans"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-350 tracking-wider uppercase font-sans">
                Access Password
              </label>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                placeholder="•••••"
                required
                disabled={loading}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#1e293b]/60 border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white placeholder-slate-500 text-sm font-mono tracking-widest"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-[#10b981] hover:bg-[#059669] disabled:bg-[#10b981]/50 text-slate-950 font-bold text-sm tracking-wider uppercase rounded-xl transition duration-200 cursor-pointer shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5"
          >
            {loading ? "Decrypting Token..." : "Authenticate Session"}
          </button>
        </form>

        {/* Credentials hints help block */}
        {showHelper && (
          <div className="bg-[#1e293b]/40 border border-slate-800 rounded-xl p-4 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                <HelpCircle className="h-3.5 w-3.5" /> Authentication Sandbox Hint
              </span>
              <button
                onClick={() => setShowHelper(false)}
                className="text-[10px] text-slate-500 hover:text-slate-300 font-semibold cursor-pointer"
              >
                Hide Hints
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal font-sans">
              This deployment is running in high-security sandbox mode. Use the following pre-baked credentials for quick testing:
            </p>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-350">
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                <p className="font-bold text-emerald-400">👑 Admin User</p>
                <p className="mt-0.5">Username: <span className="text-white">Nabieu</span></p>
                <p>Password: <span className="text-white">12345</span></p>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                <p className="font-bold text-indigo-400">🧑 Staff Users</p>
                <p className="mt-0.5">Usernames: <span className="text-white">amadu</span> or <span className="text-white">kello</span></p>
                <p>Password: <span className="text-white">123</span></p>
              </div>
            </div>
          </div>
        )}

        <div className="text-center pt-2 text-[10px] text-slate-600 font-mono">
          Security policy enforced by Koinadugu Central IT Services
        </div>
      </div>
    </div>
  );
}
