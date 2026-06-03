import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  collection,
  onSnapshot,
  setDoc,
  doc,
  addDoc,
  serverTimestamp,
  updateDoc,
  getDoc,
  deleteDoc
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { Product, StaffProfile, Sale, TBCRegistry, StoreNotification, Expenditure, BankDeposit, CreditRegistry, CreditRepayment } from "../types";
import {
  seedProductsDatabase,
  processImmediateSale,
  registerTBCOrder,
  completeTBCCollection,
  processTBCExpiration,
  offloadProductsStock,
  adminUpdateProductPrice,
  adminOverrideProductStock,
  adminCreateProduct,
  adminDeleteProduct,
  adminDeleteStaffProfile,
  registerCreditSale,
  completeCreditRepayment,
  SEED_PRODUCTS
} from "../services/storeService";

export interface SyncItem {
  id: string;
  type:
    | "immediate_sale"
    | "tbc_registration"
    | "tbc_collection"
    | "tbc_expiration"
    | "credit_registration"
    | "credit_repayment"
    | "restock"
    | "price_update"
    | "image_update"
    | "override_stock"
    | "enroll_staff"
    | "add_product"
    | "delete_product"
    | "delete_staff"
    | "add_expenditure"
    | "add_bank_deposit"
    | "change_password";
  payload: any;
  createdAt: string;
}

interface StoreContextType {
  products: Product[];
  sales: Sale[];
  tbcs: TBCRegistry[];
  credits: CreditRegistry[];
  staffProfiles: StaffProfile[];
  notifications: StoreNotification[];
  expenditures: Expenditure[];
  bankDeposits: BankDeposit[];
  currentUser: StaffProfile | null;
  firebaseActive: boolean;
  isOnline: boolean;
  seedingRequired: boolean;
  isDemoMode: boolean;
  setDemoMode: (val: boolean) => void;
  // Sync Status & Operations
  pendingSyncCount: number;
  isSyncing: boolean;
  lastSyncedTime: string | null;
  syncOfflineData: () => Promise<void>;
  clearPendingSyncQueue: () => void;
  // Auth Actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  adminChangePassword: (uid: string, newPassword: string) => Promise<void>;
  // Core Actions
  executeImmediateSale: (
    items: { product_id: string; name: string; quantity: number; unit_cost: number }[],
    paymentMethod: "cash" | "cheque" | "mobile_money",
    reference?: string,
    customerName?: string
  ) => Promise<string>;
  executeTBCRegistration: (
    customerName: string,
    items: { product_id: string; name: string; quantity: number; unit_cost: number; total: number }[],
    expiryDays: number
  ) => Promise<void>;
  executeTBCCollection: (
    tbcId: string,
    collectedBy: string,
    itemsToCollect: { product_id: string; quantity: number }[]
  ) => Promise<void>;
  executeTBCExpiration: (tbcId: string) => Promise<void>;
  executeCreditRegistration: (
    customerName: string,
    customerPhone: string,
    items: { product_id: string; name: string; quantity: number; unit_cost: number }[],
    amountPaid: number,
    dueDateDays: number
  ) => Promise<string>;
  executeCreditRepayment: (
    creditId: string,
    amount: number,
    paymentMethod: "cash" | "cheque" | "mobile_money"
  ) => Promise<void>;
  executeLogCreditFollowUp: (
    creditId: string,
    contactOutcome: "promised_payment" | "no_answer" | "disputed" | "refused" | "general_reminder",
    note: string
  ) => Promise<void>;
  executeUpdateStock: (productId: string, qty: number) => Promise<void>;
  executeUpdatePrice: (productId: string, price: number) => Promise<void>;
  executeUpdateProductImage: (productId: string, imageUrl: string) => Promise<void>;
  executeOverrideStock: (productId: string, exactStock: number) => Promise<void>;
  executeSeedData: () => Promise<void>;
  setCurrentUserRole: (role: "admin" | "staff") => void;
  registerNewStaffProfile: (name: string, username: string, password: string, role: "admin" | "staff", permissions: { can_update_stock: boolean, can_process_sales: boolean }) => Promise<void>;
  executeAddProduct: (id: string, name: string, category: string, unit_price: number, current_stock: number, image_url?: string) => Promise<void>;
  executeDeleteProduct: (productId: string) => Promise<void>;
  executeDeleteStaffProfile: (uid: string) => Promise<void>;
  executeAddExpenditure: (description: string, amount: number, category: string, authorizedBy?: string) => Promise<void>;
  executeAddBankDeposit: (amount: number, bankName: string, depositedBy: string, slipSerial?: string) => Promise<void>;
  adminResetAllData: () => Promise<void>;
  adminDeleteSale: (saleId: string) => Promise<void>;
  adminEditSale: (saleId: string, updatedFields: Partial<Sale>) => Promise<void>;
  adminDeleteTbc: (tbcId: string) => Promise<void>;
  adminEditTbc: (tbcId: string, updatedFields: Partial<TBCRegistry>) => Promise<void>;
  adminDeleteCredit: (creditId: string) => Promise<void>;
  adminEditCredit: (creditId: string, updatedFields: Partial<CreditRegistry>) => Promise<void>;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  nativePermissionStatus: string;
  requestNotificationPermission: () => Promise<boolean>;
  playNotificationSound: () => void;
  activeToasts: StoreNotification[];
  dismissToast: (id: string) => void;
  categories: string[];
  executeAddCategory: (name: string) => Promise<void>;
  executeDeleteCategory: (name: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Shared state trees
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(["Tools", "Plumbing", "Electrical", "Hardware", "Building Materials"]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [tbcs, setTbcs] = useState<TBCRegistry[]>([]);
  const [credits, setCredits] = useState<CreditRegistry[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [notifications, setNotifications] = useState<StoreNotification[]>([]);
  const [activeToasts, setActiveToasts] = useState<StoreNotification[]>([]);
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [bankDeposits, setBankDeposits] = useState<BankDeposit[]>([]);
  
  // Sounds & Desktop Alerts System
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("wws_sound_enabled");
      return saved !== "false";
    } catch {
      return true;
    }
  });

