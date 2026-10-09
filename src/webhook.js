const express = require('express');
const { sendOrderDetails } = require('./orderDetails');
const { sendOrderStatus } = require('./orderStatus');

// Text from the user, or a payment update. Status callbacks (sent/delivered/read) return null.
function extractEvent(body) {
  const value = body?.entry?.[0]?.changes?.[0]?.value;
  if (!value) return null;

  const message = value.messages?.[0];
  if (message?.type === 'text' && message.from) {
    return { kind: 'text', from: message.from, text: message.text?.body || '' };
  }

  if (message?.payment) {
    return {
      kind: 'payment',
      payment: message.payment,
      waId: message.from || value.contacts?.[0]?.wa_id,
    };
  }

  const status = value.statuses?.[0];
  if (status?.payment || status?.type === 'payment') {
    return {
      kind: 'payment',
      payment: { ...status.payment, status: status.payment?.status || status.status },
      waId: status.recipient_id,
    };
  }

  return null;
}

async function handleWebhook(body) {
  console.log('[Webhook Received]', JSON.stringify(body));
  const event = extractEvent(body);
  if (!event) {
    console.log('[Webhook Received] ignored (not a user text or payment update)');
    return;
  }

  if (event.kind === 'text') {
    console.log(`[Incoming Message] ${event.from}: ${event.text}`);
    await sendOrderDetails(event.from);
    return;
  }

  if (event.payment?.status === 'captured') {
    console.log(`[Payment Captured] ref=${event.payment.reference_id} wa_id=${event.waId}`);
    await sendOrderStatus(event.waId, event.payment.reference_id);
    return;
  }

  console.log(`[Webhook Received] payment status=${event.payment?.status || 'unknown'}`);
}

function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token && token === process.env.VERIFY_TOKEN) {
      console.log('[Webhook] verification succeeded');
      return res.status(200).send(challenge);
    }
    console.log('[Webhook] verification failed');
    return res.sendStatus(403);
  });

  app.post('/webhook', (req, res) => {
    res.sendStatus(200);
    handleWebhook(req.body).catch((err) => {
      console.error('[Webhook ERROR]', err.message);
    });
  });

  return app;
}

module.exports = { extractEvent, handleWebhook, createApp };
