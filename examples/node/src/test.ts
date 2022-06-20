import 'dotenv/config';

import featureGuards from 'featureguards-node';
import fs from 'fs/promises';

export const test = async () => {
  const file = await fs.readFile(process.env.CA_CERTS || '');
  const fg = await featureGuards({
    addr: process.env.FEATUREGUARDS_ADDR,
    apiKey: process.env.FEATUREGUARDS_API_KEY || '',
    caCert: file
  });

  // Check if `TEST_FEATURE` is on.
  if (await fg.isOn('TEST')) {
    // TEST_FEATURE is on
  } else {
    // TEST_FEATURE is off
  }

  // Example for delegating auth with FeatureGuards for the browser.
  // See docs for more inforatmion.
  const res = await fg.authenticateForWeb();
  console.log(res.accessToken);
  console.log(res.refreshToken);
};
