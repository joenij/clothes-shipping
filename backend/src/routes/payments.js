const express = require('express');
const Stripe = require('stripe');
const { body, param, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Initialize Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe webhook endpoint secret
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Create payment intent
router.post('/create-intent', authenticateToken, [
  body('amount').isFloat({ min: 0.50 }), // Minimum 50 cents
  body('currency').isIn(['EUR', 'BRL', 'NAD']),
  body('orderId').optional().isUUID(),
  body('customerId').optional().isString(),
  body('metadata').optional().isObject()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid payment data',
        details: errors.array()
      });
    }

    const { 
      amount, 
      currency, 
      orderId, 
      customerId, 
      metadata = {} 
    } = req.body;

    // Convert amount to smallest currency unit (cents, centavos, etc.)
    const amountInCents = Math.round(amount * 100);

    // Create or retrieve Stripe customer
    let stripeCustomerId = customerId;
    if (!stripeCustomerId) {
      // Get user details
      const userResult = await query(
        'SELECT email, first_name, last_name FROM users WHERE id = $1',
        [req.user.id]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];

      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        metadata: {
          userId: req.user.id
        }
      });

      stripeCustomerId = customer.id;

      // Update user with Stripe customer ID
      await query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [stripeCustomerId, req.user.id]
      );
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      customer: stripeCustomerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: req.user.id,
        orderId: orderId || '',
        ...metadata
      },
      // Enable future payments for this customer
      setup_future_usage: 'on_session',
    });

    // Log payment intent creation
    logger.info('Payment intent created', {
      paymentIntentId: paymentIntent.id,
      amount: amountInCents,
      currency,
      userId: req.user.id,
      orderId: orderId || null
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      customerId: stripeCustomerId
    });

  } catch (error) {
    logger.error('Payment intent creation failed', error);
    next(error);
  }
});

// Confirm payment
router.post('/confirm', authenticateToken, [
  body('paymentIntentId').isString().notEmpty(),
  body('paymentMethodId').optional().isString(),
  body('orderId').optional().isUUID()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid confirmation data',
        details: errors.array()
      });
    }

    const { paymentIntentId, paymentMethodId, orderId } = req.body;

    // Retrieve payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      return res.status(404).json({ error: 'Payment intent not found' });
    }

    // Verify the payment intent belongs to the authenticated user
    if (paymentIntent.metadata.userId !== req.user.id) {
      return res.status(403).json({ error: 'Payment intent access denied' });
    }

    let result;
    
    // If payment method provided, confirm the payment
    if (paymentMethodId) {
      result = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
        return_url: process.env.FRONTEND_URL + '/payment-complete'
      });
    } else {
      // Just retrieve the current status
      result = paymentIntent;
    }

    // Update order payment status if orderId provided
    if (orderId && result.status === 'succeeded') {
      await transaction(async (client) => {
        // Update order payment status
        await client.query(
          `UPDATE orders 
           SET payment_status = 'paid', 
               payment_intent_id = $1, 
               payment_method = 'stripe_card',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND user_id = $3`,
          [paymentIntentId, orderId, req.user.id]
        );

        // Log successful payment
        logger.info('Payment confirmed successfully', {
          paymentIntentId,
          orderId,
          userId: req.user.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency
        });
      });
    }

    res.json({
      status: result.status,
      paymentIntent: {
        id: result.id,
        status: result.status,
        amount: result.amount,
        currency: result.currency
      }
    });

  } catch (error) {
    logger.error('Payment confirmation failed', error);
    next(error);
  }
});

// Get payment methods for customer
router.get('/payment-methods', authenticateToken, async (req, res, next) => {
  try {
    // Get user's Stripe customer ID
    const userResult = await query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stripeCustomerId = userResult.rows[0].stripe_customer_id;

    if (!stripeCustomerId) {
      return res.json({ paymentMethods: [] });
    }

    // Retrieve payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    });

    const formattedMethods = paymentMethods.data.map(pm => ({
      id: pm.id,
      type: pm.type,
      card: pm.card ? {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      } : null,
      created: pm.created
    }));

    res.json({ paymentMethods: formattedMethods });

  } catch (error) {
    logger.error('Failed to retrieve payment methods', error);
    next(error);
  }
});

