import AdminHeader from "../../components/AdminHeader";
import AdminProductsEditor from "../../components/AdminProductsEditor";

export default function AdminProductsPage() {
  return (
    <>
      <AdminHeader
        title="Products"
        description="Manage catalog products for the public shop and logo preview tool."
      />
      <AdminProductsEditor />
    </>
  );
}
