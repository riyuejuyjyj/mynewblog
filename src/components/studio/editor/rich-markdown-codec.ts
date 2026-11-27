import { resolveStorageObjectUrl } from "@/lib/storage-object-url";

export type ParagraphAlign = "left" | "center" | "right" | "justify";
export type ParagraphFormat = {
  align: ParagraphAlign;
  firstLineIndent: boolean;
};

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

export function normalizeEditorUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";
  if (/^(https?:|mailto:|\/|#)/i.test(trimmed)) return trimmed;

  return `https://${trimmed}`;
}

export function createDefaultParagraphFormat(): ParagraphFormat {
  return {
    align: "left",
    firstLineIndent: false,
  };
}

export function isParagraphAlign(value: string): value is ParagraphAlign {
  return ["left", "center", "right", "justify"].includes(value);
}

export function readParagraphFormatLine(value: string): ParagraphFormat | null {
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

export function serializeParagraphFormat(format: ParagraphFormat, force = false) {
  const parts = ["studio:paragraph"];

  if (force || format.align !== "left") {
    parts.push(`align=${format.align}`);
  }

  if (force || format.firstLineIndent) {
    parts.push(`indent=${format.firstLineIndent ? "first" : "none"}`);
  }

  return parts.length > 1 ? `<!-- ${parts.join(" ")} -->` : "";
}

export function getEditableBlockAttributes(format: ParagraphFormat) {
  const attrs: string[] = [];

  if (format.align !== "left") {
    attrs.push(`data-align="${format.align}"`);
  }

  if (format.firstLineIndent) {
    attrs.push('data-first-line-indent="true"');
  }

  return attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
}

export function getElementParagraphFormat(element: HTMLElement): ParagraphFormat {
  const rawAlign =
    element.dataset.align ||
    element.style.textAlign ||
    element.getAttribute("align") ||
    "left";
  const textIndent = element.style.textIndent.trim();

  return {
    align: isParagraphAlign(rawAlign) ? rawAlign : "left",
    firstLineIndent:
      element.dataset.firstLineIndent === "true" ||
      (Boolean(textIndent) && textIndent !== "0px" && textIndent !== "0"),
  };
}

function withParagraphFormat(markdown: string, element: HTMLElement) {
  const meta = serializeParagraphFormat(getElementParagraphFormat(element));

  return meta ? `${meta}\n${markdown}` : markdown;
}

function renderInlineMarkdownToHtml(text: string) {
  const chunks: string[] = [];
  const pattern =
    /(!\[[^\]]*]\([^)]+\)|\[[^\]]+]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const token = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      chunks.push(escapeHtml(text.slice(lastIndex, index)));
    }

    if (token.startsWith("![")) {
      const parts = token.match(/^!\[([^\]]*)]\(([^)]+)\)$/);

      if (parts) {
        const source = parts[2];
        chunks.push(
          `<img src="${escapeAttribute(resolveStorageObjectUrl(source))}" alt="${escapeAttribute(parts[1])}" data-markdown-src="${escapeAttribute(source)}" />`,
        );
      }
    } else if (token.startsWith("[")) {
      const parts = token.match(/^\[([^\]]+)]\(([^)]+)\)$/);

      if (parts) {
        const href = normalizeEditorUrl(parts[2]);
        chunks.push(
          `<a href="${escapeAttribute(href)}" data-markdown-href="${escapeAttribute(parts[2])}">${escapeHtml(parts[1])}</a>`,
        );
      }
    } else if (token.startsWith("`")) {
      chunks.push(`<code>${escapeHtml(token.slice(1, -1))}</code>`);
    } else if (token.startsWith("**")) {
      chunks.push(`<strong>${escapeHtml(token.slice(2, -2))}</strong>`);
    } else if (token.startsWith("*")) {
      chunks.push(`<em>${escapeHtml(token.slice(1, -1))}</em>`);
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < text.length) {
    chunks.push(escapeHtml(text.slice(lastIndex)));
  }

  return chunks.join("");
}

function readMarkdownList(lines: string[], start: number, ordered: boolean) {
  const items: string[] = [];
  let index = start;
  const pattern = ordered ? /^\d+\.\s+(.+)$/ : /^[-*]\s+(.+)$/;

  while (index < lines.length) {
    const match = lines[index].trim().match(pattern);

    if (!match) break;

    items.push(match[1]);
    index += 1;
  }

  return { items, nextIndex: index };
}

