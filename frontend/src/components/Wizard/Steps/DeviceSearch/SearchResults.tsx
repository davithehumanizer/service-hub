import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '@mantine/hooks';
import { SimpleGrid, Card, Skeleton, Button, NativeSelect, ActionIcon, Tooltip } from '@mantine/core';
import { DeviceModel } from '../../../../models/deviceModel';
import ModelCard from '../../../Devices/ModelCard';
import SearchPagination from './SearchPagination';

/**
 * Mantine clips a Button label it can't fit (nowrap + hidden overflow) rather
 * than wrapping it. These two labels run long in Dutch and German — "Apparaat
 * handmatig toevoegen", "Zoekopdracht uitbreiden" — so on a narrow phone the
 * end of the word disappeared. Let the label wrap and the height follow it.
 */
// A results page is capped at 100 by the API: "Voir plus" stops at 96.
export const PHONE_PAGE_STEP = 12;
export const PHONE_MAX_SHOWN = 96;

const wrappingLabelStyles = {
  root: { height: 'auto', minHeight: 48 },
  label: { whiteSpace: 'normal' as const, lineHeight: 1.3 },
  inner: { paddingTop: 10, paddingBottom: 10 },
};

interface SearchResultsProps {
  models: DeviceModel[];
  isLoading: boolean;
  selectedModelId: number | null;
  totalDevices: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  onModelSelect: (model: DeviceModel) => void;
  onModelDeselect: () => void;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  onManualEntry: () => void;
  showDeviceDetailButton: boolean;
  /** The model and variant a card's details open on. */
  identified?: { modelId: number; deviceId: number } | null;
  guest: boolean;
  color?: string;
  isStrictMode?: boolean;
  /** The query is an exact code, so widening it says nothing useful. */
  isCodeSearch?: boolean;
  onExpandSearch?: () => void;
  onCollapseSearch?: () => void;
  deviceCategories?: { label: string; value: string }[];
  selectedCategoryChips?: string[];
  onCategoryChipsChange?: (values: string[]) => void;
  searchQuery?: string;
  categoryCountMap?: Record<string, number>;
  sortField?: 'relevance' | 'brand' | 'model';
  sortDir?: 'asc' | 'desc';
  onSortFieldChange?: (field: 'relevance' | 'brand' | 'model') => void;
  onSortDirToggle?: () => void;
  /** On a phone: show the next results under these ones. */
  onShowMore?: () => void;
  /** Whether anything was searched: an empty list means "not found" only then. */
  searched?: boolean;
}

