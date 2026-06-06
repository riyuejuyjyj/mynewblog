"use client";

/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";

import { createMarkdownHeadingId } from "@/lib/markdown";

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
            src={parts[2]}
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

export function MarkdownPreview({ value }: { value: string }) {
  const lines = value.split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

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
      index += 1;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      const text = trimmed.slice(4);

      blocks.push(
        <h3
          id={createMarkdownHeadingId(text, index)}
          key={`h3-${index}`}
          className="mt-8 scroll-mt-28 text-2xl font-black tracking-[0]"
        >
          {renderInline(text)}
        </h3>,
      );
      index += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      const text = trimmed.slice(3);

      blocks.push(
        <h2
          id={createMarkdownHeadingId(text, index)}
          key={`h2-${index}`}
          className="mt-10 scroll-mt-28 text-3xl font-black tracking-[0]"
        >
          {renderInline(text)}
        </h2>,
      );
      index += 1;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      const text = trimmed.slice(2);

      blocks.push(
        <h1
          id={createMarkdownHeadingId(text, index)}
          key={`h1-${index}`}
          className="mt-10 scroll-mt-28 text-4xl font-black tracking-[0]"
        >
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
        <ul key={`ul-${index}`} className="my-5 list-disc space-y-2 pl-6">
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
        <ol key={`ol-${index}`} className="my-5 list-decimal space-y-2 pl-6">
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
        /^[-*]\s+/.test(next) ||
        /^\d+\.\s+/.test(next)
      ) {
        break;
      }
      paragraphLines.push(next);
      index += 1;
    }

    blocks.push(
      <p key={`p-${index}`} className="my-5 text-[1.02rem] leading-8">
        {renderInline(paragraphLines.join(" "))}
      </p>,
    );
  }

  if (blocks.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm font-bold text-slate-400 dark:border-white/15">
        预览会在这里出现。
      </p>
    );
  }

  return <div className="studio-markdown-preview">{blocks}</div>;
}
