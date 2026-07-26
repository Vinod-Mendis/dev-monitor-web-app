export type PaceSignal = {
  label: "On Track" | "Behind Pace" | "No Deadline";
  color: "emerald" | "amber" | "zinc";
  details?: string;
};

export function getDeadlinePaceSignal(project: {
  createdAt?: string | Date;
  deadline?: string | Date | null;
  totalTasks?: number;
  completedTasks?: number;
  estimatedMinutes?: number;
  totalDurationMinutes?: number;
}): PaceSignal {
  if (!project.deadline) {
    return { label: "No Deadline", color: "zinc" };
  }

  const createdTime = project.createdAt
    ? new Date(project.createdAt).getTime()
    : Date.now() - 86400000;
  const deadlineTime = new Date(project.deadline).getTime();
  const nowTime = Date.now();

  const totalTimeDuration = Math.max(1, deadlineTime - createdTime);
  const elapsedTime = Math.max(0, nowTime - createdTime);
  const timeElapsedRatio = Math.min(1, elapsedTime / totalTimeDuration);

  const estimatedTotal = project.estimatedMinutes || 0;
  const loggedTotal = project.totalDurationMinutes || 0;
  const completedTasks = project.completedTasks || 0;
  const totalTasks = project.totalTasks || 0;

  // Deadline past check
  if (nowTime > deadlineTime && totalTasks > 0 && completedTasks < totalTasks) {
    return { label: "Behind Pace", color: "amber", details: "Deadline passed" };
  }

  if (estimatedTotal > 0) {
    const timeSpentRatio = loggedTotal / estimatedTotal;
    if (loggedTotal > estimatedTotal && completedTasks < totalTasks) {
      return { label: "Behind Pace", color: "amber", details: "Logged time exceeds estimate" };
    }
    const taskCompletionRatio = totalTasks > 0 ? completedTasks / totalTasks : 0;
    const effectiveProgressRatio = Math.max(timeSpentRatio, taskCompletionRatio);

    if (timeElapsedRatio > 0.25 && effectiveProgressRatio < timeElapsedRatio - 0.15) {
      return { label: "Behind Pace", color: "amber", details: "Pace behind deadline schedule" };
    }
  } else if (totalTasks > 0) {
    const completionRatio = completedTasks / totalTasks;
    if (timeElapsedRatio > 0.25 && completionRatio < timeElapsedRatio - 0.15) {
      return { label: "Behind Pace", color: "amber", details: "Task completion lagging behind deadline pace" };
    }
  }

  return { label: "On Track", color: "emerald", details: "On track to complete by deadline" };
}
