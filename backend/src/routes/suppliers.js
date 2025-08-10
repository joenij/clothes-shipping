const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const uuid = require('uuid');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logSecurityEvent } = require('../services/SecurityService');
const EmailService = require('../services/EmailService');

const router = express.Router();

// Rate limiting for supplier operations
const supplierRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many supplier requests from this IP',
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(process.env.UPLOAD_DIR || './uploads', 'suppliers');
    await fs.mkdir(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Apply rate limiting to all supplier routes
router.use(supplierRateLimit);

/**
 * @route POST /api/suppliers/register
 * @desc Register new supplier
 * @access Public
 */
router.post('/register', [
  body('companyName').notEmpty().withMessage('Company name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('contactPerson').notEmpty().withMessage('Contact person is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('country').notEmpty().withMessage('Country is required'),
  body('businessType').isIn(['manufacturer', 'wholesaler', 'distributor']).withMessage('Valid business type required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      companyName,
      email,
      password,
      contactPerson,
      phone,
      address,
      country,
      businessType,
      taxId,
      website,
      description
    } = req.body;

    // Check if supplier already exists
    const existingSupplier = await db.query(
      'SELECT id FROM suppliers WHERE email = $1',
      [email]
    );

    if (existingSupplier.rows.length > 0) {
      return res.status(400).json({ message: 'Supplier with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification token
    const verificationToken = uuid.v4();

    // Create supplier
    const result = await db.query(`
      INSERT INTO suppliers (
        company_name, email, password_hash, contact_person, phone,
        address, country, business_type, tax_id, website, description,
        verification_token, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING id, company_name, email, status
    `, [
      companyName, email, hashedPassword, contactPerson, phone,
      address, country, businessType, taxId, website, description,
      verificationToken
    ]);

    const supplier = result.rows[0];

    // Log security event
    await logSecurityEvent('supplier_registration', null, req.ip, {
      supplierId: supplier.id,
      companyName,
      email
    });

    // Send verification email
    await EmailService.sendSupplierVerificationEmail(email, verificationToken);

    res.status(201).json({
      message: 'Supplier registered successfully. Please check your email to verify your account.',
      supplier: {
        id: supplier.id,
        companyName: supplier.company_name,
        email: supplier.email,
        status: supplier.status
      }
    });

  } catch (error) {
    console.error('Supplier registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

/**
 * @route POST /api/suppliers/verify-email
 * @desc Verify supplier email
 * @access Public
 */
router.post('/verify-email', [
  body('token').notEmpty().withMessage('Verification token is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.body;

    const result = await db.query(`
      UPDATE suppliers 
      SET email_verified = true, verification_token = NULL, updated_at = NOW()
      WHERE verification_token = $1 AND email_verified = false
      RETURNING id, company_name, email
    `, [token]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    const supplier = result.rows[0];

    // Log security event
    await logSecurityEvent('supplier_email_verified', supplier.id, req.ip);

    res.json({ message: 'Email verified successfully' });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error during verification' });
  }
});

/**
 * @route POST /api/suppliers/login
 * @desc Supplier login
 * @access Public
 */
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Get supplier
    const result = await db.query(`
      SELECT id, company_name, email, password_hash, status, email_verified,
             contact_person, phone, country, business_type, last_login
      FROM suppliers 
      WHERE email = $1
    `, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const supplier = result.rows[0];

    // Check if email is verified
    if (!supplier.email_verified) {
      return res.status(401).json({ message: 'Please verify your email before logging in' });
    }

    // Check if supplier is approved
    if (supplier.status !== 'approved') {
      return res.status(401).json({ message: 'Your account is pending approval' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, supplier.password_hash);
    if (!isValidPassword) {
      await logSecurityEvent('supplier_login_failed', supplier.id, req.ip, { email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT tokens
    const payload = {
      id: supplier.id,
      email: supplier.email,
      role: 'supplier'
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Update last login
    await db.query('UPDATE suppliers SET last_login = NOW() WHERE id = $1', [supplier.id]);

    // Log successful login
    await logSecurityEvent('supplier_login_success', supplier.id, req.ip);

    res.json({
      message: 'Login successful',
      supplier: {
        id: supplier.id,
        companyName: supplier.company_name,
        email: supplier.email,
        contactPerson: supplier.contact_person,
        phone: supplier.phone,
        country: supplier.country,
        businessType: supplier.business_type,
        status: supplier.status
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Supplier login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

/**
 * @route GET /api/suppliers/profile
 * @desc Get supplier profile
 * @access Private (Supplier)
 */
router.get('/profile', authenticateToken, requireRole('supplier'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, company_name, email, contact_person, phone, address,
             country, business_type, tax_id, website, description,
             status, email_verified, created_at, last_login,
             commission_rate, minimum_order_value
      FROM suppliers 
      WHERE id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const supplier = result.rows[0];

    // Get supplier statistics
    const statsResult = await db.query(`
      SELECT 
        COUNT(DISTINCT sp.id) as total_products,
        COUNT(DISTINCT CASE WHEN sp.status = 'active' THEN sp.id END) as active_products,
        COUNT(DISTINCT oi.order_id) as total_orders,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_sales
      FROM suppliers s
      LEFT JOIN supplier_products sp ON s.id = sp.supplier_id
      LEFT JOIN order_items oi ON sp.product_id = oi.product_id
      WHERE s.id = $1
    `, [req.user.id]);

    const stats = statsResult.rows[0];

    res.json({
      supplier: {
        ...supplier,
        stats: {
          totalProducts: parseInt(stats.total_products) || 0,
          activeProducts: parseInt(stats.active_products) || 0,
          totalOrders: parseInt(stats.total_orders) || 0,
          totalSales: parseFloat(stats.total_sales) || 0
        }
      }
    });

  } catch (error) {
    console.error('Get supplier profile error:', error);
    res.status(500).json({ message: 'Server error retrieving profile' });
  }
});

/**
 * @route PUT /api/suppliers/profile
 * @desc Update supplier profile
 * @access Private (Supplier)
 */
router.put('/profile', authenticateToken, requireRole('supplier'), [
  body('companyName').optional().notEmpty().withMessage('Company name cannot be empty'),
  body('contactPerson').optional().notEmpty().withMessage('Contact person cannot be empty'),
  body('phone').optional().notEmpty().withMessage('Phone cannot be empty'),
  body('website').optional().isURL().withMessage('Invalid website URL'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      companyName,
      contactPerson,
      phone,
      address,
      website,
      description
    } = req.body;

    const result = await db.query(`
      UPDATE suppliers SET
        company_name = COALESCE($2, company_name),
        contact_person = COALESCE($3, contact_person),
        phone = COALESCE($4, phone),
        address = COALESCE($5, address),
        website = COALESCE($6, website),
        description = COALESCE($7, description),
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, company_name, email, contact_person, phone, address, website, description
    `, [req.user.id, companyName, contactPerson, phone, address, website, description]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      supplier: result.rows[0]
    });

  } catch (error) {
    console.error('Update supplier profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

/**
 * @route POST /api/suppliers/products
 * @desc Add new product for supplier
 * @access Private (Supplier)
 */
router.post('/products', 
  authenticateToken, 
  requireRole('supplier'),
  upload.array('images', 10),
  [
    body('name').notEmpty().withMessage('Product name is required'),
    body('description').notEmpty().withMessage('Product description is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
    body('stockQuantity').isInt({ min: 0 }).withMessage('Valid stock quantity is required'),
    body('sku').notEmpty().withMessage('SKU is required'),
  ], 
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      description,
      category,
      price,
      stockQuantity,
      sku,
      weight,
      dimensions,
      colors,
      sizes,
      materials,
      tags
    } = req.body;

    // Check if SKU already exists for this supplier
    const existingSku = await db.query(
      'SELECT id FROM supplier_products WHERE supplier_id = $1 AND sku = $2',
      [req.user.id, sku]
    );

    if (existingSku.rows.length > 0) {
      return res.status(400).json({ message: 'SKU already exists for this supplier' });
    }

    // Create product
    const productResult = await db.query(`
      INSERT INTO supplier_products (
        supplier_id, name, description, category, price, stock_quantity,
        sku, weight, dimensions, colors, sizes, materials, tags,
        status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', NOW(), NOW())
      RETURNING id
    `, [
      req.user.id, name, description, category, price, stockQuantity,
      sku, weight, dimensions, 
      colors ? JSON.stringify(colors) : null,
      sizes ? JSON.stringify(sizes) : null,
      materials ? JSON.stringify(materials) : null,
      tags ? JSON.stringify(tags) : null
    ]);

    const productId = productResult.rows[0].id;

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      const imageQueries = req.files.map((file, index) => {
        return db.query(`
          INSERT INTO supplier_product_images (supplier_product_id, image_url, alt_text, sort_order)
          VALUES ($1, $2, $3, $4)
        `, [productId, `/uploads/suppliers/${file.filename}`, `${name} image ${index + 1}`, index]);
      });

      await Promise.all(imageQueries);
    }

    res.status(201).json({
      message: 'Product created successfully and is pending approval',
      productId
    });

  } catch (error) {
    console.error('Create supplier product error:', error);
    res.status(500).json({ message: 'Server error creating product' });
  }
});

/**
 * @route GET /api/suppliers/products
 * @desc Get supplier's products
 * @access Private (Supplier)
 */
router.get('/products', authenticateToken, requireRole('supplier'), [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'active', 'inactive']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status;

    let whereClause = 'WHERE sp.supplier_id = $1';
    const queryParams = [req.user.id];

    if (status) {
      whereClause += ' AND sp.status = $2';
      queryParams.push(status);
    }

    // Get products with images
    const result = await db.query(`
      SELECT 
        sp.*,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', spi.id,
              'image_url', spi.image_url,
              'alt_text', spi.alt_text,
              'sort_order', spi.sort_order
            ) ORDER BY spi.sort_order
          ) FILTER (WHERE spi.id IS NOT NULL),
          '[]'
        ) as images
      FROM supplier_products sp
      LEFT JOIN supplier_product_images spi ON sp.id = spi.supplier_product_id
      ${whereClause}
      GROUP BY sp.id
      ORDER BY sp.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `, [...queryParams, limit, offset]);

    // Get total count
    const countResult = await db.query(`
      SELECT COUNT(*) as total
      FROM supplier_products sp
      ${whereClause}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);

    res.json({
      products: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get supplier products error:', error);
    res.status(500).json({ message: 'Server error retrieving products' });
  }
});

/**
 * @route GET /api/suppliers/orders
 * @desc Get orders containing supplier's products
 * @access Private (Supplier)
 */
router.get('/orders', authenticateToken, requireRole('supplier'), [
  query('status').optional().isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status;

    let whereClause = 'WHERE sp.supplier_id = $1';
    const queryParams = [req.user.id];

    if (status) {
      whereClause += ' AND o.status = $2';
      queryParams.push(status);
    }

    const result = await db.query(`
      SELECT DISTINCT
        o.id, o.order_number, o.status, o.total_amount, o.currency,
        o.created_at, o.updated_at,
        u.first_name, u.last_name, u.email,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'product_name', p.name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price
          )
        ) as supplier_items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      JOIN supplier_products sp ON p.id = sp.product_id
      JOIN users u ON o.user_id = u.id
      ${whereClause}
      GROUP BY o.id, u.id
      ORDER BY o.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `, [...queryParams, limit, offset]);

    // Get total count
    const countResult = await db.query(`
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      JOIN supplier_products sp ON p.id = sp.product_id
      ${whereClause}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);

    res.json({
      orders: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get supplier orders error:', error);
    res.status(500).json({ message: 'Server error retrieving orders' });
  }
});

// Admin routes for supplier management
/**
 * @route GET /api/suppliers
 * @desc Get all suppliers (Admin only)
 * @access Private (Admin)
 */
router.get('/', authenticateToken, requireRole('admin'), [
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'suspended']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status;

    let whereClause = '';
    const queryParams = [];

    if (status) {
      whereClause = 'WHERE status = $1';
      queryParams.push(status);
    }

    const result = await db.query(`
      SELECT 
        id, company_name, email, contact_person, phone, country,
        business_type, status, email_verified, created_at, last_login
      FROM suppliers
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `, [...queryParams, limit, offset]);

    // Get total count
    const countResult = await db.query(`
      SELECT COUNT(*) as total FROM suppliers ${whereClause}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);

    res.json({
      suppliers: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ message: 'Server error retrieving suppliers' });
  }
});

/**
 * @route PUT /api/suppliers/:id/status
 * @desc Update supplier status (Admin only)
 * @access Private (Admin)
 */
router.put('/:id/status', authenticateToken, requireRole('admin'), [
  param('id').isUUID().withMessage('Invalid supplier ID'),
  body('status').isIn(['approved', 'rejected', 'suspended']).withMessage('Invalid status'),
  body('notes').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    const result = await db.query(`
      UPDATE suppliers 
      SET status = $2, admin_notes = $3, updated_at = NOW()
      WHERE id = $1
      RETURNING id, company_name, email, status
    `, [id, status, notes]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const supplier = result.rows[0];

    // Send notification email to supplier
    if (status === 'approved') {
      await EmailService.sendSupplierApprovalEmail(supplier.email, supplier.company_name);
    } else if (status === 'rejected') {
      await EmailService.sendSupplierRejectionEmail(supplier.email, supplier.company_name, notes);
    }

    // Log admin action
    await logSecurityEvent('supplier_status_updated', req.user.id, req.ip, {
      supplierId: id,
      newStatus: status,
      notes
    });

    res.json({
      message: `Supplier status updated to ${status}`,
      supplier
    });

  } catch (error) {
    console.error('Update supplier status error:', error);
    res.status(500).json({ message: 'Server error updating supplier status' });
  }
});

module.exports = router;