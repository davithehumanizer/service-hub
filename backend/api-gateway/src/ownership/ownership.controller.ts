import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
  ParseIntPipe,
  Logger,
  Version,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { from, Observable, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { plainToInstance } from 'class-transformer';
import { FlexibleAuthGuard } from 'src/auth/flexible-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { Permissions } from 'src/auth/permission.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { DeviceModelResolver } from 'src/devices/device-model-resolver.service';
import { AssignDeviceDto } from './dto/assign-device.dto';
import { RemoveDeviceDto } from './dto/remove-device.dto';
import { UserDevicesResponseDto } from './dto/response/user-devices-response.dto';
import { AssignDeviceResponseDto } from './dto/response/assign-device-response.dto';
import { RemoveDeviceResponseDto } from './dto/response/remove-device-response.dto';

// A signed-in user's role is the Role entity the token carries; a guest's
// is the bare name the auth guard gives it.
type RequestUser = { id: number; role: string | { name?: string } };
const isAdmin = ({ role }: RequestUser) =>
  (typeof role === 'string' ? role : role?.name) === 'admin';

// ownership-service sends a refusal with its HTTP status; anything else
// stays an internal error.
const answerRefusals = catchError(
  (error: { status?: unknown; message?: string }) =>
    throwError(
      () =>
        new HttpException(
          error?.message || 'Ownership request failed',
          typeof error?.status === 'number'
            ? error.status
            : HttpStatus.INTERNAL_SERVER_ERROR,
        ),
    ),
);

@ApiTags('Ownership')
@Controller('ownership')
export class OwnershipController {
  private readonly logger = new Logger(OwnershipController.name);
  constructor(
    @Inject('OWNERSHIP_SERVICE') private readonly ownershipService: ClientProxy,
    private readonly resolver: DeviceModelResolver,
  ) {}

  // Route pour obtenir les devices d'un utilisateur
  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('ownership.get_user_devices')
  @Version('1')
  @Get('user/:userId/devices')
  @ApiOperation({
    summary: 'Get devices owned by a user',
    description:
      "Replaced by `GET /api/v2/personal-devices`: the signed-in user's devices, each of a model and of a variant when known.",
    deprecated: true,
  })
  @ApiParam({ name: 'userId', type: 'number', description: 'ID of the user' })
  @ApiResponse({
    status: 200,
    description: 'Returns devices owned by the user.',
    type: UserDevicesResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  getUserDevices(
    @Request() req: { user: RequestUser },
    @Param('userId', ParseIntPipe) userId: number,
  ): Observable<UserDevicesResponseDto> {
    this.logger.log('getUserDevices called', { userId, user: req.user });

    const result = this.ownershipService.send(
      { cmd: 'get_user_devices' },
      {
        userId,
        requesterId: req.user.id,
        isAdmin: isAdmin(req.user),
      },
    );
    this.logger.log('getUserDevices result');
    return result.pipe(
      answerRefusals,
      map((data) => plainToInstance(UserDevicesResponseDto, data)),
    );
  }

  // Route pour assigner un device à un utilisateur
  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('ownership.assign_device')
  @Version('1')
  @Post('assign')
  @ApiOperation({
    summary: 'Assign a device to a user',
    description:
      'Replaced by `POST /api/v2/personal-devices`, which takes a model, a variant or both.',
    deprecated: true,
  })
  @ApiBody({ type: AssignDeviceDto })
  @ApiResponse({
    status: 201,
    description: 'Device assigned successfully.',
    type: AssignDeviceResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  assignDeviceToUser(
    @Request() req: { user: RequestUser },
    @Body() assignData: AssignDeviceDto,
  ): Observable<AssignDeviceResponseDto> {
    this.logger.log('assignDeviceToUser called', {
      assignData,
      user: req.user,
    });
    console.log('assignDeviceToUser', assignData, req.user);
    // Its model, as /api/v2/personal-devices records it; one the catalogue
    // cannot give yet comes with the next models:assign.
    const modelOf = this.resolver
      .resolve({ deviceId: assignData.deviceId })
      .then(
        ({ modelId }) => modelId,
        () => null,
      );
    const result = from(modelOf).pipe(
      switchMap((modelId) =>
        this.ownershipService.send(
          { cmd: 'assign_device_to_user' },
          {
            deviceId: assignData.deviceId,
            modelId,
            userId: assignData.userId,
            acquiredAt: assignData.acquiredAt,
            requesterId: req.user.id,
            isAdmin: isAdmin(req.user),
          },
        ),
      ),
    );
    this.logger.log('assignDeviceToUser result');
    return result.pipe(
      answerRefusals,
      map((data) => plainToInstance(AssignDeviceResponseDto, data)),
    );
  }

  // Route pour supprimer un device de l'utilisateur
  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('ownership.remove_device')
  @Version('1')
  @Delete('remove')
  @ApiOperation({
    summary: 'Remove a device from a user',
    description:
      'Replaced by `DELETE /api/v2/personal-devices/{id}`: a personal device is designated by its own id, two identical ones being possible.',
    deprecated: true,
  })
  @ApiBody({ type: RemoveDeviceDto })
  @ApiResponse({
    status: 200,
    description: 'Device removed successfully.',
    type: RemoveDeviceResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  removeDeviceFromUser(
    @Request() req: { user: RequestUser },
    @Body() removeData: RemoveDeviceDto,
  ): Observable<RemoveDeviceResponseDto> {
    this.logger.log('removeDeviceFromUser called', {
      removeData,
      user: req.user,
    });
    const result = this.ownershipService.send(
      { cmd: 'remove_device_from_user' },
      {
        deviceId: removeData.deviceId,
        userId: removeData.userId,
        requesterId: req.user.id,
        isAdmin: isAdmin(req.user),
      },
    );
    this.logger.log('removeDeviceFromUser result');
    return result.pipe(
      answerRefusals,
      map((data) => plainToInstance(RemoveDeviceResponseDto, data)),
    );
  }
}
