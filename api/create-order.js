const Razorpay = require('razorpay');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return res.status(500).json({
      error: 'Server is missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variables.'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const amount = Math.round(Number(body.amount));
    const currency = String(body.currency || 'INR').toUpperCase();
    const receipt = String(body.receipt || `pf_${Date.now()}`).slice(0, 40);
    const notes = body.notes && typeof body.notes === 'object' ? body.notes : {};

    if (!Number.isFinite(amount) || amount < 100) {
      return res.status(400).json({ error: 'Minimum amount is 100 subunits (₹1.00 / $1.00).' });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });

    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
      notes
    });

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId
    });
  } catch (err) {
    if (err && err.statusCode === 401) {
      return res.status(401).json({ error: 'Razorpay authentication failed. Check your API keys in Vercel.' });
    }
    const msg = (err && err.error && err.error.description) || 'Failed to create Razorpay order.';
    return res.status(500).json({ error: msg });
  }
};
