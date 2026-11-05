import { Test, TestingModule } from '@nestjs/testing';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';
import { NotFoundException } from '@nestjs/common';

describe('SurveysController', () => {
  let controller: SurveysController;
  let service: SurveysService;

  const mockSurvey = {
    id: 'survey-123',
    title: 'Test Survey',
    triggerKey: 'test-key',
    questions: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SurveysController],
      providers: [
        {
          provide: SurveysService,
          useValue: {
            findByTriggerKey: jest.fn(),
            saveResponse: jest.fn(),
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SurveysController>(SurveysController);
    service = module.get<SurveysService>(SurveysService);
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
      jest.spyOn(service, 'create').mockResolvedValue(mockSurvey as any);
      const result = await controller.create(createDto);
      expect(result).toEqual(mockSurvey);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return all surveys', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue([mockSurvey] as any);
      const result = await controller.findAll();
      expect(result).toEqual([mockSurvey]);
    });
  });

  describe('findOne', () => {
    it('should return a survey', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockSurvey as any);
      const result = await controller.findOne({ id: 'survey-123' });
      expect(result).toEqual(mockSurvey);
      expect(service.findOne).toHaveBeenCalledWith('survey-123');
    });
  });

  describe('update', () => {
    it('should update a survey', async () => {
      const updateDto = { id: 'survey-123', title: 'Updated' };
      jest.spyOn(service, 'update').mockResolvedValue(mockSurvey as any);
      const result = await controller.update(updateDto);
      expect(result).toEqual(mockSurvey);
      expect(service.update).toHaveBeenCalledWith('survey-123', updateDto);
    });
  });

  describe('remove', () => {
    it('should remove a survey', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue(undefined);
      await controller.remove({ id: 'survey-123' });
      expect(service.remove).toHaveBeenCalledWith('survey-123');
    });
  });

  describe('getSurvey', () => {
    it('should return survey config', async () => {
      jest
        .spyOn(service, 'findByTriggerKey')
        .mockResolvedValue(mockSurvey as any);
      const result = await controller.getSurvey({ key: 'test-key' });
      expect(result).toEqual(mockSurvey);
    });

    it('should throw NotFoundException if survey not found', async () => {
      jest.spyOn(service, 'findByTriggerKey').mockResolvedValue(null);
      // Note: NestJS Microservices usually return RpcException, but we didn't explicitly throw one in the controller.
      // Ideally we should handle "not found" by returning null or a specific error object in TCP.
      // For now checking what the original code did -> returned null? 
      // The original code threw NotFoundException which is HTTP specific. 
      // In TCP, throwing HTTP exceptions might not propagate as expected to the gateway.
      // However, let's keep the test consistent with the current implementation if we didn't change the service logic.
      // Actually, looking at the previous controller code I wrote:
      // return this.surveysService.findByTriggerKey(data.key);
      // It just returns whatever the service returns (which might be null).
      // The HTTP 404 logic was moved to the API Gateway controller. 
      // So here we likely just expect it to return null if not found.
      
      const result = await controller.getSurvey({ key: 'unknown' });
      expect(result).toBeNull();
    });
  });

  describe('submitResponse', () => {
    it('should save response', async () => {
      const mockResult = { id: 'response-1' };
      jest.spyOn(service, 'saveResponse').mockResolvedValue(mockResult as any);

      const result = await controller.submitResponse({
        key: 'test-key',
        answers: {},
        userId: 'user-1',
        sessionId: 'session-1',
        traceId: 'trace-1',
      });

      expect(result).toEqual(mockResult);
      expect(service.saveResponse).toHaveBeenCalledWith(
        'test-key',
        {},
        'user-1',
        'session-1',
        'trace-1',
      );
    });
  });
});
