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
      setResults: (results) => set({ results }),
      setSelectedIds: (selectedIds) => set({ selectedIds }),
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
