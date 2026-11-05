import { PartialType } from '@nestjs/mapped-types';
import { CreateRepairRecordDto } from './create-repair-record.dto';

export class UpdateRepairRecordDto extends PartialType(CreateRepairRecordDto) {}
