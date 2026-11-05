import { Test, TestingModule } from '@nestjs/testing';
import { FacebookStrategy } from '../strategies/facebook.strategy';

describe('FacebookStrategy', () => {
  let strategy: FacebookStrategy;

  beforeEach(async () => {
    // Set up environment variables for testing
    process.env.FACEBOOK_APP_ID = 'test-facebook-app-id';
    process.env.FACEBOOK_APP_SECRET = 'test-facebook-app-secret';
    process.env.FACEBOOK_CALLBACK_URL =
      'http://localhost:3000/api/auth/facebook/callback';

    const module: TestingModule = await Test.createTestingModule({
      providers: [FacebookStrategy],
    }).compile();

    strategy = module.get<FacebookStrategy>(FacebookStrategy);
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.FACEBOOK_APP_ID;
    delete process.env.FACEBOOK_APP_SECRET;
    delete process.env.FACEBOOK_CALLBACK_URL;
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should throw error when FACEBOOK_APP_ID is not provided', () => {
    delete process.env.FACEBOOK_APP_ID;

    expect(() => new FacebookStrategy()).toThrow(
      'Facebook clientID and clientSecret must be provided',
    );
  });

  it('should throw error when FACEBOOK_APP_SECRET is not provided', () => {
    delete process.env.FACEBOOK_APP_SECRET;

    expect(() => new FacebookStrategy()).toThrow(
      'Facebook clientID and clientSecret must be provided',
    );
  });

  it('should validate user profile correctly', async () => {
    const mockProfile = {
      name: {
        givenName: 'John',
        familyName: 'Doe',
      },
      emails: [{ value: 'john.doe@example.com' }],
    };

    const mockDone = jest.fn();

    await strategy.validate(
      'access-token',
      'refresh-token',
      mockProfile,
      mockDone,
    );

    expect(mockDone).toHaveBeenCalledWith(null, {
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      accessToken: 'access-token',
    });
  });

  it('should handle profile without emails', async () => {
    const mockProfile = {
      name: {
        givenName: 'John',
        familyName: 'Doe',
      },
      emails: [],
    };

    const mockDone = jest.fn();

    await strategy.validate(
      'access-token',
      'refresh-token',
      mockProfile,
      mockDone,
    );

    expect(mockDone).toHaveBeenCalledWith(null, {
      email: null,
      firstName: 'John',
      lastName: 'Doe',
      accessToken: 'access-token',
    });
  });
});
