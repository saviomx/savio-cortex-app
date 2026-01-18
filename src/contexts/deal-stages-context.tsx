'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface DealStage {
  id: string;
  label: string;
}

interface DealStagesContextType {
  stagesMap: Record<string, string>;
  stages: DealStage[];
  isLoaded: boolean;
  getStageLabel: (stageId: string | null | undefined) => string | null;
}

const DealStagesContext = createContext<DealStagesContextType | undefined>(undefined);

export function DealStagesProvider({ children }: { children: ReactNode }) {
  const [stagesMap, setStagesMap] = useState<Record<string, string>>({});
  const [stages, setStages] = useState<DealStage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch deal stages once on mount
  useEffect(() => {
    const fetchDealStages = async () => {
      try {
        const response = await fetch('/api/crm/deal-stages');
        if (response.ok) {
          const data = await response.json();
          if (data.stages_map) {
            setStagesMap(data.stages_map);
          }
          if (data.stages) {
            setStages(data.stages);
          }
        }
      } catch (error) {
        console.error('Error fetching deal stages:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchDealStages();
  }, []);

  // Helper to get label from stage ID
  const getStageLabel = useCallback((stageId: string | null | undefined): string | null => {
    if (!stageId) return null;
    return stagesMap[stageId] || null;
  }, [stagesMap]);

  return (
    <DealStagesContext.Provider value={{ stagesMap, stages, isLoaded, getStageLabel }}>
      {children}
    </DealStagesContext.Provider>
  );
}

export function useDealStages() {
  const context = useContext(DealStagesContext);
  if (context === undefined) {
    throw new Error('useDealStages must be used within a DealStagesProvider');
  }
  return context;
}
