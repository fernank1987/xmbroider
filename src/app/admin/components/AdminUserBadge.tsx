"use client";

import { useAdminAuth } from "./AdminAuthProvider";
import AdminLogoutButton from "./AdminAuthActions";
import { adminBodyText } from "../lib/adminStyles";

export default function AdminUserBadge() {
  const { user } = useAdminAuth();

  if (!user?.email) {
    return null;
  }

  return (
    <div className="hidden items-center gap-3 lg:flex">
      <span className={`max-w-[220px] truncate text-sm ${adminBodyText}`}>
        {user.email}
      </span>
      <AdminLogoutButton />
    </div>
  );
}
