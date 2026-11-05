import { Test, TestingModule } from '@nestjs/testing';
import { OwnershipModule } from '../ownership.module';
import { OwnershipService } from '../ownership.service';
import { OwnershipController } from '../ownership.controller';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Ownership } from '../ownership.entity';

describe('OwnershipModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [TypeOrmModule.forFeature([Ownership]), OwnershipModule],
    })
      .overrideProvider(getRepositoryToken(Ownership))
      .useValue({})
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
    expect(module.get(OwnershipService)).toBeDefined();
    expect(module.get(OwnershipController)).toBeDefined();
  });
});
