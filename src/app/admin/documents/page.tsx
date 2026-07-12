import AdminDocumentsEditor from "@/components/AdminDocumentsEditor";
import { adminKeyRequired } from "@/lib/admin-auth";

export const metadata = {
  title: "Admin — List details | Acer GST Portal",
};

export default function AdminDocumentsPage() {
  return (
    <div className="flex h-[calc(100svh-5.5rem)] flex-col px-4 py-4 lg:px-6">
      <AdminDocumentsEditor keyRequired={adminKeyRequired()} />
    </div>
  );
}