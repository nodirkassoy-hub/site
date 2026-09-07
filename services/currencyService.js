const currencyService = {
  // Exchange rates against 1 UZS baseline or standard rate
  rates: {
    UZS: 1,
    USD: 12850,
    EUR: 13900,
    RUB: 142
  },

  convert(amount, from = 'UZS', to = 'UZS') {
    if (from === to) return amount;
    // convert from `from` to UZS first
    const inUZS = from === 'UZS' ? amount : amount * (this.rates[from] || 1);
    // convert from UZS to `to`
    return to === 'UZS' ? inUZS : inUZS / (this.rates[to] || 1);
  },

  format(amount, currency = 'UZS') {
    if (currency === 'UZS') {
      return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(amount) + ' so\'m';
    }
    if (currency === 'USD') {
      return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    }
    if (currency === 'EUR') {
      return '€' + new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    }
    if (currency === 'RUB') {
      return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(amount) + ' ₽';
    }
    return `${amount} ${currency}`;
  }
};

module.exports = currencyService;
