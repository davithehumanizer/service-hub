import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { RecaptchaService } from '../recaptcha.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RecaptchaService', () => {
  let service: RecaptchaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecaptchaService],
    }).compile();

    service = module.get<RecaptchaService>(RecaptchaService);
  });

  describe('verify', () => {
    it('should return null when RECAPTCHA_SECRET is not set', async () => {
      // Service is constructed without secret (empty string in test env)
      const result = await service.verify('some-token');
      expect(result).toBeNull();
    });

    it('should return { success: false } for empty token when secret is set', async () => {
      (service as any).secret = 'test-secret';

      const result = await service.verify('');
      expect(result).toEqual({ success: false });
    });

    it('should call Google API and return the response on success', async () => {
      (service as any).secret = 'test-secret';
      mockedAxios.post.mockResolvedValue({
        data: { success: true, score: 0.9 },
      });

      const result = await service.verify('valid-token', '127.0.0.1');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://www.google.com/recaptcha/api/siteverify',
        expect.any(String),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      expect(result).toEqual({ success: true, score: 0.9 });
    });

    it('should return null when the API call throws', async () => {
      (service as any).secret = 'test-secret';
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await service.verify('valid-token');
      expect(result).toBeNull();
    });
  });
});
