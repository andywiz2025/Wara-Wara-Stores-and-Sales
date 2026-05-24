import React, { useState } from "react";
import { useStore } from "../context/StoreContext";
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
  const { products, currentUser, executeImmediateSale, executeTBCRegistration } = useStore();

  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [transactionType, setTransactionType] = useState<"immediate" | "tbc">("immediate");
  
  // Direct Sales fields
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "cheque" | "mobile_money">("cash");
  const [reference, setReference] = useState("");

  // TBC field
  const [customerName, setCustomerName] = useState("");
  const [expiryDays, setExpiryDays] = useState(30);

  // Search in POS catalog
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Quick picker products
  const availablePickers = products.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toLowerCase().includes(searchQuery.toLowerCase()));

  const addToCart = (product: Product) => {
    setErrorMsg("");
    setSuccessMsg("");
    const existing = cart.find((item) => item.product.id === product.id);

    if (existing) {
      // If immediate sale, make sure they don't exceed shelved stock
      if (transactionType === "immediate" && existing.quantity >= product.current_stock) {
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
      if (transactionType === "immediate" && product.current_stock <= 0) {
        setErrorMsg(`${product.name} is entirely out of stock on shelves and cannot be immediately sold.`);
        return;
      }
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, val: number) => {
    setErrorMsg("");
    const matched = cart.find((item) => item.product.id === productId);
    if (!matched) return;

    const nextQty = matched.quantity + val;
    if (nextQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (transactionType === "immediate" && nextQty > matched.product.current_stock) {
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
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setErrorMsg("");
    setSuccessMsg("");
    setReference("");
    setCustomerName("");
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
      if (transactionType === "immediate") {
        // Prepare Immediate Sale Payload
        const itemsPayload: SaleItem[] = cart.map((item) => ({
          product_id: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          unit_cost: item.product.unit_price
        }));

        await executeImmediateSale(itemsPayload, paymentMethod, reference);
        setSuccessMsg("Immediate transactional checkout registered successfully! Inventory updated.");
        setCart([]);
        setReference("");
      } else {
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

        await executeTBCRegistration(customerName, itemsPayload, expiryDays);
        setSuccessMsg(`TBC Registration completed for ${customerName}! Items scheduled for subsequent collection.`);
        setCart([]);
        setCustomerName("");
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

        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => {
              setTransactionType("immediate");
              setCart([]);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
              transactionType === "immediate"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <Receipt className="h-3.5 w-3.5" />
            Immediate Cash Sale
          </button>
          <button
            onClick={() => {
              setTransactionType("tbc");
              setCart([]);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
              transactionType === "tbc"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            TBC Registry Ticket
          </button>
        </div>
      </div>

      {/* Grid structure: Selector left, Cart right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-grow">
        
        {/* Left Side: Materials Catalog Quick Picker */}
        <div className="lg:col-span-7 flex flex-col h-full max-h-[460px]">
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
        <div className="lg:col-span-5 bg-slate-50/70 p-4 rounded-xl border border-slate-100 flex flex-col h-full min-h-[380px]">
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

              {/* Immediate Sale Payment Form */}
              {transactionType === "immediate" ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-3 gap-1.5">
                    {["cash", "cheque", "mobile_money"].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method as any)}
                        className={`py-1.5 text-[10px] font-bold uppercase rounded-lg border transition text-center ${
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
                          : "MoMo Pay Transaction Receipt ID"}
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
              ) : (
                /* TBC Form */
                <div className="space-y-2.5">
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
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
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

              {/* Submit Buttons */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2.5 text-xs font-bold text-white rounded-lg shadow-sm transition-colors ${
                  transactionType === "immediate"
                    ? "bg-slate-800 hover:bg-slate-900"
                    : "bg-indigo-600 hover:bg-indigo-700"
                } disabled:opacity-50`}
              >
                {loading
                  ? "Processing..."
                  : transactionType === "immediate"
                  ? "Finalize Cash Checkout"
                  : "Dispatch TBC Registration"}
              </button>
            </form>
          )}

        </div>

      </div>

    </div>
  );
}
