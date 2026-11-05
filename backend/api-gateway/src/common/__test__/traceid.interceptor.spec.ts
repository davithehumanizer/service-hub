import { Test, TestingModule } from '@nestjs/testing';
import { TraceIdInterceptor } from '../traceid.interceptor';
import { ClsService } from 'nestjs-cls';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('TraceIdInterceptor', () => {
  let interceptor: TraceIdInterceptor;
  let clsService: ClsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TraceIdInterceptor,
        {
          provide: ClsService,
          useValue: {
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<TraceIdInterceptor>(TraceIdInterceptor);
    clsService = module.get<ClsService>(ClsService);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should set traceId from header if present', (done) => {
    const mockGetRequest = jest.fn().mockReturnValue({
      headers: {
        'x-trace-id': 'existing-trace-id',
      },
    });
    const mockSwitchToHttp = jest.fn().mockReturnValue({
      getRequest: mockGetRequest,
    });
    const mockContext = {
      switchToHttp: mockSwitchToHttp,
    } as unknown as ExecutionContext;

    const mockCallHandler = {
      handle: jest.fn().mockReturnValue(of('test')),
    } as unknown as CallHandler;

    interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
      expect(clsService.set).toHaveBeenCalledWith(
        'traceId',
        'existing-trace-id',
      );
      done();
    });
  });

  it('should generate new traceId if header is missing', (done) => {
    const mockGetRequest = jest.fn().mockReturnValue({
      headers: {},
    });
    const mockSwitchToHttp = jest.fn().mockReturnValue({
      getRequest: mockGetRequest,
    });
    const mockContext = {
      switchToHttp: mockSwitchToHttp,
    } as unknown as ExecutionContext;

    const mockCallHandler = {
      handle: jest.fn().mockReturnValue(of('test')),
    } as unknown as CallHandler;

    interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
      expect(clsService.set).toHaveBeenCalledWith(
        'traceId',
        expect.any(String),
      );
      done();
    });
  });
});
