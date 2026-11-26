import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useHistory, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Text } from "@mantine/core";
import ReportGroups, { ReportGroup } from "../components/DemoData/ReportGroups";
import ContributionsList from "../components/Contributions/ContributionsList";
import { ContributorStats, demoDataService } from "../services/demoDataService";
import { contributionsService } from "../services/contributionsService";
import { LANGUAGES } from "./AdminContributorsPage";
import { selectUserType } from "../stores/authSlice";

const HEADING = "text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400";

/**
 * One contributor account: who it is, and its share of what the purge of
 * demonstration data would remove, by the same rules as the purge's page.
 */
const AdminContributorDetailsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const history = useHistory();
  const userType = useSelector(selectUserType);
  const { id } = useParams<{ id: string }>();
  const [stats, setStats] = useState<ContributorStats | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (userType !== null && userType !== "admin") history.replace("/app/home");
  }, [userType, history]);

  useEffect(() => {
    if (userType !== "admin") return;
    let current = true;
    demoDataService
      .contributor(Number(id))
      .then((found) => current && setStats(found))
      .catch((message: string) => current && setFailed(message));
    return () => {
      current = false;
    };
  }, [userType, id]);

  if (userType !== "admin") return <div>{t("common.loading")}</div>;

  const groups = (s: ContributorStats): ReportGroup[] => {
    const c = s.catalogue;
    const line = (key: string, label: string, value: number, real?: number) => ({ key, label, value, real });
    return [
      {
        title: t("adminDemoData.catalogueGroup"),
        lines: (["models", "variants", "photos", "adoptedModels", "touchedModels"] as const).map((key) =>
          line(key, t(`adminDemoData.lines.${key}`), c[key]),
        ),
      },
      {
        title: t("adminDemoData.repairersGroup"),
        lines: [
          line("repairers", t("adminDemoData.lines.repairers"), s.repairers.repairers),
          ...(["pending", "published", "rejected"] as const).map((status) =>
            line(status, t(`myRepairers.status.${status}`), s.repairers[status]),
          ),
          line("revisions", t("adminContributors.pendingChanges"), s.repairers.revisions),
        ],
      },
      {
        title: t("adminDemoData.contagionGroup"),
        lines: [
          line("ownerships", t("adminDemoData.lines.ownerships"), c.ownerships, c.realOwnerships),
          line("journeys", t("adminDemoData.lines.journeys"), c.journeys, c.realJourneys),
          line("records", t("adminDemoData.lines.records"), c.records, c.realRecords),
          line("subscriptions", t("adminDemoData.lines.subscriptions"), c.subscriptions),
        ],
      },
    ];
  };

  const person = stats && [stats.contributor.firstName, stats.contributor.lastName].filter(Boolean).join(" ");
  const language = LANGUAGES.find((l) => l.value === stats?.contributor.language)?.label;

  return (
    // Main.tsx already provides the centred container and horizontal padding.
    <div className="w-full py-10 space-y-6">
      <Link
        to="/app/admin/contributors"
        className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:underline"
      >
        <span className="material-symbols-outlined text-base" aria-hidden="true">arrow_back</span>
        {t("nav.adminContributors")}
      </Link>

      {failed && <Text c="red">{failed}</Text>}
      {!failed && !stats && <div>{t("common.loading")}</div>}

      {stats && (
        <>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex items-center">
            <span className="material-symbols-outlined text-3xl text-red-600 dark:text-red-400 mr-3">person</span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white break-all">{stats.contributor.email}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {person && <>{person} · </>}
                {t("adminContributors.createdOn")}{" "}
                {new Date(stats.contributor.created_at).toLocaleDateString(i18n.language)}
                {language && <> · {t("adminContributors.emailsIn", { language })}</>}
              </p>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className={HEADING}>{t("adminContributors.wouldRemove")}</h2>
            <ReportGroups groups={groups(stats)} />
          </section>

          <section className="space-y-3">
            <h2 className={HEADING}>{t("adminContributors.entries")}</h2>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <ContributionsList
                kinds={["models", "variants", "repairers"]}
                load={(kind, offset) => contributionsService.ofContributor(stats.contributor.id, kind, offset)}
                empty={<p className="text-sm text-gray-500 dark:text-gray-400">{t("adminContributors.noEntries")}</p>}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default AdminContributorDetailsPage;
