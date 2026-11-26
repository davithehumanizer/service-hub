import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { ContributionsService } from './contributions.service';

@Controller()
export class ContributionsController {
  constructor(private readonly contributions: ContributionsService) {}

  /** A page of the models, or the variants, an account entered. */
  @MessagePattern({ cmd: 'entries_of_author' })
  async entriesOfAuthor(
    @Payload()
    data: { authorId: number; kind: 'models' | 'variants'; offset?: number; limit?: number },
  ) {
    try {
      return data.kind === 'variants'
        ? await this.contributions.variantsOf(data.authorId, data.offset, data.limit)
        : await this.contributions.modelsOf(data.authorId, data.offset, data.limit);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to read the entries');
    }
  }
}
