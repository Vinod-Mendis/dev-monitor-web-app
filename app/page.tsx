import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/tasks");
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
      <main className="max-w-md w-full text-center space-y-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Intern Time-Tracking App
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Please sign in to view your assigned tasks, track active work sessions, and manage task status.
        </p>
      </main>
    </div>
  );
}
