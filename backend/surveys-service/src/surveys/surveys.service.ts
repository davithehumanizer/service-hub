import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Survey } from './entities/survey.entity';
import { SurveyResponse } from './entities/survey-response.entity';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';

@Injectable()
export class SurveysService {
  constructor(
    @InjectRepository(Survey)
    private readonly surveyRepository: Repository<Survey>,
    @InjectRepository(SurveyResponse)
    private readonly responseRepository: Repository<SurveyResponse>,
  ) {}

  async create(createSurveyDto: CreateSurveyDto): Promise<Survey> {
    const survey = this.surveyRepository.create(createSurveyDto);
    return this.surveyRepository.save(survey);
  }

  async findAll(): Promise<Survey[]> {
    return this.surveyRepository.find();
  }

  async findOne(id: string): Promise<Survey> {
    const survey = await this.surveyRepository.findOne({ where: { id } });
    if (!survey) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }
    return survey;
  }

  async update(id: string, updateSurveyDto: UpdateSurveyDto): Promise<Survey> {
    const survey = await this.findOne(id);
    const updatedSurvey = this.surveyRepository.merge(survey, updateSurveyDto);
    return this.surveyRepository.save(updatedSurvey);
  }

  async remove(id: string): Promise<void> {
    const survey = await this.findOne(id);
    await this.surveyRepository.remove(survey);
  }

  async findByTriggerKey(triggerKey: string): Promise<Survey> {
    return this.surveyRepository.findOne({ where: { triggerKey } });
  }

  async saveResponse(triggerKey: string, answers: any, userId: string, sessionId: string, traceId: string) {
    const survey = await this.findByTriggerKey(triggerKey);
    if (!survey) {
      throw new NotFoundException('Survey not found during submission');
    }

    const response = this.responseRepository.create({
      surveyId: survey.id,
      userId,
      answers,
      sessionId,
      traceId
    });

    // Here we could also log to ElasticSearch explicitly if TypeORM event subscribers aren't enough
    // But for now, saving to DB is primary. The LogsController handles general logs.
    
    return this.responseRepository.save(response);
  }
}
