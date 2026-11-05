// EXIMUS Electrical Inventory Management System
// app.js - Core Application Controller, Navigation Router, Global Search, Movements & Settings

class AppController {
  constructor() {
    this.currentSection = "dashboard";
    this.sidebarCollapsed = localStorage.getItem("eximus_sidebar_collapsed") === "true";
  }

  async init() {
    console.log("Initializing EXIMUS Electrical Inventory Management System...");

    // 1. Setup navigation, shortcuts, sidebar, header time FIRST so UI responds immediately
    try {
      this.setupNavigation();
      this.setupSidebar();
      this.setupGlobalSearch();
      this.setupHeaderTime();
      this.setupNotificationCenter();
      this.setupSettingsView();
    } catch (e) {
      console.warn("Navigation/UI setup warning:", e);
    }

    // 2. Initialize IndexedDB storage engine
    try {
      await EximusStorage.init();
    } catch (e) {
      console.error("Storage init error:", e);
    }

    // 3. Initialize submodules safely with individual try-catch blocks
    const submodules = [
      { name: "Dashboard", fn: () => EximusDashboard.init() },
      { name: "Inventory", fn: () => EximusInventory.init() },
      { name: "Categories", fn: () => EximusCategories.init() },
      { name: "Transactions", fn: () => EximusTransactions.init() },
      { name: "Locations", fn: () => EximusLocations.init() },
      { name: "Transfers", fn: () => EximusTransfers.init() },
      { name: "Reports", fn: () => EximusReports.init() },
      { name: "Excel", fn: () => EximusExcel.init() }
    ];

    for (const sub of submodules) {
      try {
        await sub.fn();
      } catch (err) {
        console.warn(`Submodule ${sub.name} init warning:`, err);
      }
    }

    // 4. Check & render stock movements when navigated
    try {
      await this.loadMovements();
    } catch (e) {
      console.warn("Load movements warning:", e);
    }

    // 5. Create initial icons
    if (window.lucide) {
      try {
        lucide.createIcons();
      } catch (e) { }
    }

    console.log("EXIMUS Application ready.");
  }

