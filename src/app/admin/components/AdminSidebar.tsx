"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminLogoutButton from "./AdminAuthActions";
import { useAdminAuth } from "./AdminAuthProvider";
import {
  adminBodyText,
  adminBrandSubtitle,
  adminBrandTitle,
  adminNavLink,
  adminNavLinkActive,
  adminNavLinkInactive,
  adminSidebar,
  adminSubtleLink,
} from "../lib/adminStyles";

const navItems = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/site", label: "Site Content" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/quotes", label: "Quotes" },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAdminAuth();

  return (
    <aside className={adminSidebar}>
      <div className="flex items-center justify-between px-4 py-5 lg:px-6">
        <div>
          <Link href="/admin" className={adminBrandTitle}>
            XMBroider Admin
          </Link>
          <p className={adminBrandSubtitle}>Content management</p>
        </div>
        <Link href="/" className={`text-xs font-medium lg:hidden ${adminSubtleLink}`}>
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
              className={`${adminNavLink} ${
                active ? adminNavLinkActive : adminNavLinkInactive
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-200 px-4 py-4 admin-dark:border-zinc-800 lg:px-6">
        {user?.email && (
          <p className={`mb-3 truncate text-xs lg:text-sm ${adminBodyText}`}>
            {user.email}
          </p>
        )}
        <div className="flex flex-col gap-3">
          <AdminLogoutButton className="w-full justify-center lg:hidden" />
          <Link href="/" className={adminSubtleLink}>
            ← Back to public site
          </Link>
        </div>
      </div>
    </aside>
  );
}
