import { api } from './apiClient';
import logger from '../utils/logger';

class ShippingService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Get shipping zones
  async getShippingZones() {
    const cacheKey = 'shipping_zones';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await api.shipping.getZones();
      const result = {
        success: true,
        data: response.data.shippingZones
      };
      
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Failed to get shipping zones:', error);
      return {
        success: false,
        error: error.userMessage || 'Failed to load shipping zones'
      };
    }
  }

  // Calculate shipping cost
  async calculateShippingCost({ recipient, items, sender = null }) {
    try {
      const response = await api.shipping.calculateShipping(recipient, items, sender);
      
      return {
        success: true,
        data: {
          shippingCost: response.data.shippingCost,
          estimatedDelivery: response.data.estimatedDelivery,
          totalWeight: response.data.totalWeight,
          totalValue: response.data.totalValue,
          shippingZone: response.data.shippingZone,
          dhlRates: response.data.dhlRates || []
        }
      };
    } catch (error) {
      logger.error('Failed to calculate shipping cost:', error);
      return {
        success: false,
        error: error.userMessage || 'Failed to calculate shipping cost'
      };
    }
  }

  // Track shipment
  async trackShipment(trackingNumber) {
    try {
      const response = await api.shipping.trackPackage(trackingNumber);
      
      return {
        success: true,
        data: {
          tracking: response.data.tracking,
          order: response.data.order
        }
      };
    } catch (error) {
      logger.error('Failed to track shipment:', error);
      return {
        success: false,
        error: error.userMessage || 'Failed to track shipment'
      };
    }
  }

  // Validate shipping address
  async validateAddress(address) {
    try {
      const response = await api.shipping.validateAddress(address);
      
      return {
        success: true,
        data: response.data.validation
      };
    } catch (error) {
      logger.error('Failed to validate address:', error);
      return {
        success: false,
        error: error.userMessage || 'Address validation failed'
      };
    }
  }

  // Get available shipping services for route
  async getAvailableServices(origin, destination) {
    const cacheKey = `services_${origin.countryCode}_${destination.countryCode}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await api.shipping.getServices(origin, destination);
      const result = {
        success: true,
        data: response.data.services
      };
      
      this.setCache(cacheKey, result, 60 * 60 * 1000); // Cache for 1 hour
      return result;
    } catch (error) {
      logger.error('Failed to get available services:', error);
      return {
        success: false,
        error: error.userMessage || 'Failed to get shipping services'
      };
    }
  }

  // Check if country supports shipping
  async isShippingAvailable(countryCode) {
    const zonesResult = await this.getShippingZones();
    
    if (!zonesResult.success) {
      return { success: false, error: zonesResult.error };
    }

    const isAvailable = zonesResult.data.some(zone => 
      zone.countries && zone.countries.includes(countryCode) && zone.is_active
    );

    return {
      success: true,
      isAvailable,
      supportedZones: zonesResult.data.filter(zone => 
        zone.countries && zone.countries.includes(countryCode) && zone.is_active
      )
    };
  }

  // Get shipping zone by country
  async getShippingZoneByCountry(countryCode) {
    const zonesResult = await this.getShippingZones();
    
    if (!zonesResult.success) {
      return { success: false, error: zonesResult.error };
    }

    const zone = zonesResult.data.find(zone => 
      zone.countries && zone.countries.includes(countryCode) && zone.is_active
    );

    return {
      success: true,
      zone: zone || null
    };
  }

  // Format tracking status for display
  formatTrackingStatus(status) {
    const statusMap = {
      'pending': {
        label: 'Pending',
        color: '#FFA500',
        icon: 'schedule'
      },
      'in_transit': {
        label: 'In Transit',
        color: '#2196F3',
        icon: 'local-shipping'
      },
      'delivered': {
        label: 'Delivered',
        color: '#4CAF50',
        icon: 'check-circle'
      },
      'exception': {
        label: 'Exception',
        color: '#FF5722',
        icon: 'error'
      },
      'unknown': {
        label: 'Unknown',
        color: '#757575',
        icon: 'help'
      }
    };

    return statusMap[status] || statusMap['unknown'];
  }

  // Calculate estimated delivery date
  calculateEstimatedDelivery(shippingZone, orderDate = new Date()) {
    if (!shippingZone) return null;

    const minDays = shippingZone.estimated_days_min || 7;
    const maxDays = shippingZone.estimated_days_max || 14;

    const minDate = new Date(orderDate);
    minDate.setDate(minDate.getDate() + minDays);

    const maxDate = new Date(orderDate);
    maxDate.setDate(maxDate.getDate() + maxDays);

    return {
      minDate,
      maxDate,
      minDays,
      maxDays,
      estimatedRange: `${minDays}-${maxDays} business days`
    };
  }

  // Format shipping cost for display
  formatShippingCost(shippingCost, currency = 'EUR') {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(shippingCost.totalCost || 0);
    } catch (error) {
      return `${currency} ${(shippingCost.totalCost || 0).toFixed(2)}`;
    }
  }

  // Get shipping cost breakdown
  getShippingCostBreakdown(shippingCost) {
    return {
      baseCost: shippingCost.baseCost || 0,
      weightCost: shippingCost.weightCost || 0,
      totalCost: shippingCost.totalCost || 0,
      originalCost: shippingCost.originalCost || 0,
      discount: (shippingCost.originalCost || 0) - (shippingCost.totalCost || 0),
      freeShippingApplied: shippingCost.freeShippingApplied || false,
      freeShippingThreshold: shippingCost.freeShippingThreshold || 0
    };
  }

  // Check if order qualifies for free shipping
  checkFreeShipping(orderValue, shippingZone) {
    if (!shippingZone || !shippingZone.free_shipping_threshold) {
      return {
        qualifies: false,
        threshold: 0,
        amountNeeded: 0
      };
    }

    const threshold = parseFloat(shippingZone.free_shipping_threshold);
    const qualifies = orderValue >= threshold;
    
    return {
      qualifies,
      threshold,
      amountNeeded: qualifies ? 0 : threshold - orderValue
    };
  }

  // Convert weight units
  convertWeight(weight, fromUnit, toUnit) {
    const conversions = {
      'g_to_kg': (w) => w / 1000,
      'kg_to_g': (w) => w * 1000,
      'g_to_lb': (w) => w * 0.00220462,
      'lb_to_g': (w) => w / 0.00220462,
      'kg_to_lb': (w) => w * 2.20462,
      'lb_to_kg': (w) => w / 2.20462
    };

    const conversionKey = `${fromUnit}_to_${toUnit}`;
    const converter = conversions[conversionKey];
    
    return converter ? converter(weight) : weight;
  }

  // Get supported countries list
  getSupportedCountries() {
    return [
      // European Union
      { code: 'DE', name: 'Germany', region: 'EU' },
      { code: 'FR', name: 'France', region: 'EU' },
      { code: 'ES', name: 'Spain', region: 'EU' },
      { code: 'IT', name: 'Italy', region: 'EU' },
      { code: 'PT', name: 'Portugal', region: 'EU' },
      { code: 'NL', name: 'Netherlands', region: 'EU' },
      { code: 'BE', name: 'Belgium', region: 'EU' },
      { code: 'AT', name: 'Austria', region: 'EU' },
      
      // Other regions
      { code: 'BR', name: 'Brazil', region: 'LATAM' },
      { code: 'NA', name: 'Namibia', region: 'AFRICA' }
    ];
  }

  // Cache management
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data, customTimeout = null) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      timeout: customTimeout || this.cacheTimeout
    });
  }

  clearCache() {
    this.cache.clear();
  }

  // Format address for display
  formatAddress(address) {
    const parts = [];
    
    if (address.addressLine1) parts.push(address.addressLine1);
    if (address.addressLine2) parts.push(address.addressLine2);
    if (address.city) parts.push(address.city);
    if (address.stateProvince) parts.push(address.stateProvince);
    if (address.postalCode) parts.push(address.postalCode);
    if (address.country) parts.push(address.country);
    
    return parts.join(', ');
  }

  // Validate address format
  validateAddressFormat(address) {
    const errors = {};
    
    if (!address.addressLine1 || address.addressLine1.trim().length < 5) {
      errors.addressLine1 = 'Address line 1 is required (minimum 5 characters)';
    }
    
    if (!address.city || address.city.trim().length < 2) {
      errors.city = 'City is required (minimum 2 characters)';
    }
    
    if (!address.postalCode || address.postalCode.trim().length < 3) {
      errors.postalCode = 'Postal code is required (minimum 3 characters)';
    }
    
    if (!address.country || address.country.length !== 2) {
      errors.country = 'Valid country code is required';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

// Export singleton instance
const shippingService = new ShippingService();
export default shippingService;