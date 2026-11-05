import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface PickedLocation {
  latitude: number;
  longitude: number;
  label: string;
}

interface LocationAutocompleteProps {
  onSelect: (location: PickedLocation) => void;
  onCancel: () => void;
  /** Where the user is thought to be, to rank the nearby "6211" first. */
  near?: { latitude: number; longitude: number } | null;
}

/** The project's countries, as Photon spells them. */
const COUNTRIES = new Set(['BE', 'CH', 'DE', 'FR', 'LU', 'NL']);
const MIN_CHARS = 3;
const DEBOUNCE_MS = 300;
const MAX_RESULTS = 5;
/** Photon translates place names into these; any other language gets local names. */
const PHOTON_LANGUAGES = new Set(['en', 'de', 'fr']);

const labelOf = (p: any): string => {
  const place = [p.postcode, p.name].filter(Boolean).join(' ') || p.city || '';
  const around = [p.city !== p.name ? p.city : null, p.state].filter(Boolean).join(', ');
  return [place, around, p.countrycode].filter(Boolean).join(', ');
};

/**
 * Address field with suggestions from Photon (komoot, OpenStreetMap data).
 * Nominatim's usage policy forbids autocomplete, and it cannot tell which
 * "6211" is meant; Photon ranks results by distance from `near`, which puts
 * Maastricht first for someone in Aachen. The position is rounded to about
 * 10 km before it leaves the browser: enough to rank, not to locate anyone.
 */
const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({ onSelect, onCancel, near }) => {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PickedLocation[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = async (value: string): Promise<PickedLocation[]> => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsSearching(true);
    setError('');
    try {
      const lang = i18n.language?.slice(0, 2);
      const params = new URLSearchParams({ q: value, limit: '15' });
      if (lang && PHOTON_LANGUAGES.has(lang)) params.set('lang', lang);
      if (near) {
        params.set('lat', near.latitude.toFixed(1));
        params.set('lon', near.longitude.toFixed(1));
      }
      const response = await fetch(`https://photon.komoot.io/api/?${params}`, { signal: controller.signal });
      const data = await response.json();
      const seen = new Set<string>();
      const results: PickedLocation[] = [];
      for (const feature of data.features ?? []) {
        const p = feature.properties ?? {};
        if (!COUNTRIES.has(p.countrycode)) continue;
        const label = labelOf(p);
        if (!label || seen.has(label)) continue;
        seen.add(label);
        const [longitude, latitude] = feature.geometry.coordinates;
        results.push({ latitude, longitude, label });
        if (results.length === MAX_RESULTS) break;
      }
      setSuggestions(results);
      setActiveIndex(results.length > 0 ? 0 : -1);
      if (results.length === 0) setError(t('repairMap.addressNotFound'));
      return results;
    } catch (err: any) {
      if (err?.name === 'AbortError') return [];
      setSuggestions([]);
      setError(t('repairMap.geocodingFailed'));
      return [];
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsSearching(false);
      }
    }
  };

  const onChange = (value: string) => {
    setQuery(value);
    setError('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < MIN_CHARS) {
      if (abortRef.current) abortRef.current.abort();
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }
    debounceRef.current = setTimeout(() => void search(value.trim()), DEBOUNCE_MS);
  };

  // Enter or OK: the highlighted suggestion, or — typed faster than the
  // debounce — the first result of a search run right away.
  const submit = async () => {
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      onSelect(suggestions[activeIndex]);
      return;
    }
    if (!query.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const results = await search(query.trim());
    if (results.length > 0) onSelect(results[0]);
  };

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  return (
    <div className="relative flex flex-col gap-1">
      <form
        onSubmit={(e) => { e.preventDefault(); void submit(); }}
        className="flex items-center gap-1"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && suggestions.length > 0) {
              e.preventDefault();
              setActiveIndex((i) => (i + 1) % suggestions.length);
            } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
              e.preventDefault();
              setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
            } else if (e.key === 'Escape') {
              onCancel();
            }
          }}
          placeholder={t('repairMap.addressPlaceholder')}
          className="flex-1 min-w-0 text-xs px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          autoFocus
          autoComplete="off"
        />
        <button type="submit" disabled={isSearching || !query.trim()}
          className="text-xs px-2 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors">
          {isSearching ? '...' : 'OK'}
        </button>
        <button type="button" onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </form>
      {suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((s, index) => (
            <li key={s.label}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onSelect(s); }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-gray-800 dark:text-gray-200 ${
                  index === activeIndex ? 'bg-purple-50 dark:bg-gray-700' : ''
                }`}
              >
                <span className="material-symbols-outlined text-sm text-purple-500">location_on</span>
                <span className="truncate">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};

export default LocationAutocomplete;
