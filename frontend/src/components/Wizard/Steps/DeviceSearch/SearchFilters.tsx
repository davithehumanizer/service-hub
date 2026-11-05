import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MultiSelect, MultiSelectProps, Group, Text, Button } from '@mantine/core';
import { DeviceOptionSelect } from './types';
import classes from '../../../../assets/css/Wizard.module.css';

interface SearchFiltersProps {
  mappedOptions: DeviceOptionSelect[];
  searchFilters: string[];
  options: any[]; // DeviceFilters[] from parent
  onFiltersChange: (values: string[]) => void;
  onSearch: () => void;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  setMappedOptions: (options: DeviceOptionSelect[]) => void;
  isLoading: boolean;
  color?: string;
}

export default function SearchFilters({
  mappedOptions,
  searchFilters,
  options,
  onFiltersChange,
  onSearch,
  searchValue,
  onSearchValueChange,
  setMappedOptions,
  isLoading,
  color = 'customgreen'
}: SearchFiltersProps) {
  const { t } = useTranslation();
  const multiSelectRef = useRef<HTMLInputElement>(null);

  const renderMultiSelectOption: MultiSelectProps["renderOption"] = ({ option }) => {
    const currentFilter = options.find(
      (filter) => filter.category + "_" + filter.name === option.value
    );
    if (currentFilter) {
      const isSelected = searchFilters ? searchFilters.includes(option.value) : false;
      return (
        <Group gap="sm" className={isSelected ? 'bg-gray-100 dark:bg-gray-900' : ''}>
          <div>
            <Text size="sm">{currentFilter?.label || currentFilter?.name}</Text>
          </div>
        </Group>
      );
    } else {
      return (
        <Text size="sm">{option.value}</Text>
      );
    }
  };

  // Typed text becomes a filter, which runs the search. The button did not
  // do this: it stayed disabled until Enter had, and the field's blur empties
  // what was typed, so typing then tapping it did nothing at all.
  const commitTyped = (): boolean => {
    const typed = searchValue.trim();
    if (!typed) return false;
    onSearchValueChange("");
    multiSelectRef.current?.blur();
    if (searchFilters.includes(typed)) return false;
    onFiltersChange([...searchFilters, typed]);
    return true;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchValue.trim() !== "") {
      e.preventDefault();
      commitTyped();
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch">
        <div className="flex-1 min-w-0">
          <MultiSelect
            ref={multiSelectRef}
            classNames={{ 
              pill: color === 'blue' ? classes.pill_blue : classes.pill, 
              input: `relative block w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:z-10 focus:border-${color}-500 focus:outline-none focus:ring-2 focus:ring-${color}-500 sm:text-sm shadow-sm` 
            }}
            className="self-stretch"
            data={mappedOptions}
            value={searchFilters || []}
            onChange={(values) => {
              onFiltersChange(values);
              if (multiSelectRef.current) {
                multiSelectRef.current?.blur();
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('wizard.deviceSearch.filtersPlaceholder')}
            searchable
            nothingFoundMessage={t('wizard.deviceSearch.noFilters')}
            renderOption={renderMultiSelectOption}
            hidePickedOptions
            onSearchChange={(e) => {
              onSearchValueChange(e);
              if (!mappedOptions.some(m => m.items.some(i => i.value === e))) {
                // Was the literal "Search", in English in every locale.
                const typedGroup = t('wizard.deviceSearch.filterGroups.typed');
                const mappedOptions_copy: DeviceOptionSelect[] = [...mappedOptions];
                if (mappedOptions_copy.some(m => m.group === typedGroup)) {
                  const index = mappedOptions_copy.findIndex(m => m.group === typedGroup);
                  mappedOptions_copy.splice(index, 1);
                }
                mappedOptions_copy.push({
                  group: typedGroup,
                  items: [{ label: e, value: e }]
                });
                setMappedOptions(mappedOptions_copy);
              }
            }}
          />
        </div>
        {/* Was a Mantine Button wearing a hand-written Tailwind button style
            (py-3 px-6 rounded-full bg-…): that padding pushed the label past
            the fixed height Mantine sets on the root, clipping its descenders.
            Mantine's own props do the same job, and the label may wrap rather
            than be cut when a locale runs long. */}
        <Button
          color={color}
          loading={isLoading}
          // Keeps the focus in the field: its blur would empty the text first.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (!commitTyped()) onSearch();
          }}
          disabled={!searchValue.trim() && searchFilters.length === 0}
          size="md"
          radius="xl"
          fw={700}
          className="w-full sm:w-auto"
          styles={{
            // 44px is the accessible tap-target floor; the padding only kicks
            // in when a long label actually wraps to a second line.
            root: { height: 'auto', minHeight: 44, minWidth: 140 },
            label: { whiteSpace: 'normal', lineHeight: 1.3 },
            inner: { paddingTop: 4, paddingBottom: 4 },
          }}
          leftSection={!isLoading && <span className="material-symbols-outlined text-lg">search</span>}
        >
          {isLoading ? t('wizard.deviceSearch.searching') : t('wizard.deviceSearch.searchButton')}
        </Button>
      </div>
    </div>
  );
}
