import { ClerkProvider, Show } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ActiveSessionProvider } from "@/components/ActiveSessionContext";
import { ActiveSessionBanner } from "@/components/ActiveSessionBanner";
import { AppSidebar } from "@/components/AppSidebar";
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
  title: "Dev Monitor - Intern Time & Project Tracking",
  description: "Live time tracking, review workflows, and project monitor for interns and admins",
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
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
        <ClerkProvider>
          <ActiveSessionProvider>
            <Show when="signed-in">
              <AppSidebar>
                <ActiveSessionBanner />
                <div className="flex-1">{children}</div>
              </AppSidebar>
            </Show>

            <Show when="signed-out">
              <div className="min-h-screen flex flex-col items-center justify-center p-4">
                {children}
              </div>
            </Show>
          </ActiveSessionProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}