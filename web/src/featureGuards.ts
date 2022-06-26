import { featureToggles, utils } from 'featureguards-lib';

import { FeatureTogglesClient } from './client';

// Default sets the default values for each feature toggle.
export type Defaults = { [index: string]: boolean };

export interface IFeatureGuards {
  // isOn returns whether the feature is on or off based on the attributes passed in.
  isOn(name: string, options?: featureToggles.FeatureToggleOptions): Promise<boolean>;
  // stop, stops the internal client.
  stop(): Promise<void>;
}

// Options provides various options.
export type Options = {
  // apiKey is the API key used for authentication. Please, use API keys generated for the browser.
  // Otherwise, you may expose server-side feature toggles to the browser.
  apiKey: string;
  // defaults are default values for feature toggles.
  defaults?: Defaults;
  // addr is the address of the FeatureGuards server. Most for testing purposes.
  addr?: string;
};

type FeatureGuardsOptions = {
  evaluator: featureToggles.FeatureTogglesEvaluator;
  defaults?: Defaults;
};
export class FeatureGuards {
  toggles: featureToggles.FeatureTogglesEvaluator;
  defaults?: Defaults;
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

  async stop(): Promise<void> {
    await this.toggles?.stop();
  }
}

export const initialize = async ({ defaults, apiKey, addr }: Options): Promise<IFeatureGuards> => {
  const client = new FeatureTogglesClient({ apiKey, domain: addr });
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
