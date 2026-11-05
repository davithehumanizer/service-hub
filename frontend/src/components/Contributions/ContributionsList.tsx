import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge, Button, SegmentedControl, Text } from "@mantine/core";
import DemoBadge from "../Devices/DemoBadge";
import { OwnRepairer } from "../../models/repairer";
import { AuthoredModel, AuthoredVariant, EntriesPage, EntryKind } from "../../services/contributionsService";

const STATUS_COLOR = { pending: "yellow", published: "green", rejected: "red" } as const;

type Entry = AuthoredModel | AuthoredVariant | OwnRepairer;
type Lists = Partial<Record<EntryKind, EntriesPage<Entry>>>;

interface Props {
  kinds: EntryKind[];
  load: (kind: EntryKind, offset: number) => Promise<EntriesPage<Entry>>;
  /** Shown when there is nothing of any kind. */
  empty: React.ReactNode;
}

/**
 * What an account entered, a kind at a time, each entry a link to its page:
 * models, variants and, for an administrator, repairers.
 */
const ContributionsList: React.FC<Props> = ({ kinds, load, empty }) => {
  const { t, i18n } = useTranslation();
  const [lists, setLists] = useState<Lists>({});
  const [kind, setKind] = useState<EntryKind>(kinds[0]);
  const [failed, setFailed] = useState(false);
  const [more, setMore] = useState(false);

  // Every kind's first page, for the counts on the tabs.
  useEffect(() => {
    let current = true;
    Promise.all(kinds.map((k) => load(k, 0)))
      .then((pages) => current && setLists(Object.fromEntries(kinds.map((k, i) => [k, pages[i]]))))
      .catch(() => current && setFailed(true));
    return () => {
      current = false;
    };
    // Once: `load` and `kinds` are new each render of the page, what they read is not.
  }, []);

  if (failed) return <Text c="red">{t("errors.generic")}</Text>;
  if (kinds.some((k) => !lists[k])) return <div>{t("common.loading")}</div>;
  if (kinds.every((k) => lists[k]!.total === 0)) return <>{empty}</>;

  const list = lists[kind]!;

  const loadMore = async () => {
    setMore(true);
    try {
      const page = await load(kind, list.items.length);
      // Entered meanwhile, newer rows shift the pages: one already shown comes again.
      const id = (item: any) => String(item.id ?? item.repairer_id);
      setLists((l) => {
        const shown = new Set(l[kind]!.items.map(id));
        return {
          ...l,
          [kind]: { items: [...l[kind]!.items, ...page.items.filter((item) => !shown.has(id(item)))], total: page.total },
        };
      });
    } catch {
      setFailed(true);
    } finally {
      setMore(false);
    }
  };

  const date = (value?: string | null) => (value ? new Date(value).toLocaleDateString(i18n.language) : "");

  const row = (to: string, title: React.ReactNode, detail: React.ReactNode, badges: React.ReactNode, key: string) => (
    <li key={key}>
      <Link
        to={to}
        className="-mx-2 px-2 py-3 flex items-center justify-between gap-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white break-words">{title}</p>
            {badges}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{detail}</p>
        </div>
        <span className="material-symbols-outlined text-base text-gray-400" aria-hidden="true">
          chevron_right
        </span>
      </Link>
    </li>
  );

  const entry = (item: Entry) => {
    if (kind === "models") {
      const model = item as AuthoredModel;
      return row(
        `/app/model/${model.id}`,
        `${model.brand} ${model.name}`,
        <>
          {t("contributions.variantCount", { count: model.variant_count })}
          {model.created_at && <> · {t("contributions.createdOn", { date: date(model.created_at) })}</>}
        </>,
        model.is_demo && <DemoBadge size="xs" />,
        `m${model.id}`,
      );
    }
    if (kind === "variants") {
      const variant = item as AuthoredVariant;
      return row(
        variant.model_id ? `/app/model/${variant.model_id}?variant=${variant.id}` : `/app/device/${variant.id}`,
        <>
          {[variant.brand, variant.model_name].filter(Boolean).join(" ")}
          {variant.variant_label && <span className="font-normal text-gray-600 dark:text-gray-300"> · {variant.variant_label}</span>}
        </>,
        variant.ean ? t("contributions.code", { code: variant.ean }) : t("contributions.noCode"),
        variant.is_demo && <DemoBadge size="xs" />,
        `v${variant.id}`,
      );
    }
    const repairer = item as OwnRepairer;
    const status = repairer.status ?? "published";
    return row(
      `/app/repairer/${repairer.repairer_id}`,
      repairer.name,
      <>
        {repairer.city}
        {repairer.created_at && <> · {t("myRepairers.proposedOn", { date: date(repairer.created_at) })}</>}
        {repairer.revision?.status === "pending" && <> · {t("contributions.changeWaiting")}</>}
      </>,
      <>
        <Badge color={STATUS_COLOR[status]} variant="light" size="xs">
          {t(`myRepairers.status.${status}`)}
        </Badge>
        {repairer.is_demo && <DemoBadge size="xs" />}
      </>,
      `r${repairer.repairer_id}`,
    );
  };

  return (
    <div className="space-y-3">
      {kinds.length > 1 && (
        // Three kinds on a phone: smaller, and scrolled rather than cut.
        <div className="overflow-x-auto">
          <SegmentedControl
            fullWidth
            size="xs"
            value={kind}
            onChange={(value) => setKind(value as EntryKind)}
            data={kinds.map((k) => ({ value: k, label: `${t(`contributions.kinds.${k}`)} · ${lists[k]!.total}` }))}
          />
        </div>
      )}
      {list.total === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4">{t(`contributions.none.${kind}`)}</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">{list.items.map(entry)}</ul>
      )}
      {list.items.length < list.total && (
        <Button variant="default" size="sm" loading={more} onClick={loadMore}>
          {t("contributions.loadMore", { shown: list.items.length, total: list.total })}
        </Button>
      )}
    </div>
  );
};

export default ContributionsList;
