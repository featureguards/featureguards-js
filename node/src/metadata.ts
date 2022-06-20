import { VERSION } from './constants';

import type { RpcMetadata } from '@protobuf-ts/runtime-rpc';

export class NiceMD {
  md: RpcMetadata = {};
  constructor() {
    this.withVersion(VERSION);
  }

  withJwtToken(token: string): NiceMD {
    this.md['Authorization'] = 'Bearer ' + token;
    return this;
  }

  withApiKey(key: string): NiceMD {
    this.md['x-api-key'] = key;
    return this;
  }

  withVersion(v: string): NiceMD {
    this.md['x-version'] = v;
    return this;
  }
}
