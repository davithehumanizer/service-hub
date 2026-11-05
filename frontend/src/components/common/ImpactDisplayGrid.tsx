import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  Co2SavedIcon,
  CarTripAvoidedIcon,
} from '../../icons';
import { ImpactMetrics } from '../../services/deviceService';

interface ImpactDisplayGridProps {
  impactMetrics: ImpactMetrics;
  /** Side by side on a phone, where the cards stacked to 500px. */
  compact?: boolean;
}

const link = (href: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="underline" />
);

/**
 * Two figures, each with its source: the CO2e a repair avoids, from The
 * Restart Project's reference data, and the same in kilometres of a car, from
 * ADEME. Water, showers, plastic bottles and trees are gone: none had one.
 */
const ImpactDisplayGrid: React.FC<ImpactDisplayGridProps> = ({ impactMetrics, compact = false }) => {
  const { t } = useTranslation();
  const impactCards = [
    {
      value: `${impactMetrics.co2.toFixed(2)} kg`,
      label: t('impactGrid.co2Saved'),
      icon: <Co2SavedIcon />,
    },
    {
      value: `${impactMetrics.equivalents.carKm.toFixed(1)} km`,
      label: t('impactGrid.carTripAvoided'),
      icon: <CarTripAvoidedIcon />,
    },
  ];

  return (
    <>
      {/* Two figures fit side by side on a phone, where stacked they filled
          the screen. */}
      <div className={compact ? "mt-3 sm:mt-6 grid grid-cols-2 gap-2 sm:gap-5" : "mt-6 grid grid-cols-2 gap-3 sm:gap-5"}>
        {impactCards.map((card, index) => (
          <div key={index} className={`flex flex-col items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-900 text-center ${compact ? "p-2 sm:p-6" : "p-3 sm:p-6"}`}>
            <div className={`flex items-center justify-center rounded-full bg-customgreen-500 bg-opacity-10 text-customgreen-500 ${compact ? "w-8 h-8 sm:w-12 sm:h-12" : "w-10 h-10 sm:w-12 sm:h-12"}`}>
              {card.icon}
            </div>
            <p className={`font-bold text-gray-900 dark:text-white ${compact ? "mt-2 sm:mt-4 text-base sm:text-2xl" : "mt-3 sm:mt-4 text-lg sm:text-2xl"}`}>{card.value}</p>
            <p className={`text-gray-500 dark:text-gray-400 ${compact ? "text-xs sm:text-sm" : "text-sm"}`}>{card.label}</p>
          </div>
        ))}
      </div>
      {/* An average drawn from one or two products is not worth the same as one
          drawn from 250. Saying so is cheaper than pretending otherwise. The
          reference data is CC BY 4.0: credit, title, licence and links. */}
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        <Trans
          i18nKey="impactGrid.source"
          values={{
            category: impactMetrics.reference.category,
            count: impactMetrics.reference.products,
          }}
          components={{
            restart: link('https://therestartproject.org/fixometer-2/'),
            dataset: link('https://zenodo.org/records/5900046'),
            licence: link('https://creativecommons.org/licenses/by/4.0/'),
          }}
        />
      </p>
      <details className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        <summary className="cursor-pointer font-medium text-customgreen-600 dark:text-customgreen-400 hover:underline">
          {t('impactGrid.howTitle')}
        </summary>
        <p className="mt-2">{t('impactGrid.howRepair')}</p>
        <p className="mt-2">
          <Trans
            i18nKey="impactGrid.howCar"
            components={{
              ademe: link('https://impactco2.fr/outils/transport/voiturethermique'),
            }}
          />
        </p>
      </details>
    </>
  );
};

export default ImpactDisplayGrid;
