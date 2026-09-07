const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./services/db');
const authService = require('./services/authService');
const aiService = require('./services/aiService');
const currencyService = require('./services/currencyService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Logging
function auditLog(action, details, user = null) {
  db.addLog({
    action,
    details,
    userId: user ? user.id : 'anonymous',
    userName: user ? user.name : 'Tizim',
    companyId: user ? user.companyId : null
  });
}

/* ==========================================================================
   AUTH ROUTES
   ========================================================================== */

// Register new user & company
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, companyName, businessType, tin, phone } = req.body;
    if (!email || !password || !name || !companyName) {
      return res.status(400).json({ error: 'Barcha majburiy maydonlarni to\'ldiring!' });
    }

    const existingUser = db.findOne('users', u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'Ushbu email bilan foydalanuvchi allaqachon mavjud!' });
    }

    // Create Company
    const company = db.insert('companies', {
      name: companyName,
      brandName: companyName,
      tin: tin || '30' + Math.floor(1000000 + Math.random() * 9000000),
      vatNumber: (tin || '300000000') + '001',
      businessType: businessType || 'Xizmat ko\'rsatish',
      phone: phone || '+998 90 000 00 00',
      email: email,
      director: name,
      currency: 'UZS',
      planId: 'plan_starter',
      planExpiresAt: new Date(Date.now() + 14 * 86400000).toISOString() // 14 days trial
    });

    // Create Owner User
    const user = db.insert('users', {
      name,
      email: email.toLowerCase(),
      password: authService.hashPassword(password),
      role: 'owner',
      companyId: company.id,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
    });

    // Create Default Accounts for new company
    db.insert('accounts', {
      companyId: company.id,
      name: 'Asosiy hisob raqam (UZS)',
      accountNumber: '20208000' + Math.floor(100000000000 + Math.random() * 900000000000),
      bankName: 'Kapitalbank ATB',
      type: 'bank',
      currency: 'UZS',
      balance: 10000000,
      initialBalance: 10000000,
      isDefault: true,
      color: '#06b6d4'
    });

    db.insert('accounts', {
      companyId: company.id,
      name: 'Bosh kassa (Naqd UZS)',
      accountNumber: 'KASSA-01',
      bankName: 'Ichki Kassa',
      type: 'cash',
      currency: 'UZS',
      balance: 2500000,
      initialBalance: 2500000,
      isDefault: false,
      color: '#10b981'
    });

    // Create Initial Subscription
    db.insert('subscriptions', {
      companyId: company.id,
      companyName: company.name,
      planId: 'plan_starter',
      planName: 'Boshlang\'ich (Sinov davri)',
      status: 'active',
      amount: 0,
      currency: 'UZS',
      paymentMethod: 'trial',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      autoRenew: false
    });

    auditLog('user_registered', `Yangi kompaniya va foydalanuvchi ro'yxatdan o'tdi: ${name} (${companyName})`, user);

    const token = authService.generateToken(user);
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 86400000 });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId
      },
      company
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Ro\'yxatdan o\'tishda xatolik yuz berdi: ' + err.message });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email va parolni kiriting!' });
    }

    const user = db.findOne('users', u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || !authService.comparePassword(password, user.password)) {
      return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri!' });
    }

    const company = db.findById('companies', user.companyId);
    const token = authService.generateToken(user);
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 86400000 });

    auditLog('user_login', `Foydalanuvchi tizimga kirdi: ${user.email}`, user);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId
      },
      company
    });
  } catch (err) {
    res.status(500).json({ error: 'Tizimga kirishda xatolik: ' + err.message });
  }
});

// Demo Login Shortcut (Admin, Owner, Accountant)
app.post('/api/auth/demo-login', (req, res) => {
  try {
    const { role } = req.body;
    let targetEmail = 'owner@apex.uz';
    if (role === 'superadmin' || role === 'admin') targetEmail = 'admin@balansai.uz';
    if (role === 'accountant') targetEmail = 'accountant@apex.uz';
    if (role === 'owner') targetEmail = 'owner@apex.uz';

    const user = db.findOne('users', u => u.email === targetEmail);
    if (!user) {
      return res.status(404).json({ error: 'Demo profil topilmadi!' });
    }

    const company = db.findById('companies', user.companyId);
    const token = authService.generateToken(user);
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 86400000 });

    auditLog('demo_login', `Demo rejimda kirildi: ${user.email} (${user.role})`, user);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId
      },
      company
    });
  } catch (err) {
    res.status(500).json({ error: 'Demo kirishda xatolik: ' + err.message });
  }
});

