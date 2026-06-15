import AdminGalleryEditor from "../../components/AdminGalleryEditor";
import AdminHeader from "../../components/AdminHeader";

export default function AdminGalleryPage() {
  return (
    <>
      <AdminHeader
        title="Gallery"
        description="Upload portfolio images to Firebase Storage and manage gallery metadata in Firestore."
      />
      <AdminGalleryEditor />
    </>
  );
}
