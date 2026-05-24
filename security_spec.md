# Security Specification & Test-Driven Development (TDD)
## Wara Wara Stores & Sales App — Firestore Security Architecture

---

### Phase 0: Security Specifications & Data Invariants

#### 1. Core Data Invariants
1. **Immutable Price Policies**: Only certified administrators can change `unit_price` or create brand new products. Staff with `can_update_stock` permissions can only modify quantities.
2. **Unalterable Financial Ledgers**: Once a record is written to `sales_ledger`, it can never be updated, edited, or deleted under any circumstances.
3. **Admin Enrolment Isolation**: Staff profiles (`staff_profiles`) can only be enrolled, modified, or updated by users who are authenticated and possess the "admin" role. A staff member is strictly forbidden from changing their own role or permissions.
4. **Resilient Stock Mutation**: Products and stock counts must have standard limits. Price must be positive, and stock counts must never be negative.
5. **Collection Tracking Flow**: Transition of standard TBC collections must supply the name of the collector (`collected_by`) and a strict server timestamp (`collected_at`) only upon status change to `collected`.
6. **No Client Timestamp Deception**: All sales and collection events must use the database system server time (`request.time`) instead of spoofable client dates.

---

### 2. The "Dirty Dozen" Malicious Payloads

The following rogue JSON payloads are designed by a hypothetical attacker to break the laws of Identity, Integrity, and State:

#### Payload 1: Privilege Escalation (Self-Assigned Admin Role)
* **Goal**: Attackers bypass the enrollment flow to elevate their own permissions.
* **Target Path**: `staff_profiles/ATTACKER_UID`
```json
{
  "uid": "ATTACKER_UID",
  "name": "Attacker",
  "role": "admin",
  "permissions": {
    "can_update_stock": true,
    "can_process_sales": true
  }
}
```

#### Payload 2: Price Manipulation (Staff changing prices)
* **Goal**: Non-admin staff attempting to adjust tool or building material list prices.
* **Target Path**: `products/WWS-001`
```json
{
  "id": "WWS-001",
  "name": "Scrapper (Pcs)",
  "category": "Tools",
  "unit_price": 0.01,
  "current_stock": 9000,
  "total_offloaded": 9000
}
```

#### Payload 3: Financial Erasure (Attempting to wipe a sale document)
* **Goal**: Evade inspection by deleting a completed cash sale record.
* **Target Path**: `sales_ledger/SALE_999`
* **Trigger**: `delete` operation.

#### Payload 4: Resource Poisoning (ID characters / Long Strings)
* **Goal**: Inject massive un-indexed string blobs into product IDs to cause service degradation.
* **Target Path**: `products/ATTACK_SKU_LONG_STUFF_JUNK_$$$_%123`
```json
{
  "id": "ATTACK_SKU_LONG_STUFF_JUNK_$$$_%123",
  "name": "Spam",
  "category": "Hardware",
  "unit_price": 10.0,
  "current_stock": 10,
  "total_offloaded": 10
}
```

#### Payload 5: Date Spoofing (Future Sales Ledger Booking)
* **Goal**: Provide a back-dated or future-dated sale ledger document to doctor financial reports.
* **Target Path**: `sales_ledger/SALE_123`
```json
{
  "sale_id": "SALE_123",
  "timestamp": "2030-01-01T00:00:00Z",
  "staff_id": "STAFF_UID",
  "total_amount": 1000,
  "payment_method": "cash",
  "items": []
}
```

#### Payload 6: Negative Stock Injection (Defrauding inventory counts)
* **Goal**: Invalidate inventory systems by inserting negative stock values.
* **Target Path**: `products/WWS-001`
```json
{
  "id": "WWS-001",
  "name": "Scrapper (Pcs)",
  "category": "Tools",
  "unit_price": 7.00,
  "current_stock": -500,
  "total_offloaded": 9000
}
```

#### Payload 7: TBC Self-Collection Bypass (State shortcutting)
* **Goal**: Changing status of TBC registry to `collected` without supplying a `collected_by` name.
* **Target Path**: `tbc_registry/TBC_001`
```json
{
  "tbc_id": "TBC_001",
  "customer_name": "Alhaji",
  "items": [],
  "total_amount": 500,
  "status": "collected",
  "expiry_date": "2026-06-24T17:30:00Z",
  "collected_by": null,
  "collected_at": null
}
```

#### Payload 8: TBC Registry Theft
* **Goal**: Authenticated non-admin deletes a TBC registry list card.
* **Target Path**: `tbc_registry/TBC_001`
* **Trigger**: `delete` operation.

#### Payload 9: Sales Ledger Ledger-ID Tampering
* **Goal**: Modifying critical locked fields like `sale_id` or `staff_id` on an existing ledger.
* **Target Path**: `sales_ledger/SALE_001`
```json
{
  "sale_id": "MODIFIED_ID",
  "timestamp": "2026-05-24T17:30:06Z",
  "staff_id": "ATTACKER_UID",
  "total_amount": 14.00,
  "payment_method": "cash",
  "items": []
}
```

#### Payload 10: Anonymous Public Access
* **Goal**: Unauthenticated fetch of staff profiles or sales logs.
* **Target Path**: `staff_profiles/STAFF_UID`
* **Trigger**: Unauthenticated `get` or `list` query.

#### Payload 11: TBC Lifecycle Rewind
* **Goal**: Reset an already "expired" or "collected" TBC back to "pending" to receive goods twice.
* **Target Path**: `tbc_registry/TBC_001`
```json
{
  "tbc_id": "TBC_001",
  "customer_name": "Alhaji",
  "items": [],
  "total_amount": 500,
  "status": "pending",
  "expiry_date": "2026-06-24T17:30:00Z",
  "collected_by": null,
  "collected_at": null
}
```

#### Payload 12: Unauthorized Staff Permission Modification
* **Goal**: Staff modifying permissions dictionary inside database.
* **Target Path**: `staff_profiles/STAFF_UID`
```json
{
  "uid": "STAFF_UID",
  "name": "Simple Staff",
  "role": "staff",
  "permissions": {
    "can_update_stock": true,
    "can_process_sales": true
  }
}
```

---

### 3. Model Security Test Suite Specifications

All tests should assert that unauthorized modifications attempt, negative prices, and cross-role rule breaches return `PERMISSION_DENIED`. Here is how they relate to the core security rules assertions:

*   **Rule Test 1**: Assert authenticated user cannot read private staff roles without session.
*   **Rule Test 2**: Assert non-admin cannot rewrite `unit_price` field.
*   **Rule Test 3**: Assert staff with `can_process_sales: true` can create ledger keys but are blocked from any `update` or `delete`.
*   **Rule Test 4**: Assert TBC orders require collected status items to have `collected_by` non-empty strings.
