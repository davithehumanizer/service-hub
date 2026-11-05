import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Device } from '../entity/device.entity';
import { ModelAssignmentService } from '../device-models/model-assignment.service';
import { VariantLabelService } from '../device-models/variant-label.service';
import { ModelIndexService } from '../device-models/model-index.service';
import { DeviceSearchService } from '../search/device-search.service';

/** What the purge removes, or would: how many of each. */
export interface DemoCatalogueReport {
  variants: number;
  models: number;
  /** Demo models a real variant joined: they stay, as real ones. */
  adoptedModels: number;
  photos: number;
  /** Real models that lose demo variants or photos: recomputed. */
  touchedModels: number;
  ownerships: number;
  /** Of those, a real user's: strict contagion. */
  realOwnerships: number;
  journeys: number;
  /** Of those, a real user's or a guest's. */
  realJourneys: number;
  records: number;
  /** Of those, submitted by a real user or a guest. */
  realRecords: number;
  subscriptions: number;
}

interface Targets {
  variants: number[];
  doomedModels: number[];
  adoptedModels: number[];
  touchedModels: number[];
  ownerships: string[];
  journeys: string[];
  records: string[];
  subscriptions: string[];
  photos: { id: string; key: string; model: boolean }[];
  report: DemoCatalogueReport;
}

const idsOf = (rows: { id: number | string }[]) => rows.map((r) => r.id);

/**
 * Removes the demonstration data of the catalogue, and everything that
 * names it, real users' included (docs/demo-data.md, §4.4). The tables of
 * ownerships, journeys, records and subscriptions are other services', in
 * the same database: one transaction removes them all, or none.
 */
@Injectable()
export class DemoDataService {
  private readonly logger = new Logger(DemoDataService.name);

  constructor(
    @InjectRepository(Device) private readonly devices: Repository<Device>,
    private readonly assignment: ModelAssignmentService,
    private readonly labels: VariantLabelService,
    private readonly modelIndex: ModelIndexService,
    private readonly deviceSearch: DeviceSearchService,
  ) {}

  /**
   * What would go, or, unless `dryRun`, removes it. The photos' files are
   * the gateway's to delete: their keys come back.
   */
  async purge(
    contributorIds: number[],
    contributorEmails: string[],
    dryRun: boolean,
  ): Promise<{ report: DemoCatalogueReport; photoKeys: string[] }> {
    const rules = dryRun ? null : await this.assignment.rules();
    const targets = await this.devices.manager.transaction(async (m) => {
      const t = await this.targets(m, contributorIds, contributorEmails);
      if (!dryRun) await this.remove(m, t, rules!);
      return t;
    });
    if (dryRun) return { report: targets.report, photoKeys: [] };

    // Once committed, the rows are gone for good: whatever follows, the keys
    // of the files must reach the gateway, a second run having none to give.
    try {
      await this.labels.labelModels(targets.touchedModels);
      await this.modelIndex.reindex([
        ...targets.touchedModels,
        ...targets.doomedModels,
      ]);
      for (const id of targets.variants) {
        await this.deviceSearch.removeDevice(String(id));
      }
    } catch (e) {
      this.logger.error(
        `Demo data purged, but labels or indexes not updated for models ` +
          `${targets.touchedModels.join(', ')}: ${(e as Error).message}`,
      );
    }
    return {
      report: targets.report,
      photoKeys: targets.photos.map((p) => p.key),
    };
  }

  /**
   * One contributor's share of what the purge would remove: the same
   * definitions, for what that account entered.
   */
  async statsOf(contributorId: number, email: string): Promise<DemoCatalogueReport> {
    return (await this.targets(this.devices.manager, [contributorId], [email], contributorId)).report;
  }

