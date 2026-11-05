// EXIMUS Electrical Inventory Management System
// locations.js - 16 Locations Management, Photo Uploads & Stored Stock Tracking

const EximusLocations = {
  locations: [],
  locationPhotos: {},

  async init() {
    this.bindEvents();
    await this.loadLocations();

    window.addEventListener("eximus:storage_changed", (e) => {
      const store = e.detail.storeName;
      if (store === "locations" || store === "location_photos" || store === "master_items" || store === "all") {
        this.loadLocations();
      }
    });
  },

  bindEvents() {
    const searchInput = document.getElementById("locationSearchInput");
    if (searchInput) {
      searchInput.addEventListener(
        "input",
        EximusUtils.debounce(() => this.renderLocationCards(), 200)
      );
    }
  },

  async loadLocations() {
    this.locations = await EximusStorage.getAll("locations");

    // Load photos
    const photos = await EximusStorage.getAll("location_photos");
    this.locationPhotos = {};
    photos.forEach((p) => {
      this.locationPhotos[p.location_id] = p.photo_data;
    });

    await this.renderLocationCards();
  },

  async renderLocationCards() {
    const container = document.getElementById("locationsGridContainer");
    if (!container) return;

    const items = await EximusStorage.getAll("master_items");
    const search = (document.getElementById("locationSearchInput")?.value || "").toLowerCase();

    const filtered = this.locations.filter((loc) => {
      if (search) {
        const text = `${loc.name} ${loc.sub_location || ""} ${loc.description || ""}`.toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });

    if (!filtered.length) {
      container.innerHTML = `<p class="col-span-full py-12 text-center text-slate-400">No storage locations match your search.</p>`;
      return;
    }

    container.innerHTML = filtered
      .map((loc) => {
        // Calculate stored items
        const locItems = items.filter((i) => {
          const l = (i.location || "").toLowerCase();
          return l.includes(loc.name.toLowerCase()) || loc.name.toLowerCase().includes(l);
        });

        const totalUnits = locItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
        const photo = this.locationPhotos[loc.id] || loc.photo || "";

        return `
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all group">
          <!-- Photo Banner / Upload Area -->
          <div class="relative h-44 bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-200/80">
            ${photo
            ? `<img src="${photo}" alt="${loc.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">`
            : `
                <div class="flex flex-col items-center justify-center p-4 text-center text-slate-400">
                  <div class="w-12 h-12 rounded-full bg-slate-200/70 flex items-center justify-center mb-2 text-slate-500">
                    <i data-lucide="camera" class="w-6 h-6"></i>
                  </div>
                  <span class="text-xs font-medium text-slate-500">No Location Photo</span>
                  <span class="text-[11px] text-slate-400 mt-0.5">Click camera to upload actual photo</span>
                </div>
              `
          }
            <!-- Overlay Camera Upload Button -->
            <label class="absolute bottom-2.5 right-2.5 cursor-pointer bg-white/90 hover:bg-white text-slate-700 hover:text-blue-600 p-2 rounded-xl shadow-md border border-slate-200 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm transition-all" title="Upload or Update Location Photo">
              <i data-lucide="camera" class="w-4 h-4 text-blue-600"></i>
              <span>${photo ? "Change Photo" : "Upload Photo"}</span>
              <input type="file" accept="image/*" class="hidden" onchange="EximusLocations.handlePhotoUpload(event, '${loc.id}')">
            </label>
            <span class="absolute top-2.5 left-2.5 bg-slate-900/80 text-white font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-md backdrop-blur-sm">
              LOC #${loc.no || loc.id.slice(-2)}
            </span>
          </div>

          <!-- Location Details -->
          <div class="p-5 flex-1 flex flex-col justify-between">
            <div>
              <div class="flex items-start justify-between gap-2 mb-1.5">
                <h3 class="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors">${EximusUtils.escapeHTML(loc.name)}</h3>
                <span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60 flex-shrink-0">${loc.type || "Storage"}</span>
              </div>
              <p class="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400"></i>
                ${EximusUtils.escapeHTML(loc.sub_location || "Office Inventory Room")}
              </p>
              <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">${EximusUtils.escapeHTML(loc.description || "Designated shelf/box storage location for office electrical inventory.")}</p>
            </div>

            <div>
              <!-- Stock stats pill -->
              <div class="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-4">
                <div class="text-center flex-1 border-r border-slate-200">
                  <span class="text-[11px] text-slate-400 block uppercase font-medium">Unique SKUs</span>
                  <span class="text-base font-extrabold text-slate-900">${locItems.length}</span>
                </div>
                <div class="text-center flex-1">
                  <span class="text-[11px] text-slate-400 block uppercase font-medium">Total Units</span>
                  <span class="text-base font-extrabold text-blue-600">${EximusUtils.formatNumber(totalUnits)}</span>
                </div>
              </div>

              <!-- Action buttons -->
              <div class="flex items-center gap-2">
                <button onclick="EximusLocations.viewStoredItems('${loc.id}', '${EximusUtils.escapeHTML(loc.name)}')" class="flex-1 py-2 px-3 text-xs font-semibold text-center text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center justify-center gap-1.5">
                  <i data-lucide="boxes" class="w-3.5 h-3.5"></i>
                  View Stored Items (${locItems.length})
                </button>
                <button onclick="EximusLocations.openEditLocationModal('${loc.id}')" class="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors" title="Edit Location">
                  <i data-lucide="edit-2" class="w-4 h-4"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    if (window.lucide) lucide.createIcons();
  },

  // Photo file upload handler
  async handlePhotoUpload(event, locationId) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      EximusUtils.showToast("Invalid File", "Please select a valid image file (JPG, PNG, WebP).", "warning");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      EximusUtils.showToast("File Too Large", "Please select an image smaller than 5MB.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target.result;
      await EximusStorage.saveLocationPhoto(locationId, base64Data);
      EximusUtils.showToast("Photo Saved", "Location photograph updated and saved to IndexedDB.", "success");
      await this.loadLocations();
    };

    reader.onerror = () => {
      EximusUtils.showToast("Upload Error", "Failed to read image file.", "error");
    };

    reader.readAsDataURL(file);
  },

  // View Stored Items inside Location
  async viewStoredItems(locationId, locationName) {
    const items = await EximusStorage.getAll("master_items");
    const locItems = items.filter((i) => {
      const l = (i.location || "").toLowerCase();
      return l.includes(locationName.toLowerCase()) || locationName.toLowerCase().includes(l);
    });

    const titleEl = document.getElementById("locationDetailModalTitle");
    const contentEl = document.getElementById("locationDetailModalContent");

    if (titleEl) titleEl.textContent = `${locationName} - Stored Items (${locItems.length})`;

    if (contentEl) {
      contentEl.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-slate-200">
            <span class="text-xs text-slate-500">Total units stored: <strong class="text-slate-900">${locItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)} units</strong></span>
            <button onclick="EximusLocations.filterMasterByLocation('${locationName}'); EximusUtils.closeModal('locationDetailModal');" class="text-xs text-blue-600 hover:underline font-medium">
              Open in Master Table ->
            </button>
          </div>
          <div class="max-h-[60vh] overflow-y-auto border border-slate-200 rounded-xl">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 border-b border-slate-200 sticky top-0 text-slate-600">
                <tr>
                  <th class="py-2.5 px-3">Code</th>
                  <th class="py-2.5 px-3">Item Name</th>
                  <th class="py-2.5 px-3">Category</th>
                  <th class="py-2.5 px-3 text-right">Quantity</th>
                  <th class="py-2.5 px-3 text-center">Condition</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${locItems.length === 0
          ? '<tr><td colspan="5" class="py-6 text-center text-slate-400">No items currently registered at this location.</td></tr>'
          : locItems
            .map(
              (item) => `
                    <tr class="hover:bg-slate-50">
                      <td class="py-2.5 px-3 font-mono text-blue-600 font-semibold">${EximusUtils.escapeHTML(item.item_code || item.id)}</td>
                      <td class="py-2.5 px-3 font-medium text-slate-900">${EximusUtils.escapeHTML(item.item_name)}</td>
                      <td class="py-2.5 px-3">${EximusUtils.getCategoryBadge(item.category)}</td>
                      <td class="py-2.5 px-3 text-right font-bold text-slate-800">${item.quantity} ${item.unit}</td>
                      <td class="py-2.5 px-3 text-center">${EximusUtils.getConditionBadge(item.condition)}</td>
                    </tr>
                  `
            )
            .join("")
        }
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    EximusUtils.openModal("locationDetailModal");
  },

  filterMasterByLocation(locName) {
    if (window.EximusApp) {
      window.EximusApp.navigate("master-inventory");
      const locSelect = document.getElementById("inventoryLocationFilter");
      if (locSelect) {
        locSelect.value = locName;
        EximusInventory.filters.location = locName;
        EximusInventory.currentPage = 1;
        EximusInventory.applyFilters();
      }
    }
  },

  // Open Edit Location Modal
  async openEditLocationModal(locationId) {
    const loc = await EximusStorage.getById("locations", locationId);
    if (!loc) return;

    document.getElementById("locFormId").value = loc.id;
    document.getElementById("locFormName").value = loc.name || "";
    document.getElementById("locFormSubLocation").value = loc.sub_location || "";
    document.getElementById("locFormType").value = loc.type || "Storage Box";
    document.getElementById("locFormDescription").value = loc.description || "";

    const titleEl = document.getElementById("locModalTitle");
    if (titleEl) titleEl.textContent = "Edit Storage Location";

    EximusUtils.openModal("locationModal");
  },

  // Open Add Location Modal
  openAddLocationModal() {
    const form = document.getElementById("locationForm");
    if (form) form.reset();

    document.getElementById("locFormId").value = "";
    const titleEl = document.getElementById("locModalTitle");
    if (titleEl) titleEl.textContent = "Add New Storage Location";

    EximusUtils.openModal("locationModal");
  },

  // Save Location (Add/Update)
  async handleSaveLocation(e) {
    e.preventDefault();

    const id = document.getElementById("locFormId").value;
    const name = document.getElementById("locFormName").value.trim();
    const subLocation = document.getElementById("locFormSubLocation").value.trim();
    const type = document.getElementById("locFormType").value;
    const desc = document.getElementById("locFormDescription").value.trim();

    if (!name) {
      EximusUtils.showToast("Validation Error", "Location Name is required.", "warning");
      return;
    }

    const isEdit = Boolean(id);
    const finalId = isEdit ? id : "LOC-" + Date.now().toString().slice(-4);

    const locObj = {
      id: finalId,
      name,
      sub_location: subLocation || "Inventory Room",
      type,
      description: desc || "Storage area for electrical components and equipment."
    };

    await EximusStorage.put("locations", locObj);
    EximusUtils.closeModal("locationModal");
    EximusUtils.showToast("Location Saved", isEdit ? "Location details updated." : "New location created.", "success");
    await this.loadLocations();
  }
};

window.EximusLocations = EximusLocations;


