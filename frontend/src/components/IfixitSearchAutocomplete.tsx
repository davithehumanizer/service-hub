import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deviceService } from '../services/deviceService';

interface IfixitSuggestion {
  title: string;
}

interface IfixitSearchAutocompleteProps {
  /** Called when the user picks a suggestion or submits free text (Enter). */
  onSearch: (query: string) => void;
  initialValue?: string;
}

const AUTOCOMPLETE_MIN_CHARS = 2;
const AUTOCOMPLETE_DEBOUNCE_MS = 300;
const AUTOCOMPLETE_MAX_RESULTS = 8;

/**
 * Debounced autocomplete search bar for iFixit device wikis, backed by the
 * official iFixit `/suggest` endpoint (proxied through
 * GET /v1/external-adapters/ifixit/suggest). Modeled on the search pattern
 * used in HomePage.tsx.
 */
const IfixitSearchAutocomplete: React.FC<IfixitSearchAutocompleteProps> = ({
  onSearch,
  initialValue = '',
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<IfixitSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Only called from the input's onChange, never on mount/remount, so a pre-filled
  // `initialValue` (e.g. after selecting a suggestion and navigating) never re-triggers a fetch.
  const scheduleFetch = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (value.trim().length < AUTOCOMPLETE_MIN_CHARS) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsSearching(true);
      try {
        const response = await deviceService.suggestIfixit(value, controller.signal);
        const data = response?.data ?? response;
        const results = (data?.results ?? []) as IfixitSuggestion[];
        setSuggestions(results.slice(0, AUTOCOMPLETE_MAX_RESULTS));
        setShowSuggestions(true);
      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return;
        setSuggestions([]);
      } finally {
        if (abortControllerRef.current === controller) {
          setIsSearching(false);
          abortControllerRef.current = null;
        }
      }
    }, AUTOCOMPLETE_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectSuggestion = (title: string) => {
    setQuery(title);
    setShowSuggestions(false);
    onSearch(title);
  };

  return (
    <div ref={containerRef} className="relative mb-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm px-3 py-2 flex items-center gap-2 focus-within:ring-2 focus-within:ring-orange-500">
        {isSearching ? (
          <svg className="animate-spin text-orange-500 shrink-0" style={{ width: 18, height: 18 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : (
          <span className="material-symbols-outlined text-orange-500 text-xl">search</span>
        )}
        <input
          type="text"
          className="flex-1 bg-transparent outline-none border-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm"
          placeholder={t('tutorials.searchPlaceholder')}
          value={query}
          onChange={(e) => { const value = e.target.value; setQuery(value); scheduleFetch(value); }}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) {
              setShowSuggestions(false);
              onSearch(query.trim());
            }
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setSuggestions([]); setShowSuggestions(false); }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.title}-${index}`}>
              <button
                type="button"
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                onMouseDown={() => selectSuggestion(suggestion.title)}
              >
                <span className="material-symbols-outlined text-orange-500 text-base">devices</span>
                <span className="text-sm text-gray-800 dark:text-gray-200">{suggestion.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default IfixitSearchAutocomplete;
