const express = require('express');
const { body, param, query: queryValidator, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const DHLService = require('../services/DHLService');
const logger = require('../utils/logger');

const router = express.Router();

// Get shipping zones
router.get('/zones', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT 
        id,
        name,
        countries,
        base_rate,
        per_kg_rate,
        free_shipping_threshold,
        estimated_days_min,
        estimated_days_max,
        is_active
      FROM shipping_zones 
      WHERE is_active = true
      ORDER BY name
    `);

    res.json({
      shippingZones: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Calculate shipping cost
router.post('/calculate', [
  body('recipient').isObject(),
  body('recipient.countryCode').isLength({ min: 2, max: 2 }),
  body('recipient.postalCode').trim().notEmpty(),
  body('recipient.city').trim().notEmpty(),
  body('items').isArray({ min: 1 }),
  body('items.*.productId').isUUID(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('sender').optional().isObject()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid shipping calculation request',
        details: errors.array()
      });
    }

    const { recipient, items, sender } = req.body;

    // Get product details for weight calculation
    const productIds = items.map(item => item.productId);
    const placeholders = productIds.map((_, index) => `$${index + 1}`).join(',');
    
    const productsResult = await query(`
      SELECT p.id, p.weight_grams, p.base_price, pv.weight_grams as variant_weight
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      WHERE p.id IN (${placeholders}) AND p.is_active = true
    `, productIds);

    if (productsResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Products not found'
      });
    }

    // Calculate total weight and value
    let totalWeight = 0;
    let totalValue = 0;

    for (const item of items) {
      const product = productsResult.rows.find(p => p.id === item.productId);
      if (product) {
        const weight = (product.variant_weight || product.weight_grams) / 1000; // Convert to kg
        totalWeight += weight * item.quantity;
        totalValue += product.base_price * item.quantity;
      }
    }

    // Find shipping zone
    const zoneResult = await query(`
      SELECT * FROM shipping_zones 
      WHERE $1 = ANY(countries) AND is_active = true
      ORDER BY base_rate ASC
      LIMIT 1
    `, [recipient.countryCode]);

    if (zoneResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Shipping not available to this destination'
      });
    }

    const zone = zoneResult.rows[0];

    // Calculate shipping cost
    const baseCost = parseFloat(zone.base_rate);
    const weightCost = totalWeight * parseFloat(zone.per_kg_rate);
    const totalShippingCost = baseCost + weightCost;

    // Check for free shipping
    const freeShippingThreshold = parseFloat(zone.free_shipping_threshold || 0);
    const finalCost = (totalValue >= freeShippingThreshold) ? 0 : totalShippingCost;

    // Get DHL rates for comparison (optional)
    let dhlRates = [];
    if (sender && process.env.DHL_API_KEY) {
      try {
        const packages = [{
          weight: Math.max(totalWeight, 0.1), // Minimum 100g
          dimensions: {
            length: 30,
            width: 20,
            height: 10
          },
          declaredValue: totalValue,
          currency: 'EUR'
        }];

        const dhlResult = await DHLService.getShippingRates({
          sender,
          recipient,
          packages
        });

        if (dhlResult.success) {
          dhlRates = dhlResult.data;
        }
      } catch (error) {
        logger.warn('DHL rate calculation failed', error);
      }
    }

    res.json({
      shippingCost: {
        baseCost: baseCost,
        weightCost: weightCost,
        totalCost: finalCost,
        originalCost: totalShippingCost,
        currency: 'EUR',
        freeShippingApplied: finalCost === 0 && totalShippingCost > 0,
        freeShippingThreshold: freeShippingThreshold
      },
      estimatedDelivery: {
        minDays: zone.estimated_days_min,
        maxDays: zone.estimated_days_max
      },
      totalWeight: totalWeight,
      totalValue: totalValue,
      shippingZone: {
        id: zone.id,
        name: zone.name
      },
      dhlRates: dhlRates
    });

  } catch (error) {
    next(error);
  }
});

// Create shipment (admin/system use)
router.post('/create-shipment', authenticateToken, requireAdmin, [
  body('orderId').isUUID(),
  body('recipient').isObject(),
  body('packages').isArray({ min: 1 }),
  body('serviceType').optional().isString()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid shipment creation request',
        details: errors.array()
      });
    }

    const { orderId, recipient, packages, serviceType } = req.body;

    // Get order details
    const orderResult = await query(`
      SELECT o.*, u.email, u.first_name, u.last_name, u.phone
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = $1 AND o.status = 'confirmed'
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Order not found or not ready for shipment'
      });
    }

    const order = orderResult.rows[0];

    // Default sender information (from China)
    const sender = {
      companyName: process.env.SENDER_COMPANY_NAME || 'Clothes Shipping Store',
      fullName: process.env.SENDER_CONTACT_NAME || 'Shipping Manager',
      email: process.env.SENDER_EMAIL || 'shipping@itsjn.com',
      phone: process.env.SENDER_PHONE || '+86-xxx-xxxx-xxxx',
      addressLine1: process.env.SENDER_ADDRESS_LINE1 || 'Warehouse Address',
      city: process.env.SENDER_CITY || 'Shenzhen',
      postalCode: process.env.SENDER_POSTAL_CODE || '518000',
      countryCode: 'CN'
    };

    // Create DHL shipment
    const shipmentResult = await DHLService.createShipment({
      orderId,
      sender,
      recipient: {
        ...recipient,
        firstName: order.first_name,
        lastName: order.last_name,
        email: order.email,
        phone: order.phone
      },
      packages,
      serviceType: serviceType || 'EXPRESS'
    });

    if (!shipmentResult.success) {
      return res.status(400).json({
        error: shipmentResult.error
      });
    }

    // Update order with tracking information
    await transaction(async (client) => {
      await client.query(`
        UPDATE orders 
        SET 
          status = 'shipped',
          tracking_number = $1,
          dhl_shipment_id = $2,
          estimated_delivery = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [
        shipmentResult.data.trackingNumber,
        shipmentResult.data.shipmentId,
        shipmentResult.data.estimatedDeliveryDate || null,
        orderId
      ]);

      logger.info('Shipment created successfully', {
        orderId,
        trackingNumber: shipmentResult.data.trackingNumber,
        shipmentId: shipmentResult.data.shipmentId
      });
    });

    res.json({
      message: 'Shipment created successfully',
      shipment: {
        orderId,
        trackingNumber: shipmentResult.data.trackingNumber,
        shipmentId: shipmentResult.data.shipmentId,
        estimatedDeliveryDate: shipmentResult.data.estimatedDeliveryDate,
        shippingLabel: shipmentResult.data.label
      }
    });

  } catch (error) {
    next(error);
  }
});

// Track shipment
router.get('/track/:trackingNumber', [
  param('trackingNumber').trim().notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid tracking number',
        details: errors.array()
      });
    }

    const { trackingNumber } = req.params;

    // Get tracking info from DHL
    const trackingResult = await DHLService.trackShipment(trackingNumber);

    if (!trackingResult.success) {
      return res.status(404).json({
        error: trackingResult.error
      });
    }

    // Also get order information if user is authenticated
    let orderInfo = null;
    if (req.user) {
      const orderResult = await query(`
        SELECT id, order_number, status, total_amount, currency, created_at
        FROM orders 
        WHERE tracking_number = $1 AND user_id = $2
      `, [trackingNumber, req.user.id]);

      if (orderResult.rows.length > 0) {
        orderInfo = orderResult.rows[0];
      }
    }

    res.json({
      tracking: trackingResult.data,
      order: orderInfo
    });

  } catch (error) {
    next(error);
  }
});

// Get available services for route
router.post('/services', [
  body('origin').isObject(),
  body('origin.countryCode').isLength({ min: 2, max: 2 }),
  body('destination').isObject(),
  body('destination.countryCode').isLength({ min: 2, max: 2 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid service request',
        details: errors.array()
      });
    }

    const { origin, destination } = req.body;

    const servicesResult = await DHLService.getAvailableServices(origin, destination);

    if (!servicesResult.success) {
      return res.status(400).json({
        error: servicesResult.error
      });
    }

    res.json({
      services: servicesResult.data
    });

  } catch (error) {
    next(error);
  }
});

// Validate shipping address
router.post('/validate-address', [
  body('address').isObject(),
  body('address.countryCode').isLength({ min: 2, max: 2 }),
  body('address.postalCode').trim().notEmpty(),
  body('address.city').trim().notEmpty(),
  body('address.addressLine1').trim().notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid address data',
        details: errors.array()
      });
    }

    const { address } = req.body;

    const validationResult = await DHLService.validateAddress(address);

    res.json({
      validation: validationResult
    });

  } catch (error) {
    next(error);
  }
});

// Cancel shipment (admin only)
router.delete('/shipments/:shipmentId', authenticateToken, requireAdmin, [
  param('shipmentId').trim().notEmpty(),
  body('reason').optional().trim()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid cancellation request',
        details: errors.array()
      });
    }

    const { shipmentId } = req.params;
    const { reason } = req.body;

    // Cancel with DHL
    const cancellationResult = await DHLService.cancelShipment(shipmentId, reason);

    if (!cancellationResult.success) {
      return res.status(400).json({
        error: cancellationResult.error
      });
    }

    // Update order status
    await query(`
      UPDATE orders 
      SET 
        status = 'processing',
        tracking_number = NULL,
        dhl_shipment_id = NULL,
        notes = COALESCE(notes || ' | ', '') || 'Shipment cancelled: ' || $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE dhl_shipment_id = $2
    `, [reason || 'Admin request', shipmentId]);

    logger.info('Shipment cancelled', {
      shipmentId,
      reason,
      cancelledBy: req.user.id
    });

    res.json({
      message: 'Shipment cancelled successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Get shipping statistics (admin only)
router.get('/statistics', authenticateToken, requireAdmin, [
  queryValidator('startDate').optional().isISO8601(),
  queryValidator('endDate').optional().isISO8601()
], async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = startDate && endDate 
      ? 'AND created_at BETWEEN $1 AND $2'
      : '';
    const params = startDate && endDate ? [startDate, endDate] : [];

    const [
      totalShipmentsResult,
      statusBreakdownResult,
      countryBreakdownResult
    ] = await Promise.all([
      query(`
        SELECT COUNT(*) as total_shipments,
               AVG(shipping_cost) as avg_shipping_cost
        FROM orders 
        WHERE tracking_number IS NOT NULL ${dateFilter}
      `, params),
      
      query(`
        SELECT status, COUNT(*) as count
        FROM orders 
        WHERE tracking_number IS NOT NULL ${dateFilter}
        GROUP BY status
      `, params),
      
      query(`
        SELECT 
          (shipping_address->>'country')::text as country,
          COUNT(*) as shipment_count
        FROM orders 
        WHERE tracking_number IS NOT NULL ${dateFilter}
        GROUP BY shipping_address->>'country'
        ORDER BY shipment_count DESC
        LIMIT 10
      `, params)
    ]);

    res.json({
      statistics: {
        totalShipments: parseInt(totalShipmentsResult.rows[0].total_shipments) || 0,
        averageShippingCost: parseFloat(totalShipmentsResult.rows[0].avg_shipping_cost) || 0,
        statusBreakdown: statusBreakdownResult.rows,
        topCountries: countryBreakdownResult.rows
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;