// EXIMUS Electrical Inventory Management System
// inventory.js - Master Inventory Table, Search, Multi-Filter, Sorting, Pagination & CRUD Modals

const EximusInventory = {
  items: [],
  filteredItems: [],
  currentPage: 1,
  pageSize: 25,
  sortColumn: "id",
  sortDirection: "asc",

  // Filter state
  filters: {
    search: "",
    category: "",
    location: "",
    warehouse: "",
    condition: "",
    status: "",
    stockLevel: ""
  },

  async init() {
    this.bindEvents();
    await this.loadLocationsDropdown();
    await this.loadData();

    // Listen for storage changes
    window.addEventListener("eximus:storage_changed", (e) => {
      const s = e.detail?.storeName;
      if (s === "master_items" || s === "warehouses" || s === "warehouse_transfers" || s === "all") {
        this.loadLocationsDropdown();
        this.loadData();
      }
    });
  },

  bindEvents() {
    // Search input
    const searchInput = document.getElementById("inventorySearchInput");
    if (searchInput) {
      searchInput.addEventListener(
        "input",
        EximusUtils.debounce((e) => {
          this.filters.search = e.target.value.trim().toLowerCase();
          this.currentPage = 1;
          this.applyFilters();
        }, 250)
      );
    }

    // Category filter
    const catSelect = document.getElementById("inventoryCategoryFilter");
    if (catSelect) {
      catSelect.addEventListener("change", (e) => {
        this.filters.category = e.target.value;
        this.currentPage = 1;
        this.applyFilters();
      });
    }

    // Location filter
    const locSelect = document.getElementById("inventoryLocationFilter");
    if (locSelect) {
      locSelect.addEventListener("change", (e) => {
        this.filters.location = e.target.value;
        this.currentPage = 1;
        this.applyFilters();
      });
    }

    // Warehouse filter
    const whSelect = document.getElementById("inventoryWarehouseFilter");
    if (whSelect) {
      whSelect.addEventListener("change", (e) => {
        this.filters.warehouse = e.target.value;
        this.currentPage = 1;
        this.applyFilters();
      });
    }

    // Condition filter
    const condSelect = document.getElementById("inventoryConditionFilter");
    if (condSelect) {
      condSelect.addEventListener("change", (e) => {
        this.filters.condition = e.target.value;
        this.currentPage = 1;
        this.applyFilters();
      });
    }

    // Status filter
    const statusSelect = document.getElementById("inventoryStatusFilter");
    if (statusSelect) {
      statusSelect.addEventListener("change", (e) => {
        this.filters.status = e.target.value;
        this.currentPage = 1;
        this.applyFilters();
      });
    }

    // Stock Level filter
    const stockSelect = document.getElementById("inventoryStockLevelFilter");
    if (stockSelect) {
      stockSelect.addEventListener("change", (e) => {
        this.filters.stockLevel = e.target.value;
        this.currentPage = 1;
        this.applyFilters();
      });
    }

    // Page size selector
    const pageSizeSelect = document.getElementById("inventoryPageSize");
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener("change", (e) => {
        this.pageSize = e.target.value === "all" ? 99999 : Number(e.target.value);
        this.currentPage = 1;
        this.renderTable();
      });
    }

    // Clear filters button
    const clearBtn = document.getElementById("inventoryClearFiltersBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        this.resetFilters();
      });
    }
  },

  async loadLocationsDropdown() {
    const locations = await EximusStorage.getAll("locations");
    const warehouses = await EximusStorage.getWarehouses();
    const locSelect = document.getElementById("inventoryLocationFilter");
    const formLocSelect = document.getElementById("itemFormLocation");
    const reportLocSelect = document.getElementById("reportLocationFilter");
    const whSelect = document.getElementById("inventoryWarehouseFilter");

    if (locSelect) {
      locSelect.innerHTML = `<option value="">All Locations (${locations.length})</option>` +
        locations.map((loc) => `<option value="${EximusUtils.escapeHTML(loc.name)}">${EximusUtils.escapeHTML(loc.name)}</option>`).join("");
    }

    if (whSelect) {
      whSelect.innerHTML = `<option value="">All 5 Warehouses</option>` +
        warehouses.map((w) => `<option value="${w.id}">${w.name} (${w.code})</option>`).join("");
    }

    if (formLocSelect) {
      formLocSelect.innerHTML = `<option value="">Select Location...</option>` +
        locations.map((loc) => `<option value="${EximusUtils.escapeHTML(loc.name)}">${EximusUtils.escapeHTML(loc.name)}</option>`).join("");
    }

    if (reportLocSelect) {
      reportLocSelect.innerHTML = `<option value="">All Locations</option>` +
        locations.map((loc) => `<option value="${EximusUtils.escapeHTML(loc.name)}">${EximusUtils.escapeHTML(loc.name)}</option>`).join("");
    }
  },

  async loadData() {
    this.items = await EximusStorage.getAll("master_items");
    this.applyFilters();
  },

  resetFilters() {
    this.filters = { search: "", category: "", location: "", warehouse: "", condition: "", status: "", stockLevel: "" };

    const searchInput = document.getElementById("inventorySearchInput");
    if (searchInput) searchInput.value = "";

    const catSelect = document.getElementById("inventoryCategoryFilter");
    if (catSelect) catSelect.value = "";

    const locSelect = document.getElementById("inventoryLocationFilter");
    if (locSelect) locSelect.value = "";

    const whSelect = document.getElementById("inventoryWarehouseFilter");
    if (whSelect) whSelect.value = "";

    const condSelect = document.getElementById("inventoryConditionFilter");
    if (condSelect) condSelect.value = "";

    const statusSelect = document.getElementById("inventoryStatusFilter");
    if (statusSelect) statusSelect.value = "";

    const stockSelect = document.getElementById("inventoryStockLevelFilter");
    if (stockSelect) stockSelect.value = "";

    this.currentPage = 1;
    this.applyFilters();
  },

  applyFilters() {
    const { search, category, location, warehouse, condition, status, stockLevel } = this.filters;

    this.filteredItems = this.items.filter((item) => {
      // Search text match
      if (search) {
        const query = search.toLowerCase();
        const matchName = (item.item_name || "").toLowerCase().includes(query);
        const matchCode = (item.item_code || "").toLowerCase().includes(query);
        const matchDesc = (item.description || "").toLowerCase().includes(query);
        const matchBrand = (item.brand_name || "").toLowerCase().includes(query);
        const matchModel = (item.model || "").toLowerCase().includes(query);
        const matchSpecs = (item.item_specs || "").toLowerCase().includes(query);
        const matchLoc = (item.location || "").toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchDesc && !matchBrand && !matchModel && !matchSpecs && !matchLoc) {
          return false;
        }
      }

      // Category filter
      if (category && (item.category || "").toUpperCase() !== category.toUpperCase()) {
        return false;
      }

      // Location filter
      if (location && (item.location || "").toLowerCase() !== location.toLowerCase()) {
        // also partial match if location string contains the filter
        if (!(item.location || "").toLowerCase().includes(location.toLowerCase())) {
          return false;
        }
      }

      // Warehouse filter
      if (warehouse) {
        const whStock = Number(item.warehouse_stock?.[warehouse] || 0);
        if (whStock <= 0) return false;
      }

      // Condition filter
      if (condition && (item.condition || "").toUpperCase() !== condition.toUpperCase()) {
        return false;
      }

      // Status filter
      if (status) {
        if (status === "LOW_STOCK") {
          const q = Number(item.quantity) || 0;
          const th = Number(item.min_threshold) || 3;
          if (q > th) return false;
        } else if (status === "OUT_OF_STOCK") {
          if (Number(item.quantity) > 0) return false;
        } else if ((item.status || "AVAILABLE").toUpperCase() !== status.toUpperCase()) {
          return false;
        }
      }

      // Stock Level filter
      if (stockLevel) {
        const q = Number(item.quantity) || 0;
        const th = Number(item.min_threshold) || 3;
        if (stockLevel === "in_stock" && q <= 0) return false;
        if (stockLevel === "low_stock" && (q > th || q <= 0)) return false;
        if (stockLevel === "out_of_stock" && q > 0) return false;
      }

      return true;
    });

    this.sortItems();
    this.renderTable();
  },

  sort(column) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.sortColumn = column;
      this.sortDirection = "asc";
    }
    this.sortItems();
    this.renderTable();
  },

  sortItems() {
    const col = this.sortColumn;
    const dir = this.sortDirection === "asc" ? 1 : -1;

    this.filteredItems.sort((a, b) => {
      let valA = a[col];
      let valB = b[col];

      if (col === "quantity" || col === "category_no") {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
        return (valA - valB) * dir;
      }

      valA = String(valA || "").toLowerCase();
      valB = String(valB || "").toLowerCase();

      return valA.localeCompare(valB) * dir;
    });
  },

  renderTable() {
    const tbody = document.getElementById("masterInventoryTableBody");
    const countEl = document.getElementById("inventoryResultCount");
    const paginationEl = document.getElementById("inventoryPaginationControls");

    if (!tbody) return;

    if (countEl) {
      countEl.innerHTML = `Showing <span class="font-bold text-slate-800">${this.filteredItems.length}</span> of <span class="font-bold text-slate-800">${this.items.length}</span> master inventory records`;
    }

    if (this.filteredItems.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="15" class="py-12 text-center text-slate-400">
            <i data-lucide="package-search" class="w-12 h-12 mx-auto mb-3 text-slate-300"></i>
            <p class="text-base font-semibold text-slate-700">No Inventory Items Found</p>
            <p class="text-xs text-slate-400 mt-1">Try adjusting your search keywords or filter criteria.</p>
            <button onclick="EximusInventory.resetFilters()" class="mt-4 px-4 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              Clear All Filters
            </button>
          </td>
        </tr>
      `;
      if (paginationEl) paginationEl.innerHTML = "";
      if (window.lucide) lucide.createIcons();
      return;
    }

    // Pagination slice
    const totalPages = Math.ceil(this.filteredItems.length / this.pageSize);
    if (this.currentPage > totalPages) this.currentPage = totalPages || 1;

    const startIdx = (this.currentPage - 1) * this.pageSize;
    const endIdx = startIdx + this.pageSize;
    const pageItems = this.filteredItems.slice(startIdx, endIdx);

    tbody.innerHTML = pageItems
      .map((item, index) => {
        const displayNo = item.category_no || startIdx + index + 1;
        const q = Number(item.quantity) || 0;
        const isLow = q <= (Number(item.min_threshold) || 3) && q > 0;
        const isOut = q === 0;

        return `
        <tr class="hover:bg-slate-50/70 border-b border-slate-100 transition-colors group">
          <td class="py-3 px-3 text-xs text-slate-400 font-mono text-center">${displayNo}</td>
          <td class="py-3 px-3">
            <span class="font-mono text-xs font-semibold text-blue-600 bg-blue-50/70 px-2 py-0.5 rounded border border-blue-100">
              ${EximusUtils.escapeHTML(item.item_code || item.id)}
            </span>
          </td>
          <td class="py-3 px-4">
            <div class="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
              ${EximusUtils.escapeHTML(item.item_name)}
            </div>
            ${item.remarks ? `<p class="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">${EximusUtils.escapeHTML(item.remarks)}</p>` : ""}
          </td>
          <td class="py-3 px-3">${EximusUtils.getCategoryBadge(item.category)}</td>
          <td class="py-3 px-3 text-xs text-slate-600 max-w-[180px] truncate" title="${EximusUtils.escapeHTML(item.description || "-")}">
            ${EximusUtils.escapeHTML(item.description || "-")}
          </td>
          <td class="py-3 px-3 text-xs text-slate-700 font-medium">
            ${EximusUtils.escapeHTML(item.brand_name || "-")}
          </td>
          <td class="py-3 px-3 text-xs text-slate-600 font-mono">
            ${EximusUtils.escapeHTML(item.model || "-")}
          </td>
          <td class="py-3 px-3 text-xs text-slate-600 max-w-[140px] truncate" title="${EximusUtils.escapeHTML(item.item_specs || "-")}">
            ${EximusUtils.escapeHTML(item.item_specs || "-")}
          </td>
          <td class="py-3 px-3 text-xs text-slate-700">
            <span class="inline-flex items-center gap-1 max-w-[160px] truncate" title="${EximusUtils.escapeHTML(item.location || "-")}">
              <i data-lucide="map-pin" class="w-3 h-3 text-slate-400 flex-shrink-0"></i>
              ${EximusUtils.escapeHTML(item.location || "-")}
            </span>
          </td>
          <td class="py-3 px-2 text-xs text-slate-500 text-center font-medium">${EximusUtils.escapeHTML(item.unit || "Pcs")}</td>
          <td class="py-3 px-3 text-right">
            <div class="font-bold text-sm ${isOut ? "text-rose-600" : isLow ? "text-amber-600" : "text-slate-900"}">
              ${item.quantity}
            </div>
            ${isOut ? '<span class="text-[10px] text-rose-500 font-semibold uppercase">Out</span>' : isLow ? '<span class="text-[10px] text-amber-500 font-semibold uppercase">Low</span>' : ""}
          </td>
          <td class="py-3 px-3 text-center">${EximusUtils.getConditionBadge(item.condition)}</td>
          <td class="py-3 px-3 text-center">${EximusUtils.getStatusBadge(item.status, item.quantity)}</td>
          <td class="py-3 px-3 text-center">
            <div class="flex items-center justify-center gap-1">
              <button onclick="EximusInventory.viewItemDetails('${item.id}')" title="View Full Details" class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                <i data-lucide="eye" class="w-4 h-4"></i>
              </button>
              <button onclick="EximusInventory.openQuickStockModal('${item.id}')" title="Adjust Stock" class="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors">
                <i data-lucide="sliders" class="w-4 h-4"></i>
              </button>
              <button onclick="EximusInventory.openEditItemModal('${item.id}')" title="Edit Item" class="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button onclick="EximusInventory.deleteItem('${item.id}')" title="Delete Item" class="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join("");

    this.renderPagination(totalPages);
    if (window.lucide) lucide.createIcons();
  },

  renderPagination(totalPages) {
    const el = document.getElementById("inventoryPaginationControls");
    if (!el) return;

    if (totalPages <= 1) {
      el.innerHTML = "";
      return;
    }

    let pagesHtml = "";
    const current = this.currentPage;

    // Prev button
    pagesHtml += `
      <button onclick="EximusInventory.goToPage(${current - 1})" ${current === 1 ? "disabled" : ""} class="px-2.5 py-1 text-xs font-medium rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
        Prev
      </button>
    `;

    // Smart pagination buttons (first, ellipsis, near current, ellipsis, last)
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= current - 2 && p <= current + 2)) {
        pagesHtml += `
          <button onclick="EximusInventory.goToPage(${p})" class="px-3 py-1 text-xs font-semibold rounded border ${p === current ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}">
            ${p}
          </button>
        `;
      } else if (p === current - 3 || p === current + 3) {
        pagesHtml += `<span class="px-1 text-slate-400 text-xs">...</span>`;
      }
    }

    // Next button
    pagesHtml += `
      <button onclick="EximusInventory.goToPage(${current + 1})" ${current === totalPages ? "disabled" : ""} class="px-2.5 py-1 text-xs font-medium rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
        Next
      </button>
    `;

    el.innerHTML = `
      <div class="flex items-center gap-1.5">
        ${pagesHtml}
      </div>
    `;
  },

  goToPage(p) {
    const totalPages = Math.ceil(this.filteredItems.length / this.pageSize);
    if (p < 1 || p > totalPages) return;
    this.currentPage = p;
    this.renderTable();
    window.scrollTo({ top: 300, behavior: "smooth" });
  },

  // View Item Full Details Modal
  async viewItemDetails(itemId) {
    const item = await EximusStorage.getById("master_items", itemId);
    if (!item) {
      EximusUtils.showToast("Error", "Item not found in master database.", "error");
      return;
    }

    const modal = document.getElementById("itemDetailsModal");
    const content = document.getElementById("itemDetailsModalContent");
    if (!modal || !content) return;

    // Get item-specific movements
    const allMovements = await EximusStorage.getAll("stock_movements");
    const itemMovements = allMovements.filter((m) => m.item_id === item.id || m.item_name === item.item_name);
    const warehouses = await EximusStorage.getWarehouses();

    content.innerHTML = `
      <div class="space-y-6">
        <!-- Header Banner -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="font-mono text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">${item.item_code || item.id}</span>
              ${EximusUtils.getCategoryBadge(item.category)}
              ${EximusUtils.getConditionBadge(item.condition)}
            </div>
            <h2 class="text-xl font-bold text-slate-900">${EximusUtils.escapeHTML(item.item_name)}</h2>
            <p class="text-xs text-slate-500 mt-0.5">Stored at: <span class="font-semibold text-slate-700">${EximusUtils.escapeHTML(item.location || "Unspecified")}</span></p>
          </div>
          <div class="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span class="text-xs text-slate-500">Current Stock</span>
            <div class="text-2xl font-black text-slate-900">${item.quantity} <span class="text-xs font-normal text-slate-500">${item.unit}</span></div>
            <div class="mt-1">${EximusUtils.getStatusBadge(item.status, item.quantity)}</div>
          </div>
        </div>

        <!-- Multi-Warehouse Stock Breakdown -->
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div class="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
            <p class="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <i data-lucide="building-2" class="w-3.5 h-3.5 text-blue-600"></i> Stock Distribution Across 5 Warehouses
            </p>
            <button onclick="EximusUtils.closeModal('itemDetailsModal'); EximusApp.navigate('transfers'); setTimeout(() => EximusTransfers.openNewTransferModal(), 200);" class="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-2.5 py-1 rounded-lg shadow-sm transition">
              Transfer Item &rarr;
            </button>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            ${warehouses.map(w => {
              const qty = Number(item.warehouse_stock?.[w.id] || 0);
              const hasStock = qty > 0;
              return `
                <div class="p-2.5 rounded-lg border text-center transition ${hasStock ? 'bg-blue-50/70 border-blue-200 text-blue-900' : 'bg-white border-slate-200 text-slate-400 opacity-70'}">
                  <div class="text-[10px] font-mono font-bold uppercase truncate" title="${w.name}">${w.code}</div>
                  <div class="text-base font-black font-mono my-0.5 ${hasStock ? 'text-blue-700' : 'text-slate-400'}">${qty}</div>
                  <div class="text-[10px] truncate text-slate-500" title="${w.name}">${w.name}</div>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <!-- Barcode / Asset Identifier Graphic -->
        <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col items-center text-center">
          <p class="text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1">Asset Barcode & Quick Identification Tag</p>
          <div class="max-w-xs w-full bg-white p-2 rounded-lg border border-slate-200">
            ${EximusUtils.generateBarcodeSVG(item.item_code || item.id)}
            <p class="font-mono text-xs text-slate-600 mt-1">${item.item_code || item.id} • ${EximusUtils.escapeHTML(item.item_name)}</p>
          </div>
        </div>

        <!-- Technical Specification Matrix -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
            <p class="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1.5">Specification Details</p>
            <div class="flex justify-between"><span class="text-slate-500">Brand Name:</span><span class="font-semibold text-slate-800">${EximusUtils.escapeHTML(item.brand_name || "None / Generic")}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Model:</span><span class="font-semibold text-slate-800">${EximusUtils.escapeHTML(item.model || "None")}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Item Specs:</span><span class="font-semibold text-slate-800 text-right max-w-xs">${EximusUtils.escapeHTML(item.item_specs || "-")}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Unit of Measure:</span><span class="font-semibold text-slate-800">${EximusUtils.escapeHTML(item.unit)}</span></div>
          </div>

          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
            <p class="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1.5">Inventory Management Info</p>
            <div class="flex justify-between"><span class="text-slate-500">Storage Location:</span><span class="font-semibold text-slate-800 text-right">${EximusUtils.escapeHTML(item.location)}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Min. Alert Threshold:</span><span class="font-semibold text-slate-800">${item.min_threshold || 3} ${item.unit}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Date Added:</span><span class="font-semibold text-slate-800">${EximusUtils.formatDate(item.date_added || "2026-07-01")}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Description:</span><span class="font-semibold text-slate-800 text-right max-w-xs">${EximusUtils.escapeHTML(item.description || "-")}</span></div>
          </div>
        </div>

        ${
          item.remarks
            ? `
          <div class="p-3 bg-blue-50/60 rounded-xl border border-blue-200/60 text-xs">
            <span class="font-bold text-blue-900">Remarks:</span>
            <span class="text-blue-800 ml-1.5">${EximusUtils.escapeHTML(item.remarks)}</span>
          </div>
        `
            : ""
        }

        <!-- Movement History for this Item -->
        <div>
          <h4 class="text-sm font-bold text-slate-900 mb-2">Item Movement & Audit Log (${itemMovements.length})</h4>
          <div class="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
            ${
              itemMovements.length === 0
                ? '<p class="text-xs text-slate-400 py-4 text-center">No transactions recorded for this item yet.</p>'
                : `
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-100/70 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th class="py-2 px-3">Date</th>
                    <th class="py-2 px-3">Type</th>
                    <th class="py-2 px-3">Change</th>
                    <th class="py-2 px-3">Notes</th>
                    <th class="py-2 px-3">User</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${itemMovements
                    .map(
                      (m) => `
                    <tr>
                      <td class="py-2 px-3 text-slate-500">${EximusUtils.formatDateTime(m.timestamp)}</td>
                      <td class="py-2 px-3 font-semibold text-slate-800">${m.type}</td>
                      <td class="py-2 px-3 font-mono ${m.quantity_change > 0 ? "text-emerald-600" : m.quantity_change < 0 ? "text-rose-600" : "text-slate-500"}">${m.quantity_change > 0 ? "+" : ""}${m.quantity_change}</td>
                      <td class="py-2 px-3 text-slate-600 max-w-xs truncate">${EximusUtils.escapeHTML(m.notes || "-")}</td>
                      <td class="py-2 px-3 text-slate-500">${EximusUtils.escapeHTML(m.performed_by || "System")}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            `
            }
          </div>
        </div>

        <!-- Modal Actions -->
        <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
          <button onclick="EximusInventory.openQuickStockModal('${item.id}'); EximusUtils.closeModal('itemDetailsModal');" class="px-3.5 py-2 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">
            Adjust Stock
          </button>
          <button onclick="EximusInventory.openEditItemModal('${item.id}'); EximusUtils.closeModal('itemDetailsModal');" class="px-3.5 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
            Edit Item
          </button>
          <button onclick="EximusUtils.closeModal('itemDetailsModal')" class="px-4 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>
    `;

    EximusUtils.openModal("itemDetailsModal");
  },

  // Open Add Item Modal
  openAddItemModal() {
    const form = document.getElementById("itemForm");
    if (form) form.reset();

    const titleEl = document.getElementById("itemModalTitle");
    if (titleEl) titleEl.textContent = "Add New Inventory Item";

    const idInput = document.getElementById("itemFormId");
    if (idInput) idInput.value = "";

    const codeInput = document.getElementById("itemFormCode");
    if (codeInput) codeInput.value = "ELE-" + Math.floor(100 + Math.random() * 900);

    const minThEl = document.getElementById("itemFormMinThreshold");
    if (minThEl) minThEl.value = 3;

    EximusUtils.openModal("itemModal");
  },

  // Open Edit Item Modal
  async openEditItemModal(itemId) {
    const item = await EximusStorage.getById("master_items", itemId);
    if (!item) return;

    const titleEl = document.getElementById("itemModalTitle");
    if (titleEl) titleEl.textContent = "Edit Inventory Item";

    document.getElementById("itemFormId").value = item.id;
    document.getElementById("itemFormName").value = item.item_name || "";
    document.getElementById("itemFormCategory").value = item.category || "MATERIALS";
    document.getElementById("itemFormCode").value = item.item_code || "";
    document.getElementById("itemFormDescription").value = item.description || "";
    document.getElementById("itemFormBrand").value = item.brand_name || "";
    document.getElementById("itemFormModel").value = item.model || "";
    document.getElementById("itemFormSpecs").value = item.item_specs || "";
    document.getElementById("itemFormLocation").value = item.location || "";
    document.getElementById("itemFormUnit").value = item.unit || "Pcs";
    document.getElementById("itemFormQuantity").value = item.quantity || 0;
    document.getElementById("itemFormCondition").value = item.condition || "NEW";
    document.getElementById("itemFormStatus").value = item.status || "AVAILABLE";
    document.getElementById("itemFormMinThreshold").value = item.min_threshold || 3;
    document.getElementById("itemFormRemarks").value = item.remarks || "";

    EximusUtils.openModal("itemModal");
  },

  // Handle Save (Add or Update)
  async handleSaveItem(e) {
    e.preventDefault();

    const id = document.getElementById("itemFormId").value;
    const name = document.getElementById("itemFormName").value.trim();
    const category = document.getElementById("itemFormCategory").value;
    const itemCode = document.getElementById("itemFormCode").value.trim();
    const description = document.getElementById("itemFormDescription").value.trim();
    const brand = document.getElementById("itemFormBrand").value.trim();
    const model = document.getElementById("itemFormModel").value.trim();
    const specs = document.getElementById("itemFormSpecs").value.trim();
    const location = document.getElementById("itemFormLocation").value.trim();
    const unit = document.getElementById("itemFormUnit").value.trim() || "Pcs";
    const quantity = Number(document.getElementById("itemFormQuantity").value) || 0;
    const condition = document.getElementById("itemFormCondition").value;
    const status = document.getElementById("itemFormStatus").value;
    const minThreshold = Number(document.getElementById("itemFormMinThreshold").value) || 3;
    const remarks = document.getElementById("itemFormRemarks").value.trim();

    if (!name) {
      EximusUtils.showToast("Validation Error", "Item Name is required.", "warning");
      return;
    }

    if (quantity < 0) {
      EximusUtils.showToast("Validation Error", "Quantity cannot be negative.", "warning");
      return;
    }

    const isEdit = Boolean(id);
    const finalId = isEdit ? id : EximusUtils.generateId(category === "HAND TOOLS" ? "HT" : category === "POWER EQUIPMENT" ? "PE" : category === "SWITCH GEARS" ? "SG" : "MAT");

    const itemObj = {
      id: finalId,
      category,
      item_code: itemCode || finalId,
      item_name: name,
      description: description || "-",
      brand_name: brand,
      model: model,
      item_specs: specs || "-",
      location: location || "Office Electrical Storage",
      unit,
      quantity,
      condition,
      status: quantity === 0 ? "OUT_OF_STOCK" : status,
      min_threshold: minThreshold,
      remarks,
      date_added: isEdit ? (await EximusStorage.getById("master_items", id))?.date_added || "2026-07-01" : new Date().toISOString().slice(0, 10)
    };

    await EximusStorage.put("master_items", itemObj);

    // Audit log
    await EximusStorage.add("stock_movements", {
      id: "MOV-" + Date.now(),
      timestamp: new Date().toISOString(),
      item_id: finalId,
      item_name: name,
      type: isEdit ? "UPDATE" : "ADD_ITEM",
      quantity_change: 0,
      balance_after: quantity,
      performed_by: "Administrator",
      reference_id: finalId,
      notes: isEdit ? "Updated item specifications and inventory record." : "Created new item entry in master inventory."
    });

    EximusUtils.closeModal("itemModal");
    EximusUtils.showToast("Success", isEdit ? "Item updated successfully." : "New item added to inventory.", "success");
    await this.loadData();
  },

  // Open Quick Stock Adjustment Modal
  async openQuickStockModal(itemId) {
    const item = await EximusStorage.getById("master_items", itemId);
    if (!item) return;

    document.getElementById("quickStockItemId").value = item.id;
    document.getElementById("quickStockItemName").textContent = item.item_name;
    document.getElementById("quickStockCurrentQty").textContent = `${item.quantity} ${item.unit}`;
    document.getElementById("quickStockDelta").value = "";
    document.getElementById("quickStockReason").value = "STOCK_COUNT";
    document.getElementById("quickStockNotes").value = "";

    EximusUtils.openModal("quickStockModal");
  },

  // Handle Quick Stock Adjustment
  async handleQuickStockAdjustment(e) {
    e.preventDefault();

    const itemId = document.getElementById("quickStockItemId").value;
    const delta = Number(document.getElementById("quickStockDelta").value);
    const reason = document.getElementById("quickStockReason").value;
    const notes = document.getElementById("quickStockNotes").value.trim();

    if (isNaN(delta) || delta === 0) {
      EximusUtils.showToast("Invalid Input", "Please enter a non-zero adjustment quantity (e.g. +5 or -2).", "warning");
      return;
    }

    const item = await EximusStorage.getById("master_items", itemId);
    if (!item) return;

    const currentQty = Number(item.quantity) || 0;
    const newQty = currentQty + delta;

    if (newQty < 0) {
      EximusUtils.showToast("Restricted", `Cannot reduce stock below zero! Current stock is only ${currentQty} ${item.unit}.`, "error");
      return;
    }

    item.quantity = newQty;
    if (newQty === 0) {
      item.status = "OUT_OF_STOCK";
    } else if (item.status === "OUT_OF_STOCK") {
      item.status = "AVAILABLE";
    }

    await EximusStorage.put("master_items", item);

    // Record movement
    await EximusStorage.add("stock_movements", {
      id: "MOV-" + Date.now(),
      timestamp: new Date().toISOString(),
      item_id: item.id,
      item_name: item.item_name,
      type: "ADJUSTMENT",
      quantity_change: delta,
      balance_after: newQty,
      performed_by: "Store Administrator",
      reference_id: "MANUAL_ADJUSTMENT",
      notes: `Reason: ${reason}. Notes: ${notes || "Manual stock count adjustment."}`
    });

    EximusUtils.closeModal("quickStockModal");
    EximusUtils.showToast("Stock Adjusted", `Updated ${item.item_name} to ${newQty} ${item.unit} (${delta > 0 ? "+" : ""}${delta}).`, "success");
    await this.loadData();
  },

  // Delete Item
  async deleteItem(itemId) {
    const item = await EximusStorage.getById("master_items", itemId);
    if (!item) return;

    const confirmed = await EximusUtils.confirm({
      title: "Delete Inventory Item",
      message: `Are you sure you want to permanently delete "${item.item_name}" (${item.item_code || item.id})? This will remove all stock history records for this item.`,
      confirmText: "Yes, Delete Item",
      cancelText: "Cancel",
      variant: "danger"
    });

    if (!confirmed) return;

    await EximusStorage.delete("master_items", itemId);

    // Record deletion movement
    await EximusStorage.add("stock_movements", {
      id: "MOV-" + Date.now(),
      timestamp: new Date().toISOString(),
      item_id: itemId,
      item_name: item.item_name,
      type: "DELETE_ITEM",
      quantity_change: -item.quantity,
      balance_after: 0,
      performed_by: "Administrator",
      reference_id: itemId,
      notes: `Deleted item from system. Prior quantity was ${item.quantity} ${item.unit}.`
    });

    EximusUtils.showToast("Item Deleted", `Removed "${item.item_name}" from database.`, "info");
    await this.loadData();
  },

  // Export filtered items to CSV
  exportFilteredCSV() {
    const headers = [
      { key: "id", label: "System ID" },
      { key: "item_code", label: "Item Code" },
      { key: "item_name", label: "Item Name" },
      { key: "category", label: "Category" },
      { key: "description", label: "Description" },
      { key: "brand_name", label: "Brand Name" },
      { key: "model", label: "Model" },
      { key: "item_specs", label: "Technical Specs" },
      { key: "location", label: "Location" },
      { key: "unit", label: "Unit" },
      { key: "quantity", label: "Quantity" },
      { key: "condition", label: "Condition" },
      { key: "status", label: "Status" },
      { key: "remarks", label: "Remarks" }
    ];

    EximusUtils.exportCSV("Eximus_Inventory_Export", this.filteredItems, headers);
  }
};

window.EximusInventory = EximusInventory;

