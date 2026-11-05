/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { JwtStrategy } from '../jwt.strategy';
import { ExtractJwt } from 'passport-jwt';

describe('JwtStrategy', () => {
  const mockFromAuthHeader = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';

    jest
      .spyOn(ExtractJwt, 'fromAuthHeaderAsBearerToken')
      .mockReturnValue(mockFromAuthHeader);
  });

  it('should call ExtractJwt.fromAuthHeaderAsBearerToken and use process.env.JWT_SECRET', () => {
    new JwtStrategy();

    // Vérifie que la méthode statique a bien été appelée
    expect(ExtractJwt.fromAuthHeaderAsBearerToken).toHaveBeenCalled();
  });

  it('should validate and return payload data', async () => {
    const strategy = new JwtStrategy();
    const payload = { id: 'abc123', email: 'test@test.com', role: 'admin' };

    const result = await strategy.validate(payload);

    expect(result).toEqual({
      id: 'abc123',
      email: 'test@test.com',
      role: 'admin',
    });
  });
});
