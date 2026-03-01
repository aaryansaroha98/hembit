import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { readDb, writeDb } from '../services/store.js';
import { createId, createOrderNumber } from '../utils/id.js';
import { sendEmail } from '../services/email.js';

export const checkoutRouter = Router();

checkoutRouter.get('/razorpay-config', (_req, res) => {
  const db = readDb();
  const dbKey = db.settings?.razorpay?.keyId || '';
  const keyId = dbKey || process.env.RAZORPAY_KEY_ID || '';
  return res.json({
    keyId,
    configured: Boolean(keyId),
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
  const orderNumber = createOrderNumber();
  const now = new Date().toISOString();

  let order;
  writeDb((state) => {
    const customer = state.users.find((item) => item.id === req.user.id);

    order = {
      id: orderId,
      orderNumber,
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

  const dbKey = readDb().settings?.razorpay?.keyId || '';
  const razorpayKeyId = dbKey || process.env.RAZORPAY_KEY_ID || '';

  return res.json({
    order,
    razorpay: {
      configured: Boolean(razorpayKeyId),
      keyId: razorpayKeyId,
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

  /* Send confirmation email (async, don't block response) */
  const email = updatedOrder.customer?.email;
  if (email) {
    const itemRows = updatedOrder.items.map((item) =>
      `<tr>
        <td style="padding:10px 16px;font-size:13px;color:#111;border-bottom:1px solid #f0f0f0;">
          ${item.image ? `<img src="${item.image}" alt="" width="40" height="52" style="object-fit:cover;vertical-align:middle;margin-right:10px;border:1px solid #eee;">` : ''}
          ${item.name}
        </td>
        <td style="padding:10px 16px;font-size:13px;color:#555;text-align:center;border-bottom:1px solid #f0f0f0;">${item.size}</td>
        <td style="padding:10px 16px;font-size:13px;color:#555;text-align:center;border-bottom:1px solid #f0f0f0;">${item.quantity}</td>
        <td style="padding:10px 16px;font-size:13px;color:#111;text-align:right;font-weight:500;border-bottom:1px solid #f0f0f0;">₹${Number(item.lineTotal).toLocaleString('en-IN')}</td>
      </tr>`
    ).join('');

    const addr = updatedOrder.address || {};
    const addrHtml = addr.line1
      ? `<tr><td style="padding:16px 20px;">
          <span style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#888;">Shipping Address</span><br>
          <span style="font-size:13px;color:#111;line-height:1.6;">${addr.line1}${addr.line2 ? '<br>' + addr.line2 : ''}<br>${addr.city}, ${addr.state} ${addr.postalCode}<br>${addr.country}</span>
        </td></tr>`
      : '';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e5e5;">
      <tr><td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #eee;">
        <h1 style="margin:0;font-size:18px;letter-spacing:0.2em;font-weight:500;color:#111;">HEMBIT</h1>
      </td></tr>
      <tr><td style="padding:32px 32px 8px;text-align:center;">
        <h2 style="margin:0 0 8px;font-size:16px;font-weight:500;letter-spacing:0.06em;color:#111;">Order Confirmed</h2>
        <p style="margin:0;font-size:13px;color:#888;">Thank you for your order. We're getting it ready.</p>
      </td></tr>
      <tr><td style="padding:16px 32px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #eee;border-radius:4px;">
          <tr>
            <td style="padding:14px 20px;border-bottom:1px solid #eee;">
              <span style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#888;">Order Number</span><br>
              <strong style="font-size:14px;color:#111;">${updatedOrder.orderNumber || updatedOrder.id}</strong>
            </td>
            <td style="padding:14px 20px;border-bottom:1px solid #eee;text-align:right;">
              <span style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#888;">Date</span><br>
              <strong style="font-size:14px;color:#111;">${new Date(updatedOrder.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
            </td>
          </tr>
          ${addrHtml}
        </table>
      </td></tr>
      <tr><td style="padding:0 32px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:4px;overflow:hidden;">
          <thead><tr style="background:#111;">
            <th style="padding:10px 16px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#fff;text-align:left;font-weight:500;">Item</th>
            <th style="padding:10px 16px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#fff;text-align:center;font-weight:500;">Size</th>
            <th style="padding:10px 16px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#fff;text-align:center;font-weight:500;">Qty</th>
            <th style="padding:10px 16px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#fff;text-align:right;font-weight:500;">Amount</th>
          </tr></thead>
          <tbody>${itemRows}</tbody>
          <tfoot><tr>
            <td colspan="3" style="padding:12px 16px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#111;">Total</td>
            <td style="padding:12px 16px;font-size:15px;font-weight:700;color:#111;text-align:right;">₹${Number(updatedOrder.total).toLocaleString('en-IN')}</td>
          </tr></tfoot>
        </table>
      </td></tr>
      <tr><td style="background:#111;padding:24px 32px;text-align:center;">
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.12em;color:rgba(255,255,255,0.5);text-transform:uppercase;">Thank you for shopping with</p>
        <p style="margin:0;font-size:15px;letter-spacing:0.18em;color:#fff;font-weight:600;">HEMBIT</p>
        <p style="margin:10px 0 0;font-size:11px;color:rgba(255,255,255,0.35);">hembit.in</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

    sendEmail({
      to: email,
      subject: `HEMBIT — Order Confirmed ${updatedOrder.orderNumber || updatedOrder.id}`,
      html,
    }).catch(() => { /* silent */ });
  }

  return res.json({
    message: 'PAYMENT SUCCESSFUL. Thanks for shopping with HEMBIT.',
    order: updatedOrder,
  });
});
