import type { RefreshRequest, RefreshResponse, AuthenticateResponse } from './proto/auth/auth';

import type { FetchResponse, ListenRequest, ListenPayload } from './proto/toggles/toggles';

import type { ServerStreamingCall } from '@protobuf-ts/runtime-rpc';

export type RefreshParams = {
  token: string;
};

export type RefreshAndAuthParams = {
  token?: string;
};

export type AuthParams = {
  accessToken: string;
  refreshToken: string;
};

export type FetchParams = {
  version: bigint;
  accessToken: string;
};

export type ListenParams = {
  version: bigint;
  accessToken: string;
};

export interface Client {
  // methods.
  authenticate(): Promise<AuthenticateResponse>;
  refreshAndAuth(r: RefreshAndAuthParams): Promise<RefreshResponse>;
  refresh(r: RefreshParams): Promise<RefreshRequest>;
  fetch(r: FetchParams): Promise<FetchResponse>;
  listen(r: ListenParams): ServerStreamingCall<ListenRequest, ListenPayload>;
  stop(): Promise<void>;
}
