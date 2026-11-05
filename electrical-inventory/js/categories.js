// EXIMUS Electrical Inventory Management System
// categories.js - Category Cards, Stats, Drilldown & Management

const EximusCategories = {
  categories: [],
  selectedCategory: null,

  async init() {
    await this.loadCategories();

    window.addEventListener("eximus:storage_changed", (e) => {
      if (e.detail.storeName === "categories" || e.detail.storeName === "master_items" || e.detail.storeName === "all") {
        this.loadCategories();
      }
    });
  },

  async loadCategories() {
    this.categories = await EximusStorage.getAll("categories");
    const masterItems = await EximusStorage.getAll("master_items");
    this.renderCategoryCards(this.categories, masterItems);
  },

  renderCategoryCards(categories, items) {
    const container = document.getElementById("categoryCardsContainer");
    if (!container) return;

    if (!categories.length) {
      container.innerHTML = `<p class="col-span-full py-8 text-center text-slate-400">No categories found.</p>`;
      return;
    }

    container.innerHTML = categories
      .map((cat) => {
        const catItems = items.filter((i) => (i.category || "").toUpperCase() === cat.name.toUpperCase());
        const totalUnits = catItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
        const usableCount = catItems.filter((i) => i.condition === "NEW" || i.condition === "USABLE").length;
        const lowStockCount = catItems.filter((i) => (Number(i.quantity) || 0) <= (Number(i.min_threshold) || 3)).length;

        return `
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-all group border-t-4" style="border-top-color: ${cat.color || "#2563eb"}">
          <div>
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm" style="background-color: ${cat.color || "#2563eb"}">
                <i data-lucide="${cat.icon || "package"}" class="w-6 h-6"></i>
              </div>
              <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">${cat.code || cat.name.slice(0, 3)}</span>
            </div>

            <h3 class="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">${cat.name}</h3>
            <p class="text-xs text-slate-500 mt-1 leading-relaxed min-h-[36px]">${EximusUtils.escapeHTML(cat.description || "Category group for electrical inventory.")}</p>

            <div class="grid grid-cols-2 gap-3 my-5 py-4 border-y border-slate-100">
              <div class="bg-slate-50 p-2.5 rounded-xl">
                <span class="text-[11px] text-slate-500 block">Total SKUs</span>
                <span class="text-lg font-extrabold text-slate-900">${catItems.length}</span>
              </div>
              <div class="bg-slate-50 p-2.5 rounded-xl">
                <span class="text-[11px] text-slate-500 block">Total Units</span>
                <span class="text-lg font-extrabold text-slate-900">${EximusUtils.formatNumber(totalUnits)}</span>
              </div>
              <div class="bg-slate-50 p-2.5 rounded-xl">
                <span class="text-[11px] text-slate-500 block">Ready/Usable</span>
                <span class="text-sm font-bold text-emerald-600">${usableCount} SKUs</span>
              </div>
              <div class="bg-slate-50 p-2.5 rounded-xl">
                <span class="text-[11px] text-slate-500 block">Low Stock</span>
                <span class="text-sm font-bold ${lowStockCount > 0 ? "text-amber-600" : "text-slate-400"}">${lowStockCount} SKUs</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 pt-2">
            <button onclick="EximusCategories.filterMasterByCategory('${cat.name}')" class="flex-1 py-2 px-3 text-xs font-semibold text-center text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center justify-center gap-1.5">
              <i data-lucide="filter" class="w-3.5 h-3.5"></i>
              Filter Master Inventory
            </button>
            <button onclick="EximusCategories.viewCategoryItems('${cat.name}')" class="py-2 px-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors" title="Quick Items View">
              <i data-lucide="eye" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `;
      })
      .join("");

    if (window.lucide) lucide.createIcons();
  },

  // Switch to Master Inventory filtered by category
  filterMasterByCategory(categoryName) {
    if (window.EximusApp) {
      window.EximusApp.navigate("master-inventory");
      const filterSelect = document.getElementById("inventoryCategoryFilter");
      if (filterSelect) {
        filterSelect.value = categoryName;
        EximusInventory.filters.category = categoryName;
        EximusInventory.currentPage = 1;
        EximusInventory.applyFilters();
      }
    }
  },

  // View Category Items Modal
  async viewCategoryItems(categoryName) {
    const items = await EximusStorage.getAll("master_items");
    const catItems = items.filter((i) => (i.category || "").toUpperCase() === categoryName.toUpperCase());

    const titleEl = document.getElementById("categoryDetailModalTitle");
    const contentEl = document.getElementById("categoryDetailModalContent");

    if (titleEl) titleEl.textContent = `${categoryName} (${catItems.length} Items)`;

    if (contentEl) {
      contentEl.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-slate-200">
            <span class="text-xs text-slate-500">Showing all records belonging to <strong class="text-slate-800">${categoryName}</strong></span>
            <button onclick="EximusCategories.filterMasterByCategory('${categoryName}'); EximusUtils.closeModal('categoryDetailModal');" class="text-xs text-blue-600 hover:underline font-medium">
              Open in Master Table ->
            </button>
          </div>
          <div class="max-h-[60vh] overflow-y-auto border border-slate-200 rounded-xl">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 border-b border-slate-200 sticky top-0 text-slate-600">
                <tr>
                  <th class="py-2.5 px-3">Code</th>
                  <th class="py-2.5 px-3">Item Name</th>
                  <th class="py-2.5 px-3">Location</th>
                  <th class="py-2.5 px-3 text-right">Quantity</th>
                  <th class="py-2.5 px-3 text-center">Condition</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${catItems
                  .map(
                    (item) => `
                  <tr class="hover:bg-slate-50">
                    <td class="py-2.5 px-3 font-mono text-blue-600 font-semibold">${EximusUtils.escapeHTML(item.item_code || item.id)}</td>
                    <td class="py-2.5 px-3 font-medium text-slate-900">${EximusUtils.escapeHTML(item.item_name)}</td>
                    <td class="py-2.5 px-3 text-slate-600">${EximusUtils.escapeHTML(item.location || "-")}</td>
                    <td class="py-2.5 px-3 text-right font-bold text-slate-800">${item.quantity} ${item.unit}</td>
                    <td class="py-2.5 px-3 text-center">${EximusUtils.getConditionBadge(item.condition)}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    EximusUtils.openModal("categoryDetailModal");
  },

  // Open Add Category Modal
  openAddCategoryModal() {
    const form = document.getElementById("addCategoryForm");
    if (form) form.reset();
    EximusUtils.openModal("addCategoryModal");
  },

  // Handle Add Category
  async handleSaveCategory(e) {
    e.preventDefault();

    const name = document.getElementById("catFormName").value.trim().toUpperCase();
    const code = document.getElementById("catFormCode").value.trim().toUpperCase();
    const desc = document.getElementById("catFormDescription").value.trim();
    const color = document.getElementById("catFormColor").value || "#2563eb";
    const icon = document.getElementById("catFormIcon").value || "package";

    if (!name || !code) {
      EximusUtils.showToast("Error", "Category Name and Code are required.", "warning");
      return;
    }

    // Check duplicate
    const existing = await EximusStorage.getAll("categories");
    if (existing.some((c) => c.name.toUpperCase() === name)) {
      EximusUtils.showToast("Duplicate Error", `A category named "${name}" already exists.`, "error");
      return;
    }

    const catObj = {
      id: "CAT-" + Date.now().toString().slice(-4),
      name,
      code,
      description: desc,
      color,
      icon
    };

    await EximusStorage.put("categories", catObj);
    EximusUtils.closeModal("addCategoryModal");
    EximusUtils.showToast("Category Created", `Category "${name}" created successfully.`, "success");
    await this.loadCategories();
  }
};

window.EximusCategories = EximusCategories;


