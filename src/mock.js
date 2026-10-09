const { postMessage } = require('./graph');
const { sendOrderStatus } = require('./orderStatus');

const PAY_BUTTON_ID = 'pay_499';
const PLAN = { value: 49900, offset: 100 };
const NO_TAX = { value: 0, offset: 100, description: 'Included' };
const pending = new Map();

function upiLink(referenceId) {
  return `upi://pay?pa=mockdemo@upi&pn=DemoMerchant&mc=4814&purpose=00&tr=${referenceId}`;
}

function buildMockCheckout(to, referenceId) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'order_details',
      body: {
        text: 'Airtel ₹499 Prepaid Plan — 2.5GB/day. Tap Review and Pay. This demo does not collect money.',
      },
      footer: { text: 'Reply paid to finish. No charge.' },
      action: {
        name: 'review_and_pay',
        parameters: {
          reference_id: referenceId,
          type: 'digital-goods',
          payment_settings: [{ type: 'upi_intent_link', upi_intent_link: { link: upiLink(referenceId) } }],
          currency: 'INR',
          total_amount: PLAN,
          order: {
            status: 'pending',
            items: [
              {
                name: 'Airtel ₹499 Prepaid Plan',
                amount: PLAN,
                quantity: 1,
                country_of_origin: 'IN',
                importer_name: 'Demo Merchant',
                importer_address: {
                  address_line1: '1 Demo Street',
                  city: 'Mumbai',
                  zone_code: 'MH',
                  postal_code: '400001',
                  country_code: 'IN',
                },
              },
            ],
            subtotal: PLAN,
            tax: NO_TAX,
          },
        },
      },
    },
  };
}

function buildPayButton(to) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: 'Airtel ₹499 Prepaid Plan — 2.5GB/day.\nThis test number cannot open the WhatsApp payment screen, so this button stands in for it.',
      },
      footer: { text: 'Demo only. No charge.' },
      action: {
        buttons: [{ type: 'reply', reply: { id: PAY_BUTTON_ID, title: 'Pay ₹499' } }],
      },
    },
  };
}

function hasPending(toPhoneNumber) {
  return pending.has(toPhoneNumber);
}

async function sendMockCheckout(toPhoneNumber) {
  const referenceId = `ORD${Date.now()}`;
  console.log(`[Payload Sent] mock order_details → ${toPhoneNumber} ref=${referenceId}`);
  try {
    const sent = await postMessage(buildMockCheckout(toPhoneNumber, referenceId), 'Payload Sent');
    pending.set(toPhoneNumber, referenceId);
    return sent;
  } catch (err) {
    const code = err.response?.data?.error?.code;
    console.log(`[Payload Sent] order_details rejected (${code || 'error'}). Sending the pay button.`);
    return postMessage(buildPayButton(toPhoneNumber), 'Payload Sent');
  }
}

async function sendMockReceipt(toPhoneNumber) {
  const referenceId = pending.get(toPhoneNumber);
  pending.delete(toPhoneNumber);
  if (referenceId) {
    console.log(`[Payment Captured] mock ref=${referenceId} wa_id=${toPhoneNumber}`);
    return sendOrderStatus(toPhoneNumber, referenceId);
  }
  console.log(`[Payment Captured] mock button wa_id=${toPhoneNumber}`);
  console.log(`[Receipt Sent] mock receipt → ${toPhoneNumber}`);
  return postMessage(
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toPhoneNumber,
      type: 'text',
      text: { body: 'Recharge Successful! Your 2.5GB/day plan is now active.' },
    },
    'Receipt Sent'
  );
}

module.exports = {
  PAY_BUTTON_ID,
  buildMockCheckout,
  buildPayButton,
  hasPending,
  sendMockCheckout,
  sendMockReceipt,
  upiLink,
};
