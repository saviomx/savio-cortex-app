'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCRMCacheStore, formatTimeRemaining } from '@/lib/stores/crm-cache-store';
import type {
  FullContactResponse,
  FormSubmissionsResponse,
  ContactActivityResponse,
  TasksResponse,
} from '@/types/cortex';

// Generic hook for cached data with TTL awareness
interface UseCachedDataOptions<T> {
  phone: string;
  getCached: (phone: string) => T | null;
  setCached: (phone: string, data: T) => void;
  getTimeRemaining: (phone: string) => number | null;
  fetchFn: (phone: string) => Promise<T>;
  enabled?: boolean;
}

interface UseCachedDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isExpired: boolean;
  timeRemaining: string;
  refresh: () => Promise<void>;
}

function useCachedData<T>({
  phone,
  getCached,
  setCached,
  getTimeRemaining,
  fetchFn,
  enabled = true,
}: UseCachedDataOptions<T>): UseCachedDataResult<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [timeRemainingMs, setTimeRemainingMs] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get cached data
  const cachedData = getCached(phone);

  // Update time remaining every second
  useEffect(() => {
    if (!phone || !enabled) return;

    const updateTimeRemaining = () => {
      const remaining = getTimeRemaining(phone);
      setTimeRemainingMs(remaining);
    };

    updateTimeRemaining();
    intervalRef.current = setInterval(updateTimeRemaining, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [phone, enabled, getTimeRemaining]);

  // Fetch data if not cached or expired
  const fetchData = useCallback(async () => {
    if (!phone || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchFn(phone);
      setCached(phone, data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setLoading(false);
    }
  }, [phone, enabled, fetchFn, setCached]);

  // Initial fetch if no cached data
  useEffect(() => {
    if (!phone || !enabled) return;

    const cached = getCached(phone);
    if (!cached) {
      fetchData();
    }
  }, [phone, enabled, getCached, fetchData]);

  const isExpired = timeRemainingMs !== null && timeRemainingMs <= 0;
  const timeRemaining = formatTimeRemaining(timeRemainingMs);

  return {
    data: cachedData,
    loading,
    error,
    isExpired,
    timeRemaining,
    refresh: fetchData,
  };
}

// Hook for Full Contact data
export function useCachedFullContact(phone: string, enabled = true): UseCachedDataResult<FullContactResponse> {
  const { getFullContact, setFullContact, getFullContactTimeRemaining } = useCRMCacheStore();

  const fetchFn = useCallback(async (phone: string): Promise<FullContactResponse> => {
    const response = await fetch(`/api/crm/contact/full?phone=${encodeURIComponent(phone)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch contact data');
    }
    return response.json();
  }, []);

  return useCachedData({
    phone,
    getCached: getFullContact,
    setCached: setFullContact,
    getTimeRemaining: getFullContactTimeRemaining,
    fetchFn,
    enabled,
  });
}

// Hook for Form Submissions
export function useCachedFormSubmissions(phone: string, enabled = true): UseCachedDataResult<FormSubmissionsResponse> {
  const { getFormSubmissions, setFormSubmissions, getFormSubmissionsTimeRemaining } = useCRMCacheStore();

  const fetchFn = useCallback(async (phone: string): Promise<FormSubmissionsResponse> => {
    const response = await fetch(`/api/crm/contact/form-submissions?phone=${encodeURIComponent(phone)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch form submissions');
    }
    return response.json();
  }, []);

  return useCachedData({
    phone,
    getCached: getFormSubmissions,
    setCached: setFormSubmissions,
    getTimeRemaining: getFormSubmissionsTimeRemaining,
    fetchFn,
    enabled,
  });
}

// Hook for Activity Timeline
export function useCachedActivityTimeline(phone: string, enabled = true): UseCachedDataResult<ContactActivityResponse> {
  const { getActivityTimeline, setActivityTimeline, getActivityTimeRemaining } = useCRMCacheStore();

  const fetchFn = useCallback(async (phone: string): Promise<ContactActivityResponse> => {
    const response = await fetch(`/api/crm/contact/activity?phone=${encodeURIComponent(phone)}&limit=100`);
    if (!response.ok) {
      throw new Error('Failed to fetch activity timeline');
    }
    return response.json();
  }, []);

  return useCachedData({
    phone,
    getCached: getActivityTimeline,
    setCached: setActivityTimeline,
    getTimeRemaining: getActivityTimeRemaining,
    fetchFn,
    enabled,
  });
}

// Hook for Tasks
export function useCachedTasks(phone: string, enabled = true): UseCachedDataResult<TasksResponse> & {
  invalidate: () => void;
} {
  const { getTasks, setTasks, getTasksTimeRemaining, invalidateTasks } = useCRMCacheStore();

  const fetchFn = useCallback(async (phone: string): Promise<TasksResponse> => {
    const response = await fetch(`/api/crm/tasks?phone=${encodeURIComponent(phone)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch tasks');
    }
    return response.json();
  }, []);

  const result = useCachedData({
    phone,
    getCached: getTasks,
    setCached: setTasks,
    getTimeRemaining: getTasksTimeRemaining,
    fetchFn,
    enabled,
  });

  const invalidate = useCallback(() => {
    invalidateTasks(phone);
  }, [phone, invalidateTasks]);

  return {
    ...result,
    invalidate,
  };
}

// Refresh indicator component props
export interface RefreshIndicatorProps {
  isExpired: boolean;
  timeRemaining: string;
  loading: boolean;
  onRefresh: () => void;
}

// Export the store hook for direct access
export { useCRMCacheStore } from '@/lib/stores/crm-cache-store';
