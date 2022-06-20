import { featureToggles, utils } from 'featureguards-lib';

import { AuthCallback, FeatureTogglesClient } from './client';

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
  // defaults are default values for feature toggles.
  defaults?: Defaults;
  // authCallback is the callback to be called for the initial authentication. It's needed because
  // we don't want to leave API keys to javascript. So, the browser needs to authenticate with the
  // server. The server internally calls featureguards.com with its secret API key and return the
  // response. The javascript client will use the response to authenticate with featureguards.com.
  authCallback: AuthCallback;
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

export const initialize = async ({
  defaults,
  authCallback,
  addr
}: Options): Promise<IFeatureGuards> => {
  const client = new FeatureTogglesClient({ authCallback, domain: addr });
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
