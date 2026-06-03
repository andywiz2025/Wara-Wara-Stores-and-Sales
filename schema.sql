-- ============================================================================
-- SQL DDL Relational Schema Blueprint
-- Wara Wara Stores Construction (Koinadugu District, Kabala, Sierra Leone)
-- Recommended Relational Migration from Firestore to high-performance SQL Engine (e.g., PostgreSQL)
-- Target Requirements Resolved: Multi-outlet Inventory, Price Mutations snapshotting,
-- arbitrary DECIMAL financial precision, Soft Deletes, and Composite Indexes.
-- ============================================================================

-- Enable UUID extension if required
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. STORES / OUTLETS BRANCHES
-- Decouples the physical shop/warehouse branches.
-- ----------------------------------------------------------------------------
CREATE TABLE outlets (
    outlet_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE, -- Requirement 4: Soft delete indicator
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. PRODUCTS MASTER CATALOGUE
-- Holds static product definitions. Price is a DECIMAL(10,2) for exact precision.
-- ----------------------------------------------------------------------------
CREATE TABLE products (
    id VARCHAR(50) PRIMARY KEY, -- SKU, e.g., 'WWS-001'
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0.00), -- Requirement 3: Arbitrary DECIMAL
    is_active BOOLEAN NOT NULL DEFAULT TRUE, -- Requirement 4: Soft delete indicator
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. MULTI-OUTLET INVENTORY JUNCTION
-- Requirement 1: Decouples stock quantity from products. Tracks balances across outlets.
-- Includes min_threshold for triggers and historical offloading values.
-- ----------------------------------------------------------------------------
CREATE TABLE inventory (
    product_id VARCHAR(50) REFERENCES products(id),
    outlet_id VARCHAR(50) REFERENCES outlets(outlet_id),
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    min_threshold INTEGER NOT NULL DEFAULT 10 CHECK (min_threshold >= 0), -- Low stock alert trigger
    total_offloaded INTEGER NOT NULL DEFAULT 0 CHECK (total_offloaded >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_inventory PRIMARY KEY (product_id, outlet_id)
);

-- ----------------------------------------------------------------------------
-- 4. STAFF ROSTER & DISPATCH SECURITY DIRECTORY
-- Holds staff profiles with capabilities mapping and password hashing.
-- ----------------------------------------------------------------------------
CREATE TABLE staff_profiles (
    uid VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff')),
    can_update_stock BOOLEAN NOT NULL DEFAULT FALSE,
    can_process_sales BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE, -- Requirement 4: Soft delete indicator
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 5. CASH SALES & INVOICING LEDGER
-- Financial transactions ledger.
-- ----------------------------------------------------------------------------
CREATE TABLE sales_ledger (
    sale_id VARCHAR(50) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    staff_id VARCHAR(50) NOT NULL REFERENCES staff_profiles(uid),
    outlet_id VARCHAR(50) NOT NULL REFERENCES outlets(outlet_id),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0.00), -- Requirement 3: Financial Precision
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'cheque', 'mobile_money', 'tbc')),
    reference_details VARCHAR(255), -- Store cheque numbers, momo transaction codes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 6. SALE LINE ITEMS
-- Requirement 2: Static price and discount snapshots. Prevents future alterations of
-- historical revenue logs when core price is mutated.
-- ----------------------------------------------------------------------------
CREATE TABLE sale_items (
    sale_item_id BIGSERIAL PRIMARY KEY,
    sale_id VARCHAR(50) NOT NULL REFERENCES sales_ledger(sale_id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    purchased_unit_price DECIMAL(10,2) NOT NULL CHECK (purchased_unit_price >= 0.00), -- Snapshot value at Moment-of-Sale
    discount_applied DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_applied >= 0.00) -- Snapshot discount
);

-- ----------------------------------------------------------------------------
-- 7. PREPAID TO-BE-COLLECTED (TBC) TICKET RECONCILIATION REGISTRY
-- Holds customer materials that have been paid for but not yet taken from our yard.
-- ----------------------------------------------------------------------------
CREATE TABLE tbc_registry (
    tbc_id VARCHAR(50) PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    sale_id VARCHAR(50) REFERENCES sales_ledger(sale_id), -- Maps to initial paid invoice
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0.00),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'collected', 'expired')),
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Prepaid goods under a specific TBC ticket
CREATE TABLE tbc_items (
    tbc_item_id BIGSERIAL PRIMARY KEY,
    tbc_id VARCHAR(50) NOT NULL REFERENCES tbc_registry(tbc_id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id),
    ordered_quantity INTEGER NOT NULL CHECK (ordered_quantity > 0),
    collected_quantity INTEGER NOT NULL DEFAULT 0 CHECK (collected_quantity <= ordered_quantity)
);

