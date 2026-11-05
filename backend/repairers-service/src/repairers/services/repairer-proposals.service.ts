import { createHash } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Repairer } from '../repairer.entity';
import { RepairerDevice } from '../repairer-device.entity';
import { RepairerRevision } from '../repairer-revision.entity';
import { IRepairersService } from '../interfaces/repairers-service.interface';
import { RepairerSearchService } from '../../search/repairer-search.service';
import { PUBLISHED } from '../constants/repairer-status';
import {
  EDITABLE_FIELDS,
  REQUIRED_FIELDS,
  RepairerChanges,
  pickChanges,
} from '../types/repairer-changes';
import { Editor, mayEdit } from '../../types/author';

/** Shown as the source of a repairer proposed on the site. */
export const PROPOSAL_SOURCE = 'Service Hub';

/** The repairers a user proposed, each with its latest unapplied change. */
export type OwnRepairer = Repairer & { revision: RepairerRevision | null };

/** A proposal in the queue: the version its review names, and its author. */
export type QueuedProposal = Repairer & {
  version: string;
  created_by: number | null;
};

/** How many refused proposals, and changes, the queue keeps at hand. */
const REFUSED_SHOWN = 50;

/**
 * A proposal as an administrator saw it. Its author may still change it, so
 * a review names the version reviewed: another one is not the one approved.
 */
export const versionOf = (repairer: Repairer): string =>
  createHash('sha1')
    .update(
      JSON.stringify([
        ...EDITABLE_FIELDS.map((field) => repairer[field] ?? null),
        (repairer.repairerDevices ?? []).map((d) => d.device_type).sort(),
      ]),
    )
    .digest('hex')
    .slice(0, 16);

/**
 * Repairers proposed on the site and their authors' changes, both waiting
 * for an administrator before the public sees them (docs/demo-data.md, §4.3).
 */
@Injectable()
export class RepairerProposalsService {
  constructor(
    @InjectRepository(Repairer)
    private readonly repairerRepository: Repository<Repairer>,
    @InjectRepository(RepairerRevision)
    private readonly revisionRepository: Repository<RepairerRevision>,
    @Inject('IRepairersService')
    private readonly repairersService: IRepairersService,
    private readonly repairerSearchService: RepairerSearchService,
  ) {}

  async propose(data: Record<string, any>, editor: Editor): Promise<Repairer> {
    if (editor.created_by === null) {
      throw new Error('Only a signed-in user can propose a repairer');
    }
    const { device_types = [], ...fields } = pickChanges(data);
    const saved = await this.repairerRepository.save(
      this.repairerRepository.create({
        ...(fields as Partial<Repairer>),
        source: PROPOSAL_SOURCE,
        created_by: editor.created_by,
        is_demo: editor.is_demo,
        // An administrator's proposal needs no one else's approval.
        status: editor.admin ? PUBLISHED : 'pending',
        repairerDevices: device_types.map(
          (device_type) => ({ device_type }) as RepairerDevice,
        ),
      }),
    );
    if (saved.status === PUBLISHED) {
      await this.repairerSearchService.indexRepairer(saved);
    }
    return this.repairersService.findOne(saved.repairer_id, editor);
  }

  /**
   * Its author's change: made at once while nobody else sees the repairer,
   * kept for review once it is published. An administrator's, at once.
   */
  async change(
    id: string,
    data: Record<string, any>,
    editor: Editor,
  ): Promise<OwnRepairer> {
    const repairer = await this.ownedBy(id, editor);
    const changes = this.differences(repairer, pickChanges(data));
    const emptied = REQUIRED_FIELDS.find((field) => changes[field] === null);
    if (emptied) throw new Error(`${emptied} is required`);
    const changed = Object.keys(changes).length > 0;

    if (editor.admin || repairer.status !== PUBLISHED) {
      if (changed) {
        // Corrected after a refusal: back in the queue, the reason gone. Only
        // if still refused: published meanwhile, it would stay public as
        // pending, and a change to it waits for review like any other.
        if (repairer.status === 'rejected' && !editor.admin) {
          const { affected } = await this.repairerRepository.update(
            { repairer_id: id, status: 'rejected' },
            { status: 'pending', review_note: null },
          );
          if (!affected) {
            throw new Error('This proposal has changed since it was loaded');
          }
        }
        await this.apply(id, changes);
      }
    } else {
      // The public keeps the old version until an administrator applies it.
      // A new change replaces the one waiting; back to the published
      // version, there is nothing left to wait for.
      await this.revisionRepository.manager.transaction(async (manager) => {
        await manager.delete(RepairerRevision, {
          repairer_id: id,
          status: 'pending',
        });
        if (changed) {
          await manager.save(
            manager.create(RepairerRevision, {
              repairer_id: id,
              changes,
              created_by: editor.created_by as number,
            }),
          );
        }
      });
    }
    const waiting = await this.revisionRepository.findOne({
      where: { repairer_id: id, status: 'pending' },
    });
    return Object.assign(await this.repairersService.findOne(id, editor), {
      revision: waiting,
    });
  }