export default function SearchResults({
  models,
  isLoading,
  selectedModelId,
  totalDevices,
  totalPages,
  currentPage,
  itemsPerPage,
  onModelSelect,
  onModelDeselect,
  onPageChange,
  onItemsPerPageChange,
  onManualEntry,
  showDeviceDetailButton,
  identified,
  guest,
  color = 'customgreen',
  isStrictMode = false,
  isCodeSearch = false,
  onExpandSearch,
  onCollapseSearch,
  deviceCategories,
  selectedCategoryChips,
  onCategoryChipsChange,
  searchQuery,
  categoryCountMap,
  sortField = 'relevance',
  sortDir = 'asc',
  onSortFieldChange,
  onSortDirToggle,
  onShowMore,
  searched = true,
}: SearchResultsProps) {
  const { t } = useTranslation();
  // A phone browses with "Voir plus" rather than pages, sort and page size:
  // all that stood above the first result pushed it a screen and a half down.
  const phone = useMediaQuery('(max-width: 639px)', false);
  // Loading state; on a phone the list stays while more of it loads.
  if (isLoading && !(phone && models.length > 0)) {
    return (
      <div className="space-y-4">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} withBorder padding="md" radius="md">
              <Skeleton height={20} width="60%" mb="sm" />
              <Skeleton height={15} width="40%" mb="xl" />
              <Skeleton height={30} width="100%" />
            </Card>
          ))}
        </SimpleGrid>
      </div>
    );
  }

  // Results found
  if (models && models.length > 0) {
    // Only the categories the current search actually returned. Without counts
    // the whole catalogue used to be listed, dozens of chips leading nowhere.
    const facetedCategories = (deviceCategories ?? []).filter(
      cat => (categoryCountMap?.[cat.value] ?? 0) > 0
        || selectedCategoryChips?.includes(cat.value)
    );
    return (
      <div className="space-y-4">
        {!isStrictMode && !isCodeSearch && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900 dark:bg-opacity-20 border border-amber-200 dark:border-amber-700">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <span className="material-symbols-outlined text-lg">manage_search</span>
              <span className="text-sm font-medium">{t('wizard.deviceSearch.extendedSearch')}</span>
            </div>
            {onCollapseSearch && (
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                leftSection={<span className="material-symbols-outlined text-sm">search</span>}
                onClick={onCollapseSearch}
              >
                {t('wizard.deviceSearch.backToExact')}
              </Button>
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center">
            <span className={`material-symbols-outlined text-xl text-${color}-600 dark:text-${color}-400 mr-2`}>devices</span>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white">{t('wizard.deviceSearch.resultsTitle')}</h4>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery
                ? t('wizard.deviceSearch.devicesFoundFor', { count: totalDevices, query: searchQuery })
                : t('wizard.deviceSearch.devicesFound', { count: totalDevices })}
            </span>
            <div className="hidden sm:flex items-center gap-1.5">
              <label className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap">{t('wizard.deviceSearch.sort.label')}</label>
              <NativeSelect
                size="xs"
                value={sortField}
                onChange={(e) => onSortFieldChange?.(e.currentTarget.value as 'relevance' | 'brand' | 'model')}
                data={[
                  { value: 'relevance', label: t('wizard.deviceSearch.sort.relevance') },
                  { value: 'brand', label: t('wizard.deviceSearch.sort.brand') },
                  { value: 'model', label: t('wizard.deviceSearch.sort.model') },
                ]}
                className="w-32"
              />
              {sortField !== 'relevance' && (
                <Tooltip label={sortDir === 'asc' ? t('wizard.deviceSearch.sort.descTooltip') : t('wizard.deviceSearch.sort.ascTooltip')} withArrow>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={onSortDirToggle}
                  >
                    <span className="material-symbols-outlined text-base">
                      {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                  </ActionIcon>
                </Tooltip>
              )}
            </div>
          </div>
        </div>

        {facetedCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            <button
              onClick={() => onCategoryChipsChange?.([])}
              className={`flex-shrink-0 whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                !selectedCategoryChips?.length
                  ? `bg-${color}-100 border-${color}-300 text-${color}-800 dark:bg-${color}-900/20 dark:border-${color}-700 dark:text-${color}-300`
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {t('wizard.deviceSearch.filters.all')}
            </button>
            {facetedCategories.map((cat) => {
              const isActive = selectedCategoryChips?.includes(cat.value);
              const count = categoryCountMap?.[cat.value];
              return (
                <button
                  key={cat.value}
                  onClick={() => {
                    const current = selectedCategoryChips || [];
                    const next = isActive
                      ? current.filter((v) => v !== cat.value)
                      : [...current, cat.value];
                    onCategoryChipsChange?.(next);
                  }}
                  className={`flex-shrink-0 whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    isActive
                      ? `bg-${color}-100 border-${color}-300 text-${color}-800 dark:bg-${color}-900/20 dark:border-${color}-700 dark:text-${color}-300`
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat.label}{count !== undefined ? ` (${count.toLocaleString()})` : ''}
                </button>
              );
            })}
          </div>
        )}
        
        {!phone && <SearchPagination
          position="top"
          totalPages={totalPages}
          currentPage={currentPage}
          totalDevices={totalDevices}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
          color={color}
        />}

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
          {models.map((model) => (
            <ModelCard
              key={model.id}
              onClick={() => {
                if (selectedModelId === model.id) {
                  onModelDeselect();
                } else {
                  onModelSelect(model);
                }
              }}
              model={model}
              selected={selectedModelId === model.id}
              showDetailsButton={showDeviceDetailButton}
              variantId={identified?.modelId === model.id ? identified.deviceId : null}
              color={color}
            />
          ))}
        </SimpleGrid>

        {phone ? (
          totalDevices > models.length && (
            itemsPerPage < PHONE_MAX_SHOWN && onShowMore ? (
              <div className="flex justify-center pt-2">
                <Button
                  variant="light"
                  color={color === 'customgreen' ? '#6e9922' : color}
                  radius="xl"
                  loading={isLoading}
                  onClick={onShowMore}
                >
                  {t('wizard.deviceSearch.showMore')}
                </Button>
              </div>
            ) : (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                {t('wizard.deviceSearch.refineToSeeMore')}
              </p>
            )
          )
        ) : (
          <SearchPagination
            position="bottom"
            totalPages={totalPages}
            currentPage={currentPage}
            totalDevices={totalDevices}
            itemsPerPage={itemsPerPage}
            onPageChange={onPageChange}
            onItemsPerPageChange={onItemsPerPageChange}
            color={color}
          />
        )}

        {isStrictMode && onExpandSearch && (
          <div className="flex justify-center pt-2">
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              leftSection={<span className="material-symbols-outlined text-sm">manage_search</span>}
              onClick={onExpandSearch}
            >
              {t('wizard.deviceSearch.extendSearch')}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Nothing searched yet: "not found" here greeted the free search before a
  // word was typed, with an "extend" button that had nothing to extend.
  if (!searched) return null;

  // No results found
  return (
    <div className="text-center py-10 sm:py-16 px-4 bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-700 shadow-sm">
      <div className="inline-flex items-center justify-center w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gray-50 dark:bg-gray-900 mb-4 sm:mb-6">
        <span className="material-symbols-outlined text-3xl sm:text-5xl text-gray-300 dark:text-gray-600">search_off</span>
      </div>
      <h3 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white mb-2 sm:mb-3">{t('wizard.deviceSearch.notFound')}</h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6 sm:mb-10 max-w-sm mx-auto leading-relaxed text-sm sm:text-lg">
        {t('wizard.deviceSearch.notFoundDesc')}
      </p>
      {/* Fixed px-8/h-14 sizing clipped every label on a phone. Stacked and
          full-width below sm, natural width above it. "Try another category"
          used to sit here too, calling the same handler as the "New search"
          button already shown at the top of this screen. */}
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-center max-w-sm sm:max-w-none mx-auto">
        {isStrictMode && onExpandSearch && (
          <Button
            variant="light"
            color="blue"
            size="lg"
            radius="xl"
            fz={{ base: 14, sm: 16 }}
            px={{ base: 16, sm: 24 }}
            styles={wrappingLabelStyles}
            leftSection={<span className="material-symbols-outlined text-lg sm:text-2xl">manage_search</span>}
            onClick={onExpandSearch}
          >
            {t('wizard.deviceSearch.extendSearch')}
          </Button>
        )}
        {/* Offered to everyone: a guest in the library is asked to sign in
            first, adding a model to the catalogue takes an account. */}
        <Button
          variant="filled"
          color={color === 'customgreen' ? '#6e9922' : color}
          size="lg"
          radius="xl"
          fz={{ base: 14, sm: 16 }}
          px={{ base: 16, sm: 24 }}
          styles={wrappingLabelStyles}
          leftSection={
            <span className="material-symbols-outlined text-lg sm:text-2xl">
              {showDeviceDetailButton && guest ? 'login' : 'add_circle'}
            </span>
          }
          onClick={onManualEntry}
          className="shadow-md hover:shadow-lg transition-all"
        >
          {showDeviceDetailButton && guest
            ? t('wizard.deviceSearch.signInToAdd')
            : t('wizard.deviceSearch.addManually')}
        </Button>
      </div>
    </div>
  );
}
