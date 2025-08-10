const { body, param, query, validationResult } = require('express-validator');
const validator = require('validator');

// Common validation patterns
const VALIDATION_PATTERNS = {
  // Password: At least 8 chars, 1 uppercase, 1 lowercase, 1 number
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/,
  
  // Phone: International format
  PHONE: /^\+?[1-9]\d{1,14}$/,
  
  // Postal codes for supported countries
  POSTAL_CODE: {
    DE: /^\d{5}$/,           // Germany
    FR: /^\d{5}$/,           // France
    ES: /^\d{5}$/,           // Spain
    IT: /^\d{5}$/,           // Italy
    PT: /^\d{4}-\d{3}$/,     // Portugal
    NL: /^\d{4}\s?[A-Z]{2}$/i, // Netherlands
    BE: /^\d{4}$/,           // Belgium
    AT: /^\d{4}$/,           // Austria
    BR: /^\d{5}-?\d{3}$/,    // Brazil
    NA: /^\d{5}$/,           // Namibia (using 5 digits)
  },
  
  // Credit card (basic Luhn algorithm validation)
  CREDIT_CARD: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})$/,
  
  // UUID v4
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  
  // SKU format
  SKU: /^[A-Z0-9]{3,20}$/,
  
  // Order number format
  ORDER_NUMBER: /^ORD-\d{8}-[A-Z0-9]{6}$/,
  
  // Tracking number (flexible format)
  TRACKING_NUMBER: /^[A-Z0-9]{8,20}$/,
  
  // Color hex code
  COLOR_HEX: /^#[0-9A-F]{6}$/i
};

// Supported countries
const SUPPORTED_COUNTRIES = ['DE', 'FR', 'ES', 'IT', 'PT', 'NL', 'BE', 'AT', 'BR', 'NA'];

// Supported currencies
const SUPPORTED_CURRENCIES = ['EUR', 'BRL', 'NAD'];

// Supported languages
const SUPPORTED_LANGUAGES = ['en', 'pt', 'de', 'fr', 'es'];

// Custom validation functions
const customValidators = {
  // Validate strong password
  isStrongPassword: (value) => {
    return VALIDATION_PATTERNS.PASSWORD.test(value);
  },
  
  // Validate phone number
  isValidPhone: (value) => {
    if (!value) return true; // Optional field
    return VALIDATION_PATTERNS.PHONE.test(value.replace(/\s+/g, ''));
  },
  
  // Validate postal code for specific country
  isValidPostalCode: (value, { req }) => {
    const country = req.body.country || req.body.countryCode;
    if (!country || !VALIDATION_PATTERNS.POSTAL_CODE[country]) {
      return true; // If no country or unsupported country, skip validation
    }
    
    return VALIDATION_PATTERNS.POSTAL_CODE[country].test(value);
  },
  
  // Validate credit card number using Luhn algorithm
  isValidCreditCard: (value) => {
    if (!value) return false;
    
    // Remove spaces and hyphens
    const cardNumber = value.replace(/[\s-]/g, '');
    
    // Basic format check
    if (!VALIDATION_PATTERNS.CREDIT_CARD.test(cardNumber)) {
      return false;
    }
    
    // Luhn algorithm
    let sum = 0;
    let shouldDouble = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i), 10);
      
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    
    return sum % 10 === 0;
  },
  
  // Validate UUID format
  isUUID: (value) => {
    return VALIDATION_PATTERNS.UUID.test(value);
  },
  
  // Validate price (positive number with max 2 decimal places)
  isValidPrice: (value) => {
    const price = parseFloat(value);
    return price >= 0 && /^\d+(\.\d{1,2})?$/.test(value.toString());
  },
  
  // Validate weight in grams
  isValidWeight: (value) => {
    const weight = parseInt(value);
    return weight > 0 && weight <= 50000; // Max 50kg
  },
  
  // Validate dimensions (format: "length x width x height")
  isValidDimensions: (value) => {
    if (!value) return true; // Optional
    
    const pattern = /^\d+(\.\d+)?\s*x\s*\d+(\.\d+)?\s*x\s*\d+(\.\d+)?$/i;
    return pattern.test(value);
  },
  
  // Validate file upload
  isValidFile: (file, allowedTypes = [], maxSize = 10 * 1024 * 1024) => {
    if (!file) return true; // Optional
    
    // Check file size
    if (file.size > maxSize) {
      return false;
    }
    
    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      return false;
    }
    
    return true;
  },
  
  // Validate quantity
  isValidQuantity: (value) => {
    const qty = parseInt(value);
    return qty > 0 && qty <= 1000; // Max 1000 items
  },
  
  // Validate discount percentage
  isValidDiscountPercentage: (value) => {
    const discount = parseFloat(value);
    return discount >= 0 && discount <= 100;
  },
  
  // Validate rating (1-5 stars)
  isValidRating: (value) => {
    const rating = parseFloat(value);
    return rating >= 1 && rating <= 5;
  }
};

