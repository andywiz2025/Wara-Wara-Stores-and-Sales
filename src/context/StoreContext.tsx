import React, { createContext, useContext, useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  setDoc,
  doc,
  addDoc,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { Product, StaffProfile, Sale, TBCRegistry, StoreNotification } from "../types";
import {
  seedProductsDatabase,
  processImmediateSale,
  registerTBCOrder,
  completeTBCCollection,
  processTBCExpiration,
  offloadProductsStock,
  adminUpdateProductPrice,
  SEED_PRODUCTS
} from "../services/storeService";

interface StoreContextType {
  products: Product[];
  sales: Sale[];
  tbcs: TBCRegistry[];
  staffProfiles: StaffProfile[];
  notifications: StoreNotification[];
  currentUser: StaffProfile | null;
  firebaseActive: boolean;
  isOnline: boolean;
  seedingRequired: boolean;
  isDemoMode: boolean;
  setDemoMode: (val: boolean) => void;
  // Core Actions
  executeImmediateSale: (
    items: { product_id: string; name: string; quantity: number; unit_cost: number }[],
    paymentMethod: "cash" | "cheque" | "mobile_money",
    reference?: string
  ) => Promise<void>;
  executeTBCRegistration: (
    customerName: string,
    items: { product_id: string; name: string; quantity: number; unit_cost: number; total: number }[],
    expiryDays: number
  ) => Promise<void>;
  executeTBCCollection: (tbcId: string, collectedBy: string) => Promise<void>;
  executeTBCExpiration: (tbcId: string) => Promise<void>;
  executeUpdateStock: (productId: string, qty: number) => Promise<void>;
  executeUpdatePrice: (productId: string, price: number) => Promise<void>;
  executeSeedData: () => Promise<void>;
  setCurrentUserRole: (role: "admin" | "staff") => void;
  registerNewStaffProfile: (name: string, role: "admin" | "staff", permissions: { can_update_stock: boolean, can_process_sales: boolean }) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Shared state trees
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [tbcs, setTbcs] = useState<TBCRegistry[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [notifications, setNotifications] = useState<StoreNotification[]>([]);
  
  // Real-time status trackers
  const [firebaseActive, setFirebaseActive] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [seedingRequired, setSeedingRequired] = useState(false);
  const [isDemoMode, setDemoMode] = useState(true);

  // Active current user profile inside the shop ledger
  const [currentUser, setCurrentUser] = useState<StaffProfile | null>({
    uid: "SYSTEM_ROOT_ADMIN",
    name: "Wara Wara Admin",
    role: "admin",
    permissions: {
      can_update_stock: true,
      can_process_sales: true
    }
  });

  // Check connectivity
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Check if Firebase is actually configured or if it's the default placeholder
  useEffect(() => {
    import("../firebase-applet-config.json").then((cfg) => {
      if (cfg.apiKey && cfg.apiKey !== "PLACEHOLDER") {
        setFirebaseActive(true);
        setDemoMode(false); // Enable Firebase mode since keys are live
      } else {
        setFirebaseActive(false);
        setDemoMode(true); // Fallback to sandbox local persistence mode safely
      }
    }).catch(() => {
      setFirebaseActive(false);
      setDemoMode(true);
    });
  }, []);

  // Save/Load state to/from LocalStorage for offline Sandbox mode
  useEffect(() => {
    if (isDemoMode) {
      const localProducts = localStorage.getItem("wws_products");
      const localSales = localStorage.getItem("wws_sales");
      const localTbcs = localStorage.getItem("wws_tbcs");
      const localStaff = localStorage.getItem("wws_staff");
      const localAlerts = localStorage.getItem("wws_alerts");

      if (localProducts) {
        setProducts(JSON.parse(localProducts));
        setSeedingRequired(false);
      } else {
        // Prepare initial catalog seeding
        setProducts(SEED_PRODUCTS);
        setSeedingRequired(true);
      }

      if (localSales) setSales(JSON.parse(localSales));
      if (localTbcs) setTbcs(JSON.parse(localTbcs));
      if (localStaff) {
        setStaffProfiles(JSON.parse(localStaff));
      } else {
        const defaultProfiles: StaffProfile[] = [
          {
            uid: "SYSTEM_ROOT_ADMIN",
            name: "Wara Wara Admin",
            role: "admin",
            permissions: { can_update_stock: true, can_process_sales: true }
          },
          {
            uid: "STAFF_MEMBER_01",
            name: "Musa Kamara",
            role: "staff",
            permissions: { can_update_stock: true, can_process_sales: true }
          },
          {
            uid: "STAFF_MEMBER_02",
            name: "Fatu Mansaray",
            role: "staff",
            permissions: { can_update_stock: false, can_process_sales: true }
          }
        ];
        setStaffProfiles(defaultProfiles);
        localStorage.setItem("wws_staff", JSON.stringify(defaultProfiles));
      }

      if (localAlerts) {
        setNotifications(JSON.parse(localAlerts));
      } else {
        setNotifications([]);
      }
    }
  }, [isDemoMode]);

  // Sync state variables back to LocalStorage in DemoMode
  const saveSandboxState = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // Live Firebase Subscriptions (only triggers if isDemoMode is false and firebaseActive is true)
  useEffect(() => {
    if (!firebaseActive || isDemoMode) return;

    try {
      const unsubProducts = onSnapshot(collection(db, "products"), (snap) => {
        if (snap.empty) {
          setSeedingRequired(true);
          setProducts([]);
        } else {
          setSeedingRequired(false);
          const list: Product[] = [];
          snap.forEach((d) => list.push(d.data() as Product));
          setProducts(list.sort((a,b) => a.id.localeCompare(b.id)));
        }
      }, (err) => console.error("Snapshot error products:", err));

      const unsubSales = onSnapshot(collection(db, "sales_ledger"), (snap) => {
        const list: Sale[] = [];
        snap.forEach((d) => {
          const s = d.data() as Sale;
          // Handle Firestore Timestamp to JS conversions
          list.push(s);
        });
        setSales(list.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds || 0));
      }, (err) => console.error("Snapshot error sales:", err));

      const unsubTbcs = onSnapshot(collection(db, "tbc_registry"), (snap) => {
        const list: TBCRegistry[] = [];
        snap.forEach((d) => list.push(d.data() as TBCRegistry));
        setTbcs(list);
      }, (err) => console.error("Snapshot error tbcs:", err));

      const unsubStaff = onSnapshot(collection(db, "staff_profiles"), (snap) => {
        const list: StaffProfile[] = [];
        snap.forEach((d) => list.push(d.data() as StaffProfile));
        setStaffProfiles(snap.empty ? [] : list);
      }, (err) => console.error("Snapshot error staff:", err));

      const unsubNotifications = onSnapshot(collection(db, "notifications"), (snap) => {
        const list: StoreNotification[] = [];
        snap.forEach((d) => list.push(d.data() as StoreNotification));
        setNotifications(list);
      }, (err) => console.error("Snapshot error alerts:", err));

      return () => {
        unsubProducts();
        unsubSales();
        unsubTbcs();
        unsubStaff();
        unsubNotifications();
      };
    } catch (err) {
      console.error("Failed to initialize Firestore observers:", err);
    }
  }, [firebaseActive, isDemoMode]);

  // Adjust standard user profile role during testing
  const setCurrentUserRole = (role: "admin" | "staff") => {
    if (role === "admin") {
      setCurrentUser({
        uid: "SYSTEM_ROOT_ADMIN",
        name: "Wara Wara Admin",
        role: "admin",
        permissions: { can_update_stock: true, can_process_sales: true }
      });
    } else {
      setCurrentUser({
        uid: "STAFF_MEMBER_01",
        name: "Musa Kamara",
        role: "staff",
        permissions: { can_update_stock: true, can_process_sales: true }
      });
    }
  };

  // SEED TRIGGER
  const executeSeedData = async () => {
    if (!isDemoMode && firebaseActive) {
      await seedProductsDatabase();
    } else {
      setProducts(SEED_PRODUCTS);
      saveSandboxState("wws_products", SEED_PRODUCTS);
      setSeedingRequired(false);
      triggerNotification("Wara Wara Stores Catalog database successfully initialized with 11 core products.");
    }
  };

  const triggerNotification = (msg: string, type: "info" | "warning" = "info") => {
    const newAlert: StoreNotification = {
      id: Math.random().toString(36).substring(7),
      message: msg,
      timestamp: new Date().toISOString(),
      type,
      read: false
    };
    const updated = [newAlert, ...notifications];
    setNotifications(updated);
    if (isDemoMode) saveSandboxState("wws_alerts", updated);
  };

  // IMMEDIATE SALE
  const executeImmediateSale = async (
    items: { product_id: string; name: string; quantity: number; unit_cost: number }[],
    paymentMethod: "cash" | "cheque" | "mobile_money",
    reference?: string
  ) => {
    if (!currentUser) throw new Error("No staff active");
    if (!currentUser.permissions.can_process_sales && currentUser.role !== "admin") {
      throw new Error("Missing of insufficient permission. Staff is unauthorized to conduct sales.");
    }

    const totalAmount = items.reduce((sum, item) => sum + item.unit_cost * item.quantity, 0);

    if (!isDemoMode && firebaseActive) {
      await processImmediateSale({
        staffId: currentUser.uid,
        items,
        totalAmount,
        paymentMethod,
        referenceDetails: reference
      });
    } else {
      // Sandbox fallback
      const saleId = `SALE-${Math.floor(Math.random() * 900000) + 100000}`;
      const newSale: Sale = {
        sale_id: saleId,
        timestamp: new Date().toISOString(),
        staff_id: currentUser.name,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        reference_details: reference,
        items
      };

      // Decrement stock
      const updatedProducts = products.map((prod) => {
        const itemInCart = items.find((i) => i.product_id === prod.id);
        if (itemInCart) {
          const nextStock = prod.current_stock - itemInCart.quantity;
          if (nextStock < 0) {
            console.warn(`Local stock for ${prod.name} went below 0!`);
          }
          return { ...prod, current_stock: Math.max(0, nextStock) };
        }
        return prod;
      });

      const updatedSales = [newSale, ...sales];
      setProducts(updatedProducts);
      setSales(updatedSales);
      saveSandboxState("wws_products", updatedProducts);
      saveSandboxState("wws_sales", updatedSales);

      triggerNotification(`Immediate sale recorded: Invoice #${saleId.slice(5)} total SLe ${totalAmount}. Stock deducted.`);
    }
  };

  // REGISTER TBC ORDER
  const executeTBCRegistration = async (
    customerName: string,
    items: { product_id: string; name: string; quantity: number; unit_cost: number; total: number }[],
    expiryDays: number
  ) => {
    if (!currentUser) throw new Error("No staff activated");
    if (!currentUser.permissions.can_process_sales && currentUser.role !== "admin") {
      throw new Error("Staff unauthorized to process registries.");
    }

    const totalAmount = items.reduce((sum, i) => sum + i.total, 0);

    if (!isDemoMode && firebaseActive) {
      await registerTBCOrder({
        customerName,
        items,
        totalAmount,
        expiryDays
      });
    } else {
      const tbcId = `TBC-${Math.floor(Math.random() * 900000) + 100000}`;
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + expiryDays);

      const newTbc: TBCRegistry = {
        tbc_id: tbcId,
        customer_name: customerName,
        items,
        total_amount: totalAmount,
        status: "pending",
        expiry_date: expiry.toISOString(),
        collected_by: null,
        collected_at: null
      };

      const updatedTbcs = [newTbc, ...tbcs];
      setTbcs(updatedTbcs);
      saveSandboxState("wws_tbcs", updatedTbcs);

      triggerNotification(`Pending TBC Registry recorded for ${customerName}. Total: SLe ${totalAmount}. No stock on hold yet.`, "info");
    }
  };

  // TBC COLLECTION HANDLER
  const executeTBCCollection = async (tbcId: string, collectedBy: string) => {
    if (!currentUser) throw new Error("No staff active");
    if (!currentUser.permissions.can_process_sales && currentUser.role !== "admin") {
      throw new Error("Unauthorised transaction attempted.");
    }

    const matchedTBC = tbcs.find((t) => t.tbc_id === tbcId);
    if (!matchedTBC) throw new Error("TBC record not found.");

    if (!isDemoMode && firebaseActive) {
      await completeTBCCollection({
        tbcId,
        collectedBy,
        items: matchedTBC.items
      });
    } else {
      const updatedProducts = products.map((prod) => {
        const itemInTbc = matchedTBC.items.find((i) => i.product_id === prod.id);
        if (itemInTbc) {
          return { ...prod, current_stock: Math.max(0, prod.current_stock - itemInTbc.quantity) };
        }
        return prod;
      });

      const updatedTbcs = tbcs.map((t) => {
        if (t.tbc_id === tbcId) {
          return {
            ...t,
            status: "collected" as const,
            collected_by: collectedBy,
            collected_at: new Date().toISOString()
          };
        }
        return t;
      });

      setProducts(updatedProducts);
      setTbcs(updatedTbcs);
      saveSandboxState("wws_products", updatedProducts);
      saveSandboxState("wws_tbcs", updatedTbcs);

      triggerNotification(`TBC #${tbcId.slice(4)} retrieved by ${collectedBy}. Inventory stock adjusted accordingly.`, "info");
    }
  };

  // TBC EXPIRATION RESET FLOW
  const executeTBCExpiration = async (tbcId: string) => {
    const matchedTBC = tbcs.find((t) => t.tbc_id === tbcId);
    if (!matchedTBC) throw new Error("TBC registry card not found.");

    if (!isDemoMode && firebaseActive) {
      await processTBCExpiration(tbcId, matchedTBC.customer_name);
    } else {
      const updatedTbcs = tbcs.map((t) => {
        if (t.tbc_id === tbcId) {
          return { ...t, status: "expired" as const };
        }
        return t;
      });

      setTbcs(updatedTbcs);
      saveSandboxState("wws_tbcs", updatedTbcs);

      triggerNotification(`TBC #${tbcId.slice(4)} for ${matchedTBC.customer_name} marked EXPIRED. Zero changes made to current stock count.`, "warning");
    }
  };

  // ADMIN UPDATE STOCK (OFFLOADING)
  const executeUpdateStock = async (productId: string, qty: number) => {
    if (currentUser?.role !== "admin" && !currentUser?.permissions.can_update_stock) {
      throw new Error("Missing of insufficient permissions to update stock list.");
    }

    if (!isDemoMode && firebaseActive) {
      await offloadProductsStock({
        productId,
        quantityToAdd: qty
      });
    } else {
      const updatedProducts = products.map((prod) => {
        if (prod.id === productId) {
          return {
            ...prod,
            current_stock: prod.current_stock + qty,
            total_offloaded: prod.total_offloaded + qty
          };
        }
        return prod;
      });
      setProducts(updatedProducts);
      saveSandboxState("wws_products", updatedProducts);

      const prodName = products.find(p => p.id === productId)?.name || productId;
      triggerNotification(`Restock Completed: Added +${qty} ${prodName} to shelving counts.`, "info");
    }
  };

  // ADMIN UPDATE PRICE (STRICT ADMIN LOCK)
  const executeUpdatePrice = async (productId: string, price: number) => {
    if (currentUser?.role !== "admin") {
      throw new Error("Missing of insufficient permissions: Only Store Administrators are authorized to update unit pricing policies.");
    }

    if (!isDemoMode && firebaseActive) {
      await adminUpdateProductPrice({
        productId,
        newPrice: price
      });
    } else {
      const updatedProducts = products.map((prod) => {
        if (prod.id === productId) {
          return { ...prod, unit_price: price };
        }
        return prod;
      });
      setProducts(updatedProducts);
      saveSandboxState("wws_products", updatedProducts);

      const prodName = products.find(p => p.id === productId)?.name || productId;
      triggerNotification(`Pricing adjusted: ${prodName} is now SLe ${price}.`, "info");
    }
  };

  // ENROLL NEW STAFF PROFILE (ADMIN ONLY)
  const registerNewStaffProfile = async (
    name: string,
    role: "admin" | "staff",
    permissions: { can_update_stock: boolean; can_process_sales: boolean }
  ) => {
    if (currentUser?.role !== "admin") {
      throw new Error("Only store administrators are authorized to enroll new personnel.");
    }

    if (!isDemoMode && firebaseActive) {
      const staffColRef = collection(db, "staff_profiles");
      const newStaffDoc = doc(staffColRef);
      const profilePayload: StaffProfile = {
        uid: newStaffDoc.id,
        name,
        role,
        permissions
      };
      await setDoc(newStaffDoc, profilePayload);
    } else {
      const newStaff: StaffProfile = {
        uid: `USER-${Math.floor(Math.random() * 900000) + 100000}`,
        name,
        role,
        permissions
      };
      const updatedStaff = [...staffProfiles, newStaff];
      setStaffProfiles(updatedStaff);
      saveSandboxState("wws_staff", updatedStaff);

      triggerNotification(`New team member registered: ${name} enroled with ${role.toUpperCase()} capabilities.`);
    }
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        sales,
        tbcs,
        staffProfiles,
        notifications,
        currentUser,
        firebaseActive,
        isOnline,
        seedingRequired,
        isDemoMode,
        setDemoMode,
        executeImmediateSale,
        executeTBCRegistration,
        executeTBCCollection,
        executeTBCExpiration,
        executeUpdateStock,
        executeUpdatePrice,
        executeSeedData,
        setCurrentUserRole,
        registerNewStaffProfile
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
