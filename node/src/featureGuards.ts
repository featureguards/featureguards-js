import { AuthParams, featureToggles, utils } from 'featureguards-lib';

import { credentials } from '@grpc/grpc-js';

import { FeatureTogglesClient } from './client';

export type Defaults = { [index: string]: boolean };
export type Options = {
  // apiKey is the API key to be used for the environment.
  apiKey: string;
  // defaults are default values for feature toggles. They're used in rare cases where connection
  // to FeatureGuards isn't established.
  defaults?: Defaults;
  // Mostly for testing.
  // addr provides an override for api.featureguards.com.
  addr?: string;
  // caCert provides an override
  caCert?: Buffer;
};

type FeatureGuardsOptions = {
  evaluator: featureToggles.FeatureTogglesEvaluator;
  defaults?: Defaults;
};

export interface IFeatureGuards {
  // isOn returns whether the feature is on or off based on the attributes passed in.
  isOn(name: string, options?: featureToggles.FeatureToggleOptions): Promise<boolean>;
  // authenticateForWeb is needed to use FeatureGuards in the browser.
  authenticateForWeb(): Promise<AuthParams>;
  // stop, stops the internal client.
  stop(): Promise<void>;
}

export class FeatureGuards {
  toggles: featureToggles.FeatureTogglesEvaluator;
  private defaults?: Defaults;
  constructor({ evaluator, defaults }: FeatureGuardsOptions) {
    this.toggles = evaluator;
    this.defaults = defaults;
  }

  async isOn(name: string, options?: featureToggles.FeatureToggleOptions): Promise<boolean> {
    try {
      return this.toggles.isOn(name, options);
    } catch (err) {
      // TODO: ratelimit
      console.log(err);
      return this.defaults?.[name] ?? false;
    }
  }

  async authenticateForWeb(): Promise<AuthParams> {
    return await this.toggles.client.authenticate();
  }

  async stop(): Promise<void> {
    await this.toggles?.stop();
  }
}

export const initialize = async ({
  apiKey,
  defaults,
  addr,
  caCert
}: Options): Promise<IFeatureGuards> => {
  const creds = credentials.createSsl(caCert);
  const client = new FeatureTogglesClient({ apiKey, creds, domain: addr });
  const evaluator = new featureToggles.FeatureTogglesEvaluator({ client });
  let started = false;
  try {
    await evaluator.start({});
    started = true;
  } catch (err) {
    // We failed. Maybe intermittent. Let's keep retrying.
    setTimeout(async () => {
      let retry = 0;
      while (!started) {
        try {
          await evaluator.start({});
          return;
        } catch (err) {
          retry++;
          const waitMs = Math.min(2 ** retry * 100, 10 * 1000);
          await utils.timeout(utils.jitter(waitMs));
        }
      }
    });
  }
  const guards = new FeatureGuards({ evaluator, defaults });
  return guards;
};
