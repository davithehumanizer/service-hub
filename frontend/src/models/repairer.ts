/** Who proposed something, as the administrators' queue names them. */
type ProposalAuthor = {
  id: number;
  email: string;
  role: string | null;
  firstName: string | null;
  lastName: string | null;
};

type Repairer = {
  repairer_id: string;
  name: string;
  description: string;
  address: string;
  country: string;
  countryName?: string;
  postal_code: string;
  city: string;
  website: string;
  email: string;
  phone: string;
  latitude: number;
  longitude: number;
  repairerDevices: { device_type: string; repairer_device_id: string }[];
  source?: string;
  partner_type?: string;
  /** Entered by a contributor: demonstration data (docs/demo-data.md). */
  is_demo?: boolean;
  /** Only its author and the administrators see one not yet published. */
  status?: "pending" | "published" | "rejected";
  /** Why an administrator refused it. */
  review_note?: string | null;
  created_at?: string | null;
  /** In the administrators' queue: what a review of it names. */
  version?: string;
  /** In the administrators' queue: who proposed it, if still known. */
  author?: ProposalAuthor | null;
  reviewed_at?: string | null;
};

/** What a proposal sets; a change sends only what differs. */
type RepairerProposal = {
  name: string;
  description: string | null;
  address: string;
  postal_code: string | null;
  city: string;
  country: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  partner_type: string;
  device_types: string[];
};

/** Its author's change to a published repairer, waiting or refused. */
type RepairerRevision = {
  id: string;
  repairer_id: string;
  changes: Partial<RepairerProposal>;
  status: "pending" | "applied" | "rejected";
  review_note: string | null;
  created_at: string;
  /** In the administrators' queue: the repairer as the public sees it. */
  repairer?: Repairer;
  author?: ProposalAuthor | null;
  reviewed_at?: string | null;
};

/** What waits for an administrator, then the latest refusals. */
type RepairerQueue = {
  proposals: Repairer[];
  revisions: RepairerRevision[];
  refused: { proposals: Repairer[]; revisions: RepairerRevision[] };
};

/** A repairer its author proposed, with its latest change not yet applied. */
type OwnRepairer = Repairer & { revision: RepairerRevision | null };
type RepairerFilters = {
  id: string;
  category: string;
  name: string;
  label?: string;
  icon?: string;
  count?: number;
};

export type { Repairer, RepairerFilters, RepairerProposal, RepairerRevision, OwnRepairer, ProposalAuthor, RepairerQueue };
