import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RepairerReport } from '../repairer-report.entity';
import {
  DEFAULT_REPAIRER_REPORT_STATUS,
  REPAIRER_REPORT_STATUS_WHITELIST,
  RepairerReportStatus,
} from '../constants/repairer-report-status';

/**
 * Service handling the "Ce résultat n'est pas un réparateur" report/moderation
 * flow (PBI 13762).
 */
@Injectable()
export class RepairerReportsService {
  private readonly logger = new Logger(RepairerReportsService.name);

  constructor(
    @InjectRepository(RepairerReport)
    private readonly repairerReportRepository: Repository<RepairerReport>,
  ) {}

  async create(repairerId: string, reason?: string): Promise<RepairerReport> {
    const report = this.repairerReportRepository.create({
      repairer_id: repairerId,
      reason: reason || null,
      status: DEFAULT_REPAIRER_REPORT_STATUS,
    });
    return this.repairerReportRepository.save(report);
  }

  async findAll(status?: string): Promise<RepairerReport[]> {
    const where =
      status &&
      REPAIRER_REPORT_STATUS_WHITELIST.includes(status as RepairerReportStatus)
        ? { status }
        : {};
    return this.repairerReportRepository.find({
      where,
      relations: ['repairer'],
      order: { createdAt: 'ASC' },
    });
  }

  async updateStatus(
    id: string,
    status: RepairerReportStatus,
    reviewedBy?: string,
  ): Promise<RepairerReport> {
    const report = await this.repairerReportRepository.findOne({
      where: { id },
      relations: ['repairer'],
    });
    if (!report) {
      throw new NotFoundException('Repairer report not found');
    }

    report.status = status;
    report.reviewedBy = reviewedBy || null;
    report.reviewedAt = new Date();

    return this.repairerReportRepository.save(report);
  }
}
