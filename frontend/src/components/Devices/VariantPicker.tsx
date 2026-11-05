import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Loader, Pagination, Text, TextInput } from "@mantine/core";
import { DeviceModelVariant } from "../../models/deviceModel";
import { deviceModelService } from "../../services/deviceModelService";

const VARIANTS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 300;

/** A variant as one reads it: what tells it apart, else its reference. */
export const variantName = (variant: { variant_label?: string | null; product_code?: string; model: string }) =>
  variant.variant_label || variant.product_code || variant.model;

type Props = {
  modelId: number;
  /** The model's brand: a variant sold under another is a reseller's. */
  modelBrand: string;
  variantCount: number;
  chosenId: number | null;
  /** The chosen variant, kept in sight on top when off the page on display. */
  chosen: DeviceModelVariant | null;
  /** The variant clicked, or null when the chosen one is clicked again. */
  onChoose: (variant: DeviceModelVariant | null) => void;
  /** Only the variants with these parts: a configuration's references. */
  parts?: Record<string, string>;
};

/**
 * A model's variants, ten per page, searched by what tells them apart past
 * ten: on the model's page and in "My devices", where one names one's own.
 */
const VariantPicker = ({ modelId, modelBrand, variantCount, chosenId, chosen, onChoose, parts }: Props) => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<DeviceModelVariant[] | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  // The variants are searched once the typing stops.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const partsKey = JSON.stringify(parts ?? {});
  useEffect(() => setPage(1), [partsKey]);

  useEffect(() => {
    let current = true;
    setLoading(true);
    deviceModelService
      .get(modelId, { page, limit: VARIANTS_PER_PAGE, search: query || undefined, parts })
      .then((found) => {
        if (!current) return;
        setVariants(found.variants.data);
        setTotalPages(found.variants.pagination.totalPages);
      })
      .catch(() => current && setVariants([]))
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [modelId, page, query, partsKey]);

  if (variants === null) return <Loader size="sm" />;

  // A choice off this page, a link's or an earlier page's, stays in sight on top.
  const pinned = chosen && chosen.device_id === chosenId && !variants.some((v) => v.device_id === chosenId);
  const rows = pinned && chosen ? [chosen, ...variants] : variants;

  return (
    <div className="space-y-3">
      {variantCount > VARIANTS_PER_PAGE && (
        <TextInput
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          placeholder={t("modelDetails.searchVariants")}
          aria-label={t("modelDetails.searchVariants")}
          leftSection={<span className="material-symbols-outlined text-base">search</span>}
          rightSection={loading ? <Loader size="xs" /> : null}
        />
      )}
      {rows.length > 0 && (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map((row) => {
            const selected = row.device_id === chosenId;
            const seller = row.brand.trim().toLowerCase() !== modelBrand.trim().toLowerCase() ? row.brand : null;
            // A configuration's references all read alike: the reference names them.
            const byReference = Boolean(parts && row.product_code);
            const details = [
              !byReference && row.product_code && `${t("modelDetails.reference")} ${row.product_code}`,
              row.ean && `EAN ${row.ean}`,
              seller && t("modelDetails.soldBy", { seller }),
            ].filter(Boolean);
            return (
              <li key={row.device_id}>
                <button
                  type="button"
                  onClick={() => onChoose(selected ? null : row)}
                  aria-pressed={selected}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-start gap-3 ${
                    selected ? "bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20" : "hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-base mt-0.5 ${
                      selected ? "text-blue-600 dark:text-blue-400" : "text-gray-300 dark:text-gray-600"
                    }`}
                  >
                    {selected ? "radio_button_checked" : "radio_button_unchecked"}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-gray-800 dark:text-gray-200 break-words">
                      {byReference ? `${t("modelDetails.reference")} ${row.product_code}` : variantName(row)}
                    </span>
                    {details.length > 0 && (
                      <span className="block text-xs text-gray-500 dark:text-gray-400 break-words">
                        {details.join(" · ")}
                      </span>
                    )}
                  </span>
                  {row.is_refurbished && (
                    <Badge size="sm" variant="light" color="teal">{t("modelDetails.refurbished")}</Badge>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {variants.length === 0 && <Text size="sm" c="dimmed">{t("modelDetails.noVariantFound")}</Text>}
      {totalPages > 1 && (
        <div className="flex justify-center">
          {/* Narrower gaps: nine controls fit on a phone. */}
          <Pagination total={totalPages} value={page} onChange={setPage} size="sm" gap={4} />
        </div>
      )}
    </div>
  );
};

export default VariantPicker;
