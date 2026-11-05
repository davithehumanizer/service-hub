import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { imageUploadOptions } from '../common/upload.constraints';
import { SubmitBarcodeDto } from './dto/submit-barcode.dto';
import { IdentificationService } from './identification.service';
import {
  HandoffService,
  CreateHandoffResult,
  HandoffStatusResult,
} from './handoff.service';

// "Continue on your phone": a desktop user creates a short-lived pairing
// session (shown as a QR code), a phone scans it and uploads the photo, and
// the desktop picks up the result by polling. Unauthenticated by design —
// same as `identification/analyze`, this only needs to survive the couple of
// minutes it takes someone to scan a code and take a photo.
@ApiTags('Identification')
@Controller('identification/handoff')
export class HandoffController {
  private readonly logger = new Logger(HandoffController.name);

  constructor(
    private readonly handoffService: HandoffService,
    private readonly identificationService: IdentificationService,
  ) {}

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Start a desktop-to-phone photo handoff session' })
  create(): CreateHandoffResult {
    const result = this.handoffService.create();
    this.logger.log('Handoff session created', {
      event: 'handoff_session_created',
      category: 'identification_handoff',
    });
    return result;
  }

  @Get(':pairingId/status')
  // Polled every ~2s by the desktop for up to the session's lifetime.
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  @ApiOperation({ summary: 'Poll a handoff session for its result' })
  status(
    @Param('pairingId') pairingId: string,
    @Headers('x-handoff-token') token: string,
  ): HandoffStatusResult {
    if (!token) {
      throw new BadRequestException('Missing handoff token');
    }
    return this.handoffService.getStatus(pairingId, token);
  }

  @Post(':pairingId/photo')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  @ApiOperation({ summary: 'Submit the phone-captured photo for a session' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async submitPhoto(
    @Param('pairingId') pairingId: string,
    @Headers('x-handoff-token') token: string,
    @UploadedFile() file: any,
  ): Promise<{ success: true }> {
    if (!token) {
      throw new BadRequestException('Missing handoff token');
    }
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate before running the expensive ML pipeline.
    this.handoffService.assertConsumable(pairingId, token);

    const result = await this.identificationService.identifyImage(file);
    this.handoffService.complete(pairingId, token, result);

    this.logger.log('Handoff photo submitted', {
      event: 'handoff_photo_submitted',
      category: 'identification_handoff',
    });

    return { success: true };
  }

  @Post(':pairingId/barcode')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({ summary: 'Submit a barcode scanned on the phone' })
  submitBarcode(
    @Param('pairingId') pairingId: string,
    @Headers('x-handoff-token') token: string,
    @Body() body: SubmitBarcodeDto,
  ): { success: true } {
    if (!token) {
      throw new BadRequestException('Missing handoff token');
    }
    this.handoffService.assertConsumable(pairingId, token);

    // The code is handed back as-is rather than resolved here: the desktop
    // already knows how to search on it, and that search now covers the
    // GTIN-13/14 pair.
    this.handoffService.complete(pairingId, token, {
      success: true,
      data: {
        Product: '',
        Brand: '',
        Model: '',
        ReleaseDate: '',
        GTIN: body.code,
      },
      timestamp: new Date().toISOString(),
    });

    this.logger.log('Handoff barcode submitted', {
      event: 'handoff_barcode_submitted',
      category: 'identification_handoff',
      gtin: body.code,
      code_length: body.code.length,
    });

    return { success: true };
  }
}
