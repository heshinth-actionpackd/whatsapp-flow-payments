const { postMessage } = require('./graph');
const { sendOrderStatus } = require('./orderStatus');

const PAY_BUTTON_ID = 'pay';
const NO_TAX = { value: 0, offset: 100, description: 'Included' };
const pending = new Map();

const PLANS = [
  { id: 'plan_199', title: '₹199 · 28 days', description: 'Starter renewal', name: 'Wheelz Tracker Starter', days: 28, value: 19900 },
  { id: 'plan_499', title: '₹499 · 28 days', description: 'Standard renewal', name: 'Wheelz Tracker Standard', days: 28, value: 49900 },
  { id: 'plan_999', title: '₹999 · 84 days', description: 'Extended renewal', name: 'Wheelz Tracker Extended', days: 84, value: 99900 },
];

function upiLink(referenceId) {
  return `upi://pay?pa=wheelztracker@upi&pn=WheelzTracker&mc=4814&purpose=00&tr=${referenceId}`;
}

function matchPlan(text) {
  const raw = String(text || '').trim().toLowerCase();
  const byId = PLANS.find((plan) => plan.id === raw);
  if (byId) return byId;
  const n = raw.replace(/[₹,\s]/g, '');
  if (n === '1' || n === '199') return PLANS[0];
  if (n === '2' || n === '499') return PLANS[1];
  if (n === '3' || n === '999') return PLANS[2];
  return null;
}

function receiptText(plan) {
  if (!plan) return 'Renewal successful! Your Wheelz Tracker plan is now active.';
  return `Renewal successful! ${plan.name} is active for ${plan.days} days.`;
}

function buildMenu(to) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: 'Wheelz Tracker' },
      body: { text: 'Pick a renewal, then pay to keep Wheelz Tracker active.' },
      footer: { text: 'Or reply 1, 2, or 3' },
      action: {
        button: 'View plans',
        sections: [
          {
            title: 'Renewals',
            rows: PLANS.map((plan) => ({
              id: plan.id,
              title: plan.title,
              description: plan.description,
            })),
          },
        ],
      },
    },
  };
}

function buildMockCheckout(to, referenceId, plan = PLANS[1]) {
  const amount = { value: plan.value, offset: 100 };
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'order_details',
      body: {
        text: `${plan.name} — ${plan.title}. Tap Review and Pay to renew.`,
      },
      footer: { text: 'Reply paid after payment.' },
      action: {
        name: 'review_and_pay',
        parameters: {
          reference_id: referenceId,
          type: 'digital-goods',
          payment_settings: [{ type: 'upi_intent_link', upi_intent_link: { link: upiLink(referenceId) } }],
          currency: 'INR',
          total_amount: amount,
          order: {
            status: 'pending',
            items: [
              {
                name: plan.name,
                amount,
                quantity: 1,
                country_of_origin: 'IN',
                importer_name: 'Wheelz Tracker',
                importer_address: {
                  address_line1: 'Operations Hub',
                  city: 'Mumbai',
                  zone_code: 'MH',
                  postal_code: '400001',
                  country_code: 'IN',
                },
              },
            ],
            subtotal: amount,
            tax: NO_TAX,
          },
        },
      },
    },
  };
}

function buildPayButton(to, plan = PLANS[1]) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: `${plan.name} — ${plan.title}.\nTap Pay to renew Wheelz Tracker.`,
      },
      footer: { text: 'Renews your Wheelz Tracker access.' },
      action: {
        buttons: [{ type: 'reply', reply: { id: PAY_BUTTON_ID, title: `Pay ${plan.title.split(' ')[0]}` } }],
      },
    },
  };
}

function hasPending(toPhoneNumber) {
  return pending.has(toPhoneNumber);
}

async function sendMenu(toPhoneNumber) {
  console.log(`[Menu] plans → ${toPhoneNumber}`);
  return postMessage(buildMenu(toPhoneNumber), 'Menu');
}

async function sendMockCheckout(toPhoneNumber, plan = PLANS[1]) {
  const referenceId = `ORD${Date.now()}`;
  console.log(`[Payload Sent] mock order_details → ${toPhoneNumber} ref=${referenceId} plan=${plan.id}`);
  try {
    const sent = await postMessage(buildMockCheckout(toPhoneNumber, referenceId, plan), 'Payload Sent');
    pending.set(toPhoneNumber, { referenceId, plan });
    return sent;
  } catch (err) {
    const code = err.response?.data?.error?.code;
    console.log(`[Payload Sent] order_details rejected (${code || 'error'}). Sending the pay button.`);
    pending.set(toPhoneNumber, { plan });
    return postMessage(buildPayButton(toPhoneNumber, plan), 'Payload Sent');
  }
}

async function sendMockReceipt(toPhoneNumber) {
  const order = pending.get(toPhoneNumber);
  pending.delete(toPhoneNumber);
  const text = receiptText(order?.plan);
  if (order?.referenceId) {
    console.log(`[Payment Captured] mock ref=${order.referenceId} wa_id=${toPhoneNumber}`);
    return sendOrderStatus(toPhoneNumber, order.referenceId, text);
  }
  console.log(`[Payment Captured] mock button wa_id=${toPhoneNumber}`);
  console.log(`[Receipt Sent] mock receipt → ${toPhoneNumber}`);
  return postMessage(
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toPhoneNumber,
      type: 'text',
      text: { body: text },
    },
    'Receipt Sent'
  );
}

module.exports = {
  PAY_BUTTON_ID,
  PLANS,
  buildMenu,
  buildMockCheckout,
  buildPayButton,
  hasPending,
  matchPlan,
  sendMenu,
  sendMockCheckout,
  sendMockReceipt,
  upiLink,
};