// Current Authenticated User & Company Info
app.get('/api/auth/me', authService.authenticate, (req, res) => {
  const user = db.findById('users', req.user.id);
  const company = db.findById('companies', req.user.companyId);
  const currentSub = db.findOne('subscriptions', s => s.companyId === req.user.companyId && s.status === 'active');
  const plan = currentSub ? db.findById('plans', currentSub.planId) : null;

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    },
    company,
    subscription: currentSub,
    plan
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Tizimdan muvaffaqiyatli chiqildi.' });
});

/* ==========================================================================
   DASHBOARD & STATS ROUTES
   ========================================================================== */

app.get('/api/dashboard/stats', authService.authenticate, (req, res) => {
  try {
    const companyId = req.user.companyId;
    const insights = aiService.getCompanyFinancialInsights(companyId);
    const transactions = db.find('transactions', t => t.companyId === companyId);
    const invoices = db.find('invoices', i => i.companyId === companyId);
    const accounts = db.find('accounts', a => a.companyId === companyId);

    // Prepare monthly data for ApexCharts
    const months = ['Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen'];
    const incomeSeries = [62000000, 85000000, 94000000, 110000000, 150840000, 18500000];
    const expenseSeries = [35000000, 42000000, 51000000, 64000000, 67000000, 14000000];

    // Recent 6 transactions
    const recentTransactions = transactions.slice(0, 6);

    // Unpaid invoices
    const pendingInvoices = invoices.filter(i => i.status !== 'paid').slice(0, 5);

    res.json({
      summary: {
        totalIncome: insights.totalIncome,
        totalExpense: insights.totalExpense,
        netProfit: insights.netProfit,
        profitMargin: insights.profitMargin,
        liquidCashUZS: insights.liquidCashUZS,
        totalReceivable: insights.totalReceivable,
        totalPayable: insights.totalPayable,
        healthScore: insights.healthScore,
        healthStatus: insights.healthStatus,
        cashRunwayMonths: insights.cashRunwayMonths
      },
      chartData: {
        categories: months,
        income: incomeSeries,
        expense: expenseSeries
      },
      expenseBreakdown: insights.categoryExpenses,
      recentTransactions,
      pendingInvoices,
      accounts,
      recommendations: insights.recommendations
    });
  } catch (err) {
    res.status(500).json({ error: 'Statistikani olishda xatolik: ' + err.message });
  }
});

/* ==========================================================================
   TRANSACTIONS (KIRIM / CHIQIM / O'TKAZMA)
   ========================================================================== */

app.get('/api/transactions', authService.authenticate, (req, res) => {
  try {
    const companyId = req.user.companyId;
    let list = db.find('transactions', t => t.companyId === companyId);

    const { type, category, accountId, search, startDate, endDate } = req.query;

    if (type && type !== 'all') {
      list = list.filter(t => t.type === type);
    }
    if (category && category !== 'all') {
      list = list.filter(t => t.category === category);
    }
    if (accountId && accountId !== 'all') {
      list = list.filter(t => t.accountId === accountId || t.toAccountId === accountId);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => 
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.contactName && t.contactName.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.reference && t.reference.toLowerCase().includes(q))
      );
    }
    if (startDate) {
      list = list.filter(t => t.date >= startDate);
    }
    if (endDate) {
      list = list.filter(t => t.date <= endDate);
    }

    res.json({ transactions: list });
  } catch (err) {
    res.status(500).json({ error: 'Operatsiyalarni yuklashda xatolik' });
  }
});

