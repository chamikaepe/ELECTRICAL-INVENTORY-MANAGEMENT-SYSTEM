// EXIMUS Electrical Inventory Management System
// transfers.js - Multi-Warehouse Management & Inter-Warehouse Stock Transfers

class TransfersManager {
  constructor() {
    this.currentTab = "transfers"; // 'transfers' or 'warehouses'
    this.warehouses = [];
    this.transfers = [];
    this.masterItems = [];
    this.activeTransferModal = null;
    this.activeWarehouseModal = null;
    this.searchQuery = "";
    this.filterFromWh = "";
    this.filterToWh = "";
  }

  async init() {
    console.log("Initializing EximusTransfers Manager...");
    this.bindEvents();
    await this.loadAll();

    // Listen for storage changes
    window.addEventListener("eximus:storage_changed", async (e) => {
      const { storeName } = e.detail || {};
      if (storeName === "warehouses" || storeName === "warehouse_transfers" || storeName === "master_items" || storeName === "all") {
        await this.loadAll();
      }
    });
  }

  bindEvents() {
    // Tab switching between "Transfers Ledger" and "Manage 5 Warehouses"
    const tabTransfers = document.getElementById("tabBtnTransfers");
    const tabWarehouses = document.getElementById("tabBtnWarehouses");

    if (tabTransfers && tabWarehouses) {
      tabTransfers.addEventListener("click", () => this.switchTab("transfers"));
      tabWarehouses.addEventListener("click", () => this.switchTab("warehouses"));
    }

    // New Transfer Button
    const btnNewTransfer = document.getElementById("btnNewTransfer");
    if (btnNewTransfer) {
      btnNewTransfer.addEventListener("click", () => this.openNewTransferModal());
    }

    // Search and filters for transfers table
    const searchInput = document.getElementById("transferSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderTransfersTable();
      });
    }

    const filterFrom = document.getElementById("transferFilterFrom");
    if (filterFrom) {
      filterFrom.addEventListener("change", (e) => {
        this.filterFromWh = e.target.value;
        this.renderTransfersTable();
      });
    }

    const filterTo = document.getElementById("transferFilterTo");
    if (filterTo) {
      filterTo.addEventListener("change", (e) => {
        this.filterToWh = e.target.value;
        this.renderTransfersTable();
      });
    }

    // Form submission for New Transfer Modal
    const formNewTransfer = document.getElementById("formNewTransfer");
    if (formNewTransfer) {
      formNewTransfer.addEventListener("submit", (e) => this.handleNewTransferSubmit(e));
    }

    // Form submission for Edit/Rename Warehouse Modal
    const formEditWarehouse = document.getElementById("formEditWarehouse");
    if (formEditWarehouse) {
      formEditWarehouse.addEventListener("submit", (e) => this.handleWarehouseSubmit(e));
    }

    // Interactive updates in Transfer Modal (source warehouse change -> populate items)
    const selectFromWh = document.getElementById("transferFromWarehouse");
    if (selectFromWh) {
      selectFromWh.addEventListener("change", () => this.updateTransferItemOptions());
    }

    const selectItem = document.getElementById("transferItemSelect");
    if (selectItem) {
      selectItem.addEventListener("change", () => this.updateSelectedItemStockPreview());
    }
  }

  async loadAll() {
    try {
      this.warehouses = await window.EximusStorage.getWarehouses();
      this.transfers = await window.EximusStorage.getWarehouseTransfers();
      this.masterItems = await window.EximusStorage.getAll("master_items");

      this.populateFilterDropdowns();
      this.renderMetrics();
      this.renderTransfersTable();
      this.renderWarehouseCards();
    } catch (err) {
      console.error("Error loading transfers data:", err);
    }
  }

  switchTab(tab) {
    this.currentTab = tab;
    const viewTransfers = document.getElementById("transfersListView");
    const viewWarehouses = document.getElementById("warehousesListView");
    const tabTransfers = document.getElementById("tabBtnTransfers");
    const tabWarehouses = document.getElementById("tabBtnWarehouses");

    if (tab === "transfers") {
      if (viewTransfers) viewTransfers.classList.remove("hidden");
      if (viewWarehouses) viewWarehouses.classList.add("hidden");
      if (tabTransfers) {
        tabTransfers.className = "px-4 py-2 text-sm font-semibold text-blue-600 border-b-2 border-blue-600 bg-white transition";
      }
      if (tabWarehouses) {
        tabWarehouses.className = "px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition";
      }
    } else {
      if (viewTransfers) viewTransfers.classList.add("hidden");
      if (viewWarehouses) viewWarehouses.classList.remove("hidden");
      if (tabTransfers) {
        tabTransfers.className = "px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition";
      }
      if (tabWarehouses) {
        tabWarehouses.className = "px-4 py-2 text-sm font-semibold text-blue-600 border-b-2 border-blue-600 bg-white transition";
      }
    }
    if (window.lucide) lucide.createIcons();
  }

  renderMetrics() {
    const elTotalTransfers = document.getElementById("kpiTotalTransfers");
    const elTotalWarehouses = document.getElementById("kpiTotalWarehouses");
    const elItemsInTransit = document.getElementById("kpiTotalUnitsTransferred");
    const elLatestTransfer = document.getElementById("kpiLatestTransferDate");

    const totalTransfers = this.transfers.length;
    let totalUnits = 0;
    this.transfers.forEach(t => totalUnits += Number(t.quantity || 0));

    let latestDate = "No transfers yet";
    if (this.transfers.length > 0) {
      latestDate = this.transfers[0].date || this.transfers[0].created_at?.split("T")[0] || "Recent";
    }

    if (elTotalTransfers) elTotalTransfers.textContent = totalTransfers;
    if (elTotalWarehouses) elTotalWarehouses.textContent = this.warehouses.length || 5;
    if (elItemsInTransit) elItemsInTransit.textContent = totalUnits.toLocaleString();
    if (elLatestTransfer) elLatestTransfer.textContent = latestDate;
  }

  populateFilterDropdowns() {
    const filterFrom = document.getElementById("transferFilterFrom");
    const filterTo = document.getElementById("transferFilterTo");

    if (filterFrom) {
      const current = filterFrom.value;
      filterFrom.innerHTML = `<option value="">All Source Warehouses</option>` +
        this.warehouses.map(w => `<option value="${w.id}">${w.name} (${w.code})</option>`).join("");
      filterFrom.value = current;
    }

    if (filterTo) {
      const current = filterTo.value;
      filterTo.innerHTML = `<option value="">All Destination Warehouses</option>` +
        this.warehouses.map(w => `<option value="${w.id}">${w.name} (${w.code})</option>`).join("");
      filterTo.value = current;
    }
  }

  // 1. RENDER INTER-WAREHOUSE TRANSFERS TABLE
  renderTransfersTable() {
    const tbody = document.getElementById("transfersTableBody");
    const countEl = document.getElementById("transfersCountBadge");
    if (!tbody) return;

    let filtered = [...this.transfers];

    if (this.filterFromWh) {
      filtered = filtered.filter(t => t.from_warehouse_id === this.filterFromWh);
    }
    if (this.filterToWh) {
      filtered = filtered.filter(t => t.to_warehouse_id === this.filterToWh);
    }
    if (this.searchQuery) {
      const q = this.searchQuery;
      filtered = filtered.filter(t =>
        (t.transfer_no && t.transfer_no.toLowerCase().includes(q)) ||
        (t.item_name && t.item_name.toLowerCase().includes(q)) ||
        (t.item_code && t.item_code.toLowerCase().includes(q)) ||
        (t.driver_info && t.driver_info.toLowerCase().includes(q)) ||
        (t.authorized_by && t.authorized_by.toLowerCase().includes(q)) ||
        (t.from_warehouse_name && t.from_warehouse_name.toLowerCase().includes(q)) ||
        (t.to_warehouse_name && t.to_warehouse_name.toLowerCase().includes(q))
      );
    }

    if (countEl) countEl.textContent = `${filtered.length} Transfers`;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-12 text-slate-400">
            <i data-lucide="arrow-left-right" class="w-10 h-10 mx-auto text-slate-300 mb-2"></i>
            <p class="font-medium text-slate-600">No warehouse transfers found</p>
            <p class="text-xs text-slate-400 mt-1">Click "+ New Stock Transfer" to transfer components between warehouses.</p>
          </td>
        </tr>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    tbody.innerHTML = filtered.map(t => {
      return `
        <tr class="hover:bg-slate-50 border-b border-slate-100 transition text-sm">
          <td class="py-3 px-4 font-mono font-semibold text-blue-600 whitespace-nowrap">
            ${t.transfer_no || t.id}
          </td>
          <td class="py-3 px-4 text-slate-600 whitespace-nowrap">
            ${t.date || "N/A"}
          </td>
          <td class="py-3 px-4 whitespace-nowrap">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <i data-lucide="building-2" class="w-3.5 h-3.5"></i>
              ${t.from_warehouse_name || t.from_warehouse_id}
            </span>
          </td>
          <td class="py-3 px-4 whitespace-nowrap">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <i data-lucide="corner-down-right" class="w-3.5 h-3.5"></i>
              ${t.to_warehouse_name || t.to_warehouse_id}
            </span>
          </td>
          <td class="py-3 px-4 font-medium text-slate-800">
            <div>${t.item_name}</div>
            <div class="text-xs text-slate-400 font-mono">${t.item_code || "No code"} &bull; ${t.category || "General"}</div>
          </td>
          <td class="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
            <span class="px-2 py-1 bg-slate-100 rounded text-slate-800 font-mono">${t.quantity}</span>
            <span class="text-xs font-normal text-slate-500">${t.unit || "Pcs"}</span>
          </td>
          <td class="py-3 px-4 text-slate-600 text-xs whitespace-nowrap">
            <div class="font-medium text-slate-800">${t.authorized_by || "Store Keeper"}</div>
            <div class="text-slate-400">${t.driver_info || "Direct Handover"}</div>
          </td>
          <td class="py-3 px-4 text-center whitespace-nowrap">
            <button onclick="window.EximusTransfers.viewWaybill('${t.id}')" 
                    title="View & Print Transfer Waybill"
                    class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition">
              <i data-lucide="printer" class="w-3.5 h-3.5"></i>
              Waybill
            </button>
          </td>
        </tr>
      `;
    }).join("");

    if (window.lucide) lucide.createIcons();
  }

  // 2. RENDER THE 5 WAREHOUSES MANAGEMENT CARDS
  renderWarehouseCards() {
    const container = document.getElementById("warehouseCardsContainer");
    if (!container) return;

    if (!this.warehouses || this.warehouses.length === 0) {
      container.innerHTML = `
        <div class="col-span-full p-8 text-center bg-white rounded-xl border border-slate-200">
          <p class="text-slate-500">No warehouses configured. System will re-seed default 5 warehouses.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.warehouses.map(wh => {
      // Calculate inventory stats for this specific warehouse
      let totalLines = 0;
      let totalUnits = 0;

      this.masterItems.forEach(item => {
        const stockInWh = Number(item.warehouse_stock?.[wh.id] || 0);
        if (stockInWh > 0) {
          totalLines++;
          totalUnits += stockInWh;
        }
      });

      const typeBadgeClass = wh.is_default
        ? "bg-blue-100 text-blue-800 border-blue-200"
        : "bg-slate-100 text-slate-700 border-slate-200";

      return `
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between">
          <div>
            <!-- Header -->
            <div class="flex items-start justify-between gap-3 mb-3">
              <div class="flex items-center gap-2.5">
                <div class="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                  ${wh.code || wh.id}
                </div>
                <div>
                  <h3 class="font-bold text-slate-900 text-base leading-snug">${wh.name}</h3>
                  <div class="text-xs text-slate-400 font-mono">${wh.code}</div>
                </div>
              </div>
              <span class="inline-block px-2 py-0.5 text-xs font-semibold rounded border ${typeBadgeClass}">
                ${wh.type || "Store Depot"}
              </span>
            </div>

            <!-- Details -->
            <div class="space-y-2 text-xs text-slate-600 my-4 bg-slate-50/70 p-3 rounded-lg border border-slate-100">
              <div class="flex items-center gap-2">
                <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                <span class="font-medium text-slate-800 truncate">${wh.location || "Location not set"}</span>
              </div>
              <div class="flex items-center gap-2">
                <i data-lucide="user-check" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                <span>Manager: <strong class="text-slate-800">${wh.manager || "Unassigned"}</strong></span>
              </div>
              <div class="flex items-center gap-2">
                <i data-lucide="phone" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                <span>Contact: <span class="font-mono text-slate-700">${wh.contact || "N/A"}</span></span>
              </div>
              <p class="text-slate-500 italic pt-1 border-t border-slate-200/60">${wh.description || "Active electrical inventory warehouse."}</p>
            </div>

            <!-- Stock Metrics -->
            <div class="grid grid-cols-2 gap-2 my-3">
              <div class="bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-blue-700 font-mono">${totalLines}</div>
                <div class="text-[11px] text-blue-600 font-medium">Distinct Items</div>
              </div>
              <div class="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-emerald-700 font-mono">${totalUnits.toLocaleString()}</div>
                <div class="text-[11px] text-emerald-600 font-medium">Total Quantity</div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <button onclick="window.EximusTransfers.openEditWarehouseModal('${wh.id}')"
                    class="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200">
              <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
              Edit / Rename Warehouse
            </button>
            <button onclick="window.EximusTransfers.filterByWarehouse('${wh.id}')"
                    title="View Transfers for this warehouse"
                    class="inline-flex items-center justify-center p-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200">
              <i data-lucide="arrow-right-left" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");

    if (window.lucide) lucide.createIcons();
  }

  filterByWarehouse(warehouseId) {
    this.switchTab("transfers");
    const filterFrom = document.getElementById("transferFilterFrom");
    if (filterFrom) {
      filterFrom.value = warehouseId;
      this.filterFromWh = warehouseId;
      this.renderTransfersTable();
    }
  }

  // 3. EDIT / RENAME WAREHOUSE MODAL
  async openEditWarehouseModal(warehouseId) {
    const wh = this.warehouses.find(w => w.id === warehouseId);
    if (!wh) return;

    document.getElementById("editWhId").value = wh.id;
    document.getElementById("editWhCode").value = wh.code || wh.id;
    document.getElementById("editWhName").value = wh.name || "";
    document.getElementById("editWhLocation").value = wh.location || "";
    document.getElementById("editWhManager").value = wh.manager || "";
    document.getElementById("editWhContact").value = wh.contact || "";
    document.getElementById("editWhType").value = wh.type || "Site Store";
    document.getElementById("editWhDescription").value = wh.description || "";

    const modal = document.getElementById("editWarehouseModal");
    if (modal) {
      EximusUtils.openModal("editWarehouseModal");
    }
  }

  closeEditWarehouseModal() {
    EximusUtils.closeModal("editWarehouseModal");
  }

  async handleWarehouseSubmit(e) {
    e.preventDefault();
    try {
      const id = document.getElementById("editWhId").value;
      const code = document.getElementById("editWhCode").value.trim();
      const name = document.getElementById("editWhName").value.trim();
      const location = document.getElementById("editWhLocation").value.trim();
      const manager = document.getElementById("editWhManager").value.trim();
      const contact = document.getElementById("editWhContact").value.trim();
      const type = document.getElementById("editWhType").value;
      const description = document.getElementById("editWhDescription").value.trim();

      if (!name) {
        EximusUtils.showToast("Required Field", "Please enter a warehouse name.", "warning");
        return;
      }

      const existing = this.warehouses.find(w => w.id === id) || {};
      const updated = {
        ...existing,
        id,
        code,
        name,
        location,
        manager,
        contact,
        type,
        description,
        updated_at: new Date().toISOString()
      };

      await window.EximusStorage.saveWarehouse(updated);
      this.closeEditWarehouseModal();
      EximusUtils.showToast("Warehouse Updated", `Warehouse "${name}" updated successfully.`, "success");

      await this.loadAll();
    } catch (err) {
      console.error("Error saving warehouse:", err);
      EximusUtils.showToast("Save Error", err.message, "error");
    }
  }

  // 4. NEW INTER-WAREHOUSE TRANSFER MODAL
  openNewTransferModal() {
    const selectFromWh = document.getElementById("transferFromWarehouse");
    const selectToWh = document.getElementById("transferToWarehouse");
    const inputDate = document.getElementById("transferDate");

    if (inputDate) {
      inputDate.value = new Date().toISOString().split("T")[0];
    }

    if (selectFromWh) {
      selectFromWh.innerHTML = this.warehouses.map(w =>
        `<option value="${w.id}">${w.name} (${w.code})</option>`
      ).join("");
      selectFromWh.value = this.warehouses[0]?.id || "WH-01";
    }

    if (selectToWh) {
      selectToWh.innerHTML = this.warehouses.map((w, idx) =>
        `<option value="${w.id}">${w.name} (${w.code})</option>`
      ).join("");
      // Default to second warehouse
      selectToWh.value = this.warehouses[1]?.id || "WH-02";
    }

    this.updateTransferItemOptions();
    EximusUtils.openModal("newTransferModal");
  }

  closeNewTransferModal() {
    EximusUtils.closeModal("newTransferModal");
  }

  updateTransferItemOptions() {
    const selectFromWh = document.getElementById("transferFromWarehouse");
    const selectToWh = document.getElementById("transferToWarehouse");
    const selectItem = document.getElementById("transferItemSelect");
    if (!selectFromWh || !selectItem) return;

    const fromWhId = selectFromWh.value;

    // Filter items that have stock > 0 in this source warehouse
    const availableItems = this.masterItems.filter(item => {
      const stock = Number(item.warehouse_stock?.[fromWhId] || 0);
      return stock > 0;
    }).sort((a, b) => a.item_name.localeCompare(b.item_name));

    if (availableItems.length === 0) {
      selectItem.innerHTML = `<option value="">No items in stock at selected warehouse</option>`;
      selectItem.disabled = true;
    } else {
      selectItem.disabled = false;
      selectItem.innerHTML = availableItems.map(item => {
        const stock = Number(item.warehouse_stock?.[fromWhId] || 0);
        return `<option value="${item.id}">${item.item_name} [${item.item_code || "No Code"}] - (In Stock: ${stock} ${item.unit || "Pcs"})</option>`;
      }).join("");
    }

    // Also update destination options to prevent picking same warehouse
    if (selectToWh) {
      Array.from(selectToWh.options).forEach(opt => {
        opt.disabled = (opt.value === fromWhId);
      });
      if (selectToWh.value === fromWhId) {
        const other = Array.from(selectToWh.options).find(opt => opt.value !== fromWhId);
        if (other) selectToWh.value = other.value;
      }
    }

    this.updateSelectedItemStockPreview();
  }

  updateSelectedItemStockPreview() {
    const selectFromWh = document.getElementById("transferFromWarehouse");
    const selectToWh = document.getElementById("transferToWarehouse");
    const selectItem = document.getElementById("transferItemSelect");
    const previewBox = document.getElementById("transferItemPreviewBox");
    const inputQty = document.getElementById("transferQuantity");
    const maxQtyBadge = document.getElementById("transferMaxQtyBadge");

    if (!selectFromWh || !selectToWh || !selectItem || !selectItem.value) {
      if (previewBox) previewBox.innerHTML = `<div class="text-slate-400 italic">Select an item above to see warehouse stock distribution.</div>`;
      return;
    }

    const item = this.masterItems.find(i => i.id === selectItem.value);
    if (!item) return;

    const fromStock = Number(item.warehouse_stock?.[selectFromWh.value] || 0);
    const toStock = Number(item.warehouse_stock?.[selectToWh.value] || 0);

    if (inputQty) {
      inputQty.max = fromStock;
      if (Number(inputQty.value) > fromStock) {
        inputQty.value = fromStock;
      }
    }

    if (maxQtyBadge) {
      maxQtyBadge.textContent = `Max available: ${fromStock} ${item.unit || "Pcs"}`;
    }

    if (previewBox) {
      const fromWhName = this.warehouses.find(w => w.id === selectFromWh.value)?.name || selectFromWh.value;
      const toWhName = this.warehouses.find(w => w.id === selectToWh.value)?.name || selectToWh.value;

      previewBox.innerHTML = `
        <div class="grid grid-cols-2 gap-3 p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs">
          <div>
            <div class="text-slate-500 font-medium">Source Warehouse Stock:</div>
            <div class="text-sm font-bold text-rose-700">${fromWhName}: <span class="font-mono text-base">${fromStock}</span> ${item.unit || "Pcs"}</div>
          </div>
          <div>
            <div class="text-slate-500 font-medium">Destination Current Stock:</div>
            <div class="text-sm font-bold text-emerald-700">${toWhName}: <span class="font-mono text-base">${toStock}</span> ${item.unit || "Pcs"}</div>
          </div>
          <div class="col-span-2 pt-1 border-t border-blue-100 flex items-center justify-between text-slate-500">
            <span>Item Code: <strong class="text-slate-700 font-mono">${item.item_code || "-"}</strong></span>
            <span>Category: <strong class="text-slate-700">${item.category}</strong></span>
            <span>Total All WH: <strong class="text-slate-700 font-mono">${item.quantity} ${item.unit || "Pcs"}</strong></span>
          </div>
        </div>
      `;
    }
  }

  async handleNewTransferSubmit(e) {
    e.preventDefault();
    try {
      const fromWhId = document.getElementById("transferFromWarehouse").value;
      const toWhId = document.getElementById("transferToWarehouse").value;
      const itemId = document.getElementById("transferItemSelect").value;
      const quantity = Number(document.getElementById("transferQuantity").value);
      const date = document.getElementById("transferDate").value;
      const authorizedBy = document.getElementById("transferAuthorizedBy").value.trim();
      const driverInfo = document.getElementById("transferDriverInfo").value.trim();
      const notes = document.getElementById("transferNotes").value.trim();

      if (!itemId) {
        alert("Please select an item to transfer.");
        return;
      }

      if (fromWhId === toWhId) {
        alert("Source and Destination warehouses cannot be the same.");
        return;
      }

      if (!quantity || quantity <= 0) {
        alert("Transfer quantity must be greater than zero.");
        return;
      }

      const transferData = {
        from_warehouse_id: fromWhId,
        to_warehouse_id: toWhId,
        item_id: itemId,
        quantity,
        date,
        authorized_by: authorizedBy || "Store Admin",
        driver_info: driverInfo || "Internal Logistics Handover",
        notes
      };

      const result = await window.EximusStorage.executeWarehouseTransfer(transferData);
      this.closeNewTransferModal();
      EximusUtils.showToast("Transfer Complete", `Transfer ${result.transfer_no} completed successfully!`, "success");

      await this.loadAll();

      // Offer to open the printable Waybill immediately
      this.viewWaybill(result.id);
    } catch (err) {
      console.error("Transfer error:", err);
      EximusUtils.showToast("Transfer Failed", err.message, "error");
    }
  }

  // 5. VIEW & PRINT WAYBILL / DISPATCH NOTE
  async viewWaybill(transferId) {
    const t = this.transfers.find(x => x.id === transferId);
    if (!t) return;

    const modal = document.getElementById("waybillModal");
    const container = document.getElementById("waybillPrintContent");
    if (!modal || !container) return;

    const fromWh = this.warehouses.find(w => w.id === t.from_warehouse_id) || { name: t.from_warehouse_name, location: "" };
    const toWh = this.warehouses.find(w => w.id === t.to_warehouse_id) || { name: t.to_warehouse_name, location: "" };

    container.innerHTML = `
      <div class="border border-slate-300 rounded-xl p-6 bg-white text-slate-800 shadow-sm font-sans" id="printableWaybill">
        <!-- Header -->
        <div class="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-5">
          <div class="flex items-center gap-3">
            <img src="assets/images/logo.svg" 
                 onerror="this.onerror=null; this.src='https://eximiuspe.com/wp-content/uploads/2024/08/Eximius-Logo-High-Resolution-PDF.pdf.png';" 
                 alt="Eximius Power and Energy" 
                 class="h-12 w-auto object-contain">
            <div>
              <h1 class="text-xl font-black text-slate-900 tracking-tight">EXIMIUS POWER AND ENERGY</h1>
              <p class="text-xs text-slate-500 uppercase tracking-widest font-semibold">Electrical Division &bull; Inter-Warehouse Goods Dispatch Note</p>
            </div>
          </div>
          <div class="text-right">
            <div class="inline-block px-3 py-1 bg-slate-900 text-white rounded font-mono font-bold text-sm tracking-wide">
              ${t.transfer_no || t.id}
            </div>
            <div class="text-xs text-slate-500 mt-1">Date: <strong class="text-slate-800">${t.date || "N/A"}</strong></div>
            <div class="text-xs text-emerald-600 font-bold uppercase mt-0.5">Status: COMPLETED</div>
          </div>
        </div>

        <!-- From and To Locations -->
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-rose-50/60 border border-rose-200 rounded-lg p-3 text-xs">
            <div class="text-[10px] font-bold uppercase tracking-wider text-rose-700 mb-1 flex items-center gap-1">
              <i data-lucide="building-2" class="w-3.5 h-3.5"></i> DISPATCHING FROM (SOURCE WAREHOUSE)
            </div>
            <div class="font-bold text-slate-900 text-sm">${t.from_warehouse_name}</div>
            <div class="text-slate-600 mt-0.5 font-mono text-[11px]">Warehouse Code: ${t.from_warehouse_id}</div>
            <div class="text-slate-500 mt-0.5">${fromWh.location || "Facility Location"}</div>
            <div class="text-slate-500 mt-0.5">Manager: ${fromWh.manager || "Store Keeper"}</div>
          </div>

          <div class="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3 text-xs">
            <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1 flex items-center gap-1">
              <i data-lucide="corner-down-right" class="w-3.5 h-3.5"></i> RECEIVING AT (DESTINATION WAREHOUSE)
            </div>
            <div class="font-bold text-slate-900 text-sm">${t.to_warehouse_name}</div>
            <div class="text-slate-600 mt-0.5 font-mono text-[11px]">Warehouse Code: ${t.to_warehouse_id}</div>
            <div class="text-slate-500 mt-0.5">${toWh.location || "Facility Location"}</div>
            <div class="text-slate-500 mt-0.5">Manager: ${toWh.manager || "Store Keeper"}</div>
          </div>
        </div>

        <!-- Transferred Items Table -->
        <div class="mb-5 border border-slate-200 rounded-lg overflow-hidden">
          <table class="w-full text-xs text-left">
            <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th class="py-2.5 px-3">#</th>
                <th class="py-2.5 px-3">Item Code</th>
                <th class="py-2.5 px-3">Item Description</th>
                <th class="py-2.5 px-3">Category</th>
                <th class="py-2.5 px-3 text-right">Dispatched Qty</th>
                <th class="py-2.5 px-3">Unit</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr>
                <td class="py-3 px-3 text-slate-500 font-mono">01</td>
                <td class="py-3 px-3 font-mono font-bold text-blue-700">${t.item_code || "-"}</td>
                <td class="py-3 px-3 font-semibold text-slate-900">${t.item_name}</td>
                <td class="py-3 px-3 text-slate-600">${t.category || "Electrical"}</td>
                <td class="py-3 px-3 text-right font-mono font-bold text-base text-slate-900">${t.quantity}</td>
                <td class="py-3 px-3 text-slate-600">${t.unit || "Pcs"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Logistics & Remarks -->
        <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs mb-8 space-y-1">
          <div class="grid grid-cols-2 gap-2">
            <div><span class="text-slate-500 font-medium">Logistics / Vehicle / Driver:</span> <span class="font-semibold text-slate-800">${t.driver_info || "Direct Site Transfer"}</span></div>
            <div><span class="text-slate-500 font-medium">Authorized Site Official:</span> <span class="font-semibold text-slate-800">${t.authorized_by || "Head of Logistics"}</span></div>
          </div>
          <div><span class="text-slate-500 font-medium">Transfer Notes:</span> <span class="text-slate-700 italic">${t.notes || "Official inter-store stock movement for project execution."}</span></div>
        </div>

        <!-- Three Signatures Block -->
        <div class="grid grid-cols-3 gap-6 pt-6 border-t-2 border-slate-200 text-center text-xs">
          <div>
            <div class="h-12 border-b border-dashed border-slate-400 mb-2"></div>
            <div class="font-bold text-slate-800">Dispatched By</div>
            <div class="text-[11px] text-slate-500">Source Storekeeper Signature</div>
            <div class="text-[10px] text-slate-400 mt-1">Date: ____________</div>
          </div>
          <div>
            <div class="h-12 border-b border-dashed border-slate-400 mb-2"></div>
            <div class="font-bold text-slate-800">Transporter / Carrier</div>
            <div class="text-[11px] text-slate-500">Driver Signature & NIC</div>
            <div class="text-[10px] text-slate-400 mt-1">Date: ____________</div>
          </div>
          <div>
            <div class="h-12 border-b border-dashed border-slate-400 mb-2"></div>
            <div class="font-bold text-slate-800">Received In Good Order</div>
            <div class="text-[11px] text-slate-500">Destination Storekeeper</div>
            <div class="text-[10px] text-slate-400 mt-1">Date: ____________</div>
          </div>
        </div>
      </div>
    `;

    EximusUtils.openModal("waybillModal");
  }

  closeWaybillModal() {
    EximusUtils.closeModal("waybillModal");
  }

  printCurrentWaybill() {
    const content = document.getElementById("waybillPrintContent")?.innerHTML;
    if (!content) return;

    const printWin = window.open("", "_blank", "width=850,height=700");
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Waybill - EXIMUS Electrical</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 20px; }
            button { display: none !important; }
          }
        </style>
      </head>
      <body class="p-6 bg-white">
        ${content}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  }
}

// Global Transfers Instance
window.EximusTransfers = new TransfersManager();