export function markdownToEditableHtml(value: string) {
  const lines = value.split("\n");
  const blocks: string[] = [];
  let index = 0;
  let pendingParagraphFormat = createDefaultParagraphFormat();

  function takeParagraphAttributes() {
    const attrs = getEditableBlockAttributes(pendingParagraphFormat);
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
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      blocks.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      pendingParagraphFormat = createDefaultParagraphFormat();
      index += 1;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      blocks.push(
        `<h3${takeParagraphAttributes()}>${renderInlineMarkdownToHtml(trimmed.slice(4))}</h3>`,
      );
      index += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      blocks.push(
        `<h2${takeParagraphAttributes()}>${renderInlineMarkdownToHtml(trimmed.slice(3))}</h2>`,
      );
      index += 1;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      blocks.push(
        `<h1${takeParagraphAttributes()}>${renderInlineMarkdownToHtml(trimmed.slice(2))}</h1>`,
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
        `<blockquote${takeParagraphAttributes()}><p>${renderInlineMarkdownToHtml(quoteLines.join(" "))}</p></blockquote>`,
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const list = readMarkdownList(lines, index, false);
      blocks.push(
        `<ul${takeParagraphAttributes()}>${list.items
          .map((item) => `<li>${renderInlineMarkdownToHtml(item)}</li>`)
          .join("")}</ul>`,
      );
      index = list.nextIndex;
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const list = readMarkdownList(lines, index, true);
      blocks.push(
        `<ol${takeParagraphAttributes()}>${list.items
          .map((item) => `<li>${renderInlineMarkdownToHtml(item)}</li>`)
          .join("")}</ol>`,
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
      `<p${takeParagraphAttributes()}>${renderInlineMarkdownToHtml(paragraphLines.join(" "))}</p>`,
    );
  }

  return blocks.length > 0 ? blocks.join("") : "";
}

function getInlineMarkdown(node: ChildNode): string {
  if (node.nodeType === 3) {
    return node.textContent?.replace(/\u00a0/g, " ") ?? "";
  }

  if (node.nodeType !== 1) {
    return "";
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes).map(getInlineMarkdown).join("");

  if (tagName === "br") return "\n";
  if (tagName === "strong" || tagName === "b") return `**${children}**`;
  if (tagName === "em" || tagName === "i") return `*${children}*`;
  if (tagName === "code") return `\`${element.textContent ?? ""}\``;
  if (tagName === "a") {
    const href =
      element.getAttribute("data-markdown-href") ?? element.getAttribute("href") ?? "";

    return href ? `[${children || href}](${href})` : children;
  }
  if (tagName === "img") {
    const source =
      element.getAttribute("data-markdown-src") ?? element.getAttribute("src") ?? "";
    const alt = element.getAttribute("alt") ?? "image";

    return source ? `![${alt}](${source})` : "";
  }

  return children;
}

function blockNodeToMarkdown(node: ChildNode, listIndex?: number): string {
  if (node.nodeType === 3) {
    return getInlineMarkdown(node).trim();
  }

  if (node.nodeType !== 1) {
    return "";
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();
  const inline = () =>
    Array.from(element.childNodes).map(getInlineMarkdown).join("").trim();

  if (tagName === "h1") return withParagraphFormat(`# ${inline()}`, element);
  if (tagName === "h2") return withParagraphFormat(`## ${inline()}`, element);
  if (tagName === "h3") return withParagraphFormat(`### ${inline()}`, element);
  if (tagName === "blockquote") {
    const content = Array.from(element.childNodes)
      .map((child) => blockNodeToMarkdown(child))
      .filter(Boolean)
      .join("\n")
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");

    return withParagraphFormat(content || `> ${inline()}`, element);
  }
  if (tagName === "ul" || tagName === "ol") {
    const listMarkdown = Array.from(element.children)
      .filter((child) => child.tagName.toLowerCase() === "li")
      .map((child, index) =>
        blockNodeToMarkdown(child, tagName === "ol" ? index + 1 : undefined),
      )
      .filter(Boolean)
      .join("\n");

    return withParagraphFormat(listMarkdown, element);
  }
  if (tagName === "li") {
    const marker = listIndex ? `${listIndex}.` : "-";
    return `${marker} ${inline()}`;
  }
  if (tagName === "pre") {
    return `\`\`\`\n${element.textContent?.trimEnd() ?? ""}\n\`\`\``;
  }
  if (tagName === "div" || tagName === "p") {
    return withParagraphFormat(inline(), element);
  }

  return inline();
}

export function editableHtmlToMarkdown(element: HTMLElement) {
  return Array.from(element.childNodes)
    .map((node) => blockNodeToMarkdown(node))
    .filter(Boolean)
    .join("\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
