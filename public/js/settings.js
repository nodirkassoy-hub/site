/**
 * BalansAI - Company Profile & Financial Settings Module
 */

window.SettingsView = {
  company: null,

  async load() {
    try {
      const data = await App.api('/api/auth/me');
      this.company = data.company;
      this.populateForm();
    } catch (err) {
      App.toast('Sozlamalarni yuklashda xatolik: ' + err.message, 'error');
    }
  },

  populateForm() {
    if (!this.company) return;
    const c = this.company;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('set-company-name', c.name);
    setVal('set-company-tin', c.tin);
    setVal('set-company-vat', c.vatNumber);
    setVal('set-company-type', c.businessType);
    setVal('set-company-director', c.director);
    setVal('set-company-accountant', c.accountant);
    setVal('set-company-phone', c.phone);
    setVal('set-company-email', c.email);
    setVal('set-company-address', c.address);
    setVal('set-company-bank', c.bankName);
    setVal('set-company-account', c.bankAccount);
    setVal('set-company-mfo', c.mfo);
  },

  async handleSave(e) {
    e.preventDefault();
    const name = document.getElementById('set-company-name').value;
    const tin = document.getElementById('set-company-tin').value;
    const vatNumber = document.getElementById('set-company-vat').value;
    const businessType = document.getElementById('set-company-type').value;
    const director = document.getElementById('set-company-director').value;
    const accountant = document.getElementById('set-company-accountant').value;
    const phone = document.getElementById('set-company-phone').value;
    const email = document.getElementById('set-company-email').value;
    const address = document.getElementById('set-company-address').value;
    const bankName = document.getElementById('set-company-bank').value;
    const bankAccount = document.getElementById('set-company-account').value;
    const mfo = document.getElementById('set-company-mfo').value;

    try {
      // In a real app we'd update via API; let's simulate updating company
      App.state.company = {
        ...App.state.company,
        name, tin, vatNumber, businessType, director, accountant, phone, email, address, bankName, bankAccount, mfo
      };
      App.updateUserBadge();
      App.toast('Kompaniya ma\'lumotlari muvaffaqiyatli saqlandi!', 'success');
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};
