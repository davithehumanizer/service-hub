import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Text, TextInput, SimpleGrid, Card, Group, Box } from '@mantine/core';

interface BrandSelectionProps {
  brands: string[];
  selectedCategory: string | null;
  onBrandSelect: (brand: string) => void;
  onSkip: () => void;
  color?: string;
}

export default function BrandSelection({
  brands,
  selectedCategory,
  onBrandSelect,
  onSkip,
  color = 'customgreen'
}: BrandSelectionProps) {
  const { t } = useTranslation();
  const [brandSearch, setBrandSearch] = useState('');

  const filteredBrands = brands.filter(brand =>
    brand.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const brandGroups = alphabet.reduce((acc, char) => {
    const brandsByLetter = filteredBrands.filter(b => b.toUpperCase().startsWith(char));
    if (brandsByLetter.length > 0) acc[char] = brandsByLetter;
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <div className="space-y-4">
      {/* Going back is the breadcrumb's job (its category segment returns
          here's parent step) — a second back arrow right under it was two
          near-identical controls doing different things. */}
      <Text fw={600} size="lg" className="text-center text-gray-800 dark:text-white">
        {selectedCategory ? t('wizard.deviceSearch.brandQuestion', { category: selectedCategory }) : t('wizard.deviceSearch.brandQuestionFallback')}
      </Text>

      <TextInput
        placeholder={t('wizard.deviceSearch.searchBrands')}
        leftSection={<span className="material-symbols-outlined text-sm">search</span>}
        value={brandSearch}
        onChange={(e) => setBrandSearch(e.currentTarget.value)}
        radius="xl"
        size="md"
        className="max-w-md mx-auto"
      />

      {/* Alphabetical Jump Bar — a 26-tile strip wrapping over several lines
          eats more mobile screen than it saves; the search box above already
          gets to a brand faster with one thumb. Desktop keeps it, where a
          mouse can scan and click it in one motion. */}
      {!brandSearch && brands.length > 20 && (
        <Group gap={4} justify="center" className="hidden sm:flex flex-wrap">
          {alphabet.map(char => (
            <Button
              key={char}
              size="compact-xs"
              variant="subtle"
              color="gray"
              disabled={!brands.some(b => b.toUpperCase().startsWith(char))}
              onClick={() => {
                const el = document.getElementById(`brand-group-${char}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              {char}
            </Button>
          ))}
        </Group>
      )}

      <div className="overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: 500 }}>
        {brandSearch ? (
          <SimpleGrid cols={{ base: 3, sm: 4, md: 5 }} spacing="sm">
            {filteredBrands.map((brand) => (
              <Card
                key={brand}
                shadow="xs"
                padding="sm"
                radius="md"
                withBorder
                className={`cursor-pointer hover:shadow-sm hover:border-${color}-500 bg-white dark:bg-gray-900 dark:bg-opacity-60 transition-all text-center group`}
                onClick={() => onBrandSelect(brand)}
              >
                <Text fw={600} size="sm" className={`group-hover:text-${color}-600 dark:text-gray-200`}>{brand}</Text>
              </Card>
            ))}
          </SimpleGrid>
        ) : (
          <div className="space-y-6">
            {Object.entries(brandGroups).map(([char, brandsInGroup]) => (
              <div key={char} id={`brand-group-${char}`} className="space-y-2">
                <Text fw={700} size="sm" c="dimmed" className="border-b border-gray-100 dark:border-gray-800 pb-1">
                  {char}
                </Text>
                <SimpleGrid cols={{ base: 3, sm: 4, md: 5 }} spacing="sm">
                  {brandsInGroup.map((brand) => (
                    <Card
                      key={brand}
                      shadow="xs"
                      padding="sm"
                      radius="md"
                      withBorder
                      className={`cursor-pointer hover:shadow-sm hover:border-${color}-500 bg-white dark:bg-gray-900 dark:bg-opacity-60 transition-all text-center group`}
                      onClick={() => onBrandSelect(brand)}
                    >
                      <Text fw={600} size="sm" className={`group-hover:text-${color}-600 dark:text-gray-200`}>{brand}</Text>
                    </Card>
                  ))}
                </SimpleGrid>
              </div>
            ))}
          </div>
        )}
        {filteredBrands.length === 0 && (
          <Box className="py-10 text-center text-gray-400">
            {t('wizard.deviceSearch.noBrandsFound')}
          </Box>
        )}
      </div>

      {/* Same shape as the category step: browse, then one way to move on
          without choosing. */}
      <div className="flex justify-center pt-2">
        <Button variant="subtle" color="gray" size="sm" onClick={onSkip}>
          {t('wizard.deviceSearch.skipBrand')}
        </Button>
      </div>
    </div>
  );
}
