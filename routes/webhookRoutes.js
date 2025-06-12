import express from 'express';
import Stripe from 'stripe';
import orderModel from '../models/orderModel.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post('/', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    console.error('Missing Stripe signature header');
    return res.status(400).send('Missing signature');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('✅ Webhook verified:', event.type);
  } catch (err) {
    console.error('❌ Webhook verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;

    if (!orderId) {
      console.error('Missing orderId in session metadata');
      return res.status(400).send('Missing orderId');
    }

    try {
      const result = await orderModel.updateOne(
        { _id: orderId },
        {
          $set: {
            paymentStatus: 'paid',
            status: 'Paid',
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent,
          },
        }
      );

      console.log('Order updated successfully:', result);
    } catch (error) {
      console.error('Error updating order:', error);
      return res.status(500).send('Database update failed');
    }
  }

  res.json({ received: true });
});

export default router;
