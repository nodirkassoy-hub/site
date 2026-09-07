/**
 * BalansAI - Landing Page & Authentication Controller
 */

window.LandingView = {
  activeAuthTab: 'login',

  init() {
    this.bindEvents();
    this.renderPricingSection();
  },

  bindEvents() {
    // Auth form submit
    const loginForm = document.getElementById('landing-login-form');
    if (loginForm) {
      loginForm.onsubmit = (e) => this.handleLogin(e);
    }

    const regForm = document.getElementById('landing-register-form');
    if (regForm) {
      regForm.onsubmit = (e) => this.handleRegister(e);
    }
  },

  switchAuthTab(tab) {
    this.activeAuthTab = tab;
    const loginBox = document.getElementById('auth-tab-login');
    const regBox = document.getElementById('auth-tab-register');
    const btnLogin = document.getElementById('tab-btn-login');
    const btnReg = document.getElementById('tab-btn-register');

    if (tab === 'login') {
      loginBox.classList.remove('hidden');
      regBox.classList.add('hidden');
      btnLogin.classList.add('bg-sky-500', 'text-white', 'shadow-lg');
      btnLogin.classList.remove('text-slate-400');
      btnReg.classList.remove('bg-sky-500', 'text-white', 'shadow-lg');
      btnReg.classList.add('text-slate-400');
    } else {
      loginBox.classList.add('hidden');
      regBox.classList.remove('hidden');
      btnReg.classList.add('bg-sky-500', 'text-white', 'shadow-lg');
      btnReg.classList.remove('text-slate-400');
      btnLogin.classList.remove('bg-sky-500', 'text-white', 'shadow-lg');
      btnLogin.classList.add('text-slate-400');
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const data = await App.api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      localStorage.setItem('balansai_token', data.token);
      App.state.user = data.user;
      App.state.company = data.company;
      App.toast(`Xush kelibsiz, ${data.user.name}!`, 'success');
      App.init();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const companyName = document.getElementById('reg-company-name').value;
    const businessType = document.getElementById('reg-business-type').value;
    const phone = document.getElementById('reg-phone').value;

    try {
      const data = await App.api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, companyName, businessType, phone })
      });

      localStorage.setItem('balansai_token', data.token);
      App.state.user = data.user;
      App.state.company = data.company;
      App.toast(`Muvaffaqiyatli ro'yxatdan o'tdingiz!`, 'success');
      App.init();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async quickDemoLogin(role) {
    try {
      const data = await App.api('/api/auth/demo-login', {
        method: 'POST',
        body: JSON.stringify({ role })
      });

      localStorage.setItem('balansai_token', data.token);
      App.state.user = data.user;
      App.state.company = data.company;
      App.toast(`Demo tizimga ulandi (${role})!`, 'success');
      App.init();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  renderPricingSection() {
    const container = document.getElementById('landing-pricing-cards');
    if (!container) return;

    container.innerHTML = `
      <!-- Starter Plan -->
      <div class="liquid-glass p-8 rounded-3xl border border-white/10 hover:border-emerald-500/50 transition-all duration-300 flex flex-col justify-between">
        <div>
          <div class="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 mb-4">YaTT va Kichik Biznes</div>
          <h3 class="text-2xl font-bold text-white mb-2">Boshlang'ich (Starter)</h3>
          <p class="text-slate-400 text-sm mb-6">Kichik savdo, xizmat ko'rsatish va frilanserlar uchun</p>
          <div class="flex items-baseline gap-2 mb-6">
            <span class="text-4xl font-extrabold text-white">190,000</span>
            <span class="text-slate-400 text-sm">so'm / oy</span>
          </div>
          <ul class="space-y-3 text-sm text-slate-300 mb-8">
            <li class="flex items-center gap-2"><i class="fa-solid fa-check text-emerald-400"></i> Oyiga 200 ta kirim-chiqim</li>
            <li class="flex items-center gap-2"><i class="fa-solid fa-check text-emerald-400"></i> Cheksiz hisob-fakturalar</li>
            <li class="flex items-center gap-2"><i class="fa-solid fa-check text-emerald-400"></i> 3 ta bank hisob va kassa</li>
            <li class="flex items-center gap-2"><i class="fa-solid fa-check text-emerald-400"></i> Soliq hisobi (QQS 12% & 4%)</li>
            <li class="flex items-center gap-2"><i class="fa-solid fa-check text-emerald-400"></i> AI CFO (50 ta savol/oy)</li>
          </ul>
        </div>
        <button onclick="LandingView.quickDemoLogin('owner')" class="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition border border-white/10">Sinab ko'rish</button>
      </div>

      <!-- Pro Plan (Popular) -->
      <div class="liquid-glass p-8 rounded-3xl border-2 border-sky-500/70 liquid-glass-glow flex flex-col justify-between relative transform lg:-translate-y-4">
        <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-extrabold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">Eng Ommabop 🔥</div>
        <div>
          <div class="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-500/20 text-sky-400 mb-4 mt-2">MChJ va O'rta Biznes</div>
          <h3 class="text-2xl font-bold text-white mb-2">Professional (Pro)</h3>
          <p class="text-slate-400 text-sm mb-6">Rivojlanayotgan kompaniyalar va IT korxonalar uchun</p>
          <div class="flex items-baseline gap-2 mb-6">
            <span class="text-4xl font-extrabold text-sky-400">450,000</span>
            <span class="text-slate-400 text-sm">so'm / oy</span>
          </div>
          <ul class="space-y-3 text-sm text-slate-200 mb-8">
            <li class="flex items-center gap-2"><i class="fa-solid fa-circle-check text-sky-400"></i> <b>Cheksiz</b> kirim-chiqim operatsiyalari</li>
            <li class="flex items-center gap-2"><i class="fa-solid fa-circle-check text-sky-400"></i> <b>Cheksiz</b> hisob-faktura va PDF chop</li>
            <li class="flex items-center gap-2"><i class="fa-solid fa-circle-check text-sky-400"></i> Valyuta hisoblari (UZS, USD, EUR)</li>
            <li class="flex items-center gap-2"><i class="fa-solid fa-circle-check text-sky-400"></i> <b>AI CFO Maslahatchi to'liq 24/7</b></li>
            <li class="flex items-center gap-2"><i class="fa-solid fa-circle-check text-sky-400"></i> Xarajat anomaliyalari & xavflar</li>
            <li class="flex items-center gap-2"><i class="fa-solid fa-circle-check text-sky-400"></i> 5 tagacha buxgalter foydalanuvchisi</li>
          </ul>
        </div>
        <button onclick="LandingView.quickDemoLogin('owner')" class="btn-fintech-primary w-full py-3.5 text-base">Hozir boshlash</button>
      </div>

      <!-- Enterprise Plan -->
      <div class="liquid-glass p-8 rounded-3xl border border-white/10 hover:border-purple-500/50 transition-all duration-300 flex flex-col justify-between">
        <div>
          <div class="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 mb-4">Katta Xoldinglar</div>
          <h3 class="text-2xl font-bold text-white mb-2">Korporativ</h3>
          <p class="text-slate-400 text-sm mb-6">Ko'p filialli korxonalar va maxsus integratsiyalar</p>
          <div class="flex items-baseline gap-2 mb-6">
            <span class="text-4xl font-extrabold text-white">990,000</span>
            <span class="text-slate-400 text-sm">so'm / oy</span>
          </div>
          <ul class="space-y-3 text-sm text-slate-300 mb-8">
            <li class="flex items-center gap-2"><i class="fa-solid fa-check text-purple-400"></i> Barcha Pro imkoniyatlar</li>
            <li class="flex items-center gap-2"><i class="fa-solid fa-check text-purple-400"></i> Cheksiz xodimlar & filiallar</li>
            <li class="flex items-center gap-2"><i class="fa-solid fa-check text-purple-400"></i> O'zbekiston Bank API integratsiyasi</li>
            <li class="flex items-center gap-2"><i class="fa-solid fa-check text-purple-400"></i> 1C va Didox/E-Faktura sinxronlash</li>
            <li class="flex items-center gap-2"><i class="fa-solid fa-check text-purple-400"></i> Shaxsiy AI moliyaviy modeli</li>
          </ul>
        </div>
        <button onclick="LandingView.quickDemoLogin('superadmin')" class="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition border border-white/10">Bog'lanish & Demo</button>
      </div>
    `;
  }
};
