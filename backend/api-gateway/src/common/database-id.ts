import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/** The largest id an integer column holds: beyond, PostgreSQL answers 500. */
export const MAX_ID = 2147483647;

/** A route id the database can hold, or 400. */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const id = Number(value);
    if (!/^\d+$/.test(value) || id < 1 || id > MAX_ID) {
      throw new BadRequestException(`Not an id: ${value}`);
    }
    return id;
  }
}
