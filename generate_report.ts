import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle } from "docx";
import * as fs from "fs";
import * as path from "path";

// Color Palette Constants for Corporate Presentation Theme
const COLOR_PRIMARY = "1F4E79";   // Deep Steel Blue
const COLOR_SECONDARY = "5B9BD5"; // Accent Blue
const COLOR_DARK = "262626";      // Deep Charcoal
const COLOR_LIGHT_BG = "F2F2F2";  // Off-White/Light Gray
const COLOR_BORDER = "D3D3D3";    // Muted Gray
const COLOR_WHITE = "FFFFFF";     // White

// Font Constant
const FONT_BODY = "Segoe UI";

// Helpers for styled text and spacing
function createHeading1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 150, line: 360 },
    keepNext: true,
    children: [
      new TextRun({
        text,
        color: COLOR_PRIMARY,
        font: FONT_BODY,
        bold: true,
        size: 32, // 16pt
      }),
    ],
  });
}

function createHeading2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 250, after: 100, line: 300 },
    keepNext: true,
    children: [
      new TextRun({
        text,
        color: COLOR_SECONDARY,
        font: FONT_BODY,
        bold: true,
        size: 26, // 13pt
      }),
    ],
  });
}

function createHeading3(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80, line: 260 },
    keepNext: true,
    children: [
      new TextRun({
        text,
        color: COLOR_DARK,
        font: FONT_BODY,
        bold: true,
        size: 22, // 11pt, bold
      }),
    ],
  });
}

function createParagraph(text: string, options: { bold?: boolean; italics?: boolean; size?: number; color?: string; afterSpace?: number; alignment?: any } = {}): Paragraph {
  return new Paragraph({
    alignment: options.alignment,
    spacing: { after: options.afterSpace ?? 120, line: 240 },
    children: [
      new TextRun({
        text,
        bold: options.bold ?? false,
        italics: options.italics ?? false, // converted to docx 'italics'
        size: options.size ?? 22, // default 11pt (22 half-pts)
        color: options.color ?? COLOR_DARK,
        font: FONT_BODY,
      }),
    ],
  });
}

function createBulletPoint(boldPrefix: string, text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80, line: 240 },
    children: [
      new TextRun({
        text: boldPrefix,
        bold: true,
        size: 22,
        color: COLOR_DARK,
        font: FONT_BODY,
      }),
      new TextRun({
        text: text,
        size: 22,
        color: COLOR_DARK,
        font: FONT_BODY,
      }),
    ],
  });
}

function createCalloutBox(title: string, text: string): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.SINGLE, size: 30, color: COLOR_PRIMARY },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: COLOR_LIGHT_BG },
            margins: { top: 150, bottom: 150, left: 200, right: 200 },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({
                     text: title,
                     bold: true,
                     color: COLOR_PRIMARY,
                     font: FONT_BODY,
                     size: 22,
                  })
                ]
              }),
              new Paragraph({
                spacing: { after: 0 },
                children: [
                  new TextRun({
                     text,
                     italics: true,
                     color: COLOR_DARK,
                     font: FONT_BODY,
                     size: 21,
                  })
                ]
              })
            ],
          }),
        ],
      }),
    ],
  });
}

