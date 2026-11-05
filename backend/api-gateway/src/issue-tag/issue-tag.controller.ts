import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { IssueTagClassifyRequestDto } from './dto/classify-request.dto';
import { IssueTagClassifyResponseDto } from './dto/classify-response.dto';
import { FluentLoggerService } from '../common/fluent-logger.service';

@ApiTags('Issue Tag')
@Controller('issue-tag')
export class IssueTagController {
  private readonly serviceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly logger: FluentLoggerService,
  ) {
    this.serviceUrl = this.configService.get<string>(
      'ISSUE_TAG_SERVICE_URL',
      'http://device-issue-tag:8000',
    );
  }

  @Post('classify')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({
    summary: 'Classify the origin of a device issue',
    description:
      'Provide a device name followed by a problem description. Returns the predicted issue category (e.g. MECHANICAL, POWER_ELECTRICAL, BEHAVIOUR_SYMPTOM).',
  })
  @ApiBody({ type: IssueTagClassifyRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Issue classified successfully',
    type: IssueTagClassifyResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Input is missing or invalid' })
  @ApiResponse({
    status: 502,
    description: 'Classification service unavailable',
  })
  async classify(
    @Body() body: IssueTagClassifyRequestDto,
  ): Promise<IssueTagClassifyResponseDto> {
    const startTime = Date.now();

    this.logger.log('Issue tag classification request received', {
      event: 'issue_tag_request',
      category: 'issue_tag',
      controller: 'IssueTagController',
      status: 'pending',
      input_length: body.input?.length ?? 0,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.serviceUrl}/v1/predict`, {
          text: body.input,
        }),
      );

      const raw = response.data as {
        input: string;
        'final prediction': { label: string; score: number }[];
        predictions: { label: string; score: number }[];
      };
      const durationMs = Date.now() - startTime;
      const topPrediction = (raw['final prediction'] ?? [])[0] ?? null;

      this.logger.log('Issue tag classification succeeded', {
        event: 'issue_tag_success',
        category: 'issue_tag',
        controller: 'IssueTagController',
        status: 'success',
        duration_ms: durationMs,
        predicted_label: topPrediction?.label ?? null,
        confidence_score: topPrediction?.score ?? null,
        prediction_count: (raw.predictions ?? []).length,
      });

      return {
        input: raw.input,
        finalPrediction: raw['final prediction'] ?? [],
        predictions: raw.predictions ?? [],
      };
    } catch (err) {
      const error = err as {
        response?: { status?: number; data?: { detail?: string } };
        message?: string;
      };
      const durationMs = Date.now() - startTime;
      const httpStatus: number | null = error.response?.status ?? null;
      const errorMessage: string =
        error.response?.data?.detail || error.message || 'Unknown error';

      this.logger.error('Issue tag classification failed', {
        event: 'issue_tag_failure',
        category: 'issue_tag',
        controller: 'IssueTagController',
        status: 'error',
        duration_ms: durationMs,
        error_message: errorMessage,
        http_status: httpStatus,
      });

      throw new HttpException(
        errorMessage || 'Issue classification service error',
        httpStatus ?? HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
