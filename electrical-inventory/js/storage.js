// EXIMUS Electrical Inventory Management System
// storage.js - IndexedDB & LocalStorage Enterprise Data Engine

const DB_NAME = "EximusInventoryDB";
const DB_VERSION = 2;

class StorageEngine {
  constructor() {
    this.db = null;
    this.isReady = false;
    this.readyPromise = null;
  }

  // Initialize IndexedDB with fallbacks
  async init() {
    if (this.readyPromise) return this.readyPromise;

    this.readyPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn("IndexedDB not supported. Falling back to LocalStorage.");
        this.fallbackToLocalStorage();
        this.isReady = true;
        resolve(this);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 1. Master Inventory Store
        if (!db.objectStoreNames.contains("master_items")) {
          const masterStore = db.createObjectStore("master_items", { keyPath: "id" });
          masterStore.createIndex("category", "category", { unique: false });
          masterStore.createIndex("location", "location", { unique: false });
          masterStore.createIndex("condition", "condition", { unique: false });
          masterStore.createIndex("status", "status", { unique: false });
          masterStore.createIndex("item_name", "item_name", { unique: false });
        }

        // 2. Worksheet 01 Records
        if (!db.objectStoreNames.contains("record_2026_07_01")) {
          const ws1Store = db.createObjectStore("record_2026_07_01", { autoIncrement: true });
          ws1Store.createIndex("location", "location", { unique: false });
          ws1Store.createIndex("item_code", "item_code", { unique: false });
        }

        // 3. Issued Items
        if (!db.objectStoreNames.contains("issued_items")) {
          const issueStore = db.createObjectStore("issued_items", { keyPath: "id" });
          issueStore.createIndex("status", "status", { unique: false });
          issueStore.createIndex("issued_to", "issued_to", { unique: false });
        }

        // 4. Permanent & Returnable Items
        if (!db.objectStoreNames.contains("permanent_returnable")) {
          const permStore = db.createObjectStore("permanent_returnable", { keyPath: "id" });
          permStore.createIndex("issue_type", "issue_type", { unique: false });
          permStore.createIndex("issued_to", "issued_to", { unique: false });
        }

        // 5. New Purchases
        if (!db.objectStoreNames.contains("new_purchases")) {
          const purStore = db.createObjectStore("new_purchases", { keyPath: "id" });
          purStore.createIndex("purchase_date", "purchase_date", { unique: false });
        }

        // 6. Locations
        if (!db.objectStoreNames.contains("locations")) {
          db.createObjectStore("locations", { keyPath: "id" });
        }

        // 7. Stock Movements Audit Trail
        if (!db.objectStoreNames.contains("stock_movements")) {
          const moveStore = db.createObjectStore("stock_movements", { keyPath: "id" });
          moveStore.createIndex("timestamp", "timestamp", { unique: false });
          moveStore.createIndex("type", "type", { unique: false });
          moveStore.createIndex("item_id", "item_id", { unique: false });
        }

        // 8. Location Photos
        if (!db.objectStoreNames.contains("location_photos")) {
          db.createObjectStore("location_photos", { keyPath: "location_id" });
        }

        // 9. Categories
        if (!db.objectStoreNames.contains("categories")) {
          db.createObjectStore("categories", { keyPath: "id" });
        }

        // 10. App Settings & Meta
        if (!db.objectStoreNames.contains("app_settings")) {
          db.createObjectStore("app_settings", { keyPath: "key" });
        }

        // 11. Warehouses (5 Warehouses Configuration)
        if (!db.objectStoreNames.contains("warehouses")) {
          const whStore = db.createObjectStore("warehouses", { keyPath: "id" });
          whStore.createIndex("code", "code", { unique: true });
          whStore.createIndex("name", "name", { unique: false });
        }

        // 12. Inter-Warehouse Transfers
        if (!db.objectStoreNames.contains("warehouse_transfers")) {
          const trfStore = db.createObjectStore("warehouse_transfers", { keyPath: "id" });
          trfStore.createIndex("transfer_no", "transfer_no", { unique: false });
          trfStore.createIndex("from_warehouse_id", "from_warehouse_id", { unique: false });
          trfStore.createIndex("to_warehouse_id", "to_warehouse_id", { unique: false });
          trfStore.createIndex("item_id", "item_id", { unique: false });
          trfStore.createIndex("date", "date", { unique: false });
        }
      };

