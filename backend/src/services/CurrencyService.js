const axios = require('axios');
const { query } = require('../config/database');
const logger = require('../utils/logger');

class CurrencyService {
  constructor() {
    this.baseCurrency = 'EUR'; // Base currency for all pricing
    this.supportedCurrencies = ['EUR', 'BRL', 'NAD'];
    this.exchangeRateCache = new Map();
    this.cacheExpiry = 60 * 60 * 1000; // 1 hour
    this.apiKey = process.env.EXCHANGE_RATE_API_KEY;
    this.apiUrl = process.env.EXCHANGE_RATE_API_URL || 'https://api.exchangerate-api.com/v4/latest';
    
    // Fallback rates (updated periodically)
    this.fallbackRates = {
      'EUR': 1.0,
      'BRL': 5.50,
      'NAD': 20.00
    };

    // Start automatic rate updates
    this.startAutoUpdate();
  }

  // Get current exchange rates
  async getExchangeRates(baseCurrency = this.baseCurrency) {
    try {
      const cacheKey = `rates_${baseCurrency}`;
      const cached = this.exchangeRateCache.get(cacheKey);
      
      // Return cached rates if still valid
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return {
          success: true,
          rates: cached.rates,
          lastUpdated: cached.timestamp,
          source: 'cache'
        };
      }

      // Try to get rates from database first
      const dbRates = await this.getStoredRates(baseCurrency);
      if (dbRates.success && this.isRecentRate(dbRates.lastUpdated)) {
        this.exchangeRateCache.set(cacheKey, {
          rates: dbRates.rates,
          timestamp: Date.now()
        });
        
        return {
          success: true,
          rates: dbRates.rates,
          lastUpdated: dbRates.lastUpdated,
          source: 'database'
        };
      }

      // Fetch fresh rates from API
      const apiRates = await this.fetchRatesFromAPI(baseCurrency);
      if (apiRates.success) {
        // Store in database
        await this.storeRates(baseCurrency, apiRates.rates);
        
        // Cache the rates
        this.exchangeRateCache.set(cacheKey, {
          rates: apiRates.rates,
          timestamp: Date.now()
        });
        
        return {
          success: true,
          rates: apiRates.rates,
          lastUpdated: Date.now(),
          source: 'api'
        };
      }

      // Fallback to stored rates or default rates
      return this.getFallbackRates(baseCurrency);

    } catch (error) {
      logger.error('Failed to get exchange rates:', error);
      return this.getFallbackRates(baseCurrency);
    }
  }

  // Fetch rates from external API
  async fetchRatesFromAPI(baseCurrency) {
    try {
      let url;
      
      if (this.apiKey) {
        // Using paid API service
        url = `${this.apiUrl}/${baseCurrency}?access_key=${this.apiKey}`;
      } else {
        // Using free API service
        url = `${this.apiUrl}/${baseCurrency}`;
      }

      const response = await axios.get(url, { timeout: 10000 });
      
      if (response.data && response.data.rates) {
        // Filter only supported currencies
        const supportedRates = {};
        for (const currency of this.supportedCurrencies) {
          supportedRates[currency] = response.data.rates[currency] || this.fallbackRates[currency];
        }
        
        return {
          success: true,
          rates: supportedRates
        };
      }

      throw new Error('Invalid API response format');

    } catch (error) {
      logger.error('Exchange rate API fetch failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Store rates in database
  async storeRates(baseCurrency, rates) {
    try {
      for (const [currency, rate] of Object.entries(rates)) {
        await query(`
          INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
          ON CONFLICT (from_currency, to_currency)
          DO UPDATE SET 
            rate = EXCLUDED.rate,
            updated_at = EXCLUDED.updated_at
        `, [baseCurrency, currency, rate]);
      }

      logger.info('Exchange rates stored successfully', { baseCurrency, rates });
      return { success: true };

    } catch (error) {
      logger.error('Failed to store exchange rates:', error);
      return { success: false, error: error.message };
    }
  }

  // Get rates from database
  async getStoredRates(baseCurrency) {
    try {
      const result = await query(`
        SELECT to_currency, rate, updated_at
        FROM exchange_rates
        WHERE from_currency = $1
        ORDER BY updated_at DESC
      `, [baseCurrency]);

      if (result.rows.length === 0) {
        return { success: false, error: 'No stored rates found' };
      }

      const rates = {};
      let lastUpdated = new Date(0);

      for (const row of result.rows) {
        rates[row.to_currency] = parseFloat(row.rate);
        const updated = new Date(row.updated_at);
        if (updated > lastUpdated) {
          lastUpdated = updated;
        }
      }

      return {
        success: true,
        rates,
        lastUpdated: lastUpdated.getTime()
      };

    } catch (error) {
      logger.error('Failed to get stored rates:', error);
      return { success: false, error: error.message };
    }
  }

  // Get fallback rates
  getFallbackRates(baseCurrency) {
    logger.warn('Using fallback exchange rates');
    
    const rates = { ...this.fallbackRates };
    
    // If base currency is not EUR, adjust rates
    if (baseCurrency !== 'EUR') {
      const baseRate = this.fallbackRates[baseCurrency];
      if (baseRate) {
        for (const [currency, rate] of Object.entries(rates)) {
          rates[currency] = rate / baseRate;
        }
      }
    }

    return {
      success: true,
      rates,
      lastUpdated: Date.now(),
      source: 'fallback'
    };
  }

  // Convert amount between currencies
  async convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return {
        success: true,
        convertedAmount: amount,
        rate: 1,
        originalAmount: amount,
        fromCurrency,
        toCurrency
      };
    }

    try {
      // Get exchange rates with base currency as 'from' currency
      const ratesResult = await this.getExchangeRates(fromCurrency);
      
      if (!ratesResult.success) {
        throw new Error('Failed to get exchange rates');
      }

      const rate = ratesResult.rates[toCurrency];
      if (!rate) {
        throw new Error(`Exchange rate not available for ${toCurrency}`);
      }

      const convertedAmount = amount * rate;

      return {
        success: true,
        convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
        rate,
        originalAmount: amount,
        fromCurrency,
        toCurrency,
        lastUpdated: ratesResult.lastUpdated
      };

    } catch (error) {
      logger.error('Currency conversion failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Convert price for display (with formatting)
  async convertPriceForDisplay(basePrice, targetCurrency, locale = 'en-US') {
    try {
      const conversion = await this.convertCurrency(basePrice, this.baseCurrency, targetCurrency);
      
      if (!conversion.success) {
        return {
          success: false,
          error: conversion.error
        };
      }

      const formatted = this.formatCurrency(conversion.convertedAmount, targetCurrency, locale);

      return {
        success: true,
        originalPrice: basePrice,
        convertedPrice: conversion.convertedAmount,
        formattedPrice: formatted,
        currency: targetCurrency,
        rate: conversion.rate
      };

    } catch (error) {
      logger.error('Price conversion for display failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Format currency for display
  formatCurrency(amount, currency, locale = 'en-US') {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      const symbols = { EUR: '€', BRL: 'R$', NAD: 'N$' };
      const symbol = symbols[currency] || currency;
      return `${symbol} ${amount.toFixed(2)}`;
    }
  }

  // Get currency symbol
  getCurrencySymbol(currency) {
    const symbols = {
      EUR: '€',
      BRL: 'R$',
      NAD: 'N$'
    };
    
    return symbols[currency] || currency;
  }

  // Get currency information
  getCurrencyInfo(currency) {
    const info = {
      EUR: {
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        decimals: 2,
        countries: ['Germany', 'France', 'Spain', 'Italy', 'Portugal', 'Netherlands', 'Belgium', 'Austria']
      },
      BRL: {
        code: 'BRL',
        name: 'Brazilian Real',
        symbol: 'R$',
        decimals: 2,
        countries: ['Brazil']
      },
      NAD: {
        code: 'NAD',
        name: 'Namibian Dollar',
        symbol: 'N$',
        decimals: 2,
        countries: ['Namibia']
      }
    };

    return info[currency] || null;
  }

  // Check if rate is recent (within 24 hours)
  isRecentRate(timestamp) {
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return Date.now() - new Date(timestamp).getTime() < twentyFourHours;
  }

  // Start automatic rate updates
  startAutoUpdate() {
    // Update rates every 4 hours
    const updateInterval = 4 * 60 * 60 * 1000; // 4 hours
    
    setInterval(async () => {
      try {
        logger.info('Starting automatic exchange rate update...');
        
        for (const currency of this.supportedCurrencies) {
          await this.getExchangeRates(currency);
        }
        
        logger.info('Automatic exchange rate update completed');
      } catch (error) {
        logger.error('Automatic exchange rate update failed:', error);
      }
    }, updateInterval);

    // Initial update
    setTimeout(() => {
      this.getExchangeRates();
    }, 5000); // Wait 5 seconds after startup
  }

  // Get historical rates (for reporting/analytics)
  async getHistoricalRates(fromCurrency, toCurrency, days = 30) {
    try {
      const result = await query(`
        SELECT rate, DATE(updated_at) as date
        FROM exchange_rates
        WHERE from_currency = $1 AND to_currency = $2
          AND updated_at >= CURRENT_DATE - INTERVAL '${days} days'
        ORDER BY updated_at DESC
      `, [fromCurrency, toCurrency]);

      const rates = result.rows.map(row => ({
        rate: parseFloat(row.rate),
        date: row.date
      }));

      return {
        success: true,
        rates,
        fromCurrency,
        toCurrency,
        period: `${days} days`
      };

    } catch (error) {
      logger.error('Failed to get historical rates:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Validate currency code
  isValidCurrency(currency) {
    return this.supportedCurrencies.includes(currency);
  }

  // Get all supported currencies with info
  getSupportedCurrencies() {
    return this.supportedCurrencies.map(currency => this.getCurrencyInfo(currency));
  }

  // Round amount to currency precision
  roundToCurrencyPrecision(amount, currency = 'EUR') {
    const info = this.getCurrencyInfo(currency);
    const decimals = info ? info.decimals : 2;
    const factor = Math.pow(10, decimals);
    return Math.round(amount * factor) / factor;
  }

  // Calculate tax based on currency/country
  calculateTax(amount, currency, countryCode) {
    // VAT rates by country
    const taxRates = {
      'DE': 0.19, // Germany 19%
      'FR': 0.20, // France 20%
      'ES': 0.21, // Spain 21%
      'IT': 0.22, // Italy 22%
      'PT': 0.23, // Portugal 23%
      'NL': 0.21, // Netherlands 21%
      'BE': 0.21, // Belgium 21%
      'AT': 0.20, // Austria 20%
      'BR': 0.17, // Brazil ~17% (simplified)
      'NA': 0.15, // Namibia 15%
    };

    const rate = taxRates[countryCode] || 0;
    const taxAmount = amount * rate;
    
    return {
      taxRate: rate,
      taxAmount: this.roundToCurrencyPrecision(taxAmount, currency),
      totalAmount: this.roundToCurrencyPrecision(amount + taxAmount, currency)
    };
  }

  // Bulk convert prices for product catalog
  async bulkConvertPrices(prices, targetCurrency) {
    try {
      const ratesResult = await this.getExchangeRates(this.baseCurrency);
      
      if (!ratesResult.success) {
        throw new Error('Failed to get exchange rates for bulk conversion');
      }

      const rate = ratesResult.rates[targetCurrency];
      if (!rate) {
        throw new Error(`Exchange rate not available for ${targetCurrency}`);
      }

      const convertedPrices = prices.map(price => ({
        original: price,
        converted: this.roundToCurrencyPrecision(price * rate, targetCurrency),
        currency: targetCurrency,
        rate: rate
      }));

      return {
        success: true,
        prices: convertedPrices,
        rate: rate,
        lastUpdated: ratesResult.lastUpdated
      };

    } catch (error) {
      logger.error('Bulk price conversion failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
const currencyService = new CurrencyService();
module.exports = currencyService;