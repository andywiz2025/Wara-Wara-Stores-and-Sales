import React, { useState } from "react";
import { useStore } from "../context/StoreContext";
import { Product } from "../types";
import {
  Package,
  TrendingDown,
  PlusCircle,
  Edit,
  Search,
  Check,
  AlertTriangle,
  FolderOpen
} from "lucide-react";

export default function ProductCatalog() {
  const { products, currentUser, executeUpdateStock, executeUpdatePrice, executeSeedData, seedingRequired } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Selection for action modals
  const [activeStockProduct, setActiveStockProduct] = useState<Product | null>(null);
  const [additionalStockQty, setAdditionalStockQty] = useState("");
  
  const [activePriceProduct, setActivePriceProduct] = useState<Product | null>(null);
  const [newUnitPrice, setNewUnitPrice] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  const categories = ["All", "Tools", "Plumbing", "Electrical", "Hardware", "Building Materials"];

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === "All" || p.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCat;
  });

  const handleStockIncrease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStockProduct || !additionalStockQty) return;
    const qty = parseInt(additionalStockQty);
    if (isNaN(qty) || qty <= 0) {
      setErrorText("Stock offloading quantity must be a positive integer.");
      return;
    }

    setLoading(true);
    setErrorText("");
    setSuccessText("");
    try {
      await executeUpdateStock(activeStockProduct.id, qty);
      setSuccessText(`Successfully added ${qty} units of stock to ${activeStockProduct.name}`);
      setAdditionalStockQty("");
      setActiveStockProduct(null);
    } catch (err: any) {
      setErrorText(err.message || "Failed to update stock.");
    } finally {
      setLoading(false);
    }
  };

  const handlePriceUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePriceProduct || !newUnitPrice) return;
    const price = parseFloat(newUnitPrice);
    if (isNaN(price) || price <= 0) {
      setErrorText("Pricing policy must represent a positive currency value.");
      return;
    }

    setLoading(true);
    setErrorText("");
    setSuccessText("");
    try {
      await executeUpdatePrice(activePriceProduct.id, price);
      setSuccessText(`Successfully updated unit price of ${activePriceProduct.name} to SLe ${price.toFixed(2)}`);
      setNewUnitPrice("");
      setActivePriceProduct(null);
    } catch (err: any) {
      setErrorText(err.message || "Unauthorized: Only administrators are permitted to adjust unit prices.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full flex-grow">
      
      {/* Catalog Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-slate-100 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="h-5 w-5 text-indigo-500" />
            Inventory Stock & Price List
          </h2>
          <p className="text-xs text-slate-500">View real-time stock levels and manage store pricing policies</p>
        </div>

        {seedingRequired && (
          <button
            onClick={executeSeedData}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            🔌 Seed Default Inventory Products
          </button>
        )}
      </div>

      {/* Alerts Logs */}
      {(errorText || successText) && (
        <div className="mt-4">
          {errorText && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
              ⚠️ {errorText}
            </div>
          )}
          {successText && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg font-medium">
              ✅ {successText}
            </div>
          )}
        </div>
      )}

      {/* Searching filters and search bars */}
      <div className="flex flex-col md:flex-row items-center gap-3 my-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SKU or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Categories Scroller */}
        <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? "bg-slate-800 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto max-h-[500px] pr-2 flex-grow">
        {filteredProducts.map((p) => {
          const isLowStock = p.current_stock < 40;
          const isOutOfStock = p.current_stock <= 0;

          return (
            <div
              key={p.id}
              className={`p-4 rounded-xl border transition ${
                isOutOfStock
                  ? "bg-red-50/40 border-red-200 shadow-sm"
                  : isLowStock
                  ? "bg-amber-50/40 border-amber-200 shadow-sm"
                  : "bg-white border-slate-100 hover:border-indigo-100 shadow-sm"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                    {p.id}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 italic ml-2">
                    {p.category}
                  </span>
                </div>

                {isOutOfStock ? (
                  <span className="text-[9px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="h-2.5 w-2.5" /> OUT
                  </span>
                ) : isLowStock ? (
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <TrendingDown className="h-2.5 w-2.5 animate-bounce" /> LOW STOCK
                  </span>
                ) : null}
              </div>

              <h4 className="text-sm font-semibold text-slate-800 mt-2 truncate">
                {p.name}
              </h4>

              {/* Price Tag & Stock Count */}
              <div className="flex items-end justify-between mt-4">
                <div>
                  <p className="text-[10px] text-slate-400 capitalize">unit list price</p>
                  <p className="text-base font-bold text-slate-800 font-mono">
                    SLe {p.unit_price.toFixed(2)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] text-slate-400">shelved stock</p>
                  <p className={`text-sm font-semibold font-mono ${
                    isOutOfStock ? "text-red-650" : isLowStock ? "text-amber-600" : "text-slate-600"
                  }`}>
                    {p.current_stock.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono italic">
                    {p.total_offloaded.toLocaleString()} cumulative
                  </p>
                </div>
              </div>

              {/* Action Buttons for specific contexts */}
              <div className="flex gap-1.5 mt-4 pt-3 border-t border-slate-100/80">
                
                {/* Offload Stock - accessible to Admin & Authorized staff */}
                <button
                  onClick={() => {
                    setActiveStockProduct(p);
                    setErrorText("");
                    setSuccessText("");
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-[11px] font-medium py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Offload Stock
                </button>

                {/* Adjust Price - Admin Only trigger */}
                <button
                  onClick={() => {
                    setActivePriceProduct(p);
                    setErrorText("");
                    setSuccessText("");
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border transition ${
                    currentUser?.role === "admin"
                      ? "border-slate-200 hover:border-indigo-200 text-slate-500 hover:text-indigo-600 cursor-pointer"
                      : "border-slate-100 bg-slate-50 text-slate-300 opacity-60 cursor-not-allowed"
                  }`}
                  disabled={currentUser?.role !== "admin"}
                  title={currentUser?.role === "admin" ? "Adjust Pricing Policy" : "Admins only"}
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>

              </div>
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <FolderOpen className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-xs font-semibold">No materials match search constraints</p>
            <p className="text-[11px] text-slate-400">Expand categories or modify typing keywords</p>
          </div>
        )}
      </div>

      {/* Stock Offloading Modal */}
      {activeStockProduct && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-sm p-5 animate-in fade-in zoom-in-95 duration-100">
            <h3 className="font-bold text-slate-800 text-sm">
              Offload Consignment ({activeStockProduct.id})
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Add offloaded inventory stock received for <strong>{activeStockProduct.name}</strong>.
            </p>

            <form onSubmit={handleStockIncrease} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Current Stock Levels
                </label>
                <input
                  type="text"
                  disabled
                  value={`${activeStockProduct.current_stock} currently shelved`}
                  className="w-full px-3 py-1.5 text-xs bg-slate-100 text-slate-500 rounded-lg border border-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Consignment Offload Qty Pieces/Rolls/Cartoon
                </label>
                <input
                  type="number"
                  placeholder="e.g. 100"
                  required
                  value={additionalStockQty}
                  onChange={(e) => setAdditionalStockQty(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStockProduct(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium py-2 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-2 rounded-lg shadow-sm transition disabled:opacity-55"
                >
                  {loading ? "Saving..." : "Confirm Offload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pricing Policy Adjustment Modal */}
      {activePriceProduct && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-sm p-5 animate-in fade-in zoom-in-95 duration-100">
            <h3 className="font-bold text-slate-800 text-sm">
              Adjust Pricing Policy ({activePriceProduct.id})
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Store administrators only. Modify official list price for <strong>{activePriceProduct.name}</strong>.
            </p>

            <form onSubmit={handlePriceUpdate} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Current Official Price
                </label>
                <input
                  type="text"
                  disabled
                  value={`SLe ${activePriceProduct.unit_price.toFixed(2)}`}
                  className="w-full px-3 py-1.5 text-xs bg-slate-100 text-slate-500 rounded-lg border border-slate-100 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Approved New Price (SLe)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 55.50"
                  required
                  value={newUnitPrice}
                  onChange={(e) => setNewUnitPrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActivePriceProduct(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium py-2 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-2 rounded-lg shadow-sm transition disabled:opacity-55"
                >
                  {loading ? "Applying..." : "Apply Price Change"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
