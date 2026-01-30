import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState, useSyncExternalStore } from 'react';

interface FilterState {
  assignedSdrId: number | null;
}

interface FilterActions {
  setAssignedSdrId: (sdrId: number | null) => void;
  clearFilters: () => void;
}

type FilterStore = FilterState & FilterActions;

export const useFilterStore = create<FilterStore>()(
  persist(
    (set) => ({
      // Initial state
      assignedSdrId: null,

      // Actions
      setAssignedSdrId: (sdrId: number | null) => {
        set({ assignedSdrId: sdrId });
      },

      clearFilters: () => {
        set({ assignedSdrId: null });
      },
    }),
    {
      name: 'savio-filter-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ assignedSdrId: state.assignedSdrId }),
    }
  )
);

/**
 * Hook to safely use the filter store with hydration handling
 * Uses useSyncExternalStore pattern for proper SSR/hydration
 */
export function useHydratedFilterStore() {
  const store = useFilterStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Mark as hydrated after mount - Zustand persist hydrates synchronously on client
    setIsHydrated(true);
  }, []);

  // During SSR or before hydration, return null to avoid mismatch
  // After hydration, return the actual store value
  const assignedSdrId = isHydrated ? store.assignedSdrId : null;

  return {
    assignedSdrId,
    setAssignedSdrId: store.setAssignedSdrId,
    clearFilters: store.clearFilters,
    isHydrated,
  };
}
