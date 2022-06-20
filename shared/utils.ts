import jwt_decode, { JwtDecodeOptions, JwtPayload } from 'jwt-decode';

export const timeout = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const parseToken = (token: string, options?: JwtDecodeOptions) => {
  return jwt_decode<JwtPayload>(token, options);
};

export const jitter = (n: number, fraction: number = 0.9): number => {
  if (fraction > 1 || fraction <= 0) {
    throw new Error(`unexpeted fraction`);
  }
  const fixed = n * (1 - fraction);
  const rand = 2 * (n - fixed);
  return fixed + Math.random() * rand;
};
