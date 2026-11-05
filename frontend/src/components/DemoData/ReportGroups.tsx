import React from "react";
import { useTranslation } from "react-i18next";

/** One figure, and how many of it are real users' data reached by contagion. */
export type ReportLine = { key: string; label: string; value: number; real?: number | null };
export type ReportGroup = { title: string; lines: ReportLine[] };

const HEADING = "text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400";
const CARD = "bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5";

/** Figures of demonstration data, a card for each thing they concern. */
const ReportGroups: React.FC<{ groups: ReportGroup[] }> = ({ groups }) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {groups.map((group) => (
        <section key={group.title} className={CARD}>
          <h2 className={`${HEADING} mb-2`}>{group.title}</h2>
          <dl className="divide-y divide-gray-100 dark:divide-gray-700">
            {group.lines.map((line) => (
              <div key={line.key} className="flex items-baseline justify-between gap-4 py-1.5">
                <dt className="text-sm text-gray-700 dark:text-gray-300">
                  {line.label}
                  {line.real != null && line.real > 0 && (
                    <span className="ml-2 text-red-600 dark:text-red-400">
                      {t("adminDemoData.ofRealUsers", { n: line.real })}
                    </span>
                  )}
                </dt>
                <dd className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{line.value ?? 0}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
};

export default ReportGroups;
