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
  orderBy,
  deleteDoc,
  setDoc
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import toolsPlaceholder from "../assets/images/tools_placeholder_1779651584388.png";
import plumbingPlaceholder from "../assets/images/plumbing_placeholder_1779651601971.png";
import electricalPlaceholder from "../assets/images/electrical_placeholder_1779651620426.png";
import hardwarePlaceholder from "../assets/images/hardware_placeholder_1779651640628.png";
import buildingPlaceholder from "../assets/images/building_placeholder_1779651656793.png";

import { Product, Sale, TBCRegistry, SaleItem, TBCItem, CreditRegistry, CreditRepayment } from "../types";

// Seed Data from Specification
export const SEED_PRODUCTS: Product[] = [
  { id: "WWS-001", name: "Scrapper (Pcs)", category: "Tools", unit_price: 7.00, current_stock: 9000, total_offloaded: 9000, image_url: toolsPlaceholder },
  { id: "WWS-002", name: "Glass Cutter (Dozen)", category: "Tools", unit_price: 8.00, current_stock: 150, total_offloaded: 150, image_url: toolsPlaceholder },
  { id: "WWS-003", name: "4\" Organ (Pcs)", category: "Plumbing", unit_price: 50.00, current_stock: 200, total_offloaded: 200, image_url: plumbingPlaceholder },
  { id: "WWS-004", name: "Kitchen Tap (Pcs)", category: "Plumbing", unit_price: 65.00, current_stock: 220, total_offloaded: 220, image_url: plumbingPlaceholder },
  { id: "WWS-005", name: "Inner Solar Light (Pcs)", category: "Electrical", unit_price: 230.00, current_stock: 70, total_offloaded: 70, image_url: electricalPlaceholder },
  { id: "WWS-006", name: "Telephone Shower(Pcs)", category: "Plumbing", unit_price: 50.00, current_stock: 420, total_offloaded: 420, image_url: plumbingPlaceholder },
  { id: "WWS-007", name: "Cylinder (Pcs)", category: "Hardware", unit_price: 35.00, current_stock: 440, total_offloaded: 440, image_url: hardwarePlaceholder },
  { id: "WWS-008", name: "Binding Wire (Roll)", category: "Building Materials", unit_price: 400.00, current_stock: 80, total_offloaded: 80, image_url: buildingPlaceholder },
  { id: "WWS-009", name: "Silicone (Cartoon)", category: "Hardware", unit_price: 650.00, current_stock: 15, total_offloaded: 15, image_url: hardwarePlaceholder },
  { id: "WWS-010", name: "Roofing Nail (Pks)", category: "Building Materials", unit_price: 560.00, current_stock: 35, total_offloaded: 35, image_url: buildingPlaceholder },
  { id: "WWS-011", name: "Wire Nail (Cartoon)", category: "Building Materials", unit_price: 600.00, current_stock: 50, total_offloaded: 50, image_url: buildingPlaceholder }
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
  customerName?: string;
  physicalReceiptNo?: string;
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
      customer_name: params.customerName || "Walk-in Customer",
      total_amount: params.totalAmount,
      payment_method: params.paymentMethod,
      reference_details: params.referenceDetails || "",
      items: params.items,
      physical_receipt_no: params.physicalReceiptNo || ""
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
 * 3. Also registers prepaid sale in sales_ledger with 'tbc' payment method (added to revenue)
 */
export async function registerTBCOrder(params: {
  tbcId: string;
  customerName: string;
  items: TBCItem[];
  totalAmount: number;
  expiryDays: number;
  staffName: string;
  physicalReceiptNo?: string;
}): Promise<void> {
  const tbcPath = "tbc_registry";
  const salesLedgerPath = "sales_ledger";
  try {
    const tbcRef = doc(db, tbcPath, params.tbcId);

    const expiryDateStamp = new Date();
    expiryDateStamp.setDate(expiryDateStamp.getDate() + params.expiryDays);

    const tbcPayload: TBCRegistry = {
      tbc_id: params.tbcId,
      customer_name: params.customerName,
      items: params.items,
      total_amount: params.totalAmount,
      status: "pending",
      expiry_date: expiryDateStamp,
      collected_by: null,
      collected_at: null,
      physical_receipt_no: params.physicalReceiptNo || ""
    };

    const saleId = `SALE-TBC-${params.tbcId.slice(-6).toUpperCase()}`;
    const saleDocRef = doc(db, salesLedgerPath, saleId);

    const salePayload: Sale = {
      sale_id: saleId,
      timestamp: serverTimestamp(),
      staff_id: params.staffName,
      customer_name: params.customerName,
      total_amount: params.totalAmount,
      payment_method: "tbc",
      reference_details: `TBC Ticket ID: ${params.tbcId}`,
      items: params.items.map((i) => ({
        product_id: i.product_id,
        name: i.name,
        quantity: i.quantity,
        unit_cost: i.unit_cost
      })),
      physical_receipt_no: params.physicalReceiptNo || ""
    };

    const batch = writeBatch(db);
    batch.set(tbcRef, tbcPayload);
    batch.set(saleDocRef, salePayload);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${tbcPath} and ${salesLedgerPath}`);
  }
}

/**
 * Complete TBC Collection Event:
 * 1. Updates status to "collected" or "partial" with collector metadata
 * 2. Multi-updates product ledger of actual items collected in this batch
 */
export async function completeTBCCollection(params: {
  tbcId: string;
  collectedBy: string;
  fullUpdatedItems: TBCItem[];
  status: "pending" | "partial" | "collected" | "expired";
  updatedCollections: any[];
  itemsCollectedToday: { product_id: string; quantity: number }[];
}): Promise<void> {
  const tbcPath = `tbc_registry/${params.tbcId}`;
  const productsPath = "products";

  try {
    const batch = writeBatch(db);

    const tbcDocRef = doc(db, "tbc_registry", params.tbcId);
    batch.update(tbcDocRef, {
      status: params.status,
      items: params.fullUpdatedItems,
      collected_by: params.collectedBy,
      collected_at: serverTimestamp(),
      collections: params.updatedCollections
    });

    params.itemsCollectedToday.forEach((item) => {
      if (item.quantity > 0) {
        const productRef = doc(db, productsPath, item.product_id);
        batch.update(productRef, {
          current_stock: increment(-item.quantity)
        });
      }
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

/**
 * Admin utility to overwrite current stock levels directly for correction anomalies
 */
export async function adminOverrideProductStock(params: {
  productId: string;
  exactStock: number;
}): Promise<void> {
  const path = `products/${params.productId}`;
  try {
    const productRef = doc(db, "products", params.productId);
    await updateDoc(productRef, {
      current_stock: params.exactStock
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Admin utility to create a new product
 */
export async function adminCreateProduct(product: Product): Promise<void> {
  const path = `products/${product.id}`;
  try {
    const productRef = doc(db, "products", product.id);
    await setDoc(productRef, product);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Admin utility to delete an existing product SKU
 */
export async function adminDeleteProduct(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    const productRef = doc(db, "products", productId);
    await deleteDoc(productRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Admin utility to delete a staff profile document from database
 */
export async function adminDeleteStaffProfile(uid: string): Promise<void> {
  const path = `staff_profiles/${uid}`;
  try {
    const staffRef = doc(db, "staff_profiles", uid);
    await deleteDoc(staffRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Register Credit Sale:
 * 1. Deducts product stock counts immediately since goods are collected
 * 2. Saves to credits_registry (with status unpaid/partial/paid, balance trackers)
 * 3. Registers sale record in sales_ledger with 'credit' payment method
 */
export async function registerCreditSale(params: {
  creditId: string;
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  totalAmount: number;
  amountPaid: number;
  remainingBalance: number;
  dueDateDays: number;
  staffName: string;
  physicalReceiptNo?: string;
}): Promise<void> {
  const creditsPath = "credits_registry";
  const salesLedgerPath = "sales_ledger";
  const productsPath = "products";
  
  try {
    const creditRef = doc(db, creditsPath, params.creditId);

    const dueDateStamp = new Date();
    dueDateStamp.setDate(dueDateStamp.getDate() + params.dueDateDays);

    const creditPayload: CreditRegistry = {
      credit_id: params.creditId,
      customer_name: params.customerName,
      customer_phone: params.customerPhone || "",
      items: params.items,
      total_amount: params.totalAmount,
      amount_paid: params.amountPaid,
      remaining_balance: params.remainingBalance,
      status: params.amountPaid === 0 ? "unpaid" : (params.remainingBalance <= 0 ? "paid" : "partial"),
      due_date: dueDateStamp.toISOString(),
      timestamp: serverTimestamp(),
      recorded_by: params.staffName,
      repayments: params.amountPaid > 0 ? [
        {
          repayment_id: `REPAY-INIT-${params.creditId.slice(-6).toUpperCase()}`,
          amount: params.amountPaid,
          payment_method: "cash",
          timestamp: new Date().toISOString(),
          recorded_by: params.staffName
        }
      ] : [],
      physical_receipt_no: params.physicalReceiptNo || ""
    };

    const saleId = `SALE-CRD-${params.creditId.slice(-6).toUpperCase()}`;
    const saleDocRef = doc(db, salesLedgerPath, saleId);

    const salePayload: Sale = {
      sale_id: saleId,
      timestamp: serverTimestamp(),
      staff_id: params.staffName,
      customer_name: params.customerName,
      total_amount: params.amountPaid,
      payment_method: "credit",
      reference_details: `Credit Ticket ID: ${params.creditId}. Initial Paid: SLe ${params.amountPaid}`,
      items: params.items,
      physical_receipt_no: params.physicalReceiptNo || ""
    };

    const batch = writeBatch(db);
    batch.set(creditRef, creditPayload);
    batch.set(saleDocRef, salePayload);

    // Deduct stock immediately because credit sales represent goods collected!
    params.items.forEach((item) => {
      const productRef = doc(db, productsPath, item.product_id);
      batch.update(productRef, {
        current_stock: increment(-item.quantity)
      });
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${creditsPath} and ${salesLedgerPath}`);
  }
}

/**
 * Record a Credit Repayment event:
 * Updates paid amount, balance trackers status, and appends payment to the array
 */
export async function completeCreditRepayment(params: {
  creditId: string;
  updatedPaid: number;
  updatedRemaining: number;
  status: "paid" | "partial";
  updatedRepayments: CreditRepayment[];
}): Promise<void> {
  const creditsPath = `credits_registry/${params.creditId}`;
  try {
    const creditDocRef = doc(db, "credits_registry", params.creditId);
    await updateDoc(creditDocRef, {
      amount_paid: params.updatedPaid,
      remaining_balance: params.updatedRemaining,
      status: params.status,
      repayments: params.updatedRepayments
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, creditsPath);
  }
}

