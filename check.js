const assert = require('assert');
const { buildOrderDetails } = require('./src/orderDetails');
const { buildOrderStatus } = require('./src/orderStatus');
const { extractEvent } = require('./src/webhook');

process.env.PAYMENT_CONFIG = 'test-config';
process.env.PAYMENT_GATEWAY = 'razorpay';

const details = buildOrderDetails('919800000000', 'ORD_1');
const params = details.interactive.action.parameters;
assert.strictEqual(details.interactive.type, 'order_details');
assert.strictEqual(details.interactive.action.name, 'review_and_pay');
assert.strictEqual(params.payment_type, 'in');
assert.strictEqual(params.payment_configuration, 'test-config');
assert.strictEqual(params.currency, 'INR');
assert.strictEqual(params.total_amount.value, 49900);
assert.strictEqual(
  params.total_amount.value,
  params.order.subtotal.value + params.order.tax.value
);
assert.strictEqual(params.order.status, 'pending');
assert.strictEqual(params.order.items[0].name, 'Airtel ₹499 Prepaid Plan');

const status = buildOrderStatus('919800000000', 'ORD_1');
assert.strictEqual(status.interactive.type, 'order_status');
assert.strictEqual(status.interactive.action.name, 'review_order');
assert.strictEqual(status.interactive.action.parameters.order.status, 'completed');
assert.strictEqual(
  status.interactive.body.text,
  'Recharge Successful! Your 2.5GB/day plan is now active.'
);

const text = extractEvent({
  entry: [{ changes: [{ value: { messages: [{ from: '9198', type: 'text', text: { body: 'Hi' } }] } }] }],
});
assert.deepStrictEqual(text, { kind: 'text', from: '9198', text: 'Hi' });

const captured = extractEvent({
  entry: [{
    changes: [{
      value: {
        contacts: [{ wa_id: '9198' }],
        messages: [{ from: '9198', payment: { status: 'captured', reference_id: 'ORD_1' } }],
      },
    }],
  }],
});
assert.strictEqual(captured.payment.status, 'captured');
assert.strictEqual(captured.waId, '9198');

const statusWebhook = extractEvent({
  entry: [{
    changes: [{
      value: {
        statuses: [{
          type: 'payment',
          status: 'captured',
          recipient_id: '9198',
          payment: { reference_id: 'ORD_9' },
        }],
      },
    }],
  }],
});
assert.strictEqual(statusWebhook.payment.status, 'captured');
assert.strictEqual(statusWebhook.payment.reference_id, 'ORD_9');
assert.strictEqual(statusWebhook.waId, '9198');

assert.strictEqual(
  extractEvent({
    entry: [{ changes: [{ value: { statuses: [{ status: 'delivered', recipient_id: '9198' }] } }] }],
  }),
  null
);

console.log('check ok');