  /** Withdrawn by its author while unpublished; deleted by an administrator. */
  async withdraw(id: string, editor: Editor): Promise<{ message: string }> {
    const repairer = await this.ownedBy(id, editor);
    if (repairer.status === PUBLISHED && !editor.admin) {
      throw new Error('Only an administrator can remove a published repairer');
    }
    return this.repairersService.delete(id);
  }

  async mine(editor: Editor): Promise<OwnRepairer[]> {
    if (editor.created_by === null) return [];
    const repairers = await this.repairerRepository.find({
      where: { created_by: editor.created_by },
      relations: ['repairerDevices'],
      order: { created_at: 'DESC' },
    });
    const revisions = repairers.length
      ? await this.revisionRepository.find({
          where: { repairer_id: In(repairers.map((r) => r.repairer_id)) },
          order: { created_at: 'DESC' },
        })
      : [];
    // Its latest change unless applied: waiting, or refused with a reason.
    return repairers.map((repairer) => {
      const latest = revisions.find((r) => r.repairer_id === repairer.repairer_id);
      return Object.assign(repairer, {
        revision: latest && latest.status !== 'applied' ? latest : null,
      });
    });
  }

  /** Someone else's repairers, as an administrator sees them. */
  async ofAuthor(authorId: number): Promise<OwnRepairer[]> {
    return this.mine({ created_by: authorId, is_demo: false, admin: false });
  }

  /**
   * The administrators' queue, oldest first. Then the latest refusals,
   * newest first: a refusal made by mistake can still be taken back.
   */
  async pending(): Promise<{
    proposals: QueuedProposal[];
    revisions: RepairerRevision[];
    refused: { proposals: QueuedProposal[]; revisions: RepairerRevision[] };
  }> {
    const [proposals, revisions, refusedProposals, refusedRevisions] =
      await Promise.all([
        this.repairerRepository.find({
          where: { status: 'pending' },
          relations: ['repairerDevices'],
          order: { created_at: 'ASC' },
        }),
        this.revisionRepository.find({
          where: { status: 'pending' },
          relations: ['repairer', 'repairer.repairerDevices'],
          order: { created_at: 'ASC' },
        }),
        this.repairerRepository.find({
          where: { status: 'rejected' },
          relations: ['repairerDevices'],
          order: { reviewed_at: 'DESC' },
          take: REFUSED_SHOWN,
        }),
        // A change its author has replaced since is not offered again.
        this.revisionRepository
          .createQueryBuilder('revision')
          .leftJoinAndSelect('revision.repairer', 'repairer')
          .leftJoinAndSelect('repairer.repairerDevices', 'devices')
          .where(`revision.status = 'rejected'`)
          .andWhere(
            `NOT EXISTS (SELECT 1 FROM repairer_revisions newer
               WHERE newer.repairer_id = revision.repairer_id
                 AND newer.created_at > revision.created_at)`,
          )
          .orderBy('revision.reviewed_at', 'DESC')
          .take(REFUSED_SHOWN)
          .getMany(),
      ]);
    const queued = await this.queued([...proposals, ...refusedProposals]);
    return {
      proposals: queued.slice(0, proposals.length),
      revisions,
      refused: {
        proposals: queued.slice(proposals.length),
        revisions: refusedRevisions,
      },
    };
  }

  /** What waits for an administrator, for the menu. */
  async pendingCount(): Promise<number> {
    const [proposals, revisions] = await Promise.all([
      this.repairerRepository.count({ where: { status: 'pending' } }),
      this.revisionRepository.count({ where: { status: 'pending' } }),
    ]);
    return proposals + revisions;
  }

  /** Each proposal with its version and its author, a column reads hide. */
  private async queued(repairers: Repairer[]): Promise<QueuedProposal[]> {
    const rows: { repairer_id: string; created_by: number | null }[] =
      repairers.length
        ? await this.repairerRepository.query(
            `SELECT repairer_id, created_by FROM repairers
              WHERE repairer_id = ANY($1::uuid[])`,
            [repairers.map((r) => r.repairer_id)],
          )
        : [];
    const authors = new Map(rows.map((r) => [r.repairer_id, r.created_by]));
    return repairers.map((repairer) =>
      Object.assign(repairer, {
        version: versionOf(repairer),
        created_by: authors.get(repairer.repairer_id) ?? null,
      }),
    );
  }

