"use client";

/* eslint-disable @next/next/no-img-element */

import { Link2 } from "lucide-react";
import type { ReactNode } from "react";

import { createMarkdownHeadingId } from "@/lib/markdown";
import { resolveStorageObjectUrl } from "@/lib/storage-object-url";

type ParagraphAlign = "left" | "center" | "right" | "justify";
type ParagraphFormat = {
  align: ParagraphAlign;
  firstLineIndent: boolean;
};

function createDefaultParagraphFormat(): ParagraphFormat {
  return {
    align: "left",
    firstLineIndent: false,
  };
}

function isParagraphAlign(value: string): value is ParagraphAlign {
  return ["left", "center", "right", "justify"].includes(value);
}

function readParagraphFormatLine(value: string): ParagraphFormat | null {
  if (!/^<!--\s*studio:paragraph\b/.test(value)) {
    return null;
  }

  const align = value.match(/\balign=(left|center|right|justify)\b/)?.[1];
  const indent = value.match(/\bindent=(first|none)\b/)?.[1];

  return {
    align: align && isParagraphAlign(align) ? align : "left",
    firstLineIndent: indent === "first",
  };
}

function getParagraphRenderAttrs(format: ParagraphFormat) {
  return {
    ...(format.align !== "left" ? { "data-align": format.align } : {}),
    ...(format.firstLineIndent ? { "data-first-line-indent": "true" } : {}),
  };
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(!\[[^\]]*]\([^)]+\)|\[[^\]]+]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const token = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }

    if (token.startsWith("![")) {
      const parts = token.match(/^!\[([^\]]*)]\(([^)]+)\)$/);
      if (parts) {
        nodes.push(
          <img
            key={`${token}-${index}`}
            src={resolveStorageObjectUrl(parts[2])}
            alt={parts[1]}
            className="my-5 w-full rounded-3xl object-cover shadow-2xl shadow-slate-950/10"
          />,
        );
      }
    } else if (token.startsWith("[")) {
      const parts = token.match(/^\[([^\]]+)]\(([^)]+)\)$/);
      if (parts) {
        nodes.push(
          <a
            key={`${token}-${index}`}
            href={parts[2]}
            className="font-bold text-coral-700 underline decoration-coral-400/50 underline-offset-4 dark:text-coral-200"
          >
            {parts[1]}
          </a>,
        );
      }
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={`${token}-${index}`}
          className="rounded-lg bg-slate-950/5 px-1.5 py-0.5 font-mono text-[0.88em] text-coral-700 dark:bg-white/10 dark:text-coral-200"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={`${token}-${index}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={`${token}-${index}`}>{token.slice(1, -1)}</em>);
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function readList(lines: string[], start: number, ordered: boolean) {
  const items: string[] = [];
  let index = start;
  const pattern = ordered ? /^\d+\.\s+(.+)$/ : /^[-*]\s+(.+)$/;

  while (index < lines.length) {
    const match = lines[index].match(pattern);

    if (!match) {
      break;
    }

    items.push(match[1]);
    index += 1;
  }

  return { items, nextIndex: index };
}

function renderMarkdownBlocks(value: string) {
  const lines = value.split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  let headingIndex = 0;
  let pendingParagraphFormat = createDefaultParagraphFormat();

  function takeParagraphAttrs() {
    const attrs = getParagraphRenderAttrs(pendingParagraphFormat);
    pendingParagraphFormat = createDefaultParagraphFormat();

    return attrs;
  }

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    const paragraphFormat = readParagraphFormatLine(trimmed);

    if (paragraphFormat) {
      pendingParagraphFormat = paragraphFormat;
      index += 1;
      continue;
    }

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      blocks.push(
        <pre
          key={`code-${index}`}
          className="my-5 overflow-x-auto rounded-3xl bg-slate-950 p-5 text-sm text-slate-100 shadow-inner"
        >
          {language ? (
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-coral-200">
              {language}
            </div>
          ) : null}
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      pendingParagraphFormat = createDefaultParagraphFormat();
      index += 1;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      const text = trimmed.slice(4);
      const headingId = createMarkdownHeadingId(text, headingIndex);
      headingIndex += 1;

      blocks.push(
        <h3
          id={headingId}
          key={`h3-${index}`}
          {...takeParagraphAttrs()}
          className="group mt-8 flex scroll-mt-28 items-center gap-2 text-2xl font-black tracking-[0]"
        >
          <a
            href={`#${headingId}`}
            aria-label={`跳转到 ${text}`}
            className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <Link2 className="size-4" />
          </a>
          {renderInline(text)}
        </h3>,
      );
      index += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      const text = trimmed.slice(3);
      const headingId = createMarkdownHeadingId(text, headingIndex);
      headingIndex += 1;

      blocks.push(
        <h2
          id={headingId}
          key={`h2-${index}`}
          {...takeParagraphAttrs()}
          className="group mt-10 flex scroll-mt-28 items-center gap-2 text-3xl font-black tracking-[0]"
        >
          <a
            href={`#${headingId}`}
            aria-label={`跳转到 ${text}`}
            className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <Link2 className="size-4" />
          </a>
          {renderInline(text)}
        </h2>,
      );
      index += 1;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      const text = trimmed.slice(2);
      const headingId = createMarkdownHeadingId(text, headingIndex);
      headingIndex += 1;

      blocks.push(
        <h1
          id={headingId}
          key={`h1-${index}`}
          {...takeParagraphAttrs()}
          className="group mt-10 flex scroll-mt-28 items-center gap-2 text-4xl font-black tracking-[0]"
        >
          <a
            href={`#${headingId}`}
            aria-label={`跳转到 ${text}`}
            className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <Link2 className="size-4" />
          </a>
          {renderInline(text)}
        </h1>,
      );
      index += 1;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      const quoteLines: string[] = [];

      while (index < lines.length && lines[index].trim().startsWith("> ")) {
        quoteLines.push(lines[index].trim().slice(2));
        index += 1;
      }

      blocks.push(
        <blockquote
          key={`quote-${index}`}
          {...takeParagraphAttrs()}
          className="my-5 rounded-r-3xl border-l-4 border-coral-400 bg-coral-100/45 px-5 py-4 italic text-slate-700 dark:bg-coral-400/10 dark:text-slate-200"
        >
          {quoteLines.map((quoteLine, quoteIndex) => (
            <p key={quoteIndex}>{renderInline(quoteLine)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const list = readList(lines, index, false);
      blocks.push(
        <ul
          key={`ul-${index}`}
          {...takeParagraphAttrs()}
          className="my-5 list-disc space-y-2 pl-6"
        >
          {list.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      index = list.nextIndex;
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const list = readList(lines, index, true);
      blocks.push(
        <ol
          key={`ol-${index}`}
          {...takeParagraphAttrs()}
          className="my-5 list-decimal space-y-2 pl-6"
        >
          {list.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
      index = list.nextIndex;
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;

    while (index < lines.length) {
      const next = lines[index].trim();
      if (
        !next ||
        next.startsWith("#") ||
        next.startsWith("> ") ||
        next.startsWith("```") ||
        readParagraphFormatLine(next) ||
        /^[-*]\s+/.test(next) ||
        /^\d+\.\s+/.test(next)
      ) {
        break;
      }
      paragraphLines.push(next);
      index += 1;
    }

    blocks.push(
      <p
        key={`p-${index}`}
        {...takeParagraphAttrs()}
        className="my-5 text-[1.02rem] leading-8"
      >
        {renderInline(paragraphLines.join(" "))}
      </p>,
    );
  }

  return blocks;
}

export function MarkdownPreview({ value }: { value: string }) {
  const blocks = renderMarkdownBlocks(value);

  if (blocks.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm font-bold text-slate-400 dark:border-white/15">
        预览会在这里出现。
      </p>
    );
  }

  return <div className="studio-markdown-preview">{blocks}</div>;
}
