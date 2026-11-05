import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { RepairerReportsService } from '../services/repairer-reports.service';
import { RepairerReport } from '../repairer-report.entity';

describe('RepairerReportsService', () => {
  let service: RepairerReportsService;
  let repo: jest.Mocked<Repository<RepairerReport>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepairerReportsService,
        {
          provide: getRepositoryToken(RepairerReport),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RepairerReportsService>(RepairerReportsService);
    repo = module.get(getRepositoryToken(RepairerReport));
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('creates and saves a pending report', async () => {
      const entity = {
        repairer_id: '1',
        reason: 'Not a repairer',
        status: 'pending',
      };
      repo.create.mockReturnValue(entity as any);
      repo.save.mockResolvedValue({ id: 'r1', ...entity } as any);

      const result = await service.create('1', 'Not a repairer');

      expect(repo.create).toHaveBeenCalledWith({
        repairer_id: '1',
        reason: 'Not a repairer',
        status: 'pending',
      });
      expect(repo.save).toHaveBeenCalledWith(entity);
      expect(result).toEqual({ id: 'r1', ...entity });
    });

    it('defaults reason to null when not provided', async () => {
      repo.create.mockReturnValue({} as any);
      repo.save.mockResolvedValue({} as any);

      await service.create('1');

      expect(repo.create).toHaveBeenCalledWith({
        repairer_id: '1',
        reason: null,
        status: 'pending',
      });
    });
  });

  describe('findAll', () => {
    it('filters by status when a valid status is given', async () => {
      repo.find.mockResolvedValue([]);
      await service.findAll('pending');
      expect(repo.find).toHaveBeenCalledWith({
        where: { status: 'pending' },
        relations: ['repairer'],
        order: { createdAt: 'ASC' },
      });
    });

    it('ignores an invalid status', async () => {
      repo.find.mockResolvedValue([]);
      await service.findAll('bogus');
      expect(repo.find).toHaveBeenCalledWith({
        where: {},
        relations: ['repairer'],
        order: { createdAt: 'ASC' },
      });
    });

    it('returns all reports when no status is given', async () => {
      repo.find.mockResolvedValue([]);
      await service.findAll();
      expect(repo.find).toHaveBeenCalledWith({
        where: {},
        relations: ['repairer'],
        order: { createdAt: 'ASC' },
      });
    });
  });

  describe('updateStatus', () => {
    it('throws NotFoundException when the report does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.updateStatus('missing', 'reviewed')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates status, reviewedBy and reviewedAt', async () => {
      const existing = { id: 'r1', status: 'pending' } as RepairerReport;
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation(async (r) => r as RepairerReport);

      const result = await service.updateStatus('r1', 'reviewed', 'admin-1');

      expect(result.status).toBe('reviewed');
      expect(result.reviewedBy).toBe('admin-1');
      expect(result.reviewedAt).toBeInstanceOf(Date);
    });
  });
});
