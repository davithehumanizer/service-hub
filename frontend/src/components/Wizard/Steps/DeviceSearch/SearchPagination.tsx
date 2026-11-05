import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pagination, Select, Group } from '@mantine/core';
import { ITEMS_PER_PAGE_OPTIONS } from './types';

interface SearchPaginationProps {
  position: 'top' | 'bottom';
  totalPages: number;
  currentPage: number;
  totalDevices: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  color?: string;
}

export default function SearchPagination({
  position,
  totalPages,
  currentPage,
  totalDevices,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  color = 'customgreen'
}: SearchPaginationProps) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;

  return (
    <div className={`flex flex-col gap-3 ${position === 'top' ? 'mb-4 pb-4 border-b border-gray-100 dark:border-gray-700' : 'mt-4 pt-4 border-t border-gray-100 dark:border-gray-700'}`}>
      <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            {t('wizard.deviceSearch.showingResults', { from: (currentPage - 1) * itemsPerPage + 1, to: Math.min(currentPage * itemsPerPage, totalDevices), total: totalDevices })}
          </p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap">{t('wizard.deviceSearch.showLabel')}</label>
            <Select
              size="xs"
              value={itemsPerPage.toString()}
              onChange={(value) => {
                if (value) {
                  onItemsPerPageChange(Number(value));
                }
              }}
              data={ITEMS_PER_PAGE_OPTIONS}
              className="w-16"
              allowDeselect={false}
              variant="unstyled"
            />
          </div>
        </div>
        <Pagination
          total={totalPages}
          value={currentPage}
          onChange={onPageChange}
          color={color === 'customgreen' ? '#6e9922' : color}
          withEdges
          size="sm"
          radius="xl"
        />
      </div>
    </div>
  );
}
