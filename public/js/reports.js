/**
 * BalansAI - Financial Reports & P&L Statement Module
 */

window.ReportsView = {
  pnlData: null,

  async load() {
    try {
      const data = await App.api('/api/reports/pnl');
      this.pnlData = data;
      this.render();
    } catch (err) {
      App.toast('Hisobotlarni yuklashda xatolik: ' + err.message, 'error');
    }
  },

  render() {
    if (!this.pnlData) return;
    const { revenue, opex, grossProfit, operatingProfit, netProfit, margin } = this.pnlData;

    // Revenue
    const revServices = document.getElementById('pnl-rev-services');
    const revSales = document.getElementById('pnl-rev-sales');
    const revOther = document.getElementById('pnl-rev-other');
    const revTotal = document.getElementById('pnl-rev-total');

    if (revServices) revServices.innerText = App.formatUZS(revenue.services);
    if (revSales) revSales.innerText = App.formatUZS(revenue.sales);
    if (revOther) revOther.innerText = App.formatUZS(revenue.other);
    if (revTotal) revTotal.innerText = App.formatUZS(revenue.total);

    // OPEX
    const opSalaries = document.getElementById('pnl-op-salaries');
    const opRent = document.getElementById('pnl-op-rent');
    const opInfra = document.getElementById('pnl-op-infra');
    const opMarketing = document.getElementById('pnl-op-marketing');
    const opTaxes = document.getElementById('pnl-op-taxes');
    const opOther = document.getElementById('pnl-op-other');
    const opTotal = document.getElementById('pnl-op-total');

    if (opSalaries) opSalaries.innerText = App.formatUZS(opex.salaries);
    if (opRent) opRent.innerText = App.formatUZS(opex.rent);
    if (opInfra) opInfra.innerText = App.formatUZS(opex.infrastructure);
    if (opMarketing) opMarketing.innerText = App.formatUZS(opex.marketing);
    if (opTaxes) opTaxes.innerText = App.formatUZS(opex.taxes);
    if (opOther) opOther.innerText = App.formatUZS(opex.other);
    if (opTotal) opTotal.innerText = App.formatUZS(opex.total);

    // Net
    const netEl = document.getElementById('pnl-net-profit');
    const marginEl = document.getElementById('pnl-margin');

    if (netEl) {
      netEl.innerText = (netProfit >= 0 ? '+' : '') + App.formatUZS(netProfit);
      netEl.className = `text-2xl font-black ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    }
    if (marginEl) marginEl.innerText = `${margin}%`;
  },

  printReport() {
    window.print();
  }
};
