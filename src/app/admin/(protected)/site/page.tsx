import AdminHeader from "../../components/AdminHeader";
import AdminSiteContentEditor from "../../components/AdminSiteContentEditor";

export default function AdminSiteContentPage() {
  return (
    <>
      <AdminHeader
        title="Site Content"
        description="Edit brand, hero, and SEO fields. Changes save to Firestore for the xmbroider site."
      />
      <AdminSiteContentEditor />
    </>
  );
}
