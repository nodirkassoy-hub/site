const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to get file path
function getFilePath(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

// Read JSON file safely
function readJSON(collection, defaultValue = []) {
  const filePath = getFilePath(collection);
  try {
    if (!fs.existsSync(filePath)) {
      writeJSON(collection, defaultValue);
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error(`Error reading ${collection}.json:`, err.message);
    return defaultValue;
  }
}

// Write JSON file safely with atomic temp file
function writeJSON(collection, data) {
  const filePath = getFilePath(collection);
  const tempPath = `${filePath}.tmp`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (err) {
    console.error(`Error writing ${collection}.json:`, err.message);
    return false;
  }
}

// Generic DB methods
const db = {
  getCollection(name) {
    return readJSON(name, []);
  },

  saveCollection(name, data) {
    return writeJSON(name, data);
  },

  find(collection, predicate) {
    const list = readJSON(collection, []);
    if (!predicate) return list;
    return list.filter(predicate);
  },

  findOne(collection, predicate) {
    const list = readJSON(collection, []);
    return list.find(predicate) || null;
  },

  findById(collection, id) {
    const list = readJSON(collection, []);
    return list.find(item => item.id === id) || null;
  },

  insert(collection, item) {
    const list = readJSON(collection, []);
    if (!item.id) {
      item.id = 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }
    item.createdAt = item.createdAt || new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    list.unshift(item);
    writeJSON(collection, list);
    return item;
  },

  update(collection, id, updates) {
    const list = readJSON(collection, []);
    const index = list.findIndex(item => item.id === id);
    if (index === -1) return null;
    list[index] = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    writeJSON(collection, list);
    return list[index];
  },

  delete(collection, id) {
    let list = readJSON(collection, []);
    const initialLen = list.length;
    list = list.filter(item => item.id !== id);
    if (list.length !== initialLen) {
      writeJSON(collection, list);
      return true;
    }
    return false;
  },

  getSettings() {
    return readJSON('settings', {
      siteName: 'BalansAI',
      currency: 'UZS',
      exchangeRates: { USD: 12850, EUR: 13900, RUB: 142 },
      vatRate: 12, // 12% QQS O'zbekistonda
      turnoverTaxRate: 4, // 4% aylanma soliq
      profitTaxRate: 15,
      aiModel: 'BalansAI Smart CFO v4.5',
      aiFeaturesEnabled: true,
      maintenanceMode: false
    });
  },

  updateSettings(newSettings) {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings, updatedAt: new Date().toISOString() };
    writeJSON('settings', updated);
    return updated;
  },

  addLog(logData) {
    const logs = readJSON('logs', []);
    const logItem = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      ...logData
    };
    logs.unshift(logItem);
    // Keep max 500 logs
    if (logs.length > 500) logs.length = 500;
    writeJSON('logs', logs);
    return logItem;
  }
};

