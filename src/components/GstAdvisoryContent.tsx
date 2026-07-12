"use client";

type Props = {
  html: string;
};

export default function GstAdvisoryContent({ html }: Props) {
  return (
    <div
      className="gst-advisory-prose text-base leading-relaxed text-black"
      lang="en"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}