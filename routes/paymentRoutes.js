import express from 'express';
import Stripe from 'stripe';
import authMiddleware from '../middleware/authMiddleware.js';
import orderModel from '../models/orderModel.js';

const paymentRouter = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

paymentRouter.post('/create-checkout-session', authMiddleware, async (req, res) => {
  const { quantity, address = '', location, dateTime = '', userId, userEmail = '' } = req.body;

  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return res.status(400).json({ message: 'Valid user location (lat, lng) is required' });
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ message: 'Quantity must be a positive integer' });
  }

  try {
    const unitPricePaise = 20 * 100;
    const totalAmount = unitPricePaise * quantity;

    if (totalAmount < 5000) {
      return res.status(400).json({ message: 'Total amount must be at least ₹50' });
    }

    const effectiveUserId = userId || req.user._id.toString();
    const effectiveUserEmail = userEmail || req.user.email;

    const order = await orderModel.create({
      userId: effectiveUserId,
      userEmail: effectiveUserEmail,
      quantity,
      address,
      location: {
        type: 'Point',
        coordinates: [location.lng, location.lat],
      },
      dateTime: dateTime ? new Date(dateTime) : new Date(),
      status: 'Pending',
      paymentStatus: 'unpaid',
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'inr',
          product_data: { name: 'Water Delivery' },
          unit_amount: unitPricePaise,
        },
        quantity,
      }],
      mode: 'payment',
      customer_email: effectiveUserEmail,
      metadata: {
        orderId: order._id.toString(),
        address: address || '',
        dateTime: dateTime ? new Date(dateTime).getTime().toString() : Date.now().toString(),
        lat: location.lat.toString(),
        lng: location.lng.toString(),
        quantity: quantity.toString(),
        userEmail: effectiveUserEmail,
        userId: effectiveUserId.toString(),
      },
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard`,
    });

    order.stripeSessionId = session.id;
    await order.save();

    return res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default paymentRouter;