// Initial Database Seeding function
function seedInitialData() {
  const users = readJSON('users', []);
  if (users.length > 0) return; // Already seeded

  console.log('Seeding initial financial & business database for BalansAI...');

  const passwordHash = bcrypt.hashSync('admin123', 10);
  const ownerPasswordHash = bcrypt.hashSync('demo123', 10);

  // 1. Initial Companies
  const companies = [
    {
      id: 'comp_01',
      name: 'Apex Innovations MChJ',
      brandName: 'Apex Soft & Tech',
      tin: '309812745', // STIR
      vatNumber: '309812745001',
      businessType: 'IT & Dasturiy Ta\'minot',
      address: 'Toshkent sh., Mirzo Ulug\'bek tumani, Mustaqillik shoh ko\'chasi 105',
      phone: '+998 71 200 45 45',
      email: 'finance@apex-soft.uz',
      director: 'Nodirbek Qosimov',
      accountant: 'Aziza Rahimova',
      bankName: 'Kapitalbank ATB',
      bankAccount: '20208000700543219001',
      mfo: '01036',
      currency: 'UZS',
      planId: 'plan_pro',
      planExpiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
      createdAt: '2026-01-10T10:00:00Z'
    },
    {
      id: 'comp_02',
      name: 'SilkRoad Logistics XK',
      brandName: 'SilkRoad Express',
      tin: '208491562',
      vatNumber: '208491562002',
      businessType: 'Logistika va Yuk tashish',
      address: 'Toshkent sh., Sergeli tumani, Yangi Sergeli ko\'chasi 24',
      phone: '+998 90 123 45 67',
      email: 'info@silkroad-express.uz',
      director: 'Javohir Alimov',
      accountant: 'Dilnoza Karimova',
      bankName: 'Ipoteka Bank',
      bankAccount: '20208000900123456001',
      mfo: '00425',
      currency: 'UZS',
      planId: 'plan_starter',
      planExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      createdAt: '2026-02-01T12:00:00Z'
    }
  ];
  writeJSON('companies', companies);

  // 2. Initial Users
  const seedUsers = [
    {
      id: 'user_admin',
      name: 'Super Administrator',
      email: 'admin@balansai.uz',
      password: passwordHash,
      role: 'superadmin',
      companyId: 'comp_01',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      createdAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'user_owner',
      name: 'Nodirbek Qosimov (Direktor)',
      email: 'owner@apex.uz',
      password: ownerPasswordHash,
      role: 'owner',
      companyId: 'comp_01',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      createdAt: '2026-01-10T10:00:00Z'
    },
    {
      id: 'user_accountant',
      name: 'Aziza Rahimova (Bosh Buxgalter)',
      email: 'accountant@apex.uz',
      password: ownerPasswordHash,
      role: 'accountant',
      companyId: 'comp_01',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      createdAt: '2026-01-15T11:00:00Z'
    }
  ];
  writeJSON('users', seedUsers);

  // 3. Bank & Cash Accounts for comp_01
  const accounts = [
    {
      id: 'acc_01',
      companyId: 'comp_01',
      name: 'Asosiy hisob raqam (Kapitalbank UZS)',
      accountNumber: '20208000700543219001',
      bankName: 'Kapitalbank ATB',
      type: 'bank',
      currency: 'UZS',
      balance: 184500000,
      initialBalance: 120000000,
      isDefault: true,
      color: '#06b6d4'
    },
    {
      id: 'acc_02',
      companyId: 'comp_01',
      name: 'Valyuta hisob raqami (USD)',
      accountNumber: '20208840300543219002',
      bankName: 'Kapitalbank ATB',
      type: 'bank',
      currency: 'USD',
      balance: 14200,
      initialBalance: 10000,
      isDefault: false,
      color: '#3b82f6'
    },
    {
      id: 'acc_03',
      companyId: 'comp_01',
      name: 'Bosh kassa (Naqd pul UZS)',
      accountNumber: 'KASSA-01',
      bankName: 'Ichki Kassa',
      type: 'cash',
      currency: 'UZS',
      balance: 24800000,
      initialBalance: 15000000,
      isDefault: false,
      color: '#10b981'
    },
    {
      id: 'acc_04',
      companyId: 'comp_01',
      name: 'Korporativ Karta (Uzcard/Humo)',
      accountNumber: '8600 45** **** 9102',
      bankName: 'Kapitalbank ATB',
      type: 'card',
      currency: 'UZS',
      balance: 8750000,
      initialBalance: 5000000,
      isDefault: false,
      color: '#8b5cf6'
    }
  ];
  writeJSON('accounts', accounts);

  // 4. Contacts (Clients & Vendors)
  const contacts = [
    {
      id: 'cont_01',
      companyId: 'comp_01',
      name: 'Universal Trade Group MChJ',
      type: 'client',
      tin: '305912441',
      phone: '+998 71 230 11 22',
      email: 'finance@utg.uz',
      address: 'Toshkent sh., Shayxontohur tumani',
      bankName: 'O\'zsanoatqurilishbank',
      bankAccount: '20208000100445566001',
      mfo: '00440',
      totalBilled: 145000000,
      totalPaid: 120000000,
      currentBalance: 25000000, // Debitorlik qarzimiz bor
      status: 'active'
    },
    {
      id: 'cont_02',
      companyId: 'comp_01',
      name: 'NextGen Retail XK',
      type: 'client',
      tin: '207883912',
      phone: '+998 90 998 77 66',
      email: 'accounting@nextgen.uz',
      address: 'Toshkent sh., Chilonzor tumani',
      bankName: 'Ipak Yo\'li Banki',
      bankAccount: '20208000200887766001',
      mfo: '00892',
      totalBilled: 98000000,
      totalPaid: 98000000,
      currentBalance: 0,
      status: 'active'
    },
    {
      id: 'cont_03',
      companyId: 'comp_01',
      name: 'CloudServers DataCenter MChJ',
      type: 'vendor',
      tin: '308119200',
      phone: '+998 78 140 00 90',
      email: 'billing@cloudservers.uz',
      address: 'Toshkent sh., Yunusobod tumani',
      bankName: 'Hamkorbank',
      bankAccount: '20208000300998877001',
      mfo: '00083',
      totalBilled: 36000000,
      totalPaid: 28000000,
      currentBalance: -8000000, // Kreditorlik qarzi (biz to'lashimiz kerak)
      status: 'active'
    },
    {
      id: 'cont_04',
      companyId: 'comp_01',
      name: 'Orient Property Management (Ofis ijarasi)',
      type: 'vendor',
      tin: '301294851',
      phone: '+998 71 205 33 44',
      email: 'rent@orient-plaza.uz',
      address: 'Toshkent sh., Mirzo Ulug\'bek tumani',
      bankName: 'NBU O\'zmilliybank',
      bankAccount: '20208000400112233001',
      mfo: '00450',
      totalBilled: 42000000,
      totalPaid: 42000000,
      currentBalance: 0,
      status: 'active'
    },
    {
      id: 'cont_05',
      companyId: 'comp_01',
      name: 'MediaPro Marketing Agentligi',
      type: 'vendor',
      tin: '309991122',
      phone: '+998 97 700 88 99',
      email: 'pay@mediapro.uz',
      address: 'Toshkent sh., Yakkasaroy tumani',
      bankName: 'Aloqabank',
      bankAccount: '20208000500778899001',
      mfo: '00759',
      totalBilled: 18000000,
      totalPaid: 15000000,
      currentBalance: -3000000,
      status: 'active'
    }
  ];
  writeJSON('contacts', contacts);

  // 5. Products / Services Catalog
  const products = [
    {
      id: 'prod_01',
      companyId: 'comp_01',
      name: 'Korporativ ERP & CRM dasturiy ta\'minotini ishlab chiqish',
      sku: 'SRV-ERP-01',
      type: 'service',
      unit: 'loyiha',
      price: 65000000,
      costPrice: 32000000,
      vatRate: 12,
      stock: null,
      description: 'Kompaniyalar uchun maxsus ishlab chiqiladigan kompleks avtomatlashtirish tizimi'
    },
    {
      id: 'prod_02',
      companyId: 'comp_01',
      name: 'Oylik IT Texnik qo\'llab-quvvatlash va Cloud SLA',
      sku: 'SRV-SLA-M',
      type: 'service',
      unit: 'oy',
      price: 12000000,
      costPrice: 4500000,
      vatRate: 12,
      stock: null,
      description: '24/7 serverlar monitoringi, xavfsizlik va zaxira nusxalar olish xizmati'
    },
    {
      id: 'prod_03',
      companyId: 'comp_01',
      name: 'Sun\'iy intellekt (AI) Bot & Avtomatlashtirish moduli',
      sku: 'SRV-AI-BOT',
      type: 'service',
      unit: 'dona',
      price: 28000000,
      costPrice: 11000000,
      vatRate: 12,
      stock: null,
      description: 'Telegram va Web uchun biznes jarayonlarini avtomatlashtiruvchi AI chatbot'
    },
    {
      id: 'prod_04',
      companyId: 'comp_01',
      name: 'POS Terminal va Smart Kassa uskunasi V2',
      sku: 'HW-POS-900',
      type: 'product',
      unit: 'dona',
      price: 4500000,
      costPrice: 3100000,
      vatRate: 12,
      stock: 45,
      description: 'Fiskal modulli, NFC va QR to\'lovlarni qo\'llab-quvvatlovchi zamonaviy kassa uskunasi'
    }
  ];
  writeJSON('products', products);

  // 6. Invoices (Hisob-fakturalar)
  const invoices = [
    {
      id: 'inv_1001',
      companyId: 'comp_01',
      invoiceNumber: 'INV-2026-0089',
      contractNumber: 'SH-45/26',
      contactId: 'cont_01',
      contactName: 'Universal Trade Group MChJ',
      contactTin: '305912441',
      date: '2026-08-20',
      dueDate: '2026-09-10',
      currency: 'UZS',
      status: 'unpaid', // unpaid, paid, partial, overdue
      items: [
        {
          productId: 'prod_01',
          name: 'Korporativ ERP tizimi (1-bosqich)',
          quantity: 1,
          unit: 'loyiha',
          unitPrice: 65000000,
          vatPercent: 12,
          vatAmount: 7800000,
          total: 72800000
        }
      ],
      subtotal: 65000000,
      vatTotal: 7800000,
      grandTotal: 72800000,
      paidAmount: 47800000,
      dueAmount: 25000000,
      notes: 'To\'lov shartnomaning 4.2-bandiga asosan bank hisob raqamiga o\'tkazilsin.',
      createdAt: '2026-08-20T14:30:00Z'
    },
    {
      id: 'inv_1002',
      companyId: 'comp_01',
      invoiceNumber: 'INV-2026-0088',
      contractNumber: 'SH-29/26',
      contactId: 'cont_02',
      contactName: 'NextGen Retail XK',
      contactTin: '207883912',
      date: '2026-08-15',
      dueDate: '2026-08-25',
      currency: 'UZS',
      status: 'paid',
      items: [
        {
          productId: 'prod_03',
          name: 'Sun\'iy intellekt (AI) Bot & Avtomatlashtirish moduli',
          quantity: 2,
          unit: 'dona',
          unitPrice: 28000000,
          vatPercent: 12,
          vatAmount: 6720000,
          total: 62720000
        },
        {
          productId: 'prod_02',
          name: 'Oylik IT Texnik qo\'llab-quvvatlash',
          quantity: 3,
          unit: 'oy',
          unitPrice: 12000000,
          vatPercent: 12,
          vatAmount: 4320000,
          total: 40320000
        }
      ],
      subtotal: 92000000,
      vatTotal: 11040000,
      grandTotal: 103040000,
      paidAmount: 103040000,
      dueAmount: 0,
      notes: 'Bajarilgan ishlar to\'liq qabul qilindi.',
      createdAt: '2026-08-15T09:15:00Z'
    },
    {
      id: 'inv_1003',
      companyId: 'comp_01',
      invoiceNumber: 'INV-2026-0090',
      contractNumber: 'SH-52/26',
      contactId: 'cont_01',
      contactName: 'Universal Trade Group MChJ',
      contactTin: '305912441',
      date: '2026-09-02',
      dueDate: '2026-09-16',
      currency: 'UZS',
      status: 'sent',
      items: [
        {
          productId: 'prod_02',
          name: 'Oylik IT Texnik qo\'llab-quvvatlash va Cloud SLA (Sentabr)',
          quantity: 1,
          unit: 'oy',
          unitPrice: 12000000,
          vatPercent: 12,
          vatAmount: 1440000,
          total: 13440000
        }
      ],
      subtotal: 12000000,
      vatTotal: 1440000,
      grandTotal: 13440000,
      paidAmount: 0,
      dueAmount: 13440000,
      notes: 'E-faktura tizimi orqali imzolash uchun yuborildi.',
      createdAt: '2026-09-02T10:00:00Z'
    }
  ];
  writeJSON('invoices', invoices);

  // 7. Transactions (Kirim / Chiqim / Transfer)
  const transactions = [
    {
      id: 'tx_01',
      companyId: 'comp_01',
      type: 'income', // income | expense | transfer
      amount: 103040000,
      currency: 'UZS',
      accountId: 'acc_01',
      accountName: 'Asosiy hisob raqam (Kapitalbank UZS)',
      category: 'Xizmat ko\'rsatish tushumi',
      contactId: 'cont_02',
      contactName: 'NextGen Retail XK',
      date: '2026-08-25',
      paymentMethod: 'bank_transfer',
      reference: 'INV-2026-0088 to\'lovi',
      taxIncluded: true,
      vatAmount: 11040000,
      description: 'NextGen Retail uchun AI bot va qo\'llab-quvvatlash to\'lovi',
      status: 'completed',
      createdAt: '2026-08-25T15:20:00Z'
    },
    {
      id: 'tx_02',
      companyId: 'comp_01',
      type: 'income',
      amount: 47800000,
      currency: 'UZS',
      accountId: 'acc_01',
      accountName: 'Asosiy hisob raqam (Kapitalbank UZS)',
      category: 'Avans tushumi',
      contactId: 'cont_01',
      contactName: 'Universal Trade Group MChJ',
      date: '2026-08-22',
      paymentMethod: 'bank_transfer',
      reference: 'INV-2026-0089 avans',
      taxIncluded: true,
      vatAmount: 5121428,
      description: 'ERP tizimi 1-bosqich uchun 65% avans to\'lovi',
      status: 'completed',
      createdAt: '2026-08-22T11:45:00Z'
    },
    {
      id: 'tx_03',
      companyId: 'comp_01',
      type: 'expense',
      amount: 38500000,
      currency: 'UZS',
      accountId: 'acc_01',
      accountName: 'Asosiy hisob raqam (Kapitalbank UZS)',
      category: 'Ish haqi va Mukofotlar',
      contactId: null,
      contactName: 'Xodimlar oylik maoshi',
      date: '2026-08-31',
      paymentMethod: 'bank_transfer',
      reference: 'Maosh Reestr-08/26',
      taxIncluded: false,
      vatAmount: 0,
      description: 'Avgust oyi uchun dasturchilar va jamoa ish haqi to\'lovi',
      status: 'completed',
      createdAt: '2026-08-31T17:00:00Z'
    },
    {
      id: 'tx_04',
      companyId: 'comp_01',
      type: 'expense',
      amount: 14000000,
      currency: 'UZS',
      accountId: 'acc_01',
      accountName: 'Asosiy hisob raqam (Kapitalbank UZS)',
      category: 'Ofis ijarasi va Kommunal',
      contactId: 'cont_04',
      contactName: 'Orient Property Management',
      date: '2026-09-01',
      paymentMethod: 'bank_transfer',
      reference: 'Ijara SH-12/26',
      taxIncluded: true,
      vatAmount: 1500000,
      description: 'Sentabr oyi ofis ijarasi uchun to\'lov',
      status: 'completed',
      createdAt: '2026-09-01T09:30:00Z'
    },
    {
      id: 'tx_05',
      companyId: 'comp_01',
      type: 'expense',
      amount: 9800000,
      currency: 'UZS',
      accountId: 'acc_01',
      accountName: 'Asosiy hisob raqam (Kapitalbank UZS)',
      category: 'Serverlar va IT Infratuzilma',
      contactId: 'cont_03',
      contactName: 'CloudServers DataCenter MChJ',
      date: '2026-08-28',
      paymentMethod: 'bank_transfer',
      reference: 'Hisob-2910',
      taxIncluded: true,
      vatAmount: 1050000,
      description: 'Bulutli serverlar va Kubernetes klaster lizingi',
      status: 'completed',
      createdAt: '2026-08-28T14:10:00Z'
    },
    {
      id: 'tx_06',
      companyId: 'comp_01',
      type: 'expense',
      amount: 7500000,
      currency: 'UZS',
      accountId: 'acc_04',
      accountName: 'Korporativ Karta (Uzcard/Humo)',
      category: 'Marketing va Reklama',
      contactId: 'cont_05',
      contactName: 'MediaPro Marketing Agentligi',
      date: '2026-08-29',
      paymentMethod: 'card',
      reference: 'Meta & Google Ads',
      taxIncluded: false,
      vatAmount: 0,
      description: 'Target reklama va SMM kampaniyasi xarajatlari',
      status: 'completed',
      createdAt: '2026-08-29T16:00:00Z'
    },
    {
      id: 'tx_07',
      companyId: 'comp_01',
      type: 'expense',
      amount: 11200000,
      currency: 'UZS',
      accountId: 'acc_01',
      accountName: 'Asosiy hisob raqam (Kapitalbank UZS)',
      category: 'Soliq to\'lovlari (QQS va JShODS)',
      contactId: null,
      contactName: 'Davlat Soliq Qo\'mitasi',
      date: '2026-08-20',
      paymentMethod: 'bank_transfer',
      reference: 'Soliq to\'lovi 08/26',
      taxIncluded: false,
      vatAmount: 0,
      description: 'O\'tgan oy uchun hisoblangan QQS va daromad solig\'i',
      status: 'completed',
      createdAt: '2026-08-20T10:00:00Z'
    },
    {
      id: 'tx_08',
      companyId: 'comp_01',
      type: 'income',
      amount: 18500000,
      currency: 'UZS',
      accountId: 'acc_03',
      accountName: 'Bosh kassa (Naqd pul UZS)',
      category: 'Kassa tushumi (Chakana savdo)',
      contactId: null,
      contactName: 'Mijozlar naqd to\'lovi',
      date: '2026-09-03',
      paymentMethod: 'cash',
      reference: 'Kassa Order #144',
      taxIncluded: true,
      vatAmount: 1982142,
      description: 'POS terminal va uskunalar sotuvidan naqd tushum',
      status: 'completed',
      createdAt: '2026-09-03T18:00:00Z'
    },
    {
      id: 'tx_09',
      companyId: 'comp_01',
      type: 'transfer',
      amount: 10000000,
      currency: 'UZS',
      accountId: 'acc_01',
      toAccountId: 'acc_04',
      accountName: 'Asosiy hisob -> Korporativ Karta',
      category: 'Ichki pul o\'tkazmasi',
      contactId: null,
      contactName: 'Kompaniya hisobidan kartaga',
      date: '2026-09-04',
      paymentMethod: 'transfer',
      reference: 'Trf-901',
      taxIncluded: false,
      vatAmount: 0,
      description: 'Korporativ kartani xizmat safari xarajatlari uchun to\'ldirish',
      status: 'completed',
      createdAt: '2026-09-04T11:20:00Z'
    }
  ];
  writeJSON('transactions', transactions);

  // 8. Subscription Plans
  const plans = [
    {
      id: 'plan_free',
      name: 'Bepul Sinov (Trial)',
      price: 0,
      period: '14 kun',
      billingCycle: 'trial',
      color: 'slate',
      badge: 'Boshlanish uchun',
      description: 'Yangi bizneslar va tizim imkoniyatlarini sinab ko\'rish uchun',
      features: [
        'Oyiga 15 tagacha kirim-chiqim operatsiyalari',
        '3 tagacha hisob-faktura va shartnoma yaratish',
        '1 ta hisob raqam va kassa',
        'Asosiy hisobotlar (P&L, Balans)',
        'AI CFO Maslahatchi (5 ta savol/oy)',
        'Standart email qo\'llab-quvvatlash'
      ],
      limits: {
        maxTransactions: 15,
        maxInvoices: 3,
        maxAccounts: 1,
        aiQueriesPerMonth: 5,
        multiCurrency: false
      }
    },
    {
      id: 'plan_starter',
      name: 'Boshlang\'ich (Starter)',
      price: 190000,
      period: 'oyiga',
      billingCycle: 'monthly',
      color: 'emerald',
      badge: 'YaTT va Kichik Biznes',
      description: 'Kichik savdo, xizmat ko\'rsatish va frilanser korxonalar uchun',
      features: [
        'Oyiga 200 tagacha kirim-chiqim operatsiyalari',
        'Cheksiz hisob-faktura va PDF chop etish',
        '3 tagacha bank hisob raqami va kassa',
        'Soliq hisob-kitobi (QQS va aylanma soliq)',
        'Kontragentlar sverka aktlari',
        'AI CFO Maslahatchi (50 ta savol/oy)',
        'Excel/CSV eksport va import',
        'Telegram orqali tezkor qo\'llab-quvvatlash'
      ],
      limits: {
        maxTransactions: 200,
        maxInvoices: 999999,
        maxAccounts: 3,
        aiQueriesPerMonth: 50,
        multiCurrency: true
      }
    },
    {
      id: 'plan_pro',
      name: 'Professional (Pro)',
      price: 450000,
      period: 'oyiga',
      billingCycle: 'monthly',
      color: 'cyan',
      popular: true,
      badge: 'Eng Ommabop 🔥',
      description: 'O\'rta biznes, IT kompaniyalar va rivojlanayotgan MChJlar uchun ideal',
      features: [
        'Cheksiz barcha moliyaviy operatsiyalar',
        'Cheksiz hisob-fakturalar, cheklar va shartnomalar',
        'Cheksiz hisob raqamlar (UZS, USD, EUR, RUB)',
        'Sun\'iy intellekt (AI CFO) doimiy moliyaviy monitoring',
        'Xarajatlar anomaliyasi va xavflarni avtomat aniqlash',
        'Soliq optimallashtirish va pul oqimi prognozi',
        '5 tagacha buxgalter va direktor foydalanuvchilari',
        'Prioritet 24/7 shaxsiy menejer'
      ],
      limits: {
        maxTransactions: 999999,
        maxInvoices: 999999,
        maxAccounts: 999999,
        aiQueriesPerMonth: 500,
        multiCurrency: true
      }
    },
    {
      id: 'plan_enterprise',
      name: 'Korporativ (Enterprise)',
      price: 990000,
      period: 'oyiga',
      billingCycle: 'monthly',
      color: 'purple',
      badge: 'Katta Holdinglar',
      description: 'Ko\'p filialli korxonalar, xoldinglar va yirik ishlab chiqarish uchun',
      features: [
        'Barcha Pro imkoniyatlar + Cheksiz foydalanuvchilar',
        'Ko\'p kompaniyalarni bitta paneldan boshqarish (Multi-tenant)',
        'Maxsus AI modelini kompaniya tarixiga moslashtirish',
        'Bank API (Kapital, Ipak Yo\'li, NBU) to\'g\'ridan-to\'g\'ri sinxronizatsiya',
        '1C va E-faktura bilan avtomatik integratsiya',
        'Maxsus SLA va shaxsiy buxgalter konsultatsiyasi'
      ],
      limits: {
        maxTransactions: 999999,
        maxInvoices: 999999,
        maxAccounts: 999999,
        aiQueriesPerMonth: 999999,
        multiCurrency: true
      }
    }
  ];
  writeJSON('plans', plans);

  // 9. Subscriptions
  const subscriptions = [
    {
      id: 'sub_01',
      companyId: 'comp_01',
      companyName: 'Apex Innovations MChJ',
      planId: 'plan_pro',
      planName: 'Professional (Pro)',
      status: 'active',
      amount: 450000,
      currency: 'UZS',
      paymentMethod: 'payme',
      startDate: '2026-08-01',
      endDate: '2026-11-01',
      autoRenew: true
    },
    {
      id: 'sub_02',
      companyId: 'comp_02',
      companyName: 'SilkRoad Logistics XK',
      planId: 'plan_starter',
      planName: 'Boshlang\'ich (Starter)',
      status: 'active',
      amount: 190000,
      currency: 'UZS',
      paymentMethod: 'click',
      startDate: '2026-08-15',
      endDate: '2026-09-15',
      autoRenew: true
    }
  ];
  writeJSON('subscriptions', subscriptions);

  // 10. AI Chat history & smart insights
  const aiChats = [
    {
      id: 'ai_msg_01',
      companyId: 'comp_01',
      sender: 'user',
      text: 'Apex Innovations ning oxirgi oylik moliyaviy holatini tahlil qilib, sof foyda va xavflarni aytib ber.',
      createdAt: '2026-09-04T08:30:00Z'
    },
    {
      id: 'ai_msg_02',
      companyId: 'comp_01',
      sender: 'ai',
      text: `Salom, Nodirbek! Men **Apex Innovations MChJ** ning barcha moliyaviy ko'rsatkichlarini chuqur tahlil qildim.

📊 **Asosiy Ko'rsatkichlar (Avgust - Sentabr 2026):**
- **Jami Kirim:** 169,340,000 UZS
- **Jami Chiqim:** 81,000,000 UZS
- **Sof Foyda:** +88,340,000 UZS *(Rentabellik: 52.1%)*
- **Kassa va Bank qoldig'i:** 218,050,000 UZS + 14,200 USD

⚠️ **AI Aniqlagan Xavflar va Eslatmalar:**
1. **Debitorlik qarzi (Kutilayotgan pul):** Universal Trade Group MChJ kompaniyasidan **25,000,000 UZS** to'lov muddati yaqinlashmoqda (10-sentabrgacha).
2. **Kreditorlik qarzi:** CloudServers MChJ ga **8,000,000 UZS** to'lovimiz qolgan.

💡 **AI CFO Tavsiyalari:**
- Kompaniya moliyaviy holati a'lo darajada (Moliyaviy Barqarorlik Koeffitsiyenti: **89/100**).
- Pul zaxirangiz joriy xarajatlar darajasi bilan **5.4 oy** mustaqil ishlashga yetadi.
- Bo'sh turgan 100 mln so'mni qisqa muddatli bank depozitiga qo'yish orqali oyiga qo'shimcha ~1.7 mln so'm passiv daromad olishingiz mumkin.`,
      createdAt: '2026-09-04T08:30:05Z'
    }
  ];
  writeJSON('ai_chats', aiChats);

  // 11. Initial Settings
  writeJSON('settings', {
    siteName: 'BalansAI',
    tagline: 'O\'zbekistondagi №1 Smart Moliya & Buxgalteriya Platformasi',
    currency: 'UZS',
    exchangeRates: { USD: 12850, EUR: 13900, RUB: 142 },
    vatRate: 12,
    turnoverTaxRate: 4,
    profitTaxRate: 15,
    aiModel: 'BalansAI Smart CFO v4.5 Pro Engine',
    aiFeaturesEnabled: true,
    allowRegistration: true,
    paymentGateways: {
      payme: true,
      click: true,
      uzum: true,
      bankTransfer: true
    }
  });

  console.log('Database successfully initialized and seeded with rich test data!');
}

// Auto seed on boot
seedInitialData();

module.exports = db;
