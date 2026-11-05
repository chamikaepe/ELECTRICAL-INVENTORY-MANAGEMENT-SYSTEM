// EXIMUS Electrical Inventory Management System
// transactions.js - Issued Items, Permanent & Returnable Items, and New Purchases Management

const EximusTransactions = {
  issuedItems: [],
  permanentItems: [],
  purchases: [],

  async init() {
    this.bindEvents();
    await this.loadAll();

    window.addEventListener("eximus:storage_changed", (e) => {
      const store = e.detail.storeName;
      if (
        store === "issued_items" ||
        store === "permanent_returnable" ||
        store === "new_purchases" ||
        store === "master_items" ||
        store === "all"
      ) {
        this.loadAll();
      }
    });
  },

  bindEvents() {
    // Issued items filter
    const issueSearch = document.getElementById("issuedSearchInput");
    if (issueSearch) {
      issueSearch.addEventListener(
        "input",
        EximusUtils.debounce(() => this.renderIssuedTable(), 200)
      );
    }

    const issueStatusFilter = document.getElementById("issuedStatusFilter");
    if (issueStatusFilter) {
      issueStatusFilter.addEventListener("change", () => this.renderIssuedTable());
    }

    // Permanent & Returnable filter
    const permSearch = document.getElementById("permSearchInput");
    if (permSearch) {
      permSearch.addEventListener(
        "input",
        EximusUtils.debounce(() => this.renderPermanentTable(), 200)
      );
    }

    const permTypeFilter = document.getElementById("permTypeFilter");
    if (permTypeFilter) {
      permTypeFilter.addEventListener("change", () => this.renderPermanentTable());
    }

    // Purchases search & filter
    const purSearch = document.getElementById("purchaseSearchInput");
    if (purSearch) {
      purSearch.addEventListener(
        "input",
        EximusUtils.debounce(() => this.renderPurchasesTable(), 200)
      );
    }
  },

  async loadAll() {
    await this.loadIssuedItems();
    await this.loadPermanentItems();
    await this.loadPurchases();
    await this.populateItemSelectDropdowns();
  },

  // Populate master item selects in Issue & Purchase modals
  async populateItemSelectDropdowns() {
    const items = await EximusStorage.getAll("master_items");

    // Issue item select
    const issueSelect = document.getElementById("issueFormItemId");
    if (issueSelect) {
      issueSelect.innerHTML = `<option value="">Select Item to Issue...</option>` +
        items
          .filter((i) => Number(i.quantity) > 0)
          .map((i) => `<option value="${i.id}" data-qty="${i.quantity}" data-unit="${i.unit}">${EximusUtils.escapeHTML(i.item_name)} (${i.quantity} ${i.unit} available - ${i.location})</option>`)
          .join("");
    }

    // Permanent issue select
    const permSelect = document.getElementById("permFormItemId");
    if (permSelect) {
      permSelect.innerHTML = `<option value="">Select Item for Permanent Issue...</option>` +
        items
          .filter((i) => Number(i.quantity) > 0)
          .map((i) => `<option value="${i.id}" data-qty="${i.quantity}" data-unit="${i.unit}">${EximusUtils.escapeHTML(i.item_name)} (${i.quantity} ${i.unit} available)</option>`)
          .join("");
    }

    // Purchase item select
    const purchaseSelect = document.getElementById("purchaseFormItemId");
    if (purchaseSelect) {
      purchaseSelect.innerHTML = `<option value="">Select Existing Master Item (or Leave Blank for New)...</option>` +
        items.map((i) => `<option value="${i.id}">${EximusUtils.escapeHTML(i.item_name)} (${i.item_code || i.id})</option>`).join("");
    }
  },

  // ==========================================
  // SECTION 1: ISSUED ITEMS (Worksheet 03)
  // ==========================================

  async loadIssuedItems() {
    this.issuedItems = await EximusStorage.getAll("issued_items");
    this.renderIssuedTable();
  },

  renderIssuedTable() {
    const tbody = document.getElementById("issuedItemsTableBody");
    if (!tbody) return;

    const search = (document.getElementById("issuedSearchInput")?.value || "").toLowerCase();
    const status = document.getElementById("issuedStatusFilter")?.value || "";

    const filtered = this.issuedItems.filter((i) => {
      if (search) {
        const text = `${i.item_name} ${i.issued_to} ${i.description || ""}`.toLowerCase();
        if (!text.includes(search)) return false;
      }
      if (status && i.status !== status) return false;
      return true;
    });

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="py-10 text-center text-slate-400">No issued item records match criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered
      .map((item) => {
        const isPending = item.status !== "RETURNED";
        const returnedQty = item.returned_quantity || 0;

        return `
        <tr class="hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
          <td class="py-3 px-3 text-xs text-slate-500">${EximusUtils.formatDate(item.date_issued)}</td>
          <td class="py-3 px-4 font-semibold text-xs text-slate-900">${EximusUtils.escapeHTML(item.issued_to || "Unspecified Staff")}</td>
          <td class="py-3 px-4">
            <span class="text-sm font-bold text-slate-900">${EximusUtils.escapeHTML(item.item_name)}</span>
            ${item.description ? `<p class="text-xs text-slate-400 truncate max-w-xs">${EximusUtils.escapeHTML(item.description)}</p>` : ""}
          </td>
          <td class="py-3 px-3 font-mono font-bold text-sm text-slate-800 text-center">${item.quantity}</td>
          <td class="py-3 px-3 text-xs text-slate-500 text-center">${EximusUtils.formatDate(item.returned_date || "Pending")}</td>
          <td class="py-3 px-3 font-mono text-xs font-semibold text-center ${returnedQty === item.quantity ? "text-emerald-600" : "text-amber-600"}">${returnedQty} / ${item.quantity}</td>
          <td class="py-3 px-3 text-center">${EximusUtils.getStatusBadge(item.status)}</td>
          <td class="py-3 px-3 text-right">
            ${isPending
            ? `<button onclick="EximusTransactions.openReturnModal('${item.id}')" class="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">
                    Process Return
                  </button>`
            : `<span class="text-xs text-emerald-600 font-medium inline-flex items-center gap-1"><i data-lucide="check" class="w-3.5 h-3.5"></i> Returned</span>`
          }
          </td>
        </tr>
      `;
      })
      .join("");

    if (window.lucide) lucide.createIcons();
  },

  // Open Issue Item Modal
  async openIssueModal(preselectedItemId = null) {
      const form = document.getElementById("issueItemForm");
      if (form) form.reset();

      await this.populateItemSelectDropdowns();

      const dateInput = document.getElementById("issueFormDate");
      if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

      if (preselectedItemId) {
        const select = document.getElementById("issueFormItemId");
        if (select) select.value = preselectedItemId;
      }

      EximusUtils.openModal("issueItemModal");
    },

  // Handle Issue Item submission
  async handleIssueItem(e) {
      e.preventDefault();

      const itemId = document.getElementById("issueFormItemId").value;
      const issuedTo = document.getElementById("issueFormIssuedTo").value.trim();
      const qty = Number(document.getElementById("issueFormQuantity").value);
      const dateIssued = document.getElementById("issueFormDate").value || new Date().toISOString().slice(0, 10);
      const expectedReturn = document.getElementById("issueFormExpectedReturn").value;
      const desc = document.getElementById("issueFormDescription").value.trim();

      if (!itemId || !issuedTo || isNaN(qty) || qty <= 0) {
        EximusUtils.showToast("Validation Error", "Please select an item, recipient name, and valid quantity.", "warning");
        return;
      }

      const masterItem = await EximusStorage.getById("master_items", itemId);
      if (!masterItem) {
        EximusUtils.showToast("Error", "Item not found in master catalog.", "error");
        return;
      }

      if (qty > Number(masterItem.quantity)) {
        EximusUtils.showToast("Stock Insufficient", `Only ${masterItem.quantity} ${masterItem.unit} are currently available in stock.`, "error");
        return;
      }

      // Controlled stock deduction
      masterItem.quantity -= qty;
      if (masterItem.quantity === 0) masterItem.status = "OUT_OF_STOCK";
      await EximusStorage.put("master_items", masterItem);

      const issueId = EximusUtils.generateId("ISS");
      const issueRecord = {
        id: issueId,
        date_issued: dateIssued,
        issued_to: issuedTo,
        item_id: masterItem.id,
        item_name: masterItem.item_name,
        description: desc || `Issued to ${issuedTo}`,
        quantity: qty,
        returned_date: expectedReturn || null,
        returned_quantity: 0,
        status: "ISSUED",
        type: "TEMPORARY"
      };

      await EximusStorage.put("issued_items", issueRecord);

      // Audit log
      await EximusStorage.add("stock_movements", {
        id: "MOV-" + Date.now(),
        timestamp: new Date().toISOString(),
        item_id: masterItem.id,
        item_name: masterItem.item_name,
        type: "ISSUE",
        quantity_change: -qty,
        balance_after: masterItem.quantity,
        performed_by: "Store Administrator",
        reference_id: issueId,
        notes: `Temporary issue of ${qty} ${masterItem.unit} to ${issuedTo}. Expected return: ${expectedReturn || "Unspecified"}.`
      });

      EximusUtils.closeModal("issueItemModal");
      EximusUtils.showToast("Stock Issued", `Successfully issued ${qty} ${masterItem.unit} to ${issuedTo}.`, "success");
      await this.loadIssuedItems();
    },

  // Open Return Modal
  async openReturnModal(issueId) {
      const issueRecord = await EximusStorage.getById("issued_items", issueId);
      if (!issueRecord) return;

      document.getElementById("returnModalIssueId").value = issueRecord.id;
      document.getElementById("returnModalItemName").textContent = issueRecord.item_name;
      document.getElementById("returnModalIssuedTo").textContent = issueRecord.issued_to;
      document.getElementById("returnModalIssuedQty").textContent = `${issueRecord.quantity} (Returned so far: ${issueRecord.returned_quantity || 0})`;

      const pendingQty = issueRecord.quantity - (issueRecord.returned_quantity || 0);
      document.getElementById("returnModalQuantity").value = pendingQty;
      document.getElementById("returnModalQuantity").max = pendingQty;

      document.getElementById("returnModalDate").value = new Date().toISOString().slice(0, 10);
      document.getElementById("returnModalCondition").value = "USABLE";
      document.getElementById("returnModalNotes").value = "";

      EximusUtils.openModal("returnItemModal");
    },

  // Handle Return submission
  async handleProcessReturn(e) {
      e.preventDefault();

      const issueId = document.getElementById("returnModalIssueId").value;
      const returnQty = Number(document.getElementById("returnModalQuantity").value);
      const returnDate = document.getElementById("returnModalDate").value || new Date().toISOString().slice(0, 10);
      const returnCondition = document.getElementById("returnModalCondition").value;
      const notes = document.getElementById("returnModalNotes").value.trim();

      const issueRecord = await EximusStorage.getById("issued_items", issueId);
      if (!issueRecord) return;

      const pendingQty = issueRecord.quantity - (issueRecord.returned_quantity || 0);
      if (isNaN(returnQty) || returnQty <= 0 || returnQty > pendingQty) {
        EximusUtils.showToast("Invalid Quantity", `Return quantity must be between 1 and ${pendingQty}.`, "warning");
        return;
      }

      // Update return record
      const newReturnedTotal = (issueRecord.returned_quantity || 0) + returnQty;
      issueRecord.returned_quantity = newReturnedTotal;
      issueRecord.returned_date = returnDate;

      if (newReturnedTotal >= issueRecord.quantity) {
        issueRecord.status = "RETURNED";
      } else {
        issueRecord.status = "PARTIALLY_RETURNED";
      }

      await EximusStorage.put("issued_items", issueRecord);

      // Controlled stock replenishment in master table
      const masterItems = await EximusStorage.getAll("master_items");
      const master = masterItems.find((i) => i.id === issueRecord.item_id || i.item_name === issueRecord.item_name);

      if (master) {
        master.quantity += returnQty;
        if (master.status === "OUT_OF_STOCK" && master.quantity > 0) {
          master.status = "AVAILABLE";
        }
        if (returnCondition === "UNUSABLE") {
          master.condition = "UNUSABLE";
          master.status = "AWAITING REPAIR";
        }
        await EximusStorage.put("master_items", master);
      }

      // Audit log
      await EximusStorage.add("stock_movements", {
        id: "MOV-" + Date.now(),
        timestamp: new Date().toISOString(),
        item_id: issueRecord.item_id || "ISSUE_RETURN",
        item_name: issueRecord.item_name,
        type: "RETURN",
        quantity_change: returnQty,
        balance_after: master ? master.quantity : returnQty,
        performed_by: "Store Administrator",
        reference_id: issueRecord.id,
        notes: `Returned ${returnQty} units by ${issueRecord.issued_to}. Condition: ${returnCondition}. Notes: ${notes || "None"}`
      });

      EximusUtils.closeModal("returnItemModal");
      EximusUtils.showToast("Return Processed", `Successfully recorded return of ${returnQty} ${issueRecord.item_name}.`, "success");
      await this.loadIssuedItems();
    },

  // ==========================================
  // SECTION 2: PERMANENT & RETURNABLE (Worksheet 04)
  // ==========================================

  async loadPermanentItems() {
      this.permanentItems = await EximusStorage.getAll("permanent_returnable");
      this.renderPermanentTable();
    },

    renderPermanentTable() {
      const tbody = document.getElementById("permanentItemsTableBody");
      if (!tbody) return;

      const search = (document.getElementById("permSearchInput")?.value || "").toLowerCase();
      const typeFilter = document.getElementById("permTypeFilter")?.value || "";

      const filtered = this.permanentItems.filter((i) => {
        if (search) {
          const text = `${i.item_name} ${i.issued_to} ${i.description || ""}`.toLowerCase();
          if (!text.includes(search)) return false;
        }
        if (typeFilter && (i.issue_type || "PERMANENT") !== typeFilter) return false;
        return true;
      });

      if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-10 text-center text-slate-400">No permanent / returnable records found.</td></tr>`;
        return;
      }

      tbody.innerHTML = filtered
        .map((item) => {
          const isPerm = (item.issue_type || "PERMANENT") === "PERMANENT";

          return `
        <tr class="hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
          <td class="py-3 px-3 text-xs text-slate-500">${EximusUtils.formatDate(item.date_issued)}</td>
          <td class="py-3 px-4 font-semibold text-xs text-slate-900">${EximusUtils.escapeHTML(item.issued_to)}</td>
          <td class="py-3 px-4">
            <span class="text-sm font-bold text-slate-900">${EximusUtils.escapeHTML(item.item_name)}</span>
            ${item.remarks ? `<p class="text-xs text-slate-400 truncate max-w-xs">${EximusUtils.escapeHTML(item.remarks)}</p>` : ""}
          </td>
          <td class="py-3 px-3 font-mono font-bold text-sm text-slate-800 text-center">${item.quantity}</td>
          <td class="py-3 px-3 text-center">
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${isPerm ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-sky-50 text-sky-700 border border-sky-200"}">
              <i data-lucide="${isPerm ? "shield" : "rotate-ccw"}" class="w-3 h-3"></i>
              ${isPerm ? "PERMANENT ISSUE" : "RETURNABLE"}
            </span>
          </td>
          <td class="py-3 px-3 text-xs text-slate-500 text-center">${EximusUtils.escapeHTML(item.description || "Permanently Issued")}</td>
          <td class="py-3 px-3 text-xs text-slate-500 text-center">${item.returned_date ? EximusUtils.formatDate(item.returned_date) : '<span class="text-slate-400 italic">None (Permanent)</span>'}</td>
        </tr>
      `;
        })
        .join("");

      if (window.lucide) lucide.createIcons();
    },

    // Open Permanent Issue Modal
  async openPermanentIssueModal() {
        const form = document.getElementById("permIssueForm");
        if (form) form.reset();

        await this.populateItemSelectDropdowns();

        const dateInput = document.getElementById("permFormDate");
        if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

        EximusUtils.openModal("permanentIssueModal");
      },

  // Handle Permanent Issue
  async handlePermanentIssue(e) {
        e.preventDefault();

        const itemId = document.getElementById("permFormItemId").value;
        const recipient = document.getElementById("permFormRecipient").value.trim();
        const qty = Number(document.getElementById("permFormQuantity").value);
        const dateIssued = document.getElementById("permFormDate").value || new Date().toISOString().slice(0, 10);
        const issueType = document.getElementById("permFormIssueType").value;
        const notes = document.getElementById("permFormNotes").value.trim();

        if (!itemId || !recipient || isNaN(qty) || qty <= 0) {
          EximusUtils.showToast("Validation Error", "Please choose an item, recipient name, and quantity.", "warning");
          return;
        }

        const masterItem = await EximusStorage.getById("master_items", itemId);
        if (!masterItem) return;

        if (qty > masterItem.quantity) {
          EximusUtils.showToast("Stock Insufficient", `Only ${masterItem.quantity} units in stock.`, "error");
          return;
        }

        masterItem.quantity -= qty;
        if (masterItem.quantity === 0) masterItem.status = "OUT_OF_STOCK";
        await EximusStorage.put("master_items", masterItem);

        const prId = EximusUtils.generateId("PR");
        const prRecord = {
          id: prId,
          date_issued: dateIssued,
          issued_to: recipient,
          item_id: masterItem.id,
          item_name: masterItem.item_name,
          description: issueType === "PERMANENT" ? "Permanently Issued" : "Returnable Assignment",
          issue_type: issueType,
          quantity: qty,
          returned_date: null,
          status: issueType === "PERMANENT" ? "PERMANENTLY_ISSUED" : "PENDING",
          remarks: notes || `Permanent issue to ${recipient}`
        };

        await EximusStorage.put("permanent_returnable", prRecord);

        // Audit trail
        await EximusStorage.add("stock_movements", {
          id: "MOV-" + Date.now(),
          timestamp: new Date().toISOString(),
          item_id: masterItem.id,
          item_name: masterItem.item_name,
          type: "PERMANENT_ISSUE",
          quantity_change: -qty,
          balance_after: masterItem.quantity,
          performed_by: "Administrator",
          reference_id: prId,
          notes: `Permanent issue of ${qty} ${masterItem.unit} to ${recipient}.`
        });

        EximusUtils.closeModal("permanentIssueModal");
        EximusUtils.showToast("Success", `Permanently issued ${qty} ${masterItem.item_name} to ${recipient}.`, "success");
        await this.loadPermanentItems();
      },

  // ==========================================
  // SECTION 3: NEW PURCHASES (Worksheet 05)
  // ==========================================

  async loadPurchases() {
        this.purchases = await EximusStorage.getAll("new_purchases");
        this.renderPurchasesTable();
        this.renderPurchaseStats();
      },

      renderPurchasesTable() {
        const tbody = document.getElementById("purchasesTableBody");
        if (!tbody) return;

        const search = (document.getElementById("purchaseSearchInput")?.value || "").toLowerCase();

        const filtered = this.purchases.filter((p) => {
          if (search) {
            const text = `${p.item_name} ${p.supplier || ""} ${p.description || ""}`.toLowerCase();
            if (!text.includes(search)) return false;
          }
          return true;
        });

        if (!filtered.length) {
          tbody.innerHTML = `<tr><td colspan="7" class="py-10 text-center text-slate-400">No purchase records recorded yet.</td></tr>`;
          return;
        }

        tbody.innerHTML = filtered
          .map(
            (pur) => `
      <tr class="hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
        <td class="py-3 px-3 text-xs text-slate-500">${EximusUtils.formatDate(pur.purchase_date)}</td>
        <td class="py-3 px-4">
          <span class="text-sm font-bold text-slate-900">${EximusUtils.escapeHTML(pur.item_name)}</span>
          ${pur.description ? `<p class="text-xs text-slate-400 truncate max-w-xs">${EximusUtils.escapeHTML(pur.description)}</p>` : ""}
        </td>
        <td class="py-3 px-3 font-mono font-bold text-sm text-slate-800 text-center">${pur.quantity} <span class="text-xs font-normal text-slate-500">${pur.unit || "Pcs"}</span></td>
        <td class="py-3 px-3 text-xs text-slate-700">${EximusUtils.escapeHTML(pur.supplier || "Vendor Purchase")}</td>
        <td class="py-3 px-3 text-xs text-slate-600">${EximusUtils.escapeHTML(pur.stored_location || "Store Room")}</td>
        <td class="py-3 px-3 text-right font-mono text-xs font-semibold text-slate-900">${EximusUtils.formatCurrency(pur.total_amount || 0)}</td>
        <td class="py-3 px-3 text-center">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <i data-lucide="check" class="w-3 h-3 text-emerald-600"></i> Stocked
          </span>
        </td>
      </tr>
    `
          )
          .join("");

        if (window.lucide) lucide.createIcons();
      },

      renderPurchaseStats() {
        const totalSpend = this.purchases.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
        const totalItems = this.purchases.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

        const spendEl = document.getElementById("purchaseTotalSpend");
        if (spendEl) spendEl.textContent = EximusUtils.formatCurrency(totalSpend);

        const countEl = document.getElementById("purchaseTotalItemsCount");
        if (countEl) countEl.textContent = `${totalItems} units in ${this.purchases.length} purchase batches`;
      },

      // Open Add Purchase Modal
  async openPurchaseModal() {
          const form = document.getElementById("newPurchaseForm");
          if (form) form.reset();

          await this.populateItemSelectDropdowns();

          const dateInput = document.getElementById("purchaseFormDate");
          if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

          EximusUtils.openModal("newPurchaseModal");
        },

  // Handle Save Purchase
  async handleSavePurchase(e) {
          e.preventDefault();

          const itemId = document.getElementById("purchaseFormItemId").value;
          const itemNameCustom = document.getElementById("purchaseFormCustomName").value.trim();
          const date = document.getElementById("purchaseFormDate").value || new Date().toISOString().slice(0, 10);
          const qty = Number(document.getElementById("purchaseFormQuantity").value);
          const unitPrice = Number(document.getElementById("purchaseFormUnitPrice").value) || 0;
          const supplier = document.getElementById("purchaseFormSupplier").value.trim();
          const location = document.getElementById("purchaseFormLocation").value.trim();
          const desc = document.getElementById("purchaseFormDescription").value.trim();

          let finalItemName = "";
          let finalMasterId = itemId;
          let unit = "Pcs";

          if (itemId) {
            const master = await EximusStorage.getById("master_items", itemId);
            if (master) {
              finalItemName = master.item_name;
              unit = master.unit;
            }
          } else {
            finalItemName = itemNameCustom;
          }

          if (!finalItemName || isNaN(qty) || qty <= 0) {
            EximusUtils.showToast("Validation Error", "Please provide a valid item name and purchase quantity.", "warning");
            return;
          }

          const totalAmount = unitPrice * qty;
          const purId = EximusUtils.generateId("PUR");

          const purchaseObj = {
            id: purId,
            purchase_date: date,
            item_id: finalMasterId || "NEW",
            item_name: finalItemName,
            description: desc || "Procurement of inventory stock",
            quantity: qty,
            unit,
            supplier: supplier || "Direct Purchase",
            unit_price: unitPrice,
            total_amount: totalAmount,
            stored_location: location || "Office Electrical Storage",
            status: "COMPLETED"
          };

          await EximusStorage.put("new_purchases", purchaseObj);

          // Controlled stock addition into Master Items
          let masterItem = null;
          if (finalMasterId) {
            masterItem = await EximusStorage.getById("master_items", finalMasterId);
          } else {
            // Find matching item by name
            const allItems = await EximusStorage.getAll("master_items");
            masterItem = allItems.find((i) => i.item_name.toLowerCase() === finalItemName.toLowerCase());
          }

          if (masterItem) {
            masterItem.quantity += qty;
            if (masterItem.status === "OUT_OF_STOCK") masterItem.status = "AVAILABLE";
            await EximusStorage.put("master_items", masterItem);
          } else {
            // Create new master item
            const newItemId = EximusUtils.generateId("MAT");
            masterItem = {
              id: newItemId,
              category: "MATERIALS",
              item_code: "ELE-" + Math.floor(100 + Math.random() * 900),
              item_name: finalItemName,
              description: desc || "New purchased item",
              brand_name: "",
              model: "",
              item_specs: "-",
              location: location || "Office Electrical Storage",
              unit,
              quantity: qty,
              condition: "NEW",
              status: "AVAILABLE",
              min_threshold: 3,
              remarks: `Purchased on ${date}`,
              date_added: date
            };
            await EximusStorage.put("master_items", masterItem);
          }

          // Audit trail
          await EximusStorage.add("stock_movements", {
            id: "MOV-" + Date.now(),
            timestamp: new Date().toISOString(),
            item_id: masterItem.id,
            item_name: masterItem.item_name,
            type: "PURCHASE",
            quantity_change: qty,
            balance_after: masterItem.quantity,
            performed_by: "Purchasing Officer",
            reference_id: purId,
            notes: `New purchase of ${qty} ${unit} from ${supplier || "Vendor"}. Total amount: ${EximusUtils.formatCurrency(totalAmount)}.`
          });

          EximusUtils.closeModal("newPurchaseModal");
          EximusUtils.showToast("Purchase Recorded", `Added ${qty} ${unit} of ${finalItemName} to inventory stock.`, "success");
          await this.loadPurchases();
        }
      };

      window.EximusTransactions = EximusTransactions;


