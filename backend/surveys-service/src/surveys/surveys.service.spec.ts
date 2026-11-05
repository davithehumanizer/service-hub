import { Test, TestingModule } from '@nestjs/testing';
import { SurveysService } from './surveys.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Survey } from './entities/survey.entity';
import { SurveyResponse } from './entities/survey-response.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

const mockSurvey = {
  id: 'survey-123',
  title: 'Test Survey',
  triggerKey: 'test-key',
  questions: [],
};

const mockResponse = {
  id: 'response-123',
  surveyId: 'survey-123',
  answers: {},
};

describe('SurveysService', () => {
  let service: SurveysService;
  let surveyRepo: Repository<Survey>;
  let responseRepo: Repository<SurveyResponse>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SurveysService,
        {
          provide: getRepositoryToken(Survey),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            merge: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SurveyResponse),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SurveysService>(SurveysService);
    surveyRepo = module.get<Repository<Survey>>(getRepositoryToken(Survey));
    responseRepo = module.get<Repository<SurveyResponse>>(getRepositoryToken(SurveyResponse));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a survey', async () => {
      const createDto = {
        title: 'New Survey',
        triggerKey: 'new-key',
        questions: [],
      };
      const createdSurvey = { id: 'new-id', ...createDto };

      jest.spyOn(surveyRepo, 'create').mockReturnValue(createdSurvey as any);
      jest.spyOn(surveyRepo, 'save').mockResolvedValue(createdSurvey as any);

      const result = await service.create(createDto);
      expect(result).toEqual(createdSurvey);
      expect(surveyRepo.create).toHaveBeenCalledWith(createDto);
      expect(surveyRepo.save).toHaveBeenCalledWith(createdSurvey);
    });
  });

  describe('findAll', () => {
    it('should return an array of surveys', async () => {
      const surveys = [mockSurvey];
      jest.spyOn(surveyRepo, 'find').mockResolvedValue(surveys as any);

      const result = await service.findAll();
      expect(result).toEqual(surveys);
    });
  });

  describe('findOne', () => {
    it('should return a survey by id', async () => {
      jest.spyOn(surveyRepo, 'findOne').mockResolvedValue(mockSurvey as any);

      const result = await service.findOne('survey-123');
      expect(result).toEqual(mockSurvey);
      expect(surveyRepo.findOne).toHaveBeenCalledWith({ where: { id: 'survey-123' } });
    });

    it('should throw NotFoundException if survey not found', async () => {
      jest.spyOn(surveyRepo, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and return the survey', async () => {
      const updateDto = { title: 'Updated Title' };
      const updatedSurvey = { ...mockSurvey, ...updateDto };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockSurvey as any);
      jest.spyOn(surveyRepo, 'merge').mockReturnValue(updatedSurvey as any);
      jest.spyOn(surveyRepo, 'save').mockResolvedValue(updatedSurvey as any);

      const result = await service.update('survey-123', updateDto as any);
      expect(result).toEqual(updatedSurvey);
      expect(service.findOne).toHaveBeenCalledWith('survey-123');
      expect(surveyRepo.merge).toHaveBeenCalledWith(mockSurvey, updateDto);
      expect(surveyRepo.save).toHaveBeenCalledWith(updatedSurvey);
    });
  });

  describe('remove', () => {
    it('should remove the survey', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockSurvey as any);
      jest.spyOn(surveyRepo, 'remove').mockResolvedValue(mockSurvey as any);

      await service.remove('survey-123');
      expect(service.findOne).toHaveBeenCalledWith('survey-123');
      expect(surveyRepo.remove).toHaveBeenCalledWith(mockSurvey);
    });
  });

  describe('findByTriggerKey', () => {
    it('should return a survey if found', async () => {
      jest.spyOn(surveyRepo, 'findOne').mockResolvedValue(mockSurvey as any);
      const result = await service.findByTriggerKey('test-key');
      expect(result).toEqual(mockSurvey);
      expect(surveyRepo.findOne).toHaveBeenCalledWith({ where: { triggerKey: 'test-key' } });
    });

    it('should return null if not found', async () => {
      jest.spyOn(surveyRepo, 'findOne').mockResolvedValue(null);
      const result = await service.findByTriggerKey('unknown');
      expect(result).toBeNull();
    });
  });

  describe('saveResponse', () => {
    it('should save a response successfully', async () => {
      jest.spyOn(service, 'findByTriggerKey').mockResolvedValue(mockSurvey as any);
      jest.spyOn(responseRepo, 'create').mockReturnValue(mockResponse as any);
      jest.spyOn(responseRepo, 'save').mockResolvedValue(mockResponse as any);

      const result = await service.saveResponse('test-key', {}, 'user-1', 'session-1', 'trace-1');

      expect(result).toEqual(mockResponse);
      expect(responseRepo.create).toHaveBeenCalledWith({
        surveyId: mockSurvey.id,
        userId: 'user-1',
        answers: {},
        sessionId: 'session-1',
        traceId: 'trace-1',
      });
      expect(responseRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if survey does not exist', async () => {
      jest.spyOn(service, 'findByTriggerKey').mockResolvedValue(null);

      await expect(
        service.saveResponse('unknown', {}, 'user-1', 'session-1', 'trace-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
