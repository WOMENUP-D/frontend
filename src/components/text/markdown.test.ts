import assert from "node:assert/strict";
import { test } from "node:test";
import { parseInline, parseMarkdown, stripLeadingNumber } from "./markdown";

test("headings, bold lists and paragraphs are read, not shown raw", () => {
  const blocks = parseMarkdown("## Top 3 skills\n\n- **Planning** — keep a list\n- Tracking\n\nThat is all.");
  assert.deepEqual(blocks, [
    { kind: "heading", inline: [{ text: "Top 3 skills", strong: false }] },
    {
      kind: "list",
      ordered: false,
      items: [
        [{ text: "Planning", strong: true }, { text: " — keep a list", strong: false }],
        [{ text: "Tracking", strong: false }],
      ],
    },
    { kind: "paragraph", inline: [{ text: "That is all.", strong: false }] },
  ]);
});

test("numbered lists are ordered lists", () => {
  const [block] = parseMarkdown("1. First\n2) Second");
  assert.equal(block.kind, "list");
  assert.equal(block.kind === "list" && block.ordered, true);
});

test("markup is never produced: angle brackets stay text", () => {
  const [block] = parseMarkdown("<script>alert(1)</script>");
  assert.deepEqual(block, { kind: "paragraph", inline: [{ text: "<script>alert(1)</script>", strong: false }] });
});

test("unmatched emphasis markers are dropped", () => {
  assert.deepEqual(parseInline("a ** b"), [{ text: "a  b", strong: false }]);
});

test("a step's own number is removed once", () => {
  assert.equal(stripLeadingNumber("1. Asoslarni egallang"), "Asoslarni egallang");
  assert.equal(stripLeadingNumber("2) Step"), "Step");
  assert.equal(stripLeadingNumber("2026 rejasi"), "2026 rejasi");
});
