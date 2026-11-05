import React from "react";
import { Link, useHistory } from "react-router-dom";
import { useTranslation } from 'react-i18next';

const WHY = [
  { icon: "update", key: "longerLife", tile: "bg-customgreen-50 border-customgreen-100", color: "text-customgreen-600 dark:text-customgreen-300" },
  { icon: "factory", key: "noNewOne", tile: "bg-blue-50 border-blue-100", color: "text-blue-600 dark:text-blue-400" },
  { icon: "handshake", key: "helpsSomeone", tile: "bg-purple-50 border-purple-100", color: "text-purple-600 dark:text-purple-400" },
];

const WAYS = [
  { icon: "volunteer_activism", key: "give" },
  { icon: "sell", key: "sell" },
];

const BEFORE = ["beforeBackup", "beforeAccounts", "beforeCards", "beforeAccessories", "beforeHonest"];

/**
 * Where the wizard's reuse option leads when no reuse actor is known nearby
 * (PBI 13851). Generic on purpose: no platform is named.
 */
export default function ReuseInfo() {
  const { t } = useTranslation();
  const history = useHistory();

  return (
    <div className="w-full flex flex-col items-center py-10">
      <div className="w-full space-y-8 max-w-3xl">

        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-5xl text-customgreen-500">volunteer_activism</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('reuseInfo.title')}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {t('reuseInfo.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-customgreen-500">lightbulb</span>
            {t('reuseInfo.whyTitle')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {WHY.map((w) => (
              <div key={w.key} className={`flex flex-col items-center text-center p-4 rounded-xl border dark:bg-gray-700 dark:border-gray-600 ${w.tile}`}>
                <span className={`material-symbols-outlined text-3xl mb-2 ${w.color}`}>{w.icon}</span>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">{t(`reuseInfo.${w.key}`)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t(`reuseInfo.${w.key}Desc`)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500">location_on</span>
            {t('reuseInfo.whereTitle')}
          </h2>
          <div className="space-y-4">
            {WAYS.map((w) => (
              <div key={w.key} className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <span className="material-symbols-outlined text-2xl text-customgreen-600 dark:text-customgreen-300">{w.icon}</span>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white">{t(`reuseInfo.${w.key}`)}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t(`reuseInfo.${w.key}Desc`)}</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            to="/app/repair-map?type=reuse"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-customgreen-500 hover:bg-customgreen-600 text-white text-sm font-bold py-3 px-6 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">map</span>
            {t('reuseInfo.seeMap')}
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-500">checklist</span>
            {t('reuseInfo.beforeTitle')}
          </h2>
          <ul className="space-y-3">
            {BEFORE.map((key) => (
              <li key={key} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                <span className="material-symbols-outlined text-base text-customgreen-500 mt-0.5">check_circle</span>
                {t(`reuseInfo.${key}`)}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-gray-800 border border-yellow-200 dark:border-gray-700 rounded-xl text-sm text-yellow-800 dark:text-yellow-200">
          <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 mt-0.5">recycling</span>
          <span>
            {t('reuseInfo.beyondUse')}{" "}
            <Link to="/app/recycle-info" className="font-semibold underline">
              {t('reuseInfo.beyondUseLink')}
            </Link>
          </span>
        </div>

        <div className="flex justify-start pb-6">
          <button
            onClick={() => history.goBack()}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            {t('reuseInfo.goBack')}
          </button>
        </div>
      </div>
    </div>
  );
}
