import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Center, Text, Title, SimpleGrid } from '@mantine/core';

interface SearchMethodSelectionProps {
  onMethodSelect: (method: 'guided' | 'ean' | 'free' | 'photo') => void;
  color?: string;
}

export default function SearchMethodSelection({ onMethodSelect, color = 'customgreen' }: SearchMethodSelectionProps) {
  const { t } = useTranslation();
  return (
    <div>
      {/* The wizard step header above already asks "what device do you want
          to repair?" — a description here repeated it, and pushed the choices
          below the fold. Only the question these cards answer stays: large
          from sm up, a single compact line on a phone. */}
      <Text fw={600} className="sm:hidden text-center text-gray-700 dark:text-gray-200 mb-4">
        {t('wizard.deviceSearch.methodTitle')}
      </Text>
      <div className="hidden sm:flex text-center flex-col items-center mb-8">
        <Title order={1} className="text-3xl font-extrabold text-gray-800 dark:text-white">
          {t('wizard.deviceSearch.methodTitle')}
        </Title>
      </div>

      <SimpleGrid cols={2} spacing={{ base: 'sm', sm: 'xl' }} className="max-w-4xl mx-auto">
        {/* Guided Search */}
        <Card
          shadow="md"
          padding="md"
          radius="lg"
          withBorder
          className={`cursor-pointer hover:shadow-xl hover:border-${color}-500 transition-all group bg-white dark:bg-gray-900`}
          onClick={() => onMethodSelect('guided')}
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start sm:flex-nowrap gap-2 sm:gap-4 text-center sm:text-left">
            <Center className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 transition-transform group-hover:scale-110 flex-shrink-0`}>
              <span className="material-symbols-outlined text-2xl sm:text-4xl sm:px-4">travel_explore</span>
            </Center>
            <div>
              <Text fw={700} size="md" className={`sm:text-xl sm:mb-1 group-hover:text-${color}-600 transition-colors dark:text-gray-100`}>
                {t('wizard.deviceSearch.guided')}
              </Text>
              <Text size="sm" c="dimmed" className="hidden sm:block">
                {t('wizard.deviceSearch.guidedDesc')}
              </Text>
            </div>
          </div>
        </Card>

        {/* EAN Search */}
        <Card
          shadow="md"
          padding="md"
          radius="lg"
          withBorder
          className="cursor-pointer hover:shadow-xl hover:border-blue-500 transition-all group bg-white dark:bg-gray-900"
          onClick={() => onMethodSelect('ean')}
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start sm:flex-nowrap gap-2 sm:gap-4 text-center sm:text-left">
            <Center className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 transition-transform group-hover:scale-110 flex-shrink-0">
              <span className="material-symbols-outlined text-2xl sm:text-4xl sm:px-4">barcode_scanner</span>
            </Center>
            <div>
              <Text fw={700} size="md" className="sm:text-xl sm:mb-1 group-hover:text-blue-600 transition-colors dark:text-gray-100">
                {t('wizard.deviceSearch.eanMethod')}
              </Text>
              <Text size="sm" c="dimmed" className="hidden sm:block">
                {t('wizard.deviceSearch.eanMethodDesc')}
              </Text>
            </div>
          </div>
        </Card>

        {/* Free Search */}
        <Card
          shadow="md"
          padding="md"
          radius="lg"
          withBorder
          className="cursor-pointer hover:shadow-xl hover:border-orange-500 transition-all group bg-white dark:bg-gray-900"
          onClick={() => onMethodSelect('free')}
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start sm:flex-nowrap gap-2 sm:gap-4 text-center sm:text-left">
            <Center className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 transition-transform group-hover:scale-110 flex-shrink-0">
              <span className="material-symbols-outlined text-2xl sm:text-4xl sm:px-4">search</span>
            </Center>
            <div>
              <Text fw={700} size="md" className="sm:text-xl sm:mb-1 group-hover:text-orange-600 transition-colors dark:text-gray-100">
                {t('wizard.deviceSearch.free')}
              </Text>
              <Text size="sm" c="dimmed" className="hidden sm:block">
                {t('wizard.deviceSearch.freeDesc')}
              </Text>
            </div>
          </div>
        </Card>

        {/* Photo Identification */}
        <Card
          shadow="md"
          padding="md"
          radius="lg"
          withBorder
          className="cursor-pointer hover:shadow-xl hover:border-purple-500 transition-all group bg-white dark:bg-gray-900"
          onClick={() => onMethodSelect('photo')}
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start sm:flex-nowrap gap-2 sm:gap-4 text-center sm:text-left">
            <Center className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 transition-transform group-hover:scale-110 flex-shrink-0">
              <span className="material-symbols-outlined text-2xl sm:text-4xl sm:px-4">photo_camera</span>
            </Center>
            <div>
              <Text fw={700} size="md" className="sm:text-xl sm:mb-1 group-hover:text-purple-600 transition-colors dark:text-gray-100">
                {t('wizard.deviceSearch.photoId')}
              </Text>
              <Text size="sm" c="dimmed" className="hidden sm:block">
                {t('wizard.deviceSearch.photoIdDesc')}
              </Text>
            </div>
          </div>
        </Card>
      </SimpleGrid>
    </div>
  );
}
