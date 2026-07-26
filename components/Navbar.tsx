"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { LayoutDashboard, CheckSquare, Folder } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    async function checkRole() {
      try {
        const res = await fetch("/api/user/me");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user?.role === "admin") {
            setIsAdmin(true);
          }
        }
      } catch (err) {
        // Ignore unauthenticated or fetch errors
      }
    }

    checkRole();
  }, []);

  return (
    <header className="flex justify-between items-center px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex items-center gap-6">
        <Link
          href="/tasks"
          className="font-bold text-lg tracking-tight hover:text-zinc-600 dark:hover:text-zinc-300 transition flex items-center gap-2"
        >
          <div className="w-7 h-7 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs">
            DM
          </div>
          <span>Dev Monitor</span>
        </Link>

        <Show when="signed-in">
          <nav className="flex items-center gap-2 text-sm font-medium">
            <Link
              href="/tasks"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                pathname === "/tasks" || (pathname.startsWith("/tasks/") && !pathname.startsWith("/admin/projects"))
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 font-semibold"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              My Tasks
            </Link>

            {isAdmin && (
              <>
                <Link
                  href="/admin/projects"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                    pathname.startsWith("/admin/projects")
                      ? "bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 font-semibold border border-blue-500/30"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Projects
                </Link>

                <Link
                  href="/admin"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                    pathname === "/admin"
                      ? "bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 font-semibold border border-blue-500/30"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Admin Dashboard
                </Link>
              </>
            )}
          </nav>
        </Show>
      </div>

      <div className="flex items-center gap-4">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="px-4 py-2 text-sm font-medium rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition cursor-pointer">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="px-4 py-2 text-sm font-medium rounded-md bg-black text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer">
              Sign Up
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>
    </header>
  );
}
