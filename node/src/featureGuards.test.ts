import 'dotenv/config';

import { timeout } from 'featureguards-lib/dist/utils';
import fs from 'fs/promises';

import { FeatureGuards } from './featureGuards';
import featureguards from './index';

describe('featureguards tests', () => {
  describe('init', () => {
    it.only('initializes correctly', async () => {
      const file = await fs.readFile(process.env.CA_CERTS || '');
      const ft = (await featureguards({
        apiKey: process.env.FEATUREGUARDS_API_KEY || '',
        addr: process.env.FEATUREGUARDS_ADDR || '',
        caCert: file
      })) as FeatureGuards;
      const toggles = ft.toggles;
      expect(toggles.clientVersion).toBeGreaterThan(0);
      // Sleep a bit and confirm we're listening.
      await timeout(100);
      expect(toggles.listening).toBe(true);
      await ft.stop();
    });

    it('supports isOn', async () => {
      const file = await fs.readFile(process.env.CA_CERTS || '');
      const ft = await featureguards({
        apiKey: process.env.FEATUREGUARDS_API_KEY || '',
        addr: process.env.FEATUREGUARDS_ADDR || '',
        caCert: file
      });
      expect(await ft.isOn('TEST')).toBe(true);
      await ft.stop();
    });
  });
});

// For local development, we must use the root's CA.
