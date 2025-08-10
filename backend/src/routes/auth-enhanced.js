const express = require('express');
const { body, validationResult } = require('express-validator');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const AuthService = require('../services/AuthService');
const { authenticateToken } = require('../middleware/auth');
const { authRateLimit } = require('../middleware/security');
const logger = require('../utils/logger');

const router = express.Router();

// Initialize Passport strategies
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const userData = {
      id: profile.id,
      email: profile.emails[0].value,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      accessToken,
      refreshToken,
      provider: 'google'
    };
    return done(null, userData);
  } catch (error) {
    return done(error, null);
  }
}));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: "/api/auth/facebook/callback",
  profileFields: ['id', 'emails', 'name']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const userData = {
      id: profile.id,
      email: profile.emails[0].value,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      accessToken,
      refreshToken,
      provider: 'facebook'
    };
    return done(null, userData);
  } catch (error) {
    return done(error, null);
  }
}));

// Enhanced registration
router.post('/register', authRateLimit, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('firstName').trim().isLength({ min: 1, max: 50 }),
  body('lastName').trim().isLength({ min: 1, max: 50 }),
  body('phone').optional().isMobilePhone(),
  body('language').optional().isIn(['en', 'pt', 'de', 'fr', 'es']),
  body('currency').optional().isIn(['EUR', 'BRL', 'NAD'])
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const result = await AuthService.registerUser(req.body);
    
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('already registered')) {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
});

// Enhanced login with 2FA support
router.post('/login', authRateLimit, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  body('totpToken').optional().isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, totpToken } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    const result = await AuthService.loginUser(email, password, ipAddress, userAgent, totpToken);
    
    if (result.requiresTwoFactor) {
      return res.status(200).json(result);
    }

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      user: result.user,
      accessToken: result.accessToken
    });
  } catch (error) {
    next(error);
  }
});

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res, next) => {
    try {
      const profile = req.user;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      const result = await AuthService.oauthLogin('google', profile, ipAddress, userAgent);

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      // Redirect to frontend with success
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?success=true&token=${result.accessToken}`);
    } catch (error) {
      logger.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?error=${encodeURIComponent(error.message)}`);
    }
  }
);

// Facebook OAuth routes
router.get('/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
);

router.get('/facebook/callback',
  passport.authenticate('facebook', { session: false }),
  async (req, res, next) => {
    try {
      const profile = req.user;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      const result = await AuthService.oauthLogin('facebook', profile, ipAddress, userAgent);

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?success=true&token=${result.accessToken}`);
    } catch (error) {
      logger.error('Facebook OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?error=${encodeURIComponent(error.message)}`);
    }
  }
);

// Setup 2FA
router.post('/2fa/setup', authenticateToken, async (req, res, next) => {
  try {
    const result = await AuthService.setup2FA(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Verify and enable 2FA
router.post('/2fa/verify', authenticateToken, [
  body('token').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid token format',
        details: errors.array()
      });
    }

    const result = await AuthService.verify2FA(req.user.id, req.body.token);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Disable 2FA
router.post('/2fa/disable', authenticateToken, [
  body('password').notEmpty(),
  body('token').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { password, token } = req.body;
    const result = await AuthService.disable2FA(req.user.id, password, token);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Email verification
router.post('/verify-email', [
  body('token').isLength({ min: 32, max: 64 }).isHexadecimal()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid verification token format',
        details: errors.array()
      });
    }

    // Implementation would be in AuthService
    res.json({ message: 'Email verification endpoint - implementation needed' });
  } catch (error) {
    next(error);
  }
});

// Password reset request
router.post('/password-reset-request', authRateLimit, [
  body('email').isEmail().normalizeEmail()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Valid email is required',
        details: errors.array()
      });
    }

    // Implementation would be in AuthService
    res.json({ message: 'If the email exists, a password reset link has been sent' });
  } catch (error) {
    next(error);
  }
});

// Password reset
router.post('/password-reset', authRateLimit, [
  body('token').isLength({ min: 32, max: 64 }).isHexadecimal(),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Implementation would be in AuthService
    res.json({ message: 'Password reset endpoint - implementation needed' });
  } catch (error) {
    next(error);
  }
});

// Change password
router.post('/change-password', authenticateToken, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Implementation would be in AuthService
    res.json({ message: 'Password change endpoint - implementation needed' });
  } catch (error) {
    next(error);
  }
});

// Get user sessions
router.get('/sessions', authenticateToken, async (req, res, next) => {
  try {
    // Implementation would get user sessions from database
    res.json({ message: 'User sessions endpoint - implementation needed' });
  } catch (error) {
    next(error);
  }
});

// Revoke session
router.delete('/sessions/:sessionId', authenticateToken, [
  body('sessionId').isUUID()
], async (req, res, next) => {
  try {
    // Implementation would revoke specific session
    res.json({ message: 'Session revocation endpoint - implementation needed' });
  } catch (error) {
    next(error);
  }
});

// Logout (revoke current session)
router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      // Revoke the session
      // Implementation would be in AuthService
    }

    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// Logout all sessions
router.post('/logout-all', authenticateToken, async (req, res, next) => {
  try {
    // Implementation would revoke all user sessions
    res.clearCookie('refreshToken');
    res.json({ message: 'All sessions logged out successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;