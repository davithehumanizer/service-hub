/* eslint-disable @typescript-eslint/no-unsafe-argument */
export const mockAuthService = (returnValue?: any) => ({
  provide: 'AUTH_SERVICE',
  useValue: {
    canActivate: jest.fn(() => true),
    send: jest.fn(returnValue),
  },
});
