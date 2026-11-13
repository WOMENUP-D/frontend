"use client";

import { Fragment } from "react";
import { parseMarkdown, type Inline } from "./markdown";

function Spans({ inline }: { inline: Inline[] }) {
  return (
    <>
      {inline.map((part, i) =>
        part.strong ? <strong key={i}>{part.text}</strong> : <Fragment key={i}>{part.text}</Fragment>,
      )}
    </>
  );
}

/** Model-written text with the safe markdown subset of `markdown.ts` rendered
 *  as React elements (no HTML is ever injected). */
export function RichText({ text }: { text: string }) {
  const blocks = parseMarkdown(text);
  return (
    <div className="rich-text">
      {blocks.map((block, i) => {
        if (block.kind === "heading") {
          return <p key={i} className="rich-text-h"><Spans inline={block.inline} /></p>;
        }
        if (block.kind === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List key={i}>
              {block.items.map((item, j) => <li key={j}><Spans inline={item} /></li>)}
            </List>
          );
        }
        return <p key={i} style={{ whiteSpace: "pre-wrap" }}><Spans inline={block.inline} /></p>;
      })}
    </div>
  );
}
