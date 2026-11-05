import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useHistory, useLocation } from "react-router-dom";
import { RootState } from "../../../stores/globalStore";
import {
  setDevice, setAllowNextStep, setHideStepNav, setSearchSelectedModel, setSelectedDeviceType,
  clearCurrentDevice, nextStep,
  setSearchFilters as setWizardSearchFilters,
  setSearchFoundModels as setWizardSearchFoundModels,
  setSearchPagination as setWizardSearchPagination,
  setSearchCategoryFacets as setWizardSearchCategoryFacets,
  setSearchCurrentPage as setWizardSearchCurrentPage,
} from "../../../stores/repairWorkflowSlice";
import { librarySearchActions } from "../../../stores/librarySearchSlice";
import { clearGlobalDevice, setGlobalDevice } from "../../../stores/deviceSlice";
import { Breadcrumbs, Collapse, Button, Text } from "@mantine/core";
import { deviceService } from "../../../services/deviceService";
import { deviceModelService } from "../../../services/deviceModelService";
import { Device, DeviceFilters } from "../../../models/device";
import { DeviceModel } from "../../../models/deviceModel";
import { DeviceOptionSelect } from "./DeviceSearch/types";
import { returnToSearch } from "../../../utils/returnTo";
import SearchMethodSelection from "./DeviceSearch/SearchMethodSelection";
import CategorySelection from "./DeviceSearch/CategorySelection";
import BrandSelection from "./DeviceSearch/BrandSelection";
import EanSearch from "./DeviceSearch/EanSearch";
import PhotoIdentification from "./DeviceSearch/PhotoIdentification";
import SearchFilters from "./DeviceSearch/SearchFilters";
import SearchResults, { PHONE_MAX_SHOWN, PHONE_PAGE_STEP } from "./DeviceSearch/SearchResults";
import ManualDeviceEntry from "./DeviceSearch/ManualDeviceEntry";

const wizardSearchActions = {
  setSearchFilters: setWizardSearchFilters,
  setSearchFoundModels: setWizardSearchFoundModels,
  setSearchPagination: setWizardSearchPagination,
  setSearchCategoryFacets: setWizardSearchCategoryFacets,
  setSearchCurrentPage: setWizardSearchCurrentPage,
};

