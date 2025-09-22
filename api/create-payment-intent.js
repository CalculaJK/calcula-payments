// api/create-payment-intent.js
// Serverless function for Vercel
const Stripe = require('stripe');

// CORS helper
function cors(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async (req, res) => {
  const allowed = process.env.CORS_ALLOWED_ORIGIN || '*';
  cors(res, allowed);

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) {
      return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY' });
    }
    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    let { amount, currency = 'pln', metadata = {}, packageCode, subject, lessons } = body;

    // Jeśli nie podano kwoty, policz na podstawie pakietu (przykładowa tabela)
    const priceTable = {
      single60: 11000,
      single90: 16000,
      trial: 6000,
      // dla pakietów z cennika możesz wstawić własną logikę
    };
    if (!amount || amount <= 0) {
      if (packageCode && priceTable[packageCode]) {
        amount = priceTable[packageCode];
      } else {
        return res.status(400).json({ error: 'Missing amount or unsupported packageCode' });
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        ...metadata,
        packageCode: packageCode || '',
        subject: subject || '',
        lessons: lessons ? String(lessons) : ''
      }
    });

    return res.status(200).json({ client_secret: paymentIntent.client_secret });
  } catch (err) {
    console.error('PI error', err);
    return res.status(500).json({ error: err.message || 'server_error' });
  }
};
