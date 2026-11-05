import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";
import { ProblemTag } from "../enums/problem-tag.enum";
import { RepairRoute } from "../enums/repair-route.enum";
import { JourneyStatus } from "../enums/journey-status.enum";
import { IssueSeverity } from "../enums/issue-severity.enum";
import { IssueDuration } from "../enums/issue-duration.enum";
import { VisualCondition } from "../enums/visual-condition.enum";
import { UsageIntensity } from "../enums/usage-intensity.enum";

/**
 * A repair journey completed in the wizard, waiting for its outcome.
 *
 * Deliberately a separate table from `repair_records`: most visitors will try
 * the wizard with made-up data, so a journey must never reach the statistics.
 * Only a deliberate declaration promotes one into a repair record. Keeping the
 * two apart means no stats query has to remember to filter.
 */
@Entity("repair_journeys")
export class RepairJourney {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * Bearer secret allowing the outcome to be declared without an account.
   * `select: false` so it never leaves the service by accident — record ids are
   * publicly listable, this must not be.
   */
  @Index()
  @Column({ unique: true, select: false })
  declarationToken: string;

  @Column({ type: "timestamptz" })
  tokenExpiresAt: Date;

  @Column({ nullable: true })
  userId: string;

  /** The device model; deviceId is then its variant, when known. */
  @Column({ nullable: true, type: "int" })
  modelId: number;

  @Column({ nullable: true, type: "int" })
  deviceId: number;

  /** The owner's personal device, whose repair history this joins. */
  @Index("IDX_repair_journeys_ownershipId")
  @Column({ nullable: true, type: "uuid" })
  ownershipId: string;

  @Column({ nullable: true })
  brand: string;

  @Column({ nullable: true })
  modelType: string;

  @Column({ nullable: true })
  productCategory: string;

  @Column({ nullable: true })
  productCategoryId: string;

  @Column({ nullable: true, type: "text" })
  problem: string;

  /**
   * Symptom keys ticked in the wizard, not their translated labels, so the data
   * stays comparable across locales. A real Postgres array rather than the
   * comma-joined `simple-array` used elsewhere in the codebase: this column
   * exists to be aggregated, and joined text would make that a string search.
   */
  @Column({ nullable: true, type: "text", array: true })
  issues: string[];

  @Column({ nullable: true, enum: ProblemTag })
  problemTag: string;

  @Column({ nullable: true, enum: RepairRoute })
  repairRoute: string;

  @Column({ nullable: true, enum: IssueSeverity })
  issueSeverity: string;

  @Column({ nullable: true, enum: IssueDuration })
  issueDuration: string;

  @Column({ nullable: true, enum: VisualCondition })
  visualCondition: string;

  @Column({ nullable: true, enum: UsageIntensity })
  usageIntensity: string;

  @Column({ nullable: true, type: "float" })
  estimatedAge: number;

  @Column({ nullable: true })
  locale: string;

  @Column({ nullable: true })
  country: string;

  @Column({ default: JourneyStatus.Pending, enum: JourneyStatus })
  status: string;

  @Column({ nullable: true, type: "timestamptz" })
  declaredAt: Date;

  /**
   * CO2e the repair avoided, in kg, **frozen when the outcome was declared**.
   *
   * Deliberately stored rather than recomputed on each read. "Here is what you
   * avoided" is a statement about the past: recomputing it would let a user's
   * total change between two visits because a reference factor was revised or
   * a device's category corrected, and a total that moves on its own is not a
   * record. This is also exactly the figure the user was shown when they
   * answered.
   *
   * Null where the reference data covers nothing — large appliances, musical
   * instruments — and where the calculation was unavailable at that moment.
   * Consumers must skip nulls rather than count them as zero.
   */
  @Column({ nullable: true, type: "float" })
  co2Avoided: number;

  /** Which reference category the figure came from, and how many products its
   *  average rested on. Kept so a stored number stays explainable if the
   *  method changes. */
  @Column({ nullable: true })
  co2ReferenceCategory: string;

  @Column({ nullable: true, type: "int" })
  co2ReferenceProducts: number;

  /** The record this journey was promoted into, once declared. */
  @Column({ nullable: true, type: "uuid" })
  repairRecordId: string;

  @CreateDateColumn({ type: "timestamptz" })
  journeyDate: Date;
}
