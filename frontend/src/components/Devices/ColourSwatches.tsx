import { useTranslation } from "react-i18next";
import { colourLabel, swatchBackground } from "../../utils/colours";

// Beyond these, "+N": a card is not a palette.
const MAX_SWATCHES = 5;

/**
 * The colours a model's variants come in, as swatches; nothing when they
 * are fewer than two, since one colour tells no variant apart.
 */
const ColourSwatches = ({ colours }: { colours: string[] }) => {
  const { t } = useTranslation();
  const shown = colours.filter((c) => swatchBackground(c) !== null);
  if (shown.length < 2) return null;
  const swatches = shown.slice(0, MAX_SWATCHES);
  const more = shown.length - swatches.length;
  return (
    <div className="flex items-center gap-1">
      {swatches.map((colour) => (
        <span
          key={colour}
          title={colourLabel(colour)}
          aria-label={colourLabel(colour)}
          className="inline-block w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600"
          style={{ background: swatchBackground(colour) ?? undefined }}
        />
      ))}
      {more > 0 && (
        <span title={t("devicesComponent.moreColours", { count: more })}>+{more}</span>
      )}
    </div>
  );
};

export default ColourSwatches;
