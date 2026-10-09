const assert = require('assert');
const { buildOrderDetails } = require('./src/orderDetails');
const { buildOrderStatus } = require('./src/orderStatus');
const { buildMenu, buildMockCheckout, buildPayButton, matchPlan, upiLink } = require('./src/mock');
const { extractEvent } = require('./src/webhook');

process.env.PAYMENT_CONFIG = 'test-config';
process.env.PAYMENT_GATEWAY = 'razorpay';
process.env.MOCK_PAYMENTS = 'false';

const details = buildOrderDetails('919800000000', 'ORD_1');
const params = details.interactive.action.parameters;
const gateway = params.payment_settings[0].payment_gateway;
assert.strictEqual(details.interactive.type, 'order_details');
assert.strictEqual(details.interactive.action.name, 'review_and_pay');
assert.strictEqual(gateway.type, 'razorpay');
assert.strictEqual(gateway.configuration_name, 'test-config');
assert.strictEqual(params.currency, 'INR');
assert.strictEqual(params.total_amount.value, 49900);
assert.strictEqual(
  params.total_amount.value,
  params.order.subtotal.value + params.order.tax.value
);
assert.strictEqual(params.order.status, 'pending');
assert.strictEqual(params.order.items[0].name, 'Wheelz Tracker Standard');
assert.strictEqual(params.payment_type, undefined);

const mock = buildMockCheckout('919800000000', 'ORD1');
const mockParams = mock.interactive.action.parameters;
assert.strictEqual(mock.interactive.type, 'order_details');
assert.strictEqual(mock.interactive.action.name, 'review_and_pay');
assert.strictEqual(mockParams.payment_settings[0].type, 'upi_intent_link');
assert.strictEqual(mockParams.reference_id, 'ORD1');
assert.strictEqual(mockParams.payment_settings[0].upi_intent_link.link, upiLink('ORD1'));
assert.ok(upiLink('ORD1').includes('pa=mockdemo@upi'));
assert.ok(!upiLink('ORD1').includes('am='));
assert.strictEqual(matchPlan('2').id, 'plan_499');
assert.strictEqual(matchPlan('999').value, 99900);
assert.strictEqual(matchPlan('hi'), null);

const menu = buildMenu('919800000000');
assert.strictEqual(menu.interactive.type, 'list');
assert.strictEqual(menu.interactive.action.sections[0].rows.length, 3);
assert.ok(menu.interactive.action.button.length <= 20);

const pay = buildPayButton('919800000000', matchPlan('1'));
assert.strictEqual(pay.interactive.action.buttons[0].reply.id, 'pay');
assert.ok(pay.interactive.action.buttons[0].reply.title.length <= 20);
assert.strictEqual(buildMockCheckout('919800000000', 'ORD1', matchPlan('199')).interactive.action.parameters.total_amount.value, 19900);

const status = buildOrderStatus('919800000000', 'ORD_1');
assert.strictEqual(status.interactive.type, 'order_status');
assert.strictEqual(status.interactive.action.name, 'review_order');
assert.strictEqual(status.interactive.action.parameters.order.status, 'completed');
assert.strictEqual(
  status.interactive.body.text,
  'Renewal successful! Your Wheelz Tracker plan is now active.'
);

const text = extractEvent({
  entry: [{ changes: [{ value: { messages: [{ from: '9198', type: 'text', text: { body: 'Hi' } }] } }] }],
});
assert.deepStrictEqual(text, { kind: 'text', from: '9198', text: 'Hi' });

const tapped = extractEvent({
  entry: [{
    changes: [{
      value: {
        messages: [{
          from: '9198',
          type: 'interactive',
          interactive: { type: 'button_reply', button_reply: { id: 'pay_499', title: 'Pay ₹499' } },
        }],
      },
    }],
  }],
});
assert.strictEqual(tapped.kind, 'button');
assert.strictEqual(tapped.id, 'pay_499');

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
