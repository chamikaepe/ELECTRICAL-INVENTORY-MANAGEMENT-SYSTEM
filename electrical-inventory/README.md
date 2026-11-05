# EXIMUS – Professional Electrical Inventory Management System

An enterprise-grade, client-side Electrical Inventory Management Web Application built with **HTML5, CSS3, and Vanilla JavaScript (ES6+)**.

This system is preloaded with the complete company inventory records extracted from:
**`OFFICE ELECTRICAL INVENTORY (2026.07.01).xlsx`**

---

## ⚡ Key Highlights & Architecture

- **Zero Backend Required:** Runs entirely client-side without Node.js, Express, Python, or database servers. Compatible with VS Code Live Server or any static HTTP web host.
- **Persistent Storage:** High-performance browser **IndexedDB (`EximusInventoryDB v2`)** stores all 247+ master items, 5 warehouse configurations, inter-warehouse transfer records, loan records, new purchases, movement audit logs, and photo uploads.
- **5 Configurable Warehouses:** Manage and rename 5 separate company warehouses/site stores (WH-01 through WH-05) with live stock distribution tracking.
- **Inter-Warehouse Stock Transfers & Waybills:** Transfer components between warehouses with stock availability validation, automatic deduction/addition, and printable Goods Dispatch Notes (Waybills) featuring 3-signature verification blocks.
- **100% Preloaded Company Data:** Every single populated row and column across all six worksheets has been transcribed with zero data loss or fictional mockups.
- **SheetJS (XLSX) Multi-Sheet Engine:** Import updated workbooks or export complete 6-worksheet workbooks (*2026.07.01, Master Sheet, Issued Items, PermanetReturnable, New Purchases, Location*).
- **Linear / Stripe / Vercel ERP Interface:** Dark navy sidebar (`#0f172a`), crisp white card surfaces, subtle slate borders, Inter typography, dynamic Chart.js dashboards, and Lucide icons.

---

## 📁 Directory Structure

```text
/electrical-inventory
├── index.html                    # Main enterprise application interface
├── /css
│   ├── style.css                 # Enterprise design system, tables, modals & print styles
│   └── responsive.css            # Responsive layout, mobile drawer & breakpoints
├── /js
│   ├── app.js                    # Core coordinator, navigation router & global search
│   ├── dashboard.js              # KPI calculations, 4 Chart.js charts & live widgets
│   ├── inventory.js              # Master inventory table, search, multi-filters & CRUD
│   ├── categories.js             # 4 category cards, statistics & category item views
│   ├── transactions.js           # Issued items, permanent assignments & purchases
│   ├── locations.js              # 16 location cards with photo upload & stock tracking
│   ├── transfers.js              # 5 Warehouses management & inter-store transfers ledger
│   ├── reports.js                # 10 enterprise reports, print/PDF & export engines
│   ├── excel.js                  # SheetJS import/export with multi-sheet validation
│   ├── storage.js                # IndexedDB persistence engine & LocalStorage fallback
│   ├── utilities.js              # Toast notifications, modals, badges & formatters
│   ├── data-seed.js              # Hand Tools, Power Equipment, Switch Gears & Locations
│   ├── data-materials.js         # 194 Material items from Master Sheet
│   └── data-worksheet1.js        # Worksheet 01 items, baseline loans, purchases & movements
├── /assets
│   ├── /images                   # Storage for location photographs and brand marks
│   └── /icons                    # Icon assets and fallbacks
└── /data
    └── imported-inventory-data.json # Exact JSON replica of the provided Excel workbook
```

---

## 🚀 How to Launch the Application

1. Open the project folder in **VS Code**.
2. Right-click `index.html` (either at the root or inside `/electrical-inventory`).
3. Select **"Open with Live Server"** (or use any static web server such as `npx serve`, Python `python -m http.server`, or direct browser opening).
4. The application boots and initializes the IndexedDB database preloaded with the Excel records!

---

