import AdminThemeToggle from "./AdminThemeToggle";
import { adminDescription, adminHeader, adminTitle } from "../lib/adminStyles";

type AdminHeaderProps = {
  title: string;
  description?: string;
};

export default function AdminHeader({ title, description }: AdminHeaderProps) {
  return (
    <header
      className={`${adminHeader} flex items-start justify-between gap-4 px-6 py-6 lg:px-8`}
    >
      <div className="min-w-0">
        <h1 className={adminTitle}>{title}</h1>
        {description && <p className={adminDescription}>{description}</p>}
      </div>
      <AdminThemeToggle />
    </header>
  );
}