  /**
   * Publishes or refuses a proposal; a refused one may still be published,
   * a refusal made by mistake. Comes back with its author, to be told.
   */
  async reviewProposal(
    id: string,
    decision: 'publish' | 'reject',
    note: string | null,
    reviewer: Editor,
    version: string,
  ): Promise<Repairer & { created_by: number | null }> {
    this.mustReview(reviewer);
    const repairer = await this.repairerRepository.findOne({
      where: { repairer_id: id },
      relations: ['repairerDevices'],
    });
    if (!repairer) throw new Error(`Repairer with id ${id} not found`);
    const undoing = decision === 'publish' && repairer.status === 'rejected';
    if (repairer.status !== 'pending' && !undoing) {
      throw new Error('This proposal has already been reviewed');
    }
    if (versionOf(repairer) !== version) {
      throw new Error('This proposal has changed since it was loaded');
    }
    const status = decision === 'publish' ? PUBLISHED : 'rejected';
    // Only if still as it was read: of two administrators, the first decides.
    const { affected } = await this.repairerRepository.update(
      { repairer_id: id, status: repairer.status },
      {
        status,
        review_note: status === 'rejected' ? note || null : null,
        reviewed_by: reviewer.created_by,
        reviewed_at: new Date(),
      },
    );
    if (!affected) throw new Error('This proposal has already been reviewed');
    const reviewed = await this.repairersService.findOne(id, reviewer);
    if (status === PUBLISHED) {
      await this.repairerSearchService.indexRepairer(reviewed);
    }
    return Object.assign(reviewed, {
      created_by: await this.repairersService.authorOf(id),
    });
  }

  /**
   * Applies or refuses a change; a refused one may still be applied while
   * its author has made none since. Comes back with its repairer's name.
   */
  async reviewRevision(
    id: string,
    decision: 'apply' | 'reject',
    note: string | null,
    reviewer: Editor,
  ): Promise<RepairerRevision> {
    this.mustReview(reviewer);
    const revision = await this.revisionRepository.findOne({ where: { id } });
    if (!revision) throw new Error(`Revision with id ${id} not found`);
    const undoing = decision === 'apply' && revision.status === 'rejected';
    if (revision.status !== 'pending' && !undoing) {
      throw new Error('This change has already been reviewed');
    }
    if (undoing) {
      // Compared in the database: a JS Date drops the microseconds it is
      // stored with, and the change would come out newer than itself.
      const [{ replaced }] = await this.revisionRepository.query(
        `SELECT EXISTS (
           SELECT 1 FROM repairer_revisions newer
             JOIN repairer_revisions own ON own.id = $1
            WHERE newer.repairer_id = own.repairer_id
              AND newer.created_at > own.created_at) AS replaced`,
        [id],
      );
      if (replaced) throw new Error('This change has been replaced since');
    }
    // Claimed while still as it was read, so that it is applied once.
    const { affected } = await this.revisionRepository.update(
      { id, status: revision.status },
      {
        status: decision === 'apply' ? 'applied' : 'rejected',
        review_note: decision === 'reject' ? note || null : null,
        reviewed_by: reviewer.created_by,
        reviewed_at: new Date(),
      },
    );
    if (!affected) throw new Error('This change has already been reviewed');
    if (decision === 'apply') {
      try {
        await this.apply(revision.repairer_id, revision.changes);
      } catch (error) {
        // Back as it was: in the queue, or refused.
        await this.revisionRepository.update(id, {
          status: revision.status,
          review_note: revision.review_note,
          reviewed_at: revision.reviewed_at,
          ...(revision.status === 'pending' && { reviewed_by: null }),
        });
        throw error;
      }
    }
    return (await this.revisionRepository.findOne({
      where: { id },
      relations: ['repairer'],
    })) as RepairerRevision;
  }

  private mustReview(reviewer: Editor): void {
    if (!reviewer.admin) {
      throw new Error('Only an administrator can review a proposal');
    }
  }

  /** The repairer with its author, if this editor may change it. */
  private async ownedBy(id: string, editor: Editor): Promise<Repairer> {
    const repairer = await this.repairersService.findOne(id, editor);
    if (!mayEdit(editor, await this.repairersService.authorOf(id))) {
      throw new Error(
        'Only its author or an administrator can change this repairer',
      );
    }
    return repairer;
  }

  private async apply(
    id: string,
    changes: RepairerChanges,
    extra: Partial<Repairer> = {},
  ): Promise<void> {
    const { device_types, ...fields } = changes;
    await this.repairersService.update(id, {
      ...(fields as Partial<Repairer>),
      ...extra,
      ...(device_types && {
        repairerDevices: device_types.map(
          (device_type) => ({ device_type }) as RepairerDevice,
        ),
      }),
    });
  }

  /** What actually changes: a change of nothing is not one to review. */
  private differences(
    repairer: Repairer,
    changes: RepairerChanges,
  ): RepairerChanges {
    const result: RepairerChanges = {};
    for (const field of EDITABLE_FIELDS) {
      const next = changes[field];
      if (next === undefined) continue;
      const current = (repairer[field] as string | number | null) ?? null;
      // The decimal columns come back as strings.
      const same =
        field === 'latitude' || field === 'longitude'
          ? (current === null) === (next === null) &&
            Number(current) === Number(next)
          : current === next;
      if (!same) result[field] = next;
    }
    if (changes.device_types) {
      const types = (list: string[]) => [...list].sort().join();
      const current = (repairer.repairerDevices ?? []).map((d) => d.device_type);
      if (types(current) !== types(changes.device_types)) {
        result.device_types = changes.device_types;
      }
    }
    return result;
  }
}
