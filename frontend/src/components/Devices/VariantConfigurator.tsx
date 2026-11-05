import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader } from "@mantine/core";
import { DeviceModelVariant, VariantFacet } from "../../models/deviceModel";
import { deviceModelService } from "../../services/deviceModelService";
import { swatchBackground } from "../../utils/colours";
import VariantPicker from "./VariantPicker";

// Past these, "+N": a long list of processors opens on demand.
const VALUES_SHOWN = 6;
// What one knows of one's device first, the technical rest folded: a laptop
// differs in up to nine parts, a phone in two.
const FACET_ORDER = ["storage", "colour", "ram", "display", "processor", "graphics", "os", "keyboard", "sim"];
const FACETS_SHOWN = 3;

type Props = {
  modelId: number;
  /** The model's brand: a variant sold under another is a reseller's. */
  modelBrand: string;
  /** What a configuration is read after: "Galaxy S23 · 256 GB · Green". */
  modelName: string;
  variantCount: number;
  chosenId: number | null;
  chosen: DeviceModelVariant | null;
  /** The variant the parts chosen name, or null while they name none. */
  onChoose: (variant: DeviceModelVariant | null) => void;
  /** The first variant a partial choice leaves, or null: what to show meanwhile. */
  onPreview?: (variant: DeviceModelVariant | null) => void;
};

const without = (selection: Record<string, string>, key: string) =>
  Object.fromEntries(Object.entries(selection).filter(([k]) => k !== key));

/**
 * A model's variants as one picks a phone: each part they differ in, its
 * storage, its colour…, the values the parts already chosen leave counted,
 * the others dimmed. What one knows is enough; a whole configuration names
 * its variant, the maker's before a reseller's, its references and sellers
 * one click further. Variants told apart by their reference or seller
 * alone are listed, folded.
 */
