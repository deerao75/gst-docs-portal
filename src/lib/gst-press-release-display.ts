const TITLE_MEETING_PATTERNS = [
  /(\d+)(?:st|nd|rd|th)?\s+(?:meeting\s+of\s+(?:the\s+)?)?gst\s+council/i,
  /(\d+)(?:st|nd|rd|th)?\s+goods\s+and\s+services\s+tax/i,
  /(?:recommendations|decisions|policy\s+changes)\s+(?:made\s+)?(?:during\s+)?(?:the\s+)?(\d+)(?:st|nd|rd|th)?\s*meeting/i,
  /(\d+)(?:st|nd|rd|th)?\s+gst\s+council\s+meeting/i,
  /decisions\s+of\s+the\s+(\d+)(?:st|nd|rd|th)?\s+gst\s+council/i,
  /chairs\s+(\d+)(?:st|nd|rd|th)?\s+meeting/i,
  /during\s+the\s+(\d+)(?:st|nd|rd|th)?\s+meeting\s+of\s+the\s+gst\s+council/i,
  /(\d+)(?:st|nd|rd|th)?\s+meeting\s+of\s+the\s+gst\s+council/i,
  /(\d+)\s+meeting\s+of\s+the\s+gst\s+council/i,
  /the\s+(\d+)(?:st|nd|rd|th)?\s+goods\s+and\s+services\s+tax/i,
  /(\d+)(?:st|nd|rd|th)?meeting\s+of\s+the\s+gst\s+council/i,
  /recommendations\s+during\s+(\d+)(?:st|nd|rd|th)?\s+meeting/i,
  /(\d+)(?:st|nd|rd|th)?\s+gst\s+council/i,
];

const URL_MEETING_PATTERNS = [
  /(\d+)(?:st|nd|rd|th)?_gst_press_information_bureau/i,
  /\/(\d+)(?:st|nd|rd|th)?_gst(?:_|-)/i,
  /\/(\d+)\.\d+(?:st|nd|rd|th)?_gst/i,
];

export function formatMeetingOrdinal(meetingNumber: number): string {
  const mod100 = meetingNumber % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${meetingNumber}th`;
  }
  switch (meetingNumber % 10) {
    case 1:
      return `${meetingNumber}st`;
    case 2:
      return `${meetingNumber}nd`;
    case 3:
      return `${meetingNumber}rd`;
    default:
      return `${meetingNumber}th`;
  }
}

export function extractGstCouncilMeetingNumber(
  title: string,
  sourceUrl?: string
): number | null {
  for (const pattern of TITLE_MEETING_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  if (sourceUrl) {
    for (const pattern of URL_MEETING_PATTERNS) {
      const match = sourceUrl.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
  }

  return null;
}

export function isGstCouncilMeetingMinutes(
  title: string,
  sourceUrl?: string
): boolean {
  return extractGstCouncilMeetingNumber(title, sourceUrl) != null;
}

export function gstPressReleaseListTitle(
  title: string,
  sourceUrl?: string
): string {
  const meetingNumber = extractGstCouncilMeetingNumber(title, sourceUrl);
  if (meetingNumber == null) {
    return title;
  }

  return `Minutes of GST Council ${formatMeetingOrdinal(meetingNumber)} Meeting`;
}