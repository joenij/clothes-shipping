const express = require('express');
const { body, query: queryValidator, param, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get products with filtering, sorting, and pagination
router.get('/', [
  queryValidator('page').optional().isInt({ min: 1 }).toInt(),
  queryValidator('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  queryValidator('category').optional().isUUID(),
  queryValidator('supplier').optional().isUUID(),
  queryValidator('search').optional().trim(),
  queryValidator('minPrice').optional().isFloat({ min: 0 }),
  queryValidator('maxPrice').optional().isFloat({ min: 0 }),
  queryValidator('sortBy').optional().isIn(['name', 'price', 'created_at', 'featured']),
  queryValidator('sortOrder').optional().isIn(['asc', 'desc']),
  queryValidator('featured').optional().isBoolean(),
  queryValidator('language').optional().isIn(['en', 'pt', 'de', 'fr', 'es'])
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      category,
      supplier,
      search,
      minPrice,
      maxPrice,
      sortBy = 'created_at',
      sortOrder = 'desc',
      featured,
      language = 'en'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build dynamic query
    let whereConditions = ['p.is_active = true'];
    let queryParams = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      whereConditions.push(`p.category_id = $${paramCount}`);
      queryParams.push(category);
    }

    if (supplier) {
      paramCount++;
      whereConditions.push(`p.supplier_id = $${paramCount}`);
      queryParams.push(supplier);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(
        p.name_${language} ILIKE $${paramCount} OR 
        p.description_${language} ILIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
    }

    if (minPrice !== undefined) {
      paramCount++;
      whereConditions.push(`p.base_price >= $${paramCount}`);
      queryParams.push(minPrice);
    }

    if (maxPrice !== undefined) {
      paramCount++;
      whereConditions.push(`p.base_price <= $${paramCount}`);
      queryParams.push(maxPrice);
    }

    if (featured !== undefined) {
      paramCount++;
      whereConditions.push(`p.featured = $${paramCount}`);
      queryParams.push(featured);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get products
    const productsQuery = `
      SELECT 
        p.id,
        p.sku,
        p.name_${language} as name,
        p.description_${language} as description,
        p.base_price,
        p.weight_grams,
        p.dimensions_cm,
        p.material,
        p.featured,
        p.created_at,
        c.name_${language} as category_name,
        c.slug as category_slug,
        s.company_name as supplier_name,
        (
          SELECT json_agg(
            json_build_object(
              'id', pi.id,
              'image_url', pi.image_url,
              'alt_text', pi.alt_text_${language},
              'is_primary', pi.is_primary
            )
            ORDER BY pi.sort_order, pi.is_primary DESC
          )
          FROM product_images pi 
          WHERE pi.product_id = p.id AND pi.variant_id IS NULL
        ) as images,
        (
          SELECT json_agg(
            json_build_object(
              'id', pv.id,
              'sku', pv.sku,
              'size', pv.size,
              'color', pv.color_${language},
              'color_hex', pv.color_hex,
              'price_adjustment', pv.price_adjustment,
              'stock_quantity', pv.stock_quantity,
              'is_active', pv.is_active
            )
          )
          FROM product_variants pv 
          WHERE pv.product_id = p.id AND pv.is_active = true
        ) as variants
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN suppliers s ON p.supplier_id = s.id
      ${whereClause}
      ORDER BY p.${sortBy === 'name' ? `name_${language}` : sortBy} ${sortOrder}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      ${whereClause}
    `;

    const [productsResult, countResult] = await Promise.all([
      query(productsQuery, queryParams),
      query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
    ]);

    const products = productsResult.rows;
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      products,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single product by ID
router.get('/:id', [
  param('id').isUUID(),
  queryValidator('language').optional().isIn(['en', 'pt', 'de', 'fr', 'es'])
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid parameters',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { language = 'en' } = req.query;

    const result = await query(`
      SELECT 
        p.id,
        p.sku,
        p.name_${language} as name,
        p.description_${language} as description,
        p.base_price,
        p.weight_grams,
        p.dimensions_cm,
        p.material,
        p.care_instructions_${language} as care_instructions,
        p.featured,
        p.created_at,
        c.id as category_id,
        c.name_${language} as category_name,
        c.slug as category_slug,
        s.id as supplier_id,
        s.company_name as supplier_name,
        s.rating as supplier_rating,
        (
          SELECT json_agg(
            json_build_object(
              'id', pi.id,
              'image_url', pi.image_url,
              'alt_text', pi.alt_text_${language},
              'is_primary', pi.is_primary,
              'sort_order', pi.sort_order
            )
            ORDER BY pi.sort_order, pi.is_primary DESC
          )
          FROM product_images pi 
          WHERE pi.product_id = p.id AND pi.variant_id IS NULL
        ) as images,
        (
          SELECT json_agg(
            json_build_object(
              'id', pv.id,
              'sku', pv.sku,
              'size', pv.size,
              'color', pv.color_${language},
              'color_hex', pv.color_hex,
              'price_adjustment', pv.price_adjustment,
              'stock_quantity', pv.stock_quantity,
              'reserved_quantity', pv.reserved_quantity,
              'is_active', pv.is_active,
              'images', (
                SELECT json_agg(
                  json_build_object(
                    'id', pvi.id,
                    'image_url', pvi.image_url,
                    'alt_text', pvi.alt_text_${language}
                  )
                  ORDER BY pvi.sort_order
                )
                FROM product_images pvi 
                WHERE pvi.variant_id = pv.id
              )
            )
          )
          FROM product_variants pv 
          WHERE pv.product_id = p.id
        ) as variants
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = $1 AND p.is_active = true
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }

    res.json({ product: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Create product (admin only)
router.post('/', authenticateToken, requireAdmin, [
  body('supplierId').isUUID(),
  body('categoryId').isUUID(),
  body('sku').trim().isLength({ min: 1, max: 50 }),
  body('name_en').trim().isLength({ min: 1, max: 255 }),
  body('name_pt').optional().trim().isLength({ max: 255 }),
  body('name_de').optional().trim().isLength({ max: 255 }),
  body('name_fr').optional().trim().isLength({ max: 255 }),
  body('name_es').optional().trim().isLength({ max: 255 }),
  body('basePrice').isFloat({ min: 0 }),
  body('costPrice').isFloat({ min: 0 }),
  body('weightGrams').isInt({ min: 1 }),
  body('dimensionsCm').optional().trim(),
  body('material').optional().trim().isLength({ max: 100 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const productData = req.body;

    // Check if SKU already exists
    const existingProduct = await query(
      'SELECT id FROM products WHERE sku = $1',
      [productData.sku]
    );

    if (existingProduct.rows.length > 0) {
      return res.status(409).json({
        error: 'SKU already exists'
      });
    }

    // Verify supplier and category exist
    const [supplierResult, categoryResult] = await Promise.all([
      query('SELECT id FROM suppliers WHERE id = $1 AND is_active = true', [productData.supplierId]),
      query('SELECT id FROM categories WHERE id = $1 AND is_active = true', [productData.categoryId])
    ]);

    if (supplierResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Supplier not found or inactive'
      });
    }

    if (categoryResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Category not found or inactive'
      });
    }

    // Insert product
    const result = await query(`
      INSERT INTO products (
        supplier_id, category_id, sku, name_en, name_pt, name_de, name_fr, name_es,
        description_en, description_pt, description_de, description_fr, description_es,
        base_price, cost_price, weight_grams, dimensions_cm, material,
        care_instructions_en, care_instructions_pt, care_instructions_de, 
        care_instructions_fr, care_instructions_es, featured
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
      ) RETURNING *
    `, [
      productData.supplierId,
      productData.categoryId,
      productData.sku,
      productData.name_en,
      productData.name_pt || null,
      productData.name_de || null,
      productData.name_fr || null,
      productData.name_es || null,
      productData.description_en || null,
      productData.description_pt || null,
      productData.description_de || null,
      productData.description_fr || null,
      productData.description_es || null,
      productData.basePrice,
      productData.costPrice,
      productData.weightGrams,
      productData.dimensionsCm || null,
      productData.material || null,
      productData.care_instructions_en || null,
      productData.care_instructions_pt || null,
      productData.care_instructions_de || null,
      productData.care_instructions_fr || null,
      productData.care_instructions_es || null,
      productData.featured || false
    ]);

    logger.info('Product created', { 
      productId: result.rows[0].id, 
      sku: result.rows[0].sku,
      createdBy: req.user.id 
    });

    res.status(201).json({
      message: 'Product created successfully',
      product: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;