import AdminAuthProvider from "./components/AdminAuthProvider";
import AdminThemeProvider from "./components/AdminThemeProvider";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AdminThemeProvider>
      <AdminAuthProvider>{children}</AdminAuthProvider>
    </AdminThemeProvider>
  );
}
