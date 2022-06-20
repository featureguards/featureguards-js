import {
  AuthParams,
  Client,
  FeatureToggleError,
  FetchParams,
  ListenParams,
  pb_auth,
  pb_auth_client,
  pb_feature_toggle,
  pb_toggles,
  pb_toggles_client,
  RefreshAndAuthParams,
  RefreshParams,
  utils
} from 'featureguards-lib';

import { ChannelCredentials, ServiceError, status } from '@grpc/grpc-js';
import { GrpcTransport } from '@protobuf-ts/grpc-transport';

import { VERSION } from './constants';
import { NiceMD } from './metadata';

export type ClientProps = {
  apiKey: string;
  creds: ChannelCredentials;
  domain?: string;
};

export class FeatureTogglesClient implements Client {
  apiKey: string;
  domain: string;

  private auth: pb_auth_client.AuthClient;
  private toggles: pb_toggles_client.TogglesClient;
  private transport: GrpcTransport;

  // methods.
  constructor({ apiKey, domain, creds }: ClientProps) {
    this.apiKey = apiKey;
    this.domain = domain || 'api.featureguards.com';
    this.transport = new GrpcTransport({
      host: this.domain,
      channelCredentials: creds
    });
    this.auth = new pb_auth_client.AuthClient(this.transport);
    this.toggles = new pb_toggles_client.TogglesClient(this.transport);
  }
  async refreshAndAuth(r: RefreshAndAuthParams): Promise<AuthParams> {
    if (!r.token) {
      return await this.authenticate();
    }
    try {
      return await this.refresh(r);
    } catch (err) {
      const error = err as ServiceError;
      if (error.code === status.PERMISSION_DENIED) {
        return await this.authenticate();
      }
      throw err;
    }
  }

  authenticate = async (): Promise<AuthParams> => {
    const r = pb_auth.AuthenticateRequest.create({ version: VERSION });
    const md = new NiceMD().withApiKey(this.apiKey).md;
    return await this.auth.authenticate(r, { meta: md }).response;
  };
  refresh = async (p: RefreshParams) => {
    const r = pb_auth.RefreshRequest.create({ refreshToken: p.token });
    return await this.auth.refresh(r, { timeout: 1000 }).response;
  };
  fetch = async (p: FetchParams) => {
    const md = new NiceMD().withJwtToken(p.accessToken).md;
    const r = pb_toggles.FetchRequest.create({
      platform: pb_feature_toggle.Platform_Type.DEFAULT,
      version: p.version
    });
    return await this.toggles.fetch(r, { meta: md }).response;
  };
  listen = (p: ListenParams) => {
    const token = utils.parseToken(p.accessToken);
    if (!token.exp) {
      throw new FeatureToggleError(`no expiration set on JWT token.`);
    }
    const deadline = new Date(token.exp * 1000);
    const md = new NiceMD().withJwtToken(p.accessToken).md;
    const r = pb_toggles.ListenRequest.create({
      platform: pb_feature_toggle.Platform_Type.DEFAULT,
      version: p.version
    });
    return this.toggles.listen(r, { meta: md, timeout: deadline });
  };
  stop = async () => {
    this.transport.close();
  };
}
