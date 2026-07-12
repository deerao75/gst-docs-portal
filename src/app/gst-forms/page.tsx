import GstFormsViewer from "@/components/GstFormsViewer";
import { getGstFormBySlug, getGstForms } from "@/lib/gst-forms";

export default function GstFormsPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const forms = getGstForms();
  const slug = searchParams.id?.trim();
  const linked = slug ? getGstFormBySlug(slug) : undefined;

  return (
    <div className="mx-auto flex h-[calc(100svh-5.5rem)] max-w-[100rem] flex-col px-4 py-4 lg:px-6">
      <GstFormsViewer forms={forms} initialSlug={linked?.slug} />
    </div>
  );
}