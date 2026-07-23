"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface ActiveSession {
  _id: string;
  startTime: string;
  task: {
    _id: string;
    title: string;
    description?: string;
    status?: string;
  };
}

interface ActiveSessionContextType {
  activeSession: ActiveSession | null;
  isLoading: boolean;
  refetchActiveSession: () => Promise<void>;
}

const ActiveSessionContext = createContext<ActiveSessionContextType>({
  activeSession: null,
  isLoading: true,
  refetchActiveSession: async () => {},
});

export function ActiveSessionProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchActiveSession = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions/history");
      if (!res.ok) {
        setActiveSession(null);
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        // Find session where endTime is null or undefined
        const currentActive = data.sessions.find(
          (s: any) => s.endTime === null || s.endTime === undefined
        );
        setActiveSession(currentActive || null);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error("Failed to fetch active session:", err);
      setActiveSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveSession();
    // Light poll every 15 seconds to ensure accuracy across tabs
    const interval = setInterval(fetchActiveSession, 15000);
    return () => clearInterval(interval);
  }, [fetchActiveSession]);

  return (
    <ActiveSessionContext.Provider
      value={{
        activeSession,
        isLoading,
        refetchActiveSession: fetchActiveSession,
      }}
    >
      {children}
    </ActiveSessionContext.Provider>
  );
}

export function useActiveSession() {
  return useContext(ActiveSessionContext);
}
