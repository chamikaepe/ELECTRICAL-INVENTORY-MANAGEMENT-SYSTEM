// EXIMUS Electrical Inventory Management System
// utilities.js - Helper Functions, Toasts, Badges, Modals & Formatters

const EximusUtils = {
  // Toast Notification System
  showToast(title, message, type = "info", duration = 4000) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toastId = "toast_" + Date.now();
    const icons = {
      success: '<i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-500"></i>',
      warning: '<i data-lucide="alert-triangle" class="w-5 h-5 text-amber-500"></i>',
      error: '<i data-lucide="alert-octagon" class="w-5 h-5 text-rose-500"></i>',
      info: '<i data-lucide="info" class="w-5 h-5 text-blue-500"></i>'
    };

    const borderColors = {
      success: "border-l-emerald-500",
      warning: "border-l-amber-500",
      error: "border-l-rose-500",
      info: "border-l-blue-500"
    };

    const toast = document.createElement("div");
    toast.id = toastId;
    toast.className = `toast-item flex items-start gap-3 bg-white p-4 rounded-xl shadow-lg border border-slate-200 border-l-4 ${borderColors[type]} transform transition-all duration-300 ease-out translate-x-full max-w-sm w-full pointer-events-auto`;
    toast.innerHTML = `
      <div class="flex-shrink-0 mt-0.5">
        ${icons[type] || icons.info}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-slate-900">${this.escapeHTML(title)}</p>
        <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">${this.escapeHTML(message)}</p>
      </div>
      <button class="toast-close text-slate-400 hover:text-slate-600 transition-colors p-1" onclick="EximusUtils.dismissToast('${toastId}')">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    // Trigger animate-in
    setTimeout(() => {
      toast.classList.remove("translate-x-full");
      toast.classList.add("translate-x-0");
    }, 10);

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        this.dismissToast(toastId);
      }, duration);
    }
  },

  dismissToast(toastId) {
    const toast = document.getElementById(toastId);
    if (!toast) return;
    toast.classList.add("translate-x-full", "opacity-0");
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  },

  // Modal helpers
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.classList.add("overflow-hidden");
    if (window.lucide) lucide.createIcons();
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.classList.remove("overflow-hidden");
  },

  // Promise-based Confirmation Dialog
  confirm(options = {}) {
    return new Promise((resolve) => {
      const {
        title = "Confirm Action",
        message = "Are you sure you want to perform this operation?",
        confirmText = "Confirm",
        cancelText = "Cancel",
        variant = "danger" // danger, primary, warning
      } = options;

      const confirmModal = document.getElementById("confirmModal");
      const titleEl = document.getElementById("confirmModalTitle");
      const msgEl = document.getElementById("confirmModalMessage");
      const confirmBtn = document.getElementById("confirmModalConfirmBtn");
      const cancelBtn = document.getElementById("confirmModalCancelBtn");

      if (!confirmModal || !titleEl || !msgEl || !confirmBtn) {
        // Fallback to window.confirm if custom modal not bound
        resolve(window.confirm(`${title}\n\n${message}`));
        return;
      }

      titleEl.textContent = title;
      msgEl.textContent = message;
      confirmBtn.textContent = confirmText;
      cancelBtn.textContent = cancelText;

      // Button styling variants
      confirmBtn.className = "px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors ";
      if (variant === "danger") {
        confirmBtn.className += "bg-rose-600 hover:bg-rose-700";
      } else if (variant === "warning") {
        confirmBtn.className += "bg-amber-600 hover:bg-amber-700";
      } else {
        confirmBtn.className += "bg-blue-600 hover:bg-blue-700";
      }

      const cleanup = () => {
        this.closeModal("confirmModal");
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
      };

      confirmBtn.onclick = () => {
        cleanup();
        resolve(true);
      };

      cancelBtn.onclick = () => {
        cleanup();
        resolve(false);
      };

      this.openModal("confirmModal");
    });
  },

  // Date & Time formatting
  formatDate(dateStr) {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit"
      });
    } catch (e) {
      return dateStr;
    }
  },

  formatDateTime(isoStr) {
    if (!isoStr) return "-";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return isoStr;
    }
  },

  formatNumber(val) {
    if (val === undefined || val === null || val === "") return "0";
    const num = Number(val);
    return isNaN(num) ? val : num.toLocaleString();
  },

  formatCurrency(amount) {
    if (amount === undefined || amount === null || amount === "") return "-";
    const num = Number(amount);
    if (isNaN(num)) return amount;
    return "LKR " + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  // Condition Badge Generator
  getConditionBadge(condition) {
    const c = (condition || "").toUpperCase().trim();
    switch (c) {
      case "NEW":
        return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>NEW</span>`;
      case "USABLE":
        return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/60"><span class="w-1.5 h-1.5 rounded-full bg-sky-500"></span>USABLE</span>`;
      case "USED":
        return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>USED</span>`;
      case "UNUSABLE":
        return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>UNUSABLE</span>`;
      default:
        return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">${c || "-"}</span>`;
    }
  },

  // Status Badge Generator
  getStatusBadge(status, quantity) {
    const s = (status || "").toUpperCase().trim();
    if (quantity !== undefined && Number(quantity) === 0) {
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800"><i data-lucide="alert-circle" class="w-3 h-3"></i>OUT OF STOCK</span>`;
    }

    switch (s) {
      case "AVAILABLE":
        return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/70"><i data-lucide="check" class="w-3 h-3 text-blue-500"></i>AVAILABLE</span>`;
      case "IN USE":
      case "ISSUED":
        return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/70"><i data-lucide="user-check" class="w-3 h-3 text-indigo-500"></i>IN USE</span>`;
      case "UNDER REPAIR":
        return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/70"><i data-lucide="wrench" class="w-3 h-3 text-amber-600"></i>UNDER REPAIR</span>`;
      case "AWAITING REPAIR":
        return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-800 border border-orange-200/70"><i data-lucide="clock" class="w-3 h-3 text-orange-600"></i>AWAITING REPAIR</span>`;
      case "RETURNED":
        return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70"><i data-lucide="check-check" class="w-3 h-3 text-emerald-600"></i>RETURNED</span>`;
      case "PENDING":
        return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/70"><i data-lucide="hourglass" class="w-3 h-3 text-amber-600"></i>PENDING RETURN</span>`;
      case "PERMANENTLY_ISSUED":
      case "PERMANENT":
        return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200/70"><i data-lucide="shield" class="w-3 h-3 text-purple-600"></i>PERMANENT ISSUE</span>`;
      default:
        return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">${s || "AVAILABLE"}</span>`;
    }
  },

  // Category Badge Generator
  getCategoryBadge(category) {
    const cat = (category || "").toUpperCase().trim();
    switch (cat) {
      case "HAND TOOLS":
        return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60"><i data-lucide="wrench" class="w-3 h-3 text-blue-500"></i>HAND TOOLS</span>`;
      case "MATERIALS":
        return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60"><i data-lucide="package" class="w-3 h-3 text-emerald-500"></i>MATERIALS</span>`;
      case "POWER EQUIPMENT":
        return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60"><i data-lucide="zap" class="w-3 h-3 text-amber-500"></i>POWER EQUIP</span>`;
      case "SWITCH GEARS":
        return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200/60"><i data-lucide="cpu" class="w-3 h-3 text-purple-500"></i>SWITCH GEARS</span>`;
      default:
        return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">${category || "-"}</span>`;
    }
  },

  // HTML escaping helper
  escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  // Generate ID
  generateId(prefix = "ITEM") {
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${Date.now().toString().slice(-4)}${rand}`;
  },

  // Debounce utility
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // CSV Export utility
  exportCSV(filename, rows, headers) {
    if (!rows || !rows.length) {
      EximusUtils.showToast("Export Notice", "No records found to export.", "warning");
      return;
    }

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      if (str.search(/("|,|\n)/g) >= 0) str = `"${str}"`;
      return str;
    };

    const headerLine = headers.map((h) => escapeCSV(h.label)).join(",");
    const dataLines = rows.map((row) => {
      return headers.map((h) => escapeCSV(row[h.key])).join(",");
    });

    const csvContent = "\uFEFF" + [headerLine, ...dataLines].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    EximusUtils.showToast("Export Successful", `Downloaded ${filename}.csv (${rows.length} rows)`, "success");
  },

  // Barcode visual generator (Code 128 style SVG mock)
  generateBarcodeSVG(code) {
    const text = String(code || "EXIMUS");
    // Generate simple dynamic pattern of bars
    let bars = "";
    let x = 10;
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const w1 = (charCode % 3) + 1.2;
      const w2 = ((charCode + 1) % 2) + 1;
      bars += `<rect x="${x}" y="5" width="${w1}" height="35" fill="#1e293b"/>`;
      x += w1 + 1.5;
      bars += `<rect x="${x}" y="5" width="${w2}" height="35" fill="#1e293b"/>`;
      x += w2 + 2;
    }

    return `
      <svg viewBox="0 0 ${Math.max(x + 10, 160)} 50" class="w-full h-10 select-none">
        <rect width="100%" height="100%" fill="#ffffff" rx="4"/>
        ${bars}
      </svg>
    `;
  }
};

window.EximusUtils = EximusUtils;


