const { postMessage } = require('./graph');
const { configurationName } = require('./mode');

const PLAN = { value: 49900, offset: 100 };
const NO_TAX = { value: 0, offset: 100, description: 'Included' };

function buildOrderDetails(to, referenceId) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'order_details',
      body: { text: 'Wheelz Tracker Standard renewal — ₹499 for 28 days. Tap Review and Pay.' },
      action: {
        name: 'review_and_pay',
        parameters: {
          reference_id: referenceId,
          type: 'digital-goods',
          payment_settings: [
            {
              type: 'payment_gateway',
              payment_gateway: {
                type: process.env.PAYMENT_GATEWAY || 'razorpay',
                configuration_name: configurationName(),
              },
            },
          ],
          currency: 'INR',
          total_amount: PLAN,
          order: {
            status: 'pending',
            items: [
              {
                name: 'Wheelz Tracker Standard',
                amount: PLAN,
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
            subtotal: PLAN,
            tax: NO_TAX,
          },
        },
      },
    },
  };
}

async function sendOrderDetails(toPhoneNumber) {
  const referenceId = `ORD_${Date.now()}`;
  console.log(`[Payload Sent] order_details → ${toPhoneNumber} ref=${referenceId}`);
  return postMessage(buildOrderDetails(toPhoneNumber, referenceId), 'Payload Sent');
}

module.exports = { buildOrderDetails, sendOrderDetails };
