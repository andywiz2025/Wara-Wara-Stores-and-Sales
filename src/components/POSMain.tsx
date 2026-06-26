import React, { useState } from "react";
import { useStore } from "../context/StoreContext";
import { CompanyLetterhead, COMPANY_SOFTWARE_FOOTER } from "./CompanyHeader";
import { Product, SaleItem, TBCItem } from "../types";
import {
  ShoppingCart,
  Receipt,
  FileText,
  User,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  Briefcase,
  Layers,
  Inbox
} from "lucide-react";

export default function POSMain() {
  const { products, currentUser, executeImmediateSale, executeTBCRegistration, executeCreditRegistration } = useStore();

  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [transactionType, setTransactionType] = useState<"immediate" | "tbc" | "credit">("immediate");
  
  // Direct Sales fields
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "cheque" | "mobile_money">("cash");
  const [reference, setReference] = useState("");
  const [physicalReceiptNo, setPhysicalReceiptNo] = useState("");

  // TBC / Credit fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [expiryDays, setExpiryDays] = useState(30);
  const [dueDateDays, setDueDateDays] = useState(30);

  // Automated Receipt state
  const [printedReceipt, setPrintedReceipt] = useState<any | null>(null);

  // Search in POS catalog
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [mobilePane, setMobilePane] = useState<"catalog" | "cart">("catalog");

  // Quick picker products
  const availablePickers = products.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toLowerCase().includes(searchQuery.toLowerCase()));

  const addToCart = (product: Product) => {
    setErrorMsg("");
    setSuccessMsg("");
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(15);
    }
    const existing = cart.find((item) => item.product.id === product.id);

    if (existing) {
      // If immediate sale or credit, make sure they don't exceed shelved stock
      if ((transactionType === "immediate" || transactionType === "credit") && existing.quantity >= product.current_stock) {
        setErrorMsg(`Only ${product.current_stock} units of ${product.name} are currently shelved on inventory hooks.`);
        return;
      }
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      if ((transactionType === "immediate" || transactionType === "credit") && product.current_stock <= 0) {
        setErrorMsg(`${product.name} is entirely out of stock on shelves and cannot be immediately sold.`);
        return;
      }
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, val: number) => {
    setErrorMsg("");
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }
    const matched = cart.find((item) => item.product.id === productId);
    if (!matched) return;

    const nextQty = matched.quantity + val;
    if (nextQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if ((transactionType === "immediate" || transactionType === "credit") && nextQty > matched.product.current_stock) {
      setErrorMsg(`Insufficient stock on shelves to sell ${nextQty} units of ${matched.product.name}.`);
      return;
    }

    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, quantity: nextQty } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([10, 10]);
    }
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setErrorMsg("");
    setSuccessMsg("");
    setReference("");
    setCustomerName("");
    setCustomerPhone("");
    setAmountPaid(0);
    setPhysicalReceiptNo("");
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.product.unit_price * item.quantity, 0);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const grossTotal = calculateTotal();

      if (transactionType === "immediate") {
        // Prepare Immediate Sale Payload
        const itemsPayload: SaleItem[] = cart.map((item) => ({
          product_id: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          unit_cost: item.product.unit_price
        }));

        const cleanCustName = customerName.trim() || "Walk-In Customer";

        const saleId = await executeImmediateSale(itemsPayload, paymentMethod, reference, cleanCustName, physicalReceiptNo);
        setSuccessMsg(`Immediate transactional checkout registered successfully! Invoice #${saleId.slice(-6).toUpperCase()}`);
        
        // Populate printable receipt
        setPrintedReceipt({
          receipt_id: saleId,
          type: "Cash Sale Invoice",
          customer_name: cleanCustName,
          timestamp: new Date().toISOString(),
          payment_method: paymentMethod,
          reference_details: reference || "N/A (Cash direct)",
          items: itemsPayload,
          total_amount: grossTotal,
          physical_receipt_no: physicalReceiptNo
        });

        setCart([]);
        setReference("");
        setCustomerName("");
        setPhysicalReceiptNo("");
      } else if (transactionType === "tbc") {
        // Prepare TBC Draft
        if (!customerName.trim()) {
          setErrorMsg("Please specify the Client/Customer receiving name for this TBC collection order.");
          setLoading(false);
          return;
        }

        const itemsPayload: TBCItem[] = cart.map((item) => ({
          product_id: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          unit_cost: item.product.unit_price,
          total: item.product.unit_price * item.quantity
        }));

        await executeTBCRegistration(customerName, itemsPayload, expiryDays, physicalReceiptNo);
        setSuccessMsg(`TBC Registration completed for ${customerName}! Items scheduled for subsequent collection.`);
        
        // Populate printable collection ticket
        setPrintedReceipt({
          receipt_id: `TBC-${Math.floor(Math.random() * 900000) + 100000}`,
          type: "Pre-Paid TBC Collection Ticket",
          customer_name: customerName.trim(),
          timestamp: new Date().toISOString(),
          payment_method: "tbc",
          reference_details: `Claimable within ${expiryDays} Days (Expiry: ${new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toLocaleDateString()})`,
          items: itemsPayload.map(i => ({
            product_id: i.product_id,
            name: i.name,
            quantity: i.quantity,
            unit_cost: i.unit_cost
          })),
          total_amount: grossTotal,
          physical_receipt_no: physicalReceiptNo
        });

        setCart([]);
        setCustomerName("");
        setPhysicalReceiptNo("");
      } else {
        // Prepare Credit Sale
        if (!customerName.trim()) {
          setErrorMsg("Please specify the Client/Customer name for this Credit Sale account.");
          setLoading(false);
          return;
        }
        if (!customerPhone.trim()) {
          setErrorMsg("Please specify the Client/Customer phone number for correspondence.");
          setLoading(false);
          return;
        }
        if (amountPaid > grossTotal) {
          setErrorMsg("Initial paid down-payment cannot exceed physical Gross Total Amount.");
          setLoading(false);
          return;
        }

        const itemsPayload: SaleItem[] = cart.map((item) => ({
          product_id: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          unit_cost: item.product.unit_price
        }));

        const creditId = await executeCreditRegistration(
          customerName.trim(),
          customerPhone.trim(),
          itemsPayload,
          amountPaid,
          dueDateDays,
          physicalReceiptNo
        );

        setSuccessMsg(`Credit ledger invoice created for ${customerName}! Ticket ID: ${creditId}`);

        setPrintedReceipt({
          receipt_id: creditId,
          type: "Credit Account Invoice",
          customer_name: customerName.trim(),
          timestamp: new Date().toISOString(),
          payment_method: "credit",
          reference_details: `Customer Phone: ${customerPhone.trim()}. Initial paid: SLe ${amountPaid.toFixed(2)}. Due in ${dueDateDays} Days.`,
          items: itemsPayload,
          total_amount: grossTotal,
          amount_paid: amountPaid,
          remaining_balance: grossTotal - amountPaid,
          is_credit: true,
          physical_receipt_no: physicalReceiptNo
        });

        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setAmountPaid(0);
        setPhysicalReceiptNo("");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to finalize checkout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full flex-grow">
      
      {/* Tab Selector for Transaction Modes */}
      <div className="border-b border-slate-100 pb-4 mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-indigo-500" />
            POS Transactional Register
          </h2>
          <p className="text-xs text-slate-500">Record cash transactions or initiate To-Be-Collected (TBC) dispatches</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 flex-wrap gap-1">
          <button
            type="button"
            onClick={() => {
              setTransactionType("immediate");
              setCart([]);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
              transactionType === "immediate"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-805"
            }`}
          >
            <Receipt className="h-3.5 w-3.5" />
            Cash Sale
          </button>
          <button
            type="button"
            onClick={() => {
              setTransactionType("tbc");
              setCart([]);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
              transactionType === "tbc"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-805"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            TBC Order
          </button>
          <button
            type="button"
            onClick={() => {
              setTransactionType("credit");
              setCart([]);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
              transactionType === "credit"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-805"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            Credit Sale
          </button>
        </div>
      </div>

      {/* Mobile-only Segmented Dual-Pane Bar */}
      <div className="flex lg:hidden bg-slate-100 p-1 rounded-xl border border-slate-200 mb-4 select-none">
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
            setMobilePane("catalog");
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
            mobilePane === "catalog"
              ? "bg-[#0f172a] text-white shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          <span>📦 Available SKUs ({availablePickers.length})</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
            setMobilePane("cart");
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 relative cursor-pointer ${
            mobilePane === "cart"
              ? "bg-[#0f172a] text-white shadow-sm"
              : "text-slate-600 hover:text-slate-805"
          }`}
        >
          <span>🛒 Checkout Basket</span>
          {cart.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[9px] font-extrabold bg-indigo-600 text-white rounded-full leading-none flex items-center justify-center min-w-[16px] h-[16px]">
              {cart.reduce((s, c) => s + c.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Grid structure: Selector left, Cart right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-grow">
        
        {/* Left Side: Materials Catalog Quick Picker */}
        <div className={`lg:col-span-7 flex-col h-full max-h-[460px] ${mobilePane === "catalog" ? "flex" : "hidden lg:flex"}`}>
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search store inventory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto pr-1 flex-grow">
            {availablePickers.map((p) => {
              const isOutOfStock = p.current_stock <= 0;
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`p-3 text-left border rounded-xl transition flex flex-col justify-between h-24 relative hover:shadow-xs group cursor-pointer ${
                    isOutOfStock
                      ? "bg-slate-50 border-slate-100 opacity-60"
                      : "bg-white border-slate-100 hover:border-indigo-200"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[9px] font-mono font-bold text-indigo-600">{p.id}</span>
                      <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded">
                        {p.category}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-700 mt-1 lines-clamp-1 leading-tight group-hover:text-indigo-600">
                      {p.name}
                    </p>
                  </div>

                  <div className="flex justify-between items-end w-full">
                    <span className="text-xs font-black text-slate-800 font-mono">
                      SLe {p.unit_price.toFixed(0)}
                    </span>
                    <span className={`text-[9px] font-mono font-medium ${
                      isOutOfStock ? "text-red-500" : p.current_stock < 30 ? "text-amber-500" : "text-emerald-500"
                    }`}>
                      {isOutOfStock ? "OUT" : `${p.current_stock} available`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Current Transaction Cart */}
        <div className={`lg:col-span-5 bg-slate-50/70 p-4 rounded-xl border border-slate-100 flex-col h-full min-h-[380px] ${mobilePane === "cart" ? "flex" : "hidden lg:flex"}`}>
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 mb-3">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <ShoppingCart className="h-4 w-4 text-indigo-500" />
              Checkout Basket ({cart.length} unique)
            </span>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] text-red-500 hover:text-red-700 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Feedback alerts */}
          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-[11px] rounded-lg font-medium mb-3">
              ⚠️ {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] rounded-lg font-medium mb-3">
              🎉 {successMsg}
            </div>
          )}

          {/* Cart items scrollbox */}
          <div className="flex-grow overflow-y-auto max-h-56 pr-1 space-y-2 mb-3">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="bg-white p-2.5 rounded-lg border border-slate-100 flex items-center justify-between shadow-xs"
              >
                <div className="flex-grow max-w-[60%]">
                  <p className="text-xs font-bold text-slate-850 truncate leading-tight">
                    {item.product.name}
                  </p>
                  <p className="text-[10px] text-indigo-600 font-mono">
                    SLe {item.product.unit_price.toFixed(2)} / unit
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-50 rounded border border-slate-200">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="p-1 text-slate-500 hover:text-indigo-600 transition"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-bold font-mono px-2 text-slate-700">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="p-1 text-slate-500 hover:text-indigo-600 transition"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1.5 bg-slate-50 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="h-32 flex flex-col items-center justify-center text-slate-400">
                <div className="bg-slate-100 p-2.5 rounded-full mb-1">
                  <Inbox className="h-4.5 w-4.5 text-slate-350" />
                </div>
                <p className="text-[11px] font-bold">Transaction cart is empty</p>
                <p className="text-[10px] text-slate-405">Click inventory items on left to stock the receipt</p>
              </div>
            )}
          </div>

          {/* Form Checkout summary and button */}
          {cart.length > 0 && (
            <form onSubmit={handleCheckout} className="border-t border-slate-200/60 pt-3 mt-auto space-y-3">
              {/* Total Summary */}
              <div className="flex justify-between items-end pb-3">
                <span className="text-xs text-slate-500 uppercase">Gross Total Amount</span>
                <span className="text-lg font-black text-slate-800 font-mono">
                  SLe {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {transactionType === "immediate" && (
                <div className="space-y-2.5 animate-in fade-in duration-100">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      Customer / Client Full Name (Recommended)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Alhaji Mohamed Bangura"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-855 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {["cash", "cheque", "mobile_money"].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method as any)}
                        className={`py-1.5 text-[10px] font-bold uppercase rounded-lg border transition text-center cursor-pointer ${
                          paymentMethod === method
                            ? "bg-slate-800 border-slate-800 text-white"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {method.replace("_", " ")}
                      </button>
                    ))}
                  </div>

                  {paymentMethod !== "cash" && (
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">
                        {paymentMethod === "cheque"
                          ? "Bank Cheque Serial Number"
                          : "Mobile Money (Orange & Afrimoney) Reference ID"}
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. SLB-9482 or TXN984920"
                        required
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  )}
                </div>
              )}

              {transactionType === "tbc" && (
                <div className="space-y-2.5 animate-in fade-in duration-100">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                      Client / Customer Billing Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Alhaji Mohamed Bangura"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-0.5">
                      <label className="text-[10px] font-medium text-slate-500">
                        Default Collection Validity Era
                      </label>
                      <span className="text-[10px] text-indigo-600 font-mono font-bold">
                        {expiryDays} calendar days
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="90"
                      value={expiryDays}
                      onChange={(e) => setExpiryDays(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                </div>
              )}

              {transactionType === "credit" && (
                <div className="space-y-2.5 animate-in fade-in duration-100">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                      Debtor Customer / Client Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Alhaji Mohamed Bangura"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-850"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                      Customer Phone Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +232 77 123456"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                        Down-payment (SLe)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={calculateTotal()}
                        value={amountPaid || ""}
                        onChange={(e) => setAmountPaid(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold text-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                        Remaining Debt
                      </label>
                      <div className="w-full px-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-red-500 select-none">
                        SLe {Math.max(0, calculateTotal() - amountPaid).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-0.5">
                      <label className="text-[10px] font-medium text-slate-500">
                        Due Date Period (Days)
                      </label>
                      <span className="text-[10px] text-indigo-600 font-mono font-bold">
                        {dueDateDays} days limit
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="180"
                      value={dueDateDays}
                      onChange={(e) => setDueDateDays(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                </div>
              )}

              {/* Physical receipt book cross-reference entry */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <label className="block text-[10px] font-bold text-slate-600 mb-1 flex justify-between items-center">
                  <span>📖 PHYSICAL RECEIPT BOOK NO. <span className="text-slate-400 font-normal">(Optional)</span></span>
                  <span className="text-[9px] bg-slate-200/80 text-slate-700 px-1 py-0.5 rounded font-mono font-medium">Cross-Ref</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. BOOK-12 / RCPT-098"
                  value={physicalReceiptNo}
                  onChange={(e) => setPhysicalReceiptNo(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800 font-semibold"
                />
              </div>

              {/* Submit Buttons */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2.5 text-xs font-bold text-white rounded-lg shadow-sm transition-colors ${
                  transactionType === "immediate"
                    ? "bg-slate-800 hover:bg-slate-900"
                    : transactionType === "tbc"
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-red-600 hover:bg-red-700"
                } disabled:opacity-50 cursor-pointer`}
              >
                {loading
                  ? "Processing..."
                  : transactionType === "immediate"
                  ? "Finalize Cash Checkout"
                  : transactionType === "tbc"
                  ? "Dispatch TBC Registration"
                  : "Log Debtor Credit Registry"}
              </button>
            </form>
          )}

        </div>

      </div>

      {/* Printable Receipt Modal */}
      {printedReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto print:p-0 print:bg-white animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 animate-in zoom-in-95 duration-150 print:shadow-none print:border-none print:p-0">
            
            {/* Print Header controls (Hidden during print) */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4 print:hidden">
              <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <span className="text-emerald-500 font-bold">●</span> POS Ticket Generator
              </span>
              <button
                onClick={() => setPrintedReceipt(null)}
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
                  <p className="font-bold text-slate-900 uppercase">{printedReceipt.type}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-sans block text-[10px] tracking-tight">INVOICE SERIAL</span>
                  <p className="font-extrabold text-indigo-700 font-mono tracking-wider">
                    #{printedReceipt.receipt_id.slice(-8).toUpperCase()}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-sans block text-[10px] tracking-tight">DATE & LIVE TIME</span>
                  <p className="font-semibold text-slate-900">
                    {new Date(printedReceipt.timestamp).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-sans block text-[10px] tracking-tight">CUSTOMER NAME</span>
                  <p className="font-bold text-slate-900 capitalize">
                    {printedReceipt.customer_name}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-sans block text-[10px] tracking-tight font-semibold">PAYMENT METHOD</span>
                  <p className="font-semibold text-slate-900 uppercase">
                    {printedReceipt.payment_method.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-sans block text-[10px] tracking-tight">PAYMENT REF / DATA</span>
                  <p className="font-semibold text-slate-800 break-all font-mono">
                    {printedReceipt.reference_details}
                  </p>
                </div>
                {printedReceipt.physical_receipt_no && (
                  <div>
                    <span className="text-slate-400 font-sans block text-[10px] tracking-tight">PHYSICAL BOOK RCPT</span>
                    <p className="font-extrabold text-emerald-700 dark:text-emerald-600 font-mono tracking-wide">
                      {printedReceipt.physical_receipt_no}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-b border-dashed border-slate-300"></div>

              {/* Line items table */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-12 gap-1 text-[10px] text-slate-400 font-bold uppercase pb-1 border-b border-slate-150">
                  <span className="col-span-6">Material Description</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Rate</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>
                
                {printedReceipt.items.map((item: any, idx: number) => (
                  <div key={idx} className="border-b border-slate-100 last:border-0 py-1">
                    <div className="grid grid-cols-12 gap-1 text-[11px]">
                      <span className="col-span-6 truncate font-sans text-slate-700 font-medium">
                        {item.name}
                      </span>
                      <span className="col-span-2 text-center font-bold">
                        {item.quantity}
                      </span>
                      <span className="col-span-2 text-right text-slate-500 font-mono">
                        SLe {item.unit_cost.toFixed(0)}
                      </span>
                      <span className="col-span-2 text-right font-black font-mono">
                        SLe {(item.quantity * item.unit_cost).toFixed(0)}
                      </span>
                    </div>
                    {printedReceipt.payment_method === "tbc" && (
                      <div className="text-[10px] text-amber-600 font-bold tracking-tight pl-1.5 flex items-center gap-1 mt-0.5">
                        <span>📦</span> Outstanding Stock to Collect: {item.quantity} units (0% collected)
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-b border-dashed border-slate-300"></div>

              {/* Total Summary block */}
              <div className="flex justify-between items-center py-1">
                <span className="text-[11px] font-bold uppercase text-slate-600 font-sans">
                  Gross Total Amount
                </span>
                <span className="text-sm font-black text-slate-900 font-mono">
                  SLe {printedReceipt.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {printedReceipt.is_credit && (
                <>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[11px] font-bold uppercase text-slate-600 font-sans">
                      Down-payment Paid Today
                    </span>
                    <span className="text-xs font-extrabold text-emerald-600 font-mono">
                      SLe {printedReceipt.amount_paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[11px] font-bold uppercase text-slate-600 font-sans">
                      Outstanding Debit Balance
                    </span>
                    <span className="text-xs font-extrabold text-red-500 font-mono">
                      SLe {printedReceipt.remaining_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}

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
                onClick={() => setPrintedReceipt(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-xl transition cursor-pointer text-center"
              >
                Close Receipt
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!printedReceipt) return;
                  const receiptElement = document.getElementById("wara-wara-invoice-ticket");
                  if (!receiptElement) return;

                  // Create temporary print container
                  const chamber = document.createElement("div");
                  chamber.id = "thermal-print-chamber";
                  chamber.className = receiptElement.className;
                  chamber.innerHTML = receiptElement.innerHTML;
                  document.body.appendChild(chamber);

                  // Delay print dialog to allow browser to completely reflow and paint the new node in the DOM render tree
                  setTimeout(() => {
                    window.print();
                    document.body.removeChild(chamber);
                  }, 300);
                }}
                className="flex-1 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-extrabold py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <span>🖨️</span> Print Official Receipt
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
