export interface Product {
  id: string; // The SKU, e.g., "WWS-001"
  name: string;
  category: string;
  current_stock: number;
  total_offloaded: number;
  unit_price: number; // in SLe currency
}

export interface StaffPermissions {
  can_update_stock: boolean;
  can_process_sales: boolean;
}

export interface StaffProfile {
  uid: string;
  name: string;
  role: "admin" | "staff";
  permissions: StaffPermissions;
}

export interface SaleItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_cost: number;
}

export interface Sale {
  sale_id: string;
  timestamp: any; // Firestore Timestamp, Date, or string representation
  staff_id: string;
  total_amount: number;
  payment_method: "cash" | "cheque" | "mobile_money" | "tbc";
  reference_details?: string;
  items: SaleItem[];
}

export interface TBCItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_cost: number;
  total: number;
}

export interface TBCRegistry {
  tbc_id: string;
  customer_name: string;
  items: TBCItem[];
  total_amount: number;
  status: "pending" | "collected" | "expired";
  expiry_date: any; // Firestore Timestamp, Date, or string representation
  collected_by: string | null;
  collected_at: any | null; // Firestore Timestamp, Date, or string representation
}

// Notification structure for expired TBCs or alerts
export interface StoreNotification {
  id: string;
  message: string;
  timestamp: any;
  type: "info" | "warning";
  read: boolean;
}
