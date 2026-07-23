import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ActiveSessionProvider } from "@/components/ActiveSessionContext";
import { ActiveSessionBanner } from "@/components/ActiveSessionBanner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dev Monitor - Intern Time Tracking",
  description: "Time tracking and task monitor for interns",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <ClerkProvider>
          <ActiveSessionProvider>
            <header className="flex justify-between items-center px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="flex items-center gap-6">
                <Link href="/tasks" className="font-bold text-lg tracking-tight hover:text-zinc-600 dark:hover:text-zinc-300 transition">
                  Dev Monitor
                </Link>
                <Show when="signed-in">
                  <nav className="flex items-center gap-4 text-sm font-medium">
                    <Link
                      href="/tasks"
                      className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition"
                    >
                      My Tasks
                    </Link>
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
            <ActiveSessionBanner />
            <main className="flex-1">{children}</main>
          </ActiveSessionProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}