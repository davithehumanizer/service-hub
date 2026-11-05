import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class AppController {
  @MessagePattern({ cmd: 'health_check' })
  healthCheck() {
    return { status: 'ok' };
  }
}
