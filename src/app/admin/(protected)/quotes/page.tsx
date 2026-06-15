import AdminHeader from "../../components/AdminHeader";
import AdminQuotesEditor from "../../components/AdminQuotesEditor";

export default function AdminQuotesPage() {
  return (
    <>
      <AdminHeader
        title="Quotes"
        description="Review and respond to customer quote requests."
      />
      <AdminQuotesEditor />
    </>
  );
}
