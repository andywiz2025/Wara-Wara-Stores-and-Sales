/**
 * Utility functions to export store datasets to highly compatible CSV format (opens natively in Microsoft Excel with full layout compatibility)
 */

// Prefix UTF-8 Byte Order Mark (BOM) so Excel opens special characters correctly
const BOM = "\uFEFF";

function escapeCSVField(val: any): string {
  if (val === null || val === undefined) return "";
  let str = String(val).trim();
  // Escape double quotes by doubling them
  if (str.includes('"')) {
    str = str.replace(/"/g, '""');
  }
  // Wrap in double quotes if it contains separator character, quotes, or newlines
  if (str.includes(",") || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return `"${str}"`;
  }
  return str;
}

export function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const headerLine = headers.map(escapeCSVField).join(",");
  const datalines = rows.map(row => row.map(escapeCSVField).join(",")).join("\n");
  const fullContent = BOM + headerLine + "\n" + datalines;

  const blob = new Blob([fullContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Format sales data for Excel exports
 */
export function exportSalesLedgerToExcel(salesList: any[]) {
  const headers = [
    "Invoice ID",
    "Operating Timestamp",
    "Operator Staff ID",
    "Customer Name",
    "Payment Mode",
    "Reference Details",
    "Items Sold Count",
    "Item Details (SKU x Qty @ Price)",
    "Subtotal Value (SLe)",
    "Total Transacted amount (SLe)"
  ];

  const rows = salesList.map(sale => {
    // Format timestamp
    let tsStr = "";
    if (sale.timestamp) {
      if (sale.timestamp.seconds) {
        tsStr = new Date(sale.timestamp.seconds * 1000).toLocaleString("en-GB");
      } else {
        tsStr = new Date(sale.timestamp).toLocaleString("en-GB");
      }
    }

    const itemsStr = sale.items?.map((it: any) => 
      `${it.name} [SKU: ${it.product_id}] (Qty: ${it.quantity} @ SLe${it.unit_cost})`
    ).join(" | ") || "";

    const itemsCount = sale.items?.reduce((sum: number, it: any) => sum + it.quantity, 0) || 0;

    return [
      sale.sale_id.toUpperCase(),
      tsStr,
      sale.staff_id || "System Default",
      sale.customer_name || "Walk-In Customer",
      sale.payment_method?.toUpperCase(),
      sale.reference_details || "N/A",
      String(itemsCount),
      itemsStr,
      String(sale.total_amount),
      String(sale.total_amount)
    ];
  });

  downloadCSV("Wara_Wara_Stores_Sales_Ledger", headers, rows);
}

/**
 * Format products catalog data for Excel exports
 */
export function exportProductsInventoryToExcel(productsList: any[]) {
  const headers = [
    "Product SKU",
    "Product Name",
    "Category Group",
    "Available Stock Left",
    "Total Offloaded Stock",
    "Unit Selling Price (SLe)",
    "Total Inventory Value SLe (Current Stock * Price)"
  ];

  const rows = productsList.map(product => {
    const value = (product.current_stock || 0) * (product.unit_price || 0);
    return [
      product.id?.toUpperCase(),
      product.name,
      product.category,
      String(product.current_stock ?? 0),
      String(product.total_offloaded ?? 0),
      String(product.unit_price ?? 0),
      String(value)
    ];
  });

  downloadCSV("Wara_Wara_Stores_Inventory_Report", headers, rows);
}

/**
 * Format TBC Registries data for Excel exports
 */
export function exportTBCRegistryToExcel(tbcsList: any[]) {
  const headers = [
    "Ticket SKU ID",
    "Registered Customer",
    "Prepaid Sheet Balance",
    "Total Registered Amount (SLe)",
    "Ticket Status",
    "Expiry Date",
    "Collection Attendant",
    "Collection Timestamp"
  ];

  const rows = tbcsList.map(t => {
    let expStr = "";
    if (t.expiry_date) {
      if (t.expiry_date.seconds) {
        expStr = new Date(t.expiry_date.seconds * 1000).toLocaleDateString("en-GB");
      } else {
        expStr = new Date(t.expiry_date).toLocaleDateString("en-GB");
      }
    }

    let collStr = "";
    if (t.collected_at) {
      if (t.collected_at.seconds) {
        collStr = new Date(t.collected_at.seconds * 1000).toLocaleString("en-GB");
      } else {
        collStr = new Date(t.collected_at).toLocaleString("en-GB");
      }
    }

    const itemsStr = t.items?.map((it: any) => 
      `${it.name} (Qty: ${it.quantity} sheets)`
    ).join(" | ") || "";

    return [
      t.tbc_id?.toUpperCase(),
      t.customer_name,
      itemsStr,
      String(t.total_amount),
      t.status?.toUpperCase(),
      expStr,
      t.collected_by || "Unclaimed",
      collStr || "N/A"
    ];
  });

  downloadCSV("Wara_Wara_Stores_TBC_Registry", headers, rows);
}
