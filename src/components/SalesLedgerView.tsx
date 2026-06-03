import React, { useState } from "react";
import { useStore } from "../context/StoreContext";
import { COMPANY_SOFTWARE_FOOTER } from "./CompanyHeader";
import { Sale } from "../types";
import { exportSalesLedgerToExcel } from "../utils/excelExport";
import {
  FileText,
  DollarSign,
  User,
  Calendar,
  Lock,
  Search,
  BookOpen,
  Eye,
  X,
  Plus,
  ArrowUpRight,
  TrendingDown,
  LockKeyhole,
  CheckCircle2,
  Coins,
  Edit,
  Trash2
} from "lucide-react";

export default function SalesLedgerView() {
  const { 
    sales, 
    expenditures, 
    bankDeposits, 
    executeAddExpenditure, 
    executeAddBankDeposit, 
    currentUser,
    adminEditSale,
    adminDeleteSale
  } = useStore();
  
  const isAdmin = currentUser?.role === "admin";
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSale, setActiveSale] = useState<Sale | null>(null);

  // Root Nabieu Transaction Overrides States
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editTotalAmount, setEditTotalAmount] = useState(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState<"cash" | "cheque" | "mobile_money" | "tbc">("cash");
  const [editReferenceDetails, setEditReferenceDetails] = useState("");

  // Sub-navigation tabs
  const [activeSubTab, setActiveSubTab] = useState<"sales" | "expenditures" | "deposits">("sales");

  // Store Report Printing states
  const [reportType, setReportType] = useState<"daily" | "period">("daily");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]); // defaults to today
  const [reportStart, setReportStart] = useState("");
  const [reportEnd, setReportEnd] = useState("");

  // Expenditure Form states
  const [expDescription, setExpDescription] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("General");
  const [expAuthorizedBy, setExpAuthorizedBy] = useState("");
  const [expError, setExpError] = useState("");
  const [expSuccess, setExpSuccess] = useState("");

  // Deposit Form states
  const [depAmount, setDepAmount] = useState("");
  const [depBankName, setDepBankName] = useState("");
  const [depDepositedBy, setDepDepositedBy] = useState("");
  const [depSlipSerial, setDepSlipSerial] = useState("");
  const [depError, setDepError] = useState("");
  const [depSuccess, setDepSuccess] = useState("");

  // Filters
  const filteredSales = sales.filter((s) => {
    return (
      s.sale_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.payment_method.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.staff_id && s.staff_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.customer_name && s.customer_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const getSelectedPeriodSales = () => {
    return sales.filter((s) => {
      if (!s.timestamp) return false;
      const parsedDate = s.timestamp && typeof s.timestamp === "object" && "seconds" in s.timestamp
        ? new Date(s.timestamp.seconds * 1000)
        : new Date(s.timestamp);
      
      if (isNaN(parsedDate.getTime())) return false;
      const saleDateStr = parsedDate.toISOString().split("T")[0]; // yyyy-mm-dd
      
      if (reportType === "daily") {
        if (!reportDate) return true;
        return saleDateStr === reportDate;
      } else {
        const start = reportStart || "1970-01-01";
        const end = reportEnd || "2999-12-31";
        return saleDateStr >= start && saleDateStr <= end;
      }
    });
  };

  const getSelectedPeriodExpenditures = () => {
    return expenditures.filter((e) => {
      if (!e.timestamp) return false;
      const parsedDate = e.timestamp && typeof e.timestamp === "object" && "seconds" in e.timestamp
        ? new Date(e.timestamp.seconds * 1000)
        : new Date(e.timestamp);
      
      if (isNaN(parsedDate.getTime())) return false;
      const expDateStr = parsedDate.toISOString().split("T")[0];
      
      if (reportType === "daily") {
        if (!reportDate) return true;
        return expDateStr === reportDate;
      } else {
        const start = reportStart || "1970-01-01";
        const end = reportEnd || "2999-12-31";
        return expDateStr >= start && expDateStr <= end;
      }
    });
  };

  const getSelectedPeriodDeposits = () => {
    return bankDeposits.filter((d) => {
      if (!d.timestamp) return false;
      const parsedDate = d.timestamp && typeof d.timestamp === "object" && "seconds" in d.timestamp
        ? new Date(d.timestamp.seconds * 1000)
        : new Date(d.timestamp);
      
      if (isNaN(parsedDate.getTime())) return false;
      const depDateStr = parsedDate.toISOString().split("T")[0];
      
      if (reportType === "daily") {
        if (!reportDate) return true;
        return depDateStr === reportDate;
      } else {
        const start = reportStart || "1970-01-01";
        const end = reportEnd || "2999-12-31";
        return depDateStr >= start && depDateStr <= end;
      }
    });
  };

  // Math totals for the selected period
  const selectedPeriodSales = getSelectedPeriodSales();
  const selectedPeriodExpenditures = getSelectedPeriodExpenditures();
  const selectedPeriodDeposits = getSelectedPeriodDeposits();

  const totalPeriodSalesAmount = selectedPeriodSales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalPeriodExpendituresAmount = selectedPeriodExpenditures.reduce((sum, e) => sum + e.amount, 0);
  const totalPeriodNetBalance = totalPeriodSalesAmount - totalPeriodExpendituresAmount;

  // Global All-Time Vault Accumulator math
  const totalAllTimeSales = sales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalAllTimeExpenditures = expenditures.reduce((sum, e) => sum + e.amount, 0);
  const totalAllTimeDeposits = bankDeposits.reduce((sum, d) => sum + d.amount, 0);
  const runningVaultAccumulator = totalAllTimeSales - totalAllTimeExpenditures - totalAllTimeDeposits;

  const handlePrintStoreReport = () => {
    const periodSales = selectedPeriodSales;
    const periodExpenditures = selectedPeriodExpenditures;
    const periodDeposits = selectedPeriodDeposits;

    const totalTransactions = periodSales.length;
    const grossRevenue = totalPeriodSalesAmount;
    const grossExpenditures = totalPeriodExpendituresAmount;
    const netBalance = totalPeriodNetBalance;
    
    // Revenue by method
    const cashTotal = periodSales.filter(s => s.payment_method === "cash").reduce((sum, s) => sum + s.total_amount, 0);
    const chequeTotal = periodSales.filter(s => s.payment_method === "cheque").reduce((sum, s) => sum + s.total_amount, 0);
    const momoTotal = periodSales.filter(s => s.payment_method === "mobile_money").reduce((sum, s) => sum + s.total_amount, 0);
    
    // Itemized volume sum
    const itemsMap: { [name: string]: { qty: number, revenue: number } } = {};
    periodSales.forEach((s) => {
      if (s.items) {
        s.items.forEach((it) => {
          if (!itemsMap[it.name]) {
            itemsMap[it.name] = { qty: 0, revenue: 0 };
          }
          itemsMap[it.name].qty += it.quantity;
          itemsMap[it.name].revenue += (it.unit_cost * it.quantity);
        });
      }
    });
    
    const formattedPeriod = reportType === "daily"
      ? (reportDate ? `DAILY REPORT FOR ${new Date(reportDate).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}` : "ALL-TIME DAILY TRANSACTION LOG")
      : `PERIOD FROM ${reportStart ? new Date(reportStart).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }) : "START OF RECORDS"} TO ${reportEnd ? new Date(reportEnd).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }) : "TODAY"}`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Operation Store Report - Wara Wara Construction</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 35px; color: #0f172a; line-height: 1.5; }
              header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; }
              h1 { margin: 0; font-size: 19px; text-transform: uppercase; color: #0f172a; font-weight: 855; }
              h2 { font-size: 12px; margin: 5px 0 0 0; color: #475569; letter-spacing: 0.5px; text-transform: uppercase; font-weight: bold; }
              .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px; }
              .meta-table td { padding: 8px 12px; border: 1px solid #cbd5e1; }
              .meta-table td.label { font-weight: bold; background: #f8fafc; color: #475569; width: 25%; }
              .section-heading { font-size: 13px; font-weight: bold; text-transform: uppercase; color: #1e3a8a; border-left: 4px solid #1e3a8a; padding-left: 8px; margin: 22px 0 10px; }
              .data-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 25px; }
              .data-table th { background: #f1f5f9; padding: 8px 10px; border: 1px solid #cbd5e1; text-align: left; font-weight: bold; color: #334155; }
              .data-table td { padding: 7px 10px; border: 1px solid #e2e8f0; }
              .footer { margin-top: 55px; border-top: 2px dashed #cbd5e1; padding-top: 15px; text-align: center; font-size: 10px; color: #64748b; line-height: 1.6; }
              .total-highlight { font-size: 14px; font-weight: 900; color: #0f172a; font-family: monospace; }
            </style>
          </head>
          <body>
            <header style="border-bottom: 2px solid #0f172a; padding-bottom: 18px; text-align: center; margin-bottom: 25px;">
              <!-- Official Company Logo in Printable Report Header -->
              <svg viewBox="0 0 1000 240" fill="none" xmlns="http://www.w3.org/2000/svg" style="max-height: 100px; width: 100%; max-width: 600px; display: block; margin: 0 auto 10px auto;">
                <polygon points="260,110 390,30 500,90 590,40 700,110" fill="#15803d" opacity="0.85" />
                <polygon points="340,110 440,50 540,110" fill="#166534" />
                <polygon points="460,110 560,35 660,110" fill="#14532d" opacity="0.9" />
                <polygon points="390,30 375,45 400,48" fill="#a7f3d0" />
                <polygon points="590,40 575,55 600,58" fill="#a7f3d0" />
                <polygon points="560,35 545,48 570,52" fill="#86efac" />
                <g transform="translate(40, -10)">
                  <rect x="110" y="100" width="100" height="15" rx="7" fill="#1e293b" />
                  <line x1="120" y1="108" x2="200" y2="108" stroke="#ffffff" stroke-width="2" stroke-dasharray="4 3" />
                  <path d="M125,75 L165,75 L175,100 L120,100 Z" fill="#ea580c" />
                  <path d="M135,55 L155,55 L165,75 L130,75 Z" fill="#1e293b" />
                  <rect x="138" y="59" width="12" height="11" fill="#bae6fd" />
                  <path d="M165,80 L210,35 L200,30 L160,75 Z" fill="#ea580c" />
                  <path d="M205,33 L230,65 L245,60 L210,25 Z" fill="#ea580c" />
                  <path d="M230,65 C230,75 210,88 195,80 C190,75 195,68 210,68 C215,68 225,62 230,65 Z" fill="#1e293b" />
                  <circle cx="150" cy="108" r="5" fill="#475569" />
                  <circle cx="175" cy="108" r="5" fill="#475569" />
                </g>
                <g transform="translate(560, -5)">
                  <rect x="50" y="55" width="40" height="60" fill="#475569" />
                  <rect x="95" y="30" width="50" height="85" fill="#334155" />
                  <rect x="150" y="45" width="45" height="70" fill="#1e293b" />
                  <rect x="200" y="65" width="35" height="50" fill="#475569" />
                  <rect x="105" y="40" width="8" height="10" fill="#cbd5e1" />
                  <rect x="120" y="40" width="8" height="10" fill="#cbd5e1" />
                  <rect x="135" y="40" width="8" height="10" fill="#cbd5e1" />
                  <rect x="105" y="60" width="8" height="10" fill="#cbd5e1" />
                  <rect x="120" y="60" width="8" height="10" fill="#cbd5e1" />
                  <rect x="135" y="60" width="8" height="10" fill="#cbd5e1" />
                  <rect x="105" y="80" width="8" height="10" fill="#cbd5e1" />
                  <circle cx="150" cy="108" r="5" fill="#475569" />
                  <line x1="185" y1="115" x2="185" y2="10" stroke="#0f172a" stroke-width="4" />
                  <line x1="100" y1="20" x2="250" y2="20" stroke="#0f172a" stroke-width="3" />
                  <line x1="250" y1="20" x2="185" y2="10" stroke="#ea580c" stroke-width="1.5" />
                  <line x1="100" y1="20" x2="185" y2="10" stroke="#ea580c" stroke-width="1.5" />
                  <line x1="185" y1="10" x2="185" y2="20" stroke="#ea580c" stroke-width="3" />
                  <line x1="230" y1="20" x2="230" y2="55" stroke="#334155" stroke-width="1.5" />
                  <path d="M227,55 C227,59 233,59 233,55" stroke="#1e293b" stroke-width="2" fill="none" />
                  <rect x="120" y="15" width="20" height="10" fill="#ea580c" />
                </g>
                <path d="M10,114 L990,114" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />
                <path d="M40,117 L960,117" stroke="#ea580c" stroke-width="3" stroke-linecap="round" />
                <text x="500" y="178" text-anchor="middle" fill="#0c1d3a" font-size="72" font-weight="900" font-style="oblique" font-family="system-ui, -apple-system, sans-serif" letter-spacing="4">WARA WARA</text>
                <text x="500" y="218" text-anchor="middle" fill="#ea580c" font-size="24" font-weight="800" font-family="system-ui, -apple-system, sans-serif" letter-spacing="6">CONSTRUCTION & SERVICES</text>
              </svg>
              <h2 style="font-size: 13.5px; margin: 4px 0 6px 0; color: #1d4ed8; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 800;">
                Construction & Supply of Building Material & Electricals
              </h2>
              <p style="font-size: 11.5px; font-weight: 700; color: #334155; margin: 0 0 4px 0;">
                8 Shekie Bockarie Street - Kabala, Koinadugu, Sierra Leone
              </p>
              <p style="font-size: 11px; font-weight: bold; color: #475569; margin: 0 0 4px 0;">
                Mobile: 076-667575 / 077-263939 • Email: wararaconstructionkoinadugu@gmail.com
              </p>
              <p style="font-size: 10px; font-style: italic; color: #64748b; margin: 0; font-family: system-ui;">
                Joint-Venture partner of Watasai Stone Investment • Official Store Sales Report & Financial Ledger Audit
              </p>
            </header>

            <table class="meta-table">
              <tr>
                <td class="label">REPORT PERIOD:</td>
                <td><strong>${formattedPeriod}</strong></td>
                <td class="label">GENERATION DATE:</td>
                <td>${new Date().toLocaleString("en-GB")}</td>
              </tr>
              <tr>
                <td class="label">TOTAL SALES ISSUED:</td>
                <td><strong>${totalTransactions} transactions</strong></td>
                <td class="label">GROSS TURNOVER:</td>
                <td class="total-highlight">SLe ${grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td class="label">TOTAL EXPENDITURES:</td>
                <td class="total-highlight" style="color: #dc2626;">SLe ${grossExpenditures.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td class="label">NET OPERATING BALANCE:</td>
                <td class="total-highlight" style="color: #16a34a; font-size: 14px;"><strong>SLe ${netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></td>
              </tr>
              <tr>
                <td class="label">BANKED DEPOSITS:</td>
                <td class="total-highlight" style="color: #2563eb;">SLe ${periodDeposits?.reduce((sum, d) => sum + d.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td class="label">PRINTED BY:</td>
                <td><strong>${currentUser?.name || "System Ledger"}</strong></td>
              </tr>
            </table>

            <div class="section-heading">collected funds break-down by instrument type</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Collected Account Block</th>
                  <th style="text-align: right; width: 35%;">Value volume</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>💵 CASH SALES</td>
                  <td style="text-align: right; font-weight: bold; font-family: monospace; font-size: 12px;">SLe ${cashTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td>🏦 BANK CHEQUES</td>
                  <td style="text-align: right; font-weight: bold; font-family: monospace; font-size: 12px;">SLe ${chequeTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td>📱 MOBILE PORTAL TRANSFERS (MoMo)</td>
                  <td style="text-align: right; font-weight: bold; font-family: monospace; font-size: 12px;">SLe ${momoTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>

            <div class="section-heading">Expenditures Recorded (Deductions from sales)</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Expenditure Reference</th>
                  <th>Category</th>
                  <th>Description / Reason</th>
                  <th>Recorded By</th>
                  <th style="text-align: right; width: 25%;">Amount Spent</th>
                </tr>
              </thead>
              <tbody>
                ${periodExpenditures.length === 0 ? `
                  <tr>
                    <td colspan="5" style="text-align: center; color: #64748b; font-style: italic;">No expenditures registered for this timeline.</td>
                  </tr>
                ` : periodExpenditures.map(e => `
                  <tr>
                    <td><strong>${e.id}</strong></td>
                    <td style="text-transform: capitalize;">${e.category}</td>
                    <td>${e.description}</td>
                    <td>${e.recorded_by}</td>
                    <td style="text-align: right; font-family: monospace; font-weight: bold; color: #dc2626;">SLe ${e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>

            <div class="section-heading">Detailed Material SKU Consumption Statistics</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Material SKU Name</th>
                  <th style="text-align: center; width: 25%;">Quantity Dispatched</th>
                  <th style="text-align: right; width: 30%;">Turnover Weight</th>
                </tr>
              </thead>
              <tbody>
                ${Object.keys(itemsMap).length === 0 ? `
                  <tr>
                    <td colspan="3" style="text-align: center; color: #64748b; font-style: italic;">No active material throughput listed for this specific timeline.</td>
                  </tr>
                ` : Object.keys(itemsMap).map(name => `
                  <tr>
                    <td><strong>${name}</strong></td>
                    <td style="text-align: center; font-weight: bold; font-size: 12px;">${itemsMap[name].qty}</td>
                    <td style="text-align: right; font-family: monospace; font-size: 12px;">SLe ${itemsMap[name].revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>

            <div class="section-heading">Master Chronology Audit Trail / Ledger Journals</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Invoice Serial</th>
                  <th>Recording Date & Time</th>
                  <th>Customer Client Reference</th>
                  <th>Clearing Operator</th>
                  <th style="text-align: right;">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                ${periodSales.length === 0 ? `
                  <tr>
                    <td colspan="5" style="text-align: center; color: #64748b; font-style: italic;">No ledger rows found match selection search constraints.</td>
                  </tr>
                ` : periodSales.map(s => `
                  <tr>
                    <td style="font-family: monospace; font-weight: bold; color: #1e3a8a;">#${s.sale_id.slice(-8).toUpperCase()}</td>
                    <td>${formatDate(s.timestamp)} ${formatTime(s.timestamp)}</td>
                    <td style="text-transform: capitalize;">${s.customer_name || "Walk-In Customer"}</td>
                    <td>${s.staff_id}</td>
                    <td style="text-align: right; font-family: monospace; font-weight: bold;">SLe ${s.total_amount.toFixed(0)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>

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
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return "N/A";
    if (dateValue && typeof dateValue === "object" && "seconds" in dateValue) {
      return new Date(dateValue.seconds * 1000).toLocaleDateString("en-GB");
    }
    return new Date(dateValue).toLocaleDateString("en-GB");
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

  // Submit handlers
  const handleAddExpenditure = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpError("");
    setExpSuccess("");

    const amt = parseFloat(expAmount);
    if (!expDescription.trim()) {
      setExpError("Please describe what the expenditure was used for.");
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setExpError("Please specify a valid expenditure amount greater than SLe 0.");
      return;
    }
    if (!expAuthorizedBy.trim()) {
      setExpError("Please specify who authorized this expenditure.");
      return;
    }

    try {
      await executeAddExpenditure(expDescription.trim(), amt, expCategory, expAuthorizedBy.trim());
      setExpSuccess("Expenditure logged successfully!");
      setExpDescription("");
      setExpAmount("");
      setExpCategory("General");
      setExpAuthorizedBy("");
      setTimeout(() => setExpSuccess(""), 3000);
    } catch (err: any) {
      setExpError(err.message || "Failed to save expenditure coordinate.");
    }
  };

  const handleAddDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepError("");
    setDepSuccess("");

    const amt = parseFloat(depAmount);
    if (isNaN(amt) || amt <= 0) {
      setDepError("Please enter a valid deposit amount.");
      return;
    }
    if (!depBankName.trim()) {
      setDepError("Please enter the name of the clearing bank.");
      return;
    }
    if (!depDepositedBy.trim()) {
      setDepError("Please write the name of the staff who carried out the deposit.");
      return;
    }

    try {
      await executeAddBankDeposit(amt, depBankName.trim(), depDepositedBy.trim(), depSlipSerial.trim());
      setDepSuccess("Bank deposit transaction recorded safely!");
      setDepAmount("");
      setDepBankName("");
      setDepDepositedBy("");
      setDepSlipSerial("");
      setTimeout(() => setDepSuccess(""), 3000);
    } catch (err: any) {
      setDepError(err.message || "Failed to post bank deposit.");
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full flex-grow">
      
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-505 text-indigo-500" />
            Accounting & Sales Ledger
          </h2>
          <p className="text-xs text-slate-500">Unmodifiable historic log of all operations, expenditures, and treasury deposits</p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-mono">
          <Lock className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
          <span>LEDGER SECURED</span>
        </div>
      </div>

      {/* Sub-NavigationBar Pills */}
      <div className="flex border-b border-slate-200 mb-5 gap-1 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveSubTab("sales")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all border whitespace-nowrap cursor-pointer ${
            activeSubTab === "sales"
              ? "bg-slate-900 border-slate-900 text-white shadow-xs"
              : "bg-transparent border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Sales records</span>
        </button>
        <button
          onClick={() => setActiveSubTab("expenditures")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all border whitespace-nowrap cursor-pointer ${
            activeSubTab === "expenditures"
              ? "bg-slate-900 border-slate-900 text-white shadow-xs"
              : "bg-transparent border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <TrendingDown className="h-4 w-4 text-rose-500" />
          <span>Expenditure Ledger ({expenditures.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab("deposits")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all border whitespace-nowrap cursor-pointer ${
            activeSubTab === "deposits"
              ? "bg-slate-900 border-slate-900 text-white shadow-xs"
              : "bg-transparent border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Coins className="h-4 w-4 text-emerald-500 animate-bounce" />
          <span>Bank Deposits & Vault Cash</span>
        </button>
      </div>

      {/* Automated Store Reporting Utilities Header Banner */}
      <div className="bg-slate-50/75 p-4 rounded-xl border border-slate-150 mb-5 space-y-4">
        
        {/* Statistics highlights widget dynamically updating based on date selected */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="bg-white p-3 rounded-lg border border-slate-150 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Gross revenue turnover</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-slate-800 font-mono">
                SLe {totalPeriodSalesAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">({selectedPeriodSales.length} checked sales)</span>
            </div>
            <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">For current selected view constraints</span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-150 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider text-rose-550 flex items-center gap-1">
              <span>📉</span> Less: Total expenditures
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-rose-600 font-mono">
                SLe {totalPeriodExpendituresAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">({selectedPeriodExpenditures.length} log claims)</span>
            </div>
            <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">Used on site of operations</span>
          </div>

          <div className="bg-[#f0fdf4] p-3 rounded-lg border border-emerald-100 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-emerald-600 block tracking-wider">Final balance (net)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-emerald-700 font-mono">
                SLe {totalPeriodNetBalance.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </span>
            </div>
            <span className="text-[9px] text-emerald-600 font-sans mt-0.5 block font-bold">Deducted net income for period</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-200 pt-3">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-tight flex items-center gap-1.5">
            📋 Periodical Store Report Processor
          </span>
          <div className="flex gap-1 bg-slate-200 p-0.5 rounded-lg select-none">
            <button
              type="button"
              onClick={() => setReportType("daily")}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${
                reportType === "daily" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-805"
              }`}
            >
              Daily Report
            </button>
            <button
              type="button"
              onClick={() => setReportType("period")}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${
                reportType === "period" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-805"
              }`}
            >
              Custom Period Range
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-end gap-3 text-xs">
          {reportType === "daily" ? (
            <div className="flex-grow space-y-1 w-full">
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-tight">Selected Operating Date</label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-semibold"
              />
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-1 w-full">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-tight">Start Date</label>
                <input
                  type="date"
                  value={reportStart}
                  onChange={(e) => setReportStart(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-semibold"
                />
              </div>
              <div className="flex-1 space-y-1 w-full">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-tight">End Date</label>
                <input
                  type="date"
                  value={reportEnd}
                  onChange={(e) => setReportEnd(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-semibold"
                />
              </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
            {isAdmin && (
              <button
                type="button"
                onClick={() => exportSalesLedgerToExcel(selectedPeriodSales)}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-700 hover:bg-emerald-800 border border-emerald-600 text-white font-bold rounded-lg transition shadow-sm cursor-pointer whitespace-nowrap text-xs flex items-center justify-center gap-1.5"
                title="Export selected period data to Excel Spreadsheet"
              >
                <span>📗</span> Export Report (Excel)
              </button>
            )}
            <button
              type="button"
              onClick={handlePrintStoreReport}
              className="w-full sm:w-auto px-4 py-2 bg-[#0f172a] hover:bg-slate-800 text-white font-bold rounded-lg transition shadow-sm cursor-pointer whitespace-nowrap text-xs flex items-center justify-center gap-1.5"
            >
              <span>🖨️</span> Compile & Print Report
            </button>
          </div>
        </div>
      </div>

      {/* RENDER ACTIVE SUBTAB CONTENT */}
      
      {/* 1. SALES RECORDS SUB-TAB */}
      {activeSubTab === "sales" && (
        <div className="flex flex-col flex-grow space-y-3">
          {/* Quick Search */}
          <div>
            <input
              type="text"
              placeholder="Filter sales records by invoice reference, operator ID, payment mode or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                      <span className="text-[10px] bg-slate-200 text-slate-705 font-mono font-bold px-1.5 py-0.5 rounded">
                        INV#{s.sale_id.slice(-6).toUpperCase()}
                      </span>
                      <span className={`text-[10px] font-bold uppercase border px-2 py-0.5 rounded-full ${getMethodBadge(s.payment_method)}`}>
                        {s.payment_method.replace("_", " ")}
                      </span>
                      {s.reference_details && (
                        <span className="text-[10px] text-slate-400 font-mono italic">
                          ({s.reference_details})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3.5 text-[11px] text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        Operator: <strong className="text-slate-600 font-medium">{s.staff_id}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-slate-400">👤 Client:</span> <strong className="text-slate-600 font-medium">{s.customer_name || "Walk-In"}</strong>
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {formatDate(s.timestamp)} • {formatTime(s.timestamp)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-slate-400 uppercase block">invoice amount</span>
                      <strong className="text-sm font-extrabold text-slate-800 font-mono">
                        SLe {s.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setActiveSale(s)}
                        className="bg-white border border-slate-200 hover:border-indigo-300 text-slate-500 hover:text-indigo-600 p-2 rounded-lg transition-colors cursor-pointer"
                        title="Review transaction breakdown details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {currentUser?.username?.toLowerCase() === "nabieu" && (
                        <>
                          <button
                            onClick={() => {
                              setEditingSale(s);
                              setEditCustomerName(s.customer_name || "");
                              setEditTotalAmount(s.total_amount);
                              setEditPaymentMethod(s.payment_method);
                              setEditReferenceDetails(s.reference_details || "");
                            }}
                            className="bg-amber-50 hover:bg-amber-100 border border-amber-200 hover:border-amber-300 text-amber-600 p-2 rounded-lg transition hover:text-amber-800 cursor-pointer"
                            title="Edit this sale transaction"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          <button
                            onClick={async () => {
                              const confirmDelete = window.confirm(`⚠️ Permanently delete completed transaction INV#${s.sale_id.slice(-6).toUpperCase()}? This is irreversible!`);
                              if (!confirmDelete) return;
                              try {
                                await adminDeleteSale(s.sale_id);
                              } catch (err: any) {
                                alert(err.message || "Failed to delete transaction.");
                              }
                            }}
                            className="bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-500 p-2 rounded-lg transition hover:text-red-700 cursor-pointer"
                            title="Delete this sale transaction permanently"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredSales.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <BookOpen className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold">Ledger entries not found matching query</p>
                <p className="text-[11px] text-slate-400">Recorded checkout invoice rows will populate this index</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. EXPENDITURES SECURED LOG SUB-TAB */}
      {activeSubTab === "expenditures" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-grow">
          
          {/* Expenditure registration form */}
          <div className="lg:col-span-1 bg-slate-50 p-4 rounded-xl border border-slate-200 h-fit space-y-4">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Plus className="h-4 w-4 text-rose-500" />
              Log New expenditure
            </h3>
            <p className="text-[11px] text-slate-500">Add an office, fuel, generator, salary, transport, or miscellaneous expense on site of operations.</p>
            
            <form onSubmit={handleAddExpenditure} className="space-y-3.5 text-xs">
              
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">Cost Category</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                >
                  <option value="General">General Operations</option>
                  <option value="Fuel">Fuel (Vehicle & Generators)</option>
                  <option value="Transportation">Transportation & Haulage</option>
                  <option value="Labor">Wages & Labor</option>
                  <option value="Maintenance">Site Maintenance & Reps</option>
                  <option value="Supplies">WWS Office Supplies</option>
                  <option value="Taxes">Taxes & Clearance Fees</option>
                  <option value="Other">Other Miscellaneous</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">Expense Amount (SLe)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 1500"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold text-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">Description / Purpose</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter explicit reason (e.g. Purchased 45 Litres Diesel for Kabala crusher generator)"
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">Authorised By (With whose authorisation)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Admin Nabieu, Manager Kamara..."
                  value={expAuthorizedBy}
                  onChange={(e) => setExpAuthorizedBy(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                />
              </div>

              {expError && (
                <div className="text-[11px] font-bold text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                  ⚠️ {expError}
                </div>
              )}

              {expSuccess && (
                <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {expSuccess}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#0f172a] hover:bg-slate-850 text-white font-bold py-2 rounded-lg transition-colors cursor-pointer text-xs"
              >
                Log Approved Expenditure
              </button>
            </form>
          </div>

          {/* Historical Logs List */}
          <div className="lg:col-span-2 space-y-3 flex flex-col">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-tight">Registered physical Expenditures logs</h3>
            
            <div className="space-y-2.5 overflow-y-auto max-h-[460px] flex-grow pr-1">
              {expenditures.map((e) => (
                <div
                  key={e.id}
                  className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-800"
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-rose-100 border border-rose-200 text-rose-800 font-mono font-bold px-1.5 py-0.5 rounded">
                        {e.id}
                      </span>
                      <span className="text-[10px] bg-slate-100 border text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                        Category: {e.category}
                      </span>
                    </div>
                    <p className="text-slate-700 font-medium text-[11.5px]">{e.description}</p>
                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[10px] text-slate-450 pt-0.5">
                      <span>Operator: <strong className="text-slate-600">{e.recorded_by}</strong></span>
                      {e.authorized_by && (
                        <span>Authorized By: <strong className="text-indigo-600 font-semibold">{e.authorized_by}</strong></span>
                      )}
                      <span className="font-mono">{formatDate(e.timestamp)} • {formatTime(e.timestamp)}</span>
                    </div>
                  </div>

                  <div className="font-mono text-right shrink-0">
                    <span className="text-[9px] text-rose-500 uppercase block font-semibold">Deducted cost</span>
                    <strong className="text-sm font-black text-rose-600">
                      - SLe {e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              ))}

              {expenditures.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <TrendingDown className="h-8 w-8 text-rose-300 mb-2" />
                  <p className="text-xs font-semibold">No Expenditures recorded yet</p>
                  <p className="text-[11px] text-slate-400">All registered material/logistics expenses will represent on-site ledger deductions here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. BANK DEPOSITS & CO-HAND ACCUMULATOR SUB-TAB */}
      {activeSubTab === "deposits" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-grow">
          
          {/* Active Vault Accumulator Status and Math Dashboard */}
          <div className="lg:col-span-1 space-y-4">
            
            <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white p-5 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
              <div className="absolute top-2 right-2 opacity-15">
                <LockKeyhole className="h-28 w-28 text-slate-50" />
              </div>
              
              <span className="text-[10px] font-mono tracking-widest text-indigo-300 uppercase font-extrabold block">WWS safe vault status</span>
              <h2 className="text-2xl font-black font-mono tracking-tight mt-1 text-emerald-400">
                SLe {runningVaultAccumulator.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h2>
              <span className="text-[10.5px] text-indigo-200 font-medium block mt-1.5 leading-snug">
                ⚖️ <strong>Live Sales Accumulator Balance</strong> waiting inside the physical safe on-site until cleared & Deposited.
              </span>

              <div className="border-t border-slate-800 mt-4 pt-3.5 space-y-2 text-[10.5px] font-mono text-slate-350">
                <div className="flex justify-between">
                  <span>Gross Sales Turn:</span>
                  <span className="text-slate-100">+SLe {totalAllTimeSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Less: Expenditures:</span>
                  <span className="text-rose-400">-SLe {totalAllTimeExpenditures.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800/50 pt-1.5">
                  <span>Less: Sent to Bank:</span>
                  <span className="text-blue-300">-SLe {totalAllTimeDeposits.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Record Bank Deposit Form */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <ArrowUpRight className="h-4 w-4 text-indigo-500" />
                Record safe-To-Bank Deposit
              </h4>
              <p className="text-[10.5px] text-slate-500">Record cashier/manager deposits of collected cash to the commercial bank. This reduces the vault accumulator balance.</p>

              <form onSubmit={handleAddDeposit} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Deposit Amount (SLe)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Enter deposited amount"
                    value={depAmount}
                    onChange={(e) => setDepAmount(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold text-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Deposited To (Bank & Account Name)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rokel Bank - Acc #10294"
                      value={depBankName}
                      onChange={(e) => setDepBankName(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Deposited By Who</label>
                    <input
                      type="text"
                      required
                      placeholder="Staff's Name"
                      value={depDepositedBy}
                      onChange={(e) => setDepDepositedBy(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Bank Slip Serial Number / Deposit Slip ID</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter slip serial number (e.g., SL-984210)"
                    value={depSlipSerial}
                    onChange={(e) => setDepSlipSerial(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 font-mono"
                  />
                </div>

                {depError && (
                  <div className="text-[11px] font-bold text-red-601 text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                    ⚠️ {depError}
                  </div>
                )}

                {depSuccess && (
                  <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-100 flex items-center gap-1.5 flex-row">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 animate-spin" />
                    <span>{depSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold py-2 rounded-lg transition-colors cursor-pointer text-xs"
                >
                  Record Banking Deposit
                </button>
              </form>
            </div>
          </div>

          {/* Historical Deposits list */}
          <div className="lg:col-span-2 space-y-3 flex flex-col">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-tight">commercial Bank Deposit chronicle Log</h3>

            <div className="space-y-2.5 overflow-y-auto max-h-[460px] flex-grow pr-1">
              {bankDeposits.map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-800"
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-blue-100 border border-blue-200 text-blue-800 font-mono font-bold px-1.5 py-0.5 rounded">
                        {d.id}
                      </span>
                      <span className="text-[10px] bg-violet-50 border border-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        🏦 Deposited To: {d.bank_name}
                      </span>
                    </div>
                    
                    <p className="text-slate-600 font-medium">
                      Cash carried and deposited to <strong className="text-slate-850">{d.bank_name}</strong> by staff <strong className="text-slate-850 uppercase">{d.deposited_by}</strong>.
                    </p>

                    {d.slip_serial && (
                      <div className="pt-0.5">
                        <span className="text-[10px] text-blue-800 bg-blue-100/70 border border-blue-200/50 rounded-md px-2 py-0.5 inline-flex items-center gap-1 font-medium">
                          <span>📝 Slip Serial:</span>
                          <strong className="font-mono text-blue-900 font-bold">{d.slip_serial}</strong>
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3.5 text-[10px] text-slate-450 pt-0.5">
                      <span>Logged By: <strong className="text-slate-600">{d.recorded_by}</strong></span>
                      <span className="font-mono">{formatDate(d.timestamp)} • {formatTime(d.timestamp)}</span>
                    </div>
                  </div>

                  <div className="font-mono text-right shrink-0">
                    <span className="text-[9px] text-blue-500 uppercase block font-semibold">Banked amount</span>
                    <strong className="text-sm font-black text-blue-600">
                      SLe {d.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              ))}

              {bankDeposits.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Coins className="h-8 w-8 text-blue-200 mb-2" />
                  <p className="text-xs font-semibold">No bank deposits registered yet</p>
                  <p className="text-[11px] text-slate-400">All authenticated cashier deposits will be logged here to secure safe audits</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review details popup modal */}
      {activeSale && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-sm p-5 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Invoice Ticket #{(activeSale.sale_id || "").slice(-8).toUpperCase()}
                </h3>
                <p className="text-[10px] text-slate-405 mt-0.5">
                  Record Date: {formatDate(activeSale.timestamp)} {formatTime(activeSale.timestamp)}
                </p>
              </div>
              <button
                onClick={() => setActiveSale(null)}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Recipient user metadata info */}
            <div className="py-3 space-y-3 font-mono text-xs">
              <div className="bg-slate-50 p-2 rounded border border-slate-100 space-y-1">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Ledger Operators</p>
                <p className="text-slate-705">Staff Key: <strong className="text-slate-800">{activeSale.staff_id}</strong></p>
                <p className="text-slate-705">Method: <strong className="text-slate-800 uppercase">{activeSale.payment_method}</strong></p>
                {activeSale.reference_details && (
                  <p className="text-slate-705">Ref Details: <strong className="text-slate-800">{activeSale.reference_details}</strong></p>
                )}
              </div>

              {/* Items detail list */}
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1 col-span-2">Stock Items List</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {activeSale.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-slate-600 bg-slate-50/50 p-2 rounded border border-slate-100/50">
                      <span>{it.name} <span className="font-bold text-indigo-505 font-sans">x{it.quantity}</span></span>
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
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs py-2 rounded-lg transition cursor-pointer"
            >
              Verify & Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Root Nabieu Overrides Edit Transaction Modal */}
      {editingSale && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-sm p-5 animate-in zoom-in-95 duration-100">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-850 text-sm flex items-center gap-1.5 text-amber-700">
                  <Edit className="h-4 w-4" />
                  Override Trans #{editingSale.sale_id.slice(-8).toUpperCase()}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Root user administrative ledger amendment
                </p>
              </div>
              <button
                onClick={() => setEditingSale(null)}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await adminEditSale(editingSale.sale_id, {
                    customer_name: editCustomerName,
                    total_amount: Number(editTotalAmount),
                    payment_method: editPaymentMethod,
                    reference_details: editReferenceDetails,
                  });
                  setEditingSale(null);
                } catch (err: any) {
                  alert(err.message || "Failed to update ledger invoice.");
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
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Adjust Transaction Amount (SLe)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editTotalAmount}
                  onChange={(e) => setEditTotalAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Adjust Payment Method
                </label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="cash">💵 Cash Payment</option>
                  <option value="cheque">📝 Cheque Payment</option>
                  <option value="mobile_money">📱 Mobile Money Payment</option>
                  <option value="tbc">📦 To-Be-Collected (TBC)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Reference/Slip Details (Optional)
                </label>
                <input
                  type="text"
                  value={editReferenceDetails}
                  onChange={(e) => setEditReferenceDetails(e.target.value)}
                  placeholder="e.g. OrangeMoney ID, Cheque serial..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
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
