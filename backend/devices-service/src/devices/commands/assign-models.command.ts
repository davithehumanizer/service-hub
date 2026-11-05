import { Command, Option } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../../entity/device.entity';
import { NormalizedModel } from '../../device-models/normalize-model';
import { Placement } from '../../device-models/place-model';
import { ModelAssignmentService } from '../../device-models/model-assignment.service';
import { VariantLabelService } from '../../device-models/variant-label.service';

/**
 * Assigns catalogue entries to their device models, creating the models.
 * Re-runnable: by default only entries without a model are taken, each batch
 * in its own transaction, so an interrupted run resumes where it stopped.
 * The dry run is scripts/device-models-report.ts, over an export.
 * It then copies each variant's model onto what points to it in other
 * services' tables, in the database they share.
 */
const BATCH_SIZE = 1000;

@Injectable()
export class AssignModelsCommand {
  constructor(
    private readonly assignment: ModelAssignmentService,
    private readonly labels: VariantLabelService,
    @InjectRepository(Device) private readonly devices: Repository<Device>,
  ) {}

  @Command({
    command: 'models:assign',
    describe: 'Assign catalogue entries to their device models',
  })
  async assign(
    @Option({
      name: 'all',
      describe: 'Reassign every entry, not only those without a model',
      type: 'boolean',
      default: false,
    })
    all: boolean,
  ) {
    const started = Date.now();
    // Right after the migration, the statistics do not know model_id: the
    // planner then reads its whole index for each batch (1.2 s, not 60 ms).
    await this.devices.manager.query('ANALYZE devices');
    const rules = await this.assignment.rules();
    const resellers = rules.resellerBrands;
    const unassigned = all ? '' : 'AND d.model_id IS NULL';
    const counts = new Map<Placement, number>();
    const tally = (p: Placement) => counts.set(p, (counts.get(p) ?? 0) + 1);
    // The models this run linked entries to: their variants' labels change.
    const touched = new Set<number>();

    // Manufacturers' entries first: they make the models resellers join.
    let cursor = 0;
    let done = 0;
    for (;;) {
      const batch = await this.assignment.entries(
        `d.device_id > $1 AND lower(trim(d.brand)) <> ALL($2::text[]) ${unassigned}
         ORDER BY d.device_id LIMIT $3`,
        [cursor, resellers, BATCH_SIZE],
      );
      if (batch.length === 0) break;
      cursor = batch[batch.length - 1].device_id;
      const linked = await this.assignment.assign(
        batch,
        await this.assignment.normalize(batch, rules),
        tally,
      );
      linked.forEach((id) => touched.add(id));
      done += batch.length;
      if ((done / BATCH_SIZE) % 50 === 0) {
        console.log(`  ${done} manufacturer entries…`);
      }
    }
    console.log(`Manufacturer entries: ${done}`);

    // Resellers' entries: clean names first, so that a cut one can join the
    // model a clean one makes.
    const resold = await this.assignment.entries(
      `lower(trim(d.brand)) = ANY($1::text[]) ${unassigned} ORDER BY d.device_id`,
      [resellers],
    );
    const normalized = await this.assignment.normalize(resold, rules);
    const order = resold
      .map((_, i) => i)
      .sort(
        (a, b) => Number(isCut(normalized[a])) - Number(isCut(normalized[b])),
      );
    for (let at = 0; at < order.length; at += BATCH_SIZE) {
      const slice = order.slice(at, at + BATCH_SIZE);
      const linked = await this.assignment.assign(
        slice.map((i) => resold[i]),
        slice.map((i) => normalized[i]),
        tally,
      );
      linked.forEach((id) => touched.add(id));
    }
    console.log(`Reseller entries: ${resold.length}`);

    // Before the refresh, which keeps only the empty models still named.
    const copied = await this.assignment.copyModelIds();
    await this.devices.manager.query('ANALYZE devices, device_models');
    await this.assignment.refreshModels(rules);
    // Variants labelled before their parts were kept: all of them once,
    // after the migration that adds them, new entries' ones afterwards.
    const unparted: { model_id: number }[] = await this.devices.manager.query(
      `SELECT DISTINCT model_id FROM devices
        WHERE model_id IS NOT NULL AND variant_parts IS NULL`,
    );
    unparted.forEach(({ model_id }) => touched.add(model_id));
    const relabelled = await this.labels.labelModels([...touched]);
    const [{ models, empty }] = await this.devices.manager.query(
      `SELECT count(*)::int AS models, count(*) FILTER (WHERE variant_count = 0)::int AS empty FROM device_models`,
    );
    console.log(
      `Placements: ${[...counts.entries()].map(([p, n]) => `${p} ${n}`).join(', ')}`,
    );
    console.log(`Models: ${models}, of which without variant: ${empty}`);
    console.log(
      `Variant labels changed: ${relabelled}, over ${touched.size} models`,
    );
    console.log(
      `Model ids copied: ${Object.entries(copied)
        .map(([table, n]) => `${table} ${n}`)
        .join(', ')}`,
    );
    console.log(`Done in ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }
}

const isCut = (n: NormalizedModel) =>
  n.fromReseller && (n.cutAtConfiguration || n.makerUnknown);
