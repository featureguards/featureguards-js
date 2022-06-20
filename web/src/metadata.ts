import { Metadata } from 'grpc-web';

import { VERSION } from './constants';

export class NiceMD {
  md: Metadata = {};

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
