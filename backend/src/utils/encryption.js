const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const logger = require('./logger');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits
    
    // Master encryption key from environment
    this.masterKey = this.deriveMasterKey();
  }

  // Derive master key from environment variable
  deriveMasterKey() {
    const secret = process.env.ENCRYPTION_SECRET || 'default-secret-for-development-only';
    const salt = process.env.ENCRYPTION_SALT || 'default-salt';
    
    if (process.env.NODE_ENV === 'production' && 
        (secret === 'default-secret-for-development-only' || salt === 'default-salt')) {
      logger.error('Production environment detected with default encryption keys!');
      throw new Error('Secure encryption keys required for production');
    }

    return crypto.pbkdf2Sync(secret, salt, 100000, this.keyLength, 'sha512');
  }

  // Generate cryptographically secure random key
  generateKey(length = this.keyLength) {
    return crypto.randomBytes(length);
  }

  // Generate secure random salt
  generateSalt(length = this.saltLength) {
    return crypto.randomBytes(length);
  }

  // Encrypt sensitive data
  encrypt(plaintext, key = null) {
    try {
      const encryptionKey = key || this.masterKey;
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipher(this.algorithm, encryptionKey, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine IV + tag + encrypted data
      const combined = iv.toString('hex') + tag.toString('hex') + encrypted;
      
      return {
        success: true,
        data: combined
      };
    } catch (error) {
      logger.error('Encryption failed:', error);
      return {
        success: false,
        error: 'Encryption failed'
      };
    }
  }

  // Decrypt sensitive data
  decrypt(encryptedData, key = null) {
    try {
      const encryptionKey = key || this.masterKey;
      
      // Extract IV, tag, and encrypted data
      const iv = Buffer.from(encryptedData.slice(0, this.ivLength * 2), 'hex');
      const tag = Buffer.from(encryptedData.slice(this.ivLength * 2, (this.ivLength + this.tagLength) * 2), 'hex');
      const encrypted = encryptedData.slice((this.ivLength + this.tagLength) * 2);
      
      const decipher = crypto.createDecipher(this.algorithm, encryptionKey, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return {
        success: true,
        data: decrypted
      };
    } catch (error) {
      logger.error('Decryption failed:', error);
      return {
        success: false,
        error: 'Decryption failed'
      };
    }
  }

  // Hash passwords with bcrypt
  async hashPassword(password, saltRounds = 12) {
    try {
      const salt = await bcrypt.genSalt(saltRounds);
      const hash = await bcrypt.hash(password, salt);
      
      return {
        success: true,
        hash: hash
      };
    } catch (error) {
      logger.error('Password hashing failed:', error);
      return {
        success: false,
        error: 'Password hashing failed'
      };
    }
  }

  // Verify password against hash
  async verifyPassword(password, hash) {
    try {
      const isValid = await bcrypt.compare(password, hash);
      
      return {
        success: true,
        isValid: isValid
      };
    } catch (error) {
      logger.error('Password verification failed:', error);
      return {
        success: false,
        error: 'Password verification failed'
      };
    }
  }

  // Generate secure random token
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate secure OTP
  generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, digits.length);
      otp += digits[randomIndex];
    }
    
    return otp;
  }

  // HMAC signing for data integrity
  sign(data, secret = null) {
    try {
      const signingKey = secret || process.env.HMAC_SECRET || 'default-hmac-secret';
      const hmac = crypto.createHmac('sha256', signingKey);
      hmac.update(JSON.stringify(data));
      
      return {
        success: true,
        signature: hmac.digest('hex')
      };
    } catch (error) {
      logger.error('HMAC signing failed:', error);
      return {
        success: false,
        error: 'Signing failed'
      };
    }
  }

  // Verify HMAC signature
  verify(data, signature, secret = null) {
    try {
      const signingKey = secret || process.env.HMAC_SECRET || 'default-hmac-secret';
      const hmac = crypto.createHmac('sha256', signingKey);
      hmac.update(JSON.stringify(data));
      const expectedSignature = hmac.digest('hex');
      
      // Constant-time comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
      
      return {
        success: true,
        isValid: isValid
      };
    } catch (error) {
      logger.error('HMAC verification failed:', error);
      return {
        success: false,
        error: 'Verification failed'
      };
    }
  }

  // Encrypt PII (Personally Identifiable Information)
  encryptPII(data) {
    if (!data) return null;
    
    const result = this.encrypt(JSON.stringify(data));
    return result.success ? result.data : null;
  }

  // Decrypt PII
  decryptPII(encryptedData) {
    if (!encryptedData) return null;
    
    const result = this.decrypt(encryptedData);
    if (result.success) {
      try {
        return JSON.parse(result.data);
      } catch (error) {
        logger.error('PII decryption JSON parse error:', error);
        return null;
      }
    }
    return null;
  }

  // Generate secure session tokens
  generateSessionToken() {
    const timestamp = Date.now().toString();
    const random = this.generateToken(16);
    const combined = timestamp + random;
    
    const signature = this.sign(combined);
    if (!signature.success) {
      throw new Error('Failed to generate secure session token');
    }
    
    return {
      token: combined,
      signature: signature.signature,
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
  }

  // Validate session token
  validateSessionToken(token, signature, expires) {
    try {
      // Check expiration
      if (Date.now() > expires) {
        return {
          success: false,
          error: 'Token expired'
        };
      }

      // Verify signature
      const verification = this.verify(token, signature);
      if (!verification.success || !verification.isValid) {
        return {
          success: false,
          error: 'Invalid token signature'
        };
      }

      return {
        success: true,
        isValid: true
      };
    } catch (error) {
      logger.error('Session token validation failed:', error);
      return {
        success: false,
        error: 'Token validation failed'
      };
    }
  }

  // Key derivation for different purposes
  deriveKey(purpose, baseKey = null, salt = null) {
    const key = baseKey || this.masterKey;
    const keySalt = salt || this.generateSalt();
    
    return crypto.pbkdf2Sync(
      key.toString('hex') + purpose,
      keySalt,
      100000,
      this.keyLength,
      'sha512'
    );
  }

  // Secure random filename generation
  generateSecureFilename(originalName = 'file') {
    const timestamp = Date.now();
    const random = this.generateToken(8);
    const extension = originalName.split('.').pop();
    
    return `${timestamp}_${random}.${extension}`;
  }

  // Hash sensitive identifiers (like email for lookup)
  hashIdentifier(identifier, salt = null) {
    const hashSalt = salt || process.env.IDENTIFIER_SALT || 'default-identifier-salt';
    return crypto.pbkdf2Sync(identifier.toLowerCase(), hashSalt, 10000, 32, 'sha256').toString('hex');
  }

  // Constant-time string comparison
  constantTimeEquals(a, b) {
    if (a.length !== b.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  // Generate API key
  generateApiKey() {
    const prefix = 'csa_'; // clothes shipping app
    const timestamp = Math.floor(Date.now() / 1000).toString(36);
    const random = this.generateToken(16);
    
    return prefix + timestamp + '_' + random;
  }

  // Mask sensitive data for logging
  maskSensitiveData(data, fields = ['password', 'token', 'key', 'secret']) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const masked = { ...data };
    
    for (const field of fields) {
      if (masked[field]) {
        const value = masked[field].toString();
        if (value.length <= 4) {
          masked[field] = '***';
        } else {
          masked[field] = value.substring(0, 2) + '***' + value.substring(value.length - 2);
        }
      }
    }

    return masked;
  }
}

// Export singleton instance
const encryptionService = new EncryptionService();
module.exports = encryptionService;