app.post('/api/transactions', authService.authenticate, (req, res) => {
  try {
    const companyId = req.user.companyId;
    const {
      type,
      amount,
      currency = 'UZS',
      accountId,
      toAccountId,
      category,
      contactId,
      date = new Date().toISOString().substring(0, 10),
      paymentMethod = 'bank_transfer',
      reference = '',
      taxIncluded = false,
      vatAmount = 0,
      description = ''
    } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'Iltimos, to\'g\'ri summa kiriting!' });
    }
    if (!accountId) {
      return res.status(400).json({ error: 'Hisob raqam yoki kassani tanlang!' });
    }

    const account = db.findById('accounts', accountId);
    if (!account) {
      return res.status(404).json({ error: 'Tanlangan hisob raqam topilmadi!' });
    }

    let contactName = '';
    if (contactId) {
      const contact = db.findById('contacts', contactId);
      if (contact) {
        contactName = contact.name;
        // Update contact balance
        if (type === 'income') {
          db.update('contacts', contactId, {
            currentBalance: (Number(contact.currentBalance) || 0) - numAmount,
            totalPaid: (Number(contact.totalPaid) || 0) + numAmount
          });
        } else if (type === 'expense') {
          db.update('contacts', contactId, {
            currentBalance: (Number(contact.currentBalance) || 0) + numAmount,
            totalPaid: (Number(contact.totalPaid) || 0) + numAmount
          });
        }
      }
    }

    // Update Account Balance
    if (type === 'income') {
      db.update('accounts', accountId, {
        balance: (Number(account.balance) || 0) + numAmount
      });
    } else if (type === 'expense') {
      db.update('accounts', accountId, {
        balance: (Number(account.balance) || 0) - numAmount
      });
    } else if (type === 'transfer' && toAccountId) {
      const toAccount = db.findById('accounts', toAccountId);
      if (toAccount) {
        db.update('accounts', accountId, {
          balance: (Number(account.balance) || 0) - numAmount
        });
        db.update('accounts', toAccountId, {
          balance: (Number(toAccount.balance) || 0) + numAmount
        });
      }
    }

    const newTx = db.insert('transactions', {
      companyId,
      type,
      amount: numAmount,
      currency,
      accountId,
      toAccountId: toAccountId || null,
      accountName: account.name,
      category: category || (type === 'income' ? 'Boshqa tushum' : type === 'transfer' ? 'Ichki o\'tkazma' : 'Boshqa xarajat'),
      contactId: contactId || null,
      contactName: contactName || (req.body.contactName || ''),
      date,
      paymentMethod,
      reference,
      taxIncluded: Boolean(taxIncluded),
      vatAmount: Number(vatAmount) || 0,
      description,
      status: 'completed'
    });

    auditLog('transaction_create', `Yangi ${type}: ${numAmount} ${currency} (${description})`, req.user);

    res.json({ success: true, transaction: newTx });
  } catch (err) {
    res.status(500).json({ error: 'Operatsiyani saqlashda xatolik: ' + err.message });
  }
});

app.delete('/api/transactions/:id', authService.authenticate, (req, res) => {
  try {
    const tx = db.findById('transactions', req.params.id);
    if (!tx || tx.companyId !== req.user.companyId) {
      return res.status(404).json({ error: 'Operatsiya topilmadi' });
    }

    // Revert Account Balance
    const account = db.findById('accounts', tx.accountId);
    if (account) {
      if (tx.type === 'income') {
        db.update('accounts', tx.accountId, { balance: (Number(account.balance) || 0) - Number(tx.amount) });
      } else if (tx.type === 'expense') {
        db.update('accounts', tx.accountId, { balance: (Number(account.balance) || 0) + Number(tx.amount) });
      } else if (tx.type === 'transfer' && tx.toAccountId) {
        const toAcc = db.findById('accounts', tx.toAccountId);
        db.update('accounts', tx.accountId, { balance: (Number(account.balance) || 0) + Number(tx.amount) });
        if (toAcc) db.update('accounts', tx.toAccountId, { balance: (Number(toAcc.balance) || 0) - Number(tx.amount) });
      }
    }

    db.delete('transactions', req.params.id);
    auditLog('transaction_delete', `Operatsiya o'chirildi: ${tx.id} (${tx.amount} ${tx.currency})`, req.user);

    res.json({ success: true, message: 'Operatsiya o\'chirildi va hisob balansi qayta tiklandi.' });
  } catch (err) {
    res.status(500).json({ error: 'O\'chirishda xatolik: ' + err.message });
  }
});

// CSV Export
app.get('/api/transactions/export/csv', authService.authenticate, (req, res) => {
  try {
    const companyId = req.user.companyId;
    const list = db.find('transactions', t => t.companyId === companyId);

    let csv = 'Sana,Turi,Summa,Valyuta,Kategoriya,Kontragent,Hisob,Izoh,Holati\n';
    list.forEach(t => {
      const typeStr = t.type === 'income' ? 'Kirim' : t.type === 'expense' ? 'Chiqim' : 'O\'tkazma';
      csv += `"${t.date}","${typeStr}","${t.amount}","${t.currency}","${t.category}","${t.contactName || ''}","${t.accountName}","${(t.description || '').replace(/"/g, '""')}","${t.status}"\n`;
    });

    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment(`BalansAI_Transactions_${new Date().toISOString().substring(0, 10)}.csv`);
    res.send('\uFEFF' + csv);
  } catch (err) {
    res.status(500).send('CSV eksportda xatolik');
  }
});