const VariantConfigurator = ({
  modelId,
  modelBrand,
  modelName,
  variantCount,
  chosenId,
  chosen,
  onChoose,
  onPreview,
}: Props) => {
  const { t } = useTranslation();
  const [selection, setSelection] = useState<Record<string, string>>({});
  // A click's, not the variant a link or "My devices" names, which is kept.
  const [touched, setTouched] = useState(false);
  const [facets, setFacets] = useState<VariantFacet[] | null>(null);
  const [configurations, setConfigurations] = useState(0);
  const [matching, setMatching] = useState(variantCount);
  const [best, setBest] = useState<DeviceModelVariant | null>(null);
  const [opened, setOpened] = useState<string[]>([]);
  const [allFacets, setAllFacets] = useState(false);
  const [showReferences, setShowReferences] = useState(Boolean(chosenId));

  // The variant named on arrival: its parts are what is chosen.
  useEffect(() => {
    if (!chosenId || touched) return;
    if (chosen?.device_id === chosenId && chosen.variant_parts) {
      setSelection(chosen.variant_parts);
      return;
    }
    let current = true;
    deviceModelService
      .get(modelId, { limit: 1, variant: chosenId })
      .then((found) => current && setSelection(found.variants.data[0]?.variant_parts ?? {}))
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [modelId, chosenId]);

  const selectionKey = JSON.stringify(selection);
  useEffect(() => {
    let current = true;
    deviceModelService
      .get(modelId, { limit: 1, parts: selection })
      .then((found) => {
        if (!current) return;
        setFacets(
          [...found.facets].sort((a, b) => FACET_ORDER.indexOf(a.key) - FACET_ORDER.indexOf(b.key)),
        );
        setConfigurations(found.configurations);
        setMatching(found.variants.pagination.total);
        setBest(found.variants.data[0] ?? null);
      })
      .catch(() => current && setFacets([]));
    return () => {
      current = false;
    };
  }, [modelId, selectionKey]);

  const available = (facet: VariantFacet) => facet.values.filter((v) => v.count > 0);
  // Each part chosen, or left with one value by the others.
  const determined =
    !!facets && facets.length > 0 && facets.every((f) => selection[f.key] || available(f).length === 1);

  // A choice made here names its configuration's first variant; one undone
  // names none. A reference picked from the list is left as it is.
  useEffect(() => {
    if (!touched || !facets) return;
    if (determined) {
      if (best && best.device_id !== chosenId) onChoose(best);
    } else if (chosenId) {
      onChoose(null);
    }
  }, [best, facets]);

  // A partial choice is shown by one of its variants, not by the model's own.
  useEffect(() => {
    if (!facets) return;
    onPreview?.(Object.keys(selection).length > 0 && !determined ? best : null);
  }, [best, facets]);

  const pick =(key: string, value: string, count: number) => {
    setTouched(true);
    setShowReferences(false);
    setSelection((current) =>
      current[key] === value
        ? without(current, key)
        : // A value the others rule out starts the choice over from it.
          count > 0
          ? { ...current, [key]: value }
          : { [key]: value },
    );
  };

  const reset = () => {
    setTouched(true);
    setSelection({});
    setShowReferences(false);
    if (chosenId) onChoose(null);
  };

  if (facets === null) return <Loader size="sm" />;

  if (facets.length === 0) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowReferences((shown) => !shown)}
          aria-expanded={showReferences}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          <span className="material-symbols-outlined text-base">{showReferences ? "expand_less" : "expand_more"}</span>
          {t("modelDetails.configurator.allReferences", { count: variantCount })}
        </button>
        {showReferences && (
          <VariantPicker
            modelId={modelId}
            modelBrand={modelBrand}
            variantCount={variantCount}
            chosenId={chosenId}
            chosen={chosen}
            onChoose={onChoose}
          />
        )}
      </div>
    );
  }

  const label = (key: string) => t(`modelDetails.parts.${key}`);
  const shownValues = facets
    .map((f) => selection[f.key] ?? (Object.keys(selection).length > 0 && available(f).length === 1 ? available(f)[0].value : null))
    .filter((value): value is string => Boolean(value));
  const missing = facets.filter((f) => !selection[f.key] && available(f).length > 1);
  // A part chosen stays in sight, folded or not.
  const shownFacets = allFacets
    ? facets
    : facets.filter((f, i) => i < FACETS_SHOWN || selection[f.key]);
  const folded = facets.length - shownFacets.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("modelDetails.configurator.summary", { configurations, count: variantCount })}
        </p>
        {Object.keys(selection).length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:underline"
          >
            {t("modelDetails.configurator.dontKnow")}
          </button>
        )}
      </div>

      {shownFacets.map((facet) => {
        const open = opened.includes(facet.key);
        // A value chosen stays in sight, folded or not.
        const values = open
          ? facet.values
          : facet.values.filter((v, i) => i < VALUES_SHOWN || v.value === selection[facet.key]);
        return (
          <div key={facet.key}>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{label(facet.key)}</p>
            <div className="flex flex-wrap gap-2">
              {values.map(({ value, count }) => {
                const selected = selection[facet.key] === value;
                // Icecat's "Aluminium,Black", which the parts write with a slash.
                const swatch = facet.key === "colour" ? swatchBackground(value.replace(/\//g, ",")) : null;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => pick(facet.key, value, count)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      selected
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:bg-opacity-20 dark:text-blue-300"
                        : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-gray-400"
                    } ${count === 0 && !selected ? "opacity-50" : ""}`}
                  >
                    {swatch && (
                      <span
                        className="inline-block w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600"
                        style={{ background: swatch }}
                      />
                    )}
                    <span>{value.split("/").join(" / ")}</span>
                    {count > 0 && (
                      <span className={`text-xs ${selected ? "text-blue-600 dark:text-blue-300" : "text-gray-400"}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
              {facet.values.length > VALUES_SHOWN && (
                <button
                  type="button"
                  onClick={() =>
                    setOpened((keys) => (open ? keys.filter((k) => k !== facet.key) : [...keys, facet.key]))
                  }
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {open
                    ? t("modelDetails.configurator.less")
                    : t("modelDetails.configurator.more", { count: facet.values.length - VALUES_SHOWN })}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {facets.length > FACETS_SHOWN && (
        <button
          type="button"
          onClick={() => setAllFacets((all) => !all)}
          aria-expanded={allFacets}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          <span className="material-symbols-outlined text-base">{allFacets ? "expand_less" : "expand_more"}</span>
          {allFacets
            ? t("modelDetails.configurator.fewerParts")
            : t("modelDetails.configurator.moreParts", { count: folded })}
        </button>
      )}

      <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
        {shownValues.length === 0 ? (
          <p className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="material-symbols-outlined text-base">info</span>
            {t("modelDetails.configurator.hint")}
          </p>
        ) : (
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white break-words">
              <span className="material-symbols-outlined text-base text-customgreen-500">check_circle</span>
              {[modelName, ...shownValues].join(" · ")}
            </p>
            <p className="pl-6 text-sm text-gray-500 dark:text-gray-400">
              {missing.length > 0 &&
                `${t("modelDetails.configurator.refine", {
                  parts: missing.map((f) => label(f.key).toLowerCase()).join(", "),
                })} `}
              {t("modelDetails.configurator.matching", { count: matching })}
              {determined && (
                <>
                  {" · "}
                  <button
                    type="button"
                    onClick={() => setShowReferences((shown) => !shown)}
                    aria-expanded={showReferences}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {showReferences
                      ? t("modelDetails.configurator.hideReferences")
                      : t("modelDetails.configurator.showReferences")}
                  </button>
                </>
              )}
            </p>
          </div>
        )}
        {determined && showReferences && (
          <div className="mt-3">
            <VariantPicker
              modelId={modelId}
              modelBrand={modelBrand}
              variantCount={matching}
              chosenId={chosenId}
              chosen={chosen}
              onChoose={(variant) => onChoose(variant ?? best)}
              parts={selection}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default VariantConfigurator;
