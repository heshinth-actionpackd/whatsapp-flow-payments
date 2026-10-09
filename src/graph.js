const axios = require('axios');

async function postMessage(payload, label) {
  const url = `https://graph.facebook.com/v20.0/${process.env.PHONE_NUMBER_ID}/messages`;
  try {
    const { data } = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    console.log(`[${label}]`, JSON.stringify(data));
    return data;
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error(`[${label} ERROR]`, typeof detail === 'string' ? detail : JSON.stringify(detail));
    throw err;
  }
}

module.exports = { postMessage };