      request.onsuccess = async (event) => {
        this.db = event.target.result;
        this.isReady = true;

                try {
                  // Check if database needs initial seeding
                  const itemCount = await this.count("master_items");
                  if (itemCount === 0) {
                    console.log("Database empty. Seeding initial Excel workbook data...");
                    await this.seedInitialData();
                  } else {
                    console.log(`Database loaded with ${itemCount} master items.`);
                    // Ensure warehouses are seeded even if DB was created previously in v1
                    const whCount = await this.count("warehouses");
                    if (whCount === 0 && window.EXIMUS_PRELOADED_DATA && window.EXIMUS_PRELOADED_DATA.warehouses) {
                      console.log("Seeding default 5 warehouses into existing database in bulk...");
                      try {
                        const tx = this.db.transaction(["warehouses"], "readwrite");
                        const whStore = tx.objectStore("warehouses");
                        for (const wh of window.EXIMUS_PRELOADED_DATA.warehouses) {
                          whStore.put(wh);
                        }
                      } catch (whErr) {
                        console.warn("Warehouse seeding warning:", whErr);
                      }
                    }

                        // Ensure master items have warehouse_stock initialized in a fast single transaction
                        const allItems = await this.getAll("master_items");
                        if (allItems.length > 0 && !allItems[0].warehouse_stock) {
                          console.log("Migrating master items with warehouse stock structure in bulk...");
                          try {
                            const tx = this.db.transaction(["master_items"], "readwrite");
                            const store = tx.objectStore("master_items");
                            for (const item of allItems) {
                              if (!item.warehouse_id) item.warehouse_id = "WH-01";
                              if (!item.warehouse_stock) {
                                item.warehouse_stock = { "WH-01": Number(item.quantity) || 0 };
                              }
                              store.put(item);
                            }
                          } catch (migErr) {
                            console.warn("Migration warning:", migErr);
                          }
                        }
                      }
                    } catch (initErr) {
                      console.warn("Storage init non-fatal warning:", initErr);
                    }

                    resolve(this);
                  };