/* ==========================================================================
   INVOICES (HISOB-FAKTURALAR)
   ========================================================================== */

app.get('/api/invoices', authService.authenticate, (req, res) => {
  const companyId = req.user.companyId;
  const list = db.find('invoices', i => i.companyId === companyId);
  res.json({ invoices: list });
});

app.get('/api/invoices/:id', authService.authenticate, (req, res) => {
  const invoice = db.findById('invoices', req.params.id);
  if (!invoice || invoice.companyId !== req.user.companyId) {
    return res.status(404).json({ error: 'Hisob-faktura topilmadi' });
  }
  const company = db.findById('companies', invoice.companyId);
  const contact = invoice.contactId ? db.findById('contacts', invoice.contactId) : null;
  res.json({ invoice, company, contact });
});

app.post('/api/invoices', authService.authenticate, (req, res) => {
  try {
    const companyId = req.user.companyId;
    const {
      contactId,
      invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      contractNumber = `SH-${Math.floor(10 + Math.random() * 90)}/${new Date().getFullYear().toString().slice(-2)}`,
      date = new Date().toISOString().substring(0, 10),
      dueDate = new Date(Date.now() + 14 * 86400000).toISOString().substring(0, 10),
      currency = 'UZS',
      items = [],
      notes = ''
    } = req.body;

    const contact = db.findById('contacts', contactId);
    if (!contact) {
      return res.status(400).json({ error: 'Iltimos, kontragent (mijoz)ni tanlang!' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Kamida bitta tovar yoki xizmat qatorini kiriting!' });
    }

    let subtotal = 0;
    let vatTotal = 0;

    const calculatedItems = items.map(item => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice) || 0;
      const itemSubtotal = qty * price;
      const vatPercent = Number(item.vatPercent) || 12;
      const vatAmount = (itemSubtotal * vatPercent) / 100;
      const total = itemSubtotal + vatAmount;

      subtotal += itemSubtotal;
      vatTotal += vatAmount;

      return {
        productId: item.productId || null,
        name: item.name || 'Xizmat/Mahsulot',
        quantity: qty,
        unit: item.unit || 'dona',
        unitPrice: price,
        vatPercent,
        vatAmount,
        total
      };
    });

    const grandTotal = subtotal + vatTotal;

    const newInvoice = db.insert('invoices', {
      companyId,
      invoiceNumber,
      contractNumber,
      contactId,
      contactName: contact.name,
      contactTin: contact.tin || '',
      date,
      dueDate,
      currency,
      status: 'unpaid',
      items: calculatedItems,
      subtotal,
      vatTotal,
      grandTotal,
      paidAmount: 0,
      dueAmount: grandTotal,
      notes,
      createdAt: new Date().toISOString()
    });

    // Update contact's total billed & current balance
    db.update('contacts', contactId, {
      totalBilled: (Number(contact.totalBilled) || 0) + grandTotal,
      currentBalance: (Number(contact.currentBalance) || 0) + grandTotal
    });

    auditLog('invoice_create', `Yangi hisob-faktura yaratildi: ${invoiceNumber} (${grandTotal} ${currency}) - ${contact.name}`, req.user);

    res.json({ success: true, invoice: newInvoice });
  } catch (err) {
    res.status(500).json({ error: 'Hisob-fakturani yaratishda xatolik: ' + err.message });
  }
});

