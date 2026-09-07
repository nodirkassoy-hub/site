/**
 * BalansAI - Core Application State & Orchestrator
 */

const App = {
  state: {
    user: null,
    company: null,
    subscription: null,
    plan: null,
    currentTab: 'dashboard',
    theme: localStorage.getItem('balansai_theme') || 'dark',
    currencyRates: { USD: 12850, EUR: 13900, RUB: 142 },
    sidebarOpen: true
  },

  // API helper
  async api(endpoint, options = {}) {
    const token = localStorage.getItem('balansai_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const res = await fetch(endpoint, { credentials: 'omit', ...options, headers });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401 && !endpoint.includes('/api/auth/login') && !endpoint.includes('/api/auth/register') && !endpoint.includes('/api/auth/demo-login')) {
        this.logout();
        throw new Error('Sessiya muddati tugadi. Iltimos, qayta kiring.');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Serverda xatolik yuz berdi');
      }

      return data;
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  },

  // Toast Notification
  toast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const icons = {
      success: '<i class="fa-solid fa-circle-check text-emerald-400 text-lg"></i>',
      error: '<i class="fa-solid fa-circle-xmark text-rose-400 text-lg"></i>',
      warning: '<i class="fa-solid fa-triangle-exclamation text-amber-400 text-lg"></i>',
      info: '<i class="fa-solid fa-circle-info text-cyan-400 text-lg"></i>'
    };

    toast.className = `liquid-glass p-4 rounded-xl flex items-center gap-3 shadow-2xl border border-white/20 transform transition-all duration-300 translate-y-2 opacity-0 text-sm font-medium z-50 min-w-[280px] max-w-md ${
      type === 'error' ? 'liquid-glass-glow border-rose-500/40' : type === 'success' ? 'liquid-glass-emerald' : 'liquid-glass-glow'
    }`;
    toast.innerHTML = `
      <div>${icons[type] || icons.info}</div>
      <div class="flex-1 text-slate-100">${message}</div>
      <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('translate-y-2', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  // Format currency
  formatUZS(amount) {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(num) + ' so\'m';
  },

  formatUSD(amount) {
    const num = Number(amount) || 0;
    return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  },

  formatMoney(amount, currency = 'UZS') {
    if (currency === 'USD') return this.formatUSD(amount);
    return this.formatUZS(amount);
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  },

  // Theme Toggler
  initTheme() {
    document.documentElement.setAttribute('data-theme', this.state.theme);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.innerHTML = this.state.theme === 'dark' 
        ? '<i class="fa-solid fa-sun text-amber-400 text-lg"></i>' 
        : '<i class="fa-solid fa-moon text-slate-700 text-lg"></i>';
    }
  },

  toggleTheme() {
    this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('balansai_theme', this.state.theme);
    this.initTheme();
    // Re-render chart with correct theme colors if needed
    if (this.state.currentTab === 'dashboard' && window.DashboardView) {
      window.DashboardView.loadStats();
    }
  },

  // Initialize Application
  async init() {
    this.initTheme();
    const token = localStorage.getItem('balansai_token');

    if (token) {
      try {
        const data = await this.api('/api/auth/me');
        this.state.user = data.user;
        this.state.company = data.company;
        this.state.subscription = data.subscription;
        this.state.plan = data.plan;
        this.renderApp();
      } catch (err) {
        console.warn('Session expired, showing landing page');
        this.renderLanding();
      }
    } else {
      this.renderLanding();
    }

    this.setupGlobalEventListeners();
  },

  setupGlobalEventListeners() {
    // Escape key closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  },

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => modal.classList.add('hidden'));
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  // Render Authenticated Shell
  renderApp() {
    document.getElementById('landing-view').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');

    this.updateUserBadge();
    this.navigateTo(this.state.currentTab);
  },

  // Render Landing & Auth View
  renderLanding() {
    document.getElementById('landing-view').classList.remove('hidden');
    document.getElementById('app-shell').classList.add('hidden');
    if (window.LandingView) {
      window.LandingView.init();
    }
  },

  updateUserBadge() {
    if (!this.state.user) return;
    const userNameEl = document.getElementById('user-display-name');
    const userRoleEl = document.getElementById('user-display-role');
    const userAvatarEl = document.getElementById('user-avatar-img');
    const companyNameEl = document.getElementById('company-display-name');
    const planBadgeEl = document.getElementById('current-plan-badge');
    const adminNavEl = document.getElementById('nav-item-admin');

    if (userNameEl) userNameEl.innerText = this.state.user.name;
    if (userRoleEl) {
      const roleNames = {
        superadmin: 'Superadmin',
        owner: 'Kompaniya Rahbari',
        accountant: 'Bosh Buxgalter',
        manager: 'Menejer'
      };
      userRoleEl.innerText = roleNames[this.state.user.role] || this.state.user.role;
    }
    if (userAvatarEl && this.state.user.avatar) {
      userAvatarEl.src = this.state.user.avatar;
    }
    if (companyNameEl && this.state.company) {
      companyNameEl.innerText = this.state.company.name;
    }
    if (planBadgeEl) {
      const planName = this.state.subscription ? this.state.subscription.planName : 'Pro Rejim';
      planBadgeEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> ${planName}</span>`;
    }

    // Toggle Admin navigation item visibility
    if (adminNavEl) {
      if (this.state.user.role === 'superadmin') {
        adminNavEl.classList.remove('hidden');
      } else {
        adminNavEl.classList.add('hidden');
      }
    }
  },

  // Navigate between tabs
  navigateTo(tab) {
    this.state.currentTab = tab;

    // Update active state in sidebar
    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.dataset.tab === tab) {
        el.classList.add('bg-sky-500/15', 'text-sky-400', 'border-l-4', 'border-sky-500', 'font-semibold');
        el.classList.remove('text-slate-400', 'hover:text-slate-200');
      } else {
        el.classList.remove('bg-sky-500/15', 'text-sky-400', 'border-l-4', 'border-sky-500', 'font-semibold');
        el.classList.add('text-slate-400', 'hover:text-slate-200');
      }
    });

    // Hide all view panels
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.add('hidden'));

    // Show target view panel
    const target = document.getElementById(`view-${tab}`);
    if (target) {
      target.classList.remove('hidden');
    }

    // Trigger module loaders
    switch (tab) {
      case 'dashboard':
        if (window.DashboardView) window.DashboardView.loadStats();
        break;
      case 'transactions':
        if (window.TransactionsView) window.TransactionsView.load();
        break;
      case 'invoices':
        if (window.InvoicesView) window.InvoicesView.load();
        break;
      case 'contacts':
        if (window.ContactsView) window.ContactsView.load();
        break;
      case 'accounts':
        if (window.AccountsView) window.AccountsView.load();
        break;
      case 'products':
        if (window.ProductsView) window.ProductsView.load();
        break;
      case 'ai-cfo':
        if (window.AiCfoView) window.AiCfoView.load();
        break;
      case 'reports':
        if (window.ReportsView) window.ReportsView.load();
        break;
      case 'subscription':
        if (window.SubscriptionView) window.SubscriptionView.load();
        break;
      case 'settings':
        if (window.SettingsView) window.SettingsView.load();
        break;
      case 'admin':
        if (window.AdminView) window.AdminView.load();
        break;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // Logout
  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem('balansai_token');
    this.state.user = null;
    this.state.company = null;
    this.state.subscription = null;
    this.renderLanding();
    this.toast('Tizimdan muvaffaqiyatli chiqildi.', 'info');
  }
};

window.App = App;

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
