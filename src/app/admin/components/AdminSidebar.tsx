"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/site", label: "Site Content" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/quotes", label: "Quotes" },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-b border-zinc-800 bg-zinc-950 lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between px-4 py-5 lg:px-6">
        <div>
          <Link href="/admin" className="text-lg font-semibold text-white">
            XMBroider Admin
          </Link>
          <p className="mt-0.5 text-xs text-zinc-500">Content management</p>
        </div>
        <Link
          href="/"
          className="text-xs font-medium text-zinc-400 transition-colors hover:text-white lg:hidden"
        >
          View site
        </Link>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-3 lg:pb-6">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:px-3 lg:py-2.5 ${
                active
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t border-zinc-800 px-6 py-4 lg:block">
        <Link
          href="/"
          className="text-sm text-zinc-400 transition-colors hover:text-white"
        >
          ← Back to public site
        </Link>
      </div>
    </aside>
  );
}
