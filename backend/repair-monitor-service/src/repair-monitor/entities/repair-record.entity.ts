import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { RepairStatus } from "../enums/repair-status.enum";
import { RepairBarrier } from "../enums/repair-barrier.enum";
import { ProblemTag } from "../enums/problem-tag.enum";
import { SolutionTag } from "../enums/solution-tag.enum";
import { RecordSource } from "../enums/record-source.enum";
import { IssueSeverity } from "../enums/issue-severity.enum";
import { IssueDuration } from "../enums/issue-duration.enum";
import { VisualCondition } from "../enums/visual-condition.enum";
import { UsageIntensity } from "../enums/usage-intensity.enum";

@Entity("repair_records")
export class RepairRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ nullable: true })
  partnerId: string;

  @Column({ nullable: true })
  partnerProductCategory: string;

  @Column({ nullable: true })
  productCategory: string;

  @Column({ nullable: true })
  productCategoryId: string;

  @Column({ nullable: true })
  brand: string;

  @Column({ nullable: true })
  modelType: string;

  @Column({ nullable: true, type: "int" })
  yearOfManufacture: number;

  @Column({ nullable: true, type: "float" })
  productAge: number;

  @Column({ nullable: true, type: "text" })
  problem: string;

  @Column({ nullable: true, enum: ProblemTag })
  problemTag: string;

  @Column({
    nullable: true,
    type: "enum",
    enum: RepairStatus,
  })
  repairStatus: RepairStatus;

  @Column({ nullable: true, enum: RepairBarrier })
  repairBarrier: string;

  @Column({ nullable: true, type: "text" })
  repairSolution: string;

  @Column({ nullable: true, enum: SolutionTag })
  solutionTag: string;

  @Column({ nullable: true, type: "float" })
  repairFeasibility: number;

  @Column({ nullable: true, type: "text" })
  repairExplanation: string;

  @Column({ nullable: true })
  groupIdentifier: string;

  @Column({ nullable: true, type: "date" })
  eventDate: string;

  @Column({ nullable: true })
  dataProvider: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  submittedByUserId: string;

  /**
   * Separates the imported open dataset from what our own users declare.
   * Defaults to ImportedDataset so the ~195k existing rows keep their meaning.
   */
  @Column({ default: RecordSource.ImportedDataset, enum: RecordSource })
  source: string;

  // Context captured by the wizard, carried over when a journey is promoted.
  // Always empty on imported rows, which have no symptom selection.
  @Column({ nullable: true, type: 'text', array: true })
  issues: string[];

  @Column({ nullable: true, enum: IssueSeverity })
  issueSeverity: string;

  @Column({ nullable: true, enum: IssueDuration })
  issueDuration: string;

  @Column({ nullable: true, enum: VisualCondition })
  visualCondition: string;

  @Column({ nullable: true, enum: UsageIntensity })
  usageIntensity: string;

  @CreateDateColumn()
  recordDate: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
