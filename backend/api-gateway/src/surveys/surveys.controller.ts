import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { FlexibleAuthGuard } from '../auth/flexible-auth.guard';
import { PermissionsGuard } from '../auth/permission.guard';
import { Permissions } from '../auth/permission.decorator';

@ApiTags('Surveys')
@Controller('surveys')
export class SurveysController {
  private readonly logger = new Logger(SurveysController.name);

  constructor(
    @Inject('SURVEYS_SERVICE') private readonly surveysService: ClientProxy,
  ) {}

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('survey.create')
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create a new survey' })
  @ApiResponse({ status: 201, description: 'Survey created' })
  @ApiBody({ type: CreateSurveyDto })
  async create(@Body() createSurveyDto: CreateSurveyDto) {
    this.logger.log('createSurvey called', { createSurveyDto });
    try {
      const result = await firstValueFrom(
        this.surveysService.send({ cmd: 'create_survey' }, createSurveyDto),
      );
      this.logger.log('createSurvey result', { result });
      return result;
    } catch (error) {
      this.logger.error('createSurvey error: ' + error.message, error.stack);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('survey.read')
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Get all surveys' })
  @ApiResponse({ status: 200, description: 'List of surveys' })
  async findAll() {
    this.logger.log('findAllSurveys called');
    try {
      const result = await firstValueFrom(
        this.surveysService.send({ cmd: 'find_all_surveys' }, {}),
      );
      this.logger.log('findAllSurveys result', { result });
      return result;
    } catch (error) {
      this.logger.error('findAllSurveys error: ' + error.message, error.stack);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('trigger/:key')
  @ApiOperation({ summary: 'Get survey configuration by trigger key' })
  @ApiResponse({ status: 200, description: 'Survey configuration' })
  @ApiResponse({ status: 404, description: 'Survey not found' })
  async getSurvey(@Param('key') key: string) {
    this.logger.log('getSurvey called', { key });
    try {
      const result = await firstValueFrom(
        this.surveysService.send({ cmd: 'get_survey' }, { key }),
      );
      if (!result) {
        throw new HttpException('Survey not found', HttpStatus.NOT_FOUND);
      }
      this.logger.log('getSurvey result', { result });
      return result;
    } catch (error) {
      this.logger.error('getSurvey error: ' + error.message, error.stack);
      throw new HttpException(
        error.message || 'Error fetching survey',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('survey.read')
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get survey by ID' })
  @ApiResponse({ status: 200, description: 'Survey details' })
  async findOne(@Param('id') id: string) {
    this.logger.log('findOneSurvey called', { id });
    try {
      const result = await firstValueFrom(
        this.surveysService.send({ cmd: 'find_one_survey' }, { id }),
      );
      this.logger.log('findOneSurvey result', { result });
      return result;
    } catch (error) {
      this.logger.error('findOneSurvey error: ' + error.message, error.stack);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('survey.update')
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update survey' })
  @ApiResponse({ status: 200, description: 'Survey updated' })
  @ApiBody({ type: UpdateSurveyDto })
  async update(
    @Param('id') id: string,
    @Body() updateSurveyDto: UpdateSurveyDto,
  ) {
    this.logger.log('updateSurvey called', { id, updateSurveyDto });
    try {
      const result = await firstValueFrom(
        this.surveysService.send(
          { cmd: 'update_survey' },
          { id, ...updateSurveyDto },
        ),
      );
      this.logger.log('updateSurvey result', { result });
      return result;
    } catch (error) {
      this.logger.error('updateSurvey error: ' + error.message, error.stack);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('survey.delete')
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete survey' })
  @ApiResponse({ status: 200, description: 'Survey deleted' })
  async remove(@Param('id') id: string) {
    this.logger.log('removeSurvey called', { id });
    try {
      const result = await firstValueFrom(
        this.surveysService.send({ cmd: 'remove_survey' }, { id }),
      );
      this.logger.log('removeSurvey result', { result });
      return result;
    } catch (error) {
      this.logger.error('removeSurvey error: ' + error.message, error.stack);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(':key/response')
  @ApiOperation({ summary: 'Submit survey response' })
  @ApiResponse({ status: 201, description: 'Response submitted' })
  async submitResponse(
    @Param('key') key: string,
    @Body() body: any,
    @Headers('x-session-id') sessionId: string,
    @Headers('x-trace-id') traceId: string,
    @Req() req: any,
  ) {
    // Extract userId from JWT user if available (set by FlexibleAuthGuard if used)
    const userId = req.user?.userId || body.userId || null;

    this.logger.log('submitResponse called', { key, userId, sessionId });

    try {
      const result = await firstValueFrom(
        this.surveysService.send(
          { cmd: 'submit_response' },
          {
            key,
            answers: body.answers || body, // adapt depending on frontend payload
            userId,
            sessionId,
            traceId,
          },
        ),
      );
      this.logger.log('submitResponse result', { result });
      return result;
    } catch (error) {
      this.logger.error('submitResponse error: ' + error.message, error.stack);
      throw new HttpException(
        error.message || 'Error submitting response',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
