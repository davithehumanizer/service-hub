import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TextInput, Popover, Text, Group, Box, ScrollArea, Badge, Loader, Divider } from '@mantine/core';
import { useDebouncedValue, useClickOutside } from '@mantine/hooks';
import { searchService, GlobalSearchResult } from '../services/searchService';
import { SearchIcon } from '../icons';
import DeviceImage from './Devices/DeviceImage';

export default function Omnisearch() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [debounced] = useDebouncedValue(query, 300);
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);
  const history = useHistory();
  const clickOutsideRef = useClickOutside(() => setOpened(false));

  useEffect(() => {
    const performSearch = async () => {
      if (debounced.trim().length < 2) {
        setResults([]);
        setOpened(false);
        return;
      }

      setLoading(true);
      setOpened(true);
      const data = await searchService.globalSearch(debounced);
      setResults(data);
      setLoading(false);
    };

    performSearch();
  }, [debounced]);

  const handleSelect = (link: string) => {
    setOpened(false);
    setQuery('');
    history.push(link);
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, GlobalSearchResult[]>);

  const typeLabels: Record<string, { label: string, color: string, icon: string }> = {
    'device-model': { label: t('omnisearch.devices'), color: 'blue', icon: 'devices' },
    repairer: { label: t('omnisearch.repairers'), color: 'green', icon: 'home_repair_service' },
    'spare-part': { label: t('omnisearch.spareParts'), color: 'orange', icon: 'settings' },
  };

  return (
    <Box className="relative w-full max-w-xl mr-6" ref={clickOutsideRef}>
      <Popover 
        opened={opened} 
        onChange={setOpened} 
        width="target" 
        position="bottom" 
        shadow="md"
        offset={5}
      >
        <Popover.Target>
          <TextInput
            placeholder={t('omnisearch.placeholder')}
            leftSection={<SearchIcon className="w-4 h-4" />}
            value={query}
            onChange={(e) => {
              setQuery(e.currentTarget.value);
              if (e.currentTarget.value.trim().length >= 2) setOpened(true);
            }}
            onFocus={() => {
              if (query.trim().length >= 2) setOpened(true);
            }}
            radius="md"
            className="w-full"
            rightSection={loading && <Loader size="xs" />}
          />
        </Popover.Target>

        <Popover.Dropdown p="sm" className="!bg-white dark:!bg-gray-900 !border-gray-200 dark:!border-gray-700 !rounded-xl !shadow-2xl">
          <ScrollArea.Autosize mah={500} type="auto" scrollbarSize={6}>
            <Box>
              {Object.entries(groupedResults).map(([type, items]) => (
                <Box key={type} mb="md">
                  <Group px="xs" py="xs" justify="space-between" className="mb-2">
                    <Group gap="xs">
                      <span className={`material-symbols-outlined text-lg ${
                        type === 'device-model' ? 'text-blue-500' : 
                        type === 'repairer' ? 'text-green-500' : 'text-orange-500'
                      }`}>
                        {typeLabels[type]?.icon}
                      </span>
                      <Text size="sm" fw={700} className="text-gray-700 dark:text-gray-300">
                        {typeLabels[type]?.label || type}
                      </Text>
                    </Group>
                    <Badge size="sm" color={typeLabels[type]?.color || 'gray'} variant="light" radius="md">
                      {items.length}
                    </Badge>
                  </Group>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="relative p-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 cursor-pointer transition-all duration-200 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-lg hover:-translate-y-0.5 group overflow-hidden"
                        onClick={() => handleSelect(item.link)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <DeviceImage
                              urls={item.thumbnail ? [item.thumbnail] : []}
                              alt={item.title}
                              wrapperClassName="w-12 h-12 rounded-lg bg-white dark:bg-gray-800 p-1 border border-gray-100 dark:border-gray-700 flex items-center justify-center overflow-hidden shadow-sm"
                              className="object-contain max-w-full max-h-full"
                              fallback={
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                type === 'device-model' ? 'bg-blue-50 dark:bg-blue-900/20' : 
                                type === 'repairer' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-orange-50 dark:bg-orange-900/20'
                              }`}>
                                <span className={`material-symbols-outlined text-2xl ${
                                  type === 'device-model' ? 'text-blue-500' : 
                                  type === 'repairer' ? 'text-green-500' : 'text-orange-500'
                                }`}>
                                  {typeLabels[type]?.icon}
                                </span>
                              </div>
                              }
                            />
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <h4 className="text-base font-semibold text-gray-800 dark:text-white break-words">
                              {item.title}
                            </h4>
                            {item.subtitle && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 break-words">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-gray-400 dark:text-gray-500">
                              arrow_forward
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Box>
              ))}
              {loading && (
                <Box px="xs" py="sm" className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-3 p-3 rounded-xl border-2 border-gray-100 dark:border-gray-800 animate-pulse">
                      <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </Box>
              )}
              {results.length === 0 && !loading && (
                <Box py="xl" px="md" className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 mb-4">
                    <span className="material-symbols-outlined text-3xl text-gray-300 dark:text-gray-600">search_off</span>
                  </div>
                  <Text size="sm" c="dimmed" className="font-medium">{t('omnisearch.noResults', { query: debounced })}</Text>
                  <Text size="xs" c="dimmed" mt="xs">{t('omnisearch.noResultsHint')}</Text>
                </Box>
              )}
            </Box>
          </ScrollArea.Autosize>
          <Divider my="xs" />
          <Group gap="xs" px="xs" pb="xs">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border-2 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
              onClick={() => handleSelect('/app/devices?q=' + encodeURIComponent(query))}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>devices</span>
              {t('omnisearch.searchDevices')}
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border-2 border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20 transition-colors"
              onClick={() => handleSelect('/app/repair-map?q=' + encodeURIComponent(query))}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>home_repair_service</span>
              {t('omnisearch.searchRepairers')}
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border-2 border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20 transition-colors"
              onClick={() => handleSelect('/app/spare-parts?q=' + encodeURIComponent(query))}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>settings</span>
              {t('omnisearch.searchSpareParts')}
            </button>
          </Group>
        </Popover.Dropdown>
      </Popover>
    </Box>
  );
}
