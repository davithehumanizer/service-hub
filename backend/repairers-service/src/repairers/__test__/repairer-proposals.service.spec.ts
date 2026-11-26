import { RepairerProposalsService, PROPOSAL_SOURCE, versionOf } from '../services/repairer-proposals.service';
import { Repairer } from '../repairer.entity';
import { Editor } from '../../types/author';

const AUTHOR: Editor = { created_by: 7, is_demo: false, admin: false };
const CONTRIBUTOR: Editor = { created_by: 9, is_demo: true, admin: false };
const STRANGER: Editor = { created_by: 8, is_demo: false, admin: false };
const ADMIN: Editor = { created_by: 1, is_demo: false, admin: true };

const PROPOSAL = {
  name: 'Repair Café Fives',
  address: '18 rue Pierre Legrand',
  city: 'Lille',
  country: 'FR',
  latitude: 50.6292,
  longitude: 3.0573,
  partner_type: 'repairer',
  device_types: ['laptop', 'laptop', 'toaster'],
};

/** As the database hands it back: coordinates as strings. */
const stored = (overrides: Partial<Repairer> = {}): Repairer =>
  ({
    repairer_id: 'r1',
    ...PROPOSAL,
    latitude: '50.629200',
    longitude: '3.057300',
    description: null,
    postal_code: null,
    website: null,
    email: null,
    phone: null,
    status: 'published',
    repairerDevices: [{ device_type: 'toaster' }, { device_type: 'laptop' }],
    ...overrides,
  }) as unknown as Repairer;

