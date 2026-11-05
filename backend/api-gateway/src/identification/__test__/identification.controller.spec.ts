/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { IdentificationController } from '../identification.controller';
import { IdentificationService } from '../identification.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { StorageService } from 'src/storage/storage.service';

describe('IdentificationController', () => {
  let controller: IdentificationController;
  let httpService: HttpService;

  const mockAxiosResponse: AxiosResponse = {
    data: {
      Product: 'Laptop',
      Brand: 'Dell',
      Model: 'XPS 15',
      ReleaseDate: '2021',
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdentificationController],
      providers: [
        IdentificationService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://mock-service:8000'),
          },
        },
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(),
            deleteFile: jest.fn(),
            getPublicUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<IdentificationController>(IdentificationController);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('analyze', () => {
    const mockFile = {
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake image data'),
      size: 1024,
    } as any;

    it('should identify product successfully', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(of(mockAxiosResponse));

      const result = await controller.analyze(mockFile);

      expect(httpService.post).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAxiosResponse.data);
      expect(result.timestamp).toBeDefined();
    });

    it('should return notFound: true when identification service returns 422', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(
        throwError(() => ({
          message: 'Unprocessable Entity',
          response: {
            status: 422,
            data: {
              detail:
                'No physical device or equipment recognized in this image.',
            },
          },
        })),
      );

      const result = await controller.analyze(mockFile);

      expect(result.success).toBe(false);
      expect(result.notFound).toBe(true);
      expect(result.error).toBe(
        'No physical device or equipment recognized in this image.',
      );
      expect(result.data).toBeNull();
      expect(result.timestamp).toBeDefined();
    });

    it('should handle generic error from identification service', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(
        throwError(() => ({
          message: 'Service Error',
          response: {
            status: 500,
            data: { detail: 'Identification failed' },
          },
        })),
      );

      const result = await controller.analyze(mockFile);

      expect(result.success).toBe(false);
      expect(result.notFound).toBe(false);
      expect(result.error).toBe('Identification failed');
      expect(result.data).toBeNull();
    });

    it('should handle error without response body', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(
        throwError(() => ({
          message: 'Network Error',
          response: null,
        })),
      );

      const result = await controller.analyze(mockFile);

      expect(result.success).toBe(false);
      expect(result.notFound).toBe(false);
      expect(result.error).toBe('Network Error');
    });

    it('should throw HttpException if no file provided', async () => {
      await expect(controller.analyze(null)).rejects.toThrow(
        'No file uploaded',
      );
    });
  });
});
