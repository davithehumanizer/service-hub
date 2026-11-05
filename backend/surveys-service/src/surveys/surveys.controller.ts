import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SurveysService } from './surveys.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';

@Controller()
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @MessagePattern({ cmd: 'create_survey' })
  async create(@Payload() createSurveyDto: CreateSurveyDto) {
    return this.surveysService.create(createSurveyDto);
  }

  @MessagePattern({ cmd: 'find_all_surveys' })
  async findAll() {
    return this.surveysService.findAll();
  }

  @MessagePattern({ cmd: 'find_one_survey' })
  async findOne(@Payload() data: { id: string }) {
    return this.surveysService.findOne(data.id);
  }

  @MessagePattern({ cmd: 'update_survey' })
  async update(@Payload() updateSurveyDto: UpdateSurveyDto) {
    return this.surveysService.update(updateSurveyDto.id, updateSurveyDto);
  }

  @MessagePattern({ cmd: 'remove_survey' })
  async remove(@Payload() data: { id: string }) {
    return this.surveysService.remove(data.id);
  }

  @MessagePattern({ cmd: 'get_survey' })
  async getSurvey(@Payload() data: { key: string }) {
    return this.surveysService.findByTriggerKey(data.key);
  }

  @MessagePattern({ cmd: 'submit_response' })
  async submitResponse(@Payload() data: any) {
    const { key, answers, userId, sessionId, traceId } = data;
    return this.surveysService.saveResponse(
      key,
      answers,
      userId,
      sessionId,
      traceId,
    );
  }
}
