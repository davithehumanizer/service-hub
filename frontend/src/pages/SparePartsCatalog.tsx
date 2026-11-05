import React, { useState, useEffect, useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  TextInput,
  Button,
  Badge,
  Text,
  Card,
  Grid,
  Group,
  Loader,
  Pagination,
  Paper,
} from '@mantine/core';
import {
  MagnifyingGlassIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import sparePartsService, { MeilisearchHit } from '../services/sparePartsService';
import { sparePartsCatalogueSearchUrl } from '../utils/globals';

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<string, string> = {
  'spare-part-status-excellent': 'green',
  'spare-part-status-good': 'teal',
  'spare-part-status-fair': 'yellow',
  'spare-part-status-poor': 'orange',
  'spare-part-status-for-parts': 'red',
};

const SparePartCard: React.FC<{ hit: MeilisearchHit; onClick: () => void }> = ({ hit, onClick }) => {
  const { t } = useTranslation();
  const lowestPrice = (() => {
    if (!hit.prices?.length) return null;
    const nums = hit.prices
      .map((p: any) => parseFloat(p.unitAmount ?? p.amount ?? p.value ?? p.price))
      .filter((n: number) => !isNaN(n) && isFinite(n));
    return nums.length ? Math.min(...nums) : null;
  })();
  const statusColor = STATUS_COLORS[hit.status?.slug ?? ''] ?? 'gray';

  return (
    <Card
      shadow="sm"
      padding="md"
      radius="md"
      withBorder
      h="100%"
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    >
      <Group mb={6} gap={6} wrap="nowrap" align="flex-start">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text fw={600} size="sm" lineClamp={2}>
            {hit.model?.name ?? 'Spare Part'}
          </Text>
          <Text size="xs" c="dimmed">
            {hit.model?.brand?.name}
          </Text>
        </div>
        {hit.status && (
          <Badge variant="light" color={statusColor} size="xs" style={{ flexShrink: 0 }}>
            {hit.status.name}
          </Badge>
        )}
      </Group>

      {hit.model?.type && (
        <Badge variant="outline" color="orange" size="xs" mb={6}>
          {hit.model.type.name}
        </Badge>
      )}

      {lowestPrice != null ? (
        <Text fw={700} size="sm" c="green" mb={4}>
          {lowestPrice.toFixed(2)} €
        </Text>
      ) : (
        <Text size="xs" c="dimmed" fs="italic" mb={4}>{t('spareParts.priceOnRequest')}</Text>
      )}

      {hit.repairer && (
        <Text size="xs" c="dimmed" lineClamp={1}>
          {hit.repairer.name} — {hit.repairer.address?.locality}
        </Text>
      )}
    </Card>
  );
};

const SparePartsCatalog: React.FC = () => {
  const { t, i18n } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [brand, setBrand] = useState<string | null>(params.get('brand'));
  const [category, setCategory] = useState<string | null>(params.get('category'));
  const [page, setPage] = useState(Number(params.get('page')) || 1);

  // The search lives in the URL, so Back from a part finds it as it was: the
  // brand, category and page were lost on the way back (PBI 13839).
  useEffect(() => {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (brand) next.set('brand', brand);
    if (category) next.set('category', category);
    if (page > 1) next.set('page', String(page));
    const search = next.toString() ? `?${next}` : '';
    if (search !== location.search) history.replace({ search });
  }, [query, brand, category, page]);

  const [hits, setHits] = useState<MeilisearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await sparePartsService.search({
        q: query || undefined,
        brand: brand || undefined,
        category: category || undefined,
        offset: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
      });
      setHits(result.hits ?? []);
      setTotal(result.estimatedTotalHits ?? 0);
    } catch {
      setError(t('spareParts.noResults'));
      setHits([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query, brand, category, page]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchResults();
  };

  const handleFilterChange = (setter: (v: string | null) => void) => (value: string | null) => {
    setter(value);
    setPage(1);
  };

  return (
    // Main.tsx already provides the centred container and horizontal padding;
    // adding another one here doubled the padding and threw the page off-centre.
    <div className="w-full py-10">
      {/* Header */}
      <Paper p="lg" radius="md" shadow="sm" mb="lg" className="bg-white dark:bg-gray-800">
        {/* Wraps on purpose: on a narrow screen the button drops to its own
            line rather than squeezing the title next to it. */}
        <Group mb="xs" justify="space-between" align="flex-start">
          <Group wrap="nowrap" align="flex-start">
            <span className="material-symbols-outlined text-3xl text-orange-500 dark:text-orange-400">
              build_circle
            </span>
            <div>
              <Text size="xl" fw={700}>
                {t('spareParts.title')}
              </Text>
              <Text size="sm" c="dimmed">
                {t('spareParts.subtitle')}
              </Text>
            </div>
          </Group>
          <Button
            component="a"
            // The catalogue is a separate application on its own domain, so
            // this opens in a new tab rather than replacing the session here.
            href={sparePartsCatalogueSearchUrl(i18n.language, query)}
            target="_blank"
            rel="noopener noreferrer"
            variant="light"
            size="sm"
            style={{ flexShrink: 0 }}
            rightSection={<ArrowTopRightOnSquareIcon className="w-4 h-4" />}
          >
            {t('spareParts.openCatalogue')}
          </Button>
        </Group>

        {/* Search bar */}
        <form onSubmit={handleSearch}>
          <Group gap="sm" align="flex-end" wrap="wrap">
            <TextInput
              style={{ flex: 1, minWidth: 200 }}
              placeholder={t('spareParts.searchPlaceholder')}
              leftSection={<MagnifyingGlassIcon className="w-4 h-4" />}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
            />
            <TextInput
              placeholder={t('spareParts.brandPlaceholder')}
              value={brand ?? ''}
              onChange={(e) => handleFilterChange(setBrand)(e.currentTarget.value || null)}
              style={{ minWidth: 140 }}
            />
            <TextInput
              placeholder={t('spareParts.typePlaceholder')}
              value={category ?? ''}
              onChange={(e) => handleFilterChange(setCategory)(e.currentTarget.value || null)}
              style={{ minWidth: 160 }}
            />
            <Button type="submit" color="orange" leftSection={<MagnifyingGlassIcon className="w-4 h-4" />}>
              {t('spareParts.search')}
            </Button>
          </Group>
        </form>
      </Paper>

      {/* Results */}
      {loading && (
        <Group justify="center" py="xl">
          <Loader size="lg" />
        </Group>
      )}

      {error && !loading && (
        <Text c="red" ta="center" py="xl">
          {error}
        </Text>
      )}

      {!loading && !error && hits.length === 0 && (
        <Text c="dimmed" ta="center" py="xl" fs="italic">
          {t('spareParts.noResults')}
        </Text>
      )}

      {!loading && hits.length > 0 && (
        <>
          <Text size="sm" c="dimmed" mb="md">
            {t('spareParts.resultsFound', { count: total })}
          </Text>
          <Grid gutter="md">
            {hits.map((hit, index) => (
              <Grid.Col key={hit.objectID ?? index} span={{ base: 12, xs: 6, sm: 4, md: 3 }}>
                <SparePartCard
                  hit={hit}
                  onClick={() => history.push(`/app/spare-parts/${hit.objectID}`)}
                />
              </Grid.Col>
            ))}
          </Grid>
          {totalPages > 1 && (
            <Group justify="center" mt="xl">
              <Pagination total={totalPages} value={page} onChange={setPage} color="orange" />
            </Group>
          )}
        </>
      )}
    </div>
  );
};

export default SparePartsCatalog;
