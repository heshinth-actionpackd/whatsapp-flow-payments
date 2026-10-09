const { postMessage } = require('./graph');

function buildOrderStatus(to, referenceId) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'order_status',
      body: { text: 'Recharge Successful! Your 2.5GB/day plan is now active.' },
      action: {
        name: 'review_order',
        parameters: {
          reference_id: referenceId,
          order: { status: 'completed' },
        },
      },
    },
  };
}

async function sendOrderStatus(toPhoneNumber, referenceId) {
  console.log(`[Receipt Sent] order_status → ${toPhoneNumber} ref=${referenceId}`);
  return postMessage(buildOrderStatus(toPhoneNumber, referenceId), 'Receipt Sent');
}

module.exports = { buildOrderStatus, sendOrderStatus };
