const axios = require('axios');
const logger = require('../utils/logger');

class DHLService {
  constructor() {
    this.apiKey = process.env.DHL_API_KEY;
    this.apiSecret = process.env.DHL_API_SECRET;
    this.accountNumber = process.env.DHL_ACCOUNT_NUMBER;
    this.baseURL = process.env.DHL_BASE_URL || 'https://api-sandbox.dhl.com';
    
    // Create axios instance with auth
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'DHL-API-Key': this.apiKey,
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info('DHL API Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          data: config.data ? JSON.stringify(config.data).substring(0, 500) : null
        });
        return config;
      },
      (error) => {
        logger.error('DHL API Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.info('DHL API Response', {
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      (error) => {
        logger.error('DHL API Error', {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url
        });
        return Promise.reject(this.handleError(error));
      }
    );
  }

  // Create shipment
  async createShipment(shipmentData) {
    try {
      const payload = this.buildShipmentPayload(shipmentData);
      
      const response = await this.client.post('/shipments', payload);
      
      return {
        success: true,
        data: {
          shipmentId: response.data.shipmentTrackingNumber,
          trackingNumber: response.data.trackingNumber || response.data.shipmentTrackingNumber,
          label: response.data.documents?.[0], // Shipping label
          estimatedDeliveryDate: response.data.estimatedDeliveryDate,
          cost: response.data.chargedWeight ? this.calculateShippingCost(response.data) : null
        }
      };
    } catch (error) {
      logger.error('DHL shipment creation failed', error);
      return {
        success: false,
        error: error.message || 'Failed to create shipment'
      };
    }
  }

  // Build shipment payload for DHL API
  buildShipmentPayload(shipmentData) {
    const {
      orderId,
      sender,
      recipient,
      packages,
      serviceType = 'EXPRESS',
      paymentInfo = 'SENDER'
    } = shipmentData;

    return {
      plannedShippingDateAndTime: new Date().toISOString(),
      pickup: {
        isRequested: false
      },
      productCode: serviceType,
      localProductCode: serviceType,
      getRateEstimates: false,
      accounts: [
        {
          typeCode: 'shipper',
          number: this.accountNumber
        }
      ],
      customerDetails: {
        shipperDetails: {
          postalAddress: {
            postalCode: sender.postalCode,
            cityName: sender.city,
            countryCode: sender.countryCode,
            addressLine1: sender.addressLine1,
            addressLine2: sender.addressLine2,
            addressLine3: sender.addressLine3
          },
          contactInformation: {
            email: sender.email,
            phone: sender.phone,
            mobilPhone: sender.mobile,
            companyName: sender.companyName || 'Clothes Shipping Store',
            fullName: sender.fullName || sender.companyName
          }
        },
        receiverDetails: {
          postalAddress: {
            postalCode: recipient.postalCode,
            cityName: recipient.city,
            countryCode: recipient.countryCode,
            addressLine1: recipient.addressLine1,
            addressLine2: recipient.addressLine2,
            addressLine3: recipient.addressLine3
          },
          contactInformation: {
            email: recipient.email,
            phone: recipient.phone,
            mobilPhone: recipient.mobile,
            companyName: recipient.companyName,
            fullName: `${recipient.firstName} ${recipient.lastName}`
          }
        }
      },
      content: {
        packages: packages.map((pkg, index) => ({
          typeCode: '2BP', // Customer Packaging
          weight: pkg.weight,
          dimensions: {
            length: pkg.dimensions?.length || 20,
            width: pkg.dimensions?.width || 15,
            height: pkg.dimensions?.height || 5
          },
          customerReferences: [
            {
              value: `${orderId}-${index + 1}`,
              typeCode: 'CU' // Customer Reference
            }
          ]
        })),
        isCustomsDeclarable: this.isCustomsDeclarable(sender.countryCode, recipient.countryCode),
        declaredValue: packages.reduce((sum, pkg) => sum + (pkg.declaredValue || 0), 0),
        declaredValueCurrency: packages[0]?.currency || 'EUR',
        description: 'Clothing and Fashion Items',
        incoterms: 'DAP', // Delivered At Place
        unitOfMeasurement: 'metric'
      },
      documentImages: [
        {
          typeCode: 'label',
          imageFormat: 'PDF',
          hideAccountNumber: false,
          numberOfCopies: 1
        }
      ]
    };
  }

  // Check if customs declaration is required
  isCustomsDeclarable(senderCountry, recipientCountry) {
    const euCountries = ['DE', 'FR', 'ES', 'IT', 'PT', 'NL', 'BE', 'AT', 'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SK', 'SI', 'LT', 'LV', 'EE', 'CY', 'MT', 'LU', 'IE', 'DK', 'SE', 'FI'];
    
    // If both countries are in EU, no customs needed
    if (euCountries.includes(senderCountry) && euCountries.includes(recipientCountry)) {
      return false;
    }
    
    // Otherwise, customs declaration required
    return true;
  }

  // Track shipment
  async trackShipment(trackingNumber) {
    try {
      const response = await this.client.get(`/track/shipments?trackingNumber=${trackingNumber}`);
      
      const shipment = response.data.shipments?.[0];
      if (!shipment) {
        return {
          success: false,
          error: 'Shipment not found'
        };
      }

      return {
        success: true,
        data: {
          trackingNumber: trackingNumber,
          status: this.mapDHLStatus(shipment.status),
          statusDescription: shipment.status.description,
          estimatedDeliveryDate: shipment.estimatedDeliveryDate,
          events: this.mapTrackingEvents(shipment.events || []),
          destination: shipment.destination,
          origin: shipment.origin
        }
      };
    } catch (error) {
      logger.error('DHL tracking failed', error);
      return {
        success: false,
        error: error.message || 'Failed to track shipment'
      };
    }
  }

  // Map DHL status to our internal status
  mapDHLStatus(dhlStatus) {
    const statusMap = {
      'pre-transit': 'pending',
      'transit': 'in_transit',
      'delivered': 'delivered',
      'exception': 'exception',
      'unknown': 'unknown'
    };

    const status = dhlStatus.statusCode?.toLowerCase() || 'unknown';
    return statusMap[status] || 'unknown';
  }

  // Map DHL tracking events
  mapTrackingEvents(events) {
    return events.map(event => ({
      timestamp: event.timestamp,
      status: event.statusCode,
      description: event.description,
      location: event.location ? {
        city: event.location.address?.cityName,
        country: event.location.address?.countryCode
      } : null
    })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // Get shipping rates
  async getShippingRates(rateRequest) {
    try {
      const {
        sender,
        recipient,
        packages,
        plannedShippingDate = new Date().toISOString()
      } = rateRequest;

      const payload = {
        customerDetails: {
          shipperDetails: {
            postalAddress: {
              postalCode: sender.postalCode,
              cityName: sender.city,
              countryCode: sender.countryCode
            }
          },
          receiverDetails: {
            postalAddress: {
              postalCode: recipient.postalCode,
              cityName: recipient.city,
              countryCode: recipient.countryCode
            }
          }
        },
        accounts: [
          {
            typeCode: 'shipper',
            number: this.accountNumber
          }
        ],
        plannedShippingDateAndTime: plannedShippingDate,
        unitOfMeasurement: 'metric',
        isCustomsDeclarable: this.isCustomsDeclarable(sender.countryCode, recipient.countryCode),
        monetaryAmount: packages.reduce((sum, pkg) => sum + (pkg.declaredValue || 0), 0),
        monetaryAmountCurrency: packages[0]?.currency || 'EUR',
        requestAllValueAddedServices: false,
        packages: packages.map(pkg => ({
          typeCode: '2BP',
          weight: pkg.weight,
          dimensions: pkg.dimensions || {
            length: 20,
            width: 15,
            height: 5
          }
        }))
      };

      const response = await this.client.post('/rates', payload);

      const rates = response.data.products?.map(product => ({
        serviceType: product.productCode,
        serviceName: product.productName,
        totalPrice: product.totalPrice?.[0]?.price,
        currency: product.totalPrice?.[0]?.priceCurrency,
        estimatedDeliveryDate: product.deliveryCapabilities?.estimatedDeliveryDateAndTime,
        transitTime: product.deliveryCapabilities?.totalTransitDays
      })) || [];

      return {
        success: true,
        data: rates
      };
    } catch (error) {
      logger.error('DHL rate calculation failed', error);
      return {
        success: false,
        error: error.message || 'Failed to calculate shipping rates'
      };
    }
  }

  // Calculate shipping cost based on weight and destination
  calculateShippingCost(shipmentResponse) {
    // This would typically come from the DHL response
    // For now, return a calculated estimate
    const chargedWeight = shipmentResponse.chargedWeight || 1;
    const baseRate = 15.00; // Base rate in EUR
    const perKgRate = 5.50; // Per kg rate
    
    return {
      amount: baseRate + (chargedWeight * perKgRate),
      currency: 'EUR',
      breakdown: {
        baseRate: baseRate,
        weightCharge: chargedWeight * perKgRate,
        totalWeight: chargedWeight
      }
    };
  }

  // Cancel shipment
  async cancelShipment(shipmentId, reason = 'Customer request') {
    try {
      const response = await this.client.delete(`/shipments/${shipmentId}`, {
        data: {
          plannedShippingDateAndTime: new Date().toISOString(),
          reason: reason
        }
      });

      return {
        success: true,
        message: 'Shipment cancelled successfully'
      };
    } catch (error) {
      logger.error('DHL shipment cancellation failed', error);
      return {
        success: false,
        error: error.message || 'Failed to cancel shipment'
      };
    }
  }

  // Get available services for route
  async getAvailableServices(origin, destination) {
    try {
      const response = await this.client.get('/products', {
        params: {
          originCountryCode: origin.countryCode,
          originCityName: origin.city,
          originPostalCode: origin.postalCode,
          destinationCountryCode: destination.countryCode,
          destinationCityName: destination.city,
          destinationPostalCode: destination.postalCode,
          accountNumber: this.accountNumber,
          plannedShippingDate: new Date().toISOString().split('T')[0]
        }
      });

      const services = response.data.products?.map(product => ({
        code: product.productCode,
        name: product.productName,
        description: product.localProductName,
        estimatedDays: product.totalTransitDays
      })) || [];

      return {
        success: true,
        data: services
      };
    } catch (error) {
      logger.error('DHL services lookup failed', error);
      return {
        success: false,
        error: error.message || 'Failed to get available services'
      };
    }
  }

  // Handle API errors
  handleError(error) {
    if (error.response?.data) {
      const dhlError = error.response.data;
      
      if (dhlError.detail) {
        return new Error(dhlError.detail);
      }
      
      if (dhlError.message) {
        return new Error(dhlError.message);
      }
      
      if (dhlError.title) {
        return new Error(dhlError.title);
      }
    }
    
    return error;
  }

  // Validate address
  async validateAddress(address) {
    try {
      const response = await this.client.post('/address-validate', {
        type: 'delivery',
        address: {
          countryCode: address.countryCode,
          postalCode: address.postalCode,
          cityName: address.city,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2
        }
      });

      return {
        success: true,
        isValid: response.data.address?.isValid || false,
        suggestedAddress: response.data.address?.suggestedAddress,
        warnings: response.data.warnings || []
      };
    } catch (error) {
      logger.error('DHL address validation failed', error);
      return {
        success: false,
        error: error.message || 'Address validation failed'
      };
    }
  }
}

module.exports = new DHLService();