// Validation chains for common entities
const validationChains = {
  // User registration validation
  userRegistration: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .custom(customValidators.isStrongPassword)
      .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
    body('firstName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .matches(/^[A-Za-zÀ-ÿ\s'-]+$/)
      .withMessage('First name must contain only letters'),
    body('lastName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .matches(/^[A-Za-zÀ-ÿ\s'-]+$/)
      .withMessage('Last name must contain only letters'),
    body('phone')
      .optional()
      .custom(customValidators.isValidPhone)
      .withMessage('Invalid phone number format'),
    body('language')
      .optional()
      .isIn(SUPPORTED_LANGUAGES)
      .withMessage('Unsupported language'),
    body('currency')
      .optional()
      .isIn(SUPPORTED_CURRENCIES)
      .withMessage('Unsupported currency')
  ],
  
  // User login validation
  userLogin: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  
  // Address validation
  address: [
    body('firstName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name is required'),
    body('lastName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name is required'),
    body('addressLine1')
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Address line 1 must be 5-100 characters'),
    body('addressLine2')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Address line 2 must be max 100 characters'),
    body('city')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('City must be 2-50 characters'),
    body('stateProvince')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('State/Province must be max 50 characters'),
    body('postalCode')
      .trim()
      .custom(customValidators.isValidPostalCode)
      .withMessage('Invalid postal code for country'),
    body('country')
      .isIn(SUPPORTED_COUNTRIES)
      .withMessage('Unsupported country'),
    body('phone')
      .optional()
      .custom(customValidators.isValidPhone)
      .withMessage('Invalid phone number')
  ],
  
  // Product validation
  product: [
    body('supplierId')
      .custom(customValidators.isUUID)
      .withMessage('Valid supplier ID is required'),
    body('categoryId')
      .custom(customValidators.isUUID)
      .withMessage('Valid category ID is required'),
    body('sku')
      .trim()
      .matches(VALIDATION_PATTERNS.SKU)
      .withMessage('SKU must be 3-20 uppercase letters and numbers'),
    body('name_en')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('English name is required (max 255 characters)'),
    body('basePrice')
      .custom(customValidators.isValidPrice)
      .withMessage('Valid base price is required'),
    body('costPrice')
      .custom(customValidators.isValidPrice)
      .withMessage('Valid cost price is required'),
    body('weightGrams')
      .custom(customValidators.isValidWeight)
      .withMessage('Weight must be between 1-50000 grams'),
    body('dimensionsCm')
      .optional()
      .custom(customValidators.isValidDimensions)
      .withMessage('Dimensions must be in format "length x width x height"'),
    body('material')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Material must be max 100 characters')
  ],
  
  // Product variant validation
  productVariant: [
    body('productId')
      .custom(customValidators.isUUID)
      .withMessage('Valid product ID is required'),
    body('sku')
      .trim()
      .matches(VALIDATION_PATTERNS.SKU)
      .withMessage('SKU must be 3-20 uppercase letters and numbers'),
    body('size')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Size must be max 20 characters'),
    body('color_en')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Color name must be max 50 characters'),
    body('colorHex')
      .optional()
      .matches(VALIDATION_PATTERNS.COLOR_HEX)
      .withMessage('Color hex must be valid hex code'),
    body('priceAdjustment')
      .optional()
      .isFloat()
      .withMessage('Price adjustment must be a number'),
    body('stockQuantity')
      .custom(customValidators.isValidQuantity)
      .withMessage('Stock quantity must be 1-1000')
  ],
  
  // Order validation
  order: [
    body('items')
      .isArray({ min: 1 })
      .withMessage('Order must contain at least one item'),
    body('items.*.productId')
      .custom(customValidators.isUUID)
      .withMessage('Valid product ID is required'),
    body('items.*.variantId')
      .optional()
      .custom(customValidators.isUUID)
      .withMessage('Valid variant ID is required if provided'),
    body('items.*.quantity')
      .custom(customValidators.isValidQuantity)
      .withMessage('Quantity must be 1-1000'),
    body('shippingAddress')
      .isObject()
      .withMessage('Shipping address is required'),
    body('billingAddress')
      .isObject()
      .withMessage('Billing address is required'),
    body('currency')
      .isIn(SUPPORTED_CURRENCIES)
      .withMessage('Supported currency is required')
  ],
  
  // Payment validation
  payment: [
    body('amount')
      .isFloat({ min: 0.50 })
      .withMessage('Amount must be at least 0.50'),
    body('currency')
      .isIn(SUPPORTED_CURRENCIES)
      .withMessage('Supported currency is required'),
    body('paymentMethodId')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Payment method ID cannot be empty'),
    body('orderId')
      .optional()
      .custom(customValidators.isUUID)
      .withMessage('Valid order ID is required if provided')
  ],
  
  // Review validation
  review: [
    body('productId')
      .custom(customValidators.isUUID)
      .withMessage('Valid product ID is required'),
    body('rating')
      .custom(customValidators.isValidRating)
      .withMessage('Rating must be between 1-5'),
    body('title')
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Review title must be 5-100 characters'),
    body('content')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Review content must be 10-1000 characters')
  ]
};

