import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useHistory } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Checkbox, Popover, Text, Textarea } from "@mantine/core";
import DemoBadge from "../components/Devices/DemoBadge";
import { FIELD_LABELS, countryLabel, partnerTypeLabel } from "../components/Repairers/repairerFields";
import { useNotification } from "../context/NotificationContext";
import { PROPOSALS_REVIEWED } from "../hooks/usePendingProposals";
import { ProposalAuthor, Repairer, RepairerProposal, RepairerQueue, RepairerRevision } from "../models/repairer";
import { RepairerRefusal, repairerService } from "../services/repairerService";
import { selectUserType } from "../stores/authSlice";

const HEADING = "text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400";
const CARD = "bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4";

const osm = (lat: number | string, lng: number | string) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;

type Kind = "proposal" | "revision";
type Decision = "publish" | "apply" | "reject";
type Outcome = "done" | "stale" | "failed";

const PROPOSAL_FIELDS = ["address", "postal_code", "city", "country", "website", "email", "phone", "device_types", "description"] as const;

/**
 * Repairers proposed on the site, and their authors' changes to published
 * ones: nothing reaches the map before an administrator says so here. A
 * refusal made by mistake is taken back from the latest ones, below.
 */
const AdminRepairerProposalsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const history = useHistory();
  const userType = useSelector(selectUserType);
  const { showNotification } = useNotification();
  const [queue, setQueue] = useState<RepairerQueue | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [refusing, setRefusing] = useState<string | null>(null);
  const [undoing, setUndoing] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loads, setLoads] = useState(0);

  useEffect(() => {
    if (userType !== null && userType !== "admin") history.replace("/app/home");
  }, [userType, history]);

  useEffect(() => {
    if (userType !== "admin") return;
    let current = true;
    repairerService
      .listPendingProposals()
      .then((data) => {
        if (!current) return;
        setQueue(data);
        // What is still there stays selected.
        const there = new Set([
          ...data.proposals.map((p) => `proposal:${p.repairer_id}`),
          ...data.revisions.map((r) => `revision:${r.id}`),
        ]);
        setSelected((s) => new Set([...s].filter((key) => there.has(key))));
      })
      .catch(() => current && setFailed(true));
    return () => {
      current = false;
    };
  }, [userType, loads]);

  if (userType !== "admin") return <div>{t("common.loading")}</div>;

  const versionOf = (id: string) =>
    [...(queue?.proposals ?? []), ...(queue?.refused.proposals ?? [])].find((p) => p.repairer_id === id)?.version ?? "";

  /** One decision; a stale one is what changed since the queue was read. */
  const decide = async (kind: Kind, id: string, decision: Decision, reason?: string): Promise<Outcome> => {
    try {
      if (kind === "proposal") {
        await repairerService.reviewProposal(id, decision as "publish" | "reject", versionOf(id), reason);
      } else {
        await repairerService.reviewRevision(id, decision as "apply" | "reject", reason);
      }
      return "done";
    } catch (refusal: any) {
      const { statusCode } = refusal as RepairerRefusal;
      // Changed by its author, withdrawn, or decided by another administrator
      // meanwhile: what is shown is no longer what would be reviewed.
      return statusCode === 404 || statusCode === 409 ? "stale" : "failed";
    }
  };

  const reviewed = () => {
    setLoads((n) => n + 1);
    window.dispatchEvent(new Event(PROPOSALS_REVIEWED));
  };

  const review = async (kind: Kind, id: string, decision: Decision) => {
    setBusy(`${id}-${decision}`);
    const outcome = await decide(kind, id, decision, decision === "reject" ? note.trim() || undefined : undefined);
    setBusy(null);
    if (outcome === "done") {
      showNotification(t(`adminRepairerProposals.done.${kind}.${decision}`), "success");
      if (refusing === id) {
        setRefusing(null);
        setNote("");
      }
    } else if (outcome === "stale") {
      showNotification(t("adminRepairerProposals.stale"), "warning");
      setRefusing(null);
    } else {
      showNotification(t("errors.generic"), "error");
    }
    reviewed();
  };

  /** Publishes, or applies, every one selected of a kind, one after another. */
  const reviewSelected = async (kind: Kind) => {
    const decision = kind === "proposal" ? "publish" : "apply";
    const ids = [...selected].filter((key) => key.startsWith(`${kind}:`)).map((key) => key.slice(kind.length + 1));
    setBusy(`bulk-${kind}`);
    const outcomes: Outcome[] = [];
    for (const id of ids) outcomes.push(await decide(kind, id, decision));
    setBusy(null);
    const count = (outcome: Outcome) => outcomes.filter((o) => o === outcome).length;
    // What was not done stays selected, to try again.
    const done = new Set(ids.filter((_, i) => outcomes[i] === "done").map((id) => `${kind}:${id}`));
    if (count("done")) {
      showNotification(t(`adminRepairerProposals.bulkDone.${kind}`, { count: count("done") }), "success");
    }
    if (count("stale") + count("failed")) {
      showNotification(t("adminRepairerProposals.bulkSkipped", { count: count("stale") + count("failed") }), "warning");
    }
    setSelected((s) => new Set([...s].filter((key) => !done.has(key))));
    reviewed();
  };

  const toggle = (key: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  /** Publish or apply, and refuse with an optional reason for its author. */
  const actions = (kind: Kind, id: string) => {
    const accept = kind === "proposal" ? "publish" : "apply";
    if (refusing === id) {
      return (
        <div className="space-y-3">
          <Textarea
            label={t("adminRepairerProposals.reason")}
            description={t("adminRepairerProposals.reasonHint")}
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            maxLength={1000}
            autosize
            minRows={2}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              color="red"
              size="sm"
              loading={busy === `${id}-reject`}
              disabled={!!busy}
              onClick={() => review(kind, id, "reject")}
            >
              {t("adminRepairerProposals.confirmReject")}
            </Button>
            <Button variant="default" size="sm" disabled={!!busy} onClick={() => setRefusing(null)}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          loading={busy === `${id}-${accept}`}
          disabled={!!busy}
          onClick={() => review(kind, id, accept)}
          leftSection={<span className="material-symbols-outlined text-base">check</span>}
        >
          {t(`adminRepairerProposals.${accept}`)}
        </Button>
        <Button
          size="sm"
          variant="outline"
          color="red"
          disabled={!!busy}
          onClick={() => {
            setRefusing(id);
            setNote("");
          }}
        >
          {t("adminRepairerProposals.reject")}
        </Button>
      </div>
    );
  };

  /** A refusal taken back, once confirmed: published, or applied, all the same. */
  const undo = (kind: Kind, id: string) => {
    const accept = kind === "proposal" ? "publish" : "apply";
    return (
      <Popover
        opened={undoing === id}
        onChange={(open) => !open && setUndoing(null)}
        position="bottom-start"
        withArrow
        shadow="md"
      >
        <Popover.Target>
          <Button
            size="sm"
            variant="default"
            disabled={!!busy}
            onClick={() => setUndoing((u) => (u === id ? null : id))}
            leftSection={<span className="material-symbols-outlined text-base">undo</span>}
          >
            {t(`adminRepairerProposals.${accept}Anyway`)}
          </Button>
        </Popover.Target>
        <Popover.Dropdown>
          <Text size="sm" mb="sm" maw={260}>
            {t(`adminRepairerProposals.${accept}AnywayConfirm`)}
          </Text>
          <div className="flex gap-2 justify-end">
            <Button size="xs" variant="default" disabled={!!busy} onClick={() => setUndoing(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              size="xs"
              loading={busy === `${id}-${accept}`}
              disabled={!!busy && busy !== `${id}-${accept}`}
              onClick={async () => {
                await review(kind, id, accept);
                setUndoing(null);
              }}
            >
              {t(`adminRepairerProposals.${accept}`)}
            </Button>
          </div>
        </Popover.Dropdown>
      </Popover>
    );
  };

  /** A field's value as a reader would say it. */
  const shown = (field: keyof RepairerProposal, value: unknown): string => {
    if (value == null || value === "") return "—";
    if (field === "partner_type") return partnerTypeLabel(t, String(value));
    if (field === "country") return countryLabel(String(value), i18n.language);
    if (field === "device_types") {
      const types = value as string[];
      return types.length ? types.map((type) => t(`repairerDeviceTypes.${type}`)).join(", ") : "—";
    }
    return String(value);
  };

  const current = (repairer: Repairer | undefined, field: keyof RepairerProposal): unknown =>
    field === "device_types" ? repairer?.repairerDevices.map((d) => d.device_type) : repairer?.[field as keyof Repairer];

  const date = (value?: string | null) => (value ? new Date(value).toLocaleDateString(i18n.language) : "");

  /** Who proposed it: a contributor links to their page. */
  const byWhom = (author?: ProposalAuthor | null) => {
    if (!author) return null;
    return (
      <>
        {" · "}
        {t("adminRepairerProposals.proposedBy")}{" "}
        {author.role === "contributor" ? (
          <Link to={`/app/admin/contributors/${author.id}`} className="text-customgreen-600 dark:text-customgreen-400 hover:underline break-all">
            {author.email}
          </Link>
        ) : (
          <span className="break-all">{author.email}</span>
        )}
      </>
    );
  };

  const refusal = (item: { review_note?: string | null; reviewed_at?: string | null }) => (
    <p className="text-sm text-red-600 dark:text-red-400">
      {t("adminRepairerProposals.refusedOn", { date: date(item.reviewed_at) })}
      {item.review_note && <> · {t("adminRepairerProposals.reasonGiven", { note: item.review_note })}</>}
    </p>
  );

  const proposalCard = (repairer: Repairer, refused: boolean) => {
    const key = `proposal:${repairer.repairer_id}`;
    return (
      <article key={key} className={CARD}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {!refused && (
              <Checkbox
                className="mt-1"
                aria-label={t("adminRepairerProposals.select")}
                checked={selected.has(key)}
                disabled={!!busy}
                onChange={() => toggle(key)}
              />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{repairer.name}</h3>
                {repairer.is_demo && <DemoBadge size="sm" />}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {partnerTypeLabel(t, repairer.partner_type)} ·{" "}
                {t("adminRepairerProposals.proposedOn", { date: date(repairer.created_at) })}
                {byWhom(repairer.author)}
              </p>
            </div>
          </div>
          <a
            href={osm(repairer.latitude, repairer.longitude)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-customgreen-600 dark:text-customgreen-400 hover:underline"
          >
            <span className="material-symbols-outlined text-base">map</span>
            {t("adminRepairerProposals.seeOnMap")}
          </a>
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {PROPOSAL_FIELDS.map((field) => (
            <div key={field} className={field === "description" || field === "device_types" ? "sm:col-span-2" : ""}>
              <dt className="text-gray-500 dark:text-gray-400">{t(FIELD_LABELS[field])}</dt>
              <dd className="text-gray-900 dark:text-gray-100 break-words">{shown(field, current(repairer, field))}</dd>
            </div>
          ))}
        </dl>
        {refused && refusal(repairer)}
        {refused ? undo("proposal", repairer.repairer_id) : actions("proposal", repairer.repairer_id)}
      </article>
    );
  };

  const revisionCard = (revision: RepairerRevision, refused: boolean) => {
    const key = `revision:${revision.id}`;
    return (
      <article key={key} className={CARD}>
        <div className="flex items-start gap-3">
          {!refused && (
            <Checkbox
              className="mt-1"
              aria-label={t("adminRepairerProposals.select")}
              checked={selected.has(key)}
              disabled={!!busy}
              onChange={() => toggle(key)}
            />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{revision.repairer?.name}</h3>
              {revision.repairer?.is_demo && <DemoBadge size="sm" />}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("adminRepairerProposals.proposedOn", { date: date(revision.created_at) })}
              {byWhom(revision.author)}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th className="py-1 pr-4 font-normal">{t("adminRepairerProposals.field")}</th>
                <th className="py-1 pr-4 font-normal">{t("adminRepairerProposals.before")}</th>
                <th className="py-1 font-normal">{t("adminRepairerProposals.after")}</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(revision.changes) as (keyof RepairerProposal)[]).map((field) => (
                <tr key={field} className="border-t border-gray-100 dark:border-gray-700 align-top">
                  <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">{t(FIELD_LABELS[field])}</td>
                  <td
                    className={`py-2 pr-4 text-gray-500 dark:text-gray-400 break-words ${
                      shown(field, current(revision.repairer, field)) === "—" ? "" : "line-through"
                    }`}
                  >
                    {shown(field, current(revision.repairer, field))}
                  </td>
                  <td className="py-2 text-gray-900 dark:text-gray-100 break-words">{shown(field, revision.changes[field])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {refused && refusal(revision)}
        {refused ? undo("revision", revision.id) : actions("revision", revision.id)}
      </article>
    );
  };

  /** A section's heading, with selecting all of it and deciding at once. */
  const sectionHead = (kind: Kind, title: string, keys: string[]) => {
    const chosen = keys.filter((key) => selected.has(key)).length;
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={HEADING}>
          {title} <span className="text-gray-400">· {keys.length}</span>
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Checkbox
            label={t("adminRepairerProposals.selectAll")}
            checked={chosen === keys.length}
            indeterminate={chosen > 0 && chosen < keys.length}
            disabled={!!busy}
            onChange={() =>
              setSelected((s) => {
                const next = new Set(s);
                keys.forEach((key) => (chosen === keys.length ? next.delete(key) : next.add(key)));
                return next;
              })
            }
          />
          <Button
            size="compact-sm"
            disabled={chosen === 0 || (!!busy && busy !== `bulk-${kind}`)}
            loading={busy === `bulk-${kind}`}
            onClick={() => reviewSelected(kind)}
            leftSection={<span className="material-symbols-outlined text-base">done_all</span>}
          >
            {t(`adminRepairerProposals.${kind === "proposal" ? "publishSelected" : "applySelected"}`, { count: chosen })}
          </Button>
        </div>
      </div>
    );
  };

  const proposals = queue?.proposals ?? [];
  const revisions = queue?.revisions ?? [];
  const refusedProposals = queue?.refused.proposals ?? [];
  const refusedRevisions = queue?.refused.revisions ?? [];
  const refusedCount = refusedProposals.length + refusedRevisions.length;

  return (
    // Main.tsx already provides the centred container and horizontal padding.
    <div className="w-full py-10 space-y-8">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex items-center">
        <span className="material-symbols-outlined text-3xl text-red-600 dark:text-red-400 mr-3">pending_actions</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("adminRepairerProposals.title")}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t("adminRepairerProposals.intro")}</p>
        </div>
      </div>

      {failed && <Text c="red">{t("errors.generic")}</Text>}
      {!failed && !queue && <div>{t("common.loading")}</div>}
      {queue && proposals.length === 0 && revisions.length === 0 && (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <span className="material-symbols-outlined text-5xl block mb-3">done_all</span>
          {t("adminRepairerProposals.empty")}
        </div>
      )}

      {proposals.length > 0 && (
        <section className="space-y-3">
          {sectionHead(
            "proposal",
            t("adminRepairerProposals.newPlaces"),
            proposals.map((p) => `proposal:${p.repairer_id}`),
          )}
          {proposals.map((repairer) => proposalCard(repairer, false))}
        </section>
      )}

      {revisions.length > 0 && (
        <section className="space-y-3">
          {sectionHead(
            "revision",
            t("adminRepairerProposals.changes"),
            revisions.map((r) => `revision:${r.id}`),
          )}
          {revisions.map((revision) => revisionCard(revision, false))}
        </section>
      )}

      {refusedCount > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className={HEADING}>
              {t("adminRepairerProposals.refused")} <span className="text-gray-400">· {refusedCount}</span>
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t("adminRepairerProposals.refusedHint")}</p>
          </div>
          {refusedProposals.map((repairer) => proposalCard(repairer, true))}
          {refusedRevisions.map((revision) => revisionCard(revision, true))}
        </section>
      )}
    </div>
  );
};

export default AdminRepairerProposalsPage;
