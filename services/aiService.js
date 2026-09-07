const db = require('./db');
const currencyService = require('./currencyService');

const aiService = {
  // Comprehensive Financial Health & Insights Generator
  getCompanyFinancialInsights(companyId) {
    const company = db.findById('companies', companyId);
    const transactions = db.find('transactions', t => t.companyId === companyId);
    const invoices = db.find('invoices', i => i.companyId === companyId);
    const contacts = db.find('contacts', c => c.companyId === companyId);
    const accounts = db.find('accounts', a => a.companyId === companyId);

    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;
    let totalVatPaid = 0;
    const categoryExpenses = {};
    const monthlyIncome = {};
    const monthlyExpense = {};

    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      const month = t.date ? t.date.substring(0, 7) : '2026-08';
      
      if (t.type === 'income') {
        totalIncome += amt;
        monthlyIncome[month] = (monthlyIncome[month] || 0) + amt;
      } else if (t.type === 'expense') {
        totalExpense += amt;
        monthlyExpense[month] = (monthlyExpense[month] || 0) + amt;
        categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + amt;
        if (t.vatAmount) totalVatPaid += Number(t.vatAmount);
      }
    });

    const netProfit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0;

    // Accounts liquid cash total
    let totalLiquidCashUZS = 0;
    accounts.forEach(acc => {
      const bal = Number(acc.balance) || 0;
      if (acc.currency === 'UZS') {
        totalLiquidCashUZS += bal;
      } else if (acc.currency === 'USD') {
        totalLiquidCashUZS += bal * 12850;
      } else if (acc.currency === 'EUR') {
        totalLiquidCashUZS += bal * 13900;
      }
    });

    // Invoices / Debts analysis
    let totalReceivable = 0; // Bizga to'lanishi kerak
    let totalPayable = 0;    // Biz to'lashimiz kerak
    let overdueReceivable = 0;

    invoices.forEach(inv => {
      if (inv.status !== 'paid') {
        const due = Number(inv.dueAmount || inv.grandTotal || 0);
        totalReceivable += due;
        if (inv.dueDate && new Date(inv.dueDate) < new Date()) {
          overdueReceivable += due;
        }
      }
    });

    contacts.forEach(c => {
      const bal = Number(c.currentBalance) || 0;
      if (bal > 0) {
        // Debitor
      } else if (bal < 0) {
        totalPayable += Math.abs(bal);
      }
    });

    // Burn rate and runway
    const monthlyBurnRate = totalExpense > 0 ? totalExpense : 30000000;
    const cashRunwayMonths = monthlyBurnRate > 0 ? (totalLiquidCashUZS / monthlyBurnRate).toFixed(1) : '12+';

    // Calculate Financial Health Score (0 - 100)
    let healthScore = 75;
    if (netProfit > 0) healthScore += 12;
    if (profitMargin > 30) healthScore += 5;
    if (Number(cashRunwayMonths) >= 4) healthScore += 8;
    if (overdueReceivable > 0) healthScore -= 10;
    if (healthScore > 100) healthScore = 98;
    if (healthScore < 20) healthScore = 25;

    // AI Generated Strategic Recommendations
    const recommendations = [];

    // 1. Debt collection recommendation
    if (totalReceivable > 0) {
      recommendations.push({
        type: 'warning',
        badge: 'Debitorlik Qarzi',
        title: 'Mijozlardan to\'lovlarni tezlashtirish tavsiyasi',
        description: `Mijozlaringizdan jami **${currencyService.format(totalReceivable)}** kutilayotgan tushum mavjud. Shartnoma bo'yicha 100% oldindan to'lov qiluvchi mijozlarga 3% chegirma (skidka) taklif qilish orqali pul oqimini 2 haftaga tezlashtirish mumkin.`,
        impact: 'Pul aylanishi +18% tezlashadi',
        action: 'Eslatma xati yuborish'
      });
    }

    // 2. Expense Optimization
    const topExpenseCategory = Object.entries(categoryExpenses).sort((a, b) => b[1] - a[1])[0];
    if (topExpenseCategory) {
      const topCatPercent = totalExpense > 0 ? ((topExpenseCategory[1] / totalExpense) * 100).toFixed(0) : 0;
      recommendations.push({
        type: 'info',
        badge: 'Xarajat Optimallashtirish',
        title: `Asosiy xarajat: "${topExpenseCategory[0]}" (${topCatPercent}%)`,
        description: `Kompaniyangiz jami xarajatlarining eng katta qismi **${topExpenseCategory[0]}** ga to'g'ri kelmoqda (${currencyService.format(topExpenseCategory[1])}). IT xizmatlar yoki marketing xarajatlarini choraklik obunaga o'tkazish orqali 10-15% tejash mumkin.`,
        impact: `Oyiga ~${currencyService.format(topExpenseCategory[1] * 0.1)} tejamkorlik`,
        action: 'Xarajatlarni tekshirish'
      });
    }

    // 3. Tax saving suggestion (Uzbekistan Tax Code specific)
    recommendations.push({
      type: 'success',
      badge: 'Soliq Maslahati (O\'zbekiston)',
      title: 'QQS hisobi va IT-Park / Eksport imtiyozlari',
      description: `O'zbekiston Respublikasi Soliq Kodeksining 304-moddasiga asosan, agarda siz IT xizmatlari yoki xorijiy kompaniyalarga xizmat ko'rsatsangiz, IT-Park rezidentligi orqali QQS (12%) va Daromad solig'idan (15% o'rniga 7.5% yoki 0%) to'liq ozod bo'lishingiz mumkin.`,
      impact: `Yillik taxminiy tejam: ${currencyService.format(totalIncome * 0.12)}`,
      action: 'Imtiyozlarni ko\'rish'
    });

    // 4. Liquidity & Investment advice
    if (totalLiquidCashUZS > 50000000) {
      recommendations.push({
        type: 'opportunity',
        badge: 'Moliyaviy Imkoniyat',
        title: 'Erkin aylanma mablag\'larni daromadga aylantirish',
        description: `Kompaniya hisobida **${currencyService.format(totalLiquidCashUZS)}** likvid mablag' mavjud. Ushbu summaning 40% qismini o'zbek banklarining qisqa muddatli onlayn omonat/overnayt depozitlariga (yillik 18-21%) joylashtirish mumkin.`,
        impact: `Yillik passiv daromad: ~${currencyService.format(totalLiquidCashUZS * 0.4 * 0.19)}`,
        action: 'Depozit hisob-kitobi'
      });
    }

    return {
      companyName: company ? company.name : 'Kompaniya',
      healthScore,
      healthStatus: healthScore >= 80 ? 'A\'lo darajada (Barqaror)' : healthScore >= 60 ? 'Yaxshi (Nazorat zarur)' : 'Xavfli (Chora ko\'rish kerak)',
      totalIncome,
      totalExpense,
      netProfit,
      profitMargin: `${profitMargin}%`,
      liquidCashUZS: totalLiquidCashUZS,
      cashRunwayMonths,
      totalReceivable,
      totalPayable,
      overdueReceivable,
      categoryExpenses,
      recommendations,
      updatedAt: new Date().toISOString()
    };
  },

  // Interactive AI Assistant Chat Engine
  processAIChat(companyId, userMessage) {
    const insights = this.getCompanyFinancialInsights(companyId);
    const msg = userMessage.toLowerCase().trim();

    let reply = '';
    const now = new Date();

    if (msg.includes('salom') || msg.includes('assalom') || msg.includes('qalesan') || msg.includes('privet') || msg.includes('hello')) {
      reply = `Assalomu alaykum! Men **${insights.companyName}** ning shaxsiy **AI CFO (Bosh Moliyaviy Maslahatchisi)** man.

Hozirgi holatda kompaniyangizning Moliyaviy Barqarorlik darajasi: **${insights.healthScore}/100** (${insights.healthStatus}).

Sizga qanday yordam bera olaman?
1. 📊 **Moliyaviy tahlil va sof foyda hisobi**
2. 💰 **Xarajatlarni qisqartirish va optimallashtirish**
3. 📑 **Soliq imtiyozlari va QQS hisob-kitobi (O'zbekiston)**
4. 📈 **Keyingi 3 oylik daromad va pul oqimi prognozi**
5. ⚠️ **Mijozlar qarzdorligi (Debitorlik) va xavflar**`;
    } else if (msg.includes('sof foyda') || msg.includes('foyda') || msg.includes('daromad') || msg.includes('kirim') || msg.includes('profit')) {
      reply = `📈 **${insights.companyName} Moliyaviy Natijalari:**

- **Jami Kirim:** ${currencyService.format(insights.totalIncome)}
- **Jami Chiqim:** ${currencyService.format(insights.totalExpense)}
- **Sof Foyda:** **+${currencyService.format(insights.netProfit)}**
- **Rentabellik (Margin):** **${insights.profitMargin}**

💡 **AI Xulosasi:** Kompaniya rentabellik darajasi ${Number(insights.profitMargin) > 30 ? 'juda yuqori va soha bo\'yicha o\'rtacha ko\'rsatkichdan (25%) ancha yuqori' : 'yaxshi darajada'}. Sof foydani yanada oshirish uchun asosiy e\'tiborni yuqori marjali xizmatlar ko'rsatishga qaratishni tavsiya qilaman.`;
    } else if (msg.includes('xarajat') || msg.includes('chiqim') || msg.includes('kamaytirish') || msg.includes('qisqartirish') || msg.includes('expense')) {
      const topCats = Object.entries(insights.categoryExpenses).map(([cat, amt]) => `- **${cat}:** ${currencyService.format(amt)}`).join('\n');
      reply = `🔍 **Xarajatlar Tahlili va Qisqartirish Bo'yicha AI Tavsiyalari:**

Hozirgi jami xarajat: **${currencyService.format(insights.totalExpense)}**

Bo'limlar bo'yicha:
${topCats || '- Xarajatlar toifalangan'}

🎯 **Qisqartirish uchun 3 ta aniq qadam:**
1. **Serverlar va Obunalar:** Keraksiz bulutli instansiyalarni to'xtatish va yillik to'lovga o'tish orqali 15% tejang.
2. **Kantselyariya va Ma'muriy:** Elektron hujjat aylanishiga (Didox / E-Faktura) 100% o'tish orqali qog'oz va kuryer xarajatlarini 0 ga tushiring.
3. **Ofis xarajatlari:** Xodimlarning gibrid (haftada 2 kun masofadan) ishlash modelini joriy qilib, kommunal va ofis ta'minotini 20% gacha kamaytiring.`;
    } else if (msg.includes('soliq') || msg.includes('qqs') || msg.includes('tax') || msg.includes('nds')) {
      reply = `🏛️ **O'zbekiston Respublikasi Soliq Qonunchiligi Bo'yicha Maslahat:**

- **QQS (12%):** Kirim va Chiqim hisob-fakturalaridagi QQS hisobga olinganda, xarajat hisob-fakturalarini to'liq tizimga kiritish orqali to'lanadigan QQS summasini qonuniy hisobga olish (zachet) mumkin.
- **Aylanma Soliq (4%):** Agar kompaniya aylanmasi 1 mlrd so'mgacha bo'lsa, aylanmadan 4% to'lash yoki 20 mln so'm qat'iy belgilangan yillik soliq rejimini tanlash mumkin.
- **IT-Park Imtiyozlari:** Agar dasturiy ta'minot yoki IT xizmatlar eksport qilsangiz, rezidentlik orqali barcha korporativ soliqlardan 0% imtiyoz oling!`;
    } else if (msg.includes('qarz') || msg.includes('debitor') || msg.includes('kreditor') || msg.includes('to\'lov')) {
      reply = `⚠️ **Qarzdorlik va To'lovlar Nazorati:**

- **Bizga to'lanishi kerak (Debitorlik):** **${currencyService.format(insights.totalReceivable)}**
- **Biz to'lashimiz kerak (Kreditorlik):** **${currencyService.format(insights.totalPayable)}**
- **Muddati o'tgan qarzdorlik:** **${currencyService.format(insights.overdueReceivable)}**

📌 **Amaliy Tavsiya:**
Debitorlik qarzini yopish uchun mijozlarga BalansAI tizimidan avtomatik E-Faktura va to'lov havolasini (Click / Payme / Bank) Telegram yoki SMS orqali qayta jo'nating.`;
    } else if (msg.includes('prognoz') || msg.includes('kelajak') || msg.includes('forecast') || msg.includes('plan')) {
      const forecastNextMonth = (insights.totalIncome * 1.15).toFixed(0);
      const forecastNet = (insights.netProfit * 1.12).toFixed(0);
      reply = `🔮 **Sun'iy Intellekt 3 Oylik Moliyaviy Prognozi:**

1. **Kelgusi 1-oy:**
   - Kutilayotgan tushum: **${currencyService.format(Number(forecastNextMonth))}** *(+15% o'sish)*
   - Kutilayotgan sof foyda: **${currencyService.format(Number(forecastNet))}**
2. **Pul zaxirasi (Cash Runway):** **${insights.cashRunwayMonths} oy** davomida mustaqil faoliyat ko'rsatish imkoniyati.
3. **Mavsumiy tendensiya:** Kuz va qish oylarida B2B shartnomalar soni odatda 25% ga oshadi. Hozirdan tijoriy takliflarni tarqatishni tavsiya qilamiz.`;
    } else {
      reply = `Tushundim! Sizning savolingiz: *"${userMessage}"*

📊 **Kompaniyangiz moliyaviy xulosasi:**
- Joriy erkin mablag': **${currencyService.format(insights.liquidCashUZS)}**
- Joriy sof foyda: **${currencyService.format(insights.netProfit)}** (Rentabellik: ${insights.profitMargin})
- Moliyaviy barqarorlik ko'rsatkichi: **${insights.healthScore}/100**

Bu bo'yicha maslahatim: biznesingizni barqaror kengaytirish uchun erkin pul oqimining kamida 20% qismini zaxira jamg'armasiga ajrating va asosiy mijozlar bilan uzoq muddatli (6-12 oylik) shartnomalar tuzing.

Boshqa savollaringiz bo'lsa, bemalol so'rang!`;
    }

    // Save message pair
    const userItem = db.insert('ai_chats', {
      companyId,
      sender: 'user',
      text: userMessage
    });
    const aiItem = db.insert('ai_chats', {
      companyId,
      sender: 'ai',
      text: reply
    });

    return { userMessage: userItem, aiResponse: aiItem };
  }
};

module.exports = aiService;
