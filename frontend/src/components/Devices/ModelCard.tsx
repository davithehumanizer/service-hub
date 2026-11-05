import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DeviceModel } from "../../models/deviceModel";
import { swatchBackground } from "../../utils/colours";
import ColourSwatches from "./ColourSwatches";
import DeviceIcon from "./DeviceIcon";
import DeviceImage from "./DeviceImage";

/**
 * A device model in a list of results: one card per model, however many
 * variants it has. No reference nor category, which told identical entries
 * apart badly (PBI 13848); its colours as swatches when they tell its
 * variants apart, and how many variants it has.
 */
const ModelCard = ({
  model,
  onClick,
  selected,
  showDetailsButton = false,
  variantId,
  color = "customgreen",
  onViewDetails,
}: {
  model: DeviceModel;
  onClick?: () => void;
  selected?: boolean;
  showDetailsButton?: boolean;
  /** The variant the details open on: the one a barcode named. */
  variantId?: number | null;
  color?: string;
  /** Called before leaving for the details: to keep the search behind. */
  onViewDetails?: () => void;
}) => {
  const { t } = useTranslation();
  // One colour tells no variant apart.
  const hasSwatches = model.colours.filter((c) => swatchBackground(c) !== null).length >= 2;
  const deviceType = model.categories[0]?.canonicalName ?? model.categories[0]?.name ?? "";
  const imageUrls = model.thumbnail ? [model.thumbnail] : [];
  const detailsHref = `/app/model/${model.id}${variantId ? `?variant=${variantId}` : ""}`;

  return (
    <div
      className={`relative p-6 rounded-xl border-2 transition-all duration-300 cursor-pointer overflow-hidden ${
        selected
          ? `border-${color}-500 bg-${color}-50 bg-opacity-50 dark:bg-${color}-900 dark:bg-opacity-20 shadow-lg`
          : `border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 dark:bg-opacity-60 hover:border-${color}-200 dark:hover:border-${color}-700 hover:shadow-xl transform hover:-translate-y-1`
      }`}
      onClick={onClick}
    >
      {selected && (
        <div className="absolute top-3 right-3">
          <span className={`material-symbols-outlined text-${color}-600 dark:text-${color}-400 text-xl`}>
            check_circle
          </span>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <DeviceImage
              urls={imageUrls}
              alt={model.name}
              wrapperClassName="w-12 h-12 rounded-lg bg-white p-1 border border-gray-100 dark:border-gray-800 flex items-center justify-center overflow-hidden shadow-sm"
              className="object-contain max-w-full max-h-full"
              fallback={
                <DeviceIcon
                  deviceType={deviceType}
                  className={`text-2xl text-${color}-600 dark:text-${color}-400 mt-1`}
                />
              }
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-0.5 truncate">
              {model.name}
            </h3>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{model.brand}</p>
          </div>
        </div>

        {(hasSwatches || model.variant_count >= 2) && (
          <div className="flex items-center flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
            <ColourSwatches colours={model.colours} />
            {model.variant_count >= 2 && (
              <span>{t("devicesComponent.variantCount", { count: model.variant_count })}</span>
            )}
          </div>
        )}

        {(showDetailsButton || selected) && (
          <Link
            to={detailsHref}
            target={showDetailsButton ? undefined : "_blank"}
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails?.();
            }}
            className={`mt-2 ${showDetailsButton ? "inline-flex" : "hidden sm:inline-flex"} items-center gap-1 text-xs font-medium text-${color}-600 dark:text-${color}-400 hover:underline`}
          >
            <span className="material-symbols-outlined text-sm">
              {showDetailsButton ? "info" : "open_in_new"}
            </span>
            {t(showDetailsButton ? "devicesComponent.viewDetails" : "devicesComponent.viewFullSheet")}
          </Link>
        )}
      </div>
    </div>
  );
};

export default ModelCard;
