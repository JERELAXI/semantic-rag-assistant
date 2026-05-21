export const SEARCH_MODE_KEY = 'search_mode';
export const TOP_K_KEY = 'top_k';
export type SearchMode = 'vector' | 'fts' | 'hybrid';

export function getSearchPrefs(): { searchMode: SearchMode; topK: number } {
  return {
    searchMode: (localStorage.getItem(SEARCH_MODE_KEY) as SearchMode) ?? 'hybrid',
    topK: parseInt(localStorage.getItem(TOP_K_KEY) ?? '5', 10),
  };
}
