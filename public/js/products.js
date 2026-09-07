/**
 * BalansAI - Products & Services Catalog Module
 */

window.ProductsView = {
  products: [],

  async load() {
    try {
      const data = await App.api('/api/products');
      this.products = data.products;
      this.render();
    } catch (err) {
      App.toast('Mahsulotlarni yuklashda xatolik: ' + err.message, 'error');
    }
  },

  render() {
    const listEl = document.getElementById('products-table-body');
    const searchFilter = (document.getElementById('product-search-input')?.value || '').toLowerCase();

    if (!listEl) return;

    let filtered = this.products;
    if (searchFilter) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchFilter) ||
        (p.sku && p.sku.toLowerCase().includes(searchFilter))
      );
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400">Mahsulot yoki xizmat topilmadi</td></tr>`;
      return;
    }

    listEl.innerHTML = filtered.map(p => {
      const isService = p.type === 'service';
      const typeBadge = isService
        ? '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">Xizmat</span>'
        : '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Mahsulot</span>';

      const margin = p.price > 0 && p.costPrice > 0 ? (((p.price - p.costPrice) / p.price) * 100).toFixed(0) : '—';

      return `
        <tr class="border-b border-white/5 hover:bg-white/[0.03] transition">
          <td class="py-3.5 px-4 font-mono text-xs text-sky-400">${p.sku}</td>
          <td class="py-3.5 px-4">
            <div class="font-semibold text-sm text-slate-200">${p.name}</div>
            <div class="text-xs text-slate-400">${p.description || 'Izoh yo\'q'}</div>
          </td>
          <td class="py-3.5 px-4">${typeBadge}</td>
          <td class="py-3.5 px-4 text-sm font-bold text-slate-100">${App.formatUZS(p.price)} <span class="text-xs font-normal text-slate-400">/ ${p.unit}</span></td>
          <td class="py-3.5 px-4 text-xs text-slate-400">${App.formatUZS(p.costPrice || 0)}</td>
          <td class="py-3.5 px-4 text-xs font-bold text-emerald-400">${margin !== '—' ? margin + '%' : '—'}</td>
          <td class="py-3.5 px-4 text-right">
            <button onclick="ProductsView.delete('${p.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition" title="O'chirish">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    const form = document.getElementById('add-product-form');
    if (form) form.reset();
    App.openModal('modal-add-product');
  },

  async handleAddSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('prod-modal-name').value;
    const type = document.getElementById('prod-modal-type').value;
    const unit = document.getElementById('prod-modal-unit').value;
    const price = document.getElementById('prod-modal-price').value;
    const costPrice = document.getElementById('prod-modal-cost').value;
    const sku = document.getElementById('prod-modal-sku').value;
    const description = document.getElementById('prod-modal-desc').value;

    try {
      await App.api('/api/products', {
        method: 'POST',
        body: JSON.stringify({ name, type, unit, price, costPrice, sku, description })
      });

      App.toast('Katalogga muvaffaqiyatli qo\'shildi!', 'success');
      App.closeModal('modal-add-product');
      this.load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async delete(id) {
    if (!confirm('Ushbu mahsulotni o\'chirmoqchimisiz?')) return;
    try {
      await App.api(`/api/products/${id}`, { method: 'DELETE' });
      App.toast('Mahsulot o\'chirildi', 'info');
      this.load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};