  const [nativePermissionStatus, setNativePermissionStatus] = useState<string>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "not-supported";
  });

  const appLoadedAt = useRef<number>(Date.now());
  const playedIds = useRef<Set<string>>(new Set());

  // Save sound setting when changed
  useEffect(() => {
    localStorage.setItem("wws_sound_enabled", String(soundEnabled));
  }, [soundEnabled]);

  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const ctx = new AudioCtx();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc1.type = "sine";
      osc2.type = "sine";
      
      const now = ctx.currentTime;
      
      // Dual-tone digital bell sound chime
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.12, now + 0.03);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      
      osc2.frequency.setValueAtTime(880.00, now + 0.10); // A5
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0, now + 0.10);
      gain2.gain.linearRampToValueAtTime(0.12, now + 0.13);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.50);
      
      osc1.start(now);
      osc1.stop(now + 0.4);
      
      osc2.start(now + 0.10);
      osc2.stop(now + 0.6);
    } catch (error) {
      console.warn("Audio Context playback failed or was blocked:", error);
    }
  };

  // Register Wara Wara local Service Worker to handle persistent OS-level push notifications
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then((reg) => {
          console.log("Wara Wara Service Worker registered successfully:", reg);
        })
        .catch((err) => {
          console.warn("Wara Wara Service Worker registration failed:", err);
        });
    }
  }, []);

  const sendNativeNotification = (title: string, body: string) => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          const options: any = {
            body,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            silent: false, // Turn off silent to trigger OS system sound / user sound
            requireInteraction: true, // Standard: Forces the alert to stay in the phone/PC notification bar until manually closed/swiped away
            sticky: true, // Platform hybrid fallback for non-swipeable persistent alerts till handled
            ongoing: true, // Keeps it pinned on active Android systems in the drawer
            vibrate: [200, 100, 200, 100, 200], // Vibrate pulses to draw immediate attention on phone devices
            actions: [
              { action: "open", title: "📂 Open App" },
              { action: "close", title: "❌ Dismiss Alert" }
            ]
          };

          // Try Service Worker registration first (essential for consistent display on Android and iOS phone browsers)
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification(title, options)
                .catch((swErr) => {
                  console.warn("ServiceWorker showNotification failed, using fallback:", swErr);
                  const n = new Notification(title, options);
                  n.onclick = () => {
                    window.focus();
                    n.close();
                  };
                });
            }).catch(() => {
              const n = new Notification(title, options);
              n.onclick = () => {
                window.focus();
                n.close();
              };
            });
          } else {
            const n = new Notification(title, options);
            n.onclick = () => {
              window.focus();
              n.close();
            };
          }
        } catch (err) {
          console.warn("Notification object initiation failed:", err);
          // High-compatibility basic fallback
          try {
            const n = new Notification(title, { body });
            n.onclick = () => {
              window.focus();
              n.close();
            };
          } catch (basicErr) {
            console.error("Critical: Native HTML5 notification failure:", basicErr);
          }
        }
      }
    }
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNativePermissionStatus("not-supported");
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      setNativePermissionStatus(permission);
      if (permission === "granted") {
        sendNativeNotification("Alerts Configured 🔔", "Wara Wara Activity Alert system of PC & Mobile is active!");
        playNotificationSound();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error asking for push permission:", err);
      return false;
    }
  };

  const dismissToast = (id: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id));
  };

  // Monitor notifications state to play active synthesized alarm tones on PC and Mobile
  useEffect(() => {
    if (notifications.length === 0) return;
    
    const sortedNotifications = [...notifications].sort((a, b) => {
      const aTime = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp).getTime();
      const bTime = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp).getTime();
      return (aTime || 0) - (bTime || 0);
    });

    let hasAnyNewEvent = false;

    sortedNotifications.forEach(n => {
      if (!n.id || playedIds.current.has(n.id)) return;
      
      const alertTime = n.timestamp?.seconds ? n.timestamp.seconds * 1000 : new Date(n.timestamp).getTime();
      // Allow a tiny margin of 5 seconds to catch incoming new alerts from subscribers
      if (alertTime && alertTime >= appLoadedAt.current - 5000) {
        playedIds.current.add(n.id);
        hasAnyNewEvent = true;
        
        const headerTitle = n.type === "warning" ? "Wara Wara Security Check ⚠️" : "Wara Wara Activity Alert 🔔";
        sendNativeNotification(headerTitle, n.message);

        // Append to active on-screen temporary toasts
        setActiveToasts(prev => {
          if (prev.some(t => t.id === n.id)) return prev;
          return [...prev, n];
        });

        // Set auto dismiss timer for 8 seconds
        setTimeout(() => {
          setActiveToasts(prev => prev.filter(t => t.id !== n.id));
        }, 8000);
      } else {
        playedIds.current.add(n.id);
      }
    });

    if (hasAnyNewEvent) {
      if (soundEnabled) {
        playNotificationSound();
      }
    }
  }, [notifications, soundEnabled]);
  
  // Real-time status trackers
  const [firebaseActive, setFirebaseActive] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [seedingRequired, setSeedingRequired] = useState(false);
  const [isDemoMode, setDemoMode] = useState(true);

  // Syncing Engine State
  const [pendingSync, setPendingSync] = useState<SyncItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("wws_pending_sync") || "[]");
    } catch (e) {
      console.error("Failed to parse pending sync queue:", e);
      return [];
    }
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(() => localStorage.getItem("wws_last_synced"));

  // Save pending sync queue to local storage when changed
  useEffect(() => {
    localStorage.setItem("wws_pending_sync", JSON.stringify(pendingSync));
  }, [pendingSync]);

  const queueSyncItem = (item: SyncItem) => {
    setPendingSync(prev => {
      const exists = prev.some(p => p.id === item.id && p.type === item.type);
      if (exists) return prev;
      return [...prev, item];
    });
  };

  const clearPendingSyncQueue = () => {
    setPendingSync([]);
    triggerNotification("Pending synchronization queue cleared.");
  };

  // Active current user profile inside the shop ledger
  const [currentUser, setCurrentUser] = useState<StaffProfile | null>(() => {
    const saved = localStorage.getItem("wws_current_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && parsed.username && parsed.password) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse saved user:", e);
      }
    }
    return null;
  });

  // Keep active user synchronized if their credentials/role/permissions are modified behind the scenes
  useEffect(() => {
    if (currentUser) {
      const updated = staffProfiles.find(p => p.uid === currentUser.uid);
      if (updated) {
        if (JSON.stringify(updated) !== JSON.stringify(currentUser)) {
          setCurrentUser(updated);
          localStorage.setItem("wws_current_user", JSON.stringify(updated));
        }
      }
    }
  }, [staffProfiles, currentUser]);

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
      const localCategories = localStorage.getItem("wws_categories");
      const localSales = localStorage.getItem("wws_sales");
      const localTbcs = localStorage.getItem("wws_tbcs");
      const localCredits = localStorage.getItem("wws_credits");
      const localStaff = localStorage.getItem("wws_staff");
      const localAlerts = localStorage.getItem("wws_alerts");
      const localExpenditures = localStorage.getItem("wws_expenditures");
      const localBankDeposits = localStorage.getItem("wws_bank_deposits");

      if (localProducts) {
        setProducts(JSON.parse(localProducts));
        setSeedingRequired(false);
      } else {
        // Prepare initial catalog seeding
        setProducts(SEED_PRODUCTS);
        setSeedingRequired(true);
      }

      if (localCategories) {
        setCategories(JSON.parse(localCategories));
      } else {
        setCategories(["Tools", "Plumbing", "Electrical", "Hardware", "Building Materials"]);
      }

      if (localSales) setSales(JSON.parse(localSales));
      if (localTbcs) setTbcs(JSON.parse(localTbcs));
      if (localCredits) setCredits(JSON.parse(localCredits));
      if (localStaff) {
        const loaded: StaffProfile[] = JSON.parse(localStaff);
        const defaultProfiles: StaffProfile[] = [
          {
            uid: "SYSTEM_ROOT_ADMIN",
            name: "Nabieu Conteh",
            role: "admin",
            permissions: { can_update_stock: true, can_process_sales: true },
            username: "Nabieu",
            password: "12345"
          },
          {
            uid: "STAFF_MEMBER_01",
            name: "Amadu",
            role: "staff",
            permissions: { can_update_stock: true, can_process_sales: true },
            username: "amadu",
            password: "123"
          },
          {
            uid: "STAFF_MEMBER_02",
            name: "Kello",
            role: "staff",
            permissions: { can_update_stock: false, can_process_sales: true },
            username: "kello",
            password: "123"
          }
        ];

        // Ensure every default profile is injected/upgraded in the list
        const migrated = [...loaded];
        defaultProfiles.forEach(def => {
          const idx = migrated.findIndex(p => p.uid === def.uid);
          if (idx !== -1) {
            const oldProfile = migrated[idx];
            const isOldUser = oldProfile.name === "Musa Kamara" || oldProfile.name === "Fatu Mansaray" || oldProfile.name === "Adadu" || oldProfile.username === "musa" || oldProfile.username === "fatu" || oldProfile.username === "adadu";
            
            // Force/override default system profiles to follow the new rules immediately for users
            migrated[idx] = {
              ...oldProfile,
              name: def.name,
              username: def.username,
              password: isOldUser ? def.password : (oldProfile.password || def.password),
              role: def.role,
              permissions: { ...def.permissions, ...oldProfile.permissions }
            };
          } else {
            migrated.push(def);
          }
        });

        setStaffProfiles(migrated);
        localStorage.setItem("wws_staff", JSON.stringify(migrated));
      } else {
        const defaultProfiles: StaffProfile[] = [
          {
            uid: "SYSTEM_ROOT_ADMIN",
            name: "Nabieu Conteh",
            role: "admin",
            permissions: { can_update_stock: true, can_process_sales: true },
            username: "Nabieu",
            password: "12345"
          },
          {
            uid: "STAFF_MEMBER_01",
            name: "Amadu",
            role: "staff",
            permissions: { can_update_stock: true, can_process_sales: true },
            username: "amadu",
            password: "123"
          },
          {
            uid: "STAFF_MEMBER_02",
            name: "Kello",
            role: "staff",
            permissions: { can_update_stock: false, can_process_sales: true },
            username: "kello",
            password: "123"
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

      if (localExpenditures) {
        setExpenditures(JSON.parse(localExpenditures));
      } else {
        setExpenditures([]);
      }

      if (localBankDeposits) {
        setBankDeposits(JSON.parse(localBankDeposits));
      } else {
        setBankDeposits([]);
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
        if (snap.empty) {
          const defaultProfiles: StaffProfile[] = [
            {
              uid: "SYSTEM_ROOT_ADMIN",
              name: "Nabieu Conteh",
              role: "admin",
              permissions: { can_update_stock: true, can_process_sales: true },
              username: "Nabieu",
              password: "12345"
            },
            {
              uid: "STAFF_MEMBER_01",
              name: "Amadu",
              role: "staff",
              permissions: { can_update_stock: true, can_process_sales: true },
              username: "amadu",
              password: "123"
            },
            {
              uid: "STAFF_MEMBER_02",
              name: "Kello",
              role: "staff",
              permissions: { can_update_stock: false, can_process_sales: true },
              username: "kello",
              password: "123"
            }
          ];
          defaultProfiles.forEach(async (profile) => {
            const docRef = doc(db, "staff_profiles", profile.uid);
            await setDoc(docRef, profile);
          });
        } else {
          setStaffProfiles(list);
        }
      }, (err) => console.error("Snapshot error staff:", err));

      const unsubNotifications = onSnapshot(collection(db, "notifications"), (snap) => {
        const list: StoreNotification[] = [];
        snap.forEach((d) => list.push(d.data() as StoreNotification));
        setNotifications(list);
      }, (err) => console.error("Snapshot error alerts:", err));

      const unsubExpenditures = onSnapshot(collection(db, "expenditures"), (snap) => {
        const list: Expenditure[] = [];
        snap.forEach((d) => list.push(d.data() as Expenditure));
        setExpenditures(list.sort((a, b) => {
          const aTime = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp).getTime();
          const bTime = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp).getTime();
          return (bTime || 0) - (aTime || 0);
        }));
      }, (err) => console.error("Snapshot error expenditures:", err));

      const unsubBankDeposits = onSnapshot(collection(db, "bank_deposits"), (snap) => {
        const list: BankDeposit[] = [];
        snap.forEach((d) => list.push(d.data() as BankDeposit));
        setBankDeposits(list.sort((a, b) => {
          const aTime = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp).getTime();
          const bTime = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp).getTime();
          return (bTime || 0) - (aTime || 0);
        }));
      }, (err) => console.error("Snapshot error bank_deposits:", err));

      const unsubCredits = onSnapshot(collection(db, "credits_registry"), (snap) => {
        const list: CreditRegistry[] = [];
        snap.forEach((d) => list.push(d.data() as CreditRegistry));
        setCredits(list);
      }, (err) => console.error("Snapshot error credits:", err));

      const unsubCategories = onSnapshot(collection(db, "goods_categories"), (snap) => {
        if (snap.empty) {
          const defaults = ["Tools", "Plumbing", "Electrical", "Hardware", "Building Materials"];
          defaults.forEach(async (catName) => {
            const docRef = doc(db, "goods_categories", catName.toLowerCase().replace(/\s+/g, "_"));
            await setDoc(docRef, { name: catName });
          });
          setCategories(defaults);
        } else {
          const list: string[] = [];
          snap.forEach((d) => {
            const val = d.data();
            if (val && val.name) {
              list.push(val.name);
            }
          });
          setCategories(Array.from(new Set(list)));
        }
      }, (err) => console.error("Snapshot error categories:", err));

      return () => {
        unsubProducts();
        unsubSales();
        unsubTbcs();
        unsubCredits();
        unsubCategories();
        unsubStaff();
        unsubNotifications();
        unsubExpenditures();
        unsubBankDeposits();
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
        name: "Nabieu Conteh",
        role: "admin",
        permissions: { can_update_stock: true, can_process_sales: true },
        username: "Nabieu",
        password: "12345"
      });
    } else {
      setCurrentUser({
        uid: "STAFF_MEMBER_01",
        name: "Amadu",
        role: "staff",
        permissions: { can_update_stock: true, can_process_sales: true },
        username: "amadu",
        password: "123"
      });
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    const match = staffProfiles.find(
      p => p.username?.trim().toLowerCase() === username.trim().toLowerCase() && p.password === password
    );
    if (match) {
      setCurrentUser(match);
      localStorage.setItem("wws_current_user", JSON.stringify(match));
      await triggerNotification(`Successful login: Staff member ${match.name} (${match.role}) entered session safely.`, "info");
      return true;
    }
    await triggerNotification(`Unsuccessful login attempt detected for employee username: "${username}". Access validation failed.`, "warning");
    return false;
  };

  const logout = () => {
    if (currentUser) {
      triggerNotification(`Staff member ${currentUser.name} (${currentUser.role}) logged out securely.`, "info");
    }
    setCurrentUser(null);
    localStorage.removeItem("wws_current_user");
  };

  const adminChangePassword = async (uid: string, newPassword: string) => {
    if (currentUser?.username?.toLowerCase() !== "nabieu") {
      throw new Error("Only Nabieu's root account is authorized to modify user details or passwords.");
    }
    
    // Always do local updates first
    const updatedStaff = staffProfiles.map(p => {
      if (p.uid === uid) {
        return { ...p, password: newPassword };
      }
      return p;
    });
    setStaffProfiles(updatedStaff);
    saveSandboxState("wws_staff", updatedStaff);
    
    if (currentUser?.uid === uid) {
      const updatedUser = { ...currentUser, password: newPassword };
      setCurrentUser(updatedUser);
      localStorage.setItem("wws_current_user", JSON.stringify(updatedUser));
    }

    if (!isDemoMode && firebaseActive) {
      if (isOnline) {
        try {
          const match = staffProfiles.find(p => p.uid === uid);
          if (match) {
            const docRef = doc(db, "staff_profiles", uid);
            await updateDoc(docRef, { password: newPassword });
            triggerNotification(`Credentials customized successfully for user profile UID [${uid}].`);
          }
        } catch (err) {
          console.warn("Firebase password change failed, queuing offline:", err);
          queueSyncItem({
            id: `PASS-${uid}-${Date.now()}`,
            type: "change_password",
            payload: { uid, newPassword },
            createdAt: new Date().toISOString()
          });
          triggerNotification(`Saved locally (Offline queue): Customized credentials for profile [${uid}].`, "warning");
        }
      } else {
        queueSyncItem({
          id: `PASS-${uid}-${Date.now()}`,
          type: "change_password",
          payload: { uid, newPassword },
          createdAt: new Date().toISOString()
        });
        triggerNotification(`Saved locally (Offline, queued): Customized credentials for profile [${uid}].`, "warning");
      }
    } else {
      triggerNotification(`Credentials customized successfully for user profile UID [${uid}] (Sandbox).`);
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

  const triggerNotification = async (msg: string, type: "info" | "warning" = "info") => {
    const docId = Math.random().toString(36).substring(7);
    const newAlert: StoreNotification = {
      id: docId,
      message: msg,
      timestamp: new Date().toISOString(),
      type,
      read: false
    };

    if (!isDemoMode && firebaseActive) {
      try {
        await setDoc(doc(db, "notifications", docId), newAlert);
      } catch (err) {
        console.error("Failed to sync live notification dynamically:", err);
      }
    } else {
      const updated = [newAlert, ...notifications];
      setNotifications(updated);
      saveSandboxState("wws_alerts", updated);
    }
  };

  const syncOfflineData = async () => {
    if (!firebaseActive || !isOnline || pendingSync.length === 0) return;
    setIsSyncing(true);
    triggerNotification("Starting automatic cloud database synchronization...", "info");

    let successCount = 0;
    const remainingQueue = [...pendingSync];

    try {
      for (const item of pendingSync) {
        try {
          switch (item.type) {
            case "immediate_sale": {
              const { sale } = item.payload;
              await setDoc(doc(db, "sales_ledger", sale.sale_id), {
                ...sale,
                timestamp: serverTimestamp()
              });
              for (const saleItem of sale.items) {
                try {
                  const prodRef = doc(db, "products", saleItem.product_id);
                  const prodSnap = await getDoc(prodRef);
                  if (prodSnap.exists()) {
                    const currentStock = prodSnap.data().current_stock || 0;
                    await updateDoc(prodRef, {
                      current_stock: Math.max(0, currentStock - saleItem.quantity)
                    });
                  }
                } catch (e) {
                  console.error("Error updating stock for synced sale item:", e);
                }
              }
              break;
            }
            case "tbc_registration": {
              const { tbc, sale } = item.payload;
              await setDoc(doc(db, "tbc_registry", tbc.tbc_id), tbc);
              if (sale) {
                await setDoc(doc(db, "sales_ledger", sale.sale_id), {
                  ...sale,
                  timestamp: serverTimestamp()
                });
              }
              break;
            }
            case "tbc_collection": {
              const { tbcId, collectedBy, fullUpdatedItems, status, updatedCollections, itemsCollectedToday } = item.payload;
              await updateDoc(doc(db, "tbc_registry", tbcId), {
                status: status,
                items: fullUpdatedItems,
                collected_by: collectedBy,
                collected_at: serverTimestamp(),
                collections: updatedCollections
              });
              for (const colItem of itemsCollectedToday) {
                if (colItem.quantity > 0) {
                  try {
                    const prodRef = doc(db, "products", colItem.product_id);
                    const prodSnap = await getDoc(prodRef);
                    if (prodSnap.exists()) {
                      const currentStock = prodSnap.data().current_stock || 0;
                      await updateDoc(prodRef, {
                        current_stock: Math.max(0, currentStock - colItem.quantity)
                      });
                    }
                  } catch (e) {
                    console.error("Error updating stock for synced tbc item:", e);
                  }
                }
              }
              break;
            }
            case "tbc_expiration": {
              const { tbcId } = item.payload;
              await updateDoc(doc(db, "tbc_registry", tbcId), {
                status: "expired"
              });
              break;
            }
            case "restock": {
              const { productId, qty } = item.payload;
              const prodRef = doc(db, "products", productId);
              const prodSnap = await getDoc(prodRef);
              if (prodSnap.exists()) {
                const data = prodSnap.data();
                await updateDoc(prodRef, {
                  current_stock: (data.current_stock || 0) + qty,
                  total_offloaded: (data.total_offloaded || 0) + qty
                });
              }
              break;
            }
            case "price_update": {
              const { productId, price } = item.payload;
              await updateDoc(doc(db, "products", productId), {
                unit_price: price
              });
              break;
            }
            case "image_update": {
              const { productId, imageUrl } = item.payload;
              await updateDoc(doc(db, "products", productId), {
                image_url: imageUrl
              });
              break;
            }
            case "override_stock": {
              const { productId, exactStock } = item.payload;
              await updateDoc(doc(db, "products", productId), {
                current_stock: exactStock
              });
              break;
            }
            case "enroll_staff": {
              const { staff } = item.payload;
              await setDoc(doc(db, "staff_profiles", staff.uid), staff);
              break;
            }
            case "add_product": {
              const { product } = item.payload;
              await setDoc(doc(db, "products", product.id), product);
              break;
            }
            case "delete_product": {
              const { productId } = item.payload;
              await deleteDoc(doc(db, "products", productId));
              break;
            }
            case "delete_staff": {
              const { uid } = item.payload;
              await deleteDoc(doc(db, "staff_profiles", uid));
              break;
            }
            case "add_expenditure": {
              const { expenditure } = item.payload;
              await setDoc(doc(db, "expenditures", expenditure.id), {
                ...expenditure,
                timestamp: serverTimestamp()
              });
              break;
            }
            case "add_bank_deposit": {
              const { deposit } = item.payload;
              await setDoc(doc(db, "bank_deposits", deposit.id), {
                ...deposit,
                timestamp: serverTimestamp()
              });
              break;
            }
            case "change_password": {
              const { uid, newPassword } = item.payload;
              await updateDoc(doc(db, "staff_profiles", uid), {
                password: newPassword
              });
              break;
            }
            case "credit_registration": {
              const { credit, sale } = item.payload;
              await setDoc(doc(db, "credits_registry", credit.credit_id), {
                ...credit,
                timestamp: serverTimestamp()
              });
              if (sale) {
                await setDoc(doc(db, "sales_ledger", sale.sale_id), {
                  ...sale,
                  timestamp: serverTimestamp()
                });
              }
              for (const saleItem of credit.items) {
                try {
                  const prodRef = doc(db, "products", saleItem.product_id);
                  const prodSnap = await getDoc(prodRef);
                  if (prodSnap.exists()) {
                    const currentStock = prodSnap.data().current_stock || 0;
                    await updateDoc(prodRef, {
                      current_stock: Math.max(0, currentStock - saleItem.quantity)
                    });
                  }
                } catch (e) {
                  console.error("Error updating stock for synced credit sale item:", e);
                }
              }
              break;
            }
            case "credit_repayment": {
              const { creditId, updatedPaid, updatedRemaining, status, updatedRepayments } = item.payload;
              await updateDoc(doc(db, "credits_registry", creditId), {
                amount_paid: updatedPaid,
                remaining_balance: updatedRemaining,
                status: status,
                repayments: updatedRepayments
              });
              break;
            }
            case "credit_follow_up": {
              const { creditId, updatedFollowUps } = item.payload;
              await updateDoc(doc(db, "credits_registry", creditId), {
                follow_ups: updatedFollowUps
              });
              break;
            }
            default:
              break;
          }
          remainingQueue.shift();
          successCount++;
        } catch (itemErr) {
          console.error("Failed to sync individual log index:", item, itemErr);
          break;
        }
      }

      setPendingSync(remainingQueue);
      const nowStr = new Date().toLocaleString();
      if (successCount > 0) {
        setLastSyncedTime(nowStr);
        localStorage.setItem("wws_last_synced", nowStr);
        triggerNotification(`Offline synchronization complete! Successfully replicated ${successCount} entries to cloud live storage.`, "info");
      }
    } catch (err) {
      console.error("General Sync Worker error:", err);
      triggerNotification("Offline synchronization stalled. Will resume automatically.", "warning");
    } finally {
      setIsSyncing(false);
    }
  };

  // Trigger auto sync on transition online
  useEffect(() => {
    if (isOnline && firebaseActive && pendingSync.length > 0 && !isDemoMode) {
      syncOfflineData();
    }
  }, [isOnline, firebaseActive, isDemoMode, pendingSync]);

  // Automated checker for newly overdue credit/debtor accounts
  const checkedOverdueIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (credits.length === 0) return;

    // Build the list of credit IDs already flagged inside existing loaded notifications
    const existingOverdueKeys = new Set(
      notifications
        .filter((n) => n.message.includes("OVERDUE") || n.message.includes("overdue Since"))
        .map((n) => {
          const match = n.message.match(/CREDIT-\d+/);
          return match ? match[0] : null;
        })
        .filter(Boolean) as string[]
    );

    credits.forEach((c) => {
      if (c.status !== "paid") {
        const isOverdue = new Date() > new Date(c.due_date);
        if (isOverdue) {
          const formattedDate = new Date(c.due_date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          });
          const key = c.credit_id;
          // Only trigger if not already flagged in DB notifications AND not checked in current browser session
          if (!existingOverdueKeys.has(key) && !checkedOverdueIdsRef.current.has(key)) {
            checkedOverdueIdsRef.current.add(key);
            triggerNotification(
              `⚠️ OVERDUE DEBT ALERT: Debtor [${c.customer_name}] holding Credit Ticket #${key.slice(-6).toUpperCase()} (${key}) has exceeded their due date limit (Due: ${formattedDate}). Outstanding balance: SLe ${c.remaining_balance}. Please escalate follow-up.`,
              "warning"
            );
          }
        }
      }
    });
  }, [credits, notifications]);

  // IMMEDIATE SALE
  const executeImmediateSale = async (
    items: { product_id: string; name: string; quantity: number; unit_cost: number }[],
    paymentMethod: "cash" | "cheque" | "mobile_money",
    reference?: string,
    customerName?: string
  ): Promise<string> => {
    if (!currentUser) throw new Error("No staff active");
    if (!currentUser.permissions.can_process_sales && currentUser.role !== "admin") {
      throw new Error("Missing of insufficient permission. Staff is unauthorized to conduct sales.");
    }

    const totalAmount = items.reduce((sum, item) => sum + item.unit_cost * item.quantity, 0);
    const saleId = `SALE-${Math.floor(Math.random() * 900000) + 100000}`;
    const newSale: Sale = {
      sale_id: saleId,
      timestamp: new Date().toISOString(),
      staff_id: currentUser.name,
      customer_name: customerName || "Walk-in Customer",
      total_amount: totalAmount,
      payment_method: paymentMethod,
      reference_details: reference,
      items
    };

    // Decrement stock in local state immediately
    const updatedProducts = products.map((prod) => {
      const itemInCart = items.find((i) => i.product_id === prod.id);
      if (itemInCart) {
        const nextStock = prod.current_stock - itemInCart.quantity;
        return { ...prod, current_stock: Math.max(0, nextStock) };
      }
      return prod;
    });

    const updatedSales = [newSale, ...sales];
    setProducts(updatedProducts);
    setSales(updatedSales);
    saveSandboxState("wws_products", updatedProducts);
    saveSandboxState("wws_sales", updatedSales);

    if (!isDemoMode && firebaseActive) {
      if (isOnline) {
        try {
          await processImmediateSale({
            staffId: currentUser.uid,
            items,
            totalAmount,
            paymentMethod,
            referenceDetails: reference,
            customerName: customerName || "Walk-in Customer"
          });
          triggerNotification(`Immediate sale recorded: Invoice #${saleId.slice(-6).toUpperCase()} total SLe ${totalAmount}. Stock deducted.`);
        } catch (err) {
          console.warn("Firebase immediate sale failed, queuing offline:", err);
          queueSyncItem({
            id: saleId,
            type: "immediate_sale",
            payload: { sale: newSale },
            createdAt: new Date().toISOString()
          });
          triggerNotification(`Saved locally (Offline queue): Invoice #${saleId.slice(-6).toUpperCase()} total SLe ${totalAmount}. Will sync when connection is restored.`, "warning");
        }
      } else {
        queueSyncItem({
          id: saleId,
          type: "immediate_sale",
          payload: { sale: newSale },
          createdAt: new Date().toISOString()
        });
        triggerNotification(`Saved locally (Offline, queued): Invoice #${saleId.slice(-6).toUpperCase()} total SLe ${totalAmount}.`, "warning");
      }
    } else {
      triggerNotification(`Immediate sale recorded (Sandbox): Invoice #${saleId.slice(-6).toUpperCase()} total SLe ${totalAmount}.`);
    }

    return saleId;
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

    const saleId = `SALE-TBC-${tbcId.slice(-6).toUpperCase()}`;
    const newSale: Sale = {
      sale_id: saleId,
      timestamp: new Date().toISOString(),
      staff_id: currentUser.name,
      customer_name: customerName,
      total_amount: totalAmount,
      payment_method: "tbc",
      reference_details: `TBC Ticket ID: ${tbcId}`,
      items: items.map((i) => ({
        product_id: i.product_id,
        name: i.name,
        quantity: i.quantity,
        unit_cost: i.unit_cost
      }))
    };

    const updatedSales = [newSale, ...sales];
    const updatedTbcs = [newTbc, ...tbcs];
    
    setSales(updatedSales);
    setTbcs(updatedTbcs);
    saveSandboxState("wws_sales", updatedSales);
    saveSandboxState("wws_tbcs", updatedTbcs);

    if (!isDemoMode && firebaseActive) {
      if (isOnline) {
        try {
          await registerTBCOrder({
            tbcId,
            customerName,
            items,
            totalAmount,
            expiryDays,
            staffName: currentUser.name
          });
          triggerNotification(`Prepaid TBC Sale Registered & Added to Revenue for ${customerName}. Ticket ID: ${tbcId}. Total: SLe ${totalAmount}. No stock deducted yet.`, "info");
        } catch (err) {
          console.warn("Firebase TBC registration failed, queuing offline:", err);
          queueSyncItem({
            id: tbcId,
            type: "tbc_registration",
            payload: { tbc: newTbc, sale: newSale },
            createdAt: new Date().toISOString()
          });
          triggerNotification(`Saved locally (Offline queue): Prepaid TBC Sale for ${customerName} total SLe ${totalAmount}.`, "warning");
        }
      } else {
        queueSyncItem({
          id: tbcId,
          type: "tbc_registration",
          payload: { tbc: newTbc, sale: newSale },
          createdAt: new Date().toISOString()
        });
        triggerNotification(`Saved locally (Offline, queued): Prepaid TBC Sale for ${customerName} total SLe ${totalAmount}.`, "warning");
      }
    } else {
      triggerNotification(`Prepaid TBC Sale Registered (Sandbox) for ${customerName}. Added to Revenue. Ticket ID: ${tbcId}. Total: SLe ${totalAmount}. No stock deducted yet.`, "info");
    }
  };

  // REGISTER CREDIT SALE
  const executeCreditRegistration = async (
    customerName: string,
    customerPhone: string,
    items: { product_id: string; name: string; quantity: number; unit_cost: number }[],
    amountPaid: number,
    dueDateDays: number
  ): Promise<string> => {
    if (!currentUser) throw new Error("No staff active");
    if (!currentUser.permissions.can_process_sales && currentUser.role !== "admin") {
      throw new Error("Missing or insufficient permission. Staff is unauthorized to conduct credit sales.");
    }

    const totalAmount = items.reduce((sum, item) => sum + item.unit_cost * item.quantity, 0);
    const remainingBalance = Math.max(0, totalAmount - amountPaid);
    const creditId = `CREDIT-${Math.floor(Math.random() * 900000) + 100000}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDateDays);

    const newCredit: CreditRegistry = {
      credit_id: creditId,
      customer_name: customerName,
      customer_phone: customerPhone,
      items: items.map(i => ({ product_id: i.product_id, name: i.name, quantity: i.quantity, unit_cost: i.unit_cost })),
      total_amount: totalAmount,
      amount_paid: amountPaid,
      remaining_balance: remainingBalance,
      status: amountPaid === 0 ? "unpaid" : (remainingBalance <= 0 ? "paid" : "partial"),
      due_date: dueDate.toISOString(),
      timestamp: new Date().toISOString(),
      recorded_by: currentUser.name,
      repayments: amountPaid > 0 ? [
        {
          repayment_id: `REPAY-INIT-${creditId.slice(-6).toUpperCase()}`,
          amount: amountPaid,
          payment_method: "cash",
          timestamp: new Date().toISOString(),
          recorded_by: currentUser.name
        }
      ] : []
    };

    // Create a sale record in standard sales ledger
    const saleId = `SALE-CRD-${creditId.slice(-6).toUpperCase()}`;
    const newSale: Sale = {
      sale_id: saleId,
      timestamp: new Date().toISOString(),
      staff_id: currentUser.name,
      customer_name: customerName,
      total_amount: amountPaid,
      payment_method: "credit",
      reference_details: `Credit Ticket ID: ${creditId}. Initial Paid: SLe ${amountPaid}`,
      items: items.map(i => ({ product_id: i.product_id, name: i.name, quantity: i.quantity, unit_cost: i.unit_cost }))
    };

    // Decrement stock immediately since customer takes goods on credit
    const updatedProducts = products.map((prod) => {
      const itemInCart = items.find((i) => i.product_id === prod.id);
      if (itemInCart) {
        const nextStock = prod.current_stock - itemInCart.quantity;
        return { ...prod, current_stock: Math.max(0, nextStock) };
      }
      return prod;
    });

    const updatedSales = [newSale, ...sales];
    const updatedCredits = [newCredit, ...credits];

    setProducts(updatedProducts);
    setSales(updatedSales);
    setCredits(updatedCredits);

    saveSandboxState("wws_products", updatedProducts);
    saveSandboxState("wws_sales", updatedSales);
    saveSandboxState("wws_credits", updatedCredits);

    if (!isDemoMode && firebaseActive) {
      if (isOnline) {
        try {
          await registerCreditSale({
            creditId,
            customerName,
            customerPhone,
            items,
            totalAmount,
            amountPaid,
            remainingBalance,
            dueDateDays,
            staffName: currentUser.name
          });
          triggerNotification(`Credit Sale registered for ${customerName}. Ticket ID: ${creditId}. Total: SLe ${totalAmount}. Stock deducted.`);
        } catch (err) {
          console.warn("Firebase credit sale failed, queuing offline:", err);
          queueSyncItem({
            id: creditId,
            type: "credit_registration",
            payload: { credit: newCredit, sale: newSale },
            createdAt: new Date().toISOString()
          });
          triggerNotification(`Saved locally (Offline queue): Credit Sale for ${customerName} total SLe ${totalAmount}.`, "warning");
        }
      } else {
        queueSyncItem({
          id: creditId,
          type: "credit_registration",
          payload: { credit: newCredit, sale: newSale },
          createdAt: new Date().toISOString()
        });
        triggerNotification(`Saved locally (Offline, queued): Credit Sale for ${customerName} total SLe ${totalAmount}.`, "warning");
      }
    } else {
      triggerNotification(`Credit Sale registered (Sandbox) for ${customerName}. Ticket ID: ${creditId}. Total: SLe ${totalAmount}. Stock deducted.`, "info");
    }

    return creditId;
  };

  // LOG CREDIT REPAYMENT
  const executeCreditRepayment = async (
    creditId: string,
    amount: number,
    paymentMethod: "cash" | "cheque" | "mobile_money"
  ): Promise<void> => {
    if (!currentUser) throw new Error("No staff active");
    if (!currentUser.permissions.can_process_sales && currentUser.role !== "admin") {
      throw new Error("Missing or insufficient permission. Staff is unauthorized to log repayments.");
    }

    const matchedCredit = credits.find((c) => c.credit_id === creditId);
    if (!matchedCredit) throw new Error("Credit registry entry not found.");

    const updatedPaid = matchedCredit.amount_paid + amount;
    const updatedRemaining = Math.max(0, matchedCredit.remaining_balance - amount);
    const status = updatedRemaining <= 0 ? "paid" : "partial";

    const newRepayment: CreditRepayment = {
      repayment_id: `REPAY-${Math.floor(Math.random() * 900000) + 100000}`,
      amount,
      payment_method: paymentMethod,
      timestamp: new Date().toISOString(),
      recorded_by: currentUser.name
    };

    const updatedRepayments = [...(matchedCredit.repayments || []), newRepayment];

    const updatedCredits = credits.map((c) => {
      if (c.credit_id === creditId) {
        return {
          ...c,
          amount_paid: updatedPaid,
          remaining_balance: updatedRemaining,
          status,
          repayments: updatedRepayments
        };
      }
      return c;
    });

    const repSaleId = `SALE-REP-${newRepayment.repayment_id.slice(-6).toUpperCase()}`;
    const repaymentSale: Sale = {
      sale_id: repSaleId,
      timestamp: new Date().toISOString(),
      staff_id: currentUser.name,
      customer_name: matchedCredit.customer_name,
      total_amount: amount,
      payment_method: paymentMethod,
      reference_details: `Credit Payment on ID: ${creditId}`,
      items: []
    };

    const updatedSales = [repaymentSale, ...sales];

    setCredits(updatedCredits);
    setSales(updatedSales);
    saveSandboxState("wws_credits", updatedCredits);
    saveSandboxState("wws_sales", updatedSales);

    if (!isDemoMode && firebaseActive) {
      if (isOnline) {
        try {
          await completeCreditRepayment({
            creditId,
            updatedPaid,
            updatedRemaining,
            status,
            updatedRepayments
          });
          await setDoc(doc(db, "sales_ledger", repSaleId), {
            ...repaymentSale,
            timestamp: serverTimestamp()
          });
          triggerNotification(`Repayment of SLe ${amount} logged successfully for ${matchedCredit.customer_name}. Outstanding: SLe ${updatedRemaining}.`);
        } catch (err) {
          console.warn("Firebase credit repayment failed, queuing offline:", err);
          queueSyncItem({
            id: newRepayment.repayment_id,
            type: "credit_repayment",
            payload: { creditId, updatedPaid, updatedRemaining, status, updatedRepayments },
            createdAt: new Date().toISOString()
          });
          triggerNotification(`Saved locally (Offline queue): Repayment of SLe ${amount} for ${matchedCredit.customer_name}.`, "warning");
        }
      } else {
        queueSyncItem({
          id: newRepayment.repayment_id,
          type: "credit_repayment",
          payload: { creditId, updatedPaid, updatedRemaining, status, updatedRepayments },
          createdAt: new Date().toISOString()
        });
        triggerNotification(`Saved locally (Offline, queued): Repayment of SLe ${amount} for ${matchedCredit.customer_name}.`, "warning");
      }
    } else {
      triggerNotification(`Repayment of SLe ${amount} logged (Sandbox) for ${matchedCredit.customer_name}. Outstanding: SLe ${updatedRemaining}.`, "info");
    }
  };

  // TBC COLLECTION HANDLER
  const executeTBCCollection = async (
    tbcId: string,
    collectedBy: string,
    itemsToCollect: { product_id: string; quantity: number }[]
  ) => {
    if (!currentUser) throw new Error("No staff active");
    if (!currentUser.permissions.can_process_sales && currentUser.role !== "admin") {
      throw new Error("Unauthorised transaction attempted.");
    }

    const matchedTBC = tbcs.find((t) => t.tbc_id === tbcId);
    if (!matchedTBC) throw new Error("TBC record not found.");

    // Validate quantities
    const newItems = matchedTBC.items.map((item) => {
      const pendingCol = itemsToCollect.find((col) => col.product_id === item.product_id);
      const qtyToCollect = pendingCol ? pendingCol.quantity : 0;
      const alreadyCollected = item.collected_quantity || 0;
      if (alreadyCollected + qtyToCollect > item.quantity) {
        throw new Error(`Cannot collect ${qtyToCollect} for item ${item.name}. Already collected: ${alreadyCollected}. Paid quantity: ${item.quantity}.`);
      }
      return {
        ...item,
        collected_quantity: alreadyCollected + qtyToCollect
      };
    });

    // Check if everything is collected
    const isFullyCollected = newItems.every((item) => item.collected_quantity === item.quantity);
    const hasAnyCollected = newItems.some((item) => (item.collected_quantity || 0) > 0);
    const newStatus = isFullyCollected ? ("collected" as const) : hasAnyCollected ? ("partial" as const) : ("pending" as const);

    // Create a unique collection record (or separate receipt)
    const collectionId = `COL-${Math.floor(Math.random() * 900000) + 110000}`;
    const newCollectionRecord = {
      collection_id: collectionId,
      collected_at: new Date().toISOString(),
      collected_by: collectedBy,
      staff_id: currentUser.name || currentUser.username,
      items: itemsToCollect
        .filter((c) => c.quantity > 0)
        .map((c) => {
          const tbcItem = matchedTBC.items.find((itm) => itm.product_id === c.product_id);
          return {
            product_id: c.product_id,
            name: tbcItem?.name || "Unknown Product",
            quantity: c.quantity
          };
        })
    };

    const previousCollections = matchedTBC.collections || [];
    const updatedCollections = [...previousCollections, newCollectionRecord];

    // Decrement stock in local state instantly based on todays physical collection
    const updatedProducts = products.map((prod) => {
      const colToday = itemsToCollect.find((c) => c.product_id === prod.id);
      if (colToday && colToday.quantity > 0) {
        return { ...prod, current_stock: Math.max(0, prod.current_stock - colToday.quantity) };
      }
      return prod;
    });

    const updatedTbcs = tbcs.map((t) => {
      if (t.tbc_id === tbcId) {
        return {
          ...t,
          items: newItems,
          status: newStatus,
          collected_by: collectedBy,
          collected_at: new Date().toISOString(),
          collections: updatedCollections
        };
      }
      return t;
    });

    setProducts(updatedProducts);
    setTbcs(updatedTbcs);
    saveSandboxState("wws_products", updatedProducts);
    saveSandboxState("wws_tbcs", updatedTbcs);

    if (!isDemoMode && firebaseActive) {
      if (isOnline) {
        try {
          await completeTBCCollection({
            tbcId,
            collectedBy,
            fullUpdatedItems: newItems,
            status: newStatus,
            updatedCollections: updatedCollections,
            itemsCollectedToday: itemsToCollect
          });
          triggerNotification(`Collected quantities successfully recorded for TBC #${tbcId.slice(-6).toUpperCase()}. Receipt generated!`, "info");
        } catch (err) {
          console.warn("Firebase TBC collection failed, queuing offline:", err);
          queueSyncItem({
            id: tbcId,
            type: "tbc_collection",
            payload: { 
              tbcId, 
              collectedBy, 
              fullUpdatedItems: newItems, 
              status: newStatus, 
              updatedCollections: updatedCollections, 
              itemsCollectedToday: itemsToCollect 
            },
            createdAt: new Date().toISOString()
          });
          triggerNotification(`Saved locally (Offline queue): Recorded collection for TBC #${tbcId.slice(-6).toUpperCase()}.`, "warning");
        }
      } else {
        queueSyncItem({
          id: tbcId,
          type: "tbc_collection",
          payload: { 
            tbcId, 
            collectedBy, 
            fullUpdatedItems: newItems, 
            status: newStatus, 
            updatedCollections: updatedCollections, 
            itemsCollectedToday: itemsToCollect 
          },
          createdAt: new Date().toISOString()
        });
        triggerNotification(`Saved locally (Offline, queued): Recorded collection for TBC #${tbcId.slice(-6).toUpperCase()}.`, "warning");
      }
    } else {
      triggerNotification(`TBC #${tbcId.slice(-6).toUpperCase()} collected quantity recorded (Sandbox) by ${collectedBy}. Receipt generated!`, "info");
    }
  };

  // TBC EXPIRATION RESET FLOW
  const executeTBCExpiration = async (tbcId: string) => {
    const matchedTBC = tbcs.find((t) => t.tbc_id === tbcId);
    if (!matchedTBC) throw new Error("TBC registry card not found.");

    const updatedTbcs = tbcs.map((t) => {
      if (t.tbc_id === tbcId) {
        return { ...t, status: "expired" as const };
      }
      return t;
    });

    setTbcs(updatedTbcs);
    saveSandboxState("wws_tbcs", updatedTbcs);

    if (!isDemoMode && firebaseActive) {
      if (isOnline) {
        try {
          await processTBCExpiration(tbcId, matchedTBC.customer_name);
          triggerNotification(`TBC #${tbcId.slice(-6).toUpperCase()} for ${matchedTBC.customer_name} marked EXPIRED.`, "warning");
        } catch (err) {
          console.warn("Firebase TBC expiration failed, queuing offline:", err);
          queueSyncItem({
            id: tbcId,
            type: "tbc_expiration",
            payload: { tbcId },
            createdAt: new Date().toISOString()
          });
          triggerNotification(`Saved locally (Offline queue): Expirying TBC #${tbcId.slice(-6).toUpperCase()}.`, "warning");
        }
      } else {
        queueSyncItem({
          id: tbcId,
          type: "tbc_expiration",
          payload: { tbcId },
          createdAt: new Date().toISOString()
        });
        triggerNotification(`Saved locally (Offline, queued): Expirying TBC #${tbcId.slice(-6).toUpperCase()}.`, "warning");
      }
    } else {
      triggerNotification(`TBC #${tbcId.slice(-6).toUpperCase()} for ${matchedTBC.customer_name} marked EXPIRED (Sandbox).`, "warning");
    }
  };

  // ADMIN UPDATE STOCK (OFFLOADING)
  const executeUpdateStock = async (productId: string, qty: number) => {
    if (currentUser?.role !== "admin" && !currentUser?.permissions.can_update_stock) {
      throw new Error("Missing of insufficient permissions to update stock list.");
    }

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

    if (!isDemoMode && firebaseActive) {
      if (isOnline) {
        try {
          await offloadProductsStock({
            productId,
            quantityToAdd: qty
          });
          triggerNotification(`Restock Completed: Added +${qty} ${prodName} to shelving counts.`, "info");
        } catch (err) {
          console.warn("Firebase restock failed, queuing offline:", err);
          queueSyncItem({
            id: `RESTOCK-${productId}-${Date.now()}`,
            type: "restock",
            payload: { productId, qty },
            createdAt: new Date().toISOString()
          });
          triggerNotification(`Saved locally (Offline queue): Added +${qty} ${prodName} to shelving counts.`, "warning");
        }
      } else {
        queueSyncItem({
          id: `RESTOCK-${productId}-${Date.now()}`,
          type: "restock",
          payload: { productId, qty },
          createdAt: new Date().toISOString()
        });
        triggerNotification(`Saved locally (Offline, queued): Added +${qty} ${prodName} to shelving counts.`, "warning");
      }
    } else {
      triggerNotification(`Restock Completed (Sandbox): Added +${qty} ${prodName} to shelving counts.`, "info");
    }
  };

  // ADMIN UPDATE PRICE (STRICT ADMIN LOCK)
  const executeUpdatePrice = async (productId: string, price: number) => {
    if (currentUser?.role !== "admin") {
      throw new Error("Missing of insufficient permissions: Only Store Administrators are authorized to update unit pricing policies.");
    }

    const updatedProducts = products.map((prod) => {
      if (prod.id === productId) {
        return { ...prod, unit_price: price };
      }
      return prod;
    });
    setProducts(updatedProducts);
    saveSandboxState("wws_products", updatedProducts);

    const prodName = products.find(p => p.id === productId)?.name || productId;

    if (!isDemoMode && firebaseActive) {
      if (isOnline) {
        try {
          await adminUpdateProductPrice({
            productId,
            newPrice: price
          });
          triggerNotification(`Pricing adjusted: ${prodName} is now SLe ${price}.`, "info");
        } catch (err) {
          console.warn("Firebase price update failed, queuing: ", err);
          queueSyncItem({
            id: `PRICE-${productId}-${Date.now()}`,
            type: "price_update",
            payload: { productId, price },
            createdAt: new Date().toISOString()
          });
          triggerNotification(`Saved locally (Offline queue): ${prodName} price SLe ${price}.`, "warning");
        }
      } else {
        queueSyncItem({
          id: `PRICE-${productId}-${Date.now()}`,
          type: "price_update",
          payload: { productId, price },
          createdAt: new Date().toISOString()
        });
        triggerNotification(`Saved locally (Offline, queued): ${prodName} price SLe ${price}.`, "warning");
      }
    } else {
      triggerNotification(`Pricing adjusted (Sandbox): ${prodName} is now SLe ${price}.`, "info");
    }
  };

  // UPDATE PRODUCT IMAGE (ADMIN OR SALES)
  const executeUpdateProductImage = async (productId: string, imageUrl: string) => {
    if (!currentUser) {
      throw new Error("You must be logged in to update product imagery.");
    }

    const updatedProducts = products.map((prod) => {
      if (prod.id === productId) {
        return { ...prod, image_url: imageUrl };
      }
      return prod;
    });
    setProducts(updatedProducts);
    saveSandboxState("wws_products", updatedProducts);

    const prodName = products.find(p => p.id === productId)?.name || productId;

    if (!isDemoMode && firebaseActive) {
      if (isOnline) {
        try {
          const productRef = doc(db, "products", productId);
          await updateDoc(productRef, {
            image_url: imageUrl
          });
          triggerNotification(`Image updated successfully for product ${prodName}.`, "info");
        } catch (err: any) {
          console.warn("Firebase image update failed, queuing: ", err);
          queueSyncItem({
            id: `IMAGE-${productId}-${Date.now()}`,
            type: "image_update",
            payload: { productId, imageUrl },
            createdAt: new Date().toISOString()
          });
          triggerNotification(`Saved locally (Offline queue): ${prodName} image updated.`, "warning");
        }
      } else {
        queueSyncItem({
          id: `IMAGE-${productId}-${Date.now()}`,
          type: "image_update",
          payload: { productId, imageUrl },
          createdAt: new Date().toISOString()
        });
        triggerNotification(`Saved locally (Offline, queued): ${prodName} image updated.`, "warning");
      }
    } else {
      triggerNotification(`Image updated (Sandbox): ${prodName}.`, "info");
    }
  };

  // LOG CREDIT FOLLOW-UP / DEBT REMINDER CONTACT NOTE
  const executeLogCreditFollowUp = async (
    creditId: string,
    contactOutcome: "promised_payment" | "no_answer" | "disputed" | "refused" | "general_reminder",
    note: string
  ): Promise<void> => {
    if (!currentUser) throw new Error("No active credentials found.");

    const matchedCredit = credits.find((c) => c.credit_id === creditId);
    if (!matchedCredit) throw new Error("Credit registry entry not found.");

    const newFollowUp = {
      timestamp: new Date().toISOString(),
      recorded_by: currentUser.name || currentUser.username || "Staff",
      note: note.trim(),
      contact_outcome: contactOutcome
    };

    const updatedFollowUps = [...(matchedCredit.follow_ups || []), newFollowUp];

    const updatedCredits = credits.map((c) => {
      if (c.credit_id === creditId) {
        return {
          ...c,
          follow_ups: updatedFollowUps
        };
      }
      return c;
    });

    setCredits(updatedCredits);
    saveSandboxState("wws_credits", updatedCredits);

    const outcomeLabels: Record<string, string> = {
      promised_payment: "Promised Payment",
      no_answer: "No Answer / Unreachable",
      disputed: "Disputed Debt Terms",
      refused: "Refused settlement",
      general_reminder: "General Reminder Sent"
    };

    const outcomeText = outcomeLabels[contactOutcome] || contactOutcome;

    if (!isDemoMode && firebaseActive) {
      if (isOnline) {
        try {
          await updateDoc(doc(db, "credits_registry", creditId), {
            follow_ups: updatedFollowUps
          });
          triggerNotification(`Debtor call warning logged for ${matchedCredit.customer_name} (${outcomeText}).`);
        } catch (err: any) {
          console.warn("Firebase credit follow_up update failed, queuing: ", err);
          queueSyncItem({
            id: `FOLLOWUP-${creditId}-${Date.now()}`,
            type: "credit_follow_up" as any,
            payload: { creditId, updatedFollowUps },
            createdAt: new Date().toISOString()
          });
          triggerNotification(`Saved locally (Offline queue): Follow-up logged for ${matchedCredit.customer_name}.`, "warning");
        }
      } else {
        queueSyncItem({
          id: `FOLLOWUP-${creditId}-${Date.now()}`,
          type: "credit_follow_up" as any,
          payload: { creditId, updatedFollowUps },
          createdAt: new Date().toISOString()
        });
        triggerNotification(`Saved locally (Offline, queued): Follow-up call registered.`, "warning");
      }
    } else {
      triggerNotification(`Debtor call warning logged (Sandbox) for ${matchedCredit.customer_name}: ${outcomeText}.`, "info");
    }
  };

  // ENROLL NEW STAFF PROFILE (NABIEU CONTEH ROOT ONLY)
  const registerNewStaffProfile = async (
    name: string,
    username: string,
    password: string,
    role: "admin" | "staff",
    permissions: { can_update_stock: boolean; can_process_sales: boolean }
  ) => {
    if (currentUser?.username?.toLowerCase() !== "nabieu") {
      throw new Error("Only Nabieu's root account is authorized to enroll new personnel / edit user details.");
    }

    const usernameTaken = staffProfiles.some(
      p => p.username?.toLowerCase() === username.trim().toLowerCase()
    );
    if (usernameTaken) {
      throw new Error(`Username "${username}" is already taken. Please choose another one.`);
    }

    const uid = `USER-${Math.floor(Math.random() * 900000) + 100000}`;
    const newStaff: StaffProfile = {
      uid,
      name,
      username: username.trim(),
      password,
      role,
      permissions
    };

    const updatedStaff = [...staffProfiles, newStaff];
    setStaffProfiles(updatedStaff);
    saveSandboxState("wws_staff", updatedStaff);

    if (!isDemoMode && firebaseActive) {
      if (isOnline) {
        try {
          const staffColRef = collection(db, "staff_profiles");
          const newStaffDoc = doc(staffColRef, uid);
          await setDoc(newStaffDoc, newStaff);
          triggerNotification(`New team member registered: ${name} enroled with ${role.toUpperCase()} capabilities.`);
        } catch (err) {
          console.warn("Firebase enroll staff failed, queuing offline:", err);
          queueSyncItem({
            id: uid,
            type: "enroll_staff",
            payload: { staff: newStaff },
            createdAt: new Date().toISOString()
          });
          triggerNotification(`Saved locally (Offline queue): Enrole ${name} as ${role.toUpperCase()}.`, "warning");
        }
      } else {
        queueSyncItem({
          id: uid,
          type: "enroll_staff",
          payload: { staff: newStaff },
          createdAt: new Date().toISOString()
        });
        triggerNotification(`Saved locally (Offline, queued): Enrole ${name} as ${role.toUpperCase()}.`, "warning");
      }
    } else {
      triggerNotification(`New team member registered (Sandbox): ${name} enroled with ${role.toUpperCase()} capabilities.`);
    }
  };

  // ADD PRODUCT (ADMIN ONLY)
  const executeAddProduct = async (
    id: string,
    name: string,
    category: string,
    unit_price: number,
    current_stock: number,
    image_url?: string
  ) => {
    if (currentUser?.role !== "admin") {
      throw new Error("Only store administrators are authorized to add new catalog items.");
    }

    const payload: Product = {
      id,
      name,
      category,
      unit_price,
      current_stock,
      total_offloaded: current_stock,
      image_url: image_url || ""
    };

    const exists = products.some(p => p.id === id);
    if (exists) {
      throw new Error(`Product SKU code "${id}" already exists in store catalog.`);
    }

    const updated = [...products, payload];
    setProducts(updated.sort((a,b) => a.id.localeCompare(b.id)));
    saveSandboxState("wws_products", updated);

    if (!isDemoMode && firebaseActive) {
      if (isOnline) {
        try {
          await adminCreateProduct(payload);
          triggerNotification(`New item added to stock shelf: [${id}] ${name} at SLe ${unit_price}.`);
        } catch (err) {
          console.warn("Firebase create product failed, queuing offline:", err);
          queueSyncItem({
            id,
            type: "add_product",
            payload: { product: payload },
            createdAt: new Date().toISOString()
          });
          triggerNotification(`Saved locally (Offline queue): SKU [${id}] ${name}.`, "warning");
        }
      } else {
        queueSyncItem({
          id,
          type: "add_product",
          payload: { product: payload },
          createdAt: new Date().toISOString()
        });
        triggerNotification(`Saved locally (Offline, queued): SKU [${id}] ${name}.`, "warning");
      }
    } else {
      triggerNotification(`New item added to stock shelf (Sandbox): [${id}] ${name} at SLe ${unit_price}.`);
    }
  };

  // ADD CATEGORY (ADMIN ONLY)
  const executeAddCategory = async (name: string) => {
    if (currentUser?.role !== "admin") {
      throw new Error("Only store administrators are authorized to add new goods categories.");
    }
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("Category name cannot represent an empty string.");
    }
    const exists = categories.some(c => c.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      throw new Error(`Category "${trimmed}" already exists in the Store catalog.`);
    }

    const updated = [...categories, trimmed];
    setCategories(updated);
    saveSandboxState("wws_categories", updated);

    if (!isDemoMode && firebaseActive) {
      try {
        const id = trimmed.toLowerCase().replace(/\s+/g, "_");
        const docRef = doc(db, "goods_categories", id);
        await setDoc(docRef, { name: trimmed });
        triggerNotification(`New goods category defined: ${trimmed}`);
      } catch (err: any) {
        console.error("Firebase store category failed:", err);
        throw new Error(err.message || "Failed to synchronise new category to Firestore.");
      }
    } else {
      triggerNotification(`New goods category defined (Sandbox): ${trimmed}`);
    }
  };

  // DELETE CATEGORY (ADMIN ONLY)
  const executeDeleteCategory = async (name: string) => {
    if (currentUser?.role !== "admin") {
      throw new Error("Only store administrators are authorized to delete goods categories.");
    }
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("Category name cannot represent an empty string.");
    }

    // Filter from state & local storage
    const updated = categories.filter(c => c.toLowerCase() !== trimmed.toLowerCase());
    setCategories(updated);
    saveSandboxState("wws_categories", updated);

    // Also remove from Firebase if active
    if (!isDemoMode && firebaseActive) {
      try {
        const id = trimmed.toLowerCase().replace(/\s+/g, "_");
        const docRef = doc(db, "goods_categories", id);
        await deleteDoc(docRef);
        triggerNotification(`Goods category deleted: ${trimmed}`, "warning");
      } catch (err: any) {
        console.error("Firebase delete category failed:", err);
        throw new Error(err.message || "Failed to delete category from Firestore.");
      }
    } else {
      triggerNotification(`Goods category deleted (Sandbox): ${trimmed}`, "warning");
    }
  };

  // DELETE PRODUCT (ADMIN ONLY)
  const executeDeleteProduct = async (productId: string) => {
    if (currentUser?.role !== "admin") {
      throw new Error("Only store administrators are authorized to delete items from the catalog.");
    }

    const updated = products.filter(p => p.id !== productId);
    setProducts(updated);
    saveSandboxState("wws_products", updated);

    if (!isDemoMode && firebaseActive) {
      if (isOnline) {
        try {
          await adminDeleteProduct(productId);
          triggerNotification(`Stock item reference ${productId} deleted from catalog.`, "warning");
        } catch (err) {
          console.warn("Firebase delete product failed, queuing offline:", err);
          queueSyncItem({
            id: productId,
            type: "delete_product",
            payload: { productId },
            createdAt: new Date().toISOString()
          });
          triggerNotification(`Saved locally (Offline queue): Delete SKU ${productId}.`, "warning");
        }
      } else {
        queueSyncItem({
          id: productId,
          type: "delete_product",
          payload: { productId },
          createdAt: new Date().toISOString()
        });
        triggerNotification(`Saved locally (Offline, queued): Delete SKU ${productId}.`, "warning");
      }
    } else {
      triggerNotification(`Stock item reference ${productId} deleted from catalog (Sandbox).`, "warning");
    }
  };

  // DELETE STAFF (NABIEU CONTEH ROOT ONLY)
  const executeDeleteStaffProfile = async (uid: string) => {
    if (currentUser?.username?.toLowerCase() !== "nabieu") {
      throw new Error("Only Nabieu's root account is authorized to delete or modify user profiles.");
    }
    if (uid === "SYSTEM_ROOT_ADMIN") {
      throw new Error("You cannot delete the root store administrator profile.");
    }

    const updated = staffProfiles.filter(user => user.uid !== uid);
    setStaffProfiles(updated);
    saveSandboxState("wws_staff", updated);

    if (!isDemoMode && firebaseActive) {
      if (isOnline) {
        try {
          await adminDeleteStaffProfile(uid);
          triggerNotification(`Personnel profile key ${uid} deleted from Team database.`, "warning");
        } catch (err) {
          console.warn("Firebase delete staff failed, queuing offline:", err);
          queueSyncItem({
            id: uid,
            type: "delete_staff",
            payload: { uid },
            createdAt: new Date().toISOString()
          });
          triggerNotification(`Saved locally (Offline queue): Remove user key ${uid}.`, "warning");
        }
      } else {
        queueSyncItem({
          id: uid,
          type: "delete_staff",
          payload: { uid },
          createdAt: new Date().toISOString()
        });
        triggerNotification(`Saved locally (Offline, queued): Remove user key ${uid}.`, "warning");
      }
    } else {
      triggerNotification(`Personnel profile key ${uid} deleted from Team database (Sandbox).`, "warning");
    }
  };

  // ADMIN DIRECT STOCK OVERRIDE (CORRECT HUMAN ERROR)
  const executeOverrideStock = async (productId: string, exactStock: number) => {
    if (currentUser?.role !== "admin") {
      throw new Error("Only store administrators are authorized to rewrite stock levels directly.");
    }

    const updatedProducts = products.map((prod) => {
      if (prod.id === productId) {
        return { ...prod, current_stock: exactStock };
      }
      return prod;
    });
    setProducts(updatedProducts);
    saveSandboxState("wws_products", updatedProducts);

    const prodName = products.find(p => p.id === productId)?.name || productId;

    if (!isDemoMode && firebaseActive) {
      if (isOnline) {
        try {
          await adminOverrideProductStock({
            productId,
            exactStock
          });
          triggerNotification(`Stock override applied: ${prodName} count set to exactly ${exactStock}.`, "warning");
        } catch (err) {
          console.warn("Firebase override stock failed, queuing offline:", err);
          queueSyncItem({
            id: `OVERRIDE-${productId}-${Date.now()}`,
            type: "override_stock",
            payload: { productId, exactStock },
            createdAt: new Date().toISOString()
          });
          triggerNotification(`Saved locally (Offline queue): Set SKU ${productId} count to exactly ${exactStock}.`, "warning");
        }
      } else {
        queueSyncItem({
          id: `OVERRIDE-${productId}-${Date.now()}`,
          type: "override_stock",
          payload: { productId, exactStock },
          createdAt: new Date().toISOString()
        });
        triggerNotification(`Saved locally (Offline, queued): Set SKU ${productId} count to exactly ${exactStock}.`, "warning");
      }
    } else {
      triggerNotification(`Stock override applied (Sandbox): ${prodName} count set to exactly ${exactStock}.`, "warning");
    }
  };

  // LOG EXPENDITURE
  const executeAddExpenditure = async (description: string, amount: number, category: string, authorizedBy?: string) => {
    const expenditureId = `EXP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newExpenditure: Expenditure = {
      id: expenditureId,
      description,
      amount,
      category,
      recorded_by: currentUser?.name || "Anonymous Staff",
      timestamp: new Date().toISOString(),
      ...(authorizedBy ? { authorized_by: authorizedBy } : {})
    };

    // Always update local state instantly
    const updated = [newExpenditure, ...expenditures];
    setExpenditures(updated);
    saveSandboxState("wws_expenditures", updated);

    if (!isDemoMode && firebaseActive) {
      if (isOnline) {
        try {
          await setDoc(doc(db, "expenditures", expenditureId), {
            ...newExpenditure,
            timestamp: serverTimestamp()
          });
          triggerNotification(`Expenditure logged: SLe ${amount} spent on ${category} (${description})`);
        } catch (err) {
          console.warn("Firebase add expenditure failed, queuing offline:", err);
          queueSyncItem({
            id: expenditureId,
            type: "add_expenditure",
            payload: { expenditure: newExpenditure },
            createdAt: new Date().toISOString()
          });
          triggerNotification(`Saved locally (Offline queue): logged SLe ${amount} spent on ${category}.`, "warning");
        }
      } else {
        queueSyncItem({
          id: expenditureId,
          type: "add_expenditure",
          payload: { expenditure: newExpenditure },
          createdAt: new Date().toISOString()
        });
        triggerNotification(`Saved locally (Offline, queued): logged SLe ${amount} spent on ${category}.`, "warning");
      }
    } else {
      triggerNotification(`Expenditure logged (Sandbox): SLe ${amount} spent on ${category} (${description})`);
    }
  };

  // LOG BANK DEPOSIT
  const executeAddBankDeposit = async (amount: number, bankName: string, depositedBy: string, slipSerial?: string) => {
    const depositId = `DEP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newDeposit: BankDeposit = {
      id: depositId,
      amount,
      bank_name: bankName,
      deposited_by: depositedBy,
      recorded_by: currentUser?.name || "Anonymous Staff",
      timestamp: new Date().toISOString(),
      slip_serial: slipSerial ? slipSerial.trim() : ""
    };

    // Always update local state instantly
    const updated = [newDeposit, ...bankDeposits];
    setBankDeposits(updated);
    saveSandboxState("wws_bank_deposits", updated);

    if (!isDemoMode && firebaseActive) {
      if (isOnline) {
        try {
          await setDoc(doc(db, "bank_deposits", depositId), {
            ...newDeposit,
            timestamp: serverTimestamp()
          });
          triggerNotification(`Bank Deposit Recorded: SLe ${amount} deposited into ${bankName} by ${depositedBy}`);
        } catch (err) {
          console.warn("Firebase bank deposit failed, queuing offline:", err);
          queueSyncItem({
            id: depositId,
            type: "add_bank_deposit",
            payload: { deposit: newDeposit },
            createdAt: new Date().toISOString()
          });
          triggerNotification(`Saved locally (Offline queue): Deposit SLe ${amount} in ${bankName}.`, "warning");
        }
      } else {
        queueSyncItem({
          id: depositId,
          type: "add_bank_deposit",
          payload: { deposit: newDeposit },
          createdAt: new Date().toISOString()
        });
        triggerNotification(`Saved locally (Offline, queued): Deposit SLe ${amount} in ${bankName}.`, "warning");
      }
    } else {
      triggerNotification(`Bank Deposit Recorded (Sandbox): SLe ${amount} deposited into ${bankName} by ${depositedBy}`);
    }
  };

  const adminResetAllData = async () => {
    if (currentUser?.username?.toLowerCase() !== "nabieu") {
      throw new Error("Only Nabieu's root account is authorized to perform database resets.");
    }

    const resetProducts = SEED_PRODUCTS.map((p) => ({
      ...p,
      stock: 0
    }));

    setSales([]);
    setTbcs([]);
    setExpenditures([]);
    setBankDeposits([]);
    setNotifications([]);
    setProducts(resetProducts);

    saveSandboxState("wws_sales", []);
    saveSandboxState("wws_tbcs", []);
    saveSandboxState("wws_expenditures", []);
    saveSandboxState("wws_bank_deposits", []);
    saveSandboxState("wws_alerts", []);
    saveSandboxState("wws_products", resetProducts);

    triggerNotification(
      "DATABASE OPERATIONAL RESET COMPLETE! All store stocks are set to exactly 0 (prices preserved). Active Stock Shortage Alarms are now triggered. RESTOCKING IS MANDATORY before processing any transactions.",
      "warning"
    );

    if (!isDemoMode && firebaseActive && isOnline) {
      try {
        for (const s of sales) {
          try {
            await deleteDoc(doc(db, "sales_ledger", s.sale_id));
          } catch (e) {
            console.error("Failed to delete sale", s.sale_id, e);
          }
        }
        for (const t of tbcs) {
          try {
            await deleteDoc(doc(db, "tbc_registry", t.tbc_id));
          } catch (e) {
            console.error("Failed to delete tbc", t.tbc_id, e);
          }
        }
        for (const e of expenditures) {
          try {
            await deleteDoc(doc(db, "expenditures", e.id));
          } catch (err) {
            console.error("Failed to delete expenditure", e.id, err);
          }
        }
        for (const d of bankDeposits) {
          try {
            await deleteDoc(doc(db, "bank_deposits", d.id));
          } catch (err) {
            console.error("Failed to delete deposit", d.id, err);
          }
        }
        for (const p of resetProducts) {
          try {
            await setDoc(doc(db, "products", p.id), p);
          } catch (err) {
            console.error("Failed to reseed product", p.id, err);
          }
        }
      } catch (err) {
        console.error("Error resetting online database maps:", err);
      }
    }
  };

  const adminDeleteSale = async (saleId: string) => {
    if (currentUser?.username?.toLowerCase() !== "nabieu") {
      throw new Error("Only Nabieu's root account is authorized to modify or delete completed sale invoices.");
    }

    const updated = sales.filter((s) => s.sale_id !== saleId);
    setSales(updated);
    saveSandboxState("wws_sales", updated);
    triggerNotification(`Sale invoice #${saleId.slice(-6).toUpperCase()} deleted permanently.`, "warning");

    if (!isDemoMode && firebaseActive && isOnline) {
      try {
        await deleteDoc(doc(db, "sales_ledger", saleId));
      } catch (err) {
        console.error("Error deleting sale online:", err);
      }
    }
  };

  const adminEditSale = async (saleId: string, updatedFields: Partial<Sale>) => {
    if (currentUser?.username?.toLowerCase() !== "nabieu") {
      throw new Error("Only Nabieu's root account is authorized to edit completed sale invoices.");
    }

    const updated = sales.map((s) => {
      if (s.sale_id === saleId) {
        return { ...s, ...updatedFields };
      }
      return s;
    });
    setSales(updated);
    saveSandboxState("wws_sales", updated);
    triggerNotification(`Sale invoice #${saleId.slice(-6).toUpperCase()} amended.`, "info");

    if (!isDemoMode && firebaseActive && isOnline) {
      try {
        await updateDoc(doc(db, "sales_ledger", saleId), updatedFields);
      } catch (err) {
        console.error("Error updating sale online:", err);
      }
    }
  };

  const adminDeleteTbc = async (tbcId: string) => {
    if (currentUser?.username?.toLowerCase() !== "nabieu") {
      throw new Error("Only Nabieu's root account is authorized to modify or delete TBC tickets.");
    }

    const updated = tbcs.filter((t) => t.tbc_id !== tbcId);
    setTbcs(updated);
    saveSandboxState("wws_tbcs", updated);
    triggerNotification(`TBC Ticket #${tbcId.slice(-6).toUpperCase()} deleted permanently.`, "warning");

    if (!isDemoMode && firebaseActive && isOnline) {
      try {
        await deleteDoc(doc(db, "tbc_registry", tbcId));
      } catch (err) {
        console.error("Error deleting tbc online:", err);
      }
    }
  };

  const adminEditTbc = async (tbcId: string, updatedFields: Partial<TBCRegistry>) => {
    if (currentUser?.username?.toLowerCase() !== "nabieu") {
      throw new Error("Only Nabieu's root account is authorized to edit TBC tickets.");
    }

    const updated = tbcs.map((t) => {
      if (t.tbc_id === tbcId) {
        return { ...t, ...updatedFields };
      }
      return t;
    });
    setTbcs(updated);
    saveSandboxState("wws_tbcs", updated);
    triggerNotification(`TBC Ticket #${tbcId.slice(-6).toUpperCase()} updated.`, "info");

    if (!isDemoMode && firebaseActive && isOnline) {
      try {
        await updateDoc(doc(db, "tbc_registry", tbcId), updatedFields);
      } catch (err) {
        console.error("Error updating tbc online:", err);
      }
    }
  };

  const adminDeleteCredit = async (creditId: string) => {
    if (currentUser?.username?.toLowerCase() !== "nabieu") {
      throw new Error("Only Nabieu's root account is authorized to modify or delete Credit accounts.");
    }

    const updated = credits.filter((c) => c.credit_id !== creditId);
    setCredits(updated);
    saveSandboxState("wws_credits", updated);
    triggerNotification(`Credit Account #${creditId.slice(-6).toUpperCase()} deleted permanently.`, "warning");

    if (!isDemoMode && firebaseActive && isOnline) {
      try {
        await deleteDoc(doc(db, "credits_registry", creditId));
      } catch (err) {
        console.error("Error deleting credit online:", err);
      }
    }
  };

  const adminEditCredit = async (creditId: string, updatedFields: Partial<CreditRegistry>) => {
    if (currentUser?.username?.toLowerCase() !== "nabieu") {
      throw new Error("Only Nabieu's root account is authorized to edit Credit accounts.");
    }

    const updated = credits.map((c) => {
      if (c.credit_id === creditId) {
        return { ...c, ...updatedFields };
      }
      return c;
    });
    setCredits(updated);
    saveSandboxState("wws_credits", updated);
    triggerNotification(`Credit Account #${creditId.slice(-6).toUpperCase()} updated.`, "info");

    if (!isDemoMode && firebaseActive && isOnline) {
      try {
        await updateDoc(doc(db, "credits_registry", creditId), updatedFields);
      } catch (err) {
        console.error("Error updating credit online:", err);
      }
    }
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        sales,
        tbcs,
        credits,
        staffProfiles,
        notifications,
        expenditures,
        bankDeposits,
        currentUser,
        categories,
        executeAddCategory,
        executeDeleteCategory,
        firebaseActive,
        isOnline,
        seedingRequired,
        isDemoMode,
        setDemoMode,
        pendingSyncCount: pendingSync.length,
        isSyncing,
        lastSyncedTime,
        syncOfflineData,
        clearPendingSyncQueue,
        login,
        logout,
        adminChangePassword,
        executeImmediateSale,
        executeTBCRegistration,
        executeTBCCollection,
        executeTBCExpiration,
        executeCreditRegistration,
        executeCreditRepayment,
        executeLogCreditFollowUp,
        executeUpdateStock,
        executeUpdatePrice,
        executeUpdateProductImage,
        executeOverrideStock,
        executeSeedData,
        setCurrentUserRole,
        registerNewStaffProfile,
        executeAddProduct,
        executeDeleteProduct,
        executeDeleteStaffProfile,
        executeAddExpenditure,
        executeAddBankDeposit,
        adminResetAllData,
        adminDeleteSale,
        adminEditSale,
        adminDeleteTbc,
        adminEditTbc,
        adminDeleteCredit,
        adminEditCredit,
        soundEnabled,
        setSoundEnabled,
        nativePermissionStatus,
        requestNotificationPermission,
        playNotificationSound,
        activeToasts,
        dismissToast
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
