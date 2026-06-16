import type { Metadata } from "next";
import AdminAuthProvider from "./components/AdminAuthProvider";
import AdminThemeProvider from "./components/AdminThemeProvider";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

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