// Pay invoice
app.post('/api/invoices/:id/pay', authService.authenticate, (req, res) => {
  try {
    const invoice = db.findById('invoices', req.params.id);
    if (!invoice || invoice.companyId !== req.user.companyId) {
      return res.status(404).json({ error: 'Hisob-faktura topilmadi' });
    }

    const { amount, accountId, paymentMethod = 'bank_transfer', date = new Date().toISOString().substring(0, 10) } = req.body;
    const payAmount = Number(amount) || Number(invoice.dueAmount);

    const account = db.findById('accounts', accountId);
    if (!account) {
      return res.status(400).json({ error: 'To\'lov tushadigan hisob raqamni tanlang!' });
    }

    const newPaidAmount = (Number(invoice.paidAmount) || 0) + payAmount;
    const newDueAmount = Math.max(0, (Number(invoice.grandTotal) || 0) - newPaidAmount);
    const newStatus = newDueAmount === 0 ? 'paid' : 'partial';

    // Update invoice
    db.update('invoices', invoice.id, {
      paidAmount: newPaidAmount,
      dueAmount: newDueAmount,
      status: newStatus
    });

    // Create Income Transaction
    db.insert('transactions', {
      companyId: req.user.companyId,
      type: 'income',
      amount: payAmount,
      currency: invoice.currency,
      accountId,
      accountName: account.name,
      category: 'Hisob-faktura to\'lovi',
      contactId: invoice.contactId,
      contactName: invoice.contactName,
      date,
      paymentMethod,
      reference: `${invoice.invoiceNumber} to'lovi`,
      taxIncluded: true,
      vatAmount: (payAmount * 12) / 112,
      description: `${invoice.invoiceNumber} hisob-faktura bo'yicha to'lov qabul qilindi`,
      status: 'completed'
    });

    // Update Account Balance
    db.update('accounts', accountId, {
      balance: (Number(account.balance) || 0) + payAmount
    });

    // Update Contact Balance
    if (invoice.contactId) {
      const contact = db.findById('contacts', invoice.contactId);
      if (contact) {
        db.update('contacts', invoice.contactId, {
          totalPaid: (Number(contact.totalPaid) || 0) + payAmount,
          currentBalance: Math.max(0, (Number(contact.currentBalance) || 0) - payAmount)
        });
      }
    }

    auditLog('invoice_paid', `Hisob-faktura to'landi: ${invoice.invoiceNumber} (+${payAmount} ${invoice.currency})`, req.user);

    res.json({ success: true, message: 'To\'lov muvaffaqiyatli qabul qilindi va hisob balansi yangilandi.' });
  } catch (err) {
    res.status(500).json({ error: 'To\'lovni qayd qilishda xatolik: ' + err.message });
  }
});

// Delete invoice
app.delete('/api/invoices/:id', authService.authenticate, (req, res) => {
  try {
    const invoice = db.findById('invoices', req.params.id);
    if (!invoice || invoice.companyId !== req.user.companyId) {
      return res.status(404).json({ error: 'Hisob-faktura topilmadi' });
    }
    db.delete('invoices', req.params.id);
    auditLog('invoice_delete', `Hisob-faktura o'chirildi: ${invoice.invoiceNumber}`, req.user);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'O\'chirishda xatolik' });
  }
});

/* ==========================================================================
   CONTACTS (KONTRAGENTLAR - MIJOZLAR VA YETKAZIB BERUVCHILAR)
   ========================================================================== */

app.get('/api/contacts', authService.authenticate, (req, res) => {
  const list = db.find('contacts', c => c.companyId === req.user.companyId);
  res.json({ contacts: list });
});

app.post('/api/contacts', authService.authenticate, (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { name, type = 'client', tin, phone, email, address, bankName, bankAccount, mfo } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Kontragent nomini kiriting!' });
    }

    const newContact = db.insert('contacts', {
      companyId,
      name,
      type, // client | vendor
      tin: tin || '',
      phone: phone || '',
      email: email || '',
      address: address || '',
      bankName: bankName || '',
      bankAccount: bankAccount || '',
      mfo: mfo || '',
      totalBilled: 0,
      totalPaid: 0,
      currentBalance: 0,
      status: 'active'
    });

    auditLog('contact_create', `Yangi kontragent qo'shildi: ${name} (${type})`, req.user);
    res.json({ success: true, contact: newContact });
  } catch (err) {
    res.status(500).json({ error: 'Kontragentni saqlashda xatolik' });
  }
});

app.get('/api/contacts/:id/statement', authService.authenticate, (req, res) => {
  const contact = db.findById('contacts', req.params.id);
  if (!contact || contact.companyId !== req.user.companyId) {
    return res.status(404).json({ error: 'Kontragent topilmadi' });
  }
  const company = db.findById('companies', contact.companyId);
  const transactions = db.find('transactions', t => t.companyId === contact.companyId && t.contactId === contact.id);
  const invoices = db.find('invoices', i => i.companyId === contact.companyId && i.contactId === contact.id);

  res.json({
    contact,
    company,
    transactions,
    invoices
  });
});

