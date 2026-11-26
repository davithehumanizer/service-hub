import { Test, TestingModule } from '@nestjs/testing';
import { AllExceptionsFilter } from '../all-exceptions.filter';
import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockLogger: Partial<Logger>;

  beforeEach(async () => {
    mockLogger = {
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AllExceptionsFilter],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);
    // Mock the private logger instance
    (filter as any).logger = mockLogger;
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should catch HttpException and return correct response', () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
    const mockGetRequest = jest.fn().mockReturnValue({ url: '/test-url' });
    const mockSwitchToHttp = jest.fn().mockReturnValue({
      getResponse: mockGetResponse,
      getRequest: mockGetRequest,
    });

    const mockArgumentsHost = {
      switchToHttp: mockSwitchToHttp,
    } as unknown as ArgumentsHost;

    const exception = new HttpException('Test Error', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        path: '/test-url',
        message: 'Test Error',
      }),
    );
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('keeps the model a conflict names, for a link to it', () => {
    const json = jest.fn();
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: () => ({ json }) }),
        getRequest: () => ({ url: '/api/v2/device-models/3' }),
      }),
    } as unknown as ArgumentsHost;

    filter.catch(
      new HttpException(
        {
          statusCode: 409,
          message: 'Model 12 already has this name',
          modelId: 12,
        },
        HttpStatus.CONFLICT,
      ),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        message: 'Model 12 already has this name',
        modelId: 12,
      }),
    );
  });

  it('should catch unknown error and return 500', () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
    const mockGetRequest = jest.fn().mockReturnValue({ url: '/test-url' });
    const mockSwitchToHttp = jest.fn().mockReturnValue({
      getResponse: mockGetResponse,
      getRequest: mockGetRequest,
    });

    const mockArgumentsHost = {
      switchToHttp: mockSwitchToHttp,
    } as unknown as ArgumentsHost;

    const exception = new Error('Unknown Error');

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        path: '/test-url',
        message: 'Internal server error',
      }),
    );
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