## 📊 Summary of Imported Worksheets

| Worksheet | Original Title | Records Imported | Notes & Highlights |
| :--- | :--- | :---: | :--- |
| **01** | `2026.07.01` | **243** | All 16+ shelf/box sections with codes `ELE-00A` through `ELE-00V` and conditions (`NEW`, `USABLE`, `USED`, `UNUSABLE`). |
| **02** | `Master Sheet` | **247** | Primary inventory: Hand Tools (23), Materials (194), Power Equipment (23), Switch Gears (7). |
| **03** | `Issued Items` | **2** | Saftey Helmets (Qty 6) and Safety Jackets (Qty 4) returned on 2026-07-16. |
| **04** | `PermanetReturnable`| **2** | Mr. Danushka permanent issues (Helmets Qty 1, Safety Jacket Qty 1). |
| **05** | `New Purchases` | **2** | Safety Jackets (Qty 5 on 2026-07-09), Extension Code (Qty 2 on 2026-10-13). |
| **06** | `Location` | **16** | 16 physical storage locations with image upload and capacity tags. |

---

## 🏬 5 Warehouses Management & Inter-Store Stock Transfers

The company operates with 5 primary warehouses and field stores. The system provides complete management and inter-store stock movement:

### 1. Default Warehouses Configuration:
1. **WH-01: Main Central Warehouse** (Head Office Complex, Colombo) - Central Hub managed by Senior Site Admin.
2. **WH-02: Site A Storage Depot** (Project Site Alpha - Residential Solar) - Active project container store.
3. **WH-03: Site B Field Store** (Commercial Site Beta) - Commercial installation warehouse.
4. **WH-04: Project Solar Staging Yard** (Logistics Industrial Zone) - Heavy staging area for cables and inverters.
5. **WH-05: Technical Workshop & Service Store** (Testing & Maintenance Facility) - Power tools calibration & repairs.

### 2. Rename & Customize Any Warehouse:
- Navigate to **"Warehouses & Transfers"** in the sidebar.
- Click the **"Manage 5 Warehouses"** sub-tab.
- Click **"Edit / Rename Warehouse"** on any warehouse card.
- You can change the **Warehouse Name** (e.g. rename to your specific site names such as "Kandy Project Store", "Galle Depot", etc.), update the Manager, Contact Number, Facility Type, and Physical Location.
- Changes persist automatically into IndexedDB.

### 3. Inter-Warehouse Transfer Workflow:
- Click **"+ New Stock Transfer"**.
- Select the **Source Warehouse** (where items are currently stored).
- Select the **Destination Warehouse** (where items should be delivered).
- Select the **Item**: Only items with available stock at the source warehouse are listed, complete with live in-stock counts.
- Enter the **Transfer Quantity**: System prevents transferring more than available source stock and prevents negative inventory.
- Enter **Authorized Officer**, **Logistics / Vehicle / Driver** details, and **Reason**.
- Click **"Execute Transfer & Generate Waybill"**:
  1. Deducts quantity from Source Warehouse stock.
  2. Adds quantity to Destination Warehouse stock.
  3. Records entry in the Transfers Ledger and Stock Movements Audit Log.
  4. Automatically opens a printable **Goods Dispatch Note / Transfer Waybill** with 3 signature verification blocks (Dispatched By, Carrier / Driver, Received By).

---

## 🔒 Data Persistence & Multi-Computer Notice

This application runs securely inside the client's web browser using **IndexedDB**.
Because there is no centralized backend server:
- Records do not automatically synchronize to other employee computers across the network.
- To share, transfer, or backup inventory records, use:
  1. **Settings -> Save JSON Backup Snapshot** (one-click full backup file).
  2. **Settings -> Restore JSON Database** (one-click restore on any workstation).
  3. **Excel Import/Export -> Export Complete 6-Worksheet Excel Workbook** (`.xlsx`).

---

© 2026 **EXIMUS Electrical Systems**. All rights reserved.

