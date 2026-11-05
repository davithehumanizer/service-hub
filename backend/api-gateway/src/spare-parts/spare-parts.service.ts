import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SparePartsService {
  constructor(
    @Inject('SPARE_PARTS_SERVICE')
    private readonly sparePartsClient: ClientProxy,
  ) {}

  async getById(id: string): Promise<any> {
    return firstValueFrom(
      this.sparePartsClient.send({ cmd: 'spare-parts-get-by-id' }, { id }),
    );
  }

  async search(params: {
    q?: string;
    brand?: string;
    category?: string;
    offset?: number;
    limit?: number;
  }): Promise<any> {
    return firstValueFrom(
      this.sparePartsClient.send({ cmd: 'spare-parts-search' }, params),
    );
  }

  async list(params: { offset?: number; limit?: number }): Promise<any> {
    return firstValueFrom(
      this.sparePartsClient.send({ cmd: 'spare-parts-list' }, params),
    );
  }

  async searchByDevice(params: {
    brand: string;
    model: string;
    offset?: number;
    limit?: number;
  }): Promise<any> {
    return firstValueFrom(
      this.sparePartsClient.send(
        { cmd: 'spare-parts-search-by-device' },
        params,
      ),
    );
  }

  async multiSearch(q: string): Promise<any> {
    return firstValueFrom(
      this.sparePartsClient.send({ cmd: 'spare-parts-multi-search' }, { q }),
    );
  }
}
