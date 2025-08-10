const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Rate limiting configurations
const createRateLimiter = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });
      
      res.status(429).json({
        error: message,
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// General API rate limiting
const generalRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later.'
);

// Strict rate limiting for authentication endpoints
const authRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 requests per windowMs
  'Too many authentication attempts, please try again later.',
  true // skip successful requests
);

// Payment rate limiting
const paymentRateLimit = createRateLimiter(
  60 * 1000, // 1 minute
  3, // limit each IP to 3 payment attempts per minute
  'Too many payment attempts, please try again later.'
);

// Speed limiting for suspicious behavior
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: 500, // begin adding 500ms of delay per request above 50
  maxDelayMs: 20000, // maximum delay of 20 seconds
});

// Helmet security headers configuration
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : false,
    },
  },
  crossOriginEmbedderPolicy: false, // Required for Stripe
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: {
    policy: ['strict-origin-when-cross-origin']
  }
});

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // Remove potential XSS patterns
      return value
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      return sanitizeValue(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// CSRF protection for state-changing operations
const csrfProtection = (req, res, next) => {
  // Skip CSRF for API endpoints with proper authentication
  if (req.path.startsWith('/api/') && req.headers.authorization) {
    return next();
  }

  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    logger.warn('CSRF token mismatch', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });

    return res.status(403).json({
      error: 'CSRF token validation failed'
    });
  }

  next();
};

// IP whitelist/blacklist middleware
const ipFilter = (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  
  // Blacklisted IPs (could be loaded from database or config)
  const blacklistedIPs = process.env.BLACKLISTED_IPS ? 
    process.env.BLACKLISTED_IPS.split(',').map(ip => ip.trim()) : [];

  if (blacklistedIPs.includes(clientIp)) {
    logger.warn('Blocked request from blacklisted IP', {
      ip: clientIp,
      userAgent: req.get('User-Agent'),
      path: req.path
    });

    return res.status(403).json({
      error: 'Access denied'
    });
  }

  next();
};

// Request size limiting
const requestSizeLimit = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      const maxSizeNum = parseInt(maxSize);
      
      if (sizeInMB > maxSizeNum) {
        logger.warn('Request size exceeded limit', {
          ip: req.ip,
          size: sizeInMB,
          limit: maxSizeNum,
          path: req.path
        });

        return res.status(413).json({
          error: 'Request entity too large'
        });
      }
    }
    
    next();
  };
};

// Suspicious activity detection
const suspiciousActivityDetector = (req, res, next) => {
  const suspiciousPatterns = [
    /union.*select/i,
    /script.*alert/i,
    /<.*script.*>/i,
    /\.\.\/\.\.\//,
    /etc\/passwd/i,
    /cmd\.exe/i,
    /powershell/i
  ];

  const checkForSuspiciousContent = (obj) => {
    const jsonString = JSON.stringify(obj);
    return suspiciousPatterns.some(pattern => pattern.test(jsonString));
  };

  let suspicious = false;
  
  // Check URL path
  if (suspiciousPatterns.some(pattern => pattern.test(req.path))) {
    suspicious = true;
  }

  // Check query parameters
  if (req.query && checkForSuspiciousContent(req.query)) {
    suspicious = true;
  }

  // Check request body
  if (req.body && checkForSuspiciousContent(req.body)) {
    suspicious = true;
  }

  if (suspicious) {
    logger.warn('Suspicious activity detected', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      query: req.query,
      body: req.body
    });

    return res.status(400).json({
      error: 'Invalid request'
    });
  }

  next();
};

// Session security
const sessionSecurity = {
  // Generate secure session ID
  generateSessionId: () => {
    return crypto.randomBytes(32).toString('hex');
  },

  // Validate session integrity
  validateSession: (req, res, next) => {
    if (req.session) {
      const currentTime = Date.now();
      const sessionStart = req.session.startTime || currentTime;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      // Check session age
      if (currentTime - sessionStart > maxAge) {
        req.session.destroy();
        return res.status(401).json({
          error: 'Session expired'
        });
      }

      // Check for session hijacking
      const currentUserAgent = req.get('User-Agent');
      const sessionUserAgent = req.session.userAgent;

      if (sessionUserAgent && sessionUserAgent !== currentUserAgent) {
        logger.warn('Potential session hijacking detected', {
          sessionId: req.session.id,
          ip: req.ip,
          currentUserAgent,
          sessionUserAgent
        });

        req.session.destroy();
        return res.status(401).json({
          error: 'Session security violation'
        });
      }

      // Update session metadata
      req.session.userAgent = currentUserAgent;
      req.session.lastActivity = currentTime;
      if (!req.session.startTime) {
        req.session.startTime = currentTime;
      }
    }

    next();
  }
};

// API key validation for external services
const validateApiKey = (requiredKeys = []) => {
  return (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'API key required'
      });
    }

    // Validate against allowed keys (stored securely)
    const validKeys = process.env.VALID_API_KEYS ? 
      process.env.VALID_API_KEYS.split(',') : [];

    if (!validKeys.includes(apiKey)) {
      logger.warn('Invalid API key attempt', {
        ip: req.ip,
        key: apiKey.substring(0, 8) + '...',
        path: req.path
      });

      return res.status(401).json({
        error: 'Invalid API key'
      });
    }

    next();
  };
};

// Request logging with security context
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      duration: `${duration}ms`,
      userId: req.user?.id || null,
      contentLength: res.get('content-length') || 0
    };

    // Log security-relevant events
    if (res.statusCode >= 400) {
      logger.warn('Security event', logData);
    } else {
      logger.info('Request processed', logData);
    }
  });

  next();
};

module.exports = {
  // Rate limiting
  generalRateLimit,
  authRateLimit,
  paymentRateLimit,
  speedLimiter,
  
  // Security headers and protection
  helmetConfig,
  sanitizeInput,
  csrfProtection,
  ipFilter,
  requestSizeLimit,
  suspiciousActivityDetector,
  
  // Session and API security
  sessionSecurity,
  validateApiKey,
  securityLogger,
  
  // Utility functions
  createRateLimiter
};