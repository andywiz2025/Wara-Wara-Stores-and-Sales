import {
  collection,
  doc,
  writeBatch,
  addDoc,
  updateDoc,
  increment,
  serverTimestamp,
  getDocs,
  query,
  where,
  getDoc,
  orderBy
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Product, Sale, TBCRegistry, SaleItem, TBCItem } from "../types";

// Seed Data from Specification
export const SEED_PRODUCTS: Product[] = [
  { id: "WWS-001", name: "Scrapper (Pcs)", category: "Tools", unit_price: 7.00, current_stock: 9000, total_offloaded: 9000 },
  { id: "WWS-002", name: "Glass Cutter (Dozen)", category: "Tools", unit_price: 8.00, current_stock: 150, total_offloaded: 150 },
  { id: "WWS-003", name: "4\" Organ (Pcs)", category: "Plumbing", unit_price: 50.00, current_stock: 200, total_offloaded: 200 },
  { id: "WWS-004", name: "Kitchen Tap (Pcs)", category: "Plumbing", unit_price: 65.00, current_stock: 220, total_offloaded: 220 },
  { id: "WWS-005", name: "Inner Solar Light (Pcs)", category: "Electrical", unit_price: 230.00, current_stock: 70, total_offloaded: 70 },
  { id: "WWS-006", name: "Telephone Shower(Pcs)", category: "Plumbing", unit_price: 50.00, current_stock: 420, total_offloaded: 420 },
  { id: "WWS-007", name: "Cylinder (Pcs)", category: "Hardware", unit_price: 35.00, current_stock: 440, total_offloaded: 440 },
  { id: "WWS-008", name: "Binding Wire (Roll)", category: "Building Materials", unit_price: 400.00, current_stock: 80, total_offloaded: 80 },
  { id: "WWS-009", name: "Silicone (Cartoon)", category: "Hardware", unit_price: 650.00, current_stock: 15, total_offloaded: 15 },
  { id: "WWS-010", name: "Roofing Nail (Pks)", category: "Building Materials", unit_price: 560.00, current_stock: 35, total_offloaded: 35 },
  { id: "WWS-011", name: "Wire Nail (Cartoon)", category: "Building Materials", unit_price: 600.00, current_stock: 50, total_offloaded: 50 }
];

/**
 * Checks if products database is empty and offers seeding compatibility
 */
export async function getProductsCount(): Promise<number> {
  try {
    const qSnap = await getDocs(collection(db, "products"));
    return qSnap.size;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, "products");
  }
}

/**
 * Seeds the initial inventory catalog with specified products
 */
