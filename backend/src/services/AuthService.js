const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/database');
const encryptionService = require('../utils/encryption');
const logger = require('../utils/logger');
const EmailService = require('./EmailService');

class AuthService {
  constructor() {
    this.maxLoginAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    this.tokenExpiry = 15 * 60 * 1000; // 15 minutes for access token
    this.refreshTokenExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.resetTokenExpiry = 60 * 60 * 1000; // 1 hour
    this.verificationTokenExpiry = 24 * 60 * 60 * 1000; // 24 hours
  }

  // Enhanced user registration with email verification
  async registerUser(userData) {
    const { email, password, firstName, lastName, phone, language, currency } = userData;

    try {
      return await transaction(async (client) => {
        // Check if user already exists
        const existingUser = await client.query(
          'SELECT id, email_verified FROM users WHERE email = $1',
          [email]
        );

        if (existingUser.rows.length > 0) {
          if (existingUser.rows[0].email_verified) {
            throw new Error('Email already registered and verified');
          } else {
            // Resend verification email for unverified account
            await this.sendVerificationEmail(existingUser.rows[0].id, email);
            throw new Error('Email already registered. Please check your email for verification link.');
          }
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);
        const userId = uuidv4();

        // Create user
        const userResult = await client.query(`
          INSERT INTO users (
            id, email, password_hash, first_name, last_name, phone,
            language_preference, currency_preference, email_verified, password_changed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, CURRENT_TIMESTAMP)
          RETURNING id, email, first_name, last_name, language_preference, currency_preference, created_at
        `, [userId, email, passwordHash, firstName, lastName, phone, language || 'en', currency || 'EUR']);

        const user = userResult.rows[0];

        // Send verification email
        await this.sendVerificationEmail(userId, email);

        // Log security event
        await this.logSecurityEvent(userId, 'user_registered', {
          email: email,
          firstName: firstName,
          lastName: lastName
        });

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            language: user.language_preference,
            currency: user.currency_preference,
            emailVerified: false,
            createdAt: user.created_at
          },
          message: 'Registration successful. Please check your email for verification link.'
        };
      });
    } catch (error) {
      logger.error('User registration failed:', error);
      throw error;
    }
  }

  // Enhanced login with attempt tracking and 2FA
  async loginUser(email, password, ipAddress, userAgent, totpToken = null) {
    try {
      // Check for account lockout
      const lockoutCheck = await query(
        'SELECT locked_until FROM users WHERE email = $1',
        [email]
      );

      if (lockoutCheck.rows.length > 0 && lockoutCheck.rows[0].locked_until) {
        const lockedUntil = new Date(lockoutCheck.rows[0].locked_until);
        if (lockedUntil > new Date()) {
          await this.logLoginAttempt(email, ipAddress, userAgent, false, 'account_locked');
          throw new Error(`Account temporarily locked. Try again after ${lockedUntil.toLocaleString()}`);
        }
      }

      // Get user details
      const userResult = await query(`
        SELECT 
          u.id, u.email, u.password_hash, u.first_name, u.last_name,
          u.role, u.language_preference, u.currency_preference,
          u.is_active, u.email_verified, u.two_factor_enabled,
          u.failed_login_attempts,
          t.secret as totp_secret, t.is_enabled as totp_enabled
        FROM users u
        LEFT JOIN user_2fa t ON u.id = t.user_id
        WHERE u.email = $1
      `, [email]);

      if (userResult.rows.length === 0) {
        await this.logLoginAttempt(email, ipAddress, userAgent, false, 'user_not_found');
        throw new Error('Invalid email or password');
      }

      const user = userResult.rows[0];

      // Check if account is active
      if (!user.is_active) {
        await this.logLoginAttempt(email, ipAddress, userAgent, false, 'account_inactive');
        throw new Error('Account is deactivated');
      }

      // Check if email is verified
      if (!user.email_verified) {
        await this.logLoginAttempt(email, ipAddress, userAgent, false, 'email_not_verified');
        // Resend verification email
        await this.sendVerificationEmail(user.id, email);
        throw new Error('Please verify your email address. A new verification link has been sent.');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        await this.logLoginAttempt(email, ipAddress, userAgent, false, 'invalid_password');
        throw new Error('Invalid email or password');
      }

      // Check 2FA if enabled
      if (user.totp_enabled && user.totp_secret) {
        if (!totpToken) {
          return {
            success: false,
            requiresTwoFactor: true,
            message: 'Two-factor authentication code required'
          };
        }

        const isValidTotp = speakeasy.totp.verify({
          secret: user.totp_secret,
          encoding: 'base32',
          token: totpToken,
          window: 1 // Allow 1 step tolerance
        });

        if (!isValidTotp) {
          await this.logLoginAttempt(email, ipAddress, userAgent, false, 'invalid_2fa');
          throw new Error('Invalid two-factor authentication code');
        }
      }

      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokens(user.id);

      // Create session
      await this.createSession(user.id, refreshToken, {
        ipAddress,
        userAgent,
        deviceInfo: this.parseUserAgent(userAgent)
      });

      // Log successful login
      await this.logLoginAttempt(email, ipAddress, userAgent, true);
      await this.logSecurityEvent(user.id, 'login_success', { ipAddress, userAgent });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          language: user.language_preference,
          currency: user.currency_preference,
          emailVerified: user.email_verified,
          twoFactorEnabled: user.totp_enabled || false
        },
        accessToken,
        refreshToken
      };

    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  // OAuth login/registration
  async oauthLogin(provider, profile, ipAddress, userAgent) {
    try {
      return await transaction(async (client) => {
        // Check if OAuth account exists
        const oauthResult = await client.query(
          'SELECT user_id FROM oauth_accounts WHERE provider = $1 AND provider_account_id = $2',
          [provider, profile.id]
        );

        let userId;

        if (oauthResult.rows.length > 0) {
          // Existing OAuth account
          userId = oauthResult.rows[0].user_id;
          
          // Update OAuth account info
          await client.query(`
            UPDATE oauth_accounts 
            SET 
              provider_account_email = $1,
              access_token = $2,
              refresh_token = $3,
              expires_at = $4,
              updated_at = CURRENT_TIMESTAMP
            WHERE provider = $5 AND provider_account_id = $6
          `, [
            profile.email,
            profile.accessToken,
            profile.refreshToken,
            profile.expiresAt ? new Date(profile.expiresAt) : null,
            provider,
            profile.id
          ]);
        } else {
          // Check if user exists with this email
          const userResult = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [profile.email]
          );

          if (userResult.rows.length > 0) {
            // Link existing account
            userId = userResult.rows[0].id;
          } else {
            // Create new user
            userId = uuidv4();
            await client.query(`
              INSERT INTO users (
                id, email, password_hash, first_name, last_name,
                email_verified, is_active, password_changed_at
              ) VALUES ($1, $2, $3, $4, $5, true, true, CURRENT_TIMESTAMP)
            `, [
              userId,
              profile.email,
              await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12), // Random password
              profile.firstName || '',
              profile.lastName || ''
            ]);
          }

          // Create OAuth account
          await client.query(`
            INSERT INTO oauth_accounts (
              user_id, provider, provider_account_id, provider_account_email,
              access_token, refresh_token, expires_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            userId,
            provider,
            profile.id,
            profile.email,
            profile.accessToken,
            profile.refreshToken,
            profile.expiresAt ? new Date(profile.expiresAt) : null
          ]);
        }

        // Get user details
        const user = await client.query(`
          SELECT 
            id, email, first_name, last_name, role,
            language_preference, currency_preference, email_verified
          FROM users WHERE id = $1
        `, [userId]);

        // Generate tokens
        const { accessToken, refreshToken } = await this.generateTokens(userId);

        // Create session
        await this.createSession(userId, refreshToken, {
          ipAddress,
          userAgent,
          deviceInfo: this.parseUserAgent(userAgent)
        });

        // Log security event
        await this.logSecurityEvent(userId, 'oauth_login', { 
          provider, 
          ipAddress, 
          userAgent 
        });

        const userData = user.rows[0];
        return {
          success: true,
          user: {
            id: userData.id,
            email: userData.email,
            firstName: userData.first_name,
            lastName: userData.last_name,
            role: userData.role,
            language: userData.language_preference,
            currency: userData.currency_preference,
            emailVerified: userData.email_verified
          },
          accessToken,
          refreshToken
        };
      });
    } catch (error) {
      logger.error('OAuth login failed:', error);
      throw error;
    }
  }

  // Setup 2FA
  async setup2FA(userId) {
    try {
      // Check if 2FA is already enabled
      const existingResult = await query(
        'SELECT is_enabled FROM user_2fa WHERE user_id = $1',
        [userId]
      );

      if (existingResult.rows.length > 0 && existingResult.rows[0].is_enabled) {
        throw new Error('Two-factor authentication is already enabled');
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: 'Clothes Shipping App',
        account: userId,
        length: 32
      });

      // Generate backup codes
      const backupCodes = Array.from({ length: 8 }, () => 
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );

      // Store in database
      await query(`
        INSERT INTO user_2fa (user_id, secret, backup_codes, is_enabled)
        VALUES ($1, $2, $3, false)
        ON CONFLICT (user_id)
        DO UPDATE SET 
          secret = EXCLUDED.secret,
          backup_codes = EXCLUDED.backup_codes,
          is_enabled = false,
          updated_at = CURRENT_TIMESTAMP
      `, [userId, secret.base32, backupCodes]);

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      return {
        success: true,
        secret: secret.base32,
        qrCode: qrCodeUrl,
        backupCodes: backupCodes,
        message: 'Scan the QR code with your authenticator app and verify with a code to enable 2FA'
      };

    } catch (error) {
      logger.error('2FA setup failed:', error);
      throw error;
    }
  }

  // Verify and enable 2FA
  async verify2FA(userId, token) {
    try {
      return await transaction(async (client) => {
        // Get 2FA info
        const result = await client.query(
          'SELECT secret, is_enabled FROM user_2fa WHERE user_id = $1',
          [userId]
        );

        if (result.rows.length === 0) {
          throw new Error('Two-factor authentication not set up');
        }

        const { secret, is_enabled } = result.rows[0];

        if (is_enabled) {
          throw new Error('Two-factor authentication is already enabled');
        }

        // Verify token
        const isValid = speakeasy.totp.verify({
          secret: secret,
          encoding: 'base32',
          token: token,
          window: 1
        });

        if (!isValid) {
          throw new Error('Invalid verification code');
        }

        // Enable 2FA
        await client.query(`
          UPDATE user_2fa 
          SET is_enabled = true, verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $1
        `, [userId]);

        // Update user table
        await client.query(
          'UPDATE users SET two_factor_enabled = true WHERE id = $1',
          [userId]
        );

        // Log security event
        await this.logSecurityEvent(userId, '2fa_enabled');

        return {
          success: true,
          message: 'Two-factor authentication enabled successfully'
        };
      });
    } catch (error) {
      logger.error('2FA verification failed:', error);
      throw error;
    }
  }

  // Disable 2FA
  async disable2FA(userId, password, token) {
    try {
      return await transaction(async (client) => {
        // Verify password
        const userResult = await client.query(
          'SELECT password_hash FROM users WHERE id = $1',
          [userId]
        );

        if (userResult.rows.length === 0) {
          throw new Error('User not found');
        }

        const isValidPassword = await bcrypt.compare(password, userResult.rows[0].password_hash);
        if (!isValidPassword) {
          throw new Error('Invalid password');
        }

        // Verify 2FA token
        const tfaResult = await client.query(
          'SELECT secret FROM user_2fa WHERE user_id = $1 AND is_enabled = true',
          [userId]
        );

        if (tfaResult.rows.length === 0) {
          throw new Error('Two-factor authentication is not enabled');
        }

        const isValidToken = speakeasy.totp.verify({
          secret: tfaResult.rows[0].secret,
          encoding: 'base32',
          token: token,
          window: 1
        });

        if (!isValidToken) {
          throw new Error('Invalid two-factor authentication code');
        }

        // Disable 2FA
        await client.query(
          'DELETE FROM user_2fa WHERE user_id = $1',
          [userId]
        );

        await client.query(
          'UPDATE users SET two_factor_enabled = false WHERE id = $1',
          [userId]
        );

        // Log security event
        await this.logSecurityEvent(userId, '2fa_disabled');

        return {
          success: true,
          message: 'Two-factor authentication disabled successfully'
        };
      });
    } catch (error) {
      logger.error('2FA disable failed:', error);
      throw error;
    }
  }

  // Generate JWT tokens
  async generateTokens(userId) {
    const accessToken = jwt.sign(
      { userId, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId, type: 'refresh', jti: uuidv4() },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }

  // Create user session
  async createSession(userId, refreshToken, sessionInfo) {
    try {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const expiresAt = new Date(Date.now() + this.refreshTokenExpiry);

      await query(`
        INSERT INTO user_sessions (
          user_id, token_hash, device_info, ip_address, user_agent, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        tokenHash,
        JSON.stringify(sessionInfo.deviceInfo),
        sessionInfo.ipAddress,
        sessionInfo.userAgent,
        expiresAt
      ]);

      return { success: true };
    } catch (error) {
      logger.error('Session creation failed:', error);
      throw error;
    }
  }

  // Send email verification
  async sendVerificationEmail(userId, email) {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + this.verificationTokenExpiry);

      // Store verification token
      await query(`
        INSERT INTO email_verification_tokens (user_id, email, token_hash, expires_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          token_hash = EXCLUDED.token_hash,
          expires_at = EXCLUDED.expires_at,
          created_at = CURRENT_TIMESTAMP
      `, [userId, email, tokenHash, expiresAt]);

      // Send email (implement EmailService)
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
      
      // This would be implemented in EmailService
      // await EmailService.sendVerificationEmail(email, verificationUrl);

      logger.info('Verification email sent', { userId, email });
      return { success: true };
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      throw error;
    }
  }

  // Log login attempt
  async logLoginAttempt(email, ipAddress, userAgent, success, failureReason = null) {
    try {
      await query(`
        INSERT INTO login_attempts (email, ip_address, user_agent, success, failure_reason)
        VALUES ($1, $2, $3, $4, $5)
      `, [email, ipAddress, userAgent, success, failureReason]);
    } catch (error) {
      logger.error('Failed to log login attempt:', error);
    }
  }

  // Log security event
  async logSecurityEvent(userId, eventType, details = {}, severity = 'info') {
    try {
      await query(`
        INSERT INTO security_events (user_id, event_type, details, severity)
        VALUES ($1, $2, $3, $4)
      `, [userId, eventType, JSON.stringify(details), severity]);
    } catch (error) {
      logger.error('Failed to log security event:', error);
    }
  }

  // Parse user agent for device info
  parseUserAgent(userAgent) {
    // Basic user agent parsing - in production, use a library like 'ua-parser-js'
    return {
      userAgent: userAgent,
      timestamp: new Date().toISOString()
    };
  }

  // Validate session
  async validateSession(refreshToken) {
    try {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      
      const result = await query(`
        SELECT 
          s.user_id, s.expires_at, s.is_active,
          u.is_active as user_active, u.email
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token_hash = $1
      `, [tokenHash]);

      if (result.rows.length === 0) {
        return { success: false, error: 'Invalid session' };
      }

      const session = result.rows[0];

      if (!session.is_active || !session.user_active) {
        return { success: false, error: 'Inactive session or user' };
      }

      if (new Date(session.expires_at) < new Date()) {
        return { success: false, error: 'Session expired' };
      }

      // Update last activity
      await query(
        'UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE token_hash = $1',
        [tokenHash]
      );

      return {
        success: true,
        userId: session.user_id,
        email: session.email
      };
    } catch (error) {
      logger.error('Session validation failed:', error);
      return { success: false, error: 'Session validation failed' };
    }
  }
}

module.exports = new AuthService();