                  request.onerror = (event) => {
                    console.error("IndexedDB error:", event.target.error);
                    this.fallbackToLocalStorage();
                    this.isReady = true;
                    resolve(this);
                  };
                });

    return this.readyPromise;
  }

  // Seed data from preloaded objects
  async seedInitialData() {
    try {
      const data = window.EXIMUS_PRELOADED_DATA;
      if (!data) {
        console.error("EXIMUS_PRELOADED_DATA not found!");
        return;
      }

      // Seed categories
      if (data.categories && data.categories.length) {
        for (const cat of data.categories) {
          await this.put("categories", cat);
        }
      }

      // Seed locations
      if (data.locations && data.locations.length) {
        for (const loc of data.locations) {
          await this.put("locations", loc);
        }
      }

      // Seed master items
      if (data.master_items && data.master_items.length) {
        for (const item of data.master_items) {
          await this.put("master_items", item);
        }
      }

      // Seed worksheet 01 records
      if (data.record_2026_07_01 && data.record_2026_07_01.length) {
        for (const rec of data.record_2026_07_01) {
          await this.add("record_2026_07_01", rec);
        }
      }

      // Seed issued items
      if (data.issued_items && data.issued_items.length) {
        for (const iss of data.issued_items) {
          await this.put("issued_items", iss);
        }
      }

      // Seed permanent returnable
      if (data.permanent_returnable && data.permanent_returnable.length) {
        for (const pr of data.permanent_returnable) {
          await this.put("permanent_returnable", pr);
        }
      }

      // Seed new purchases
      if (data.new_purchases && data.new_purchases.length) {
        for (const pur of data.new_purchases) {
          await this.put("new_purchases", pur);
        }
      }

      // Seed stock movements
      if (data.stock_movements && data.stock_movements.length) {
        for (const mov of data.stock_movements) {
          await this.put("stock_movements", mov);
        }
      }

      // Seed 5 Warehouses
      if (data.warehouses && data.warehouses.length) {
        for (const wh of data.warehouses) {
          await this.put("warehouses", wh);
        }
      }

      // Seed warehouse transfers
      if (data.warehouse_transfers && data.warehouse_transfers.length) {
        for (const trf of data.warehouse_transfers) {
          await this.put("warehouse_transfers", trf);
        }
      }

      // Save initial system info
      await this.put("app_settings", {
        key: "system_info",
        value: data.system_info
      });

      await this.put("app_settings", {
        key: "import_status",
        value: {
          is_seeded: true,
          seeded_at: new Date().toISOString(),
          source: data.system_info.source_file,
          summary: data.system_info.summary
        }
      });

      console.log("Seeding complete successfully.");
    } catch (err) {
      console.error("Error during seedInitialData:", err);
    }
  }

  // Fallback to LocalStorage if IndexedDB unavailable
  fallbackToLocalStorage() {
    this.useLocalStorage = true;
    if (!localStorage.getItem("eximus_master_items") && window.EXIMUS_PRELOADED_DATA) {
      const d = window.EXIMUS_PRELOADED_DATA;
      localStorage.setItem("eximus_master_items", JSON.stringify(d.master_items || []));
      localStorage.setItem("eximus_categories", JSON.stringify(d.categories || []));
      localStorage.setItem("eximus_locations", JSON.stringify(d.locations || []));
      localStorage.setItem("eximus_issued_items", JSON.stringify(d.issued_items || []));
      localStorage.setItem("eximus_permanent_returnable", JSON.stringify(d.permanent_returnable || []));
      localStorage.setItem("eximus_new_purchases", JSON.stringify(d.new_purchases || []));
      localStorage.setItem("eximus_stock_movements", JSON.stringify(d.stock_movements || []));
      localStorage.setItem("eximus_record_2026_07_01", JSON.stringify(d.record_2026_07_01 || []));
      localStorage.setItem("eximus_warehouses", JSON.stringify(d.warehouses || []));
      localStorage.setItem("eximus_warehouse_transfers", JSON.stringify(d.warehouse_transfers || []));
    }
  }

  // Count records in store
  async count(storeName) {
    if (this.useLocalStorage) {
      const items = JSON.parse(localStorage.getItem(`eximus_${storeName}`) || "[]");
      return items.length;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction([storeName], "readonly");
        const store = tx.objectStore(storeName);
        const req = store.count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(0);
      } catch (e) {
        resolve(0);
      }
    });
  }

  // Get all records from store
  async getAll(storeName) {
    if (this.useLocalStorage) {
      return JSON.parse(localStorage.getItem(`eximus_${storeName}`) || "[]");
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction([storeName], "readonly");
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  // Get record by ID
  async getById(storeName, id) {
    if (this.useLocalStorage) {
      const items = JSON.parse(localStorage.getItem(`eximus_${storeName}`) || "[]");
      return items.find((i) => i.id === id || i.key === id) || null;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction([storeName], "readonly");
        const store = tx.objectStore(storeName);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  // Put / Update record
  async put(storeName, item) {
    if (this.useLocalStorage) {
      const items = JSON.parse(localStorage.getItem(`eximus_${storeName}`) || "[]");
      const key = item.id || item.key;
      const idx = items.findIndex((i) => (i.id && i.id === key) || (i.key && i.key === key));
      if (idx >= 0) {
        items[idx] = item;
      } else {
        items.push(item);
      }
      localStorage.setItem(`eximus_${storeName}`, JSON.stringify(items));
      this.dispatchStorageChange(storeName, "put", item);
      return item;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction([storeName], "readwrite");
        const store = tx.objectStore(storeName);
        const req = store.put(item);
        req.onsuccess = () => {
          this.dispatchStorageChange(storeName, "put", item);
          resolve(item);
        };
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  // Add record (fails if exists for keyed store)
  async add(storeName, item) {
    if (this.useLocalStorage) {
      const items = JSON.parse(localStorage.getItem(`eximus_${storeName}`) || "[]");
      items.push(item);
      localStorage.setItem(`eximus_${storeName}`, JSON.stringify(items));
      this.dispatchStorageChange(storeName, "add", item);
      return item;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction([storeName], "readwrite");
        const store = tx.objectStore(storeName);
        const req = store.add(item);
        req.onsuccess = () => {
          this.dispatchStorageChange(storeName, "add", item);
          resolve(item);
        };
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  // Delete record by ID
  async delete(storeName, id) {
    if (this.useLocalStorage) {
      const items = JSON.parse(localStorage.getItem(`eximus_${storeName}`) || "[]");
      const filtered = items.filter((i) => i.id !== id && i.key !== id);
      localStorage.setItem(`eximus_${storeName}`, JSON.stringify(filtered));
      this.dispatchStorageChange(storeName, "delete", { id });
      return true;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction([storeName], "readwrite");
        const store = tx.objectStore(storeName);
        const req = store.delete(id);
        req.onsuccess = () => {
          this.dispatchStorageChange(storeName, "delete", { id });
          resolve(true);
        };
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  // Clear store
  async clear(storeName) {
    if (this.useLocalStorage) {
      localStorage.removeItem(`eximus_${storeName}`);
      this.dispatchStorageChange(storeName, "clear", null);
      return true;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction([storeName], "readwrite");
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => {
          this.dispatchStorageChange(storeName, "clear", null);
          resolve(true);
        };
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  // Save location photo
  async saveLocationPhoto(locationId, base64Data) {
    return this.put("location_photos", {
      location_id: locationId,
      photo_data: base64Data,
      updated_at: new Date().toISOString()
    });
  }

  // Get location photo
  async getLocationPhoto(locationId) {
    const res = await this.getById("location_photos", locationId);
    return res ? res.photo_data : "";
  }

  // Dispatch storage change event for reactive updates
  dispatchStorageChange(storeName, action, payload) {
    window.dispatchEvent(
      new CustomEvent("eximus:storage_changed", {
        detail: { storeName, action, payload }
      })
    );
  }

  // Warehouse Management Methods
  async getWarehouses() {
    const list = await this.getAll("warehouses");
    return list.sort((a, b) => (a.code || a.id).localeCompare(b.code || b.id));
  }

  async getWarehouseById(id) {
    return await this.getById("warehouses", id);
  }

  async saveWarehouse(wh) {
    if (!wh.id) wh.id = "WH-" + Date.now();
    await this.put("warehouses", wh);
    this.dispatchStorageChange("warehouses", "save", wh);
    return wh;
  }

  async getWarehouseTransfers() {
    const list = await this.getAll("warehouse_transfers");
    return list.sort((a, b) => new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0));
  }

  // Inter-Warehouse Stock Transfer Transaction
  async executeWarehouseTransfer(transferData) {
    const {
      from_warehouse_id,
      to_warehouse_id,
      item_id,
      quantity,
      authorized_by = "Store Admin",
      driver_info = "",
      notes = "",
      date = new Date().toISOString().split("T")[0]
    } = transferData;

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      throw new Error("Transfer quantity must be greater than zero.");
    }

    if (from_warehouse_id === to_warehouse_id) {
      throw new Error("Source warehouse and destination warehouse cannot be the same.");
    }

    // 1. Fetch item
    const item = await this.getById("master_items", item_id);
    if (!item) {
      throw new Error(`Item ${item_id} not found in master inventory.`);
    }

    // Ensure warehouse_stock structure exists
    if (!item.warehouse_stock) {
      item.warehouse_stock = {};
      item.warehouse_stock[item.warehouse_id || "WH-01"] = Number(item.quantity) || 0;
    }

    const availableSrcStock = Number(item.warehouse_stock[from_warehouse_id] || 0);
    if (availableSrcStock < qty) {
      throw new Error(
        `Insufficient stock in source warehouse! Available: ${availableSrcStock} ${item.unit || "units"}, Requested: ${qty} ${item.unit || "units"}.`
      );
    }

    // 2. Fetch warehouse details
    const fromWh = (await this.getById("warehouses", from_warehouse_id)) || { name: from_warehouse_id };
    const toWh = (await this.getById("warehouses", to_warehouse_id)) || { name: to_warehouse_id };

    // 3. Deduct from source and add to destination
    item.warehouse_stock[from_warehouse_id] = availableSrcStock - qty;
    item.warehouse_stock[to_warehouse_id] = Number(item.warehouse_stock[to_warehouse_id] || 0) + qty;

    // Recalculate total quantity across all warehouses
    let totalQty = 0;
    for (const whKey in item.warehouse_stock) {
      totalQty += Number(item.warehouse_stock[whKey]) || 0;
    }
    item.quantity = totalQty;

    // Save updated item
    await this.put("master_items", item);

    // 4. Create Transfer Record
    const transferCount = await this.count("warehouse_transfers");
    const trfId = "TRF-" + Date.now();
    const trfNumber = `TRF-${new Date().getFullYear()}-${String(transferCount + 1).padStart(3, "0")}`;

    const transferRecord = {
      id: trfId,
      transfer_no: trfNumber,
      date: date || new Date().toISOString().split("T")[0],
      created_at: new Date().toISOString(),
      from_warehouse_id,
      from_warehouse_name: fromWh.name,
      to_warehouse_id,
      to_warehouse_name: toWh.name,
      item_id: item.id,
      item_code: item.item_code || "",
      item_name: item.item_name,
      category: item.category || "",
      quantity: qty,
      unit: item.unit || "Pcs",
      authorized_by,
      driver_info,
      notes,
      status: "COMPLETED"
    };

    await this.put("warehouse_transfers", transferRecord);

    // 5. Add to Stock Movements Audit Trail
    await this.add("stock_movements", {
      id: "MOV-" + Date.now(),
      timestamp: new Date().toISOString(),
      item_id: item.id,
      item_name: item.item_name,
      type: "WAREHOUSE_TRANSFER",
      quantity_change: 0,
      balance_after: totalQty,
      performed_by: authorized_by,
      reference_id: trfNumber,
      notes: `Warehouse Transfer (${trfNumber}): Moved ${qty} ${item.unit || "units"} from '${fromWh.name}' to '${toWh.name}'. Logistics: ${driver_info || "Direct Handover"}`
    });

    this.dispatchStorageChange("warehouse_transfers", "execute", transferRecord);
    this.dispatchStorageChange("master_items", "update", item);

    return transferRecord;
  }

  // Export full JSON database dump
  async exportFullJSON() {
    const backup = {
      system_info: {
        export_date: new Date().toISOString(),
        system: "EXIMUS Electrical Inventory Management System",
        company: "EXIMUS",
        version: "1.1.0"
      },
      warehouses: await this.getAll("warehouses"),
      warehouse_transfers: await this.getAll("warehouse_transfers"),
      categories: await this.getAll("categories"),
      locations: await this.getAll("locations"),
      master_items: await this.getAll("master_items"),
      record_2026_07_01: await this.getAll("record_2026_07_01"),
      issued_items: await this.getAll("issued_items"),
      permanent_returnable: await this.getAll("permanent_returnable"),
      new_purchases: await this.getAll("new_purchases"),
      stock_movements: await this.getAll("stock_movements"),
      location_photos: await this.getAll("location_photos"),
      app_settings: await this.getAll("app_settings")
    };

    return backup;
  }

  // Restore from JSON dump
  async restoreFullJSON(jsonData, mode = "replace") {
    if (!jsonData || !jsonData.master_items) {
      throw new Error("Invalid backup JSON format: 'master_items' array missing.");
    }

    if (mode === "replace") {
      await this.clear("master_items");
      await this.clear("categories");
      await this.clear("locations");
      await this.clear("warehouses");
      await this.clear("warehouse_transfers");
      await this.clear("issued_items");
      await this.clear("permanent_returnable");
      await this.clear("new_purchases");
      await this.clear("stock_movements");
      await this.clear("record_2026_07_01");
      await this.clear("location_photos");
    }

    // Insert warehouses
    if (jsonData.warehouses) {
      for (const wh of jsonData.warehouses) await this.put("warehouses", wh);
    }

    // Insert warehouse transfers
    if (jsonData.warehouse_transfers) {
      for (const trf of jsonData.warehouse_transfers) await this.put("warehouse_transfers", trf);
    }

    // Insert categories
    if (jsonData.categories) {
      for (const cat of jsonData.categories) await this.put("categories", cat);
    }

    // Insert locations
    if (jsonData.locations) {
      for (const loc of jsonData.locations) await this.put("locations", loc);
    }

    // Insert master items
    if (jsonData.master_items) {
      for (const item of jsonData.master_items) await this.put("master_items", item);
    }

    // Insert issued items
    if (jsonData.issued_items) {
      for (const iss of jsonData.issued_items) await this.put("issued_items", iss);
    }

    // Insert permanent returnable
    if (jsonData.permanent_returnable) {
      for (const pr of jsonData.permanent_returnable) await this.put("permanent_returnable", pr);
    }

    // Insert new purchases
    if (jsonData.new_purchases) {
      for (const pur of jsonData.new_purchases) await this.put("new_purchases", pur);
    }

    // Insert movements
    if (jsonData.stock_movements) {
      for (const mov of jsonData.stock_movements) await this.put("stock_movements", mov);
    }

    // Insert photos
    if (jsonData.location_photos) {
      for (const p of jsonData.location_photos) await this.put("location_photos", p);
    }

    // Insert worksheet 1 records
    if (jsonData.record_2026_07_01) {
      for (const r of jsonData.record_2026_07_01) await this.add("record_2026_07_01", r);
    }

    // Record restore movement
    await this.add("stock_movements", {
      id: "MOV-" + Date.now(),
      timestamp: new Date().toISOString(),
      item_id: "BACKUP_RESTORE",
      item_name: "Full System JSON Restore",
      type: "BACKUP_RESTORE",
      quantity_change: 0,
      balance_after: 0,
      performed_by: "Administrator",
      reference_id: "JSON_RESTORE",
      notes: `Restored ${jsonData.master_items.length} master items using mode: ${mode}.`
    });

    this.dispatchStorageChange("all", "restore", null);
    return true;
  }

  // Reset to factory preloaded data
  async resetToFactoryData() {
    await this.clear("master_items");
    await this.clear("categories");
    await this.clear("locations");
    await this.clear("warehouses");
    await this.clear("warehouse_transfers");
    await this.clear("issued_items");
    await this.clear("permanent_returnable");
    await this.clear("new_purchases");
    await this.clear("stock_movements");
    await this.clear("record_2026_07_01");
    await this.clear("location_photos");
    await this.clear("app_settings");

    await this.seedInitialData();
    this.dispatchStorageChange("all", "reset", null);
    return true;
  }
}

// Global Storage Instance
window.EximusStorage = new StorageEngine();

