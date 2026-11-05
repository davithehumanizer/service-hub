import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { CreateTutorialSubscriptionDto } from './dto/create-tutorial-subscription.dto';
import { CreateTutorialSubscriptionResponseDto } from './dto/response/create-tutorial-subscription-response.dto';
import { buildTutorialSubscriptionConfirmationEmail } from './templates/tutorial-subscription-email';
import { DeviceModelResolver } from '../devices/device-model-resolver.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    @Inject('NOTIFICATIONS_SERVICE')
    private readonly notificationsService: ClientProxy,
    private readonly resolver: DeviceModelResolver,
  ) {}

  /**
   * The model a subscription waits on: the one given, which must exist, and
   * be the one of a catalogue id sent with it; or the one a catalogue id
   * names. deviceId has always been free text, a manual entry's included,
   * so one sent alone that names no model is no error.
   */
  private async modelOf(
    dto: CreateTutorialSubscriptionDto,
  ): Promise<number | undefined> {
    const variant =
      dto.deviceId && /^\d{1,9}$/.test(dto.deviceId)
        ? Number(dto.deviceId)
        : undefined;
    if (dto.modelId != null) {
      return (
        await this.resolver.resolve({ modelId: dto.modelId, deviceId: variant })
      ).modelId;
    }
    if (variant !== undefined) {
      try {
        return (await this.resolver.resolve({ deviceId: variant })).modelId;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  // Public endpoint: no auth guard, anyone can subscribe with their email.
  @Post('tutorial-subscriptions')
  @ApiOperation({
    summary: 'Subscribe to be notified when a repair tutorial is available',
  })
  @ApiBody({ type: CreateTutorialSubscriptionDto })
  @ApiResponse({ status: 201, type: CreateTutorialSubscriptionResponseDto })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async createTutorialSubscription(
    @Body() dto: CreateTutorialSubscriptionDto,
  ): Promise<CreateTutorialSubscriptionResponseDto> {
    // Outside the try: an unknown model keeps its 404.
    const modelId = await this.modelOf(dto);
    try {
      await firstValueFrom(
        this.notificationsService.send(
          { cmd: 'create_tutorial_subscription' },
          {
            email: dto.email,
            modelId,
            deviceId: dto.deviceId,
            issueTypes: dto.issueTypes,
            locale: dto.locale,
          },
        ),
      );

      try {
        const { subject, html } = buildTutorialSubscriptionConfirmationEmail(
          dto.locale,
        );
        await firstValueFrom(
          this.notificationsService.send(
            { cmd: 'send_email' },
            { to: dto.email, subject, html },
          ),
        );
      } catch (emailError) {
        // The subscription itself was persisted successfully; a failure to
        // send the confirmation email should not fail the whole request.
        this.logger.warn(
          'Failed to send tutorial subscription confirmation email: ' +
            emailError.message,
        );
      }

      this.logger.log('Tutorial subscription created', {
        event: 'tutorial_subscription_created',
        category: 'notifications',
        deviceId: dto.deviceId,
        issueTypes: dto.issueTypes,
        locale: dto.locale,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(
        'Error creating tutorial subscription: ' + error.message,
        error.stack,
      );
      throw new HttpException(
        error.message || 'Internal error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
