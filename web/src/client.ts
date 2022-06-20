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
import { RpcError, StatusCode } from 'grpc-web';

import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';

import { NiceMD } from './metadata';

export type AuthCallback = () => Promise<AuthParams>;
export type ClientOptions = {
  authCallback: AuthCallback;
  domain?: string;
};

export class FeatureTogglesClient implements Client {
  auth: pb_auth_client.AuthClient;
  toggles: pb_toggles_client.TogglesClient;
  authCallback: AuthCallback;

  constructor({ domain, authCallback }: ClientOptions) {
    if (!domain) {
      domain = 'https://api.featureguards.com';
    }
    const transport = new GrpcWebFetchTransport({ baseUrl: domain });
    this.auth = new pb_auth_client.AuthClient(transport);
    this.toggles = new pb_toggles_client.TogglesClient(transport);
    this.authCallback = authCallback;
  }
  refreshAndAuth = async (r: RefreshAndAuthParams) => {
    if (!r.token) {
      return await this.authenticate();
    }
    try {
      return await this.refresh(r);
    } catch (err) {
      if (err instanceof RpcError && err.code === StatusCode.PERMISSION_DENIED) {
        return await this.authenticate();
      }
      throw err;
    }
  };
  authenticate = async () => {
    return await this.authCallback();
  };
  refresh = async (p: RefreshParams) => {
    const deadline = new Date();
    const r = pb_auth.RefreshRequest.create({ refreshToken: p.token });
    return await this.auth.refresh(r, { timeout: 1000 }).response;
  };
  fetch = async (p: FetchParams) => {
    const deadline = new Date();
    const r = pb_toggles.FetchRequest.create({
      platform: pb_feature_toggle.Platform_Type.WEB,
      version: p.version
    });
    return await this.toggles.fetch(r, {
      meta: new NiceMD().withJwtToken(p.accessToken).md,
      timeout: 5000
    }).response;
  };
  listen = (p: ListenParams) => {
    const token = utils.parseToken(p.accessToken);
    if (!token.exp) {
      throw new FeatureToggleError(`no expiration set on JWT token.`);
    }
    // exp is in unix timestamp (seconds)
    const deadline = new Date(token.exp * 1000);
    const r = pb_toggles.ListenRequest.create({
      platform: pb_feature_toggle.Platform_Type.WEB,
      version: p.version
    });
    return this.toggles.listen(r, {
      meta: new NiceMD().withJwtToken(p.accessToken).md,
      timeout: deadline
    });
  };
  stop = async () => {
    // no-op
  };
}
