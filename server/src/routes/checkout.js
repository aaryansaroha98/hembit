import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { readDb, writeDb } from '../services/store.js';
import { createId } from '../utils/id.js';

export const checkoutRouter = Router();

checkoutRouter.get('/razorpay-config', (_req, res) => {
  return res.json({
    keyId: process.env.RAZORPAY_KEY_ID || '',
    configured: Boolean(process.env.RAZORPAY_KEY_ID),
  });
});

checkoutRouter.get('/my-orders', requireAuth, (req, res) => {
  const db = readDb();
  const orders = db.orders.filter((item) => item.userId === req.user.id);
  return res.json({ orders });
});

checkoutRouter.post('/create-order', requireAuth, (req, res) => {
  const { items, address, paymentMethod = 'razorpay' } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Cart items are required' });
  }

  const db = readDb();
  const enrichedItems = items
    .map((item) => {
      const product = db.products.find((prod) => prod.id === item.productId);
      if (!product) {
        return null;
      }
      const quantity = Math.max(1, Number(item.quantity || 1));
      return {
        productId: product.id,
        name: product.name,
        size: item.size || 'M',
        quantity,
        price: product.price,
        image: product.images?.[0] || '',
        lineTotal: quantity * product.price,
      };
    })
    .filter(Boolean);

  if (enrichedItems.length === 0) {
    return res.status(400).json({ message: 'No valid cart items' });
  }

  const total = enrichedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const orderId = createId('ord');
  const now = new Date().toISOString();

  let order;
  writeDb((state) => {
    const customer = state.users.find((item) => item.id === req.user.id);

    order = {
      id: orderId,
      userId: req.user.id,
      customer: {
        name: customer?.name || '',
        email: customer?.email || '',
      },
      items: enrichedItems,
      address,
      total,
      paymentMethod,
      paymentStatus: 'pending',
      status: 'Pending Confirmation',
      timeline: [
        { status: 'Order Created', at: now },
        { status: 'Pending Confirmation', at: now },
      ],
      createdAt: now,
      updatedAt: now,
    };

    state.orders.unshift(order);
  });

  return res.json({
    order,
    razorpay: {
      configured: Boolean(process.env.RAZORPAY_KEY_ID),
      keyId: process.env.RAZORPAY_KEY_ID || '',
    },
  });
});

checkoutRouter.post('/confirm-payment', requireAuth, (req, res) => {
  const { orderId, paymentId } = req.body;

  if (!orderId) {
    return res.status(400).json({ message: 'orderId is required' });
  }

  let updatedOrder;

  writeDb((state) => {
    const order = state.orders.find((item) => item.id === orderId && item.userId === req.user.id);
    if (!order) {
      return;
    }

    order.paymentStatus = 'paid';
    order.status = 'Confirmed';
    order.paymentId = paymentId || createId('pay');
    order.updatedAt = new Date().toISOString();
    order.timeline.push({ status: 'Payment Successful', at: order.updatedAt });
    order.timeline.push({ status: 'Confirmed', at: order.updatedAt });

    updatedOrder = order;
  });

  if (!updatedOrder) {
    return res.status(404).json({ message: 'Order not found' });
  }

  return res.json({
    message: 'PAYMENT SUCCESSFUL. Thanks for shopping with HEMBIT.',
    order: updatedOrder,
  });
});