describe('RepairerProposalsService', () => {
  let service: RepairerProposalsService;
  let repairers: any;
  let revisions: any;
  let repairersService: any;
  let search: any;
  let tx: any;
  let refusedChanges: jest.Mock;

  beforeEach(() => {
    repairers = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ repairer_id: 'r1', ...data })),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(async () => ({ affected: 1 })),
      count: jest.fn(async () => 0),
      query: jest.fn(async () => []),
    };
    tx = { delete: jest.fn(), create: jest.fn((_entity, data) => data), save: jest.fn() };
    revisions = {
      create: jest.fn((data) => data),
      save: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(async () => null),
      update: jest.fn(async () => ({ affected: 1 })),
      count: jest.fn(async () => 0),
      query: jest.fn(async () => [{ replaced: false }]),
      manager: { transaction: jest.fn(async (work) => work(tx)) },
    };
    refusedChanges = jest.fn(async () => []);
    const builder: any = {
      leftJoinAndSelect: () => builder,
      where: () => builder,
      andWhere: () => builder,
      orderBy: () => builder,
      take: () => builder,
      getMany: refusedChanges,
    };
    revisions.createQueryBuilder = jest.fn(() => builder);
    repairersService = {
      findOne: jest.fn(async () => stored()),
      authorOf: jest.fn(async () => AUTHOR.created_by),
      update: jest.fn(),
      delete: jest.fn(async () => ({ message: 'Repairer deleted' })),
    };
    search = { indexRepairer: jest.fn() };
    service = new RepairerProposalsService(repairers, revisions, repairersService, search);
  });

  describe('propose', () => {
    it('waits for an administrator, marked with its author', async () => {
      await service.propose({ ...PROPOSAL, status: 'published', created_by: 1, source: 'X' }, CONTRIBUTOR);

      const saved = repairers.save.mock.calls[0][0];
      expect(saved).toMatchObject({
        name: PROPOSAL.name,
        status: 'pending',
        created_by: 9,
        is_demo: true,
        source: PROPOSAL_SOURCE,
        // Each type once.
        repairerDevices: [{ device_type: 'laptop' }, { device_type: 'toaster' }],
      });
      // Not shown anywhere, so not searchable either.
      expect(search.indexRepairer).not.toHaveBeenCalled();
    });

    it("publishes an administrator's at once", async () => {
      await service.propose(PROPOSAL, ADMIN);
      expect(repairers.save.mock.calls[0][0].status).toBe('published');
      expect(search.indexRepairer).toHaveBeenCalled();
    });

    it('refuses someone not signed in', async () => {
      await expect(
        service.propose(PROPOSAL, { created_by: null, is_demo: false, admin: false }),
      ).rejects.toThrow('Only a signed-in user can propose a repairer');
    });
  });

  describe('change', () => {
    it('refuses someone who is neither its author nor an administrator', async () => {
      await expect(service.change('r1', { city: 'Roubaix' }, STRANGER)).rejects.toThrow(
        'Only its author or an administrator can change this repairer',
      );
      expect(repairersService.update).not.toHaveBeenCalled();
    });

    it('keeps a published repairer as it is, and its change for review', async () => {
      await service.change('r1', { ...PROPOSAL, city: 'Roubaix' }, AUTHOR);

      expect(repairersService.update).not.toHaveBeenCalled();
      // A new change replaces the one waiting, in one transaction.
      expect(tx.delete).toHaveBeenCalledWith(expect.anything(), { repairer_id: 'r1', status: 'pending' });
      // Only what differs: the same coordinates as strings, the same types in
      // another order, are no change.
      expect(tx.save).toHaveBeenCalledWith({
        repairer_id: 'r1',
        changes: { city: 'Roubaix' },
        created_by: 7,
      });
    });

    it('cancels the waiting change when its author goes back to what is published', async () => {
      revisions.findOne.mockResolvedValue(null);
      const result = await service.change('r1', PROPOSAL, AUTHOR);

      expect(tx.delete).toHaveBeenCalledWith(expect.anything(), { repairer_id: 'r1', status: 'pending' });
      expect(tx.save).not.toHaveBeenCalled();
      expect(repairersService.update).not.toHaveBeenCalled();
      // The form says whether anything still waits.
      expect(result.revision).toBeNull();
    });

    it('changes an unpublished proposal at once', async () => {
      repairersService.findOne.mockResolvedValue(stored({ status: 'pending' }));
      await service.change('r1', { city: 'Roubaix', device_types: ['printer'] }, AUTHOR);

      expect(repairersService.update).toHaveBeenCalledWith('r1', {
        city: 'Roubaix',
        repairerDevices: [{ device_type: 'printer' }],
      });
      expect(tx.save).not.toHaveBeenCalled();
    });

    it('sends a refused proposal back for review, its reason gone', async () => {
      repairersService.findOne.mockResolvedValue(stored({ status: 'rejected', review_note: 'Closed' }));
      await service.change('r1', { name: 'Atelier' }, AUTHOR);

      expect(repairers.update).toHaveBeenCalledWith(
        { repairer_id: 'r1', status: 'rejected' },
        { status: 'pending', review_note: null },
      );
      expect(repairersService.update).toHaveBeenCalledWith('r1', { name: 'Atelier' });
    });

    it('leaves a refused proposal published meanwhile to the review of changes', async () => {
      repairersService.findOne.mockResolvedValue(stored({ status: 'rejected' }));
      // An administrator published it anyway between the read and the write.
      repairers.update.mockResolvedValueOnce({ affected: 0 });
      await expect(service.change('r1', { name: 'Atelier' }, AUTHOR)).rejects.toThrow(
        'This proposal has changed since it was loaded',
      );
      expect(repairersService.update).not.toHaveBeenCalled();
    });

    it("applies an administrator's change at once", async () => {
      await service.change('r1', { phone: '0320000000' }, ADMIN);
      expect(repairersService.update).toHaveBeenCalledWith('r1', { phone: '0320000000' });
      expect(tx.save).not.toHaveBeenCalled();
    });

    it('refuses to empty a field a repairer cannot be without', async () => {
      await expect(service.change('r1', { city: '' }, AUTHOR)).rejects.toThrow('city is required');
    });
  });

  describe('withdraw', () => {
    it('lets its author withdraw it while unpublished', async () => {
      repairersService.findOne.mockResolvedValue(stored({ status: 'pending' }));
      await service.withdraw('r1', AUTHOR);
      expect(repairersService.delete).toHaveBeenCalledWith('r1');
    });

    it('leaves a published one to the administrators', async () => {
      await expect(service.withdraw('r1', AUTHOR)).rejects.toThrow(
        'Only an administrator can remove a published repairer',
      );
      await service.withdraw('r1', ADMIN);
      expect(repairersService.delete).toHaveBeenCalledWith('r1');
    });
  });

  describe('ofAuthor', () => {
    it("reads someone's repairers as their own page does", async () => {
      repairers.find.mockResolvedValue([]);
      await service.ofAuthor(9);
      expect(repairers.find).toHaveBeenCalledWith(expect.objectContaining({ where: { created_by: 9 } }));
    });
  });

  describe('mine', () => {
    it('is nothing for someone not signed in', async () => {
      await expect(service.mine({ created_by: null, is_demo: false, admin: false })).resolves.toEqual([]);
      expect(repairers.find).not.toHaveBeenCalled();
    });

    it('carries the latest change unless applied', async () => {
      repairers.find.mockResolvedValue([stored(), stored({ repairer_id: 'r2' }), stored({ repairer_id: 'r3' })]);
      revisions.find.mockResolvedValue([
        { repairer_id: 'r1', status: 'rejected', review_note: 'No' },
        { repairer_id: 'r1', status: 'applied' },
        { repairer_id: 'r2', status: 'applied' },
      ]);

      const mine = await service.mine(AUTHOR);

      expect(repairers.find.mock.calls[0][0].where).toEqual({ created_by: 7 });
      expect(mine.map((r) => r.revision?.status ?? null)).toEqual(['rejected', null, null]);
    });
  });

  describe('reviewProposal', () => {
    const seen = versionOf(stored({ status: 'pending' }));
    beforeEach(() => repairers.findOne.mockResolvedValue(stored({ status: 'pending' })));

    it('gives each proposal in the queue the version its review names', async () => {
      repairers.find.mockResolvedValue([stored({ status: 'pending' })]);
      revisions.find.mockResolvedValue([]);
      const { proposals } = await service.pending();
      expect((proposals[0] as any).version).toBe(seen);
    });

    it('names the author of each proposal, and keeps the latest refusals apart', async () => {
      repairers.find
        .mockResolvedValueOnce([stored({ repairer_id: 'r1', status: 'pending' })])
        .mockResolvedValueOnce([stored({ repairer_id: 'r2', status: 'rejected' })]);
      revisions.find.mockResolvedValue([{ id: 'v1' }]);
      refusedChanges.mockResolvedValue([{ id: 'v2', status: 'rejected' }]);
      repairers.query.mockResolvedValue([
        { repairer_id: 'r1', created_by: 9 },
        { repairer_id: 'r2', created_by: 7 },
      ]);

      const queue = await service.pending();

      expect(queue.proposals.map((p) => [p.repairer_id, p.created_by])).toEqual([['r1', 9]]);
      expect(queue.revisions).toEqual([{ id: 'v1' }]);
      expect(queue.refused.proposals.map((p) => [p.repairer_id, p.created_by, p.version])).toEqual([
        ['r2', 7, versionOf(stored({ status: 'rejected' }))],
      ]);
      expect(queue.refused.revisions).toEqual([{ id: 'v2', status: 'rejected' }]);
      expect(repairers.query.mock.calls[0][1]).toEqual([['r1', 'r2']]);
    });

    it('asks for no author when the queue is empty', async () => {
      repairers.find.mockResolvedValue([]);
      revisions.find.mockResolvedValue([]);
      expect(await service.pending()).toEqual({
        proposals: [],
        revisions: [],
        refused: { proposals: [], revisions: [] },
      });
      expect(repairers.query).not.toHaveBeenCalled();
    });

    it('counts what waits, proposals and changes', async () => {
      repairers.count.mockResolvedValue(3);
      revisions.count.mockResolvedValue(2);
      expect(await service.pendingCount()).toBe(5);
      expect(repairers.count).toHaveBeenCalledWith({ where: { status: 'pending' } });
    });

    it('gives back the author it publishes for, to be told', async () => {
      repairersService.authorOf.mockResolvedValue(9);
      const reviewed = await service.reviewProposal('r1', 'publish', null, ADMIN, seen);
      expect(reviewed.created_by).toBe(9);
    });

    it('publishes a proposal refused by mistake, its reason gone', async () => {
      repairers.findOne.mockResolvedValue(stored({ status: 'rejected' }));
      await service.reviewProposal('r1', 'publish', null, ADMIN, versionOf(stored({ status: 'rejected' })));
      expect(repairers.update).toHaveBeenCalledWith(
        { repairer_id: 'r1', status: 'rejected' },
        expect.objectContaining({ status: 'published', review_note: null }),
      );
      expect(search.indexRepairer).toHaveBeenCalled();
    });

    it('does not refuse a refused proposal again', async () => {
      repairers.findOne.mockResolvedValue(stored({ status: 'rejected' }));
      await expect(service.reviewProposal('r1', 'reject', null, ADMIN, seen)).rejects.toThrow(
        'This proposal has already been reviewed',
      );
    });

    it('is for administrators only', async () => {
      await expect(service.reviewProposal('r1', 'publish', null, AUTHOR, seen)).rejects.toThrow(
        'Only an administrator can review a proposal',
      );
    });

    it('publishes, and makes it searchable', async () => {
      await service.reviewProposal('r1', 'publish', 'ignored', ADMIN, seen);
      expect(repairers.update).toHaveBeenCalledWith(
        { repairer_id: 'r1', status: 'pending' },
        expect.objectContaining({ status: 'published', review_note: null, reviewed_by: 1 }),
      );
      expect(search.indexRepairer).toHaveBeenCalled();
    });

    it('refuses, with the reason for its author', async () => {
      await service.reviewProposal('r1', 'reject', 'Closed for good', ADMIN, seen);
      expect(repairers.update).toHaveBeenCalledWith(
        { repairer_id: 'r1', status: 'pending' },
        expect.objectContaining({ status: 'rejected', review_note: 'Closed for good' }),
      );
      expect(search.indexRepairer).not.toHaveBeenCalled();
    });

    it('refuses to publish a version its author changed since it was seen', async () => {
      repairers.findOne.mockResolvedValue(stored({ status: 'pending', website: 'https://spam.example' }));
      await expect(service.reviewProposal('r1', 'publish', null, ADMIN, seen)).rejects.toThrow(
        'This proposal has changed since it was loaded',
      );
      expect(repairers.update).not.toHaveBeenCalled();
      expect(search.indexRepairer).not.toHaveBeenCalled();
    });

    it('lets the first of two administrators decide', async () => {
      repairers.update.mockResolvedValue({ affected: 0 });
      await expect(service.reviewProposal('r1', 'reject', null, ADMIN, seen)).rejects.toThrow(
        'This proposal has already been reviewed',
      );
      expect(search.indexRepairer).not.toHaveBeenCalled();
    });

    it('reviews a proposal once', async () => {
      repairers.findOne.mockResolvedValue(stored());
      await expect(service.reviewProposal('r1', 'publish', null, ADMIN, seen)).rejects.toThrow(
        'This proposal has already been reviewed',
      );
      repairers.findOne.mockResolvedValue(null);
      await expect(service.reviewProposal('r9', 'publish', null, ADMIN, seen)).rejects.toThrow('not found');
    });
  });

  describe('reviewRevision', () => {
    const waiting = { id: 'v1', repairer_id: 'r1', status: 'pending', changes: { city: 'Roubaix', device_types: ['printer'] } };

    it('applies the change', async () => {
      revisions.findOne.mockResolvedValue(waiting);
      await service.reviewRevision('v1', 'apply', null, ADMIN);

      expect(repairersService.update).toHaveBeenCalledWith('r1', {
        city: 'Roubaix',
        repairerDevices: [{ device_type: 'printer' }],
      });
      expect(revisions.update).toHaveBeenCalledWith(
        { id: 'v1', status: 'pending' },
        expect.objectContaining({ status: 'applied' }),
      );
    });

    it('applies it once, though two administrators click', async () => {
      revisions.findOne.mockResolvedValue(waiting);
      revisions.update.mockResolvedValueOnce({ affected: 0 });
      await expect(service.reviewRevision('v1', 'apply', null, ADMIN)).rejects.toThrow(
        'This change has already been reviewed',
      );
      expect(repairersService.update).not.toHaveBeenCalled();
    });

    it('puts it back in the queue when it cannot be applied', async () => {
      revisions.findOne.mockResolvedValue(waiting);
      repairersService.update.mockRejectedValue(new Error('connection reset'));
      await expect(service.reviewRevision('v1', 'apply', null, ADMIN)).rejects.toThrow('connection reset');
      expect(revisions.update).toHaveBeenLastCalledWith('v1', expect.objectContaining({ status: 'pending' }));
    });

    it('refuses it, the repairer unchanged', async () => {
      revisions.findOne.mockResolvedValue(waiting);
      await service.reviewRevision('v1', 'reject', 'Wrong address', ADMIN);

      expect(repairersService.update).not.toHaveBeenCalled();
      expect(revisions.update).toHaveBeenCalledWith(
        { id: 'v1', status: 'pending' },
        expect.objectContaining({ status: 'rejected', review_note: 'Wrong address' }),
      );
    });

    it('applies a change refused by mistake while its author made none since', async () => {
      const refused = { ...waiting, status: 'rejected', review_note: 'No', created_at: new Date('2026-10-01') };
      revisions.findOne.mockResolvedValue(refused);
      await service.reviewRevision('v1', 'apply', null, ADMIN);

      expect(revisions.query.mock.calls[0][1]).toEqual(['v1']);
      expect(revisions.update).toHaveBeenCalledWith(
        { id: 'v1', status: 'rejected' },
        expect.objectContaining({ status: 'applied', review_note: null }),
      );
      expect(repairersService.update).toHaveBeenCalled();
      // Comes back with its repairer, whose name its author is told.
      expect(revisions.findOne).toHaveBeenLastCalledWith({ where: { id: 'v1' }, relations: ['repairer'] });
    });

    it('leaves a refused change its author replaced since', async () => {
      revisions.findOne.mockResolvedValue({ ...waiting, status: 'rejected' });
      revisions.query.mockResolvedValue([{ replaced: true }]);
      await expect(service.reviewRevision('v1', 'apply', null, ADMIN)).rejects.toThrow(
        'This change has been replaced since',
      );
      expect(revisions.update).not.toHaveBeenCalled();
    });

    it('puts a refused change back as refused when it cannot be applied', async () => {
      const reviewedAt = new Date('2026-10-02');
      revisions.findOne.mockResolvedValue({ ...waiting, status: 'rejected', review_note: 'No', reviewed_at: reviewedAt });
      repairersService.update.mockRejectedValue(new Error('connection reset'));
      await expect(service.reviewRevision('v1', 'apply', null, ADMIN)).rejects.toThrow('connection reset');
      expect(revisions.update).toHaveBeenLastCalledWith('v1', {
        status: 'rejected',
        review_note: 'No',
        reviewed_at: reviewedAt,
      });
    });

    it('does not refuse a refused change again', async () => {
      revisions.findOne.mockResolvedValue({ ...waiting, status: 'rejected' });
      await expect(service.reviewRevision('v1', 'reject', null, ADMIN)).rejects.toThrow(
        'This change has already been reviewed',
      );
    });

    it('reviews a change once, and by an administrator', async () => {
      revisions.findOne.mockResolvedValue({ ...waiting, status: 'applied' });
      await expect(service.reviewRevision('v1', 'apply', null, ADMIN)).rejects.toThrow(
        'This change has already been reviewed',
      );
      await expect(service.reviewRevision('v1', 'apply', null, AUTHOR)).rejects.toThrow('Only an administrator');
      revisions.findOne.mockResolvedValue(null);
      await expect(service.reviewRevision('v9', 'apply', null, ADMIN)).rejects.toThrow('not found');
    });
  });
});
