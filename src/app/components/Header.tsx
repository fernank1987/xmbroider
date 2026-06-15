"use client";

import Link from "next/link";
import { useState } from "react";
import type { SiteContent } from "@/lib/siteContent";

type HeaderProps = {
  content: Pick<SiteContent, "brand" | "navigation" | "headerCta">;
};

export default function Header({ content }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [failedLogoKey, setFailedLogoKey] = useState<string | null>(null);
  const { brand, navigation, headerCta } = content;
  const logoKey = brand.logoUrl ?? "";
  const showLogo = Boolean(logoKey) && failedLogoKey !== logoKey;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center text-lg font-bold tracking-tight text-foreground sm:text-xl"
        >
          {showLogo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={brand.logoUrl}
              alt={brand.logoAlt || brand.name}
              onError={() => setFailedLogoKey(logoKey)}
              className="h-auto max-h-11 w-auto max-w-[130px] object-contain sm:max-h-14 sm:max-w-[180px]"
            />
          ) : (
            brand.name
          )}
        </Link>

        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Main navigation"
        >
          {navigation.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href={headerCta.href}
          className="hidden rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover lg:inline-flex"
        >
          {headerCta.label}
        </Link>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-foreground lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav
          id="mobile-nav"
          className="border-t border-border px-4 py-4 lg:hidden"
          aria-label="Mobile navigation"
        >
          <ul className="flex flex-col gap-1">
            {navigation.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