// Delete payment method
router.delete('/payment-methods/:id', authenticateToken, [
  param('id').isString().notEmpty()
], async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify the payment method belongs to the user
    const paymentMethod = await stripe.paymentMethods.retrieve(id);
    
    if (!paymentMethod.customer) {
      return res.status(403).json({ error: 'Payment method access denied' });
    }

    // Get user's Stripe customer ID
    const userResult = await query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0 || 
        userResult.rows[0].stripe_customer_id !== paymentMethod.customer) {
      return res.status(403).json({ error: 'Payment method access denied' });
    }

    // Detach payment method from customer
    await stripe.paymentMethods.detach(id);

    logger.info('Payment method deleted', {
      paymentMethodId: id,
      userId: req.user.id
    });

    res.json({ message: 'Payment method deleted successfully' });

  } catch (error) {
    logger.error('Failed to delete payment method', error);
    next(error);
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    logger.error('Webhook signature verification failed', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      
      case 'customer.subscription.created':
        // Handle subscription created if needed
        break;
      
      case 'invoice.payment_succeeded':
        // Handle invoice payment if needed
        break;
      
      default:
        logger.info(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook handler error', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle successful payment intent
const handlePaymentIntentSucceeded = async (paymentIntent) => {
  try {
    const { id, metadata, amount, currency } = paymentIntent;
    const userId = metadata.userId;
    const orderId = metadata.orderId;

    if (orderId) {
      await transaction(async (client) => {
        // Update order status
        await client.query(
          `UPDATE orders 
           SET payment_status = 'paid',
               status = 'confirmed',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND user_id = $2`,
          [orderId, userId]
        );

        // Create order items inventory reservation
        const orderItems = await client.query(
          `SELECT product_id, variant_id, quantity 
           FROM order_items WHERE order_id = $1`,
          [orderId]
        );

        // Reserve inventory for each item
        for (const item of orderItems.rows) {
          await client.query(
            `UPDATE product_variants 
             SET reserved_quantity = reserved_quantity + $1
             WHERE id = $2`,
            [item.quantity, item.variant_id]
          );

          // Log inventory movement
          await client.query(
            `INSERT INTO inventory_movements (variant_id, type, quantity, reference_id, notes)
             VALUES ($1, 'reserve', $2, $3, 'Reserved for order')`,
            [item.variant_id, item.quantity, orderId]
          );
        }
      });

      logger.info('Payment succeeded and order updated', {
        paymentIntentId: id,
        orderId,
        userId,
        amount,
        currency
      });
    }
  } catch (error) {
    logger.error('Failed to handle payment intent succeeded', error);
  }
};

// Handle failed payment intent
const handlePaymentIntentFailed = async (paymentIntent) => {
  try {
    const { id, metadata, last_payment_error } = paymentIntent;
    const userId = metadata.userId;
    const orderId = metadata.orderId;

    if (orderId) {
      await query(
        `UPDATE orders 
         SET payment_status = 'failed',
             notes = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND user_id = $3`,
        [last_payment_error?.message || 'Payment failed', orderId, userId]
      );

      logger.info('Payment failed and order updated', {
        paymentIntentId: id,
        orderId,
        userId,
        error: last_payment_error?.message
      });
    }
  } catch (error) {
    logger.error('Failed to handle payment intent failed', error);
  }
};

// Get payment status
router.get('/status/:paymentIntentId', authenticateToken, [
  param('paymentIntentId').isString().notEmpty()
], async (req, res, next) => {
  try {
    const { paymentIntentId } = req.params;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      return res.status(404).json({ error: 'Payment intent not found' });
    }

    // Verify ownership
    if (paymentIntent.metadata.userId !== req.user.id) {
      return res.status(403).json({ error: 'Payment intent access denied' });
    }

    res.json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      created: paymentIntent.created,
      lastPaymentError: paymentIntent.last_payment_error
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;