-- ----------------------------------------------------------------------------
-- 8. TBC MULTI-SESSION DISPATCH VOUCHER DELIVERY RECORDS
-- Supports double receipts tracking where items can be taken in multiple partial sessions.
-- ----------------------------------------------------------------------------
CREATE TABLE tbc_collections (
    collection_id VARCHAR(50) PRIMARY KEY,
    tbc_id VARCHAR(50) NOT NULL REFERENCES tbc_registry(tbc_id) ON DELETE CASCADE,
    collected_by VARCHAR(255) NOT NULL, -- Driver, Receiver Name, license plate
    staff_id VARCHAR(50) NOT NULL REFERENCES staff_profiles(uid), -- Authorized store gatekeeper clerk
    collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Dispatched items in this specific collection release session
CREATE TABLE tbc_collection_items (
    collection_item_id BIGSERIAL PRIMARY KEY,
    collection_id VARCHAR(50) NOT NULL REFERENCES tbc_collections(collection_id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0)
);

-- ----------------------------------------------------------------------------
-- 9. OPERATIONAL SITE EXPENDITURES REGISTRY
-- Tracks fuel, site security, transport, utility bills paid from cash-in-vault reserves.
-- ----------------------------------------------------------------------------
CREATE TABLE expenditures (
    id VARCHAR(50) PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0.00),
    description VARCHAR(255) NOT NULL,
    recorded_by VARCHAR(50) NOT NULL REFERENCES staff_profiles(uid),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 10. PHYSICAL COIN-VAULT TO COMMERCIAL BANK DEPOSITS
-- Keeps strict log of vault runners moving funds to Rokel or SLCB central balances.
-- ----------------------------------------------------------------------------
CREATE TABLE bank_deposits (
    id VARCHAR(50) PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0.00),
    bank_name VARCHAR(100) NOT NULL,
    deposited_by VARCHAR(100) NOT NULL, -- Driver, Teller runner
    recorded_by VARCHAR(50) NOT NULL REFERENCES staff_profiles(uid),
    deposit_slip_id VARCHAR(100) UNIQUE NOT NULL, -- Compliance tracking number
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- REQUIREMENT 4: COMPOSITE INDEXES & STATISTIC ENGINE OPTIMIZATIONS
-- Index selection to ensure O(1) matching and robust analytic lookups.
-- ============================================================================

-- 1. Index for fast date + outlet sales analysis (e.g., daily sales aggregate)
CREATE INDEX idx_sales_date_outlet 
    ON sales_ledger (timestamp DESC, outlet_id);

-- 2. Index for scanning low-stock alerts and out-of-stock items within specific outlets
CREATE INDEX idx_inventory_low_stock 
    ON inventory (outlet_id, current_stock);

-- 3. Index for querying active/pending customer orders and pending collection expirations
CREATE INDEX idx_tbc_status_expiry 
    ON tbc_registry (status, expiry_date);

-- 4. Partial Index looking up active products only, boosting scan performance
CREATE INDEX idx_products_active 
    ON products (id) 
    WHERE is_active = TRUE;

-- 5. Index for auditing expenditures by category and date range
CREATE INDEX idx_expenditures_audit 
    ON expenditures (category, timestamp DESC);