  /** Everything demo, or, given an `author`, what that account entered. */
  private async targets(
    m: EntityManager,
    contributorIds: number[],
    contributorEmails: string[],
    author: number | null = null,
  ): Promise<Targets> {
    const users = contributorIds;
    // Journeys and records keep a user id as text.
    const usersText = contributorIds.map(String);

    const variants: number[] = idsOf(
      await m.query(
        `SELECT device_id AS id FROM devices
          WHERE is_demo AND ($1::int IS NULL OR created_by = $1)`,
        [author],
      ),
    ) as number[];
    // A demo model a real variant joined is no longer demo (decision 9 of
    // the models' redesign): it stays.
    const doomedModels = idsOf(
      await m.query(
        `SELECT m.id FROM device_models m
          WHERE m.is_demo AND ($1::int IS NULL OR m.created_by = $1)
            AND NOT EXISTS (SELECT 1 FROM devices d WHERE d.model_id = m.id AND NOT d.is_demo)`,
        [author],
      ),
    ) as number[];
    const adoptedModels = idsOf(
      await m.query(
        `SELECT m.id FROM device_models m
          WHERE m.is_demo AND ($1::int IS NULL OR m.created_by = $1)
            AND EXISTS (SELECT 1 FROM devices d WHERE d.model_id = m.id AND NOT d.is_demo)`,
        [author],
      ),
    ) as number[];
    const touchedModels = idsOf(
      await m.query(
        `SELECT DISTINCT x.id FROM (
           SELECT d.model_id AS id FROM devices d
            WHERE d.is_demo AND ($3::int IS NULL OR d.created_by = $3)
           UNION SELECT d.model_id FROM device_photos p
                   JOIN devices d ON d.device_id = p.device_id
            WHERE p.is_demo AND ($3::int IS NULL OR p.created_by = $3)
           UNION SELECT p.model_id FROM device_model_photos p
            WHERE p.is_demo AND ($3::int IS NULL OR p.created_by = $3)
           UNION SELECT unnest($2::int[])
         ) x
         WHERE x.id IS NOT NULL AND x.id <> ALL($1::int[])`,
        [doomedModels, adoptedModels, author],
      ),
    ) as number[];

    const ownershipRows: { id: string; userId: number }[] = await m.query(
      `SELECT id::text AS id, "userId" FROM ownerships
        WHERE "userId" = ANY($1::int[]) OR "deviceId" = ANY($2::int[])
           OR "modelId" = ANY($3::int[])`,
      [users, variants, doomedModels],
    );
    const ownerships = ownershipRows.map((o) => o.id);
    const journeyRows: { id: string; userId: string | null; record: string | null }[] =
      await m.query(
        `SELECT id::text AS id, "userId", "repairRecordId"::text AS record
           FROM repair_journeys
          WHERE "userId" = ANY($1::text[]) OR "deviceId" = ANY($2::int[])
             OR "modelId" = ANY($3::int[]) OR "ownershipId" = ANY($4::uuid[])`,
        [usersText, variants, doomedModels, ownerships],
      );
    const recordRows: { id: string; submittedBy: string | null }[] = await m.query(
      `SELECT id::text AS id, "submittedByUserId" AS "submittedBy" FROM repair_records
        WHERE "submittedByUserId" = ANY($1::text[]) OR id = ANY($2::uuid[])`,
      [
        usersText,
        journeyRows.map((j) => j.record).filter((r): r is string => !!r),
      ],
    );
    const records = recordRows.map((r) => r.id);
    // deviceId is free text there: only a number names a variant. userId is
    // never set: a contributor's own subscriptions are known by their email.
    const subscriptions = idsOf(
      await m.query(
        `SELECT id::text AS id FROM tutorial_subscriptions
          WHERE "modelId" = ANY($1::int[])
             OR CASE WHEN "deviceId" ~ '^[0-9]{1,9}$' THEN "deviceId"::int END = ANY($2::int[])
             OR lower(email) = ANY($3::text[])`,
        [doomedModels, variants, contributorEmails.map((e) => e.toLowerCase())],
      ),
    ) as string[];
    const photos: { id: string; key: string; model: boolean }[] = await m.query(
      `SELECT id::text AS id, key, false AS model FROM device_photos
        WHERE (is_demo AND ($3::int IS NULL OR created_by = $3)) OR device_id = ANY($1::int[])
       UNION ALL
       SELECT id::text, key, true FROM device_model_photos
        WHERE (is_demo AND ($3::int IS NULL OR created_by = $3)) OR model_id = ANY($2::int[])`,
      [variants, doomedModels, author],
    );

    const contributor = new Set(usersText);
    return {
      variants,
      doomedModels,
      adoptedModels,
      touchedModels,
      ownerships,
      journeys: journeyRows.map((j) => j.id),
      records,
      subscriptions,
      photos,
      report: {
        variants: variants.length,
        models: doomedModels.length,
        adoptedModels: adoptedModels.length,
        photos: photos.length,
        touchedModels: touchedModels.length,
        ownerships: ownerships.length,
        realOwnerships: ownershipRows.filter((o) => !contributor.has(String(o.userId))).length,
        journeys: journeyRows.length,
        realJourneys: journeyRows.filter((j) => !j.userId || !contributor.has(j.userId)).length,
        records: records.length,
        realRecords: recordRows.filter((r) => !r.submittedBy || !contributor.has(r.submittedBy)).length,
        subscriptions: subscriptions.length,
      },
    };
  }

  /** In the order of docs/demo-data.md §4.4: what names a row goes first. */
  private async remove(
    m: EntityManager,
    t: Targets,
    rules: Awaited<ReturnType<ModelAssignmentService['rules']>>,
  ): Promise<void> {
    await m.query(`DELETE FROM repair_records WHERE id = ANY($1::uuid[])`, [t.records]);
    await m.query(`DELETE FROM repair_journeys WHERE id = ANY($1::uuid[])`, [t.journeys]);
    await m.query(`DELETE FROM tutorial_subscriptions WHERE id = ANY($1::uuid[])`, [
      t.subscriptions,
    ]);
    await m.query(`DELETE FROM ownerships WHERE id = ANY($1::uuid[])`, [t.ownerships]);
    // A model created by hand keeps its categories through refreshModels,
    // and rightly: a variant added to it takes the model's, never brings one.
    // The photos whose keys were read: one added since would lose its row
    // and keep its file.
    await m.query(`DELETE FROM device_photos WHERE id::text = ANY($1::text[])`, [
      t.photos.filter((p) => !p.model).map((p) => p.id),
    ]);
    await m.query(`DELETE FROM device_model_photos WHERE id::text = ANY($1::text[])`, [
      t.photos.filter((p) => p.model).map((p) => p.id),
    ]);
    // Their properties and category links follow by cascade.
    await m.query(`DELETE FROM devices WHERE device_id = ANY($1::int[])`, [t.variants]);
    // Unless a real variant joined it meanwhile: SET NULL would orphan it.
    await m.query(
      `DELETE FROM device_models m WHERE m.id = ANY($1::int[])
          AND NOT EXISTS (SELECT 1 FROM devices d WHERE d.model_id = m.id AND NOT d.is_demo)`,
      [t.doomedModels],
    );
    await m.query(`UPDATE device_models SET is_demo = false WHERE id = ANY($1::int[])`, [
      t.adoptedModels,
    ]);
    await this.assignment.refreshModels(rules, t.touchedModels, m);
  }
}
