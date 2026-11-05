import api from './api';

export interface GlobalSearchResult {
  id: string;
  /** A model since the global search returns models (decision 12). */
  type: 'device-model' | 'repairer' | 'spare-part';
  title: string;
  subtitle?: string;
  thumbnail?: string;
  link: string;
}

export const searchService = {
  globalSearch: async (query: string): Promise<GlobalSearchResult[]> => {
    if (!query) return [];
    try {
      const response = await api.get<GlobalSearchResult[]>(`v1/search/global`, {
        params: { q: query },
      });
      return response.data;
    } catch (error) {
      console.error('Search failed', error);
      return [];
    }
  },
};
