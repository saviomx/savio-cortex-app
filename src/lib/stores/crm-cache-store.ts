import { create } from 'zustand';
import type {
  FullContactResponse,
  FormSubmissionsResponse,
  ContactActivityResponse,
  TasksResponse,
  DealStage,
} from '@/types/cortex';

// TTL Configuration (in milliseconds)
export const TTL = {
  DEAL_STAGES: 60 * 60 * 1000,      // 1 hour
  FULL_CONTACT: 20 * 60 * 1000,     // 20 minutes
  FORM_SUBMISSIONS: 30 * 60 * 1000, // 30 minutes
  ACTIVITY: 5 * 60 * 1000,          // 5 minutes
  TASKS: 3 * 60 * 1000,             // 3 minutes
  CRM_DATA: 15 * 60 * 1000,         // 15 minutes
} as const;

// Cache entry with timestamp and TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// CRM data from /api/leads/[id]/crm
interface CRMData {
  deal?: Record<string, unknown> | null;
  owner?: Record<string, unknown> | null;
  links?: Record<string, unknown> | null;
  contact?: Record<string, unknown> | null;
}

interface CRMCacheState {
  // Cached data
  dealStages: CacheEntry<DealStage[]> | null;
  fullContact: Map<string, CacheEntry<FullContactResponse>>;
  formSubmissions: Map<string, CacheEntry<FormSubmissionsResponse>>;
  activityTimeline: Map<string, CacheEntry<ContactActivityResponse>>;
  tasks: Map<string, CacheEntry<TasksResponse>>;
  crmData: Map<string, CacheEntry<CRMData>>;
}

interface CRMCacheActions {
  // Check if cache entry is still valid
  isValid: <T>(entry: CacheEntry<T> | null | undefined) => boolean;

  // Get time remaining until expiry (returns null if not cached, 0 or negative if expired)
  getTimeRemaining: <T>(entry: CacheEntry<T> | null | undefined) => number | null;

  // Deal stages (global, not phone-specific)
  getDealStages: () => DealStage[] | null;
  setDealStages: (data: DealStage[]) => void;
  getDealStagesTimeRemaining: () => number | null;

  // Full contact (by phone)
  getFullContact: (phone: string) => FullContactResponse | null;
  setFullContact: (phone: string, data: FullContactResponse) => void;
  getFullContactTimeRemaining: (phone: string) => number | null;

  // Form submissions (by phone)
  getFormSubmissions: (phone: string) => FormSubmissionsResponse | null;
  setFormSubmissions: (phone: string, data: FormSubmissionsResponse) => void;
  getFormSubmissionsTimeRemaining: (phone: string) => number | null;

  // Activity timeline (by phone)
  getActivityTimeline: (phone: string) => ContactActivityResponse | null;
  setActivityTimeline: (phone: string, data: ContactActivityResponse) => void;
  getActivityTimeRemaining: (phone: string) => number | null;

  // Tasks (by phone)
  getTasks: (phone: string) => TasksResponse | null;
  setTasks: (phone: string, data: TasksResponse) => void;
  getTasksTimeRemaining: (phone: string) => number | null;
  invalidateTasks: (phone: string) => void;

  // CRM data (by leadId)
  getCRMData: (leadId: string) => CRMData | null;
  setCRMData: (leadId: string, data: CRMData) => void;
  getCRMDataTimeRemaining: (leadId: string) => number | null;

  // Clear all cache
  clearAll: () => void;

  // Clear cache for a specific phone
  clearForPhone: (phone: string) => void;
}

type CRMCacheStore = CRMCacheState & CRMCacheActions;

