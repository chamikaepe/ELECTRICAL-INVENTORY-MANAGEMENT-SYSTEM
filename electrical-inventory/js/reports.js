// EXIMUS Electrical Inventory Management System
// reports.js - 10 Standard Enterprise Reports, Analytics, Print & PDF/Excel Exports

const EximusReports = {
  currentReportType: "complete_inventory",
  currentReportData: [],

  async init() {
    this.bindEvents();
    await this.generateReport();
  },

  bindEvents() {
    const reportSelect = document.getElementById("reportTypeSelect");
    if (reportSelect) {
      reportSelect.addEventListener("change", (e) => {
        this.currentReportType = e.target.value;
        this.generateReport();
      });
    }

    const catFilter = document.getElementById("reportCategoryFilter");
    if (catFilter) {
      catFilter.addEventListener("change", () => this.generateReport());
    }

    const locFilter = document.getElementById("reportLocationFilter");
    if (locFilter) {
      locFilter.addEventListener("change", () => this.generateReport());
    }

    const refreshBtn = document.getElementById("reportRefreshBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.generateReport());
    }

    const printBtn = document.getElementById("reportPrintBtn");
    if (printBtn) {
      printBtn.addEventListener("click", () => this.printReport());
    }

    const exportExcelBtn = document.getElementById("reportExportExcelBtn");
    if (exportExcelBtn) {
      exportExcelBtn.addEventListener("click", () => this.exportExcel());
    }
  },

  async generateReport() {
    const reportType = document.getElementById("reportTypeSelect")?.value || this.currentReportType;
    const catFilter = document.getElementById("reportCategoryFilter")?.value || "";
    const locFilter = document.getElementById("reportLocationFilter")?.value || "";

    const items = await EximusStorage.getAll("master_items");
    const issued = await EximusStorage.getAll("issued_items");
    const perm = await EximusStorage.getAll("permanent_returnable");
    const purchases = await EximusStorage.getAll("new_purchases");

    let reportTitle = "";
    let reportDesc = "";
    let data = [];
    let columns = [];
    let summaryStats = {};

    switch (reportType) {
      case "complete_inventory":
        reportTitle = "Master Electrical Inventory Report";
        reportDesc = "Complete ledger of all electrical components, tools, equipment, and switch gears.";
        data = items.filter((i) => {
          if (catFilter && (i.category || "").toUpperCase() !== catFilter.toUpperCase()) return false;
          if (locFilter && !(i.location || "").toLowerCase().includes(locFilter.toLowerCase())) return false;
          return true;
        });
        columns = [
          { key: "item_code", label: "Code" },
          { key: "item_name", label: "Item Name" },
          { key: "category", label: "Category" },
          { key: "description", label: "Description" },
          { key: "location", label: "Location" },
          { key: "quantity", label: "Quantity" },
          { key: "unit", label: "Unit" },
          { key: "condition", label: "Condition" },
          { key: "status", label: "Status" }
        ];
        summaryStats = {
          "Total Items": data.length,
          "Total Units": EximusUtils.formatNumber(data.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)),
          "New Items": data.filter((i) => i.condition === "NEW").length,
          "Usable Items": data.filter((i) => i.condition === "USABLE").length
        };
        break;

      case "category_breakdown":
        reportTitle = "Category-wise Inventory Breakdown";
        reportDesc = "Distribution of components across Hand Tools, Materials, Power Equipment, and Switch Gears.";
        const catMap = {};
        items.forEach((i) => {
          const c = i.category || "Unassigned";
          if (!catMap[c]) {
            catMap[c] = { category: c, skus: 0, total_units: 0, new_count: 0, usable_count: 0, low_stock: 0 };
          }
          catMap[c].skus++;
          catMap[c].total_units += Number(i.quantity) || 0;
          if (i.condition === "NEW") catMap[c].new_count++;
          if (i.condition === "USABLE") catMap[c].usable_count++;
          if ((Number(i.quantity) || 0) <= (Number(i.min_threshold) || 3)) catMap[c].low_stock++;
        });
        data = Object.values(catMap);
        columns = [
          { key: "category", label: "Category Name" },
          { key: "skus", label: "Total SKUs" },
          { key: "total_units", label: "Total Quantity" },
          { key: "new_count", label: "New Condition" },
          { key: "usable_count", label: "Usable Condition" },
          { key: "low_stock", label: "Low Stock Items" }
        ];
        summaryStats = {
          "Active Categories": data.length,
          "Total SKUs": items.length,
          "Total Units": EximusUtils.formatNumber(items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0))
        };
        break;

      case "location_breakdown":
        reportTitle = "Location-wise Inventory Breakdown";
        reportDesc = "Detailed storage asset audit across all 16 office inventory boxes, shelves, and containers.";
        const locMap = {};
        items.forEach((i) => {
          const l = i.location || "Unspecified";
          if (!locMap[l]) locMap[l] = { location: l, skus: 0, total_units: 0, low_stock: 0 };
          locMap[l].skus++;
          locMap[l].total_units += Number(i.quantity) || 0;
          if ((Number(i.quantity) || 0) <= (Number(i.min_threshold) || 3)) locMap[l].low_stock++;
        });
        data = Object.values(locMap).sort((a, b) => b.total_units - a.total_units);
        columns = [
          { key: "location", label: "Storage Location Name" },
          { key: "skus", label: "Stored SKUs" },
          { key: "total_units", label: "Total Stored Units" },
          { key: "low_stock", label: "Items Below Threshold" }
        ];
        summaryStats = {
          "Storage Locations": data.length,
          "Total Stored Units": EximusUtils.formatNumber(items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0))
        };
        break;

      case "available_stock":
        reportTitle = "Available In-Stock Inventory Report";
        reportDesc = "List of all components currently in stock and immediately available for field operations.";
        data = items.filter((i) => Number(i.quantity) > 0 && i.status !== "UNDER REPAIR" && i.status !== "AWAITING REPAIR");
        columns = [
          { key: "item_code", label: "Code" },
          { key: "item_name", label: "Item Name" },
          { key: "category", label: "Category" },
          { key: "location", label: "Location" },
          { key: "quantity", label: "Available Qty" },
          { key: "unit", label: "Unit" },
          { key: "condition", label: "Condition" }
        ];
        summaryStats = {
          "Available SKUs": data.length,
          "Total Ready Units": EximusUtils.formatNumber(data.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0))
        };
        break;

      case "issued_items":
        reportTitle = "Active Issued Items & Field Deployments";
        reportDesc = "List of tools and equipment currently checked out by employees and site teams.";
        data = issued.filter((i) => i.status !== "RETURNED");
        columns = [
          { key: "date_issued", label: "Date Issued" },
          { key: "issued_to", label: "Issued To / Recipient" },
          { key: "item_name", label: "Item Name" },
          { key: "quantity", label: "Qty Issued" },
          { key: "returned_quantity", label: "Qty Returned" },
          { key: "returned_date", label: "Expected Return" },
          { key: "status", label: "Status" }
        ];
        summaryStats = {
          "Pending Return Batches": data.length,
          "Total Units in Field": data.reduce((acc, i) => acc + (Number(i.quantity) - (Number(i.returned_quantity) || 0)), 0)
        };
        break;

      case "return_history":
        reportTitle = "Complete Return History Audit";
        reportDesc = "Comprehensive record of all equipment returned from site assignments.";
        data = issued;
        columns = [
          { key: "date_issued", label: "Date Issued" },
          { key: "returned_date", label: "Date Returned" },
          { key: "issued_to", label: "Employee Name" },
          { key: "item_name", label: "Item Returned" },
          { key: "quantity", label: "Issued Qty" },
          { key: "returned_quantity", label: "Returned Qty" },
          { key: "status", label: "Status" },
          { key: "remarks", label: "Remarks" }
        ];
        summaryStats = {
          "Total Issue Records": data.length,
          "Fully Returned": data.filter((i) => i.status === "RETURNED").length
        };
        break;

      case "permanent_issues":
        reportTitle = "Permanent Issues Ledger";
        reportDesc = "Listing of equipment and tools assigned permanently to staff (no return required).";
        data = perm;
        columns = [
          { key: "date_issued", label: "Date Issued" },
          { key: "issued_to", label: "Assigned To" },
          { key: "item_name", label: "Item Description" },
          { key: "quantity", label: "Quantity" },
          { key: "issue_type", label: "Assignment Type" },
          { key: "remarks", label: "Remarks" }
        ];
        summaryStats = {
          "Total Permanent Assignments": data.length,
          "Units Permanently Assigned": data.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)
        };
        break;

      case "purchase_history":
        reportTitle = "Procurement & Purchase History Report";
        reportDesc = "Audit of all stock purchases recorded in the system.";
        data = purchases;
        columns = [
          { key: "purchase_date", label: "Purchase Date" },
          { key: "item_name", label: "Item Name" },
          { key: "supplier", label: "Supplier / Vendor" },
          { key: "quantity", label: "Quantity" },
          { key: "unit", label: "Unit" },
          { key: "unit_price", label: "Unit Price" },
          { key: "total_amount", label: "Total Amount" },
          { key: "stored_location", label: "Allocated Location" }
        ];
        summaryStats = {
          "Purchase Orders": data.length,
          "Total Quantity Acquired": data.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0),
          "Total Expenditure": EximusUtils.formatCurrency(data.reduce((acc, i) => acc + (Number(i.total_amount) || 0), 0))
        };
        break;

      case "low_stock":
        reportTitle = "Low Stock & Reorder Alert Report";
        reportDesc = "Items currently at or below their safety stock threshold requiring restocking.";
        data = items.filter((i) => (Number(i.quantity) || 0) <= (Number(i.min_threshold) || 3));
        columns = [
          { key: "item_code", label: "Code" },
          { key: "item_name", label: "Item Name" },
          { key: "category", label: "Category" },
          { key: "location", label: "Location" },
          { key: "quantity", label: "Current Stock" },
          { key: "min_threshold", label: "Min Threshold" },
          { key: "unit", label: "Unit" },
          { key: "status", label: "Status" }
        ];
        summaryStats = {
          "Items Requiring Restock": data.length,
          "Out of Stock (Zero Units)": data.filter((i) => Number(i.quantity) === 0).length
        };
        break;

      case "condition_report":
        reportTitle = "Item Usability & Condition Assessment Report";
        reportDesc = "Technical audit categorized by NEW, USABLE, USED, and UNUSABLE equipment.";
        data = items;
        columns = [
          { key: "item_code", label: "Code" },
          { key: "item_name", label: "Item Name" },
          { key: "category", label: "Category" },
          { key: "condition", label: "Condition" },
          { key: "status", label: "Status" },
          { key: "quantity", label: "Quantity" },
          { key: "unit", label: "Unit" },
          { key: "location", label: "Location" }
        ];
        summaryStats = {
          "NEW Items": data.filter((i) => i.condition === "NEW").length,
          "USABLE Items": data.filter((i) => i.condition === "USABLE").length,
          "USED Items": data.filter((i) => i.condition === "USED").length,
          "UNUSABLE / Defective": data.filter((i) => i.condition === "UNUSABLE").length
        };
        break;
    }

    this.currentReportData = data;
    this.renderReportView(reportTitle, reportDesc, data, columns, summaryStats);
  },

  renderReportView(title, desc, data, columns, stats) {
    const titleEl = document.getElementById("reportViewTitle");
    const descEl = document.getElementById("reportViewDesc");
    const statsEl = document.getElementById("reportSummaryStatsContainer");
    const theadEl = document.getElementById("reportTableHead");
    const tbodyEl = document.getElementById("reportTableBody");
    const dateEl = document.getElementById("reportGeneratedDate");

    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;
    if (dateEl) dateEl.textContent = `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}`;

    // Render Stats Badges
    if (statsEl) {
      statsEl.innerHTML = Object.entries(stats)
        .map(
          ([label, val]) => `
        <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl">
          <span class="text-xs text-slate-500 font-medium block">${label}</span>
          <span class="text-lg font-bold text-slate-900 mt-0.5 block">${val}</span>
        </div>
      `
        )
        .join("");
    }

    // Render Table Header
    if (theadEl) {
      theadEl.innerHTML = `
        <tr class="bg-slate-100 border-b border-slate-200 text-slate-700">
          <th class="py-2.5 px-3 text-xs font-semibold text-center w-12">#</th>
          ${columns.map((c) => `<th class="py-2.5 px-3 text-xs font-semibold">${c.label}</th>`).join("")}
        </tr>
      `;
    }

    // Render Table Body
    if (tbodyEl) {
      if (!data.length) {
        tbodyEl.innerHTML = `<tr><td colspan="${columns.length + 1}" class="py-12 text-center text-slate-400">No records found for this report.</td></tr>`;
        return;
      }

      tbodyEl.innerHTML = data
        .map((row, idx) => {
          return `
          <tr class="hover:bg-slate-50/70 border-b border-slate-100 text-xs text-slate-700">
            <td class="py-2.5 px-3 text-center text-slate-400 font-mono">${idx + 1}</td>
            ${columns
              .map((c) => {
                const val = row[c.key];
                if (c.key === "condition") return `<td class="py-2.5 px-3">${EximusUtils.getConditionBadge(val)}</td>`;
                if (c.key === "status") return `<td class="py-2.5 px-3">${EximusUtils.getStatusBadge(val, row.quantity)}</td>`;
                if (c.key === "category") return `<td class="py-2.5 px-3">${EximusUtils.getCategoryBadge(val)}</td>`;
                if (c.key === "total_amount" || c.key === "unit_price") return `<td class="py-2.5 px-3 font-mono font-medium">${EximusUtils.formatCurrency(val)}</td>`;
                if (c.key === "item_code") return `<td class="py-2.5 px-3 font-mono font-semibold text-blue-600">${val || "-"}</td>`;
                return `<td class="py-2.5 px-3">${EximusUtils.escapeHTML(val !== undefined && val !== null ? val : "-")}</td>`;
              })
              .join("")}
          </tr>
        `;
        })
        .join("");
    }
  },

  // Print Report (Triggers print styling)
  printReport() {
    window.print();
  },

  // Export Report to Excel using SheetJS
  exportExcel() {
    if (!this.currentReportData.length) {
      EximusUtils.showToast("Notice", "No data to export.", "warning");
      return;
    }

    if (!window.XLSX) {
      EximusUtils.showToast("Error", "SheetJS XLSX library is still loading.", "error");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(this.currentReportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");

    const fileName = `Eximus_${this.currentReportType}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    EximusUtils.showToast("Export Successful", `Downloaded ${fileName}`, "success");
  }
};

window.EximusReports = EximusReports;


