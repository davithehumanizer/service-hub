/* eslint-disable @typescript-eslint/no-require-imports */
Object.defineProperty(globalThis, 'crypto', {
  value: require('crypto'),
});
process.env.JWT_SECRET = 'test-secret';
