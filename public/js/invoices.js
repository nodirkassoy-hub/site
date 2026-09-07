/**
 * BalansAI - Invoicing & E-Faktura Module
 */

window.InvoicesView = {
  invoices: [],
  contacts: [],
  products: [],
  accounts: [],
  currentViewingInvoice: null,

  async load() {
    try {
      const [invRes, contRes, prodRes, accRes] = await Promise.all([
        App.api('/api/invoices'),
        App.api('/api/contacts'),
        App.api('/api/products'),
        App.api('/api/accounts')
      ]);

      this.invoices = invRes.invoices;
      this.contacts = contRes.contacts.filter(c => c.type === 'client');
      this.products = prodRes.products;
      this.accounts = accRes.accounts;

      this.render();
    } catch (err) {
      App.toast('Hisob-fakturalarni yuklashda xatolik: ' + err.message, 'error');
    }
  },

  render() {
    const listEl = document.getElementById('invoices-table-body');
    const filterStatus = document.getElementById('invoice-filter-status')?.value || 'all';
    const searchFilter = (document.getElementById('invoice-search-input')?.value || '').toLowerCase();

    if (!listEl) return;

    let filtered = this.invoices;
    if (filterStatus !== 'all') filtered = filtered.filter(i => i.status === filterStatus);
    if (searchFilter) {
      filtered = filtered.filter(i => 
        i.invoiceNumber.toLowerCase().includes(searchFilter) ||
        i.contactName.toLowerCase().includes(searchFilter)
      );
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400">Hisob-fakturalar topilmadi</td></tr>`;
      return;
    }

    listEl.innerHTML = filtered.map(inv => {
      const statusMap = {
        paid: '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"><i class="fa-solid fa-check-circle mr-1"></i> To\'langan</span>',
        partial: '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"><i class="fa-solid fa-clock mr-1"></i> Qisman to\'langan</span>',
        unpaid: '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30"><i class="fa-solid fa-hourglass-start mr-1"></i> Kutilmoqda</span>',
        sent: '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30"><i class="fa-solid fa-paper-plane mr-1"></i> Yuborilgan</span>',
        overdue: '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30"><i class="fa-solid fa-circle-exclamation mr-1"></i> Muddati o\'tgan</span>'
      };

      const isPaid = inv.status === 'paid';

      return `
        <tr class="border-b border-white/5 hover:bg-white/[0.03] transition">
          <td class="py-3.5 px-4 font-bold text-sm text-sky-400 cursor-pointer" onclick="InvoicesView.viewDetails('${inv.id}')">
            ${inv.invoiceNumber}
            <div class="text-[11px] text-slate-400 font-normal">Shartnoma: ${inv.contractNumber || '—'}</div>
          </td>
          <td class="py-3.5 px-4">
            <div class="font-semibold text-sm text-slate-200">${inv.contactName}</div>
            <div class="text-xs text-slate-400">STIR: ${inv.contactTin || '—'}</div>
          </td>
          <td class="py-3.5 px-4 text-xs text-slate-300">${App.formatDate(inv.date)}</td>
          <td class="py-3.5 px-4 text-xs text-slate-400">${App.formatDate(inv.dueDate)}</td>
          <td class="py-3.5 px-4">${statusMap[inv.status] || inv.status}</td>
          <td class="py-3.5 px-4 text-right">
            <div class="font-bold text-sm text-slate-100">${App.formatMoney(inv.grandTotal, inv.currency)}</div>
            ${!isPaid && inv.dueAmount ? `<div class="text-xs text-amber-400">Qarz: ${App.formatMoney(inv.dueAmount, inv.currency)}</div>` : ''}
          </td>
          <td class="py-3.5 px-4 text-right space-x-1">
            <button onclick="InvoicesView.viewDetails('${inv.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition" title="Ko'rish va Chop etish">
              <i class="fa-solid fa-eye text-xs"></i>
            </button>
            ${!isPaid ? `
              <button onclick="InvoicesView.openPayModal('${inv.id}')" class="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/15 transition" title="To'lov qabul qilish">
                <i class="fa-solid fa-hand-holding-dollar text-xs"></i>
              </button>
            ` : ''}
            <button onclick="InvoicesView.delete('${inv.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition" title="O'chirish">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openCreateModal() {
    const contactSelect = document.getElementById('inv-modal-contact');
    if (contactSelect) {
      contactSelect.innerHTML = '<option value="">Mijozni tanlang...</option>' +
        this.contacts.map(c => `<option value="${c.id}">${c.name} (STIR: ${c.tin || '—'})</option>`).join('');
    }

    const numberInput = document.getElementById('inv-modal-number');
    if (numberInput) {
      numberInput.value = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const contractInput = document.getElementById('inv-modal-contract');
    if (contractInput) {
      contractInput.value = `SH-${Math.floor(10 + Math.random() * 90)}/${new Date().getFullYear().toString().slice(-2)}`;
    }

    const dateInput = document.getElementById('inv-modal-date');
    if (dateInput) dateInput.value = new Date().toISOString().substring(0, 10);

    const dueInput = document.getElementById('inv-modal-due-date');
    if (dueInput) dueInput.value = new Date(Date.now() + 14 * 86400000).toISOString().substring(0, 10);

    // Reset items container
    const itemsContainer = document.getElementById('invoice-items-rows');
    if (itemsContainer) {
      itemsContainer.innerHTML = '';
      this.addItemRow(); // add first row
    }

    this.recalculateInvoiceTotals();
    App.openModal('modal-create-invoice');
  },

  addItemRow(productId = '', name = '', qty = 1, unit = 'dona', price = 0) {
    const container = document.getElementById('invoice-items-rows');
    if (!container) return;

    const rowId = 'item_row_' + Date.now() + '_' + Math.floor(Math.random() * 100);
    const row = document.createElement('div');
    row.id = rowId;
    row.className = 'grid grid-cols-12 gap-2 items-center p-2 rounded-xl bg-white/[0.02] border border-white/5';

    row.innerHTML = `
      <div class="col-span-4">
        <input type="text" placeholder="Mahsulot / Xizmat nomi" value="${name}" class="fintech-input text-xs py-2 item-name" required />
      </div>
      <div class="col-span-2">
        <input type="number" step="0.01" min="0.1" value="${qty}" class="fintech-input text-xs py-2 item-qty" oninput="InvoicesView.recalculateInvoiceTotals()" required />
      </div>
      <div class="col-span-2">
        <select class="fintech-input text-xs py-2 item-unit">
          <option value="dona" ${unit === 'dona' ? 'selected' : ''}>dona</option>
          <option value="xizmat" ${unit === 'xizmat' ? 'selected' : ''}>xizmat</option>
          <option value="oy" ${unit === 'oy' ? 'selected' : ''}>oy</option>
          <option value="loyiha" ${unit === 'loyiha' ? 'selected' : ''}>loyiha</option>
          <option value="kg" ${unit === 'kg' ? 'selected' : ''}>kg</option>
        </select>
      </div>
      <div class="col-span-3">
        <input type="number" step="1000" min="0" value="${price}" placeholder="Narxi (so'm)" class="fintech-input text-xs py-2 item-price" oninput="InvoicesView.recalculateInvoiceTotals()" required />
      </div>
      <div class="col-span-1 text-center">
        <button type="button" onclick="document.getElementById('${rowId}').remove(); InvoicesView.recalculateInvoiceTotals();" class="text-slate-400 hover:text-rose-400 p-1">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
      </div>
    `;

    container.appendChild(row);
    this.recalculateInvoiceTotals();
  },

  recalculateInvoiceTotals() {
    const rows = document.querySelectorAll('#invoice-items-rows > div');
    let subtotal = 0;

    rows.forEach(r => {
      const qty = Number(r.querySelector('.item-qty')?.value) || 0;
      const price = Number(r.querySelector('.item-price')?.value) || 0;
      subtotal += qty * price;
    });

    const vat = subtotal * 0.12; // 12% QQS O'zbekiston
    const grand = subtotal + vat;

    const subEl = document.getElementById('inv-calc-subtotal');
    const vatEl = document.getElementById('inv-calc-vat');
    const grandEl = document.getElementById('inv-calc-grand');

    if (subEl) subEl.innerText = App.formatUZS(subtotal);
    if (vatEl) vatEl.innerText = App.formatUZS(vat);
    if (grandEl) grandEl.innerText = App.formatUZS(grand);
  },

  async handleCreateSubmit(e) {
    e.preventDefault();
    const contactId = document.getElementById('inv-modal-contact').value;
    const invoiceNumber = document.getElementById('inv-modal-number').value;
    const contractNumber = document.getElementById('inv-modal-contract').value;
    const date = document.getElementById('inv-modal-date').value;
    const dueDate = document.getElementById('inv-modal-due-date').value;
    const notes = document.getElementById('inv-modal-notes')?.value || '';

    const rows = document.querySelectorAll('#invoice-items-rows > div');
    const items = [];

    rows.forEach(r => {
      const name = r.querySelector('.item-name')?.value;
      const quantity = Number(r.querySelector('.item-qty')?.value) || 1;
      const unit = r.querySelector('.item-unit')?.value || 'dona';
      const unitPrice = Number(r.querySelector('.item-price')?.value) || 0;

      if (name && unitPrice > 0) {
        items.push({ name, quantity, unit, unitPrice, vatPercent: 12 });
      }
    });

    if (items.length === 0) {
      App.toast('Iltimos, kamida bitta tovar yoki xizmat qatorini to\'liq kiriting!', 'warning');
      return;
    }

    try {
      await App.api('/api/invoices', {
        method: 'POST',
        body: JSON.stringify({
          contactId,
          invoiceNumber,
          contractNumber,
          date,
          dueDate,
          items,
          notes
        })
      });

      App.toast('Hisob-faktura muvaffaqiyatli yaratildi!', 'success');
      App.closeModal('modal-create-invoice');
      this.load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async viewDetails(invoiceId) {
    try {
      const data = await App.api(`/api/invoices/${invoiceId}`);
      this.currentViewingInvoice = data;

      const { invoice, company, contact } = data;
      const previewEl = document.getElementById('invoice-printable-content');
      if (!previewEl) return;

      previewEl.innerHTML = `
        <div class="p-8 bg-white text-slate-900 rounded-2xl shadow-2xl font-sans relative">
          <!-- Header -->
          <div class="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
            <div>
              <div class="text-2xl font-black text-sky-600 tracking-tight mb-1">${company.name}</div>
              <div class="text-xs text-slate-500">STIR (INN): <span class="font-bold text-slate-800">${company.tin}</span> | QQS ID: ${company.vatNumber || '—'}</div>
              <div class="text-xs text-slate-500">${company.address || 'Toshkent shahar'}</div>
              <div class="text-xs text-slate-500">Bank: <span class="font-medium">${company.bankName || 'Kapitalbank ATB'}</span>, H/R: <span class="font-mono font-medium">${company.bankAccount || '20208000700543219001'}</span>, MFO: ${company.mfo || '01036'}</div>
            </div>
            <div class="text-right">
              <div class="text-xl font-extrabold text-slate-900">HISOB-FAKTURA</div>
              <div class="text-sm font-bold text-sky-600">${invoice.invoiceNumber}</div>
              <div class="text-xs text-slate-500 mt-1">Sana: <b>${invoice.date}</b></div>
              <div class="text-xs text-slate-500">To'lov muddati: <b>${invoice.dueDate}</b></div>
              <div class="text-xs text-slate-500">Shartnoma: <b>${invoice.contractNumber || '—'}</b></div>
            </div>
          </div>

          <!-- Customer info -->
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6 flex justify-between">
            <div>
              <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Buyurtmachi (Mijoz):</div>
              <div class="font-bold text-base text-slate-900">${contact ? contact.name : invoice.contactName}</div>
              <div class="text-xs text-slate-600 mt-1">STIR: <b>${contact?.tin || invoice.contactTin || '—'}</b> | Tel: ${contact?.phone || '—'}</div>
              <div class="text-xs text-slate-600">${contact?.address || ''}</div>
            </div>
            <div class="text-right flex flex-col justify-center items-end">
              ${invoice.status === 'paid' ? '<div class="invoice-stamp"><i class="fa-solid fa-check"></i> TO\'LANGAN</div>' : '<div class="px-4 py-1.5 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs uppercase border border-amber-300">To\'lov Kutilmoqda</div>'}
            </div>
          </div>

          <!-- Items Table -->
          <table class="w-full text-left text-xs mb-6 border-collapse">
            <thead>
              <tr class="bg-slate-100 text-slate-700 border-b border-slate-300">
                <th class="p-3">№</th>
                <th class="p-3">Tovar va Xizmatlar Nomi</th>
                <th class="p-3 text-center">Birlik</th>
                <th class="p-3 text-right">Miqdor</th>
                <th class="p-3 text-right">Narxi (UZS)</th>
                <th class="p-3 text-right">QQS (12%)</th>
                <th class="p-3 text-right">Jami Summa</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${invoice.items.map((it, idx) => `
                <tr>
                  <td class="p-3 text-slate-400">${idx + 1}</td>
                  <td class="p-3 font-semibold text-slate-800">${it.name}</td>
                  <td class="p-3 text-center text-slate-600">${it.unit}</td>
                  <td class="p-3 text-right font-medium text-slate-800">${it.quantity}</td>
                  <td class="p-3 text-right text-slate-700">${App.formatUZS(it.unitPrice)}</td>
                  <td class="p-3 text-right text-slate-700">${App.formatUZS(it.vatAmount || (it.total * 12 / 112))}</td>
                  <td class="p-3 text-right font-bold text-slate-900">${App.formatUZS(it.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Totals -->
          <div class="flex justify-between items-start pt-4 border-t border-slate-200 mb-8">
            <div class="max-w-xs text-xs text-slate-500">
              <div class="font-bold text-slate-700 mb-1">Izoh va To'lov shartlari:</div>
              <p>${invoice.notes || 'To\'lov shartnomada belgilangan muddatda bank hisobiga o\'tkazilsin.'}</p>
            </div>
            <div class="w-64 space-y-2 text-xs">
              <div class="flex justify-between text-slate-600">
                <span>Oraliq summa (QQSsiz):</span>
                <span class="font-semibold">${App.formatUZS(invoice.subtotal)}</span>
              </div>
              <div class="flex justify-between text-slate-600">
                <span>QQS (12%):</span>
                <span class="font-semibold">${App.formatUZS(invoice.vatTotal)}</span>
              </div>
              <div class="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                <span>Jami To'lanishi kerak:</span>
                <span class="text-sky-600">${App.formatUZS(invoice.grandTotal)}</span>
              </div>
            </div>
          </div>

          <!-- Signature & Stamp footer -->
          <div class="grid grid-cols-2 gap-8 pt-8 border-t border-dashed border-slate-300 text-xs text-slate-700">
            <div>
              <div class="font-bold text-slate-900 mb-8">Rahbar (Yetkazib beruvchi):</div>
              <div class="flex items-center gap-4">
                <div class="border-b border-slate-400 w-36"></div>
                <span>/ ${company.director || 'N. Qosimov'} /</span>
              </div>
            </div>
            <div>
              <div class="font-bold text-slate-900 mb-8">Qabul qildi (Xaridor):</div>
              <div class="flex items-center gap-4">
                <div class="border-b border-slate-400 w-36"></div>
                <span>/ ___________________ /</span>
              </div>
            </div>
          </div>
        </div>
      `;

      App.openModal('modal-view-invoice');
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  openPayModal(invoiceId) {
    const invoice = this.invoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    const modalInvId = document.getElementById('pay-modal-invoice-id');
    const modalInvNum = document.getElementById('pay-modal-invoice-number');
    const modalAmount = document.getElementById('pay-modal-amount');
    const accSelect = document.getElementById('pay-modal-account');

    if (modalInvId) modalInvId.value = invoice.id;
    if (modalInvNum) modalInvNum.innerText = `${invoice.invoiceNumber} (${invoice.contactName})`;
    if (modalAmount) modalAmount.value = invoice.dueAmount || invoice.grandTotal;

    if (accSelect) {
      accSelect.innerHTML = this.accounts.map(a => 
        `<option value="${a.id}">${a.name} (${App.formatMoney(a.balance, a.currency)})</option>`
      ).join('');
    }

    App.openModal('modal-pay-invoice');
  },

  async handlePaySubmit(e) {
    e.preventDefault();
    const invoiceId = document.getElementById('pay-modal-invoice-id').value;
    const amount = document.getElementById('pay-modal-amount').value;
    const accountId = document.getElementById('pay-modal-account').value;
    const paymentMethod = document.getElementById('pay-modal-method')?.value || 'bank_transfer';

    try {
      await App.api(`/api/invoices/${invoiceId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ amount, accountId, paymentMethod })
      });

      App.toast('To\'lov qabul qilindi va hisob yangilandi!', 'success');
      App.closeModal('modal-pay-invoice');
      this.load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  printCurrentInvoice() {
    window.print();
  },

  async delete(id) {
    if (!confirm('Hisob-fakturani o\'chirmoqchimisiz?')) return;
    try {
      await App.api(`/api/invoices/${id}`, { method: 'DELETE' });
      App.toast('Hisob-faktura o\'chirildi', 'info');
      this.load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};
