/**
 * BalansAI - Contacts & CRM (Clients & Vendors / Kontragentlar & Sverka Akti)
 */

window.ContactsView = {
  contacts: [],

  async load() {
    try {
      const data = await App.api('/api/contacts');
      this.contacts = data.contacts;
      this.render();
    } catch (err) {
      App.toast('Kontragentlarni yuklashda xatolik: ' + err.message, 'error');
    }
  },

  render() {
    const listEl = document.getElementById('contacts-table-body');
    const filterType = document.getElementById('contacts-filter-type')?.value || 'all';
    const searchFilter = (document.getElementById('contacts-search-input')?.value || '').toLowerCase();

    if (!listEl) return;

    let filtered = this.contacts;
    if (filterType !== 'all') filtered = filtered.filter(c => c.type === filterType);
    if (searchFilter) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchFilter) ||
        (c.tin && c.tin.includes(searchFilter)) ||
        (c.phone && c.phone.includes(searchFilter))
      );
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-slate-400">Kontragentlar topilmadi</td></tr>`;
      return;
    }

    listEl.innerHTML = filtered.map(c => {
      const isClient = c.type === 'client';
      const typeBadge = isClient
        ? '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">Mijoz (Xaridor)</span>'
        : '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">Yetkazib beruvchi</span>';

      const balance = Number(c.currentBalance) || 0;
      let balanceLabel = '';
      if (balance > 0) {
        balanceLabel = `<span class="text-xs font-bold text-emerald-400">+${App.formatUZS(balance)} <span class="font-normal text-slate-400">(Bizga qarz)</span></span>`;
      } else if (balance < 0) {
        balanceLabel = `<span class="text-xs font-bold text-rose-400">${App.formatUZS(balance)} <span class="font-normal text-slate-400">(Bizning qarzimiz)</span></span>`;
      } else {
        balanceLabel = '<span class="text-xs font-medium text-slate-400">0 so\'m (Hisob yopiq)</span>';
      }

      return `
        <tr class="border-b border-white/5 hover:bg-white/[0.03] transition">
          <td class="py-3.5 px-4">
            <div class="font-bold text-sm text-slate-200">${c.name}</div>
            <div class="text-xs text-slate-400">${c.address || 'Manzil ko\'rsatilmagan'}</div>
          </td>
          <td class="py-3.5 px-4">${typeBadge}</td>
          <td class="py-3.5 px-4 text-xs font-mono text-slate-300">
            <div>STIR: <b>${c.tin || '—'}</b></div>
            <div class="text-slate-400">${c.bankName || '—'}</div>
          </td>
          <td class="py-3.5 px-4 text-xs text-slate-300">
            <div>${c.phone || '—'}</div>
            <div class="text-slate-400">${c.email || '—'}</div>
          </td>
          <td class="py-3.5 px-4">${balanceLabel}</td>
          <td class="py-3.5 px-4 text-right space-x-1">
            <button onclick="ContactsView.openStatementModal('${c.id}')" class="px-2.5 py-1 rounded-lg text-xs font-semibold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 transition" title="Sverka Akti">
              <i class="fa-solid fa-file-lines mr-1"></i> Sverka
            </button>
            <button onclick="ContactsView.delete('${c.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition" title="O'chirish">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal(type = 'client') {
    const form = document.getElementById('add-contact-form');
    if (form) form.reset();
    const typeSelect = document.getElementById('contact-modal-type');
    if (typeSelect) typeSelect.value = type;
    App.openModal('modal-add-contact');
  },

  async handleAddSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('contact-modal-name').value;
    const type = document.getElementById('contact-modal-type').value;
    const tin = document.getElementById('contact-modal-tin').value;
    const phone = document.getElementById('contact-modal-phone').value;
    const email = document.getElementById('contact-modal-email').value;
    const address = document.getElementById('contact-modal-address').value;
    const bankName = document.getElementById('contact-modal-bank').value;
    const bankAccount = document.getElementById('contact-modal-account').value;
    const mfo = document.getElementById('contact-modal-mfo').value;

    try {
      await App.api('/api/contacts', {
        method: 'POST',
        body: JSON.stringify({ name, type, tin, phone, email, address, bankName, bankAccount, mfo })
      });

      App.toast('Kontragent muvaffaqiyatli qo\'shildi!', 'success');
      App.closeModal('modal-add-contact');
      this.load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async openStatementModal(contactId) {
    try {
      const data = await App.api(`/api/contacts/${contactId}/statement`);
      const { contact, company, transactions, invoices } = data;

      const modalContent = document.getElementById('statement-modal-content');
      if (!modalContent) return;

      modalContent.innerHTML = `
        <div class="p-6 bg-white text-slate-900 rounded-2xl shadow-xl font-sans text-xs">
          <div class="text-center pb-4 border-b border-slate-300 mb-4">
            <h3 class="text-base font-extrabold uppercase">O'zaro Hisob-Kitoblar Solishtirma Dalolatnomasi (Sverka Akti)</h3>
            <p class="text-slate-600 mt-1"><b>${company.name}</b> va <b>${contact.name}</b> o'rtasida</p>
            <p class="text-[11px] text-slate-400">Holat sanasi: ${new Date().toLocaleDateString('uz-UZ')}</p>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div class="font-bold text-slate-700">1-tomon: ${company.name}</div>
              <div>STIR: ${company.tin}</div>
              <div>Hisob: ${company.bankAccount || '20208000700543219001'}</div>
            </div>
            <div>
              <div class="font-bold text-slate-700">2-tomon: ${contact.name}</div>
              <div>STIR: ${contact.tin || '—'}</div>
              <div>Hisob: ${contact.bankAccount || '—'}</div>
            </div>
          </div>

          <table class="w-full text-left mb-4 border-collapse">
            <thead>
              <tr class="bg-slate-100 text-slate-700 border-b border-slate-300 font-bold">
                <th class="p-2">Sana</th>
                <th class="p-2">Hujjat / Izoh</th>
                <th class="p-2 text-right">Yozilgan (Debet)</th>
                <th class="p-2 text-right">To'langan (Kredit)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${invoices.map(inv => `
                <tr>
                  <td class="p-2 text-slate-500">${inv.date}</td>
                  <td class="p-2 font-medium">Hisob-faktura ${inv.invoiceNumber}</td>
                  <td class="p-2 text-right font-bold text-slate-900">${App.formatUZS(inv.grandTotal)}</td>
                  <td class="p-2 text-right text-slate-400">—</td>
                </tr>
              `).join('')}
              ${transactions.map(tx => `
                <tr>
                  <td class="p-2 text-slate-500">${tx.date}</td>
                  <td class="p-2 font-medium">To'lov: ${tx.reference || tx.description}</td>
                  <td class="p-2 text-right text-slate-400">—</td>
                  <td class="p-2 text-right font-bold text-emerald-600">${App.formatMoney(tx.amount, tx.currency)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="p-3 bg-sky-50 rounded-xl border border-sky-200 flex justify-between items-center mb-6">
            <span class="font-bold text-sky-900">Yakuniy O'zaro Qoldiq:</span>
            <span class="font-black text-sm ${contact.currentBalance >= 0 ? 'text-sky-700' : 'text-rose-700'}">
              ${contact.currentBalance >= 0 ? `${contact.name} ning qarzi: ` : 'Bizning qarzimiz: '}
              ${App.formatUZS(Math.abs(contact.currentBalance || 0))}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-8 pt-4 border-t border-slate-300">
            <div>
              <div class="font-bold mb-6">${company.name} Rahbari:</div>
              <div class="border-b border-slate-400 w-32"></div>
            </div>
            <div>
              <div class="font-bold mb-6">${contact.name} Rahbari:</div>
              <div class="border-b border-slate-400 w-32"></div>
            </div>
          </div>
        </div>
      `;

      App.openModal('modal-statement');
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async delete(id) {
    if (!confirm('Kontragentni o\'chirmoqchimisiz?')) return;
    try {
      await App.api(`/api/contacts/${id}`, { method: 'DELETE' });
      App.toast('Kontragent o\'chirildi', 'info');
      this.load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};