// Main Doc Generation Block
const doc = new Document({
  creator: "Wara Wara Construction tech-team",
  title: "Wara Wara Construction POS System Report",
  description: "Executive and Operational Presentation of the Wara Wara Construction POS Ledger System",
  sections: [
    {
      properties: {},
      children: [
        // COVER PAGE / TITLE
        new Paragraph({ spacing: { before: 1200, after: 100 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "WARA WARA CONSTRUCTION LTD.",
              bold: true,
              size: 40, // 20pt
              color: COLOR_PRIMARY,
              font: FONT_BODY,
            }),
          ],
        }),
        new Paragraph({ spacing: { before: 100, after: 300 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "TECHNICAL SYSTEM PROPOSAL & FINANCIAL OPERATION PLAN",
              bold: true,
              size: 28, // 14pt
              color: COLOR_SECONDARY,
              font: FONT_BODY,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [
            new TextRun({
              text: "Strategic Overview, Workflow Workflows, Host Device Optimizations, and Year cost analysis of the Dedicated POS Ledger Application",
              italics: true,
              size: 22,
              color: "555555",
              font: FONT_BODY,
            }),
          ],
        }),
        
        // HR line simulation using Table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 12, color: COLOR_PRIMARY },
            bottom: { style: BorderStyle.NONE, size: 0 },
            left: { style: BorderStyle.NONE, size: 0 },
            right: { style: BorderStyle.NONE, size: 0 },
          },
          rows: [new TableRow({ children: [new TableCell({ children: [] })] })],
        }),

        new Paragraph({ spacing: { before: 400, after: 800 } }),
        createParagraph("Target Audience: Executive Management, Financial Division, and Retail Managers of Wara Wara Construction", { italics: true, alignment: AlignmentType.CENTER }),
        createParagraph("Author: Senior Enterprise Software Architect", { bold: true, alignment: AlignmentType.CENTER }),
        createParagraph("Version: 2.1 (Production Ready)", { alignment: AlignmentType.CENTER }),
        createParagraph("Date: June 3, 2026", { alignment: AlignmentType.CENTER }),

        new Paragraph({ spacing: { before: 1000 } }),

        // PAGE BREAK
        new Paragraph({ pageBreakBefore: true }),

        // SECTION 1: SYSTEM OVERVIEW & STRATEGIC VALUE
        createHeading1("1. Executive Summary & System Overview"),
        createParagraph(
          "For modern, high-volume retail operations dealing in industrial and building materials (such as cement, sand, gravel, timber, and steel rebar), operating a generic retail cash register leads to drastic stock leakages, untracked logistics debts, and accounting errors. Wara Wara Construction Ltd. requires a highly resilient, specialized Ledger Point of Sale (POS) system that aligns cash processing with stock offloading, batch-based customer pick-ups, and building contractor credits."
        ),
        createParagraph(
          "This dedicated POS Ledger Application is custom engineered to solve these exact industrial bottlenecks. Unlike generic retail software, this system natively supports split material distribution workflows ('To Be Collected' collections) and tracks credit outstanding alongside customer contact records. The cloud database is reinforced with automatic real-time indexing, multi-tab replication, and advanced security configurations."
        ),
        
        createHeading2("Strategic Business Outcomes:"),
        createBulletPoint("Elimination of Stock Shrinkage: ", "By correlating truck material offloads directly with product inventory records, every bag of cement and length of steel rod is structurally verified from receipt to retail handover."),
        createBulletPoint("Secure Credit Oversight: ", "Instantly stops cash leaks by locking buyer files, registering repayment installments, and recording contact outcomes under automated ledger status flags (Unpaid, Partial, Paid)."),
        createBulletPoint("Fraud-Proof Collections (TBC Management): ", "Ensures that products bought in bulk but collected across weeks are recorded across verified increments. This leaves a water-tight audit trail of which driver and vehicle carted what materials at any given time."),
        createBulletPoint("Immutable Operating Audits: ", "Petty cash expenditures and bank handovers are physically and logically tied to verified branch user profiles, rendering visual ledger summaries transparent to the corporate auditors."),

        new Paragraph({ spacing: { before: 150 } }),
        createCalloutBox(
          "Operational Mandate",
          "This software is optimized for dedicated POS terminals (e.g., in-store merchant tablets/touch devices) under extreme conditions, including spotty connectivity in active yards or sudden grid dropouts."
        ),

        // SECTION 2: DEDICATED HARDWARE & OFFLINE COLD-START CAPABILITIES
        new Paragraph({ pageBreakBefore: true }),
        createHeading1("2. Host Device Customization & High-Availability Resiliency"),
        createParagraph(
          "Because this system operates in critical dispatch offices and busy retail yards where down-time represents direct financial loss, the app has been reinforced with native device integrations and high-availability modules:"
        ),

        createHeading2("2.1 Always-On Screen Wake Lock API"),
        createParagraph(
          "Standard web apps trigger terminal sleep after 5 minutes of inactivity, requiring staff to constantly re-log. The Wara Wara POS utilizes the native Screen Wake Lock API. Upon successful team-member authentication, the system acquires a hard lock on the host terminal's display hardware, forcing the screen to remain illuminated indefinitely during retail hours, resulting in swift, frictionless dispatch."
        ),

        createHeading2("2.2 Dynamic Progressive Web App (PWA) Offline Pre-Caching"),
        createParagraph(
          "A Service Worker (`sw.js`) is fully integrated into the terminal cache. This client-side runtime precaches all layout structures, iconography, global style elements, and critical script logic on the device's persistent storage. If the retail yard loses internet entirely, the cashiers can refresh, load, and interact with the application offline without displaying generic 'No internet connection' browser blocks."
        ),

        createHeading2("2.3 Firestore IndexedDB Offline Database Synchronization"),
        createParagraph(
          "The system utilizes advanced structural Firestore Offline Persistence. When the terminal is offline:"
        ),
        createBulletPoint("1. Read Requests: ", "Are served directly from the IndexedDB secure local sandbox, ensuring zero-latency access to product prices and contact listings."),
        createBulletPoint("2. Write Requests: ", "Transactions, credit installments, and cash receipts are instantly committed to a local cache queue and processed with visual user-feedback, allowing sales lines to move uninterrupted."),
        createBulletPoint("3. Auto-Merge Pipeline: ", "As soon as the mobile network or Wi-Fi link restores, the applet automatically syncs all buffered local queues to the secure Google Cloud Firestore instance, executing state reconciliation in the background."),

        createHeading2("2.4 Draw-Over-Apps & Autostart Integration Guidelines"),
        createParagraph(
          "On dedicated merchant devices (e.g., Android POS Terminal or tablets with Draw-Over-Apps support), the application can be configured as the device's default System Launcher. This blocks staff from accessing distracting applications, ensures the terminal instantly boots straight into the Wara Wara register on hardware startup, and secures company resources against unauthorized private browsing."
        ),

        // SECTION 3: DEEP COGNITIVE WALKTHROUGH OF CORE APP FUNCTIONS
        new Paragraph({ pageBreakBefore: true }),
        createHeading1("3. Granular Analysis of Core Application Functions"),
        createParagraph(
          "The Wara Wara Construction application contains six key, interlocked functional modules. Each is designed to represent real-world physical workflows occurring in your materials depots:"
        ),

        createHeading2("3.1 Security & Role Model (Admin vs. Staff)"),
        createParagraph(
          "All system actions are validated against explicit profile permission sets. This prevents unauthorized inventory adjustments or deleted records:"
        ),
        createBulletPoint("Admin Role: ", "Holds override authorization. Confirms material truck arrivals (offloads), modifies product pricing matrices, manages the team profiles, and conducts full financial balance ledger inspections."),
        createBulletPoint("Staff Role: ", "Authorized to execute registers, register customer credit debts, collect deposits (TBC), log branch expenditure receipts, and record bank cash-deposit serials. Staff cannot freely change product prices or current stock counts without admin intervention."),

        createHeading2("3.2 SKU Price & Material Stock Offloading"),
        createParagraph(
          "Materials in a construction yard do not arrive as small packages. They arrive in large aggregate trucks, cement flatbeds, or steel bundle carriers. The Stock Ledger includes a specialized Truck Offload module:"
        ),
        createBulletPoint("Offload Log: ", "Instead of manual database typing, administrators run an 'Offload Truck' event, entering the incoming quantity (e.g., +500 packs). the system adds this to the current available yard inventory and records historical 'total_offloaded' statistics for the product SKU."),
        createBulletPoint("Real-time Availability: ", "Stock levels automatically count down instantly when a retail transaction or bulk collection completes, protecting sales reps from over-selling materials."),

        createHeading2("3.3 Point of Sale Omni-Register & Multi-Pay Methods"),
        createParagraph(
          "The main cashier screen is a clean, hyper-responsive touch-to-add interface with automatic Sierra Leonean Leone (SLe) currency calculations. Sales support five diverse real-world construction payment workflows:"
        ),
        createBulletPoint("Cash: ", "Direct physical cash handover on-spot. Generates normal receipt flows."),
        createBulletPoint("Cheque: ", "Standard for construction developers. Stores cheque bank origins and reference serial numbers for bank clearance tracking."),
        createBulletPoint("Mobile Money (Orange, Africell): ", "Tracks mobile money transaction hash IDs for instant accounting confirmation."),
        createBulletPoint("Credit Sales: ", "Automatically registers a new client entry to the Credit Registry while keeping stock accounts synchronized."),
        createBulletPoint("To Be Collected (TBC): ", "Creates a bulk material storage liability entry, reserving stock for future customer truck pick-ups."),

        new Paragraph({ pageBreakBefore: true }),
        createHeading2("3.4 Deposit & TBC (To Be Collected) Registry"),
        createParagraph(
          "In the industrial materials sector, builders rarely carry all purchased sand, brick, or cement at once. They pay a lump sum and send trucks over weeks to fetch portions of their materials. If this is tracked on paper, fraud is rampant."
        ),
        createParagraph(
          "Our TBC Registry completely locks down this workflow structurally:"
        ),
        createBulletPoint("Liability Accounting: ", "When a TBC sale goes through, the inventory is reserved. The registry flags the order state as 'Pending' or 'Partial' collection."),
        createBulletPoint("Incremental Collection Logs: ", "Each time a truck exits the yard with a portion of the material, a staff member records an incremental pickup event (e.g., customer collects 40 out of 100 bags of cement)."),
        createBulletPoint("Full Audit Profile: ", "The record captures the collection timestamp, the verified collecting agent's name, the staff member authorizing the dispatch, and the exact quantity of each SKU delivered in that trip, updating the progress bar dynamically."),
        createBulletPoint("Automatic State Aging: ", "The system monitors collections, automatically moving status to 'Collected' only when the outstanding balance hits absolute zero. If a TBC reaches its expiry date uncollected, warnings alert administrators for storage extensions or deposits forfeiture."),

        createHeading2("3.5 Credit Controls & Debt Recovery Dashboard"),
        createParagraph(
          "Capital-intensive construction projects are heavily dependent on trade credit. Managing company cash flow requires robust risk control:"
        ),
        createBulletPoint("Interactive Ledger: ", "Lists every customer with outstanding balances, including phone contacts, due-dates, and original material list attachments."),
        createBulletPoint("Incremental Installments Repayments: ", "Supports partial payment operations. Each logged repayment registers an immutable timestamped log detailing the raw currency amount ($ / SLe) and payment mode, instantly scaling the overall debt balance."),
        createBulletPoint("Contact Logs & Recovery Strategy: ", "Allows the credit control officer to log collection follow-up records directly into the customer file. Records note outcomes like 'Promised Payment', 'No Answer', 'Refused', or 'Disputed'. This builds a solid business history of client reliability."),

        createHeading2("3.6 Branch Petty Cash Expenditure & Bank Vault Audit"),
        createParagraph(
          "To lock down branch accounting and prevent staff from using cash register proceeds for unauthorized private loans: "
        ),
        createBulletPoint("Expenditure Ledger: ", "Any petty cash removed from the drawer for fuel, minor repairs, or local yard fees must be declared. Requires description, amount, authorizer's name, and categorical classification."),
        createBulletPoint("Bank Deposit Logs: ", "At the end of each shift/day, proceeds are deposited into the bank. The team-member logs the exact deposit amount, the name of the bank, and the original Physical Bank Slip Serial Number, acting as proof of cash handover for the accounting division."),

        // SECTION 4: YEAR CLOUD COST ANALYSIS
        new Paragraph({ pageBreakBefore: true }),
        createHeading1("4. Comprehensive 12-Month Operating Cost Analysis"),
        createParagraph(
          "A major advantage of this bespoke POS architecture is its extreme, industry-leading cost-efficiency. By utilizing decentralized, serverless cloud solutions, the digital infrastructure costs are practically zero."
        ),
        createParagraph(
          "Below is the comprehensive, official financial table detailing the cost structure to keep the Wara Wara POS application running smoothly for an entire year under typical construction yard sales scales:"
        ),

        // Financial Table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 8, color: COLOR_PRIMARY },
            bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR_PRIMARY },
            left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
            right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
            insideVertical: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
          },
          rows: [
            // Header Row
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({ shading: { fill: COLOR_PRIMARY }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Infrastructure Service", bold: true, color: COLOR_WHITE, font: FONT_BODY, size: 20 })] })] }),
                new TableCell({ shading: { fill: COLOR_PRIMARY }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Monthly Allocated Free Tier", bold: true, color: COLOR_WHITE, font: FONT_BODY, size: 20 })] })] }),
                new TableCell({ shading: { fill: COLOR_PRIMARY }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Wara Wara Demand Forecast", bold: true, color: COLOR_WHITE, font: FONT_BODY, size: 20 })] })] }),
                new TableCell({ shading: { fill: COLOR_PRIMARY }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Monthly Cost ($)", bold: true, color: COLOR_WHITE, font: FONT_BODY, size: 20 })] })] }),
                new TableCell({ shading: { fill: COLOR_PRIMARY }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Annual Total ($)", bold: true, color: COLOR_WHITE, font: FONT_BODY, size: 20 })] })] }),
              ],
            }),
            // Row 1: Firestore Datastore
            new TableRow({
              children: [
                new TableCell({ children: [createParagraph("Firestore Cloud Database (Reads, Writes)", { bold: true })] }),
                new TableCell({ children: [createParagraph("50,000 Reads / day\n20,000 Writes / day\n1 GB Free Storage")] }),
                new TableCell({ children: [createParagraph("~1,500 Reads / day\n~350 Writes / day\n~10 MB Year Storage")] }),
                new TableCell({ shading: { fill: "E2EFDA" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Free ($0.00)", bold: true, color: "385723", font: FONT_BODY, size: 20 })] })] }),
                new TableCell({ shading: { fill: "E2EFDA" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Free ($0.00)", bold: true, color: "385723", font: FONT_BODY, size: 20 })] })] }),
              ],
            }),
            // Row 2: Firebase Auth
            new TableRow({
              children: [
                new TableCell({ children: [createParagraph("Firebase Auth Operations (Security)", { bold: true })] }),
                new TableCell({ children: [createParagraph("50,000 Monthly Active Users (MAUs)")] }),
                new TableCell({ children: [createParagraph("~10-15 Local Depot Users")] }),
                new TableCell({ shading: { fill: "E2EFDA" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Free ($0.00)", bold: true, color: "385723", font: FONT_BODY, size: 20 })] })] }),
                new TableCell({ shading: { fill: "E2EFDA" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Free ($0.00)", bold: true, color: "385723", font: FONT_BODY, size: 20 })] })] }),
              ],
            }),
            // Row 3: Google App Hosting
            new TableRow({
              children: [
                new TableCell({ children: [createParagraph("Google Cloud Web Hosting / CDN", { bold: true })] }),
                new TableCell({ children: [createParagraph("10 GB Active Storage,\n360 MB outbound data / day")] }),
                new TableCell({ children: [createParagraph("~50 MB Application Size;\nBandwidth is near-zero due to Service Worker pre-caching")] }),
                new TableCell({ shading: { fill: "E2EFDA" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Free ($0.00)", bold: true, color: "385723", font: FONT_BODY, size: 20 })] })] }),
                new TableCell({ shading: { fill: "E2EFDA" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Free ($0.00)", bold: true, color: "385723", font: FONT_BODY, size: 20 })] })] }),
              ],
            }),
            // Row 4: Device power cost
            new TableRow({
              children: [
                new TableCell({ children: [createParagraph("Local Device Electricity & LAN", { bold: true })] }),
                new TableCell({ children: [createParagraph("N/A (Paid locally by depot branch utilities)")] }),
                new TableCell({ children: [createParagraph("Dedicated 10W touch tablet active 12h/day")] }),
                new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "~$1.25", font: FONT_BODY, size: 20 })] })] }),
                new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "~$15.00", font: FONT_BODY, size: 20 })] })] }),
              ],
            }),
            // Total Row
            new TableRow({
              children: [
                new TableCell({ shading: { fill: COLOR_PRIMARY }, children: [createParagraph("Grand Total Infrastructure Costs", { bold: true, color: COLOR_WHITE })] }),
                new TableCell({ shading: { fill: COLOR_PRIMARY }, children: [createParagraph("All Cloud Services Covered on Spark Plan", { italics: true, color: COLOR_WHITE })] }),
                new TableCell({ shading: { fill: COLOR_PRIMARY }, children: [createParagraph("No Overages Possible", { bold: true, color: COLOR_WHITE })] }),
                new TableCell({ shading: { fill: "FFF2CC" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "$0.00 / mo", bold: true, color: "7F6000", font: FONT_BODY, size: 20 })] })] }),
                new TableCell({ shading: { fill: "E2EFDA" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "$15.00 / yr", bold: true, color: "385723", font: FONT_BODY, size: 22 })] })] }),
              ],
            }),
          ],
        }),

        new Paragraph({ spacing: { before: 200, after: 150 } }),
        createHeading2("Financial Sustainability Context:"),
        createParagraph(
          "Because the cloud infrastructure runs on Google Firebase's 'Spark Tier' (which has very generous permanent free limits), Wara Wara Construction does not have to pay any monthly software subscription or web server costs. The application runs entirely serverless: Google hosts the secure code bundle, and Google's multi-region Firestore cloud datastore processes all data streams. There are no hidden software fees, license renewals, or user-tier seat charges. Wara Wara Construction holds complete ownership over the code and cloud database sandbox."
        ),
        
        // SECTION 5: RECOMMENDATIONS & NEXT STEPS
        new Paragraph({ pageBreakBefore: true }),
        createHeading1("5. Recommendations for Deployment & Yard Integration"),
        createParagraph(
          "To translate this system's capabilities into optimum real-world cash and inventory control, we recommend the following deployment procedures:"
        ),
        createBulletPoint("1. Dedicated Mobile POS Terminals: ", "Source robust 10-inch Android tablets with shockproof cases to mount securely in the dispatch office. Enable 'Draw-Over-Apps' permissions and set the Wara Wara browser tab as the primary default launcher screen."),
        createBulletPoint("2. Establish Offload Strictness: ", "Train branch operators to register offloads IMMEDIATELY when bulk supply trucks unload materials. Administrators must verify physical truck waybills against the calculated 'total_offloaded' ledger weekly."),
        createBulletPoint("3. Enforce Daily Banking Checks: ", "All cash handovers must be validated at the end of each shift by demanding the teller upload the printed Bank Deposit Slip Serial Number into the app's Bank Deposit tracker. Management can verify slips remotely from their cloud access point."),
        createBulletPoint("4. Bi-Weekly Credit Reviews: ", "The credit-recovery representative must utilize the Debt Dashboard to make calls, logging outcomes (e.g., promised_payments) directly. This ensures trade receivables are recovered within defined contract terms."),

        new Paragraph({ spacing: { before: 400, after: 200 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_PRIMARY },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_PRIMARY },
            left: { style: BorderStyle.NONE, size: 0 },
            right: { style: BorderStyle.NONE, size: 0 },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  margins: { top: 100, bottom: 100 },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: "END OF PRESENTATION REPORT",
                          bold: true,
                          color: COLOR_PRIMARY,
                          font: FONT_BODY,
                          size: 18,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    },
  ],
});

// Write to Disk
Packer.toBuffer(doc).then((buffer) => {
  const filePath = path.join(process.cwd(), "public", "Wara_Wara_Construction_POS_Management_Report.docx");
  fs.writeFileSync(filePath, buffer);
  console.log("SUCCESS: Professional Wara Wara Management Report built successfully at:", filePath);
}).catch((err) => {
  console.error("ERROR generating DOCX:", err);
  process.exit(1);
});
