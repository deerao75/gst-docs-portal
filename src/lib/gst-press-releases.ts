import { GST_PRESS_RELEASES } from "@/lib/catalog-data";
import { isGstCouncilMeetingMinutes } from "@/lib/gst-press-release-display";

export type GstPressRelease = {
  id: number;
  sr_no: number;
  date: string | null;
  date_display: string;
  title: string;
  slug: string;
  file_name: string;
  file_path: string;
  file_hash: string;
  source_url: string;
  original_url: string;
  source_type: string;
  status: string;
  updated_at: string;
};

function readCatalog(): GstPressRelease[] {
  return GST_PRESS_RELEASES;
}

export function getGstPressReleases(): GstPressRelease[] {
  return readCatalog()
    .filter(
      (item) =>
        item.status === "ready" &&
        isGstCouncilMeetingMinutes(item.title, item.original_url)
    )
    .sort((a, b) => {
      const dateA = a.date ?? "";
      const dateB = b.date ?? "";
      if (dateB !== dateA) return dateB.localeCompare(dateA);
      return b.id - a.id;
    });
}

export function getGstPressReleaseById(id: number): GstPressRelease | undefined {
  return getGstPressReleases().find((item) => item.id === id);
}