import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useMediaQuery } from '@mantine/hooks';
import { Select } from '@mantine/core';
import { deviceService } from '../services/deviceService';
import { deviceModelService } from '../services/deviceModelService';
import { repairMonitorService } from '../services/repairMonitorService';
import { setSearchSelectedModel, setDevice, setAllowNextStep, setSearchFilters, setSearchFoundModels } from '../stores/repairWorkflowSlice';
import { startNewJourney } from '../utils/journeySession';
import { setGlobalDevice, clearGlobalDevice } from '../stores/deviceSlice';
import { getCategoryIcon } from '../components/Wizard/Steps/DeviceSearch/types';
import { DeviceModel } from '../models/deviceModel';
import { Device } from '../models/device';
import BarcodeScanner, { hasCamera } from '../components/BarcodeScanner';
import PhotoHandoffPanel from '../components/Wizard/Steps/DeviceSearch/PhotoHandoffPanel';

interface PlatformStats {
  totalRepairs: number;
  totalDevices: number;
  totalRepairers: number;
}

interface CategoryItem {
  name: string;       // display name (translated label or canonical)
  filterName: string; // canonical DB name for filter key
  icon: string;
  count: number;      // devices actually behind the category
}

const CATEGORIES_MAX = 8;
// A chip is only worth showing if it leads somewhere. Relative to the catalogue
// size so it holds on a 600-device test base as well as on a 1M-device one.
const CATEGORY_MIN_DEVICES = 10;
const CATEGORY_MIN_SHARE = 0.001;
// Real categories, but poor entry points on a home page (accessories, catch-all buckets).
const CATEGORY_EXCLUDED = new Set([
  'Keyboard (computer)',
  'Mouse',
  'Mobile Device Keyboards',
  'Video Cable Adapters',
  'Interface Hubs',
  'Cable Locks',
  'Not Categorized',
]);
// The dropdown's last entry, to the full library.
const MORE_CATEGORIES = '__more';
const AUTOCOMPLETE_MIN_CHARS = 2;
const AUTOCOMPLETE_DEBOUNCE_MS = 300;
const AUTOCOMPLETE_MAX_RESULTS = 8;

