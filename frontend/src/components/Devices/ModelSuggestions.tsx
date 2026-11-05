import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DeviceModel } from "../../models/deviceModel";
import { deviceModelService } from "../../services/deviceModelService";

const SUGGESTED = 5;
const DEBOUNCE_MS = 400;
/** Below this, a name matches half the catalogue and suggests nothing. */
const MIN_NAME_LENGTH = 2;

type Props = {
  brand: string;
  name: string;
  onPick: (model: DeviceModel) => void;
};

/**
 * The models the catalogue already has under what is being typed, offered
 * before a new one is made: a model typed in twice is two models.
 */
const ModelSuggestions = ({ brand, name, onPick }: Props) => {
  const { t } = useTranslation();
  const [models, setModels] = useState<DeviceModel[]>([]);

  useEffect(() => {
    if (name.trim().length < MIN_NAME_LENGTH) {
      setModels([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      deviceModelService
        .search({ search: `${brand} ${name}`.trim(), limit: SUGGESTED, signal: controller.signal })
        .then((page) => setModels(page.data))
        .catch(() => undefined);
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [brand, name]);

  if (models.length === 0) return null;

  return (
    <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-gray-900 p-3 space-y-2">
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t("modelSuggestions.title")}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400">{t("modelSuggestions.hint")}</p>
      </div>
      <ul className="space-y-1">
        {models.map((model) => (
          <li key={model.id}>
            <button
              type="button"
              onClick={() => onPick(model)}
              className="w-full text-left rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-400 px-3 py-2"
            >
              <span className="block text-sm font-medium text-gray-800 dark:text-gray-100 break-words">
                {model.brand} {model.name}
              </span>
              {model.categories[0] && (
                <span className="block text-xs text-gray-500 dark:text-gray-400">{model.categories[0].name}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ModelSuggestions;
