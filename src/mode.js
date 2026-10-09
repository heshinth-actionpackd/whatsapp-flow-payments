function blank(value) {
  return !value || value === 'replace-me';
}

// ponytail: placeholder creds mean mock. Set MOCK_PAYMENTS=false once a gateway config is Active.
function isMock() {
  if (process.env.MOCK_PAYMENTS === 'true') return true;
  if (process.env.MOCK_PAYMENTS === 'false') return false;
  return blank(process.env.ACCESS_TOKEN) || blank(process.env.PAYMENT_CONFIG);
}

function configurationName() {
  return blank(process.env.PAYMENT_CONFIG) ? 'wheelz-config' : process.env.PAYMENT_CONFIG;
}

module.exports = { blank, isMock, configurationName };
