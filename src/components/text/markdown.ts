/**
 * A deliberately small markdown subset for model-written answers (QA E-14).
 *
 * The models are asked for plain text, but a question that asks for headings
 * gets them, and "## Top 3" and "**bold**" were shown to her as raw symbols.
 * This reads headings, bullet and numbered lists, paragraphs and **bold**. It
 * never produces HTML: the result is plain data that a component renders as
 * React elements, so a model cannot inject markup, and links are not turned
 * into anchors at all (text stays text).
 */

export type Inline = { text: string; strong: boolean };

export type Block =
  | { kind: "heading"; inline: Inline[] }
  | { kind: "paragraph"; inline: Inline[] }
  | { kind: "list"; ordered: boolean; items: Inline[][] };

/** `**bold**` (or `__bold__`) into spans; stray emphasis markers are dropped. */
export function parseInline(line: string): Inline[] {
  const out: Inline[] = [];
  const pattern = /\*\*(.+?)\*\*|__(.+?)__/g;
  let last = 0;
  for (let match = pattern.exec(line); match; match = pattern.exec(line)) {
    if (match.index > last) out.push({ text: line.slice(last, match.index), strong: false });
    out.push({ text: match[1] ?? match[2] ?? "", strong: true });
    last = match.index + match[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last), strong: false });
  return out
    .map((part) => ({ ...part, text: part.strong ? part.text : part.text.replace(/\*\*|__/g, "") }))
    .filter((part) => part.text.length > 0);
}

const HEADING = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/;
const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d{1,3}[.)]\s+(.*)$/;

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: Inline[][] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", inline: parseInline(paragraph.join("\n")) });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push({ kind: "list", ...list });
    list = null;
  };

  for (const raw of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "heading", inline: parseInline(heading[1]) });
      continue;
    }
    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push(parseInline((bullet ?? numbered)![1]));
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}

/** A leading "1." / "2)" the model wrote in front of a step that the page
 *  numbers itself (QA E-15). */
export function stripLeadingNumber(text: string): string {
  return text.replace(/^\s*\d{1,3}[.)]\s+/, "");
}