export const useCRMCacheStore = create<CRMCacheStore>((set, get) => ({
  // Initial state
  dealStages: null,
  fullContact: new Map(),
  formSubmissions: new Map(),
  activityTimeline: new Map(),
  tasks: new Map(),
  crmData: new Map(),

  // Utility: Check if cache entry is valid
  isValid: <T>(entry: CacheEntry<T> | null | undefined): boolean => {
    if (!entry) return false;
    const now = Date.now();
    return now - entry.timestamp < entry.ttl;
  },

  // Utility: Get time remaining until expiry
  getTimeRemaining: <T>(entry: CacheEntry<T> | null | undefined): number | null => {
    if (!entry) return null;
    const now = Date.now();
    const elapsed = now - entry.timestamp;
    return entry.ttl - elapsed;
  },

  // Deal Stages
  getDealStages: () => {
    const { dealStages, isValid } = get();
    if (isValid(dealStages)) {
      return dealStages!.data;
    }
    return null;
  },

  setDealStages: (data: DealStage[]) => {
    set({
      dealStages: {
        data,
        timestamp: Date.now(),
        ttl: TTL.DEAL_STAGES,
      },
    });
  },

  getDealStagesTimeRemaining: () => {
    const { dealStages, getTimeRemaining } = get();
    return getTimeRemaining(dealStages);
  },

  // Full Contact
  getFullContact: (phone: string) => {
    const { fullContact, isValid } = get();
    const entry = fullContact.get(phone);
    if (isValid(entry)) {
      return entry!.data;
    }
    return null;
  },

  setFullContact: (phone: string, data: FullContactResponse) => {
    const { fullContact } = get();
    const newMap = new Map(fullContact);
    newMap.set(phone, {
      data,
      timestamp: Date.now(),
      ttl: TTL.FULL_CONTACT,
    });
    set({ fullContact: newMap });
  },

  getFullContactTimeRemaining: (phone: string) => {
    const { fullContact, getTimeRemaining } = get();
    return getTimeRemaining(fullContact.get(phone));
  },

  // Form Submissions
  getFormSubmissions: (phone: string) => {
    const { formSubmissions, isValid } = get();
    const entry = formSubmissions.get(phone);
    if (isValid(entry)) {
      return entry!.data;
    }
    return null;
  },

  setFormSubmissions: (phone: string, data: FormSubmissionsResponse) => {
    const { formSubmissions } = get();
    const newMap = new Map(formSubmissions);
    newMap.set(phone, {
      data,
      timestamp: Date.now(),
      ttl: TTL.FORM_SUBMISSIONS,
    });
    set({ formSubmissions: newMap });
  },

  getFormSubmissionsTimeRemaining: (phone: string) => {
    const { formSubmissions, getTimeRemaining } = get();
    return getTimeRemaining(formSubmissions.get(phone));
  },

  // Activity Timeline
  getActivityTimeline: (phone: string) => {
    const { activityTimeline, isValid } = get();
    const entry = activityTimeline.get(phone);
    if (isValid(entry)) {
      return entry!.data;
    }
    return null;
  },

  setActivityTimeline: (phone: string, data: ContactActivityResponse) => {
    const { activityTimeline } = get();
    const newMap = new Map(activityTimeline);
    newMap.set(phone, {
      data,
      timestamp: Date.now(),
      ttl: TTL.ACTIVITY,
    });
    set({ activityTimeline: newMap });
  },

  getActivityTimeRemaining: (phone: string) => {
    const { activityTimeline, getTimeRemaining } = get();
    return getTimeRemaining(activityTimeline.get(phone));
  },

  // Tasks
  getTasks: (phone: string) => {
    const { tasks, isValid } = get();
    const entry = tasks.get(phone);
    if (isValid(entry)) {
      return entry!.data;
    }
    return null;
  },

  setTasks: (phone: string, data: TasksResponse) => {
    const { tasks } = get();
    const newMap = new Map(tasks);
    newMap.set(phone, {
      data,
      timestamp: Date.now(),
      ttl: TTL.TASKS,
    });
    set({ tasks: newMap });
  },

  getTasksTimeRemaining: (phone: string) => {
    const { tasks, getTimeRemaining } = get();
    return getTimeRemaining(tasks.get(phone));
  },

  invalidateTasks: (phone: string) => {
    const { tasks } = get();
    const newMap = new Map(tasks);
    newMap.delete(phone);
    set({ tasks: newMap });
  },

  // CRM Data
  getCRMData: (leadId: string) => {
    const { crmData, isValid } = get();
    const entry = crmData.get(leadId);
    if (isValid(entry)) {
      return entry!.data;
    }
    return null;
  },

  setCRMData: (leadId: string, data: CRMData) => {
    const { crmData } = get();
    const newMap = new Map(crmData);
    newMap.set(leadId, {
      data,
      timestamp: Date.now(),
      ttl: TTL.CRM_DATA,
    });
    set({ crmData: newMap });
  },

  getCRMDataTimeRemaining: (leadId: string) => {
    const { crmData, getTimeRemaining } = get();
    return getTimeRemaining(crmData.get(leadId));
  },

  // Clear all cache
  clearAll: () => {
    set({
      dealStages: null,
      fullContact: new Map(),
      formSubmissions: new Map(),
      activityTimeline: new Map(),
      tasks: new Map(),
      crmData: new Map(),
    });
  },

  // Clear cache for a specific phone
  clearForPhone: (phone: string) => {
    const { fullContact, formSubmissions, activityTimeline, tasks } = get();

    const newFullContact = new Map(fullContact);
    newFullContact.delete(phone);

    const newFormSubmissions = new Map(formSubmissions);
    newFormSubmissions.delete(phone);

    const newActivityTimeline = new Map(activityTimeline);
    newActivityTimeline.delete(phone);

    const newTasks = new Map(tasks);
    newTasks.delete(phone);

    set({
      fullContact: newFullContact,
      formSubmissions: newFormSubmissions,
      activityTimeline: newActivityTimeline,
      tasks: newTasks,
    });
  },
}));

// Helper function to format time remaining
export function formatTimeRemaining(ms: number | null): string {
  if (ms === null) return 'Not cached';
  if (ms <= 0) return 'Expired';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
