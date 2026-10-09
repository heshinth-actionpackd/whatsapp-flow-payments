require('dotenv').config();

const { createApp } = require('./src/webhook');

const PORT = process.env.PORT || 3000;
const missing = ['VERIFY_TOKEN', 'ACCESS_TOKEN', 'PHONE_NUMBER_ID', 'PAYMENT_CONFIG'].filter(
  (key) => !process.env[key]
);

if (missing.length) {
  console.error(`Missing env: ${missing.join(', ')}`);
  process.exit(1);
}

createApp().listen(PORT, () => {
  console.log(`[Server] listening on :${PORT}`);
});