app.delete('/api/contacts/:id', authService.authenticate, (req, res) => {
  db.delete('contacts', req.params.id);
  res.json({ success: true });
});

/* ==========================================================================
   ACCOUNTS & CASH REGISTERS (BANK VA KASSA)
   ========================================================================== */

app.get('/api/accounts', authService.authenticate, (req, res) => {
  const list = db.find('accounts', a => a.companyId === req.user.companyId);
  res.json({ accounts: list });
});

app.post('/api/accounts', authService.authenticate, (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { name, accountNumber, bankName, type = 'bank', currency = 'UZS', balance = 0, color = '#06b6d4' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Hisob nomini kiriting!' });
    }

    const newAcc = db.insert('accounts', {
      companyId,
      name,
      accountNumber: accountNumber || '20208000' + Math.floor(100000000000 + Math.random() * 900000000000),
      bankName: bankName || 'Bank',
      type, // bank | cash | card | deposit
      currency,
      balance: Number(balance) || 0,
      initialBalance: Number(balance) || 0,
      color,
      isDefault: false
    });

    auditLog('account_create', `Yangi hisob yaratildi: ${name} (${balance} ${currency})`, req.user);
    res.json({ success: true, account: newAcc });
  } catch (err) {
    res.status(500).json({ error: 'Hisobni yaratishda xatolik' });
  }
});

/* ==========================================================================
   PRODUCTS & SERVICES CATALOG (MAHSULOTLAR VA XIZMATLAR)
   ========================================================================== */

app.get('/api/products', authService.authenticate, (req, res) => {
  const list = db.find('products', p => p.companyId === req.user.companyId);
  res.json({ products: list });
});

app.post('/api/products', authService.authenticate, (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { name, sku, type = 'service', unit = 'dona', price = 0, costPrice = 0, vatRate = 12, stock = null, description = '' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nomi kiritilishi shart!' });
    }

    const newProd = db.insert('products', {
      companyId,
      name,
      sku: sku || 'SKU-' + Math.floor(1000 + Math.random() * 9000),
      type, // product | service
      unit,
      price: Number(price) || 0,
      costPrice: Number(costPrice) || 0,
      vatRate: Number(vatRate) || 12,
      stock: type === 'product' ? (Number(stock) || 0) : null,
      description
    });

    auditLog('product_create', `Yangi mahsulot/xizmat: ${name}`, req.user);
    res.json({ success: true, product: newProd });
  } catch (err) {
    res.status(500).json({ error: 'Mahsulotni saqlashda xatolik' });
  }
});

app.delete('/api/products/:id', authService.authenticate, (req, res) => {
  db.delete('products', req.params.id);
  res.json({ success: true });
});

/* ==========================================================================
   FINANCIAL REPORTS (P&L, PUL OQIMI, BALANS, SOLIQ)
   ========================================================================== */

app.get('/api/reports/pnl', authService.authenticate, (req, res) => {
  try {
    const companyId = req.user.companyId;
    const transactions = db.find('transactions', t => t.companyId === companyId);

    const revenue = {
      services: 0,
      sales: 0,
      other: 0,
      total: 0
    };

    const cogs = {
      directCosts: 0,
      subcontractors: 0,
      total: 0
    };

    const opex = {
      salaries: 0,
      rent: 0,
      infrastructure: 0,
      marketing: 0,
      taxes: 0,
      other: 0,
      total: 0
    };

    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        revenue.total += amt;
        if (t.category.includes('Xizmat') || t.category.includes('IT')) revenue.services += amt;
        else if (t.category.includes('savdo') || t.category.includes('Mahsulot')) revenue.sales += amt;
        else revenue.other += amt;
      } else if (t.type === 'expense') {
        if (t.category.includes('Ish haqi')) {
          opex.salaries += amt;
        } else if (t.category.includes('Ijara') || t.category.includes('Ofis')) {
          opex.rent += amt;
        } else if (t.category.includes('Server') || t.category.includes('IT')) {
          opex.infrastructure += amt;
        } else if (t.category.includes('Marketing') || t.category.includes('Reklama')) {
          opex.marketing += amt;
        } else if (t.category.includes('Soliq')) {
          opex.taxes += amt;
        } else {
          opex.other += amt;
        }
        opex.total += amt;
      }
    });

    const grossProfit = revenue.total - cogs.total;
    const operatingProfit = grossProfit - opex.total;
    const netProfit = operatingProfit;
    const margin = revenue.total > 0 ? ((netProfit / revenue.total) * 100).toFixed(1) : 0;

    res.json({
      period: '2026-yil Q3 (Iyul - Sentabr)',
      revenue,
      cogs,
      grossProfit,
      opex,
      operatingProfit,
      netProfit,
      margin
    });
  } catch (err) {
    res.status(500).json({ error: 'Hisobotni hisoblashda xatolik' });
  }
});

