const crypto = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ verified: false, error: 'Method not allowed' });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return res.status(500).json({ verified: false, error: 'Missing RAZORPAY_KEY_SECRET on server.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ verified: false, error: 'Missing payment verification fields.' });
    }

    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'utf8');
    const receivedBuf = Buffer.from(String(razorpay_signature), 'utf8');

    const isValid =
      expectedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, receivedBuf);

    if (!isValid) {
      return res.status(400).json({
        verified: false,
        error: 'Invalid payment signature. Order not marked as paid.'
      });
    }

    return res.status(200).json({
      verified: true,
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id
    });
  } catch (err) {
    return res.status(500).json({ verified: false, error: 'Verification error on server.' });
  }
};
