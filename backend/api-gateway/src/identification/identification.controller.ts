import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { imageUploadOptions } from '../common/upload.constraints';
import { IdentificationService } from './identification.service';
import { IdentificationResponseDto } from './dto/identification-response.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Identification')
@Controller('identification')
export class IdentificationController {
  private readonly logger = new Logger(IdentificationController.name);

  constructor(private readonly identificationService: IdentificationService) {}

  @Post('analyze')
  // Unauthenticated, stores a file and runs an ML model: the most expensive
  // thing an anonymous caller can trigger.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  @ApiOperation({ summary: 'Identify a product from an image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Product identified successfully',
    type: IdentificationResponseDto,
  })
  async analyze(@UploadedFile() file: any): Promise<IdentificationResponseDto> {
    if (!file) {
      this.logger.warn('No file provided for identification', {
        event: 'device_identification_no_file',
        category: 'device_identification',
      });
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    return this.identificationService.identifyImage(file);
  }
}