// Query parameter validators
const queryValidators = {
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .toInt()
      .withMessage('Page must be between 1-1000'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .toInt()
      .withMessage('Limit must be between 1-100')
  ],
  
  productFilters: [
    query('category')
      .optional()
      .custom(customValidators.isUUID)
      .withMessage('Valid category ID required'),
    query('minPrice')
      .optional()
      .isFloat({ min: 0 })
      .toFloat()
      .withMessage('Min price must be positive'),
    query('maxPrice')
      .optional()
      .isFloat({ min: 0 })
      .toFloat()
      .withMessage('Max price must be positive'),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Search term must be 2-100 characters'),
    query('sortBy')
      .optional()
      .isIn(['name', 'price', 'created_at', 'rating'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc'),
    query('language')
      .optional()
      .isIn(SUPPORTED_LANGUAGES)
      .withMessage('Unsupported language')
  ]
};

// Parameter validators
const paramValidators = {
  uuid: [
    param('id')
      .custom(customValidators.isUUID)
      .withMessage('Valid UUID is required')
  ],
  
  trackingNumber: [
    param('trackingNumber')
      .matches(VALIDATION_PATTERNS.TRACKING_NUMBER)
      .withMessage('Invalid tracking number format')
  ]
};

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      error: 'Validation failed',
      details: errorMessages
    });
  }
  
  next();
};

// Sanitization helpers
const sanitizers = {
  // Remove HTML tags and scripts
  sanitizeHtml: (value) => {
    return value
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();
  },
  
  // Normalize phone number
  normalizePhone: (phone) => {
    return phone.replace(/[\s\-\(\)]/g, '');
  },
  
  // Normalize SKU (uppercase, no spaces)
  normalizeSku: (sku) => {
    return sku.toUpperCase().replace(/\s+/g, '');
  },
  
  // Trim and normalize text
  normalizeText: (text) => {
    return text.trim().replace(/\s+/g, ' ');
  }
};

module.exports = {
  VALIDATION_PATTERNS,
  SUPPORTED_COUNTRIES,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  customValidators,
  validationChains,
  queryValidators,
  paramValidators,
  handleValidationErrors,
  sanitizers
};