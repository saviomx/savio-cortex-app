import { useEffect, useRef, useState, useCallback } from 'react';

type UseAutoPollingOptions = {
  interval?: number;
  enabled?: boolean;
  onPoll: () => void | Promise<void>;
};

/**
 * Optimized auto-polling hook that avoids restarting on callback changes.
 * Uses refs to maintain stable callback references.
 */
export function useAutoPolling({ interval = 5000, enabled = true, onPoll }: UseAutoPollingOptions) {
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Store callback in ref to avoid restarting polling when callback changes
  const onPollRef = useRef(onPoll);
  onPollRef.current = onPoll;

  // Store enabled state in ref for visibility handler
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const startPolling = useCallback(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsPolling(true);

    // Start interval - DO NOT call immediately, let the component handle initial fetch
    intervalRef.current = setInterval(() => {
      try {
        onPollRef.current();
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, interval);
  }, [interval]); // Only depend on interval, not the callback

  // Handle visibility change (pause when tab is hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else if (enabledRef.current) {
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startPolling, stopPolling]);

  // Start/stop polling based on enabled flag
  useEffect(() => {
    if (enabled && !document.hidden) {
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [enabled, startPolling, stopPolling]);

  return {
    isPolling,
    stopPolling,
    startPolling,
  };
}
