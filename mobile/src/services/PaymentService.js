import { StripeProvider, useStripe, useConfirmPayment } from '@stripe/stripe-react-native';
import { Alert } from 'react-native';
import { api } from './apiClient';
import logger from '../utils/logger';

class PaymentService {
  constructor() {
    this.stripe = null;
    this.isInitialized = false;
  }

  // Initialize Stripe
  initialize(stripe) {
    this.stripe = stripe;
    this.isInitialized = true;
  }

  // Create payment intent on server
  async createPaymentIntent({ amount, currency, orderId, metadata = {} }) {
    try {
      const response = await api.payments.createIntent(amount, currency, {
        orderId,
        metadata
      });

      return {
        success: true,
        data: {
          clientSecret: response.data.clientSecret,
          paymentIntentId: response.data.paymentIntentId,
          customerId: response.data.customerId
        }
      };
    } catch (error) {
      logger.error('Failed to create payment intent:', error);
      return {
        success: false,
        error: error.userMessage || 'Failed to create payment intent'
      };
    }
  }

  // Process card payment
  async processCardPayment({
    amount,
    currency,
    orderId,
    billingDetails,
    savePaymentMethod = false
  }) {
    if (!this.isInitialized) {
      throw new Error('Payment service not initialized');
    }

    try {
      // Step 1: Create payment intent
      const intentResult = await this.createPaymentIntent({
        amount,
        currency,
        orderId
      });

      if (!intentResult.success) {
        return intentResult;
      }

      const { clientSecret, paymentIntentId } = intentResult.data;

      // Step 2: Confirm payment with Stripe
      const { error, paymentIntent } = await this.stripe.confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: {
            email: billingDetails.email,
            name: billingDetails.name,
            phone: billingDetails.phone,
            address: {
              city: billingDetails.address?.city,
              country: billingDetails.address?.country,
              line1: billingDetails.address?.line1,
              line2: billingDetails.address?.line2,
              postalCode: billingDetails.address?.postalCode,
              state: billingDetails.address?.state,
            },
          },
        },
        // Save payment method if requested
        setupFutureUsage: savePaymentMethod ? 'OffSession' : undefined,
      });

      if (error) {
        logger.error('Payment confirmation failed:', error);
        return {
          success: false,
          error: this.getPaymentErrorMessage(error)
        };
      }

      // Step 3: Confirm payment on server
      const confirmResult = await api.payments.confirmPayment(
        paymentIntentId,
        paymentIntent.paymentMethod?.id,
        orderId
      );

      return {
        success: true,
        data: {
          paymentIntent: paymentIntent,
          orderId: orderId,
          amount: amount,
          currency: currency
        }
      };

    } catch (error) {
      logger.error('Payment processing failed:', error);
      return {
        success: false,
        error: error.userMessage || 'Payment processing failed'
      };
    }
  }

  // Process payment with saved payment method
  async processWithSavedPaymentMethod({
    paymentMethodId,
    amount,
    currency,
    orderId
  }) {
    try {
      // Create payment intent
      const intentResult = await this.createPaymentIntent({
        amount,
        currency,
        orderId
      });

      if (!intentResult.success) {
        return intentResult;
      }

      const { clientSecret } = intentResult.data;

      // Confirm with saved payment method
      const { error, paymentIntent } = await this.stripe.confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodId: paymentMethodId,
      });

      if (error) {
        return {
          success: false,
          error: this.getPaymentErrorMessage(error)
        };
      }

      return {
        success: true,
        data: {
          paymentIntent: paymentIntent,
          orderId: orderId
        }
      };

    } catch (error) {
      logger.error('Saved payment method processing failed:', error);
      return {
        success: false,
        error: error.userMessage || 'Payment processing failed'
      };
    }
  }

  // Get saved payment methods
  async getSavedPaymentMethods() {
    try {
      const response = await api.payments.getPaymentMethods();
      return {
        success: true,
        data: response.data.paymentMethods
      };
    } catch (error) {
      logger.error('Failed to get payment methods:', error);
      return {
        success: false,
        error: error.userMessage || 'Failed to load payment methods'
      };
    }
  }

  // Delete saved payment method
  async deleteSavedPaymentMethod(paymentMethodId) {
    try {
      await api.payments.deletePaymentMethod(paymentMethodId);
      return {
        success: true,
        message: 'Payment method deleted successfully'
      };
    } catch (error) {
      logger.error('Failed to delete payment method:', error);
      return {
        success: false,
        error: error.userMessage || 'Failed to delete payment method'
      };
    }
  }

  // Process Google Pay payment
  async processGooglePay({ amount, currency, orderId }) {
    try {
      if (!this.stripe.isGooglePaySupported) {
        return {
          success: false,
          error: 'Google Pay is not supported on this device'
        };
      }

      // Initialize Google Pay
      const { error: initError } = await this.stripe.initGooglePay({
        testEnv: __DEV__, // Use test environment in development
        merchantName: 'Clothes Shipping',
        countryCode: 'US', // Adjust based on your business location
        billingAddressConfig: {
          format: 'FULL',
          isPhoneNumberRequired: true,
          isRequired: true,
        },
        existingPaymentMethodRequired: false,
      });

      if (initError) {
        return {
          success: false,
          error: 'Failed to initialize Google Pay'
        };
      }

      // Create payment intent
      const intentResult = await this.createPaymentIntent({
        amount,
        currency,
        orderId
      });

      if (!intentResult.success) {
        return intentResult;
      }

      const { clientSecret } = intentResult.data;

      // Present Google Pay
      const { error: presentError } = await this.stripe.presentGooglePay({
        clientSecret,
        forSetupIntent: false,
      });

      if (presentError) {
        return {
          success: false,
          error: this.getPaymentErrorMessage(presentError)
        };
      }

      // Confirm Google Pay payment
      const { error: confirmError, paymentIntent } = await this.stripe.confirmGooglePayPayment(
        clientSecret
      );

      if (confirmError) {
        return {
          success: false,
          error: this.getPaymentErrorMessage(confirmError)
        };
      }

      return {
        success: true,
        data: {
          paymentIntent,
          orderId
        }
      };

    } catch (error) {
      logger.error('Google Pay processing failed:', error);
      return {
        success: false,
        error: error.userMessage || 'Google Pay processing failed'
      };
    }
  }

  // Get payment status
  async getPaymentStatus(paymentIntentId) {
    try {
      const response = await api.payments.getStatus(paymentIntentId);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to get payment status:', error);
      return {
        success: false,
        error: error.userMessage || 'Failed to get payment status'
      };
    }
  }

  // Validate card details
  validateCardDetails(cardDetails) {
    const errors = {};

    if (!cardDetails.number || cardDetails.number.length < 13) {
      errors.number = 'Invalid card number';
    }

    if (!cardDetails.expiry || !/^\d{2}\/\d{2}$/.test(cardDetails.expiry)) {
      errors.expiry = 'Invalid expiry date (MM/YY)';
    }

    if (!cardDetails.cvc || cardDetails.cvc.length < 3) {
      errors.cvc = 'Invalid CVC';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Get user-friendly error messages
  getPaymentErrorMessage(error) {
    switch (error.code) {
      case 'card_declined':
        return 'Your card was declined. Please try a different payment method.';
      case 'insufficient_funds':
        return 'Insufficient funds. Please check your account balance.';
      case 'incorrect_cvc':
        return 'Incorrect CVC. Please check your card security code.';
      case 'expired_card':
        return 'Your card has expired. Please use a different card.';
      case 'incorrect_number':
        return 'Incorrect card number. Please check your card details.';
      case 'processing_error':
        return 'Payment processing error. Please try again.';
      case 'authentication_required':
        return 'Additional authentication required. Please complete 3D Secure verification.';
      default:
        return error.localizedMessage || error.message || 'Payment failed. Please try again.';
    }
  }

  // Format amount for display
  formatAmount(amount, currency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  // Calculate processing fee (if applicable)
  calculateProcessingFee(amount, currency) {
    // Stripe fees vary by region and currency
    const feeRates = {
      'EUR': 0.014, // 1.4% + €0.25
      'BRL': 0.0399, // 3.99% + R$0.39
      'NAD': 0.029, // 2.9% + estimated based on regional rates
    };

    const rate = feeRates[currency] || 0.029;
    const fixedFees = {
      'EUR': 0.25,
      'BRL': 0.39,
      'NAD': 0.30,
    };
    
    const fixedFee = fixedFees[currency] || 0.30;
    
    return (amount * rate) + fixedFee;
  }
}

// Export singleton instance
const paymentService = new PaymentService();
export default paymentService;