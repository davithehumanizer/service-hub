import { BadRequestException } from '@nestjs/common';
import { MAX_ID, ParseIdPipe } from '../database-id';

describe('ParseIdPipe', () => {
  const pipe = new ParseIdPipe();

  it('takes an id an integer column holds', () => {
    expect(pipe.transform('877165')).toBe(877165);
    expect(pipe.transform(String(MAX_ID))).toBe(MAX_ID);
  });

  it('refuses what the database would answer with a 500', () => {
    for (const value of ['2147483648', '0', '-1', '1.5', 'abc', '']) {
      expect(() => pipe.transform(value)).toThrow(BadRequestException);
    }
  });
});
