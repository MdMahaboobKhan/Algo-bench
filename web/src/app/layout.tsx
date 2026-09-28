import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { THEME_INIT_SCRIPT, ThemeToggle } from "@/lib/theme";
import { Sidebar } from "@/components/Sidebar";
import { SearchBar } from "@/components/SearchBar";
import { getManifest, getPatterns, type ManifestEntry } from "@/lib/problems";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AlgoBench",
  description: "Personal LeetCode-style practice site",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Patterns/problems list is fixed course content from the extraction
  // pipeline, not per-user state, so it's safe to read at layout render time
  // (unlike progress, which is fetched live client-side in Sidebar itself).
  const patterns = getPatterns();
  const problemsByPattern: Record<string, ManifestEntry[]> = {};
  for (const p of getManifest()) {
    (problemsByPattern[p.pattern.slug] ??= []).push(p);
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {/* next/script's beforeInteractive strategy is the supported way to
            block on an inline script before hydration -- a raw <script> JSX
            element triggers React's "script tag while rendering" warning. */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {/* Full-bleed, not centered/width-constrained like the content
              below it -- the brand mark sits in the true top-left corner of
              the viewport rather than inset by the max-w content wrapper. */}
          <div className="px-4 py-3 flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight shrink-0">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-white text-sm font-bold dark:bg-zinc-100 dark:text-zinc-900">
                A
              </span>
              AlgoBench
            </Link>
            <div className="flex-1 flex justify-center">
              <div className="w-full max-w-md">
                <SearchBar />
              </div>
            </div>
            <ThemeToggle />
          </div>
        </header>
        {/* Left-aligned (not mx-auto centered) and same px-4 as the header
            above, so the sidebar's left edge lines up with the logo's --
            on a viewport wider than 1600px, centering this independently of
            the header would leave the sidebar visibly offset to the right
            of where the logo sits. */}
        <div className="max-w-[1600px] w-full px-4 py-4 flex-1 flex items-start gap-6">
          <Sidebar patterns={patterns} problemsByPattern={problemsByPattern} />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
