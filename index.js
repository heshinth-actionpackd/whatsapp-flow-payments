require('dotenv').config();

const { blank, isMock } = require('./src/mode');
const { createApp } = require('./src/webhook');

const PORT = process.env.PORT || 3000;
const required = ['VERIFY_TOKEN', 'ACCESS_TOKEN', 'PHONE_NUMBER_ID'];
if (!isMock()) required.push('PAYMENT_CONFIG');

const missing = required.filter((key) => blank(process.env[key]));
if (missing.length) {
  console.error(`Missing env: ${missing.join(', ')}`);
  process.exit(1);
}

createApp().listen(PORT, () => {
  const label = isMock() ? 'mock checkout' : 'live payments';
  console.log(`[Server] listening on :${PORT} (${label})`);
});
