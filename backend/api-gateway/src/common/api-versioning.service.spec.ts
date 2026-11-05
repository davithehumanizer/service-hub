import { Test, TestingModule } from '@nestjs/testing';
import { ApiVersioningService } from './api-versioning.service';

describe('ApiVersioningService', () => {
  let service: ApiVersioningService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiVersioningService],
    }).compile();

    service = module.get<ApiVersioningService>(ApiVersioningService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractVersion', () => {
    it('should extract version from URI path', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const mockRequest = {
        url: '/api/v2/devices',
        headers: {},
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const version = service.extractVersion(mockRequest);
      expect(version).toBe('v2');
    });

    it('should extract version from header', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const mockRequest = {
        url: '/api/devices',
        headers: { 'x-api-version': '2' },
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const version = service.extractVersion(mockRequest);
      expect(version).toBe('v2');
    });

    it('should add v prefix to header version if missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const mockRequest = {
        url: '/api/devices',
        headers: { 'x-api-version': '3' },
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const version = service.extractVersion(mockRequest);
      expect(version).toBe('v3');
    });

    it('should default to v1 when no version specified', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const mockRequest = {
        url: '/api/devices',
        headers: {},
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const version = service.extractVersion(mockRequest);
      expect(version).toBe('v1');
    });

    it('should prioritize URI version over header version', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const mockRequest = {
        url: '/api/v2/devices',
        headers: { 'x-api-version': '3' },
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const version = service.extractVersion(mockRequest);
      expect(version).toBe('v2');
    });
  });

  describe('createMessage', () => {
    it('should create versioned message', () => {
      const message = service.createMessage('test_cmd', { id: 123 }, 'v2');

      expect(message).toEqual({
        cmd: 'test_cmd',
        version: 'v2',
        id: 123,
      });
    });

    it('should handle empty payload', () => {
      const message = service.createMessage('test_cmd', {}, 'v1');

      expect(message).toEqual({
        cmd: 'test_cmd',
        version: 'v1',
      });
    });
  });
});
