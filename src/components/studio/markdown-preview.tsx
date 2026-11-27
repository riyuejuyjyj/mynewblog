"use client";

/* eslint-disable @next/next/no-img-element */

import { Check, Copy, Link2, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

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

function CodeBlock({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard permission failures gracefully.
    }
  }

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-slate-800/80 bg-[#111726] text-slate-100 shadow-lg">
      <div className="flex items-center justify-between border-b border-white/8 bg-white/[0.03] px-4 py-2 font-sans text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-rose-400/80" />
            <span className="size-2.5 rounded-full bg-amber-300/80" />
            <span className="size-2.5 rounded-full bg-emerald-400/80" />
          </span>
          <span className="ml-1 font-mono text-[11px] uppercase tracking-wider text-slate-400">
            {language || "code"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void copyCode()}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-400" />
              已复制
            </>
          ) : (
            <>
              <Copy className="size-3" />
              复制
            </>
          )}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto bg-transparent p-4 font-mono text-[13px] leading-6 text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderInline(
  text: string,
  onImageClick?: (src: string, alt: string) => void,
): ReactNode[] {
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
        const resolvedUrl = resolveStorageObjectUrl(parts[2]);
        const altText = parts[1];

        nodes.push(
          <img
            key={`${token}-${index}`}
            src={resolvedUrl}
            alt={altText}
            onClick={
              onImageClick ? () => onImageClick(resolvedUrl, altText) : undefined
            }
            className={`my-6 w-full rounded-2xl object-cover shadow-md ${
              onImageClick ? "cursor-zoom-in transition hover:opacity-95" : ""
            }`}
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
            className="font-semibold text-accent-700 underline decoration-accent-400/55 underline-offset-4 transition hover:text-accent-500 dark:text-accent-200"
          >
            {parts[1]}
          </a>,
        );
      }
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={`${token}-${index}`}
          className="rounded-md bg-accent-50 px-1.5 py-0.5 font-mono text-[0.86em] text-accent-700 dark:bg-accent-500/15 dark:text-accent-200"
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

function renderMarkdownBlocks(
  value: string,
  onImageClick?: (src: string, alt: string) => void,
) {
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
        <CodeBlock
          key={`code-${index}`}
          code={codeLines.join("\n")}
          language={language}
        />,
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
          className="group mt-7 flex scroll-mt-24 items-center gap-2 text-xl font-bold"
        >
          <a
            href={`#${headingId}`}
            aria-label={`跳转到 ${text}`}
            className="text-accent-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <Link2 className="size-4" />
          </a>
          {renderInline(text, onImageClick)}
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
          className="group mt-9 flex scroll-mt-24 items-center gap-2 text-2xl font-bold"
        >
          <a
            href={`#${headingId}`}
            aria-label={`跳转到 ${text}`}
            className="text-accent-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <Link2 className="size-4" />
          </a>
          {renderInline(text, onImageClick)}
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
          className="group mt-9 flex scroll-mt-24 items-center gap-2 text-3xl font-bold"
        >
          <a
            href={`#${headingId}`}
            aria-label={`跳转到 ${text}`}
            className="text-accent-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <Link2 className="size-4" />
          </a>
          {renderInline(text, onImageClick)}
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
          className="my-5 rounded-r-2xl border-l-4 border-accent-400 bg-accent-50/75 px-5 py-3.5 text-slate-700 dark:bg-accent-500/12 dark:text-slate-200"
        >
          {quoteLines.map((quoteLine, quoteIndex) => (
            <p key={quoteIndex} className="my-1.5">
              {renderInline(quoteLine, onImageClick)}
            </p>
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
            <li key={itemIndex}>{renderInline(item, onImageClick)}</li>
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
            <li key={itemIndex}>{renderInline(item, onImageClick)}</li>
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
        className="my-4 text-[1.03rem] leading-[1.95]"
      >
        {renderInline(paragraphLines.join(" "), onImageClick)}
      </p>,
    );
  }

  return blocks;
}

export function MarkdownPreview({
  interactiveImages = false,
  value,
}: {
  interactiveImages?: boolean;
  value: string;
}) {
  const [lightboxImage, setLightboxImage] = useState<{
    alt: string;
    src: string;
  } | null>(null);

  useEffect(() => {
    if (!lightboxImage) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLightboxImage(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lightboxImage]);

  const blocks = renderMarkdownBlocks(
    value,
    interactiveImages
      ? (src, alt) => setLightboxImage({ alt, src })
      : undefined,
  );

  if (blocks.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-medium text-slate-400 dark:border-white/15">
        预览会在这里出现。
      </p>
    );
  }

  return (
    <>
      <div className="studio-markdown-preview">{blocks}</div>

      {lightboxImage ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightboxImage.alt || "图片预览"}
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/82 p-4 backdrop-blur-md"
        >
          <button
            type="button"
            aria-label="关闭预览"
            onClick={() => setLightboxImage(null)}
            className="absolute right-5 top-5 inline-flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/12 text-white transition hover:bg-white/25"
          >
            <X className="size-5" />
          </button>
          <figure
            className="max-h-[88vh] max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={lightboxImage.src}
              alt={lightboxImage.alt}
              className="max-h-[82vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
            {lightboxImage.alt ? (
              <figcaption className="mt-3 text-center text-xs text-white/80">
                {lightboxImage.alt}
              </figcaption>
            ) : null}
          </figure>
        </div>
      ) : null}
    </>
  );
}
