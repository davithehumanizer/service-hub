import { RepairStatus } from './repair-status.enum';

/**
 * What a user can declare about a journey: a strict subset of `RepairStatus`,
 * built from its members so the two cannot drift apart.
 *
 * "Still in progress" is absent on purpose — it writes nothing, so it never
 * reaches the server; the browser just postpones its own reminder.
 *
 * `EndOfLife` is what the imported dataset already uses for a repair that did
 * not succeed, and what the failure-reason statistics are built on.
 */
export const JourneyOutcome = {
  Fixed: RepairStatus.Fixed,
  PartiallyFixed: RepairStatus.PartiallyFixed,
  EndOfLife: RepairStatus.EndOfLife,
} as const;

export type JourneyOutcome =
  (typeof JourneyOutcome)[keyof typeof JourneyOutcome];
