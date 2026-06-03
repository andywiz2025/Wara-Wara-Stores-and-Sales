import React, { useState } from "react";
import { useStore } from "../context/StoreContext";
import { Product } from "../types";
import { exportProductsInventoryToExcel } from "../utils/excelExport";
import {
  Package,
  TrendingDown,
  PlusCircle,
  Edit,
  Search,
  Check,
  AlertTriangle,
  FolderOpen,
  Plus,
  Trash2,
  Sparkles,
  Image as ImageIcon,
  Camera,
  Upload,
  Video
} from "lucide-react";

// Reusable Camera Capture component with error protection and camera feed streaming
function CameraCapture({
  onImageCaptured,
  onCancel
}: {
  onImageCaptured: (url: string) => void;
  onCancel?: () => void;
}) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera connection failed:", err);
      setCameraError(
        "Could not access camera. Please confirm check permissions or ensure no other app is using it."
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  React.useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const snap = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const url = canvas.toDataURL("image/jpeg", 0.85);
        onImageCaptured(url);
        stopCamera();
      }
    }
  };

  return (
    <div className="space-y-3">
      {cameraError ? (
        <div className="p-3 bg-red-50 border border-red-150 rounded-xl text-red-700 text-xs text-center font-medium">
          <p>⚠️ {cameraError}</p>
          <div className="flex gap-2 justify-center mt-3">
            <button
              type="button"
              onClick={startCamera}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition cursor-pointer"
            >
              Retry
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-[10px] transition cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex flex-col items-center justify-center">
          {!stream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="h-6 w-6 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
              <span className="text-[10px] font-semibold">Readying aperture...</span>
            </div>
          )}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          {stream && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              <button
                type="button"
                onClick={snap}
                className="bg-indigo-650 hover:bg-indigo-750 active:scale-95 text-white font-bold text-[11px] px-4 py-2 rounded-xl shadow-lg flex items-center gap-1.5 transition cursor-pointer"
              >
                <Camera className="h-4 w-4" /> Take Snap
              </button>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="bg-slate-900/80 hover:bg-slate-900 text-white font-bold text-[11px] px-3 py-2 rounded-xl shadow-lg transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import toolsPlaceholder from "../assets/images/tools_placeholder_1779651584388.png";
import plumbingPlaceholder from "../assets/images/plumbing_placeholder_1779651601971.png";
import electricalPlaceholder from "../assets/images/electrical_placeholder_1779651620426.png";
import hardwarePlaceholder from "../assets/images/hardware_placeholder_1779651640628.png";
import buildingPlaceholder from "../assets/images/building_placeholder_1779651656793.png";

export default function ProductCatalog() {
  const {
    products,
    currentUser,
    executeUpdateStock,
    executeUpdatePrice,
    executeSeedData,
    seedingRequired,
    executeAddProduct,
    executeDeleteProduct,
    executeOverrideStock,
    categories,
    executeAddCategory,
    executeDeleteCategory,
    executeUpdateProductImage
  } = useStore();

  const [activeImageProduct, setActiveImageProduct] = useState<Product | null>(null);
  const [imageSourceTab, setImageSourceTab] = useState<"ai" | "upload" | "camera">("ai");
  const [dragActive, setDragActive] = useState(false);
  const [cameraOverlayActive, setCameraOverlayActive] = useState(false);
  const [customImageCapturedUrl, setCustomImageCapturedUrl] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [selectedMgrCategory, setSelectedMgrCategory] = useState<string | null>(null);

  const getCategoryPlaceholder = (category: string) => {
    switch (category) {
      case "Tools": return toolsPlaceholder;
      case "Plumbing": return plumbingPlaceholder;
      case "Electrical": return electricalPlaceholder;
      case "Hardware": return hardwarePlaceholder;
      case "Building Materials": return buildingPlaceholder;
      default: return toolsPlaceholder;
    }
  };

  // Add Product state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemId, setNewItemId] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Tools");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemStock, setNewItemStock] = useState("");
  const [newItemImage, setNewItemImage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Selection for action modals
  const [activeStockProduct, setActiveStockProduct] = useState<Product | null>(null);
  const [additionalStockQty, setAdditionalStockQty] = useState("");
  
  const [activePriceProduct, setActivePriceProduct] = useState<Product | null>(null);
  const [newUnitPrice, setNewUnitPrice] = useState("");
  const [newStockLevel, setNewStockLevel] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  const dynamicCategories = ["All", ...categories];

  const isAdmin = currentUser?.role === "admin";

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === "All" || p.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCat;
  });

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemId.trim() || !newItemName.trim() || !newItemPrice || !newItemStock) {
      setErrorText("Please complete all product definition inputs.");
      return;
    }

    const price = parseFloat(newItemPrice);
    const stock = parseInt(newItemStock);

    if (isNaN(price) || price <= 0) {
      setErrorText("Material price must represent a positive number.");
      return;
    }
    if (isNaN(stock) || stock < 0) {
      setErrorText("Starting stock levels must represent a positive integer.");
      return;
    }

    setLoading(true);
    setErrorText("");
    setSuccessText("");

    try {
      await executeAddProduct(
        newItemId.trim().toUpperCase(),
        newItemName.trim(),
        newItemCategory,
        price,
        stock,
        newItemImage || getCategoryPlaceholder(newItemCategory)
      );
      setSuccessText(`Successfully added product [${newItemId.toUpperCase()}] ${newItemName} to catalog!`);
      // Reset inputs
      setNewItemId("");
      setNewItemName("");
      setNewItemCategory("Tools");
      setNewItemPrice("");
      setNewItemStock("");
      setNewItemImage("");
      setShowAddModal(false);
    } catch (err: any) {
      setErrorText(err.message || "Failed to create catalog entry.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProductClick = async (p: Product) => {
    const confirmed = window.confirm(`Are you absolutely certain you wish to delete and purge SKU [${p.id}] ${p.name} from store shelves? Historic transaction logs cannot be undone.`);
    if (!confirmed) return;

    setLoading(true);
    setErrorText("");
    setSuccessText("");
    try {
      await executeDeleteProduct(p.id);
      setSuccessText(`Product [${p.id}] was successfully purged from active catalog ledger.`);
    } catch (err: any) {
      setErrorText(err.message || "Purge execution failed.");
    } finally {
      setLoading(false);
    }
  };

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

  const handleAdminProductPolicyUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePriceProduct) return;

    const price = parseFloat(newUnitPrice);
    const stock = parseInt(newStockLevel);

    if (isNaN(price) || price <= 0) {
      setErrorText("Pricing policy must represent a positive currency value.");
      return;
    }
    if (isNaN(stock) || stock < 0) {
      setErrorText("Correct stock count must represent a non-negative integer.");
      return;
    }

    setLoading(true);
    setErrorText("");
    setSuccessText("");
    try {
      let isUpdated = false;
      let logMsg = "";

      if (price !== activePriceProduct.unit_price) {
        await executeUpdatePrice(activePriceProduct.id, price);
        logMsg += `Unit price updated to SLe ${price.toFixed(2)}. `;
        isUpdated = true;
      }

      if (stock !== activePriceProduct.current_stock) {
        await executeOverrideStock(activePriceProduct.id, stock);
        logMsg += `Stock level corrected to ${stock} units. `;
        isUpdated = true;
      }

      if (isUpdated) {
        setSuccessText(`Administative adjustment completed: ${logMsg}`);
      } else {
        setSuccessText("No data changes detected.");
      }

      setNewUnitPrice("");
      setNewStockLevel("");
      setActivePriceProduct(null);
    } catch (err: any) {
      setErrorText(err.message || "Failed to apply administrative alterations.");
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

        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => exportProductsInventoryToExcel(filteredProducts)}
                className="bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Export current filtered view to Microsoft Excel"
              >
                <span>📗</span> Export to Excel
              </button>
              <button
                onClick={() => {
                  setShowAddModal(true);
                  setErrorText("");
                  setSuccessText("");
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add New Material SKU
              </button>
              <button
                onClick={() => {
                  setShowCategoryManager(true);
                  setSelectedMgrCategory(categories[0] || null);
                  setErrorText("");
                  setSuccessText("");
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <FolderOpen className="h-4 w-4" />
                Manage Categories
              </button>
            </>
          )}

          {seedingRequired && (
            <button
              onClick={executeSeedData}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              🔌 Seed Default Inventory Products
            </button>
          )}
        </div>
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
          {dynamicCategories.map((cat) => (
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
              className={`rounded-xl border overflow-hidden flex flex-col justify-between transition ${
                isOutOfStock
                  ? "bg-red-50/40 border-red-200 shadow-sm"
                  : isLowStock
                  ? "bg-amber-50/40 border-amber-200 shadow-sm"
                  : "bg-white border-slate-150 hover:border-indigo-200 shadow-sm"
              }`}
            >
              {/* Image Header Block */}
              <div className="relative w-full h-32 bg-slate-100 overflow-hidden flex items-center justify-center border-b border-slate-100 select-none group">
                <img
                  src={p.image_url || getCategoryPlaceholder(p.category)}
                  alt={p.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                
                {/* Floating SNAP/UPLOAD Action Trigger for authorized staff */}
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveImageProduct(p);
                      setImageSourceTab("upload"); // Default to upload file for convenience
                      setCameraOverlayActive(false);
                      setCustomImageCapturedUrl(null);
                      setErrorText("");
                      setSuccessText("");
                    }}
                    className="absolute top-2 left-2 bg-white/90 hover:bg-white text-slate-705 text-slate-750 hover:text-indigo-650 p-1.5 rounded-lg border border-slate-200/60 shadow-xs backdrop-blur-xs transition duration-150 cursor-pointer flex items-center gap-1.5 text-[10px] font-bold z-10"
                    title="Update Item Layout Image / Use Camera"
                  >
                    <Camera className="h-3.5 w-3.5 text-indigo-600 animate-pulse" /> Update Image
                  </button>
                )}
                
                {/* Category small Badge */}
                <span className="absolute bottom-2 left-2 text-[9px] font-black tracking-tight text-white bg-slate-900/60 backdrop-blur-xs px-2 py-0.5 rounded font-sans uppercase">
                  {p.category}
                </span>

                {isOutOfStock ? (
                  <span className="absolute top-2 right-2 text-[9px] font-bold text-red-750 bg-red-100/90 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm font-sans animate-pulse">
                    <AlertTriangle className="h-2.5 w-2.5" /> OUT
                  </span>
                ) : isLowStock ? (
                  <span className="absolute top-2 right-2 text-[9px] font-bold text-amber-755 bg-amber-100/90 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm font-sans">
                    <TrendingDown className="h-2.5 w-2.5 animate-bounce" /> LOW STOCK
                  </span>
                ) : null}
              </div>

              {/* Core product information body */}
              <div className="p-4 flex-grow flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                      {p.id}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-slate-800 mt-2 truncate" title={p.name}>
                    {p.name}
                  </h4>
                </div>

                {/* Price Tag & Stock Count */}
                <div className="flex items-end justify-between mt-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block uppercase tracking-tight font-semibold">unit price</span>
                    <p className="text-sm font-bold text-slate-800 font-mono">
                      SLe {p.unit_price.toFixed(2)}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-sans block uppercase tracking-tight font-semibold">shelved stock</span>
                    <p className={`text-sm font-extrabold font-mono ${
                      isOutOfStock ? "text-red-600" : isLowStock ? "text-amber-600" : "text-slate-700"
                    }`}>
                      {p.current_stock.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-slate-400 font-mono italic">
                      {p.total_offloaded ? p.total_offloaded.toLocaleString() : p.current_stock.toLocaleString()} cumulative
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
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-[11px] font-bold py-1.5 rounded-lg transition"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Offload Stock
                  </button>

                  {/* Adjust Price & Stock - Admin Only trigger */}
                  <button
                    onClick={() => {
                      setActivePriceProduct(p);
                      setNewUnitPrice(p.unit_price.toString());
                      setNewStockLevel(p.current_stock.toString());
                      setErrorText("");
                      setSuccessText("");
                    }}
                    className={`px-2.5 py-1.5 rounded-lg border transition ${
                      currentUser?.role === "admin"
                        ? "border-slate-200 hover:border-slate-350 text-slate-500 hover:text-slate-800 cursor-pointer"
                        : "border-slate-100 bg-slate-50 text-slate-300 opacity-60 cursor-not-allowed"
                    }`}
                    disabled={currentUser?.role !== "admin"}
                    title={currentUser?.role === "admin" ? "Adjust Pricing & Stock Policies" : "Administrators only"}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>

                  {/* Purge SKU - Admin Only trigger */}
                  {currentUser?.role === "admin" && (
                    <button
                      onClick={() => handleDeleteProductClick(p)}
                      className="px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50/20 hover:bg-red-50 text-red-500 hover:text-red-700 transition cursor-pointer"
                      title="Purge product from ledger database"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}

                </div>
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

      {/* Pricing & Stock Direct Audit Modal */}
      {activePriceProduct && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-sm p-5 animate-in fade-in zoom-in-95 duration-100">
            <h3 className="font-bold text-slate-800 text-sm">
              Adjust Material Policies ({activePriceProduct.id})
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Store administrators only. Directly alter database pricing policies or correct human error stock slips for <strong>{activePriceProduct.name}</strong>.
            </p>

            <form onSubmit={handleAdminProductPolicyUpdate} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Selling Price Policy (SLe)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 55.50"
                  required
                  value={newUnitPrice}
                  onChange={(e) => setNewUnitPrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold text-slate-850"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Correct Shelved Stock Count *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. p.current_stock"
                  value={newStockLevel}
                  onChange={(e) => setNewStockLevel(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold text-slate-850 bg-amber-50/20 border-amber-200"
                />
                <p className="text-[10px] text-amber-600 mt-1 italic font-sans">
                  * Changing this resets active stock count immediately to bypass ledger miscalculations. Other clerks are barred from this action.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActivePriceProduct(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 rounded-lg shadow-sm transition disabled:opacity-55 cursor-pointer"
                >
                  {loading ? "Applying..." : "Apply Adjustments"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Add New SKU Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-100">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-emerald-600" />
              Register New Material SKU
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Store administrators only. Introduce a new item into the Wara Wara Stores Ledger database.
            </p>

            <form onSubmit={handleCreateProductSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Store Code (SKU ID) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WWS-012"
                    value={newItemId}
                    onChange={(e) => setNewItemId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-semibold text-slate-500">
                      Category Group *
                    </label>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setShowAddCategoryModal(true)}
                        className="text-[10px] text-indigo-650 hover:text-indigo-850 font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="h-2.5 w-2.5 inline" /> New
                      </button>
                    )}
                  </div>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    {categories.map((catOpt) => (
                      <option key={catOpt} value={catOpt}>
                        {catOpt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Full Material Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. P.V.C Pipe 1.5 Inch (Pcs)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Product Visual Asset Preview & Generator/Uploader/Camera */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-emerald-600" /> Visual Material Asset
                  </span>
                  
                  {/* Select image source tab */}
                  <div className="flex bg-slate-200/60 p-0.5 rounded-lg text-[9px] font-bold text-slate-600">
                    <button
                      type="button"
                      onClick={() => setImageSourceTab("ai")}
                      className={`px-2 py-0.5 rounded-md transition duration-150 ${imageSourceTab === "ai" ? "bg-white text-slate-800 shadow-xs" : "hover:text-slate-800 text-slate-500"}`}
                    >
                      AI Gen
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSourceTab("upload")}
                      className={`px-2 py-0.5 rounded-md transition duration-150 ${imageSourceTab === "upload" ? "bg-white text-slate-800 shadow-xs" : "hover:text-slate-800 text-slate-500"}`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSourceTab("camera")}
                      className={`px-2 py-0.5 rounded-md transition duration-150 ${imageSourceTab === "camera" ? "bg-white text-slate-800 shadow-xs" : "hover:text-slate-800 text-slate-500"}`}
                    >
                      Camera
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-3 items-center">
                  <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                    <img
                      src={newItemImage || getCategoryPlaceholder(newItemCategory)}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="flex-grow space-y-1 min-w-0">
                    {imageSourceTab === "ai" && (
                      <>
                        <p className="text-[9px] text-slate-450 leading-normal">
                          Generate real catalog photos using keywords based on the product name.
                        </p>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (!newItemName.trim()) {
                                setErrorText("Please state a clear product name first to generate a specific, highly accurate photography of the actual item!");
                                return;
                              }
                              setIsGenerating(true);
                              setErrorText("");
                              setSuccessText("");
                              
                              setTimeout(() => {
                                const cleanKeywords = newItemName
                                  .replace(/\(.*?\)/g, "")
                                  .replace(/[^a-zA-Z0-9\s]/g, "")
                                  .trim()
                                  .replace(/\s+/g, ",");
                                
                                const query = cleanKeywords ? `${cleanKeywords},${newItemCategory.toLowerCase()}` : newItemCategory.toLowerCase();
                                const generatedUrl = `https://images.unsplash.com/featured/400x300/?${encodeURIComponent(query)}`;
                                
                                setNewItemImage(generatedUrl);
                                setIsGenerating(false);
                                setSuccessText(`Generated real item visual render for "${newItemName.trim()}"!`);
                              }, 1200);
                            }}
                            disabled={isGenerating}
                            className="px-2.5 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles className="h-2.5 w-2.5 text-amber-300 fill-amber-300 animate-pulse" />
                            {isGenerating ? "Synthesizing Render..." : "Generate AI SKU Preview"}
                          </button>
                          
                          {newItemImage && (
                            <button
                              type="button"
                              onClick={() => {
                                setNewItemImage("");
                                setSuccessText("");
                              }}
                              className="px-2 py-1.5 border border-slate-300 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold transition cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </>
                    )}

                    {imageSourceTab === "upload" && (
                      <div
                        onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragActive(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            const file = e.dataTransfer.files[0];
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setNewItemImage(event.target.result as string);
                                setSuccessText("Successfully parsed local image drop!");
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        onClick={() => document.getElementById("new-sku-file-input")?.click()}
                        className={`border-2 border-dashed rounded-xl p-2.5 text-center cursor-pointer transition flex items-center justify-center gap-2 ${
                          dragActive ? "border-indigo-650 bg-indigo-50/50" : "border-slate-300 hover:border-slate-400 bg-slate-100/50"
                        }`}
                      >
                        <Upload className="h-4 w-4 text-slate-400" />
                        <span className="text-[10px] font-semibold text-slate-650">Drag or click to upload file</span>
                        <input
                          id="new-sku-file-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  setNewItemImage(event.target.result as string);
                                  setSuccessText("Successfully loaded local photo!");
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>
                    )}

                    {imageSourceTab === "camera" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCameraOverlayActive(true)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Camera className="h-3 w-3" /> Turn On Camera
                        </button>
                        <p className="text-[9px] text-slate-450 leading-tight">
                          Snap instant photos using your device camera or mobile phone camera.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct camera overlay for inside the registration modal */}
                {cameraOverlayActive && imageSourceTab === "camera" && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2">
                    <p className="text-[9px] font-bold text-indigo-700 mb-1.5 flex items-center gap-1">
                      <Camera className="h-3 w-3 animate-pulse" /> Active Camera Viewfinder
                    </p>
                    <CameraCapture
                      onImageCaptured={(url) => {
                        setNewItemImage(url);
                        setSuccessText("Successfully captured camera snapshot!");
                        setCameraOverlayActive(false);
                      }}
                      onCancel={() => setCameraOverlayActive(false)}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Selling Price (SLe) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 75.00"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Starting Shelved Qty *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 150"
                    value={newItemStock}
                    onChange={(e) => setNewItemStock(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2.5 rounded-lg shadow-sm transition disabled:opacity-55"
                >
                  {loading ? "Registering..." : "Add to Catalog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Add New Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center z-55 p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-sm p-5 animate-in fade-in zoom-in-95 duration-100">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <FolderOpen className="h-4 w-4 text-indigo-600" />
              Define New Goods Category
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Store administrators only. Creates a brand new classification group for Wara Wara Stores Ledger.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newCategoryName.trim()) return;
                setLoading(true);
                setErrorText("");
                setSuccessText("");
                try {
                  await executeAddCategory(newCategoryName.trim());
                  setSuccessText(`Goods Category "${newCategoryName.trim()}" successfully created!`);
                  setNewItemCategory(newCategoryName.trim()); // Set newly created as selection
                  setNewCategoryName("");
                  setShowAddCategoryModal(false);
                } catch (err: any) {
                  setErrorText(err.message || "Failed to create category classification.");
                } finally {
                  setLoading(false);
                }
              }}
              className="mt-3.5 space-y-3"
            >
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paint & Finishes"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setNewCategoryName("");
                    setShowAddCategoryModal(false);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold py-2 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 rounded-lg shadow-sm transition disabled:opacity-55"
                >
                  {loading ? "Creating..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Image & Camera Snapshot Modal for Existing Items */}
      {activeImageProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Camera className="h-4 w-4 text-indigo-600" />
                  Update Product Photo
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Update visual representation for {activeImageProduct.name}
                </p>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-650 p-1 rounded-lg"
                onClick={() => {
                  setActiveImageProduct(null);
                  setCameraOverlayActive(false);
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Select image source tab */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setImageSourceTab("ai");
                    setCameraOverlayActive(false);
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition duration-150 ${imageSourceTab === "ai" && !cameraOverlayActive ? "bg-white text-slate-800 shadow-sm" : "hover:text-slate-800 text-slate-500"}`}
                >
                  AI Search
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageSourceTab("upload");
                    setCameraOverlayActive(false);
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition duration-150 ${imageSourceTab === "upload" ? "bg-white text-slate-800 shadow-sm" : "hover:text-slate-800 text-slate-500"}`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageSourceTab("camera");
                    setCameraOverlayActive(true);
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition duration-150 ${imageSourceTab === "camera" || cameraOverlayActive ? "bg-white text-slate-800 shadow-sm" : "hover:text-slate-800 text-slate-500"}`}
                >
                  Camera
                </button>
              </div>

              {/* Status information messages */}
              {errorText && (
                <div className="p-2 bg-red-50 text-red-700 text-[10px] rounded-lg border border-red-105 font-medium">
                  {errorText}
                </div>
              )}
              {successText && (
                <div className="p-2 bg-emerald-50 text-emerald-700 text-[10px] rounded-lg border border-emerald-105 font-medium">
                  {successText}
                </div>
              )}

              {/* Viewfinder or Preview depending on selections */}
              {cameraOverlayActive ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2">
                  <p className="text-[10px] font-bold text-indigo-700 mb-1 flex items-center gap-1">
                    <Camera className="h-3 w-3 animate-pulse" /> Camera Active Lens
                  </p>
                  <CameraCapture
                    onImageCaptured={(url) => {
                      setCustomImageCapturedUrl(url);
                      setSuccessText("Picture snapped and loaded! Review the image below and press 'Save Visual Design' to register it.");
                      setCameraOverlayActive(false);
                    }}
                    onCancel={() => setCameraOverlayActive(false)}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Active representation preview block */}
                  <div className="flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Image Preview</span>
                    <div className="w-28 h-28 rounded-2xl border border-slate-250 bg-slate-100 overflow-hidden shadow-inner shrink-0">
                      <img
                        src={customImageCapturedUrl || activeImageProduct.image_url || getCategoryPlaceholder(activeImageProduct.category)}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  {/* Options implementation per tab */}
                  {imageSourceTab === "ai" && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 text-center">
                        Synthesize an elegant photo based on search keywords.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsGenerating(true);
                            setErrorText("");
                            setSuccessText("");
                            setTimeout(() => {
                              const cleanKeywords = activeImageProduct.name
                                .replace(/\(.*?\)/g, "")
                                .replace(/[^a-zA-Z0-9\s]/g, "")
                                .trim()
                                .replace(/\s+/g, ",");
                              
                              const query = cleanKeywords ? `${cleanKeywords},${activeImageProduct.category.toLowerCase()}` : activeImageProduct.category.toLowerCase();
                              const generatedUrl = `https://images.unsplash.com/featured/400x300/?${encodeURIComponent(query)}`;
                              setCustomImageCapturedUrl(generatedUrl);
                              setIsGenerating(false);
                              setSuccessText("Successfully fetched alternative SKU rendering!");
                            }, 1000);
                          }}
                          disabled={isGenerating}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-55"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                          {isGenerating ? "Synthesizing Render..." : "Generate AI SKU Preview"}
                        </button>
                      </div>
                    </div>
                  )}

                  {imageSourceTab === "upload" && (
                    <div
                      onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                      onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          const file = e.dataTransfer.files[0];
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setCustomImageCapturedUrl(event.target.result as string);
                              setSuccessText("Successfully parsed local image drop!");
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      onClick={() => document.getElementById("existing-sku-file-input")?.click()}
                      className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 ${
                        dragActive ? "border-indigo-650 bg-indigo-50/50" : "border-slate-300 hover:border-slate-400 bg-slate-550 bg-slate-50/50"
                      }`}
                    >
                      <Upload className="h-6 w-6 text-slate-400" />
                      <p className="text-xs font-bold text-slate-700">Drag & drop item photo here</p>
                      <p className="text-[10px] text-slate-400">or click to choose image file</p>
                      <input
                        id="existing-sku-file-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setCustomImageCapturedUrl(event.target.result as string);
                                setSuccessText("Successfully loaded local photo!");
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveImageProduct(null);
                  setCustomImageCapturedUrl(null);
                  setCameraOverlayActive(false);
                  setErrorText("");
                  setSuccessText("");
                }}
                className="flex-1 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const finalUrl = customImageCapturedUrl;
                  if (!finalUrl) {
                    setErrorText("Please upload, snap, or generate a new photo visual design first.");
                    return;
                  }
                  try {
                    setLoading(true);
                    await executeUpdateProductImage(activeImageProduct.id, finalUrl);
                    setLoading(false);
                    setActiveImageProduct(null);
                    setCustomImageCapturedUrl(null);
                    setCameraOverlayActive(false);
                  } catch (err: any) {
                    setErrorText(err.message || "Failed to commit visual changes.");
                    setLoading(false);
                  }
                }}
                disabled={loading || (!customImageCapturedUrl && activeImageProduct.image_url === customImageCapturedUrl)}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-55 cursor-pointer"
              >
                {loading ? "Saving..." : "Save Image Layout"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Category Manager Modal */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-55 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl h-[90vh] md:h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-indigo-600" />
                  Dynamic Category & Store Catalog Manager
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Admin power console to create/delete category classifications and list/delete stock items directly under them.
                </p>
              </div>
              <button
                onClick={() => setShowCategoryManager(false)}
                className="text-slate-400 hover:text-slate-600 transition p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer text-sm font-bold"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body (2 Pane layout) */}
            <div className="flex-grow flex overflow-hidden flex-col md:flex-row">
              {/* Left Pane - Categories List with quick Add */}
              <div className="w-full md:w-80 border-r border-slate-100 p-4 flex flex-col overflow-y-auto bg-slate-50/50">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Category list ({categories.length})
                </h4>

                {/* Inline Quick Add Category Form */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const trimmedName = newCategoryName.trim();
                    if (!trimmedName) return;
                    setLoading(true);
                    setErrorText("");
                    try {
                      await executeAddCategory(trimmedName);
                      setNewCategoryName("");
                      setSelectedMgrCategory(trimmedName);
                    } catch (err: any) {
                      setErrorText(err.message || "Failed to create category classification.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="mb-4 flex gap-1.5"
                >
                  <input
                    type="text"
                    required
                    placeholder="New category..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-grow px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-1.5 rounded-lg flex items-center justify-center transition"
                    title="Add Category"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </form>

                <div className="space-y-1 overflow-y-auto flex-grow max-h-[200px] md:max-h-none">
                  {categories.map((cat) => {
                    const count = products.filter(p => p.category.toLowerCase() === cat.toLowerCase()).length;
                    const isSelected = selectedMgrCategory === cat;
                    return (
                      <div
                        key={cat}
                        onClick={() => setSelectedMgrCategory(cat)}
                        className={`group px-3 py-2 rounded-xl flex items-center justify-between cursor-pointer transition text-xs font-semibold ${
                          isSelected
                            ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-650"
                            : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{cat}</span>
                          <span className="text-[9px] text-slate-400 font-normal">{count} stock items</span>
                        </div>
                        
                        {/* Delete category button */}
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to permanently delete category "${cat}"?\n\nNote: All ${count} materials under this category will also be deleted from the system.`)) {
                              try {
                                setLoading(true);
                                // Delete products belonging to this category first
                                const catProducts = products.filter(p => p.category.toLowerCase() === cat.toLowerCase());
                                for (const cp of catProducts) {
                                  await executeDeleteProduct(cp.id);
                                }
                                await executeDeleteCategory(cat);
                                if (selectedMgrCategory === cat) {
                                  setSelectedMgrCategory(categories.find(c => c !== cat) || null);
                                }
                              } catch (err: any) {
                                setErrorText(err.message || "Failed to delete category.");
                              } finally {
                                setLoading(false);
                              }
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 hover:bg-white rounded transition cursor-pointer"
                          title="Purge Category & its Items"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Pane - Items listed under the selected Category */}
              <div className="flex-grow p-4 md:p-5 flex flex-col overflow-hidden bg-white">
                {selectedMgrCategory ? (
                  <>
                    <div className="flex items-center justify-between mb-3.5 border-b border-slate-50 pb-3">
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs">
                          Materials listed under <span className="text-indigo-600 font-extrabold">"{selectedMgrCategory}"</span>
                        </h4>
                        <p className="text-[10px] text-slate-450">
                          You can remove specific material SKUs from this category directly.
                        </p>
                      </div>

                      <span className="text-[10px] font-mono bg-indigo-55 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                        {products.filter(p => p.category.toLowerCase() === selectedMgrCategory.toLowerCase()).length} SKUs defined
                      </span>
                    </div>

                    {/* Inline alert if any error exists inside the modal */}
                    {errorText && (
                      <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                        ⚠️ {errorText}
                      </div>
                    )}

                    {/* Products Grid list under selected category */}
                    <div className="flex-grow overflow-y-auto pr-1">
                      {products.filter(p => p.category.toLowerCase() === selectedMgrCategory.toLowerCase()).length === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-6 text-center">
                          <Package className="h-8 w-8 text-slate-300 mb-1" />
                          <p className="text-xs font-bold text-slate-500">No Materials defined in this category</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Please add a material SKU to this classification under the main catalog screen.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {products
                            .filter(p => p.category.toLowerCase() === selectedMgrCategory.toLowerCase())
                            .map((p) => {
                              return (
                                <div
                                  key={p.id}
                                  className="border border-slate-150 rounded-xl p-3 flex items-center justify-between hover:border-indigo-200 hover:bg-slate-50/50 transition duration-150"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-9 w-9 bg-slate-100 rounded-lg flex-shrink-0 overflow-hidden border border-slate-200/50 flex items-center justify-center">
                                      <img
                                        src={p.image_url || getCategoryPlaceholder(p.category)}
                                        alt={p.name}
                                        className="h-full w-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-mono text-[9px] font-black text-slate-400 uppercase tracking-tight bg-slate-100 border px-1 rounded">
                                          {p.id}
                                        </span>
                                        <span className="text-xs font-bold text-slate-800 truncate">{p.name}</span>
                                      </div>
                                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                                        <span>Price: <strong>SLe {p.unit_price.toFixed(2)}</strong></span>
                                        <span>•</span>
                                        <span className={p.current_stock < 40 ? "text-amber-600 font-bold" : ""}>
                                          Stock: <strong>{p.current_stock} pcs</strong>
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (confirm(`Are you absolutely sure you want to delete SKU [${p.id}] ${p.name} from the catalog? This action is irreversible.`)) {
                                        try {
                                          setLoading(true);
                                          setErrorText("");
                                          await executeDeleteProduct(p.id);
                                        } catch (err: any) {
                                          setErrorText(err.message || "Failed to delete product.");
                                        } finally {
                                          setLoading(false);
                                        }
                                      }
                                    }}
                                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-650 rounded-lg transition border border-transparent hover:border-red-200 cursor-pointer flex items-center justify-center"
                                    title="Delete product"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center p-6 text-center text-slate-400">
                    <FolderOpen className="h-10 w-10 text-slate-200 mb-2" />
                    <p className="text-xs font-bold">No Category Selected</p>
                    <p className="text-[10px] text-slate-450">Select a category on the left sidebar to view or remove defined materials.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCategoryManager(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition"
              >
                Finished Managing Store
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
