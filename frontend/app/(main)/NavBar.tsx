"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home", isActive: (p: string) => p === "/" },
  {
    href: "/analyses",
    label: "All Runs",
    isActive: (p: string) => p.startsWith("/analyses"),
  },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-ghost-border bg-surface-container-lowest/80 shadow-[0_2px_12px_rgba(15,23,42,0.03)] backdrop-blur-xl">
      <div className="flex h-nav w-full items-center justify-between gap-gutter px-6 md:px-10">
        <Link
          href="/"
          className="type-headline-sm font-bold tracking-tight text-on-surface transition-opacity hover:opacity-80"
        >
          Omisearch
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-5 md:gap-6">
          {NAV_ITEMS.map(({ href, label, isActive }) => {
            const active = isActive(pathname);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "type-label-lg border-b-2 border-primary pb-1 font-bold text-primary transition-colors"
                    : "type-label-lg border-b-2 border-transparent pb-1 font-medium text-on-surface-variant transition-colors hover:text-on-surface"
                }
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