  // Navigation router
  setupNavigation() {
    const navLinks = document.querySelectorAll("[data-nav-target]");
    navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const target = link.getAttribute("data-nav-target");
        this.navigate(target);
      });
    });

    // Close mobile sidebar on link click
    const mobileLinks = document.querySelectorAll("#sidebar [data-nav-target]");
    mobileLinks.forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth < 1024) {
          this.toggleSidebar(false);
        }
      });
    });
  }

  navigate(sectionId) {
    const sections = document.querySelectorAll(".app-section");
    sections.forEach((sec) => sec.classList.add("hidden"));

    const activeSec = document.getElementById(`section-${sectionId}`);
    if (activeSec) {
      activeSec.classList.remove("hidden");
      this.currentSection = sectionId;
    }

    // Update active state on nav links
    const navLinks = document.querySelectorAll("[data-nav-target]");
    navLinks.forEach((link) => {
      const target = link.getAttribute("data-nav-target");
      if (target === sectionId) {
        link.classList.add("nav-active");
      } else {
        link.classList.remove("nav-active");
      }
    });

    // Update header title
    const headerTitle = document.getElementById("headerSectionTitle");
    const titles = {
      dashboard: "Executive Dashboard",
      "master-inventory": "Master Inventory Database",
      categories: "Inventory Categories",
      "issued-items": "Issued & Loaned Items",
      "permanent-returnable": "Permanent & Returnable Items",
      "new-purchases": "Procurement & Purchases",
      locations: "Storage Locations",
      transfers: "Warehouses & Stock Transfers",
      "stock-movements": "Stock Movement Audit Ledger",
      reports: "Reports & Analytics",
      "import-export": "Excel & Data Exchange",
      settings: "System Settings & Backup"
    };

    if (headerTitle) {
      headerTitle.textContent = titles[sectionId] || "EXIMIUS Inventory";
    }

    // Specific on-navigate refreshes
    if (sectionId === "stock-movements") {
      this.loadMovements();
    } else if (sectionId === "transfers") {
      EximusTransfers.loadAll();
    } else if (sectionId === "dashboard") {
      EximusDashboard.refresh();
    } else if (sectionId === "master-inventory") {
      EximusInventory.loadData();
    } else if (sectionId === "locations") {
      EximusLocations.loadLocations();
    } else if (sectionId === "reports") {
      EximusReports.generateReport();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    if (window.lucide) lucide.createIcons();
  }

  // Sidebar toggle
  setupSidebar() {
    const toggleBtn = document.getElementById("sidebarToggleBtn");
    const mobileToggleBtn = document.getElementById("mobileMenuBtn");
    const backdrop = document.getElementById("mobileSidebarBackdrop");
    const sidebar = document.getElementById("sidebar");

    if (this.sidebarCollapsed && window.innerWidth >= 1024) {
      sidebar?.classList.add("sidebar-collapsed");
    }

    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const isCollapsed = sidebar.classList.toggle("sidebar-collapsed");
        this.sidebarCollapsed = isCollapsed;
        localStorage.setItem("eximus_sidebar_collapsed", isCollapsed);
      });
    }

    if (mobileToggleBtn) {
      mobileToggleBtn.addEventListener("click", () => {
        this.toggleSidebar(true);
      });
    }

    if (backdrop) {
      backdrop.addEventListener("click", () => {
        this.toggleSidebar(false);
      });
    }
  }

  toggleSidebar(open) {
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("mobileSidebarBackdrop");
    if (!sidebar) return;

      if (window.innerWidth >= 1024) {
        const isCollapsed = sidebar.classList.toggle("sidebar-collapsed");
        this.sidebarCollapsed = isCollapsed;
        localStorage.setItem("eximus_sidebar_collapsed", isCollapsed);
        return;
      }

      const shouldOpen = open !== undefined ? open : sidebar.classList.contains("-translate-x-full");
      if (shouldOpen) {
        sidebar.classList.remove("-translate-x-full");
        backdrop?.classList.remove("hidden");
      } else {
        sidebar.classList.add("-translate-x-full");
        backdrop?.classList.add("hidden");
      }
    }

    // Global search modal (Ctrl+K or /)
    setupGlobalSearch() {
      const searchModal = document.getElementById("globalSearchModal");
      const searchInput = document.getElementById("globalSearchModalInput");
      const searchResults = document.getElementById("globalSearchResultsList");
      const searchTrigger = document.getElementById("headerGlobalSearchTrigger");

      const openSearch = () => {
        EximusUtils.openModal("globalSearchModal");
        setTimeout(() => searchInput?.focus(), 50);
      };

      if (searchTrigger) {
        searchTrigger.addEventListener("click", openSearch);
      }

      window.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "k") {
          e.preventDefault();
          openSearch();
        } else if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
          e.preventDefault();
          openSearch();
        } else if (e.key === "Escape") {
          EximusUtils.closeModal("globalSearchModal");
        }
      });

      if (searchInput) {
        searchInput.addEventListener(
          "input",
          EximusUtils.debounce(async (e) => {
            const query = e.target.value.trim().toLowerCase();
            if (!query) {
              searchResults.innerHTML = `
              <div class="py-8 text-center text-slate-400 text-xs">
                Type an item name, code, brand, or location to instantly search...
              </div>
            `;
              return;
            }

            const items = await EximusStorage.getAll("master_items");
            const locations = await EximusStorage.getAll("locations");

            const matchedItems = items.filter((i) => {
              const str = `${i.item_name} ${i.item_code} ${i.brand_name} ${i.model} ${i.location}`.toLowerCase();
              return str.includes(query);
            }).slice(0, 8);

            const matchedLocs = locations.filter((l) => l.name.toLowerCase().includes(query)).slice(0, 3);

            if (!matchedItems.length && !matchedLocs.length) {
              searchResults.innerHTML = `
              <div class="py-8 text-center text-slate-400 text-xs">
                No inventory records match "<strong>${EximusUtils.escapeHTML(query)}</strong>".
              </div>
            `;
              return;
            }

            let html = "";

            if (matchedItems.length) {
              html += `<p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1">Inventory Items (${matchedItems.length})</p>`;
              html += matchedItems
                .map(
                  (item) => `
              <div onclick="EximusApp.selectSearchResult('item', '${item.id}')" class="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors group">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <i data-lucide="package" class="w-4 h-4"></i>
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-semibold text-slate-900 group-hover:text-blue-600 truncate">${EximusUtils.escapeHTML(item.item_name)}</p>
                    <p class="text-[11px] text-slate-400 font-mono">${item.item_code || item.id} • ${item.location}</p>
                  </div>
                </div>
                <div class="text-right flex-shrink-0">
                  <span class="text-xs font-bold text-slate-800">${item.quantity} ${item.unit}</span>
                  <div class="text-[10px]">${EximusUtils.getConditionBadge(item.condition)}</div>
                </div>
              </div>
            `
                )
                .join("");
            }

            if (matchedLocs.length) {
              html += `<p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1 mt-2">Storage Locations (${matchedLocs.length})</p>`;
              html += matchedLocs
                .map(
                  (loc) => `
              <div onclick="EximusApp.selectSearchResult('location', '${loc.id}')" class="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors group">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <i data-lucide="map-pin" class="w-4 h-4"></i>
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-semibold text-slate-900 group-hover:text-emerald-600 truncate">${EximusUtils.escapeHTML(loc.name)}</p>
                    <p class="text-[11px] text-slate-400">${EximusUtils.escapeHTML(loc.sub_location || "Storage Shelf")}</p>
                  </div>
                </div>
                <span class="text-xs text-slate-400 group-hover:text-slate-600">View Location -></span>
              </div>
            `
                )
                .join("");
            }

            searchResults.innerHTML = html;
            if (window.lucide) lucide.createIcons();
          }, 150)
        );
      }
    }

    // Handle click on search result
    selectSearchResult(type, id) {
      EximusUtils.closeModal("globalSearchModal");
      if (type === "item") {
        this.navigate("master-inventory");
        setTimeout(() => {
          EximusInventory.viewItemDetails(id);
        }, 100);
      } else if (type === "location") {
        this.navigate("locations");
      }
    }

    // Live ticking header date/time
    setupHeaderTime() {
      const timeEl = document.getElementById("headerCurrentTime");
      const dateEl = document.getElementById("headerCurrentDate");

      const update = () => {
        const now = new Date();
        if (dateEl) {
          dateEl.textContent = now.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric"
          });
        }
        if (timeEl) {
          timeEl.textContent = now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          });
        }
      };

      update();
      setInterval(update, 1000);
    }

    // Notification center
    setupNotificationCenter() {
      const bellBtn = document.getElementById("headerNotificationBtn");
      if (bellBtn) {
        bellBtn.addEventListener("click", async () => {
          await this.renderNotifications();
          EximusUtils.openModal("notificationModal");
        });
      }
    }

  async renderNotifications() {
      const container = document.getElementById("notificationModalList");
      if (!container) return;

      const items = await EximusStorage.getAll("master_items");
      const issued = await EximusStorage.getAll("issued_items");

      const lowStock = items.filter((i) => (Number(i.quantity) || 0) <= (Number(i.min_threshold) || 3));
      const pendingReturns = issued.filter((i) => i.status !== "RETURNED" && i.type !== "PERMANENT");

      let notifications = [];

      lowStock.forEach((i) => {
        notifications.push({
          type: "warning",
          title: "Low Stock Alert: " + i.item_name,
          desc: `Only ${i.quantity} ${i.unit} remaining at ${i.location}. Threshold is ${i.min_threshold} ${i.unit}.`,
          actionText: "Restock",
          actionFn: `EximusInventory.openQuickStockModal('${i.id}')`
        });
      });

      pendingReturns.forEach((iss) => {
        notifications.push({
          type: "info",
          title: "Pending Item Return: " + iss.item_name,
          desc: `Issued to ${iss.issued_to}. Expected: ${EximusUtils.formatDate(iss.returned_date || "Open")}.`,
          actionText: "Process Return",
          actionFn: `EximusTransactions.openReturnModal('${iss.id}')`
        });
      });

      if (!notifications.length) {
        container.innerHTML = `
        <div class="py-8 text-center text-slate-400 text-xs">
          <i data-lucide="check-circle" class="w-8 h-8 text-emerald-500 mx-auto mb-2"></i>
          All inventory items and loans are in optimal health. No pending alerts!
        </div>
      `;
        if (window.lucide) lucide.createIcons();
        return;
      }

      container.innerHTML = notifications
        .map(
          (n) => `
      <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-3">
        <div class="flex items-start gap-2.5 min-w-0">
          <i data-lucide="${n.type === "warning" ? "alert-triangle" : "info"}" class="w-4 h-4 ${n.type === "warning" ? "text-amber-500" : "text-blue-500"} flex-shrink-0 mt-0.5"></i>
          <div class="min-w-0">
            <p class="text-xs font-bold text-slate-900">${EximusUtils.escapeHTML(n.title)}</p>
            <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">${EximusUtils.escapeHTML(n.desc)}</p>
          </div>
        </div>
        <button onclick="${n.actionFn}; EximusUtils.closeModal('notificationModal');" class="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors flex-shrink-0">
          ${n.actionText}
        </button>
      </div>
    `
        )
        .join("");

      if (window.lucide) lucide.createIcons();
    }

  // ==========================================
  // SECTION: STOCK MOVEMENTS AUDIT LEDGER
  // ==========================================

  async loadMovements() {
      const tbody = document.getElementById("stockMovementsTableBody");
      if (!tbody) return;

      const movements = await EximusStorage.getAll("stock_movements");
      const typeFilter = document.getElementById("movementTypeFilter")?.value || "";
      const search = (document.getElementById("movementSearchInput")?.value || "").toLowerCase();

      const filtered = movements.reverse().filter((m) => {
        if (typeFilter && m.type !== typeFilter) return false;
        if (search) {
          const text = `${m.item_name} ${m.performed_by} ${m.notes || ""}`.toLowerCase();
          if (!text.includes(search)) return false;
        }
        return true;
      });

      if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-10 text-center text-slate-400">No stock movements found.</td></tr>`;
        return;
      }

      tbody.innerHTML = filtered
        .map(
          (m) => `
      <tr class="hover:bg-slate-50/70 border-b border-slate-100 text-xs text-slate-700">
        <td class="py-3 px-3 text-slate-500 font-mono">${EximusUtils.formatDateTime(m.timestamp)}</td>
        <td class="py-3 px-4 font-semibold text-slate-900">${EximusUtils.escapeHTML(m.item_name)}</td>
        <td class="py-3 px-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
            ${m.type}
          </span>
        </td>
        <td class="py-3 px-3 font-mono font-bold text-center ${m.quantity_change > 0 ? "text-emerald-600" : m.quantity_change < 0 ? "text-rose-600" : "text-slate-400"}">
          ${m.quantity_change > 0 ? "+" : ""}${m.quantity_change}
        </td>
        <td class="py-3 px-3 font-mono text-slate-600 text-center">${m.balance_after || "-"}</td>
        <td class="py-3 px-4 text-slate-600 max-w-xs truncate" title="${EximusUtils.escapeHTML(m.notes || "")}">${EximusUtils.escapeHTML(m.notes || "-")}</td>
        <td class="py-3 px-3 text-slate-500">${EximusUtils.escapeHTML(m.performed_by || "System")}</td>
      </tr>
    `
        )
        .join("");
    }

    // ==========================================
    // SECTION: SETTINGS & BACKUP ENGINE
    // ==========================================

    setupSettingsView() {
      // JSON Backup download
      const jsonBackupBtn = document.getElementById("settingsExportJsonBtn");
      if (jsonBackupBtn) {
        jsonBackupBtn.addEventListener("click", async () => {
          const backup = await EximusStorage.exportFullJSON();
          const jsonStr = JSON.stringify(backup, null, 2);
          const blob = new Blob([jsonStr], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `EXIMUS_Inventory_Backup_${new Date().toISOString().slice(0, 10)}.json`;
          link.click();
          URL.revokeObjectURL(url);
          EximusUtils.showToast("Backup Created", "Saved full JSON snapshot of all inventory and images.", "success");
        });
      }

      // JSON Restore
      const jsonRestoreInput = document.getElementById("settingsRestoreJsonInput");
      if (jsonRestoreInput) {
        jsonRestoreInput.addEventListener("change", (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const parsed = JSON.parse(event.target.result);
              const confirmed = await EximusUtils.confirm({
                title: "Restore JSON Database",
                message: `This will replace your current inventory with ${parsed.master_items ? parsed.master_items.length : 0} items from the backup file. Proceed?`,
                confirmText: "Yes, Restore Backup",
                cancelText: "Cancel",
                variant: "warning"
              });

              if (!confirmed) return;

              await EximusStorage.restoreFullJSON(parsed, "replace");
              EximusUtils.showToast("Restoration Complete", "Successfully restored database from JSON.", "success");
              this.navigate("dashboard");
            } catch (err) {
              EximusUtils.showToast("Restore Error", "Invalid JSON file: " + err.message, "error");
            }
          };
          reader.readAsText(file);
        });
      }

      // Factory Reset
      const resetBtn = document.getElementById("settingsFactoryResetBtn");
      if (resetBtn) {
          resetBtn.addEventListener("click", () => this.triggerFactoryReset());
        }
  }

  // Backup Export helper
  async exportJsonBackup() {
        try {
          const backup = await EximusStorage.exportFullJSON();
          const jsonStr = JSON.stringify(backup, null, 2);
          const blob = new Blob([jsonStr], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `EXIMUS_Inventory_Backup_${new Date().toISOString().slice(0, 10)}.json`;
          link.click();
          URL.revokeObjectURL(url);
          EximusUtils.showToast("Backup Created", "Downloaded full system JSON snapshot.", "success");
        } catch (err) {
          EximusUtils.showToast("Backup Failed", err.message, "error");
        }
      }

  // Restore JSON helper
  async handleRestoreJson(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const parsed = JSON.parse(event.target.result);
            const confirmed = await EximusUtils.confirm({
              title: "Restore JSON Database",
              message: `This will replace your current inventory with ${parsed.master_items ? parsed.master_items.length : 0} items from the backup file. Proceed?`,
              confirmText: "Yes, Restore Backup",
              cancelText: "Cancel",
          variant: "warning"
            });

            if (!confirmed) return;

            await EximusStorage.restoreFullJSON(parsed, "replace");
            EximusUtils.showToast("Restoration Complete", "Successfully restored database from JSON.", "success");
            this.navigate("dashboard");
      } catch (err) {
        EximusUtils.showToast("Restore Error", "Invalid JSON file: " + err.message, "error");
      }
    };
    reader.readAsText(file);
  }

  // Factory Reset helper
  async triggerFactoryReset() {
    const confirmed = await EximusUtils.confirm({
      title: "Factory Reset to Initial Excel Data",
      message: "Are you sure you want to revert all changes and reload the exact pristine inventory records from OFFICE ELECTRICAL INVENTORY (2026.07.01).xlsx? All manual additions will be reset.",
      confirmText: "Yes, Reset to Initial Excel Data",
      cancelText: "Cancel",
      variant: "danger"
    });

    if (!confirmed) return;

    await EximusStorage.resetToFactoryData();
    EximusUtils.showToast("Reset Complete", "Reverted database to original Excel workbook baseline.", "info");
    this.navigate("dashboard");
  }
}

// Global App Instance
window.EximusApp = new AppController();

  // Global Escape Key to close any open modal
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const openModals = document.querySelectorAll(".modal-backdrop:not(.hidden)");
      openModals.forEach((m) => {
        m.classList.add("hidden");
        m.classList.remove("flex");
      });
      document.body.classList.remove("overflow-hidden");
    }
  });

  // Global click on backdrop to close modal
  document.addEventListener("click", (e) => {
    if (e.target && e.target.classList && e.target.classList.contains("modal-backdrop")) {
      e.target.classList.add("hidden");
      e.target.classList.remove("flex");
      document.body.classList.remove("overflow-hidden");
    }
  });

  // Boot application immediately or when DOM is ready
  function startEximusApp() {
    if (window.EximusApp && !window.EximusApp.hasStarted) {
      window.EximusApp.hasStarted = true;
      window.EximusApp.init();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startEximusApp);
  } else {
    startEximusApp();
  }

