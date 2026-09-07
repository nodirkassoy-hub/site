/**
 * BalansAI - Subscription & Tariffs Module (Pullik Tariflar & Obuna)
 */

window.SubscriptionView = {
  plans: [],
  currentSub: null,
  selectedPlan: null,

  async load() {
    try {
      const [plansRes, subRes] = await Promise.all([
        App.api('/api/plans'),
        App.api('/api/subscriptions/current')
      ]);

      this.plans = plansRes.plans;
      this.currentSub = subRes.subscription;

      this.renderCurrentStatus();
      this.renderPlans();
    } catch (err) {
      App.toast('Tariflarni yuklashda xatolik: ' + err.message, 'error');
    }
  },

  renderCurrentStatus() {
    const sub = this.currentSub;
    const badgeEl = document.getElementById('sub-status-card');
    if (!badgeEl) return;

    if (!sub) {
      badgeEl.innerHTML = `
        <div class="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
          Aktiv obuna topilmadi. Iltimos, pastdagi tariflardan birini tanlang.
        </div>
      `;
      return;
    }

    badgeEl.innerHTML = `
      <div class="p-6 rounded-3xl liquid-glass border border-emerald-500/30 liquid-glass-emerald flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span class="text-xs font-bold uppercase tracking-wider text-emerald-400">Faol Obuna</span>
          </div>
          <h3 class="text-2xl font-black text-white">${sub.planName}</h3>
          <p class="text-xs text-slate-400 mt-1">
            Amal qilish muddati: <b class="text-slate-200">${App.formatDate(sub.endDate)}</b> gacha
          </p>
        </div>
        <div class="text-right">
          <div class="text-xs text-slate-400">To'langan summa:</div>
          <div class="text-xl font-bold text-emerald-400">${App.formatUZS(sub.amount)}</div>
        </div>
      </div>
    `;
  },

  renderPlans() {
    const container = document.getElementById('subscription-plans-grid');
    if (!container) return;

    container.innerHTML = this.plans.map(p => {
      const isCurrent = this.currentSub && this.currentSub.planId === p.id;
      const isPro = p.id === 'plan_pro';

      return `
        <div class="liquid-glass p-8 rounded-3xl border ${
          isPro ? 'border-2 border-sky-500/70 liquid-glass-glow' : 'border-white/10 hover:border-white/20'
        } transition-all duration-300 flex flex-col justify-between relative">
          ${isPro ? '<div class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-[11px] font-black uppercase px-3.5 py-1 rounded-full shadow-lg">Tavsiya etiladi 🔥</div>' : ''}
          
          <div>
            <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/5 text-slate-300 border border-white/10 mb-4 inline-block">
              ${p.badge}
            </span>
            <h3 class="text-xl font-bold text-white mb-2">${p.name}</h3>
            <p class="text-xs text-slate-400 mb-6">${p.description}</p>
            
            <div class="flex items-baseline gap-1.5 mb-6">
              <span class="text-3xl font-black text-white">${p.price > 0 ? App.formatUZS(p.price) : 'Bepul'}</span>
              <span class="text-xs text-slate-400">/ ${p.period}</span>
            </div>

            <ul class="space-y-2.5 text-xs text-slate-300 mb-8 border-t border-white/5 pt-4">
              ${p.features.map(f => `<li class="flex items-center gap-2"><i class="fa-solid fa-circle-check text-sky-400 text-xs"></i> ${f}</li>`).join('')}
            </ul>
          </div>

          <button onclick="SubscriptionView.openCheckoutModal('${p.id}')" class="w-full py-3 rounded-xl font-bold text-sm transition ${
            isCurrent
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
              : isPro
              ? 'btn-fintech-primary'
              : 'btn-fintech-glass'
          }">
            ${isCurrent ? 'Joriy Tarifingiz ✓' : 'Tarifni tanlash'}
          </button>
        </div>
      `;
    }).join('');
  },

  openCheckoutModal(planId) {
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) return;
    this.selectedPlan = plan;

    const nameEl = document.getElementById('checkout-plan-name');
    const priceEl = document.getElementById('checkout-plan-price');
    const totalEl = document.getElementById('checkout-plan-total');

    if (nameEl) nameEl.innerText = plan.name;
    if (priceEl) priceEl.innerText = App.formatUZS(plan.price);
    if (totalEl) totalEl.innerText = App.formatUZS(plan.price);

    App.openModal('modal-checkout');
  },

  async processPayment(method = 'payme') {
    if (!this.selectedPlan) return;

    try {
      const data = await App.api('/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId: this.selectedPlan.id,
          paymentMethod: method,
          periodMonths: 1
        })
      });

      App.toast(data.message, 'success');
      App.closeModal('modal-checkout');

      // Update app state
      App.state.subscription = data.subscription;
      App.updateUserBadge();

      this.load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};
