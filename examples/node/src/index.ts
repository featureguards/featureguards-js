import 'dotenv/config';

import featureGuards from 'featureguards-node';

const example = async () => {
  const fg = await featureGuards({
    apiKey: process.env.FEATUREGUARDS_API_KEY || ''
  });

  // Check if `TEST_FEATURE` is on.
  if (await fg.isOn('TEST')) {
    // TEST_FEATURE is on
  } else {
    // TEST_FEATURE is off
  }
};

example();
