import { Test, TestingModule } from '@nestjs/testing';
import { GoogleStrategy } from '../strategies/google.strategy';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;

  beforeEach(async () => {
    // Set up environment variables for testing
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
    process.env.GOOGLE_CALLBACK_URL =
      'http://localhost:3000/api/auth/google/callback';

    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleStrategy],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_CALLBACK_URL;
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should throw error when GOOGLE_CLIENT_ID is not provided', () => {
    delete process.env.GOOGLE_CLIENT_ID;

    expect(() => new GoogleStrategy()).toThrow(
      'Google clientID and clientSecret must be provided',
    );
  });

  it('should throw error when GOOGLE_CLIENT_SECRET is not provided', () => {
    delete process.env.GOOGLE_CLIENT_SECRET;

    expect(() => new GoogleStrategy()).toThrow(
      'Google clientID and clientSecret must be provided',
    );
  });

  it('should validate user profile correctly', async () => {
    const mockProfile = {
      name: {
        givenName: 'John',
        familyName: 'Doe',
      },
      emails: [{ value: 'john.doe@example.com' }],
      photos: [{ value: 'https://example.com/photo.jpg' }],
    };

    const mockDone = jest.fn();

    // Mock console.log to avoid output during tests
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

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
      picture: 'https://example.com/photo.jpg',
      accessToken: 'access-token',
    });

    expect(consoleSpy).toHaveBeenCalledTimes(3);
    consoleSpy.mockRestore();
  });

  it('should handle profile without photos', async () => {
    const mockProfile = {
      name: {
        givenName: 'John',
        familyName: 'Doe',
      },
      emails: [{ value: 'john.doe@example.com' }],
      photos: [],
    };

    const mockDone = jest.fn();

    // Mock console.log to avoid output during tests
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

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
      picture: null,
      accessToken: 'access-token',
    });

    consoleSpy.mockRestore();
  });
});
