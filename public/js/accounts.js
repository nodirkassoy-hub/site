/**
 * BalansAI - Bank Accounts & Cash Registers Module
 */

window.AccountsView = {
  accounts: [],

  async load() {
    try {
      const data = await App.api('/api/accounts');
      this.accounts = data.accounts;
      this.render();
    } catch (err) {
      App.toast('Hisoblarni yuklashda xatolik: ' + err.message, 'error');
    }
  },

  render() {
    const listEl = document.getElementById('accounts-cards-grid');
    const totalLiquidEl = document.getElementById('accounts-total-liquid');

    if (!listEl) return;

    let totalUZS = 0;
    this.accounts.forEach(a => {
      if (a.currency === 'UZS') totalUZS += Number(a.balance) || 0;
      else if (a.currency === 'USD') totalUZS += (Number(a.balance) || 0) * 12850;
      else if (a.currency === 'EUR') totalUZS += (Number(a.balance) || 0) * 13900;
    });

    if (totalLiquidEl) totalLiquidEl.innerText = App.formatUZS(totalUZS);

    const typeIcons = {
      bank: 'fa-building-columns',
      cash: 'fa-money-bill-wave',
      card: 'fa-credit-card',
      deposit: 'fa-vault'
    };

    listEl.innerHTML = this.accounts.map(acc => `
      <div class="liquid-glass p-6 rounded-3xl border border-white/10 hover:border-sky-500/40 transition-all duration-300 flex flex-col justify-between relative group">
        <div>
          <div class="flex items-center justify-between mb-4">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center bg-sky-500/15 text-sky-400 border border-sky-500/30 text-xl">
              <i class="fa-solid ${typeIcons[acc.type] || 'fa-wallet'}"></i>
            </div>
            <span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/5 text-slate-300 border border-white/10">
              ${acc.currency}
            </span>
          </div>

          <h3 class="text-base font-bold text-white mb-1">${acc.name}</h3>
          <div class="text-xs font-mono text-slate-400 mb-6">${acc.accountNumber}</div>

          <div class="text-2xl font-black text-sky-400 mb-1">
            ${App.formatMoney(acc.balance, acc.currency)}
          </div>
          <div class="text-xs text-slate-400">
            Boshlang'ich qoldiq: ${App.formatMoney(acc.initialBalance || 0, acc.currency)}
          </div>
        </div>

        <div class="pt-6 border-t border-white/5 mt-6 flex justify-between items-center">
          <span class="text-xs text-slate-400">${acc.bankName}</span>
          <button onclick="TransactionsView.openAddModal('transfer')" class="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1">
            <i class="fa-solid fa-right-left text-[10px]"></i> O'tkazma
          </button>
        </div>
      </div>
    `).join('');
  },

  openAddModal() {
    const form = document.getElementById('add-account-form');
    if (form) form.reset();
    App.openModal('modal-add-account');
  },

  async handleAddSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('acc-modal-name').value;
    const type = document.getElementById('acc-modal-type').value;
    const currency = document.getElementById('acc-modal-currency').value;
    const accountNumber = document.getElementById('acc-modal-number').value;
    const bankName = document.getElementById('acc-modal-bank').value;
    const balance = document.getElementById('acc-modal-balance').value;

    try {
      await App.api('/api/accounts', {
        method: 'POST',
        body: JSON.stringify({ name, type, currency, accountNumber, bankName, balance })
      });

      App.toast('Yangi hisob muvaffaqiyatli ochildi!', 'success');
      App.closeModal('modal-add-account');
      this.load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};
