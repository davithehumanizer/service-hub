import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Text, TextInput, SimpleGrid, Card, Center, Box } from '@mantine/core';
import { getCategoryIcon } from './types';

interface CategorySelectionProps {
  categories: string[];
  /** Label to untranslated name: the icon is keyed on English words. */
  canonicalNames?: Map<string, string>;
  onCategorySelect: (category: string) => void;
  onSkip: () => void;
  color?: string;
}

export default function CategorySelection({
  categories,
  canonicalNames,
  onCategorySelect,
  onSkip,
  color = 'customgreen'
}: CategorySelectionProps) {
  const { t } = useTranslation();
  const [categorySearch, setCategorySearch] = useState('');

  const filteredCategories = categories.filter(cat =>
    cat.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Text fw={600} size="lg" className="text-center text-gray-800 dark:text-white">
        {t('wizard.deviceSearch.categoryTitle')}
      </Text>

      {/* A search box only earns its place once scrolling a flat grid gets
          tedious — for a short category list it's one more tap before the
          real content. */}
      {categories.length > 12 && (
        <TextInput
          placeholder={t('wizard.deviceSearch.searchCategories')}
          leftSection={<span className="material-symbols-outlined text-sm">search</span>}
          value={categorySearch}
          onChange={(e) => setCategorySearch(e.currentTarget.value)}
          radius="xl"
          size="md"
          className="max-w-md mx-auto"
        />
      )}

      <SimpleGrid cols={{ base: 3, sm: 4, md: 5 }} spacing="sm">
        {filteredCategories.map((catName) => {
          const catIcon = getCategoryIcon(canonicalNames?.get(catName) ?? catName);
          return (
            <Card
              key={catName}
              shadow="xs"
              padding="sm"
              radius="md"
              withBorder
              className={`cursor-pointer hover:shadow-md hover:border-${color}-500 bg-white dark:bg-gray-900 dark:bg-opacity-60 transition-all group`}
              onClick={() => onCategorySelect(catName)}
            >
              <Center mb={4}>
                <span className="material-symbols-outlined text-2xl text-gray-400 dark:text-gray-500 transition-colors">
                  {catIcon}
                </span>
              </Center>
              <Text fw={600} size="xs" ta="center" className={`leading-tight group-hover:text-${color}-600 dark:text-gray-200`}>
                {catName}
              </Text>
            </Card>
          );
        })}
        {filteredCategories.length === 0 && (
          <Box className="col-span-full py-10 text-center text-gray-400">
            {t('wizard.deviceSearch.noCategoriesFound')}
          </Box>
        )}
      </SimpleGrid>

      {/* Browsing by brand and skipping to manual entry both land on the same
          screen (brand selection) — one clear way out instead of three
          buttons pointing at the same place. */}
      <div className="flex justify-center pt-2">
        <Button variant="subtle" color="gray" size="sm" onClick={onSkip}>
          {t('wizard.deviceSearch.skipCategory')}
        </Button>
      </div>
    </div>
  );
}
