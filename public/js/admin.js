/**
 * BalansAI - SuperAdmin Management Panel
 */

window.AdminView = {
  metrics: null,
  companies: [],
  logs: [],
  settings: null,

  async load() {
    try {
      const [metricsRes, compRes, logsRes, setRes] = await Promise.all([
        App.api('/api/admin/metrics'),
        App.api('/api/admin/companies'),
        App.api('/api/admin/logs'),
        App.api('/api/admin/settings')
      ]);

      this.metrics = metricsRes;
      this.companies = compRes.companies;
      this.logs = logsRes.logs;
      this.settings = setRes.settings;

      this.renderMetrics();
      this.renderCompanies();
      this.renderLogs();
      this.renderSettings();
    } catch (err) {
      App.toast('Admin ma\'lumotlarini yuklashda xatolik: ' + err.message, 'error');
    }
  },

  renderMetrics() {
    if (!this.metrics) return;
    const { totalCompanies, activeSubscriptionsCount, totalTransactionVolumeUZS, mrrUZS } = this.metrics;

    const compEl = document.getElementById('admin-stat-companies');
    const subEl = document.getElementById('admin-stat-subs');
    const volEl = document.getElementById('admin-stat-volume');
    const mrrEl = document.getElementById('admin-stat-mrr');

    if (compEl) compEl.innerText = totalCompanies;
    if (subEl) subEl.innerText = activeSubscriptionsCount;
    if (volEl) volEl.innerText = App.formatUZS(totalTransactionVolumeUZS);
    if (mrrEl) mrrEl.innerText = App.formatUZS(mrrUZS);
  },

  renderCompanies() {
    const listEl = document.getElementById('admin-companies-table-body');
    if (!listEl) return;

    listEl.innerHTML = this.companies.map(c => `
      <tr class="border-b border-white/5 hover:bg-white/[0.03] transition">
        <td class="py-3.5 px-4 font-bold text-sm text-white">
          ${c.name}
          <div class="text-xs text-slate-400 font-normal">STIR: ${c.tin} • ${c.businessType || 'Xizmat'}</div>
        </td>
        <td class="py-3.5 px-4 text-xs text-slate-300">
          <div>${c.director || '—'}</div>
          <div class="text-slate-400">${c.phone || c.email}</div>
        </td>
        <td class="py-3.5 px-4 text-xs">
          <span class="px-2.5 py-1 rounded-full font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            ${c.currentPlan}
          </span>
        </td>
        <td class="py-3.5 px-4 text-xs text-slate-400">
          ${c.planExpiresAt ? App.formatDate(c.planExpiresAt) : 'Muddatsiz'}
        </td>
        <td class="py-3.5 px-4 text-right">
          <button onclick="AdminView.openChangePlanModal('${c.id}')" class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-sky-500/20 text-sky-300 transition">
            Tarifni o'zgartirish
          </button>
        </td>
      </tr>
    `).join('');
  },

  renderLogs() {
    const listEl = document.getElementById('admin-logs-list');
    if (!listEl) return;

    listEl.innerHTML = this.logs.slice(0, 15).map(log => `
      <div class="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs flex items-center justify-between">
        <div>
          <span class="font-bold text-sky-400 mr-2">[${log.action}]</span>
          <span class="text-slate-200">${log.details}</span>
        </div>
        <div class="text-slate-500 text-[11px] whitespace-nowrap ml-4">
          ${new Date(log.timestamp).toLocaleTimeString('uz-UZ')} • ${log.userName || 'Admin'}
        </div>
      </div>
    `).join('');
  },

  renderSettings() {
    if (!this.settings) return;
    const vatInput = document.getElementById('admin-setting-vat');
    const turnoverInput = document.getElementById('admin-setting-turnover');
    const usdInput = document.getElementById('admin-setting-usd');

    if (vatInput) vatInput.value = this.settings.vatRate || 12;
    if (turnoverInput) turnoverInput.value = this.settings.turnoverTaxRate || 4;
    if (usdInput && this.settings.exchangeRates) usdInput.value = this.settings.exchangeRates.USD || 12850;
  },

  openChangePlanModal(companyId) {
    const comp = this.companies.find(c => c.id === companyId);
    if (!comp) return;

    const modalCompId = document.getElementById('admin-plan-comp-id');
    const modalCompName = document.getElementById('admin-plan-comp-name');

    if (modalCompId) modalCompId.value = comp.id;
    if (modalCompName) modalCompName.innerText = comp.name;

    App.openModal('modal-admin-change-plan');
  },

  async handleChangePlanSubmit(e) {
    e.preventDefault();
    const companyId = document.getElementById('admin-plan-comp-id').value;
    const planId = document.getElementById('admin-plan-select').value;
    const days = Number(document.getElementById('admin-plan-days').value) || 30;

    try {
      await App.api(`/api/admin/companies/${companyId}/plan`, {
        method: 'PUT',
        body: JSON.stringify({ planId, days })
      });

      App.toast('Kompaniya tarifi muvaffaqiyatli yangilandi!', 'success');
      App.closeModal('modal-admin-change-plan');
      this.load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async handleSaveSettings(e) {
    e.preventDefault();
    const vatRate = Number(document.getElementById('admin-setting-vat').value);
    const turnoverTaxRate = Number(document.getElementById('admin-setting-turnover').value);
    const usdRate = Number(document.getElementById('admin-setting-usd').value);

    try {
      await App.api('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          vatRate,
          turnoverTaxRate,
          exchangeRates: { USD: usdRate, EUR: 13900, RUB: 142 }
        })
      });

      App.toast('Tizim sozlamalari yangilandi!', 'success');
      this.load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  exportDatabaseJSON() {
    window.location.href = '/api/admin/backup/export';
  }
};
