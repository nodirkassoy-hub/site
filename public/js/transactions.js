/**
 * BalansAI - Transactions Management Module (Kirim / Chiqim / Transfer)
 */

window.TransactionsView = {
  transactions: [],
  accounts: [],
  contacts: [],

  async load() {
    try {
      const [txRes, accRes, contRes] = await Promise.all([
        App.api('/api/transactions'),
        App.api('/api/accounts'),
        App.api('/api/contacts')
      ]);

      this.transactions = txRes.transactions;
      this.accounts = accRes.accounts;
      this.contacts = contRes.contacts;

      this.populateSelects();
      this.render();
    } catch (err) {
      App.toast('Operatsiyalarni yuklashda xatolik: ' + err.message, 'error');
    }
  },

  populateSelects() {
    const accSelect = document.getElementById('tx-modal-account');
    const toAccSelect = document.getElementById('tx-modal-to-account');
    const contactSelect = document.getElementById('tx-modal-contact');
    const filterAcc = document.getElementById('tx-filter-account');

    if (accSelect) {
      accSelect.innerHTML = '<option value="">Hisobni tanlang...</option>' + 
        this.accounts.map(a => `<option value="${a.id}">${a.name} (${App.formatMoney(a.balance, a.currency)})</option>`).join('');
    }
    if (toAccSelect) {
      toAccSelect.innerHTML = '<option value="">Qabul qiluvchi hisobni tanlang...</option>' + 
        this.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    }
    if (contactSelect) {
      contactSelect.innerHTML = '<option value="">Kontragent (ixtiyoriy)...</option>' + 
        this.contacts.map(c => `<option value="${c.id}">${c.name} (${c.type === 'client' ? 'Mijoz' : 'Ta\'minotchi'})</option>`).join('');
    }
    if (filterAcc) {
      filterAcc.innerHTML = '<option value="all">Barcha hisoblar</option>' + 
        this.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    }
  },

  render() {
    const listEl = document.getElementById('transactions-table-body');
    const countEl = document.getElementById('tx-count-label');
    const totalIncomeEl = document.getElementById('tx-total-income-label');
    const totalExpenseEl = document.getElementById('tx-total-expense-label');

    if (!listEl) return;

    const typeFilter = document.getElementById('tx-filter-type')?.value || 'all';
    const accFilter = document.getElementById('tx-filter-account')?.value || 'all';
    const searchFilter = (document.getElementById('tx-search-input')?.value || '').toLowerCase();

    let filtered = this.transactions;
    if (typeFilter !== 'all') filtered = filtered.filter(t => t.type === typeFilter);
    if (accFilter !== 'all') filtered = filtered.filter(t => t.accountId === accFilter || t.toAccountId === accFilter);
    if (searchFilter) {
      filtered = filtered.filter(t => 
        (t.description && t.description.toLowerCase().includes(searchFilter)) ||
        (t.category && t.category.toLowerCase().includes(searchFilter)) ||
        (t.contactName && t.contactName.toLowerCase().includes(searchFilter)) ||
        (t.accountName && t.accountName.toLowerCase().includes(searchFilter))
      );
    }

    if (countEl) countEl.innerText = `${filtered.length} ta operatsiya`;

    let totalInc = 0, totalExp = 0;
    filtered.forEach(t => {
      if (t.type === 'income') totalInc += Number(t.amount) || 0;
      if (t.type === 'expense') totalExp += Number(t.amount) || 0;
    });

    if (totalIncomeEl) totalIncomeEl.innerText = '+' + App.formatUZS(totalInc);
    if (totalExpenseEl) totalExpenseEl.innerText = '-' + App.formatUZS(totalExp);

    if (filtered.length === 0) {
      listEl.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400">Filtr bo'yicha operatsiya topilmadi</td></tr>`;
      return;
    }

    listEl.innerHTML = filtered.map(tx => {
      const isIncome = tx.type === 'income';
      const isExpense = tx.type === 'expense';
      const isTransfer = tx.type === 'transfer';

      const typeBadge = isIncome
        ? '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"><i class="fa-solid fa-arrow-down-left mr-1"></i> Kirim</span>'
        : isExpense
        ? '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30"><i class="fa-solid fa-arrow-up-right mr-1"></i> Chiqim</span>'
        : '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30"><i class="fa-solid fa-right-left mr-1"></i> O\'tkazma</span>';

      return `
        <tr class="border-b border-white/5 hover:bg-white/[0.03] transition">
          <td class="py-3 px-4 text-xs text-slate-400">${App.formatDate(tx.date)}</td>
          <td class="py-3 px-4">${typeBadge}</td>
          <td class="py-3 px-4">
            <div class="font-semibold text-sm text-slate-200">${tx.category}</div>
            <div class="text-xs text-slate-400">${tx.description || '—'}</div>
          </td>
          <td class="py-3 px-4 text-xs text-slate-300">
            ${tx.contactName ? `<span class="inline-flex items-center gap-1"><i class="fa-solid fa-user text-sky-400 text-[10px]"></i> ${tx.contactName}</span>` : '<span class="text-slate-500">—</span>'}
          </td>
          <td class="py-3 px-4 text-xs text-slate-300 font-medium">
            <span class="inline-flex items-center gap-1.5"><i class="fa-solid fa-building-columns text-slate-400"></i> ${tx.accountName}</span>
          </td>
          <td class="py-3 px-4 text-right font-bold text-sm ${isIncome ? 'text-emerald-400' : isExpense ? 'text-rose-400' : 'text-sky-400'}">
            ${isIncome ? '+' : isExpense ? '-' : ''}${App.formatMoney(tx.amount, tx.currency)}
            ${tx.vatAmount ? `<div class="text-[10px] text-slate-400 font-normal">QQS: ${App.formatUZS(tx.vatAmount)}</div>` : ''}
          </td>
          <td class="py-3 px-4 text-right">
            <button onclick="TransactionsView.delete('${tx.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition" title="O'chirish">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal(type = 'income') {
    const typeSelect = document.getElementById('tx-modal-type');
    const form = document.getElementById('add-transaction-form');
    if (form) form.reset();
    if (typeSelect) {
      typeSelect.value = type;
      this.handleTypeChange();
    }
    const dateInput = document.getElementById('tx-modal-date');
    if (dateInput) dateInput.value = new Date().toISOString().substring(0, 10);
    App.openModal('modal-add-transaction');
  },

  handleTypeChange() {
    const type = document.getElementById('tx-modal-type')?.value;
    const toAccGroup = document.getElementById('tx-to-account-group');
    const catSelect = document.getElementById('tx-modal-category');

    if (toAccGroup) {
      if (type === 'transfer') {
        toAccGroup.classList.remove('hidden');
      } else {
        toAccGroup.classList.add('hidden');
      }
    }

    if (catSelect) {
      if (type === 'income') {
        catSelect.innerHTML = `
          <option value="Xizmat ko'rsatish tushumi">Xizmat ko'rsatish tushumi</option>
          <option value="Mahsulot sotuvidan tushum">Mahsulot sotuvidan tushum</option>
          <option value="Avans to'lovi">Avans to'lovi</option>
          <option value="Kassa tushumi (Chakana)">Kassa tushumi (Chakana)</option>
          <option value="Investitsiya yoki Qarz">Investitsiya yoki Qarz</option>
          <option value="Boshqa daromad">Boshqa daromad</option>
        `;
      } else if (type === 'expense') {
        catSelect.innerHTML = `
          <option value="Ish haqi va Mukofotlar">Ish haqi va Mukofotlar</option>
          <option value="Ofis ijarasi va Kommunal">Ofis ijarasi va Kommunal</option>
          <option value="Serverlar va IT Infratuzilma">Serverlar va IT Infratuzilma</option>
          <option value="Marketing va Reklama">Marketing va Reklama</option>
          <option value="Soliq to'lovlari (QQS va JShODS)">Soliq to'lovlari (QQS va JShODS)</option>
          <option value="Xom-ashyo va Tovar xaridi">Xom-ashyo va Tovar xaridi</option>
          <option value="Transport va Logistika">Transport va Logistika</option>
          <option value="Boshqa xarajatlar">Boshqa xarajatlar</option>
        `;
      } else {
        catSelect.innerHTML = `<option value="Ichki pul o'tkazmasi">Ichki pul o'tkazmasi</option>`;
      }
    }
  },

  async handleAddSubmit(e) {
    e.preventDefault();
    const type = document.getElementById('tx-modal-type').value;
    const amount = document.getElementById('tx-modal-amount').value;
    const currency = document.getElementById('tx-modal-currency').value;
    const accountId = document.getElementById('tx-modal-account').value;
    const toAccountId = document.getElementById('tx-modal-to-account').value;
    const category = document.getElementById('tx-modal-category').value;
    const contactId = document.getElementById('tx-modal-contact').value;
    const date = document.getElementById('tx-modal-date').value;
    const description = document.getElementById('tx-modal-description').value;
    const taxIncluded = document.getElementById('tx-modal-vat').checked;

    let vatAmount = 0;
    if (taxIncluded && currency === 'UZS') {
      vatAmount = (Number(amount) * 12) / 112;
    }

    try {
      await App.api('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type,
          amount,
          currency,
          accountId,
          toAccountId,
          category,
          contactId,
          date,
          description,
          taxIncluded,
          vatAmount
        })
      });

      App.toast('Operatsiya muvaffaqiyatli saqlandi!', 'success');
      App.closeModal('modal-add-transaction');
      this.load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async delete(id) {
    if (!confirm('Ushbu operatsiyani o\'chirishni tasdiqlaysizmi? Hisob balansi avtomatik tiklanadi.')) return;

    try {
      await App.api(`/api/transactions/${id}`, { method: 'DELETE' });
      App.toast('Operatsiya o\'chirildi', 'info');
      this.load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  exportCSV() {
    window.location.href = '/api/transactions/export/csv';
  }
};
