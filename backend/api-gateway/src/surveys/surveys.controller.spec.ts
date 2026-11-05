import { Test, TestingModule } from '@nestjs/testing';
import { SurveysController } from './surveys.controller';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { FlexibleAuthGuard } from '../auth/flexible-auth.guard';
import { PermissionsGuard } from '../auth/permission.guard';
import { HttpException } from '@nestjs/common';

describe('SurveysController', () => {
  let controller: SurveysController;
  let clientProxy: ClientProxy;

  const mockSurvey = {
    id: 'survey-123',
    title: 'Test Survey',
    triggerKey: 'test-key',
  };

  const mockClientProxy = {
    send: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SurveysController],
      providers: [
        {
          provide: 'SURVEYS_SERVICE',
          useValue: mockClientProxy,
        },
      ],
    })
      .overrideGuard(FlexibleAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SurveysController>(SurveysController);
    clientProxy = module.get<ClientProxy>('SURVEYS_SERVICE');
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a survey', async () => {
      const createDto = {
        title: 'New Survey',
        triggerKey: 'new',
        questions: [],
      };
      mockClientProxy.send.mockReturnValue(of(mockSurvey));
      const result = await controller.create(createDto);
      expect(result).toEqual(mockSurvey);
      expect(clientProxy.send).toHaveBeenCalledWith(
        { cmd: 'create_survey' },
        createDto,
      );
    });

    it('should throw HttpException on error', async () => {
      const createDto = { title: 'New', triggerKey: 'new', questions: [] };
      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('Create failed')),
      );
      await expect(controller.create(createDto)).rejects.toThrow(HttpException);
    });
  });

  describe('findAll', () => {
    it('should return all surveys', async () => {
      mockClientProxy.send.mockReturnValue(of([mockSurvey]));
      const result = await controller.findAll();
      expect(result).toEqual([mockSurvey]);
      expect(clientProxy.send).toHaveBeenCalledWith(
        { cmd: 'find_all_surveys' },
        {},
      );
    });

    it('should throw HttpException on error', async () => {
      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('FindAll failed')),
      );
      await expect(controller.findAll()).rejects.toThrow(HttpException);
    });
  });

  describe('findOne', () => {
    it('should return a survey', async () => {
      mockClientProxy.send.mockReturnValue(of(mockSurvey));
      const result = await controller.findOne('survey-123');
      expect(result).toEqual(mockSurvey);
      expect(clientProxy.send).toHaveBeenCalledWith(
        { cmd: 'find_one_survey' },
        { id: 'survey-123' },
      );
    });

    it('should throw HttpException on error', async () => {
      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('FindOne failed')),
      );
      await expect(controller.findOne('survey-123')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('update', () => {
    it('should update a survey', async () => {
      const updateDto = { title: 'Updated' };
      mockClientProxy.send.mockReturnValue(of(mockSurvey));
      const result = await controller.update('survey-123', updateDto);
      expect(result).toEqual(mockSurvey);
      expect(clientProxy.send).toHaveBeenCalledWith(
        { cmd: 'update_survey' },
        { id: 'survey-123', ...updateDto },
      );
    });

    it('should throw HttpException on error', async () => {
      const updateDto = { title: 'Updated' };
      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('Update failed')),
      );
      await expect(controller.update('survey-123', updateDto)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('remove', () => {
    it('should remove a survey', async () => {
      mockClientProxy.send.mockReturnValue(of({ success: true }));
      const result = await controller.remove('survey-123');
      expect(result).toEqual({ success: true });
      expect(clientProxy.send).toHaveBeenCalledWith(
        { cmd: 'remove_survey' },
        { id: 'survey-123' },
      );
    });

    it('should throw HttpException on error', async () => {
      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('Remove failed')),
      );
      await expect(controller.remove('survey-123')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('getSurvey', () => {
    it('should return a survey by trigger key', async () => {
      mockClientProxy.send.mockReturnValue(of(mockSurvey));
      const result = await controller.getSurvey('test-key');
      expect(result).toEqual(mockSurvey);
      expect(clientProxy.send).toHaveBeenCalledWith(
        { cmd: 'get_survey' },
        { key: 'test-key' },
      );
    });

    it('should throw HttpException when survey not found', async () => {
      mockClientProxy.send.mockReturnValue(of(null));
      await expect(controller.getSurvey('unknown')).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw HttpException on error', async () => {
      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('GetSurvey failed')),
      );
      await expect(controller.getSurvey('test-key')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('submitResponse', () => {
    it('should submit a response with user from JWT', async () => {
      const mockDto = { answers: {} };
      mockClientProxy.send.mockReturnValue(of({ id: 'response-1' }));
      const req = { user: { userId: 'user-1' } };

      const result = await controller.submitResponse(
        'test-key',
        mockDto,
        'session-1',
        'trace-1',
        req,
      );

      expect(result).toEqual({ id: 'response-1' });
      expect(clientProxy.send).toHaveBeenCalledWith(
        { cmd: 'submit_response' },
        {
          key: 'test-key',
          answers: {},
          userId: 'user-1',
          sessionId: 'session-1',
          traceId: 'trace-1',
        },
      );
    });

    it('should submit a response with userId from body when no JWT user', async () => {
      const mockDto = { answers: {}, userId: 'body-user-1' };
      mockClientProxy.send.mockReturnValue(of({ id: 'response-1' }));
      const req = {};

      const result = await controller.submitResponse(
        'test-key',
        mockDto,
        'session-1',
        'trace-1',
        req,
      );

      expect(result).toEqual({ id: 'response-1' });
      expect(clientProxy.send).toHaveBeenCalledWith(
        { cmd: 'submit_response' },
        {
          key: 'test-key',
          answers: {},
          userId: 'body-user-1',
          sessionId: 'session-1',
          traceId: 'trace-1',
        },
      );
    });

    it('should submit a response with null userId when neither JWT nor body has it', async () => {
      const mockDto = { answers: {} };
      mockClientProxy.send.mockReturnValue(of({ id: 'response-1' }));
      const req = {};

      const result = await controller.submitResponse(
        'test-key',
        mockDto,
        'session-1',
        'trace-1',
        req,
      );

      expect(clientProxy.send).toHaveBeenCalledWith(
        { cmd: 'submit_response' },
        expect.objectContaining({ userId: null }),
      );
    });

    it('should use body directly as answers if no answers property', async () => {
      const mockDto = { question1: 'answer1' };
      mockClientProxy.send.mockReturnValue(of({ id: 'response-1' }));
      const req = {};

      await controller.submitResponse(
        'test-key',
        mockDto,
        'session-1',
        'trace-1',
        req,
      );

      expect(clientProxy.send).toHaveBeenCalledWith(
        { cmd: 'submit_response' },
        expect.objectContaining({ answers: { question1: 'answer1' } }),
      );
    });

    it('should throw HttpException on error', async () => {
      const mockDto = { answers: {} };
      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('Submit failed')),
      );
      const req = {};

      await expect(
        controller.submitResponse(
          'test-key',
          mockDto,
          'session-1',
          'trace-1',
          req,
        ),
      ).rejects.toThrow(HttpException);
    });
  });
});
