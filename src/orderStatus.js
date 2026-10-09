const { postMessage } = require('./graph');

function buildOrderStatus(to, referenceId, bodyText) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'order_status',
      body: { text: bodyText || 'Renewal successful! Your Wheelz Tracker plan is now active.' },
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

async function sendOrderStatus(toPhoneNumber, referenceId, bodyText) {
  console.log(`[Receipt Sent] order_status → ${toPhoneNumber} ref=${referenceId}`);
  return postMessage(buildOrderStatus(toPhoneNumber, referenceId, bodyText), 'Receipt Sent');
}

module.exports = { buildOrderStatus, sendOrderStatus };
