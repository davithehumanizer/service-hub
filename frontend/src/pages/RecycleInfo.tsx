import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { RootState } from "../stores/globalStore";

// `country` is Nominatim's country_code.
const COLLECTION_RESOURCES = [
  {
    country: "fr",
    icon: "public",
    nameKey: "recycleInfo.ecosystem",
    descKey: "recycleInfo.ecosystemDesc",
    url: "https://www.ecosystem.eco/donner-recycler/",
    color: "text-green-600 dark:text-green-400",
  },
  {
    country: "be",
    icon: "public",
    nameKey: "recycleInfo.recupel",
    descKey: "recycleInfo.recupelDesc",
    url: "https://www.recupel.be",
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    country: "nl",
    icon: "public",
    nameKey: "recycleInfo.wecycle",
    descKey: "recycleInfo.wecycleDesc",
    url: "https://www.wecycle.nl",
    color: "text-orange-600 dark:text-orange-400",
  },
  {
    // The federal environment ministry's and agency's campaign.
    country: "de",
    icon: "public",
    nameKey: "recycleInfo.planE",
    descKey: "recycleInfo.planEDesc",
    url: "https://www.e-schrott-entsorgen.org/",
    color: "text-yellow-600 dark:text-yellow-400",
  },
];

type CollectionResource = (typeof COLLECTION_RESOURCES)[number];

/**
 * The visitor's country, from the position the app already holds. Testers
 * were asked to pick their country's scheme although the app knew where they
 * were (PBI 13849).
 */
const useVisitorCountry = (): string | null => {
  const { latitude, longitude } = useSelector((state: RootState) => state.auth);
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    if (latitude == null || longitude == null) {
      setCountry(null);
      return;
    }
    let cancelled = false;
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=3`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setCountry(data?.address?.country_code ?? null);
      })
      .catch(() => {
        if (!cancelled) setCountry(null);
      });
    return () => { cancelled = true; };
  }, [latitude, longitude]);

  return country;
};

export default function RecycleInfo() {
  const { t } = useTranslation();
  const history = useHistory();
  const country = useVisitorCountry();
  const own = COLLECTION_RESOURCES.find((r) => r.country === country);
  const others = COLLECTION_RESOURCES.filter((r) => r !== own);

  const renderResource = (r: CollectionResource, highlighted = false) => (
    <a
      key={r.nameKey}
      href={r.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-4 p-4 rounded-xl border ${
        highlighted
          ? "border-customgreen-500 dark:border-customgreen-500"
          : "border-gray-200 dark:border-gray-700"
      } bg-gray-50 dark:bg-gray-700 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900 dark:hover:bg-opacity-30 dark:hover:border-green-600 transition-all`}
    >
      <span className={`material-symbols-outlined text-2xl ${r.color}`}>{r.icon}</span>
      <div>
        <p className="font-semibold text-gray-800 dark:text-white">{t(r.nameKey)}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t(r.descKey)}</p>
      </div>
      <span className="ml-auto material-symbols-outlined text-gray-400">open_in_new</span>
    </a>
  );

  return (
    // Main.tsx already provides the centred container and horizontal padding;
    // adding another one here doubled the padding and threw the page off-centre.
    <div className="w-full flex flex-col items-center py-10">
      <div className="w-full space-y-8 max-w-3xl">

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            {/* green, not emerald: Tailwind 2 here has no emerald palette, only
                the few emerald classes sidebar-colors.css defines. */}
            <span className="material-symbols-outlined text-5xl text-green-500">recycling</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('recycleInfo.title')}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {t('recycleInfo.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Why recycle */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-green-500">lightbulb</span>
            {t('recycleInfo.whyItMatters')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col items-center text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
              <span className="material-symbols-outlined text-3xl text-green-600 dark:text-emerald-400 mb-2">inventory_2</span>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">{t('recycleInfo.recoverMaterials')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('recycleInfo.recoverMaterialsDesc')}
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
              {/* Was no_crash, a car: testers read "car + toxic waste". */}
              <span className="material-symbols-outlined text-3xl text-blue-600 dark:text-blue-400 mb-2">warning</span>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">{t('recycleInfo.preventToxicWaste')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('recycleInfo.preventToxicWasteDesc')}
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
              <span className="material-symbols-outlined text-3xl text-purple-600 dark:text-purple-400 mb-2">co2</span>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">{t('recycleInfo.reduceCO2')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('recycleInfo.reduceCO2Desc')}
              </p>
            </div>
          </div>
        </div>

        {/* Collection points */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500">location_on</span>
            {t('recycleInfo.findCollectionPoint')}
          </h2>
          {own ? (
            <>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">{t('recycleInfo.forYourPosition')}</p>
              {renderResource(own, true)}
              <p className="mt-6 mb-2 text-sm text-gray-500 dark:text-gray-400">{t('recycleInfo.otherCountries')}</p>
              <div className="space-y-4">{others.map((r) => renderResource(r))}</div>
            </>
          ) : (
            <div className="space-y-4">{COLLECTION_RESOURCES.map((r) => renderResource(r))}</div>
          )}
        </div>

        {/* Tip */}
        <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-gray-800 border border-yellow-200 dark:border-gray-700 rounded-xl text-sm text-yellow-800 dark:text-yellow-200">
          <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 mt-0.5">tips_and_updates</span>
          <span>
            <strong>{t('recycleInfo.goodToKnow')}</strong> {t('recycleInfo.goodToKnowText')}
          </span>
        </div>

        {/* Back button */}
        <div className="flex justify-start pb-6">
          <button
            onClick={() => history.goBack()}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            {t('recycleInfo.goBack')}
          </button>
        </div>
      </div>
    </div>
  );
}
