import { RpcError } from '@protobuf-ts/runtime-rpc';

import { Attributes } from './attributes';
import { Client } from './client';
import { FeatureToggleError, isOn } from './evaluate';
import { StatusCode } from './rpc';
import { jitter, timeout } from './utils';

import type { ServerStreamingCall } from '@protobuf-ts/runtime-rpc';
import type { FeatureToggle } from './proto/shared/feature_toggle';
import type { ListenPayload, ListenRequest } from './proto/toggles/toggles';

export type Options = {
  client: Client;
  clientVersion?: bigint;
};
export type FeatureToggleOptions = {
  attrs?: Attributes;
};

export class FeatureTogglesEvaluator {
  client: Client;
  ftsByName: { [index: string]: FeatureToggle };
  accessToken?: string;
  refreshToken?: string;
  clientVersion: bigint;
  stream?: ServerStreamingCall<ListenRequest, ListenPayload>;
  stopped = false;
  timer?: ReturnType<typeof setTimeout>;
  listening = false;

  constructor({ client, clientVersion }: Options) {
    this.client = client;
    this.ftsByName = {};
    this.clientVersion = clientVersion || BigInt(0);
  }

  start = async ({ noLoop }: { noLoop?: boolean }) => {
    const auth = await this.client.authenticate();
    this.accessToken = auth.accessToken;
    this.refreshToken = auth.refreshToken;
    const fetched = await this.client.fetch({ version: BigInt(0), accessToken: this.accessToken });
    this.process(fetched.featureToggles, fetched.version);
    if (!noLoop) {
      if (this.timer) {
        clearTimeout(this.timer);
      }
      this.timer = setTimeout(this.listenLoop.bind(this));
    }
  };

  private listenLoop = async () => {
    let retry = 0;
    this.listening = true;
    while (!this.stopped) {
      try {
        await this.listen();
        retry = 0;
      } catch (err) {
        retry++;
        if (!(err as Error).message.includes('timeout')) {
          console.log(err);
        }
        if (err instanceof RpcError) {
          if (err.code === StatusCode.PERMISSION_DENIED) {
            await this.client.refreshAndAuth({ token: this.refreshToken });
          }
        }

        const waitMs = Math.min(2 ** retry * 100, 10 * 1000);
        await timeout(jitter(waitMs));
      }
    }
    this.listening = false;
  };

  isOn = async (name: string, options?: FeatureToggleOptions): Promise<boolean> => {
    const found = this.ftsByName[name];
    if (!found) {
      throw new FeatureToggleError(`feature toggle ${name} is not found`);
    }

    return isOn(found, options?.attrs);
  };

  listen = async (): Promise<void> => {
    if (!this.accessToken) {
      throw new FeatureToggleError(`no access token. Need to authenticate first.`);
    }
    this.stream = this.client.listen({
      accessToken: this.accessToken,
      version: this.clientVersion
    });
    for await (const payload of this.stream.responses) {
      this.process(payload.featureToggles, payload.version);
    }
  };

  stop = async () => {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
    }

    await this.client?.stop();
  };

  private process = (fts: FeatureToggle[], version: bigint) => {
    for (const ft of fts) {
      if (ft.deletedAt) {
        continue;
      }
      this.ftsByName[ft.name] = ft;
    }
    this.clientVersion = version;
  };
}
