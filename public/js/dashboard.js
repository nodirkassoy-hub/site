/**
 * BalansAI - Dashboard Module (KPIs, Cashflow Charts & Live Statistics)
 */

window.DashboardView = {
  cashflowChart: null,
  donutChart: null,

  async loadStats() {
    try {
      const data = await App.api('/api/dashboard/stats');
      this.renderKPIs(data.summary);
      this.renderCharts(data.chartData, data.expenseBreakdown);
      this.renderRecentTransactions(data.recentTransactions);
      this.renderPendingInvoices(data.pendingInvoices);
      this.renderAIRecommendations(data.recommendations);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      App.toast('Statistikani yuklashda xatolik: ' + err.message, 'error');
    }
  },

  renderKPIs(summary) {
    const kpiIncome = document.getElementById('kpi-income');
    const kpiExpense = document.getElementById('kpi-expense');
    const kpiProfit = document.getElementById('kpi-profit');
    const kpiMargin = document.getElementById('kpi-margin');
    const kpiCash = document.getElementById('kpi-cash');
    const kpiReceivable = document.getElementById('kpi-receivable');
    const kpiHealth = document.getElementById('kpi-health-score');
    const kpiHealthLabel = document.getElementById('kpi-health-label');
    const kpiHealthBar = document.getElementById('kpi-health-bar');

    if (kpiIncome) kpiIncome.innerText = App.formatUZS(summary.totalIncome);
    if (kpiExpense) kpiExpense.innerText = App.formatUZS(summary.totalExpense);
    if (kpiProfit) {
      kpiProfit.innerText = (summary.netProfit >= 0 ? '+' : '') + App.formatUZS(summary.netProfit);
      kpiProfit.className = `text-2xl font-black ${summary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    }
    if (kpiMargin) kpiMargin.innerText = `Rentabellik: ${summary.profitMargin}`;
    if (kpiCash) kpiCash.innerText = App.formatUZS(summary.liquidCashUZS);
    if (kpiReceivable) kpiReceivable.innerText = App.formatUZS(summary.totalReceivable);

    if (kpiHealth) kpiHealth.innerText = `${summary.healthScore}/100`;
    if (kpiHealthLabel) kpiHealthLabel.innerText = summary.healthStatus;
    if (kpiHealthBar) {
      kpiHealthBar.style.width = `${summary.healthScore}%`;
      kpiHealthBar.className = `h-full rounded-full transition-all duration-1000 ${
        summary.healthScore >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-orange-400'
      }`;
    }
  },

  renderCharts(chartData, breakdown) {
    const isDark = App.state.theme === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    // 1. Cashflow Trend Chart
    const cashflowEl = document.getElementById('chart-cashflow');
    if (cashflowEl) {
      if (this.cashflowChart) {
        this.cashflowChart.destroy();
      }

      const options = {
        series: [
          { name: 'Kirim (Daromad)', data: chartData.income },
          { name: 'Chiqim (Xarajat)', data: chartData.expense }
        ],
        chart: {
          type: 'area',
          height: 310,
          toolbar: { show: false },
          background: 'transparent',
          fontFamily: 'Plus Jakarta Sans, sans-serif'
        },
        colors: ['#06b6d4', '#f43f5e'],
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.45,
            opacityTo: 0.05,
            stops: [0, 95, 100]
          }
        },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        grid: {
          borderColor: gridColor,
          strokeDashArray: 4,
          yaxis: { lines: { show: true } }
        },
        xaxis: {
          categories: chartData.categories,
          labels: { style: { colors: textColor, fontSize: '12px' } },
          axisBorder: { show: false },
          axisTicks: { show: false }
        },
        yaxis: {
          labels: {
            style: { colors: textColor, fontSize: '11px' },
            formatter: (val) => (val / 1000000).toFixed(0) + ' mln'
          }
        },
        legend: {
          position: 'top',
          horizontalAlign: 'right',
          labels: { colors: textColor }
        },
        tooltip: {
          theme: isDark ? 'dark' : 'light',
          y: { formatter: (val) => App.formatUZS(val) }
        }
      };

      this.cashflowChart = new ApexCharts(cashflowEl, options);
      this.cashflowChart.render();
    }

    // 2. Expense Breakdown Donut Chart
    const donutEl = document.getElementById('chart-expense-donut');
    if (donutEl) {
      if (this.donutChart) {
        this.donutChart.destroy();
      }

      const labels = Object.keys(breakdown);
      const series = Object.values(breakdown);

      const donutOptions = {
        series: series.length ? series : [100],
        labels: labels.length ? labels : ['Xarajat yo\'q'],
        chart: {
          type: 'donut',
          height: 310,
          background: 'transparent',
          fontFamily: 'Plus Jakarta Sans, sans-serif'
        },
        colors: ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185', '#fbbf24', '#34d399'],
        stroke: { width: 2, colors: [isDark ? '#111827' : '#ffffff'] },
        plotOptions: {
          pie: {
            donut: {
              size: '72%',
              labels: {
                show: true,
                total: {
                  show: true,
                  label: 'Jami Chiqim',
                  color: textColor,
                  formatter: (w) => {
                    const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                    return App.formatUZS(total);
                  }
                }
              }
            }
          }
        },
        legend: {
          position: 'bottom',
          labels: { colors: textColor },
          itemMargin: { horizontal: 6, vertical: 4 }
        },
        tooltip: {
          theme: isDark ? 'dark' : 'light',
          y: { formatter: (val) => App.formatUZS(val) }
        }
      };

      this.donutChart = new ApexCharts(donutEl, donutOptions);
      this.donutChart.render();
    }
  },

  renderRecentTransactions(transactions) {
    const listEl = document.getElementById('dashboard-recent-transactions');
    if (!listEl) return;

    if (!transactions || transactions.length === 0) {
      listEl.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400">Operatsiyalar mavjud emas</td></tr>`;
      return;
    }

    listEl.innerHTML = transactions.map(tx => {
      const isIncome = tx.type === 'income';
      const isExpense = tx.type === 'expense';
      const typeBadge = isIncome
        ? '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"><i class="fa-solid fa-arrow-down-left mr-1"></i> Kirim</span>'
        : isExpense
        ? '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30"><i class="fa-solid fa-arrow-up-right mr-1"></i> Chiqim</span>'
        : '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30"><i class="fa-solid fa-right-left mr-1"></i> O\'tkazma</span>';

      return `
        <tr class="border-b border-white/5 hover:bg-white/[0.03] transition">
          <td class="py-3 px-4 text-xs text-slate-400">${App.formatDate(tx.date)}</td>
          <td class="py-3 px-4">
            <div class="font-medium text-sm text-slate-200">${tx.category}</div>
            <div class="text-xs text-slate-400">${tx.contactName || tx.accountName}</div>
          </td>
          <td class="py-3 px-4">${typeBadge}</td>
          <td class="py-3 px-4 text-right font-bold text-sm ${isIncome ? 'text-emerald-400' : isExpense ? 'text-rose-400' : 'text-sky-400'}">
            ${isIncome ? '+' : isExpense ? '-' : ''}${App.formatMoney(tx.amount, tx.currency)}
          </td>
          <td class="py-3 px-4 text-right">
            <button onclick="TransactionsView.delete('${tx.id}')" class="text-slate-400 hover:text-rose-400 transition p-1 text-xs" title="O'chirish">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderPendingInvoices(invoices) {
    const listEl = document.getElementById('dashboard-pending-invoices');
    if (!listEl) return;

    if (!invoices || invoices.length === 0) {
      listEl.innerHTML = `<div class="p-6 text-center text-slate-400 text-sm">Barcha hisob-fakturalar to'langan 🎉</div>`;
      return;
    }

    listEl.innerHTML = invoices.map(inv => `
      <div class="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition flex items-center justify-between">
        <div>
          <div class="font-semibold text-sm text-slate-200">${inv.invoiceNumber}</div>
          <div class="text-xs text-slate-400">${inv.contactName} • Muddat: ${inv.dueDate}</div>
        </div>
        <div class="text-right">
          <div class="text-sm font-bold text-amber-400">${App.formatMoney(inv.dueAmount || inv.grandTotal, inv.currency)}</div>
          <button onclick="InvoicesView.openPayModal('${inv.id}')" class="text-xs font-semibold text-sky-400 hover:underline">To'lov qabul qilish</button>
        </div>
      </div>
    `).join('');
  },

  renderAIRecommendations(recs) {
    const listEl = document.getElementById('dashboard-ai-insights');
    if (!listEl) return;

    if (!recs || recs.length === 0) {
      listEl.innerHTML = `<p class="text-sm text-slate-400">AI tahlili yangilanmoqda...</p>`;
      return;
    }

    listEl.innerHTML = recs.slice(0, 2).map(r => `
      <div class="p-4 rounded-2xl bg-gradient-to-br from-sky-500/10 to-indigo-500/10 border border-sky-500/20">
        <div class="flex items-center justify-between mb-2">
          <span class="px-2 py-0.5 rounded-md text-xs font-bold uppercase bg-sky-500/20 text-sky-300">${r.badge}</span>
          <span class="text-xs text-emerald-400 font-semibold">${r.impact}</span>
        </div>
        <h4 class="text-sm font-bold text-slate-100 mb-1">${r.title}</h4>
        <p class="text-xs text-slate-300 leading-relaxed mb-3">${r.description.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}</p>
        <button onclick="App.navigateTo('ai-cfo')" class="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1">
          Batafsil AI Maslahat <i class="fa-solid fa-arrow-right text-[10px]"></i>
        </button>
      </div>
    `).join('');
  }
};