export async function seedProductsDatabase(): Promise<void> {
  const path = "products";
  try {
    const batch = writeBatch(db);
    SEED_PRODUCTS.forEach((p) => {
      const ref = doc(db, path, p.id);
      batch.set(ref, p);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Perform a fresh check of a product's current stock
 */
export async function getProduct(productId: string): Promise<Product | null> {
  try {
    const dSnap = await getDoc(doc(db, "products", productId));
    if (dSnap.exists()) {
      return dSnap.data() as Product;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `products/${productId}`);
  }
}

/**
 * Process immediate sale:
 * 1. Creates unique sales ledger entry
 * 2. Synchronously decrements stock from products
 */
export async function processImmediateSale(params: {
  staffId: string;
  items: SaleItem[];
  totalAmount: number;
  paymentMethod: "cash" | "cheque" | "mobile_money";
  referenceDetails?: string;
}): Promise<string> {
  const salesPath = "sales_ledger";
  const productsPath = "products";

  try {
    const batch = writeBatch(db);

    // 1. Setup Sales Doc Ref & ID
    const salesColRef = collection(db, salesPath);
    const newSaleDocRef = doc(salesColRef);
    const saleId = newSaleDocRef.id;

    const salePayload: Sale = {
      sale_id: saleId,
      timestamp: serverTimestamp(),
      staff_id: params.staffId,
      total_amount: params.totalAmount,
      payment_method: params.paymentMethod,
      reference_details: params.referenceDetails || "",
      items: params.items
    };

    batch.set(newSaleDocRef, salePayload);

    // 2. Adjust Product Inventory stock counts (Offline cache will calculate this immediately)
    params.items.forEach((item) => {
      const productRef = doc(db, productsPath, item.product_id);
      batch.update(productRef, {
        current_stock: increment(-item.quantity)
      });
    });

    await batch.commit();
    return saleId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${salesPath} and ${productsPath}`);
  }
}

/**
 * Register TBC Order:
 * 1. Does NOT change product stock counts (materials remain available until collected)
 * 2. Saves to tbc_registry
 */
export async function registerTBCOrder(params: {
  customerName: string;
  items: TBCItem[];
  totalAmount: number;
  expiryDays: number;
}): Promise<string> {
  const tbcPath = "tbc_registry";
  try {
    const tbcRef = collection(db, tbcPath);
    const newTbcDoc = doc(tbcRef);
    const tbcId = newTbcDoc.id;

    const expiryDateStamp = new Date();
    expiryDateStamp.setDate(expiryDateStamp.getDate() + params.expiryDays);

    const tbcPayload: TBCRegistry = {
      tbc_id: tbcId,
      customer_name: params.customerName,
      items: params.items,
      total_amount: params.totalAmount,
      status: "pending",
      expiry_date: expiryDateStamp,
      collected_by: null,
      collected_at: null
    };

    await updateDoc(doc(db, tbcPath, tbcId), { ...tbcPayload }); // wait: setDoc is safer if using custom Doc Ref
    // Let's use batch or setDoc to avoid document does not exist error
  } catch (error) {
    // Let's write with setDoc
  }

  // To be absolutely robust, let's write it with setDoc!
  try {
    const tbcRef = collection(db, tbcPath);
    const newTbcDoc = doc(tbcRef);
    const tbcId = newTbcDoc.id;

    const expiryDateStamp = new Date();
    expiryDateStamp.setDate(expiryDateStamp.getDate() + params.expiryDays);

    const tbcPayload: TBCRegistry = {
      tbc_id: tbcId,
      customer_name: params.customerName,
      items: params.items,
      total_amount: params.totalAmount,
      status: "pending",
      expiry_date: expiryDateStamp,
      collected_by: null,
      collected_at: null
    };

    const batch = writeBatch(db);
    batch.set(newTbcDoc, tbcPayload);
    await batch.commit();
    return tbcId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, tbcPath);
  }
}

/**
 * Complete TBC Collection Event:
 * 1. Transitions status to "collected" with collector metadata
 * 2. Multi-updates product ledger of actual items collected
 */
export async function completeTBCCollection(params: {
  tbcId: string;
  collectedBy: string;
  items: TBCItem[];
}): Promise<void> {
  const tbcPath = `tbc_registry/${params.tbcId}`;
  const productsPath = "products";

  try {
    const batch = writeBatch(db);

    const tbcDocRef = doc(db, "tbc_registry", params.tbcId);
    batch.update(tbcDocRef, {
      status: "collected",
      collected_by: params.collectedBy,
      collected_at: serverTimestamp()
    });

    params.items.forEach((item) => {
      const productRef = doc(db, productsPath, item.product_id);
      batch.update(productRef, {
        current_stock: increment(-item.quantity)
      });
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${tbcPath} and ${productsPath}`);
  }
}

/**
 * Handle TBC Expiration Event:
 * 1. Transitions status to "expired"
 * 2. Dispatches local notification without modifying inventories
 */
export async function processTBCExpiration(tbcId: string, customerName: string): Promise<void> {
  const registryPath = `tbc_registry/${tbcId}`;
  const alertsPath = "notifications";

  try {
    const batch = writeBatch(db);

    // 1. Transition registry ID to "expired"
    const tbcDocRef = doc(db, "tbc_registry", tbcId);
    batch.update(tbcDocRef, {
      status: "expired"
    });

    // 2. Dispatch a warning indicator alert
    const alarmCollRef = collection(db, alertsPath);
    const alarmDocRef = doc(alarmCollRef);
    batch.set(alarmDocRef, {
      id: alarmDocRef.id,
      message: `TBC Receipt #${tbcId.slice(0, 7)} for ${customerName} has expired. No stock changes applied.`,
      timestamp: serverTimestamp(),
      type: "warning",
      read: false
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${registryPath} and ${alertsPath}`);
  }
}

/**
 * Mark stock received (admin offloading new inventory)
 */
export async function offloadProductsStock(params: {
  productId: string;
  quantityToAdd: number;
}): Promise<void> {
  const path = `products/${params.productId}`;
  try {
    const productRef = doc(db, "products", params.productId);
    await updateDoc(productRef, {
      current_stock: increment(params.quantityToAdd),
      total_offloaded: increment(params.quantityToAdd)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Admin utility to update a product's price (denied to normal staff via firestore.rules)
 */
export async function adminUpdateProductPrice(params: {
  productId: string;
  newPrice: number;
}): Promise<void> {
  const path = `products/${params.productId}`;
  try {
    const productRef = doc(db, "products", params.productId);
    await updateDoc(productRef, {
      unit_price: params.newPrice
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