/* ==========================================================================
   AI CFO & SUN'IY INTELLEKT MASLAHAT ROUTES
   ========================================================================== */

app.get('/api/ai/insights', authService.authenticate, (req, res) => {
  try {
    const insights = aiService.getCompanyFinancialInsights(req.user.companyId);
    res.json(insights);
  } catch (err) {
    res.status(500).json({ error: 'AI ma\'lumotlarini tahlil qilishda xatolik: ' + err.message });
  }
});

app.get('/api/ai/chat', authService.authenticate, (req, res) => {
  const history = db.find('ai_chats', c => c.companyId === req.user.companyId);
  res.json({ history });
});

app.post('/api/ai/chat', authService.authenticate, (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Iltimos, xabar matnini kiriting!' });
    }

    const result = aiService.processAIChat(req.user.companyId, message);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'AI javob berishda xatolik yuz berdi: ' + err.message });
  }
});

app.delete('/api/ai/chat', authService.authenticate, (req, res) => {
  const all = db.getCollection('ai_chats');
  const filtered = all.filter(c => c.companyId !== req.user.companyId);
  db.saveCollection('ai_chats', filtered);
  res.json({ success: true, message: 'AI chat tarixi tozalandi.' });
});

/* ==========================================================================
   PRICING, PLANS & SUBSCRIPTIONS (PULLIK TARIFLAR & CHECKOUT)
   ========================================================================== */

app.get('/api/plans', (req, res) => {
  const plans = db.getCollection('plans');
  res.json({ plans });
});

app.get('/api/subscriptions/current', authService.authenticate, (req, res) => {
  const companyId = req.user.companyId;
  const sub = db.findOne('subscriptions', s => s.companyId === companyId && s.status === 'active');
  const plan = sub ? db.findById('plans', sub.planId) : null;
  res.json({ subscription: sub, plan });
});

app.post('/api/subscriptions/checkout', authService.authenticate, (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { planId, paymentMethod = 'payme', periodMonths = 1 } = req.body;

    const plan = db.findById('plans', planId);
    if (!plan) {
      return res.status(404).json({ error: 'Tanlangan tarif rejasi topilmadi!' });
    }

    const totalAmount = plan.price * Number(periodMonths);
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + periodMonths * 30 * 86400000).toISOString();

    // Deactivate previous active subscription
    const existingSubs = db.find('subscriptions', s => s.companyId === companyId);
    existingSubs.forEach(s => {
      if (s.status === 'active') db.update('subscriptions', s.id, { status: 'expired' });
    });

    // Create new active subscription
    const company = db.findById('companies', companyId);
    const newSub = db.insert('subscriptions', {
      companyId,
      companyName: company ? company.name : 'Kompaniya',
      planId: plan.id,
      planName: plan.name,
      status: 'active',
      amount: totalAmount,
      currency: 'UZS',
      paymentMethod,
      startDate,
      endDate,
      autoRenew: true
    });

    // Update company record
    db.update('companies', companyId, {
      planId: plan.id,
      planExpiresAt: endDate
    });

    auditLog('subscription_purchased', `Tarif yangilandi: ${plan.name} (${totalAmount} UZS, ${paymentMethod})`, req.user);

    res.json({
      success: true,
      message: `Tabriklaymiz! "${plan.name}" tarifi muvaffaqiyatli faollashtirildi!`,
      subscription: newSub
    });
  } catch (err) {
    res.status(500).json({ error: 'Obunani rasmiylashtirishda xatolik: ' + err.message });
  }
});

/* ==========================================================================
   SUPERADMIN PANEL ROUTES
   ========================================================================== */

