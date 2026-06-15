import AdminThemeToggle from "./AdminThemeToggle";
import AdminUserBadge from "./AdminUserBadge";
import { adminDescription, adminHeader, adminTitle } from "../lib/adminStyles";

type AdminHeaderProps = {
  title: string;
  description?: string;
};

export default function AdminHeader({ title, description }: AdminHeaderProps) {
  return (
    <header
      className={`${adminHeader} flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-start sm:justify-between lg:px-8`}
    >
      <div className="min-w-0">
        <h1 className={adminTitle}>{title}</h1>
        {description && <p className={adminDescription}>{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3 self-start">
        <AdminUserBadge />
        <AdminThemeToggle />
      </div>
    </header>
  );
}
