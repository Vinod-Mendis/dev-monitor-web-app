"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useActiveSession } from "@/components/ActiveSessionContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatElapsedSeconds } from "@/lib/time";
import { Timer, ArrowRight } from "lucide-react";

export function ActiveSessionBanner() {
  const { activeSession } = useActiveSession();
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    if (!activeSession?.startTime) {
      setElapsedSeconds(0);
      return;
    }

    const startMs = new Date(activeSession.startTime).getTime();
    const updateElapsed = () => {
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setElapsedSeconds(diffSec);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.startTime]);

  if (!activeSession) return null;

  return (
    <div className="w-full bg-amber-500/10 dark:bg-amber-500/20 border-b border-amber-500/30 px-4 py-2.5">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-amber-400 opacity-75"></span>
            <Timer className="h-4 w-4 text-amber-600 dark:text-amber-400 relative" />
          </div>
          <div>
            <span className="font-semibold text-amber-900 dark:text-amber-200">
              Active Timer Running:
            </span>{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {activeSession.task.title}
            </span>{" "}
            <span className="inline-block px-2 py-0.5 ml-2 font-mono text-xs rounded bg-amber-200/60 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 font-semibold">
              {formatElapsedSeconds(elapsedSeconds)}
            </span>
          </div>
        </div>

        <Link href={`/tasks/${activeSession.task._id}`}>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 border-amber-500/40 hover:bg-amber-500/10 text-xs font-medium cursor-pointer">
            Go to Task
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