// Compact for the small stat chips ("1,1 M"), full for the hero line where the
// exact figure is the argument ("1 111 717").
function formatCompact(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

function formatFull(n: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(n);
}

interface HomeSearch {
  query?: string;
  chosen?: { model: DeviceModel; device: Device | null };
  notListed?: boolean;
}

const HOME_SEARCH_KEY = 'home.search';

const readHomeSearch = (): HomeSearch => {
  try {
    return JSON.parse(sessionStorage.getItem(HOME_SEARCH_KEY) || '{}');
  } catch {
    return {};
  }
};

const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const history = useHistory();
  const dispatch = useDispatch();
  // A placeholder can't be swapped by CSS, and the full question overflows the
  // field on a phone — German runs to 44 characters. Matches Tailwind's `sm`.
  const isNarrow = useMediaQuery('(max-width: 639px)', false);

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  // Coming Back to the page found an empty bar and the device forgotten
  // (PBI 13839): where the search stood is kept for the tab, and restored on
  // Back or Forward only; the menu's "Accueil" still opens a fresh page.
  const [restored] = useState<HomeSearch>(() => (history.action === 'POP' ? readHomeSearch() : {}));
  const skipRestoredSearch = useRef(!!(restored.chosen || restored.notListed));
  const [searchQuery, setSearchQuery] = useState(restored.query ?? '');
  const [suggestions, setSuggestions] = useState<DeviceModel[]>([]);
  // The variant a barcode typed in names, with its model.
  const [identified, setIdentified] = useState<{ modelId: number; deviceId: number } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [noResults, setNoResults] = useState(false);
  // Results came, but not the user's device.
  const [notListed, setNotListed] = useState(!!restored.notListed);
  // The device picked, and what to do with it asked before going anywhere:
  // every entry used to lead to the repair journey, even for a part.
  const [chosen, setChosen] = useState<HomeSearch['chosen'] | null>(restored.chosen ?? null);
  useEffect(() => {
    try {
      sessionStorage.setItem(HOME_SEARCH_KEY, JSON.stringify({ query: searchQuery, chosen, notListed }));
    } catch {
      // Without storage, Back finds an empty bar as before.
    }
  }, [searchQuery, chosen, notListed]);
  const [scanMode, setScanMode] = useState<'scan' | 'handoff' | null>(null);
  // A scanned code that names one device goes straight to the choice.
  const scannedRef = useRef(false);
  const [scanCount, setScanCount] = useState(0);
  // Set once the area under the bar has swapped, so the figures and steps
  // animate back in but not on the first load.
  const swappedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load platform stats and device categories, again on a language change:
  // the category labels come back translated for the locale sent.
  // Categories are ranked by how many models actually sit behind them (facets),
  // not by the alphabetical order the filters endpoint happens to return.
  useEffect(() => {
    repairMonitorService.getPlatformSummary().then(setStats).catch(() => {});

    Promise.all([
      deviceService.getFilters(),
      deviceModelService.search({ page: 1, limit: 1 }),
    ]).then(([filters, page]) => {
      const labels = new Map<string, string>();
      for (const f of filters) {
        if (f.category !== 'device_category') continue;
        const canonicalName = f.name?.trim();
        if (!canonicalName) continue;
        labels.set(canonicalName, (f.label ?? f.name)?.trim() || canonicalName);
      }
      const minCount = Math.max(
        CATEGORY_MIN_DEVICES,
        (page.pagination?.total ?? 0) * CATEGORY_MIN_SHARE,
      );
      const items: CategoryItem[] = Object.entries(page.categoryFacets ?? {})
        .filter(([name, count]) => count >= minCount && !CATEGORY_EXCLUDED.has(name))
        .sort((a, b) => b[1] - a[1])
        .slice(0, CATEGORIES_MAX)
        .map(([name, count]) => ({
          name: labels.get(name) ?? name,
          filterName: name,
          icon: getCategoryIcon(name),
          count,
        }));
      setCategories(items);
    }).catch(() => {}).finally(() => setCategoriesLoading(false));
  }, [i18n.language]);

  // Autocomplete with debounce + abort previous request
  useEffect(() => {
    // A choice restored on Back stays shown: the search would reopen the
    // list over it.
    if (skipRestoredSearch.current) {
      skipRestoredSearch.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (searchQuery.length < AUTOCOMPLETE_MIN_CHARS) {
      setSuggestions([]);
      setIdentified(null);
      setShowSuggestions(false);
      setIsSearching(false);
      setNoResults(false);
      setActiveIndex(-1);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsSearching(true);
      try {
        const response = await deviceModelService.search({
          search: searchQuery,
          limit: AUTOCOMPLETE_MAX_RESULTS,
          strict: false,
          signal: controller.signal,
        });
        setSuggestions(response.data);
        setIdentified(
          response.variant && response.data[0]
            ? { modelId: response.data[0].id, deviceId: response.variant.device_id }
            : null,
        );
        setNoResults(response.data.length === 0);
        setActiveIndex(response.data.length > 0 ? 0 : -1);
        const scanned = scannedRef.current;
        scannedRef.current = false;
        if (scanned && response.variant && response.data[0]) {
          chooseModel(response.data[0], response.variant.device_id);
        } else {
          setShowSuggestions(true);
        }
      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return;
        setSuggestions([]);
        setIdentified(null);
        setNoResults(false);
        setActiveIndex(-1);
      } finally {
        if (abortControllerRef.current === controller) {
          setIsSearching(false);
          abortControllerRef.current = null;
        }
      }
    }, AUTOCOMPLETE_DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, scanCount]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const chooseModel = useCallback(async (model: DeviceModel, variantId: number | null) => {
    // A search still on its way would reopen the list over the choice.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortControllerRef.current?.abort();
    setShowSuggestions(false);
    setChosen({ model, device: null });
    let device: Device;
    try {
      device = await deviceModelService.deviceOf(model, variantId);
    } catch (error) {
      console.error("The model's variant could not be read:", error);
      device = deviceModelService.modelAlone(model);
    }
    setChosen((current) => (current?.model.id === model.id ? { model, device } : current));
  }, []);

  const handleSelectDevice = useCallback((model: DeviceModel) => {
    chooseModel(model, identified?.modelId === model.id ? identified.deviceId : null);
  }, [chooseModel, identified]);

  const repairIt = (model: DeviceModel, device: Device) => {
    startNewJourney(dispatch);
    dispatch(setSearchFilters(searchQuery ? [searchQuery] : []));
    // Empty, not [model]: the wizard only searches when the list is empty, and
    // the pick is carried by setSearchSelectedModel below, which pins it on
    // top of the results the search brings back.
    dispatch(setSearchFoundModels([]));
    dispatch(setSearchSelectedModel(model));
    dispatch(setDevice(device));
    dispatch(setAllowNextStep(true));
    history.push('/app/wizard');
  };

  const findRepairer = (device: Device | null) => {
    // The map's banner reads the journey's symptoms and the global device: an
    // earlier journey's would be shown for this search.
    startNewJourney(dispatch);
    dispatch(device ? setGlobalDevice(device) : clearGlobalDevice());
    history.push('/app/repair-map?type=repairer');
  };

  // Repairing and finding a repairer need the device read first.
  const intents = ({ model, device }: { model: DeviceModel; device: Device | null }) => [
    { key: 'repair', icon: 'build', color: 'green', primary: true,
      go: device ? () => repairIt(model, device) : undefined },
    { key: 'parts', icon: 'build_circle', color: 'orange', primary: false,
      go: () => history.push(`/app/spare-parts?q=${encodeURIComponent(`${model.brand} ${model.name}`)}`) },
    { key: 'repairer', icon: 'map', color: 'purple', primary: false,
      go: device ? () => findRepairer(device) : undefined },
    { key: 'details', icon: 'menu_book', color: 'blue', primary: false,
      go: () => history.push(`/app/model/${model.id}${device?.device_id ? `?variant=${device.device_id}` : ''}`) },
  ];

  // The same choices for a device the search did not find, on what was typed.
  // The wizard then offers to add it by hand. A barcode is no use to a part or
  // tutorial search, which match words.
  const unknownIntents = (query: string, isCode: boolean) => [
    { key: 'repair', icon: 'build', color: 'green', primary: true, go: () => {
      startNewJourney(dispatch);
      dispatch(setSearchFoundModels([]));
      dispatch(setSearchFilters([query]));
      history.push('/app/wizard');
    } },
    ...(isCode ? [] : [{ key: 'parts', icon: 'build_circle', color: 'orange', primary: false,
      go: () => history.push(`/app/spare-parts?q=${encodeURIComponent(query)}`) }]),
    { key: 'repairer', icon: 'map', color: 'purple', primary: false, go: () => findRepairer(null) },
    ...(isCode ? [] : [{ key: 'tutorials', icon: 'menu_book', color: 'blue', primary: false,
      go: () => history.push(`/app/ifixit-tutorials/${encodeURIComponent(query)}`) }]),
  ];

  const handleCode = (code: string) => {
    setScanMode(null);
    setChosen(null);
    setNotListed(false);
    scannedRef.current = true;
    setSearchQuery(code);
    // The same code scanned again leaves the query as it was: count the scan
    // so the search runs all the same.
    setScanCount((count) => count + 1);
  };

  const startWithCategory = (filterName: string) => {
    startNewJourney(dispatch);
    dispatch(setSearchFoundModels([]));
    dispatch(setSearchFilters([`device_category_${filterName}`]));
    history.push('/app/wizard');
  };

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      return;
    }
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelectDevice(suggestions[activeIndex >= 0 ? activeIndex : 0]);
    }
  }, [showSuggestions, suggestions, activeIndex, handleSelectDevice]);

  const repairSteps = [
    { key: 'identify', icon: 'search' },
    { key: 'diagnose', icon: 'troubleshoot' },
    { key: 'repair', icon: 'build' },
    { key: 'recycle', icon: 'recycling' },
  ] as const;

  // What the testers came for, apart from a repair: one tap each (#13852).
  const lookingFor = [
    {
      to: '/app/devices',
      icon: 'devices',
      color: 'blue',
      titleKey: 'home.cards.deviceLibrary.title',
      descKey: 'home.cards.deviceLibrary.desc',
    },
    {
      to: '/app/spare-parts',
      icon: 'build_circle',
      color: 'orange',
      titleKey: 'nav.spareParts',
      descKey: 'home.cards.spareParts.desc',
    },
    {
      to: '/app/repair-map',
      icon: 'map',
      color: 'purple',
      titleKey: 'repairMap.title',
      descKey: 'home.cards.repairMap.desc',
    },
    {
      to: '/app/ifixit-tutorials',
      icon: 'menu_book',
      color: 'orange',
      titleKey: 'nav.tutorials',
      descKey: 'home.cards.tutorials.desc',
    },
  ];

  const tracking = [
    {
      to: '/app/fixometer',
      icon: 'eco',
      color: 'green',
      titleKey: 'nav.impactCalculator',
      descKey: 'home.cards.impactCalculator.desc',
    },
    {
      to: '/app/repair-monitor',
      icon: 'monitoring',
      color: 'teal',
      titleKey: 'repairMonitor.title',
      descKey: 'home.cards.repairMonitor.desc',
    },
  ];

  const colorMap: Record<string, string> = {
    blue: 'from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-600 dark:text-blue-400',
    orange: 'from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 text-orange-600 dark:text-orange-400',
    purple: 'from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 text-purple-600 dark:text-purple-400',
    green: 'from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 text-green-600 dark:text-green-400',
    teal: 'from-teal-100 to-teal-200 dark:from-teal-900/30 dark:to-teal-800/30 text-teal-600 dark:text-teal-400',
  };

  return (
    // Main.tsx already provides the centred container and horizontal padding;
    // adding another one here is what kept the page boxed in and double-padded.
    <div className="w-full py-8 text-gray-800 dark:text-gray-200">
      <div className="flex flex-col gap-8">

            {/* ── Header + primary task (#13750) ────────────────────────── */}
            {/* Same page-header grammar as every other tool page: icon in the
                tool's hue, 2xl title, sm subtitle, inside the house card. */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
              {/* The icon above the title on a phone: beside it, it took the
                  width the headline needed. */}
              <div className="flex flex-col sm:flex-row sm:items-center mb-5">
                <span className="material-symbols-outlined text-3xl text-customgreen-600 dark:text-customgreen-400 mb-2 sm:mb-0 sm:mr-3">dashboard</span>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {t('home.hero.headline')}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('home.hero.subtitle')}
                  </p>
                </div>
              </div>

              {/* Integrated search bar — the page's primary control */}
              <div ref={searchRef} className="relative mb-3">
                <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3 focus-within:ring-2 focus-within:ring-customgreen-500">
                  {isSearching ? (
                    <svg className="animate-spin text-customgreen-500 flex-shrink-0" style={{ width: 20, height: 20 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  ) : (
                    <span className="material-symbols-outlined text-customgreen-500 text-xl">search</span>
                  )}
                  <input
                    type="text"
                    className="flex-1 min-w-0 bg-transparent outline-none border-none text-gray-800 dark:text-gray-100 placeholder-gray-400 text-sm sm:text-base"
                    placeholder={isNarrow ? t('home.quickSearch.placeholderShort') : t('home.quickSearch.placeholder')}
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setChosen(null); setNotListed(false); }}
                    onFocus={() => (suggestions.length > 0 || noResults) && setShowSuggestions(true)}
                    onKeyDown={handleSearchKeyDown}
                    role="combobox"
                    aria-expanded={showSuggestions && suggestions.length > 0}
                    aria-controls="home-search-suggestions"
                    aria-autocomplete="list"
                    aria-activedescendant={activeIndex >= 0 && suggestions[activeIndex] ? `home-search-option-${suggestions[activeIndex].id}` : undefined}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(''); setSuggestions([]); setShowSuggestions(false); setNoResults(false); setChosen(null); setNotListed(false); }}
                      aria-label={t('home.quickSearch.clear')}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  )}
                  {!searchQuery && (
                    <button
                      onClick={() => setScanMode(hasCamera() ? 'scan' : 'handoff')}
                      aria-label={hasCamera() ? t('wizard.deviceSearch.scanBarcode') : t('wizard.deviceSearch.scanWithPhone')}
                      title={hasCamera() ? t('wizard.deviceSearch.scanBarcode') : t('wizard.deviceSearch.scanWithPhone')}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-customgreen-600 dark:text-customgreen-400 hover:bg-customgreen-50 dark:hover:bg-gray-600 flex-shrink-0"
                    >
                      <span className="material-symbols-outlined text-xl">barcode_scanner</span>
                    </button>
                  )}
                  {searchQuery.length >= AUTOCOMPLETE_MIN_CHARS && (
                    <button
                      onMouseDown={() => suggestions.length > 0 && handleSelectDevice(suggestions[activeIndex >= 0 ? activeIndex : 0])}
                      disabled={suggestions.length === 0}
                      aria-label={t('home.quickSearch.submit')}
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-customgreen-500 hover:bg-customgreen-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors flex-shrink-0"
                    >
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </button>
                  )}
                </div>
                {showSuggestions && suggestions.length > 0 && !notListed && (
                  <ul
                    id="home-search-suggestions"
                    role="listbox"
                    className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden"
                  >
                    {suggestions.map((model, idx) => (
                      <li key={model.id}>
                        <button
                          id={`home-search-option-${model.id}`}
                          role="option"
                          aria-selected={idx === activeIndex}
                          className={`w-full text-left px-4 py-2.5 flex items-center gap-3 ${idx === activeIndex ? 'bg-customgreen-50 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onMouseDown={() => handleSelectDevice(model)}
                        >
                          <span className="material-symbols-outlined text-customgreen-500 text-base">
                            {getCategoryIcon(model.categories?.[0]?.canonicalName ?? model.categories?.[0]?.name ?? '')}
                          </span>
                          <span className="text-sm text-gray-800 dark:text-gray-200">
                            <strong>{model.brand}</strong> {model.name}
                          </span>
                          {model.variant_count >= 2 && (
                            <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">
                              {t('devicesComponent.variantCount', { count: model.variant_count })}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                    <li className="border-t border-gray-100 dark:border-gray-700">
                      <button
                        className="w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        // On click, not mousedown: unmounted on mousedown, the
                        // button was gone by the time the outside-click
                        // handler looked for it, which closed everything.
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setNotListed(true)}
                      >
                        <span className="material-symbols-outlined text-gray-400 text-base">help_outline</span>
                        {t('home.intent.notListed')}
                      </button>
                    </li>
                  </ul>
                )}
              </div>

              {scanMode === 'scan' && (
                <div className="mb-3">
                  <BarcodeScanner onDetected={handleCode} onCancel={() => setScanMode(null)} />
                </div>
              )}
              {scanMode === 'handoff' && (
                <div className="mb-3">
                  <PhotoHandoffPanel
                    mode="barcode"
                    onCancel={() => setScanMode(null)}
                    onResult={(response) => {
                      const code = response?.data?.GTIN;
                      if (code) handleCode(code);
                      else setScanMode(null);
                    }}
                  />
                </div>
              )}

              {/* Under the bar, what to do once a device is picked or not
                  found takes the place of the figures and the journey's steps
                  (#13852). Never leave a search on silence. */}
              {(() => {
                const query = searchQuery.trim();
                const isCode = /^\d{8,14}$/.test(query);
                const unknown = !chosen && query.length >= AUTOCOMPLETE_MIN_CHARS && (noResults || notListed);
                if (!chosen && !unknown) return null;
                swappedRef.current = true;
                const items = chosen ? intents(chosen) : unknownIntents(query, isCode);
                return (
                  <div key={chosen ? `chosen-${chosen.model.id}` : 'unknown'} className="home-swap-in pt-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        chosen
                          ? 'bg-customgreen-100 dark:bg-customgreen-800 text-customgreen-700 dark:text-customgreen-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
                      }`}>
                        <span className="material-symbols-outlined text-xl">
                          {chosen
                            ? getCategoryIcon(chosen.model.categories?.[0]?.canonicalName ?? chosen.model.categories?.[0]?.name ?? '')
                            : 'search_off'}
                        </span>
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold leading-snug text-gray-900 dark:text-white">
                          {chosen
                            ? `${chosen.model.brand} ${chosen.model.name}`
                            : notListed ? t('home.intent.notListedTitle') : t('home.quickSearch.noResults', { query })}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {chosen ? t('home.intent.question') : isCode ? t('home.intent.tryName') : t('home.intent.stillCan')}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (chosen) { setChosen(null); return; }
                          setSearchQuery(''); setSuggestions([]); setShowSuggestions(false); setNoResults(false); setNotListed(false);
                        }}
                        aria-label={chosen ? t('home.intent.close') : t('home.quickSearch.clear')}
                        title={chosen ? t('home.intent.close') : t('home.quickSearch.clear')}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200 flex-shrink-0 self-start"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    </div>
                    <div className={`grid grid-cols-2 ${items.length > 2 ? 'sm:grid-cols-4' : ''} gap-2 sm:gap-3`}>
                      {items.map(({ key, icon, color, primary, go }, idx) => (
                        <button
                          key={key}
                          disabled={!go}
                          onClick={() => go?.()}
                          style={{ animationDelay: `${60 + idx * 50}ms` }}
                          className={`home-swap-item flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-xl text-sm font-semibold text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            primary
                              ? 'bg-customgreen-500 hover:bg-customgreen-600 text-white shadow-sm'
                              : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 hover:border-customgreen-500'
                          }`}
                        >
                          <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            primary ? 'bg-white bg-opacity-20' : `bg-gradient-to-br ${colorMap[color] ?? colorMap['blue']}`
                          }`}>
                            <span className="material-symbols-outlined text-lg">{icon}</span>
                          </span>
                          {t(`home.intent.${key}`)}
                        </button>
                      ))}
                    </div>
                    {/* The library's search on what was typed, already widened,
                        with its filters and every result rather than eight. */}
                    {!chosen && (
                      <Link
                        to={`/app/devices?q=${encodeURIComponent(query)}&extended=1`}
                        style={{ animationDelay: `${60 + items.length * 50}ms` }}
                        className="home-swap-item mt-2 sm:mt-3 flex items-center gap-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 px-3 py-2.5 hover:border-customgreen-500 transition-colors"
                      >
                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${colorMap['teal']}`}>
                          <span className="material-symbols-outlined text-lg">manage_search</span>
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-gray-900 dark:text-white">{t('home.intent.advancedSearch')}</span>
                          <span className="block text-xs text-gray-500 dark:text-gray-400">{t('home.intent.advancedSearchHint', { query })}</span>
                        </span>
                        <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                      </Link>
                    )}
                  </div>
                );
              })() ?? (
              <div key="default" className={swappedRef.current ? 'home-swap-in' : ''}>
              {/* One metadata line instead of a coverage sentence plus a stats
                  row that repeated the same device count twice. Height is
                  reserved so it cannot push the page down when it lands. */}
              {/* On a phone, three columns: the line wrapped into three rows. */}
              <div style={{ minHeight: isNarrow ? '2.75rem' : '1.25rem' }}>
                {stats === null ? (
                  <div className="h-4 w-72 max-w-full rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
                ) : (
                  <p className="grid grid-cols-3 gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 sm:flex sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1">
                    {([
                      { value: stats.totalDevices, labelKey: 'home.hero.stats.devices', icon: 'inventory_2', full: true },
                      { value: stats.totalRepairs, labelKey: 'home.hero.stats.repairs', icon: 'build', full: false },
                      { value: stats.totalRepairers, labelKey: 'home.hero.stats.repairers', icon: 'location_on', full: false },
                    ] as const).filter(s => s.value > 0).map(({ value, labelKey, icon, full }, idx) => (
                      <React.Fragment key={labelKey}>
                        {idx > 0 && <span aria-hidden="true" className="hidden sm:inline text-gray-300 dark:text-gray-600">·</span>}
                        <span className="flex flex-col items-center text-center sm:inline-flex sm:flex-row sm:gap-1.5 sm:text-left">
                          <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-customgreen-600 dark:text-customgreen-400 text-base">{icon}</span>
                            <strong className="font-semibold text-gray-900 dark:text-white">
                              {full ? formatFull(value, i18n.language) : formatCompact(value, i18n.language)}
                            </strong>
                          </span>
                          {t(labelKey)}
                        </span>
                      </React.Fragment>
                    ))}
                  </p>
                )}
              </div>

              {/* The 4 steps stay in the header card so the journey is visible
                  without scrolling, but at page-furniture weight. */}
              <Link
                to="/app/wizard"
                className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex items-start flex-1 min-w-0">
                  {repairSteps.map(({ key, icon }, idx) => (
                    <React.Fragment key={key}>
                      <div className="flex flex-col items-center gap-1.5 flex-shrink-0 w-14 sm:w-16">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-customgreen-100 dark:bg-customgreen-800 flex items-center justify-center">
                            <span className="material-symbols-outlined text-customgreen-700 dark:text-customgreen-300 text-lg">{icon}</span>
                          </div>
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-customgreen-500 text-white text-xxs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                        </div>
                        <span className="text-xs text-center text-gray-600 dark:text-gray-400">
                          {t(`home.repairSteps.${key}`)}
                        </span>
                      </div>
                      {idx < repairSteps.length - 1 && (
                        <div className="flex-1 flex items-center pt-4" style={{ minWidth: '0.5rem' }}>
                          <div className="h-px w-full bg-gray-200 dark:bg-gray-700" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                {/* Single primary CTA: the journey is what this page is for. */}
                <span className="inline-flex items-center justify-center flex-shrink-0 px-4 py-2 bg-customgreen-500 text-white text-sm font-semibold rounded-lg hover:bg-customgreen-600 transition-colors">
                  <span className="material-symbols-outlined mr-1.5 text-base">play_arrow</span>
                  {t('home.startRepairJourney')}
                </span>
              </Link>
              </div>
              )}
            </div>

            {/* ── Services — secondary, compact (#13752, #13852) ────────── */}
            {/* These entries also live in the sidebar, so they stay deliberately
                low-weight here: one line each, no per-card call to action. */}
            {[
              { titleKey: 'home.lookingFor.title', icon: 'travel_explore', items: lookingFor, grid: 'sm:grid-cols-2 xl:grid-cols-4' },
              { titleKey: 'home.tracking.title', icon: 'insights', items: tracking, grid: 'sm:grid-cols-2' },
            ].map(({ titleKey, icon, items, grid }) => (
              <div key={titleKey} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl text-gray-400">{icon}</span>
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t(titleKey)}</h2>
                </div>
                <div className={`grid grid-cols-1 ${grid} gap-3`}>
                  {items.map((svc) => {
                    const colorClass = colorMap[svc.color] ?? colorMap['blue'];
                    return (
                      <Link
                        key={svc.to}
                        to={svc.to}
                        className="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-3 rounded-xl shadow-sm border border-transparent hover:border-customgreen-500 transition-colors"
                      >
                        <div className={`w-9 h-9 flex-shrink-0 bg-gradient-to-br ${colorClass} rounded-lg flex items-center justify-center`}>
                          <span className="material-symbols-outlined text-lg">{svc.icon}</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {t(svc.titleKey)}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t(svc.descKey)}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* ── Device Categories Grid (#13749) ──────────────────────── */}
            {/* Last on the page, and a dropdown on a phone, where its chips ran
                to several rows above the services. Reserved while loading,
                otherwise it pops in late and pushes the page down. */}
            {(categoriesLoading || categories.length > 0) && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-customgreen-500">category</span>
                  {t('home.categories.title')}
                </h2>
                {categoriesLoading ? (
                  <div className="flex flex-wrap gap-2">
                    {[7, 8, 6, 9, 7, 8].map((w, i) => (
                      <div key={i} className="h-8 rounded-full bg-gray-100 dark:bg-gray-700 animate-pulse" style={{ width: `${w * 14}px` }} />
                    ))}
                  </div>
                ) : isNarrow ? (
                  <Select
                    aria-label={t('home.categories.title')}
                    placeholder={t('home.categories.choose')}
                    data={[
                      ...categories.map(({ name, filterName }) => ({ value: filterName, label: name })),
                      { value: MORE_CATEGORIES, label: t('home.quickSearch.browseAll') },
                    ]}
                    value={null}
                    onChange={(value) => {
                      if (value === MORE_CATEGORIES) history.push('/app/devices');
                      else if (value) startWithCategory(value);
                    }}
                  />
                ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map(({ name, filterName, icon, count }) => (
                    <button
                      key={filterName}
                      onClick={() => startWithCategory(filterName)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-customgreen-50 dark:hover:bg-customgreen-900/20 hover:text-customgreen-700 dark:hover:text-customgreen-400 text-sm text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      <span className="material-symbols-outlined text-base text-customgreen-500">{icon}</span>
                      {name}
                      <span className="text-xs text-gray-400">{formatCompact(count, i18n.language)}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => history.push('/app/devices')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm text-gray-400 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">more_horiz</span>
                    {t('home.categories.andMore')}
                  </button>
                </div>
                )}
              </div>
            )}

      </div>
    </div>
  );
};

export default HomePage;