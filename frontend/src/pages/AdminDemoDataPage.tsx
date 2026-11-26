import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Text, TextInput } from "@mantine/core";
import ReportGroups, { ReportGroup } from "../components/DemoData/ReportGroups";
import { useNotification } from "../context/NotificationContext";
import { DemoDataReport, demoDataService } from "../services/demoDataService";
import { selectUserType } from "../stores/authSlice";

const HEADING = "text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400";
/** Typed as is in every language: what the server checks. */
const WORD = "PURGE";

/** The lines of a report, by what they concern. */
const GROUPS: { title: string; lines: (keyof DemoDataReport)[] }[] = [
  { title: "accountsGroup", lines: ["accounts"] },
  { title: "catalogueGroup", lines: ["models", "variants", "photos", "adoptedModels", "touchedModels"] },
  { title: "repairersGroup", lines: ["repairers"] },
  { title: "contagionGroup", lines: ["ownerships", "journeys", "records", "subscriptions"] },
];

const total = (r: DemoDataReport) =>
  r.accounts + r.models + r.variants + r.photos + r.repairers + r.ownerships + r.journeys + r.records + r.subscriptions;

/**
 * The one purge of demonstration data (docs/demo-data.md, §4.4): what it
 * would remove, real users' data reached by contagion counted apart, then
 * the purge itself, confirmed by typing a word.
 */
const AdminDemoDataPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const userType = useSelector(selectUserType);
  const { showNotification } = useNotification();
  const [preview, setPreview] = useState<DemoDataReport | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  // Apart from the preview's error: the preview reloads after a purge,
  // and must not wipe out why the purge stopped.
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [purging, setPurging] = useState(false);
  const [done, setDone] = useState<DemoDataReport | null>(null);

  useEffect(() => {
    if (userType !== null && userType !== "admin") history.replace("/app/home");
  }, [userType, history]);

  const load = useCallback(() => {
    setFailed(null);
    demoDataService
      .preview()
      .then(setPreview)
      .catch((message: string) => {
        // The figures shown would be those from before: none rather than wrong.
        setPreview(null);
        setFailed(message);
      });
  }, []);

  useEffect(() => {
    if (userType === "admin") load();
  }, [userType, load]);

  if (userType !== "admin") return <div>{t("common.loading")}</div>;

  const purge = async () => {
    setPurging(true);
    setPurgeError(null);
    try {
      const report = await demoDataService.purge();
      setDone(report);
      setTyped("");
      showNotification(t("adminDemoData.purged"), "success");
    } catch (message: any) {
      setPurgeError(String(message));
    } finally {
      setPurging(false);
      load();
    }
  };

  const reportView = (report: DemoDataReport) => (
    <ReportGroups
      groups={GROUPS.map(
        (group): ReportGroup => ({
          title: t(`adminDemoData.${group.title}`),
          lines: group.lines.map((key) => ({
            key,
            label: t(`adminDemoData.lines.${key}`),
            value: report[key] ?? 0,
            real:
              key === "ownerships"
                ? report.realOwnerships
                : key === "journeys"
                  ? report.realJourneys
                  : key === "records"
                    ? report.realRecords
                    : null,
          })),
        }),
      )}
    />
  );

  return (
    // Main.tsx already provides the centred container and horizontal padding.
    <div className="w-full py-10 space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex items-center">
        <span className="material-symbols-outlined text-3xl text-red-600 dark:text-red-400 mr-3">delete_sweep</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("adminDemoData.title")}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t("adminDemoData.intro")}</p>
        </div>
      </div>

      {purgeError && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          <p className="font-semibold">{t("adminDemoData.stopped")}</p>
          <p className="mt-1">{purgeError}</p>
        </div>
      )}

      {/* After a stopped purge, its own message says it already. */}
      {failed && !purgeError && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {failed}
        </div>
      )}

      {done && (
        <section className="space-y-3">
          <h2 className={HEADING}>{t("adminDemoData.done")}</h2>
          {reportView(done)}
          {(done.filesLeft ?? 0) > 0 && (
            <Text c="red" size="sm">
              {t("adminDemoData.filesLeft", { n: done.filesLeft })}
            </Text>
          )}
        </section>
      )}

      {!preview && !failed && <div>{t("common.loading")}</div>}

      {preview && total(preview) === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <span className="material-symbols-outlined text-5xl block mb-3">done_all</span>
          {t("adminDemoData.nothing")}
        </div>
      )}

      {preview && total(preview) > 0 && (
        <section className="space-y-4">
          <h2 className={HEADING}>{t("adminDemoData.wouldRemove")}</h2>
          {reportView(preview)}

          <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 p-5 space-y-4">
            <div className="text-sm text-red-800 dark:text-red-200 space-y-1">
              <p className="font-semibold">{t("adminDemoData.irreversible")}</p>
              <p>{t("adminDemoData.dumpFirst")}</p>
              {(preview.realOwnerships > 0 || preview.realJourneys > 0) && <p>{t("adminDemoData.contagionWarning")}</p>}
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <TextInput
                label={t("adminDemoData.typeWord", { word: WORD })}
                value={typed}
                onChange={(e) => setTyped(e.currentTarget.value)}
                autoComplete="off"
                className="w-64"
              />
              <Button
                color="red"
                disabled={typed !== WORD}
                loading={purging}
                onClick={purge}
                leftSection={<span className="material-symbols-outlined text-base">delete_forever</span>}
              >
                {t("adminDemoData.purge")}
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminDemoDataPage;
