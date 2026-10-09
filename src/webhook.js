const express = require('express');
const { isMock } = require('./mode');
const { sendOrderDetails } = require('./orderDetails');
const { sendOrderStatus } = require('./orderStatus');
const { PAY_BUTTON_ID, hasPending, sendMockCheckout, sendMockReceipt } = require('./mock');

// Text from the user, or a payment update. Status callbacks (sent/delivered/read) return null.
function extractEvent(body) {
  const value = body?.entry?.[0]?.changes?.[0]?.value;
  if (!value) return null;

  const message = value.messages?.[0];
  if (message?.type === 'text' && message.from) {
    return { kind: 'text', from: message.from, text: message.text?.body || '' };
  }

  const button = message?.interactive?.button_reply;
  if (message?.type === 'interactive' && button && message.from) {
    return { kind: 'button', from: message.from, id: button.id, title: button.title };
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
    if (isMock() && hasPending(event.from) && event.text.trim().toLowerCase() === 'paid') {
      await sendMockReceipt(event.from);
      return;
    }
    if (isMock()) await sendMockCheckout(event.from);
    else await sendOrderDetails(event.from);
    return;
  }

  if (event.kind === 'button' && event.id === PAY_BUTTON_ID) {
    console.log(`[Incoming Message] ${event.from}: ${event.title}`);
    await sendMockReceipt(event.from);
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
