"use client";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

// Extend the default sanitize schema to allow a few extra tags that users
// commonly need and that don't introduce XSS risk: <details>, <summary>,
// <kbd>, <mark>, <sub>, <sup>. Everything else (script, iframe, style, on*,
// javascript: URLs, …) stays blocked by rehype-sanitize defaults.
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "details",
    "summary",
    "kbd",
    "mark",
    "sub",
    "sup",
    "figure",
    "figcaption",
  ],
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "className"],
    details: ["open"],
    input: ["type", "checked", "disabled"],
  },
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
      >
        {children || ""}
      </ReactMarkdown>
    </div>
  );
}