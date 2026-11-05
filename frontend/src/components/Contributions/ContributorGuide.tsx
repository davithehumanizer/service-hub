import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@mantine/core";

const RULES = ["what", "ean", "photos", "repairers", "emails", "purge"] as const;

/**
 * What a contributor is asked for, and the rules a form would otherwise
 * only teach by refusing: on their home page, for the whole campaign.
 */
const ContributorGuide: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-3xl text-customgreen-600 dark:text-customgreen-400" aria-hidden="true">
          volunteer_activism
        </span>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("contributorGuide.title")}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t("contributorGuide.intro")}</p>
        </div>
      </div>
      <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
        {RULES.map((rule) => (
          <li key={rule} className="flex items-start gap-2">
            <span className="material-symbols-outlined text-base text-customgreen-600 dark:text-customgreen-400" aria-hidden="true">
              check_circle
            </span>
            <span>{t(`contributorGuide.rules.${rule}`)}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button component={Link} to="/app/create-device" leftSection={<span className="material-symbols-outlined text-base">add</span>}>
          {t("contributions.add")}
        </Button>
        <Button
          component={Link}
          to="/app/repairers/new"
          variant="default"
          leftSection={<span className="material-symbols-outlined text-base">add_location_alt</span>}
        >
          {t("myRepairers.propose")}
        </Button>
        <Button component={Link} to="/app/my-contributions" variant="subtle">
          {t("nav.myContributions")}
        </Button>
      </div>
    </section>
  );
};

export default ContributorGuide;
