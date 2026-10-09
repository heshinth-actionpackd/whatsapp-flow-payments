require('dotenv').config();

const axios = require('axios');

const phoneId = process.env.PHONE_NUMBER_ID;
const token = process.env.ACCESS_TOKEN;
const verifyToken = process.env.VERIFY_TOKEN;
const publicBase = process.argv[2];

if (!phoneId || !token || !verifyToken || !publicBase) {
  console.error('Usage: node scripts/set-phone-webhook.js https://<ngrok-host>');
  process.exit(1);
}

const callbackUrl = `${publicBase.replace(/\/$/, '')}/webhook`;
if (callbackUrl.length > 200) {
  console.error(`Callback URL is ${callbackUrl.length} characters. Meta's limit is 200.`);
  process.exit(1);
}

const graph = `https://graph.facebook.com/v25.0/${phoneId}`;
const headers = { Authorization: `Bearer ${token}` };

function metaError(err) {
  return err.response?.data || err.message;
}

async function main() {
  const before = await axios.get(graph, {
    headers,
    params: { fields: 'display_phone_number,verified_name,webhook_configuration' },
  });
  const prior = before.data.webhook_configuration || {};
  console.log('[phone]', before.data.display_phone_number, before.data.verified_name || '');
  console.log('[before]', JSON.stringify(prior));

  if (prior.whatsapp_business_account) {
    console.error('This number\'s WABA already has an alternate callback. Refusing to change anything.');
    process.exit(1);
  }

  const set = await axios.post(
    graph,
    { webhook_configuration: { override_callback_uri: callbackUrl, verify_token: verifyToken } },
    { headers }
  );
  console.log('[set]', JSON.stringify(set.data));

  const after = await axios.get(graph, {
    headers,
    params: { fields: 'webhook_configuration' },
  });
  console.log('[after]', JSON.stringify(after.data.webhook_configuration));
  console.log('[callback]', callbackUrl);
}

main().catch((err) => {
  console.error('[meta]', JSON.stringify(metaError(err)));
  process.exit(1);
});
