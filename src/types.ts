export interface Product {
  id: string; // The SKU, e.g., "WWS-001"
  name: string;
  category: string;
  current_stock: number;
  total_offloaded: number;
  unit_price: number; // in SLe currency
  image_url?: string;
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
  username?: string;
  password?: string;
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
  customer_name?: string;
  total_amount: number;
  payment_method: "cash" | "cheque" | "mobile_money" | "tbc" | "credit";
  reference_details?: string;
  items: SaleItem[];
}

export interface CreditRepayment {
  repayment_id: string;
  amount: number;
  payment_method: "cash" | "cheque" | "mobile_money";
  timestamp: any;
  recorded_by: string;
}

export interface CreditFollowUp {
  timestamp: string;
  recorded_by: string;
  note: string;
  contact_outcome: "promised_payment" | "no_answer" | "disputed" | "refused" | "general_reminder";
}

export interface CreditRegistry {
  credit_id: string;
  customer_name: string;
  customer_phone?: string;
  items: SaleItem[];
  total_amount: number;
  amount_paid: number;
  remaining_balance: number;
  status: "unpaid" | "partial" | "paid";
  due_date: any; // Date, String or Timestamp
  timestamp: any;
  recorded_by: string;
  repayments?: CreditRepayment[];
  follow_ups?: CreditFollowUp[];
}

export interface TBCItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_cost: number;
  total: number;
  collected_quantity?: number; // Quantity collected so far
}

export interface TBCCollectionRecord {
  collection_id: string;
  collected_at: string;
  collected_by: string;
  staff_id: string;
  items: {
    product_id: string;
    name: string;
    quantity: number; // Quantity in this specific collection
  }[];
}

export interface TBCRegistry {
  tbc_id: string;
  customer_name: string;
  items: TBCItem[];
  total_amount: number;
  status: "pending" | "partial" | "collected" | "expired";
  expiry_date: any; // Firestore Timestamp, Date, or string representation
  collected_by: string | null;
  collected_at: any | null; // Firestore Timestamp, Date, or string representation
  collections?: TBCCollectionRecord[]; // Separate collection history logs
}

// Notification structure for expired TBCs or alerts
export interface StoreNotification {
  id: string;
  message: string;
  timestamp: any;
  type: "info" | "warning";
  read: boolean;
}

export interface Expenditure {
  id: string;
  description: string;
  amount: number;
  timestamp: any;
  recorded_by: string;
  category: string;
  authorized_by?: string;
}

export interface BankDeposit {
  id: string;
  amount: number;
  bank_name: string;
  deposited_by: string;
  timestamp: any;
  recorded_by: string;
  slip_serial?: string;
}
