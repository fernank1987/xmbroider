"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type SaveStatusEntry = {
  status: SaveStatus;
  message: string | null;
};

const IDLE_ENTRY: SaveStatusEntry = { status: "idle", message: null };

export type SaveStatusLabels = {
  savedMessage?: string;
  errorMessage?: string;
};

export type SaveStatusApi = {
  getEntry: (key: string) => SaveStatusEntry;
  isSaving: (key: string) => boolean;
  runAction: (
    key: string,
    action: () => Promise<void>,
    labels?: SaveStatusLabels,
  ) => Promise<boolean>;
  setLocalSuccess: (key: string, message: string) => void;
  setLocalError: (key: string, message: string) => void;
  dismissError: (key: string) => void;
};

export function useSaveStatus(clearSavedAfterMs = 2500): SaveStatusApi {
  const [statuses, setStatuses] = useState<Record<string, SaveStatusEntry>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const clearTimer = useCallback((key: string) => {
    const timer = timersRef.current[key];
    if (timer) {
      clearTimeout(timer);
      delete timersRef.current[key];
    }
  }, []);

  const clearSavedStatus = useCallback(
    (key: string) => {
      clearTimer(key);
      setStatuses((current) => {
        const entry = current[key];
        if (!entry || entry.status !== "saved") {
          return current;
        }
        const next = { ...current };
        delete next[key];
        return next;
      });
    },
    [clearTimer],
  );

  const scheduleSavedClear = useCallback(
    (key: string) => {
      clearTimer(key);
      timersRef.current[key] = setTimeout(() => {
        clearSavedStatus(key);
      }, clearSavedAfterMs);
    },
    [clearSavedAfterMs, clearSavedStatus, clearTimer],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const key of Object.keys(timers)) {
        clearTimeout(timers[key]);
      }
    };
  }, []);

  const getEntry = useCallback(
    (key: string): SaveStatusEntry => statuses[key] ?? IDLE_ENTRY,
    [statuses],
  );

  const isSaving = useCallback(
    (key: string) => getEntry(key).status === "saving",
    [getEntry],
  );

  const setLocalSuccess = useCallback(
    (key: string, message: string) => {
      clearTimer(key);
      setStatuses((current) => ({
        ...current,
        [key]: { status: "saved", message },
      }));
      scheduleSavedClear(key);
    },
    [clearTimer, scheduleSavedClear],
  );

  const setLocalError = useCallback((key: string, message: string) => {
    clearTimer(key);
    setStatuses((current) => ({
      ...current,
      [key]: { status: "error", message },
    }));
  }, [clearTimer]);

  const dismissError = useCallback((key: string) => {
    clearTimer(key);
    setStatuses((current) => {
      const entry = current[key];
      if (!entry || entry.status !== "error") {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, [clearTimer]);

  const runAction = useCallback(
    async (
      key: string,
      action: () => Promise<void>,
      labels?: SaveStatusLabels,
    ): Promise<boolean> => {
      if (getEntry(key).status === "saving") {
        return false;
      }

      clearTimer(key);
      setStatuses((current) => ({
        ...current,
        [key]: { status: "saving", message: null },
      }));

      try {
        await action();
        const savedMessage = labels?.savedMessage ?? "Saved";
        setStatuses((current) => ({
          ...current,
          [key]: { status: "saved", message: savedMessage },
        }));
        scheduleSavedClear(key);
        return true;
      } catch (error) {
        const fallback =
          error instanceof Error && error.message
            ? error.message
            : "Something went wrong. Try again.";
        const errorMessage = labels?.errorMessage ?? fallback;
        setStatuses((current) => ({
          ...current,
          [key]: { status: "error", message: errorMessage },
        }));
        return false;
      }
    },
    [clearTimer, getEntry, scheduleSavedClear],
  );

  return {
    getEntry,
    isSaving,
    runAction,
    setLocalSuccess,
    setLocalError,
    dismissError,
  };
}
