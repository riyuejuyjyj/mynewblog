export type MarkdownHeading = {
  id: string;
  level: 1 | 2 | 3;
  text: string;
};

export function cleanMarkdownHeading(rawText: string) {
  return rawText
    .replace(/!\[([^\]]*)]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/[*_~`#]/g, "")
    .trim();
}

export function createMarkdownHeadingId(rawText: string, index = 0) {
  const cleanText = cleanMarkdownHeading(rawText);
  const slug = cleanText
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `toc-${slug || "heading"}-${index}`;
}

export function extractMarkdownHeadings(value: string) {
  const headings: MarkdownHeading[] = [];
  const headingPattern = /^(#{1,3})\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = headingPattern.exec(value)) !== null) {
    const level = match[1].length as 1 | 2 | 3;
    const text = cleanMarkdownHeading(match[2]);

    if (text) {
      headings.push({
        id: createMarkdownHeadingId(text, index),
        level,
        text,
      });
      index += 1;
    }
  }

  return headings;
}