app.get('/api/admin/metrics', authService.authenticate, authService.requireAdmin, (req, res) => {
  try {
    const companies = db.getCollection('companies');
    const users = db.getCollection('users');
    const transactions = db.getCollection('transactions');
    const subscriptions = db.getCollection('subscriptions');

    let totalVolumeUZS = 0;
    transactions.forEach(t => {
      totalVolumeUZS += Number(t.amount) || 0;
    });

    let mrrUZS = 0;
    subscriptions.filter(s => s.status === 'active').forEach(s => {
      mrrUZS += Number(s.amount) || 0;
    });

    res.json({
      totalCompanies: companies.length,
      totalUsers: users.length,
      totalTransactionsCount: transactions.length,
      totalTransactionVolumeUZS: totalVolumeUZS,
      mrrUZS,
      activeSubscriptionsCount: subscriptions.filter(s => s.status === 'active').length
    });
  } catch (err) {
    res.status(500).json({ error: 'Admin statistikasini olishda xatolik' });
  }
});

app.get('/api/admin/companies', authService.authenticate, authService.requireAdmin, (req, res) => {
  const companies = db.getCollection('companies');
  const subscriptions = db.getCollection('subscriptions');
  const plans = db.getCollection('plans');

  const detailed = companies.map(c => {
    const sub = subscriptions.find(s => s.companyId === c.id && s.status === 'active');
    const plan = sub ? plans.find(p => p.id === sub.planId) : null;
    return {
      ...c,
      currentPlan: plan ? plan.name : 'Standart',
      subscriptionStatus: sub ? sub.status : 'inactive'
    };
  });

  res.json({ companies: detailed });
});

app.put('/api/admin/companies/:id/plan', authService.authenticate, authService.requireAdmin, (req, res) => {
  const { planId, days = 30 } = req.body;
  const company = db.findById('companies', req.params.id);
  if (!company) return res.status(404).json({ error: 'Kompaniya topilmadi' });

  const plan = db.findById('plans', planId);
  const newExpires = new Date(Date.now() + days * 86400000).toISOString();

  db.update('companies', company.id, {
    planId,
    planExpiresAt: newExpires
  });

  db.insert('subscriptions', {
    companyId: company.id,
    companyName: company.name,
    planId,
    planName: plan ? plan.name : 'Maxsus',
    status: 'active',
    amount: 0,
    currency: 'UZS',
    paymentMethod: 'admin_grant',
    startDate: new Date().toISOString(),
    endDate: newExpires,
    autoRenew: false
  });

  auditLog('admin_plan_grant', `Admin tomonidan ${company.name} ga "${plan ? plan.name : planId}" tarifi berildi`, req.user);
  res.json({ success: true, message: 'Tarif yangilandi!' });
});

app.get('/api/admin/logs', authService.authenticate, authService.requireAdmin, (req, res) => {
  const logs = db.getCollection('logs');
  res.json({ logs });
});

app.get('/api/admin/settings', authService.authenticate, authService.requireAdmin, (req, res) => {
  res.json({ settings: db.getSettings() });
});

app.put('/api/admin/settings', authService.authenticate, authService.requireAdmin, (req, res) => {
  const updated = db.updateSettings(req.body);
  auditLog('admin_settings_update', 'Tizim global sozlamalari yangilandi', req.user);
  res.json({ success: true, settings: updated });
});

// Database Export/Import Backup
app.get('/api/admin/backup/export', authService.authenticate, authService.requireAdmin, (req, res) => {
  const backup = {
    timestamp: new Date().toISOString(),
    users: db.getCollection('users'),
    companies: db.getCollection('companies'),
    transactions: db.getCollection('transactions'),
    invoices: db.getCollection('invoices'),
    contacts: db.getCollection('contacts'),
    accounts: db.getCollection('accounts'),
    products: db.getCollection('products'),
    plans: db.getCollection('plans'),
    subscriptions: db.getCollection('subscriptions'),
    settings: db.getSettings()
  };
  res.header('Content-Type', 'application/json');
  res.attachment(`BalansAI_Backup_${new Date().toISOString().substring(0, 10)}.json`);
  res.send(JSON.stringify(backup, null, 2));
});

// Serve frontend SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 BalansAI Smart SaaS Server is running!`);
  console.log(`🌐 Live URL: http://0.0.0.0:${PORT}`);
  console.log(`💼 Ready for Uzbekistan & Global Financial Operations`);
  console.log(`====================================================`);
});
