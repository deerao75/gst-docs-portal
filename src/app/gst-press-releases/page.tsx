import GstPressReleasesViewer from "@/components/GstPressReleasesViewer";
import {
  getGstPressReleaseById,
  getGstPressReleases,
} from "@/lib/gst-press-releases";

export default function GstPressReleasesPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const releases = getGstPressReleases();

  const initialId = Number(searchParams.id);
  const linked =
    Number.isFinite(initialId) && initialId > 0
      ? getGstPressReleaseById(initialId)
      : undefined;

  return (
    <div className="mx-auto flex h-[calc(100svh-5.5rem)] max-w-[100rem] flex-col px-4 py-4 lg:px-6">
      <GstPressReleasesViewer releases={releases} initialId={linked?.id} />
    </div>
  );
}