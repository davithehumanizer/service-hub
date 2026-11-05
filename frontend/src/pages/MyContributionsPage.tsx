import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@mantine/core";
import ContributionsList from "../components/Contributions/ContributionsList";
import { contributionsService } from "../services/contributionsService";

/** The models and variants one entered, to find them again. */
const MyContributionsPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    // Main.tsx already provides the centred container and horizontal padding.
    <div className="w-full py-10 space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center">
          <span className="material-symbols-outlined text-3xl text-customgreen-600 dark:text-customgreen-400 mr-3">
            library_add
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("contributions.title")}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t("contributions.intro")}</p>
          </div>
        </div>
        <Button component={Link} to="/app/create-device" leftSection={<span className="material-symbols-outlined text-base">add</span>}>
          {t("contributions.add")}
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <ContributionsList
          kinds={["models", "variants"]}
          load={(kind, offset) => contributionsService.mine(kind as "models" | "variants", offset)}
          empty={
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <span className="material-symbols-outlined text-5xl block mb-3">inventory_2</span>
              {t("contributions.empty")}
            </div>
          }
        />
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t("contributions.repairersElsewhere")}{" "}
        <Link to="/app/my-repairers" className="text-customgreen-600 dark:text-customgreen-400 hover:underline">
          {t("nav.myRepairers")}
        </Link>
      </p>
    </div>
  );
};

export default MyContributionsPage;