export default function DeviceSearch({ showDeviceDetailButton = false, color = 'customgreen', initialSearch, initialExtended = false }: { showDeviceDetailButton: boolean, color?: string, initialSearch?: string, initialExtended?: boolean }) {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  // The library (showDeviceDetailButton) searches apart from the wizard: on
  // one shared search, each page overwrote the other's results (PBI 13839).
  const workflow = useSelector((state: RootState) => state.repairWorkflow);
  const librarySearch = useSelector((state: RootState) => state.librarySearch);
  const { searchFilters, searchFoundModels, searchTotalModels, searchTotalPages, searchCurrentPage, searchCategoryFacets: categoryCountMap } =
    showDeviceDetailButton ? librarySearch : workflow;
  const { searchSelectedModel, wizardDevice } = workflow;
  const { setSearchFilters, setSearchFoundModels, setSearchPagination, setSearchCategoryFacets, setSearchCurrentPage } =
    showDeviceDetailButton ? librarySearchActions : wizardSearchActions;
  const { globalDevice } = useSelector((state: RootState) => state.device);
  const { guest } = useSelector((state: RootState) => state.auth);
  const history = useHistory();
  const location = useLocation();
  const _segments = location.pathname.split('/').filter(Boolean);
  const base = _segments.length ? `/${_segments[0]}` : '/app';

  const [options, setOptions] = useState<DeviceFilters[]>([]);
  const [mappedOptions, setMappedOptions] = useState<DeviceOptionSelect[]>([]);
  // True from the start when the effects below are about to search: the empty
  // list would otherwise show "device not found" until the filters are loaded.
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !!initialSearch || (searchFilters.length > 0 && searchFoundModels.length === 0),
  );
  const [searchValue, setSearchValue] = useState<string>(initialSearch ?? "");
  const [, setSearchMode] = useState<'guided' | 'ean' | 'free' | 'photo' | null>(() => {
    return (searchFilters && searchFilters.length > 0) || (searchFoundModels && searchFoundModels.length > 0) ? 'guided' : null;
  });
  const [subStep, setSubStep] = useState(() => {
    return initialSearch ? 4 : (((searchFilters && searchFilters.length > 0) || (searchFoundModels && searchFoundModels.length > 0)) ? 4 : 0);
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCategoryLabel, setSelectedCategoryLabel] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  // A phone starts shorter and grows by "Voir plus" (see SearchResults).
  const [itemsPerPage, setItemsPerPage] = useState(() =>
    window.matchMedia?.('(max-width: 639px)').matches ? PHONE_PAGE_STEP : 24,
  );
  const [isStrictMode, setIsStrictMode] = useState(!initialExtended);
  // The model picked on the home page, which arrives with the result list
  // emptied for a fresh search. Forgotten as soon as the visitor picks in the
  // list themselves.
  const [carriedId, setCarriedId] = useState(() =>
    searchFoundModels.length === 0 && searchSelectedModel ? searchSelectedModel.id : null,
  );
  // The variant a barcode or a reference named, for the model it found.
  const [identified, setIdentified] = useState<{ modelId: number; deviceId: number } | null>(null);
  // Only the last pick's variant is kept, whichever answers first.
  const pickRef = useRef(0);
  // A scanned or typed barcode is an exact lookup, not a widened text search.
  const [isCodeSearch, setIsCodeSearch] = useState(false);
  const [selectedCategoryChips, setSelectedCategoryChips] = useState<string[]>([]);
  const [sortField, setSortField] = useState<'relevance' | 'brand' | 'model'>('relevance');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Load filters, again on a language change: their labels are translated.
  useEffect(() => {
    deviceService.getFilters().then((filters: DeviceFilters[]) => {
      setOptions(filters);
      const groupedOption = filters.filter(f => f.category.toLowerCase() !== 'device_type' && f.category.toLowerCase() !== 'devicetype').reduce((acc: any, filter: DeviceFilters) => {
        if (!acc[filter.category]) {
          acc[filter.category] = { items: [] };
        }
        acc[filter.category].items.push({
          label: filter.label || filter.name,
          value: filter.category + "_" + filter.name,
        });
        return acc;
      }, {});
      const mappedOpt: DeviceOptionSelect[] = Object.entries(groupedOption).flatMap(([category, { items }]: [string, any]) => {
        const key = `wizard.deviceSearch.filterGroups.${category}`;
        const translated = t(key);
        const groupLabel = translated === key ? category : translated;
        return { group: groupLabel, items: items };
      });
      setMappedOptions(mappedOpt);
    });
  }, [i18n.language]);

  const fetchDevices = async (page: number, limit: number, overrideFilters?: string[], overrideStrict?: boolean) => {
    const activeFilters = overrideFilters || searchFilters;
    const strict = overrideStrict !== undefined ? overrideStrict : isStrictMode;

    if (activeFilters.length > 0 || selectedCategoryChips.length > 0) {
      const processFilter = (filterValue: string): string => {
        let correspondingOption = options.find(opt => `${opt.category}_${opt.name}` === filterValue);
        if (!correspondingOption) {
          correspondingOption = options.find(opt =>
            `${opt.category}_${opt.name}`.toLowerCase() === filterValue.toLowerCase()
          );
        }
        if (correspondingOption) return correspondingOption.name;
        if (filterValue.includes('_')) {
          const parts = filterValue.split('_');
          return parts.slice(1).join('_');
        }
        return filterValue;
      };

      // Separate category filters (guided flow) from text-based filters (brand, free text)
      // Category filters must NOT go into the text search query: in strict mode the backend
      // does a match_phrase on title (brand+model), so "Gaming Console,Sony" never matches.
      const categoryActiveFilters = activeFilters.filter(f => f.toLowerCase().startsWith('device_category_'));
      const textActiveFilters = activeFilters.filter(f => !f.toLowerCase().startsWith('device_category_'));

      // Text search: brand names and free-text only
      const textQuery = textActiveFilters.map(processFilter).filter(Boolean).join(',');
      // Categories: merge guided category filters + chip UI selections. A
      // list, not a comma-joined string: a category's name may hold a comma.
      const categories = [
        ...categoryActiveFilters.map(processFilter).filter(Boolean),
        ...selectedCategoryChips.map(processFilter).filter(Boolean),
      ];

      if (textQuery.length > 0 || categories.length > 0) {
        setIsLoading(true);
        try {
          const response = await deviceModelService.search({
            page,
            limit,
            search: textQuery || undefined,
            categories: categories.length > 0 ? categories : undefined,
            sortBy: sortField !== 'relevance'
              ? `${sortField}${sortDir === 'asc' ? 'AZ' : 'ZA'}` as 'brandAZ' | 'brandZA' | 'modelAZ' | 'modelZA'
              : undefined,
            strict,
          });
          setIdentified(
            response.variant && response.data[0]
              ? { modelId: response.data[0].id, deviceId: response.variant.device_id }
              : null,
          );
          dispatch(setSearchFoundModels(response.data));
          dispatch(setSearchPagination({
             total: response.pagination.total,
             totalPages: response.pagination.totalPages,
             page: response.pagination.page
          }));
          // Category facets come directly from the backend (ES aggregations)
          dispatch(setSearchCategoryFacets(
            Object.fromEntries(
              Object.entries(response.categoryFacets ?? {}).map(([name, count]) => [
                `device_category_${name}`,
                count,
              ]),
            ),
          ));
        } catch (error) {
          console.error("An error occurred while searching for devices:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        dispatch(setSearchFoundModels([]));
        dispatch(setSearchPagination({ total: 0, totalPages: 0, page: 1 }));
        dispatch(setSearchCategoryFacets({}));
      }
    }
  };

  const handleSearch = (overrideFilters?: string[]) => {
    dropCarriedSelection();
    setIsStrictMode(true);
    setIsCodeSearch(false);
    dispatch(setSearchCurrentPage(1));
    fetchDevices(1, itemsPerPage, overrideFilters, true);
  };

  const handleExpandSearch = () => {
    setIsStrictMode(false);
    fetchDevices(searchCurrentPage, itemsPerPage, undefined, false);
  };

  const handleCollapseSearch = () => {
    setIsStrictMode(true);
    fetchDevices(searchCurrentPage, itemsPerPage, undefined, true);
  };

  // Sync subStep with Redux state when component mounts
  useEffect(() => {
    if (initialSearch) {
      dispatch(setSearchFilters([initialSearch]));
      // Results survive a reload through redux-persist, and the fetch below
      // only runs on an empty list: without this the URL showed the previous
      // search's devices, and no request was ever sent.
      dispatch(setSearchFoundModels([]));
      dispatch(setSearchCurrentPage(1));
      // A device chosen for the wizard belongs to the search that found it,
      // not to this query. The library page keeps its own selection in
      // globalDevice, so leave the wizard's alone there.
      if (!showDeviceDetailButton) {
        dispatch(setSearchSelectedModel(null));
        dispatch(clearCurrentDevice());
      }
      setSearchMode('free');
      setSubStep(4);
    } else if ((searchFilters && searchFilters.length > 0) || (searchFoundModels && searchFoundModels.length > 0)) {
      setSearchMode('guided');
      setSubStep(4);
    }
  }, []); // Run only on mount

  // The method-selection screen (subStep 0) has no device to go back to and
  // nothing ready to move forward to yet — the wizard's Prev/Next footer is
  // dead weight there, so hide it for just that screen.
  useEffect(() => {
    if (!showDeviceDetailButton) dispatch(setHideStepNav(subStep === 0));
  }, [subStep, dispatch]);

  // Re-fetch devices when options are loaded if we have filters in Redux (restore search on navigation back)
  useEffect(() => {
    if (options.length > 0 && searchFilters && searchFilters.length > 0 && searchFoundModels.length === 0) {
      // Options are loaded and we have filters but no results = need to re-fetch
      fetchDevices(searchCurrentPage, itemsPerPage);
    }
  }, [options]); // Trigger when options are loaded

  useEffect(() => {
    if (options.length > 0 && searchFilters && searchFilters.length > 0) {
      fetchDevices(searchCurrentPage, itemsPerPage);
    }
  }, [searchCurrentPage, itemsPerPage]);

  // When filters change, always reset to page 1
  useEffect(() => {
    if (options.length > 0 && searchFilters && searchFilters.length > 0) {
      dispatch(setSearchCurrentPage(1));
      fetchDevices(1, itemsPerPage);
    }
  }, [searchFilters]);

  // When category chips change, reset to page 1 and re-fetch
  useEffect(() => {
    if (options.length > 0) {
      dispatch(setSearchCurrentPage(1));
      fetchDevices(1, itemsPerPage);
    }
  }, [selectedCategoryChips]);

  // When sort changes, reset to page 1 and re-fetch
  useEffect(() => {
    if (options.length > 0 && searchFilters && searchFilters.length > 0) {
      dispatch(setSearchCurrentPage(1));
      fetchDevices(1, itemsPerPage);
    }
  }, [sortField, sortDir]);

  useEffect(() => {
    // The wizard's own: a category searched in the library is not its device.
    if (showDeviceDetailButton) return;
    // Don't reset if a device was already pre-selected (e.g. from HomePage)
    if (wizardDevice?.model_id || wizardDevice?.device_id) return;

    if ((!searchFilters && !options) || (searchFilters.length === 0 && options.length === 0)) {
        dispatch(setAllowNextStep(false));
        return;
    }

    let selectedDeviceTypeName: string | undefined;
    for (const filterValue of searchFilters) {
        const correspondingOption = options.find(opt => `${opt.category}_${opt.name}` === filterValue);
        if (correspondingOption && ['devicetype', 'device_type', 'device_category'].includes(correspondingOption.category.toLowerCase())) {
            selectedDeviceTypeName = correspondingOption.name;
            break;
        }
    }

    if (selectedDeviceTypeName) {
        dispatch(setSelectedDeviceType(selectedDeviceTypeName));
        dispatch(setAllowNextStep(true));
    }
  }, [searchFilters, options, dispatch]);

  // Category names currently active from the guided flow (device_category_* filters)
  const guidedCategoryNames = new Set(
    searchFilters
      .filter(f => f.toLowerCase().startsWith('device_category_'))
      .map(f => {
        const opt = options.find(o => `${o.category}_${o.name}`.toLowerCase() === f.toLowerCase());
        return opt ? opt.name : null;
      })
      .filter((n): n is string => n !== null)
  );

  const deviceCategoryOptions = Array.from(
    new Map(
      options
        .filter(opt => opt.category.toLowerCase() === 'device_category')
        .filter(opt => guidedCategoryNames.size === 0 || guidedCategoryNames.has(opt.name))
        .map(opt => [opt.name, { label: opt.label || opt.name, value: `device_category_${opt.name}` }])
    ).values()
  ).sort((a, b) => a.label.localeCompare(b.label));

  const dbCategoryLabelToName = new Map(
    options
      .filter(opt => opt.category.toLowerCase() === 'device_category')
      .map(opt => [opt.label || opt.name, opt.name])
  );
  const dbCategories = Array.from(new Set(
    options
      .filter(opt => opt.category.toLowerCase() === 'device_category')
      .map(opt => opt.label || opt.name)
  )).sort();

  const dbBrands = Array.from(new Set(options
    .filter(opt => {
      if (opt.category.toLowerCase() !== 'brand') return false;
      if (!selectedCategory) return true;
      return (opt.categories || []).includes(selectedCategory);
    })
    .map(opt => opt.name)
  )).sort();

  const handleCategorySelect = (categoryLabel: string) => {
    const categoryName = dbCategoryLabelToName.get(categoryLabel) || categoryLabel;
    setSelectedCategory(categoryName);
    setSelectedCategoryLabel(categoryLabel);
    if (!showDeviceDetailButton) dispatch(setSelectedDeviceType(categoryName));
    const correspondingFilter = options.find(opt =>
      opt.name === categoryName && ['device_type', 'devicetype', 'device_category'].includes(opt.category.toLowerCase())
    );
    const categoryPrefix = correspondingFilter ? correspondingFilter.category : 'device_type';
    const filterValue = `${categoryPrefix}_${categoryName}`;
    dispatch(setSearchFilters([filterValue]));
    dispatch(setSearchCurrentPage(1));
    const brandsForCategory = options.filter(opt =>
      opt.category.toLowerCase() === 'brand' &&
      (opt.categories || []).includes(categoryName)
    );
    setSubStep(brandsForCategory.length > 0 ? 2 : 4);
  };

  const handleBrandSelect = (brandName: string) => {
    setSelectedBrand(brandName);
    const filterValue = `brand_${brandName}`;
    const newFilters = searchFilters ? [...searchFilters, filterValue] : [filterValue];
    dispatch(setSearchFilters(newFilters));
    dispatch(setSearchCurrentPage(1));
    setSubStep(4);
  };

  const handleEanSearch = (ean: string) => {
    // Never strict: that mode matches the phrase against the title, which is
    // brand + model, so a barcode could only ever return nothing and the user
    // had to press "expand search" by hand to see their own device.
    setIsStrictMode(false);
    setIsCodeSearch(true);
    dispatch(setSearchFilters([ean]));
    dispatch(setSearchCurrentPage(1));
    setSubStep(4);
  };

  const handleManualEntry = () => {
    if (showDeviceDetailButton) {
      // The library adds a model to the catalogue, which takes an account:
      // a guest signs in first and comes back to the form.
      if (guest) {
        history.push(`/login${returnToSearch(`${base}/create-device`)}`);
      } else {
        history.push(`${base}/create-device`, {
          prefilledData: { brand: selectedBrand ?? "", model: typedName },
        });
      }
      return;
    }
    setManualOpen(true);
  };

  // What was searched as free text: the model's name to start from. The
  // search field itself is emptied once a word becomes a filter.
  const typedName =
    searchFilters.filter((f) => !/^(brand|device_category|device_type)_/i.test(f)).join(" ") || searchValue;

  const handleManualContinue = (device: Device) => {
    setManualOpen(false);
    dispatch(setDevice(device));
    dispatch(setAllowNextStep(true));
    dispatch(nextStep());
  };

  const handleManualPick = async (model: DeviceModel) => {
    setManualOpen(false);
    if (await handleModelSelect(model)) dispatch(nextStep());
  };

  /** Whether the model is now the one picked. */
  const handleModelSelect = async (model: DeviceModel): Promise<boolean> => {
    const pick = ++pickRef.current;
    if (!showDeviceDetailButton) {
      setCarriedId(null);
      dispatch(setSearchSelectedModel(model));
      dispatch(setAllowNextStep(false));
    }
    try {
      const picked = await deviceModelService.deviceOf(
        model,
        identified?.modelId === model.id ? identified.deviceId : null,
      );
      if (pick !== pickRef.current) return false;
      if (showDeviceDetailButton) {
        dispatch(setGlobalDevice(picked));
      } else {
        dispatch(setDevice(picked));
        dispatch(setAllowNextStep(true));
      }
      return true;
    } catch (error) {
      console.error("The model's variant could not be read:", error);
      return false;
    }
  };

  const handleDeviceDeselect = () => {
    pickRef.current += 1;
    // The library's pick is its own; the wizard's may be in progress.
    if (showDeviceDetailButton) {
      dispatch(clearGlobalDevice());
      return;
    }
    setCarriedId(null);
    dispatch(clearCurrentDevice());
    dispatch(setSearchSelectedModel(null));
    dispatch(setAllowNextStep(false));
  };

  // The device carried in from the home page is pinned to the search that
  // brought it. Leaving the results or changing what is searched drops it, so
  // it cannot follow the visitor into a search it has nothing to do with; so
  // does one typed in by hand, which no search found. The library page keeps
  // its own pick in globalDevice and is left alone.
  const dropCarriedSelection = () => {
    if (showDeviceDetailButton || (!searchSelectedModel && !wizardDevice)) return;
    handleDeviceDeselect();
  };

  const handleDeviceSelectedFromPhoto = (device: Device, model: DeviceModel) => {
    if (showDeviceDetailButton) {
      dispatch(setGlobalDevice(device));
    } else {
      dispatch(setDevice(device));
      dispatch(setSearchSelectedModel(model));
      dispatch(setSearchFoundModels([model]));
      dispatch(setAllowNextStep(true));
      dispatch(nextStep());
    }
  };

  const handleCreateNewDeviceFromPhoto = (device: Partial<Device>) => {
    // When user wants to create a new device from photo identification
    // Navigate to device creation with pre-filled data
    if (showDeviceDetailButton) {
      history.push(`${base}/create-device`, { prefilledData: device });
    } else {
      // In wizard mode, set the device and proceed
      const fullDevice = device as Device;
      dispatch(setDevice(fullDevice));
      dispatch(setAllowNextStep(true));
      dispatch(nextStep());
    }
  };

  const handleRefineSearchFromPhoto = (filters: { brand: string; model: string; product: string }) => {
    // Build filters from photo identification data
    const searchFilters: string[] = [];
    
    /*if (filters.brand) {
      searchFilters.push(`brand_${filters.brand}`);
    }
    if (filters.product) {
      // Try to match device_type
      const correspondingFilter = options.find(opt => 
        opt.name.toLowerCase() === filters.product.toLowerCase() && 
        ['device_type', 'devicetype', 'device_category'].includes(opt.category.toLowerCase())
      );
      if (correspondingFilter) {
        searchFilters.push(`${correspondingFilter.category}_${correspondingFilter.name}`);
      } else {
        searchFilters.push(`device_type_${filters.product}`);
      }
    }*/
   if (filters.brand) searchFilters.push(`${filters.brand}`);
   if (filters.model) searchFilters.push(`${filters.model}`);
   if (filters.product) searchFilters.push(`${filters.product}`);

    
    // Set filters and navigate to free search view
    dispatch(setSearchFilters(searchFilters));
    dispatch(setSearchCurrentPage(1));
    setSearchValue(filters.model || '');
    setSubStep(4);
    
    // Trigger search with the new filters
    handleSearch(searchFilters);
  };

  const handleResetSearch = () => {
    dropCarriedSelection();
    dispatch(setSearchFilters([]));
    dispatch(setSearchCurrentPage(1));
    setIsStrictMode(true);
    setSubStep(0);
    setSelectedCategory(null);
    setSelectedCategoryLabel(null);
    setSelectedBrand(null);
  };

  // Shown first on page one: the model carried in from the home page, and a
  // selection this page of results does not contain (kept across a step
  // change, say). A model clicked in the list stays where it was clicked —
  // moving it to the top under the cursor read as a glitch.
  const selectedModel = !showDeviceDetailButton ? searchSelectedModel : null;
  const pinnedModel = selectedModel && (
    carriedId === selectedModel.id
    || !searchFoundModels.some(m => m.id === selectedModel.id)
  ) ? selectedModel : null;
  const displayedModels = pinnedModel && searchCurrentPage === 1
    ? [pinnedModel, ...searchFoundModels.filter(m => m.id !== pinnedModel.id)]
    : searchFoundModels;
  // The variant a card's details open on: the barcode's, or else the one
  // picked, which outlives results restored without a search.
  const picked = showDeviceDetailButton ? globalDevice : wizardDevice;
  const detailsVariant = identified ?? (picked?.model_id && picked.device_id
    ? { modelId: picked.model_id, deviceId: Number(picked.device_id) }
    : null);

  return (
    <div className="space-y-2">
      {/* Navigation Breadcrumbs */}
      {subStep > 0 && (
        <div className="flex flex-wrap justify-between items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
          <Breadcrumbs
            separator="/"
            separatorMargin="xs"
            classNames={{ separator: 'text-gray-400 dark:text-gray-600' }}
          >
            <Button
              variant="subtle"
              size="xs"
              color="gray"
              leftSection={<span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_back</span>}
              onClick={() => {
                dropCarriedSelection();
                setSubStep(0);
                setSearchMode(null);
                setSelectedCategory(null);
                setSelectedCategoryLabel(null);
                setSelectedBrand(null);
              }}
              className="font-normal"
            >
              {t('wizard.deviceSearch.backToStart')}
            </Button>
            {/* On the brand step this segment is the way back to categories,
                so the breadcrumb is the single navigation system instead of
                competing with a second back button inside the step itself. */}
            {subStep === 2 ? (
              <Button
                variant="subtle"
                size="xs"
                color="gray"
                onClick={() => setSubStep(1)}
                className="font-normal"
              >
                {selectedCategoryLabel || selectedCategory || t('wizard.deviceSearch.categories')}
              </Button>
            ) : selectedCategory ? (
              <Text size="sm" c="dimmed">{selectedCategoryLabel || selectedCategory}</Text>
            ) : null}
            {selectedBrand && (
              <Text size="sm" c="dimmed">{selectedBrand}</Text>
            )}
          </Breadcrumbs>
          {subStep === 4 && searchFilters.length > 0 && (
            <Button
              variant="subtle"
              size="sm"
              color="gray"
              leftSection={<span className="material-symbols-outlined text-sm">refresh</span>}
              onClick={handleResetSearch}
            >
              {t('wizard.deviceSearch.newSearch')}
            </Button>
          )}
          {/* A wrong or second code was only reachable through "back to
              start" and the barcode method again (PBI 13840). */}
          {subStep === 4 && isCodeSearch && (
            <Button
              variant="subtle"
              size="sm"
              color="gray"
              leftSection={<span className="material-symbols-outlined text-sm">barcode_scanner</span>}
              onClick={() => {
                dropCarriedSelection();
                setSubStep(3);
              }}
            >
              {t('wizard.deviceSearch.scanAnother')}
            </Button>
          )}
        </div>
      )}

      {/* Method Selection (subStep 0) */}
      {subStep === 0 && <SearchMethodSelection onMethodSelect={(method) => {
        setSearchMode(method);
        if (method === 'guided') setSubStep(1);
        else if (method === 'ean') setSubStep(3);
        else if (method === 'free') setSubStep(4);
        else if (method === 'photo') setSubStep(5);
      }} color={color} />}

      {/* Category Selection (subStep 1) */}
      {subStep === 1 && (
        <CategorySelection
          categories={dbCategories}
          canonicalNames={dbCategoryLabelToName}
          onCategorySelect={handleCategorySelect}
          onSkip={() => {
            setSelectedCategory(null);
            dispatch(setSearchFilters([]));
            setSubStep(2);
          }}
          color={color}
        />
      )}

      {/* Brand Selection (subStep 2) */}
      {subStep === 2 && (
        <BrandSelection
          brands={dbBrands}
          selectedCategory={selectedCategoryLabel || selectedCategory}
          onBrandSelect={handleBrandSelect}
          onSkip={() => {
            setSelectedBrand(null);
            setSubStep(4);
          }}
          color={color}
        />
      )}

      {/* EAN Search (subStep 3) */}
      {subStep === 3 && (
        <EanSearch onSearch={handleEanSearch} />
      )}

      {/* Photo Identification (subStep 5) */}
      {subStep === 5 && (
        <PhotoIdentification
          onDeviceSelected={handleDeviceSelectedFromPhoto}
          onCreateNewDevice={handleCreateNewDeviceFromPhoto}
          onRefineSearch={handleRefineSearchFromPhoto}
          guest={guest}
          onBack={() => {
            setSearchMode(null);
            setSubStep(0);
          }}
          showDetailsButton={showDeviceDetailButton}
        />
      )}

      {/* Search & Results (subStep 4) */}
      <Collapse in={subStep === 4}>
        <div className="space-y-6">
          <SearchFilters
            mappedOptions={mappedOptions}
            searchFilters={searchFilters}
            options={options}
            onFiltersChange={(values) => {
              dropCarriedSelection();
              dispatch(setSearchFilters(values));
            }}
            onSearch={() => handleSearch()}
            searchValue={searchValue}
            onSearchValueChange={setSearchValue}
            setMappedOptions={setMappedOptions}
            isLoading={isLoading}
            color={color}
          />
          
          <SearchResults
            models={displayedModels}
            isLoading={isLoading}
            selectedModelId={showDeviceDetailButton ? globalDevice?.model_id ?? null : searchSelectedModel?.id ?? null}
            totalDevices={searchTotalModels}
            totalPages={searchTotalPages}
            currentPage={searchCurrentPage}
            itemsPerPage={itemsPerPage}
            onModelSelect={handleModelSelect}
            onModelDeselect={handleDeviceDeselect}
            identified={detailsVariant}
            onPageChange={(page) => dispatch(setSearchCurrentPage(page))}
            onItemsPerPageChange={(items) => {
              setItemsPerPage(items);
              dispatch(setSearchCurrentPage(1));
            }}
            onManualEntry={handleManualEntry}
            showDeviceDetailButton={showDeviceDetailButton}
            guest={guest}
            color={color}
            isStrictMode={isStrictMode}
            isCodeSearch={isCodeSearch}
            onExpandSearch={handleExpandSearch}
            onCollapseSearch={handleCollapseSearch}
            deviceCategories={deviceCategoryOptions}
            selectedCategoryChips={selectedCategoryChips}
            onCategoryChipsChange={setSelectedCategoryChips}
            searchQuery={searchValue}
            categoryCountMap={categoryCountMap}
            sortField={sortField}
            sortDir={sortDir}
            onSortFieldChange={setSortField}
            onSortDirToggle={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            searched={searchFilters.length > 0 || selectedCategoryChips.length > 0}
            onShowMore={() => {
              dispatch(setSearchCurrentPage(1));
              setItemsPerPage((n) => Math.min(n + PHONE_PAGE_STEP, PHONE_MAX_SHOWN));
            }}
          />
        </div>
      </Collapse>
      {!showDeviceDetailButton && (
        <ManualDeviceEntry
          opened={manualOpen}
          initialBrand={selectedBrand ?? ""}
          initialName={typedName}
          initialCategory={selectedCategory}
          onClose={() => setManualOpen(false)}
          onContinue={handleManualContinue}
          onPickModel={handleManualPick}
        />
      )}
    </div>
  );
}