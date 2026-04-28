import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useExtractorStore = create(
  persist(
    (set, get) => ({
      keywords: ["Web Design", "Software"],
      locations: ["Cairo, Egypt"],
      results: [],
      selectedIds: [],
      filterWebsite: "any",
      minReviews: "",
      minRating: "",
      maxResultsLimit: "50",
      viewMode: "table",

      setKeywords: (keywords) => set({ keywords }),
      setLocations: (locations) => set({ locations }),
      setResults: (updater) => set((state) => ({ 
        results: typeof updater === 'function' ? updater(state.results) : updater 
      })),
      setSelectedIds: (updater) => set((state) => ({
        selectedIds: typeof updater === 'function' ? updater(state.selectedIds) : updater
      })),
      setFilterWebsite: (filterWebsite) => set({ filterWebsite }),
      setMinReviews: (minReviews) => set({ minReviews }),
      setMinRating: (minRating) => set({ minRating }),
      setMaxResultsLimit: (maxResultsLimit) => set({ maxResultsLimit }),
      setViewMode: (viewMode) => set({ viewMode }),

      addKeyword: (k) => set(state => ({ keywords: [...state.keywords, k] })),
      removeKeyword: (index) => set(state => ({ keywords: state.keywords.filter((_, i) => i !== index) })),
      
      addLocation: (l) => set(state => ({ locations: [...state.locations, l] })),
      removeLocation: (index) => set(state => ({ locations: state.locations.filter((_, i) => i !== index) })),

      clearResults: () => set({ results: [], selectedIds: [] }),
    }),
    {
      name: 'extractor-storage',
    }
  )
);
