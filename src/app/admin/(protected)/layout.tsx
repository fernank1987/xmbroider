import AdminAuthGuard from "../components/AdminAuthGuard";
import AdminShell from "../components/AdminShell";

export default function ProtectedAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AdminAuthGuard>
      <AdminShell>{children}</AdminShell>
    </AdminAuthGuard>
  );
}
