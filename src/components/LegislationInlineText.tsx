import { Fragment, type ReactNode } from "react";

const BRACKET_REF = /(\d+)(\s+)(?=\[)/g;

type Props = {
  text: string;
};

export default function LegislationInlineText({ text }: Props) {
  const nodes: ReactNode[] = [];
  let last = 0;

  for (const match of text.matchAll(BRACKET_REF)) {
    const index = match.index ?? 0;
    if (index > last) {
      nodes.push(
        <Fragment key={`t-${last}`}>{text.slice(last, index)}</Fragment>
      );
    }
    nodes.push(
      <sup key={`r-${index}`} className="legislation-ref">
        {match[1]}
      </sup>
    );
    last = index + match[0].length;
  }

  if (last < text.length) {
    nodes.push(<Fragment key={`t-${last}`}>{text.slice(last)}</Fragment>);
  }

  if (nodes.length === 0) return <>{text}</>;

  return <>{nodes}</>;
}